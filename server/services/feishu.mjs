import { loadEnvFile } from "./env.mjs";

const FEISHU_BASE_URL = "https://open.feishu.cn/open-apis";

loadEnvFile();

const fieldNames = {
  title: process.env.FEISHU_FIELD_TITLE || "标题",
  uploader: process.env.FEISHU_FIELD_UPLOADER || "上传人",
  tool: process.env.FEISHU_FIELD_TOOL || "模型",
  type: process.env.FEISHU_FIELD_TYPE || "类型",
  medium: process.env.FEISHU_FIELD_MEDIUM || "媒介",
  chinese: process.env.FEISHU_FIELD_CHINESE || "中文提示词",
  english: process.env.FEISHU_FIELD_ENGLISH || "英文提示词",
  tags: process.env.FEISHU_FIELD_TAGS || "标签",
  cover: process.env.FEISHU_FIELD_COVER || "封面图URL",
  detailImages: process.env.FEISHU_FIELD_DETAIL_IMAGES || "详情图片URL组",
  referenceImages: process.env.FEISHU_FIELD_REFERENCE_IMAGES || "",
  detailText: process.env.FEISHU_FIELD_DETAIL_TEXT || "",
  detailContentImages: process.env.FEISHU_FIELD_DETAIL_CONTENT_IMAGES || "",
  status: process.env.FEISHU_FIELD_STATUS || "状态",
  sort: process.env.FEISHU_FIELD_SORT || "排序",
  featuredSort: process.env.FEISHU_FIELD_FEATURED_SORT || "精选排序",
  createdAt: process.env.FEISHU_FIELD_CREATED_AT || "发布时间",
};

let cachedTenantToken = null;
let tenantTokenExpiresAt = 0;
let cachedPrompts = null;
let promptsCachedAt = 0;
let promptsRefreshPromise = null;

const promptsCacheTtlMs = Number(process.env.FEISHU_CACHE_TTL_MS || 60_000);
const promptsCacheStaleMs = Number(process.env.FEISHU_CACHE_STALE_MS || 15 * 60_000);

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.code) {
    const message = data.msg || data.error || response.statusText;
    throw new Error(`Feishu API error: ${message}`);
  }
  return data;
}

async function getTenantAccessToken() {
  const now = Date.now();
  if (cachedTenantToken && tenantTokenExpiresAt > now + 60_000) {
    return cachedTenantToken;
  }

  const data = await requestJson(`${FEISHU_BASE_URL}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: requiredEnv("FEISHU_APP_ID"),
      app_secret: requiredEnv("FEISHU_APP_SECRET"),
    }),
  });

  cachedTenantToken = data.tenant_access_token;
  tenantTokenExpiresAt = now + Number(data.expire || 7200) * 1000;
  return cachedTenantToken;
}

function normalizeText(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(normalizeText).filter(Boolean).join("");
  }
  if (typeof value === "object") {
    return normalizeText(
      value.text ??
        value.name ??
        value.value ??
        value.url ??
        value.link ??
        value.tmp_url ??
        value.file_token ??
        ""
    );
  }
  return "";
}

function normalizeTags(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(normalizeText).map((item) => item.trim()).filter(Boolean);
  }
  return normalizeText(value)
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeImages(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === "string") return item.split(/\n/);
        if (item && typeof item === "object") {
          return item.url || item.tmp_url || item.link || item.text || "";
        }
        return "";
      })
      .map((item) => String(item).trim())
      .filter(Boolean);
  }
  return normalizeText(value)
    .split(/\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toFeishuText(value) {
  return value == null ? "" : String(value).trim();
}

function hasChineseText(value) {
  return /[\u4e00-\u9fff]/.test(toFeishuText(value));
}

function toFeishuTags(value) {
  if (Array.isArray(value)) return value.map(toFeishuText).filter(Boolean);
  return normalizeTags(value);
}

function toImageLines(value) {
  if (Array.isArray(value)) return value.map(toFeishuText).filter(Boolean).join("\n");
  return toFeishuText(value);
}

function normalizeDate(value) {
  if (!value) return new Date().toISOString();
  const text = normalizeText(value);
  const numeric = Number(text);
  if (Number.isFinite(numeric) && numeric > 0) {
    return new Date(numeric > 10_000_000_000 ? numeric : numeric * 1000).toISOString();
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function shouldPublish(fields) {
  const status = normalizeText(fields[fieldNames.status]).trim();
  if (!status) return true;
  return !["草稿", "隐藏", "未发布"].includes(status);
}

function hasContent(fields) {
  return [
    fieldNames.title,
    fieldNames.cover,
    fieldNames.detailImages,
    fieldNames.chinese,
    fieldNames.english,
  ].some((name) => normalizeText(fields[name]).trim());
}

function isThumbnailUrl(value) {
  return /-thumb\.webp(?:$|[?#])/i.test(String(value || ""));
}

function mapRecord(record) {
  const fields = record.fields || {};
  const detailImages = normalizeImages(fields[fieldNames.detailImages]);
  const referenceImages = fieldNames.referenceImages
    ? normalizeImages(fields[fieldNames.referenceImages]).slice(0, 8)
    : [];
  const detailContentImages = fieldNames.detailContentImages
    ? normalizeImages(fields[fieldNames.detailContentImages])
    : [];
  const coverImages = normalizeImages(fields[fieldNames.cover]);
  const thumbnailImage = coverImages.find(isThumbnailUrl) || "";
  const originalCoverImages = coverImages.filter((url) => !isThumbnailUrl(url));
  const image = originalCoverImages[0] || detailImages[0] || "";

  return {
    id: record.record_id,
    title: normalizeText(fields[fieldNames.title]) || "未命名提示词",
    uploader: normalizeText(fields[fieldNames.uploader]) || "未命名",
    type: normalizeText(fields[fieldNames.type]) || "未分类",
    tool: normalizeText(fields[fieldNames.tool]) || "未指定",
    medium: normalizeText(fields[fieldNames.medium]),
    chinese: normalizeText(fields[fieldNames.chinese]),
    english: normalizeText(fields[fieldNames.english]),
    tags: normalizeTags(fields[fieldNames.tags]),
    image,
    thumbnailImage,
    images: Array.from(new Set([...originalCoverImages, ...detailImages])).filter(Boolean),
    referenceImages,
    detailText: fieldNames.detailText ? normalizeText(fields[fieldNames.detailText]) : "",
    detailImages: detailContentImages,
    createdAt: normalizeDate(fields[fieldNames.createdAt]),
    sort: Number(normalizeText(fields[fieldNames.sort])) || 0,
    featuredSort: Number(normalizeText(fields[fieldNames.featuredSort])) || 0,
  };
}

async function loadRecordsFromFeishu() {
  const appToken = requiredEnv("FEISHU_APP_TOKEN");
  const tableId = requiredEnv("FEISHU_TABLE_ID");
  const viewId = process.env.FEISHU_VIEW_ID;
  const pageSize = 500;
  const token = await getTenantAccessToken();
  const records = [];
  let pageToken = "";

  do {
    const url = new URL(
      `${FEISHU_BASE_URL}/bitable/v1/apps/${appToken}/tables/${tableId}/records`
    );
    url.searchParams.set("page_size", String(pageSize));
    if (pageToken) url.searchParams.set("page_token", pageToken);
    if (viewId) url.searchParams.set("view_id", viewId);

    const data = await requestJson(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    records.push(...(data.data?.items || []));
    pageToken = data.data?.page_token || "";
  } while (pageToken);

  return records;
}

async function refreshPromptsCache() {
  if (promptsRefreshPromise) return promptsRefreshPromise;

  promptsRefreshPromise = (async () => {
    const records = await loadRecordsFromFeishu();
    const prompts = records
      .filter((record) => {
        const fields = record.fields || {};
        return hasContent(fields) && shouldPublish(fields);
      })
      .map(mapRecord)
      .sort((a, b) => b.sort - a.sort || new Date(b.createdAt) - new Date(a.createdAt));

    cachedPrompts = prompts;
    promptsCachedAt = Date.now();
    return prompts;
  })().finally(() => {
    promptsRefreshPromise = null;
  });

  return promptsRefreshPromise;
}

function upsertPromptCache(prompt) {
  if (!prompt || !cachedPrompts) return;
  const existing = cachedPrompts.find((item) => item.id === prompt.id);
  const mergedPrompt = existing
    ? {
        ...existing,
        ...prompt,
        title: prompt.title || existing.title,
        uploader: prompt.uploader || existing.uploader,
        type: prompt.type || existing.type,
        tool: prompt.tool || existing.tool,
        medium: prompt.medium || existing.medium,
        chinese: prompt.chinese || existing.chinese,
        english: prompt.english || existing.english,
        tags: prompt.tags?.length ? prompt.tags : existing.tags,
        image: prompt.image || existing.image,
        thumbnailImage: prompt.thumbnailImage || existing.thumbnailImage,
        images: prompt.images?.length ? prompt.images : existing.images,
        referenceImages: prompt.referenceImages?.length
          ? prompt.referenceImages
          : existing.referenceImages,
        detailText: prompt.detailText || existing.detailText,
        detailImages: prompt.detailImages?.length ? prompt.detailImages : existing.detailImages,
      }
    : prompt;

  cachedPrompts = [
    mergedPrompt,
    ...cachedPrompts.filter((item) => item.id !== prompt.id),
  ].sort(
    (a, b) => b.sort - a.sort || new Date(b.createdAt) - new Date(a.createdAt)
  );
  promptsCachedAt = Date.now();
}

export async function loadPromptsFromFeishu({ force = false } = {}) {
  const age = Date.now() - promptsCachedAt;

  if (!force && cachedPrompts && age < promptsCacheTtlMs) {
    return cachedPrompts;
  }

  if (!force && cachedPrompts && age < promptsCacheStaleMs) {
    refreshPromptsCache().catch((error) => {
      console.warn(
        `Background Feishu refresh failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    });
    return cachedPrompts;
  }

  return refreshPromptsCache();
}

export async function updateFeaturedPromptsInFeishu(ids = []) {
  const appToken = requiredEnv("FEISHU_APP_TOKEN");
  const tableId = requiredEnv("FEISHU_TABLE_ID");
  const token = await getTenantAccessToken();
  const records = await loadRecordsFromFeishu();
  const selectedIds = Array.from(new Set(ids.map(toFeishuText).filter(Boolean))).slice(0, 5);
  const nextFeaturedSort = new Map(selectedIds.map((id, index) => [id, index + 1]));
  const recordsToUpdate = records.filter((record) => {
    const currentValue = Number(normalizeText(record.fields?.[fieldNames.featuredSort])) || 0;
    const nextValue = nextFeaturedSort.get(record.record_id) || 0;
    return currentValue !== nextValue;
  });

  await Promise.all(
    recordsToUpdate.map((record) =>
      requestJson(
        `${FEISHU_BASE_URL}/bitable/v1/apps/${appToken}/tables/${tableId}/records/${record.record_id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fields: {
              [fieldNames.featuredSort]: nextFeaturedSort.get(record.record_id) || 0,
            },
          }),
        }
      )
    )
  );

  return loadPromptsFromFeishu({ force: true });
}

export async function updatePromptTranslationInFeishu(recordId, translation = {}) {
  const id = toFeishuText(recordId);
  if (!id) throw new Error("记录 ID 不能为空");

  const fields = {};
  const chinese = toFeishuText(translation.chinese);
  const english = toFeishuText(translation.english);

  if (chinese) fields[fieldNames.chinese] = chinese;
  if (english) fields[fieldNames.english] = english;
  if (Object.keys(fields).length === 0) return null;

  const appToken = requiredEnv("FEISHU_APP_TOKEN");
  const tableId = requiredEnv("FEISHU_TABLE_ID");
  const token = await getTenantAccessToken();
  const data = await requestJson(
    `${FEISHU_BASE_URL}/bitable/v1/apps/${appToken}/tables/${tableId}/records/${id}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    }
  );

  const prompt = mapRecord(data.data?.record || data.data || { record_id: id, fields });
  upsertPromptCache(prompt);
  return prompt;
}

export async function createPromptInFeishu(input) {
  const appToken = requiredEnv("FEISHU_APP_TOKEN");
  const tableId = requiredEnv("FEISHU_TABLE_ID");
  const token = await getTenantAccessToken();
  const tags = toFeishuTags(input.tags || input.tagsInput);
  const coverUrl = toFeishuText(input.image);
  const thumbnailUrl = toFeishuText(input.thumbnailImage);
  const coverValue = [coverUrl, thumbnailUrl].filter(Boolean).join("\n");
  const detailImages = toImageLines(input.images || input.detailImages || input.detailImagesInput);
  const referenceImages = toImageLines(input.referenceImages || input.referenceImagesInput);
  const detailText = toFeishuText(input.detailText);
  const detailContentImages = toImageLines(
    input.detailImages || input.detailContentImagesInput || input.processImagesInput
  );
  const createdAt = input.createdAt ? new Date(input.createdAt) : new Date();
  let chinesePrompt = toFeishuText(input.chinese);
  let englishPrompt = toFeishuText(input.english);

  if (hasChineseText(englishPrompt) && (!chinesePrompt || chinesePrompt === englishPrompt)) {
    chinesePrompt = chinesePrompt || englishPrompt;
    englishPrompt = "";
  }

  const fields = {
    [fieldNames.title]: toFeishuText(input.title),
    [fieldNames.uploader]: toFeishuText(input.uploader) || "未命名",
    [fieldNames.tool]: toFeishuText(input.tool) || "未指定",
    [fieldNames.type]: toFeishuText(input.type) || "未分类",
    [fieldNames.medium]: toFeishuText(input.medium),
    [fieldNames.chinese]: chinesePrompt,
    [fieldNames.english]: englishPrompt,
    [fieldNames.tags]: tags,
    [fieldNames.cover]: coverValue,
    [fieldNames.detailImages]: detailImages,
    [fieldNames.status]: toFeishuText(input.status) || "已发布",
    [fieldNames.sort]: Number(input.sort) || 0,
    [fieldNames.featuredSort]: Number(input.featuredSort) || 0,
    [fieldNames.createdAt]: createdAt.getTime(),
  };

  if (fieldNames.referenceImages) {
    fields[fieldNames.referenceImages] = referenceImages;
  }
  if (fieldNames.detailText) {
    fields[fieldNames.detailText] = detailText;
  }
  if (fieldNames.detailContentImages) {
    fields[fieldNames.detailContentImages] = detailContentImages;
  }

  if (!fields[fieldNames.title]) throw new Error("标题不能为空");
  if (!fields[fieldNames.chinese] && !fields[fieldNames.english]) {
    throw new Error("中文提示词或英文提示词至少填写一个");
  }

  const data = await requestJson(
    `${FEISHU_BASE_URL}/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    }
  );

  const prompt = mapRecord(
    data.data?.record || data.data || { record_id: `created-${Date.now()}`, fields }
  );
  upsertPromptCache(prompt);
  return prompt;
}

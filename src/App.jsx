import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ImagePlus,
  LayoutDashboard,
  Languages,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  Upload,
  X,
} from "lucide-react";
import "./styles.css";

const STORAGE_KEY = "prompt-atlas-items-v1";
const FEATURED_KEY = "prompt-atlas-featured-ids-v1";
const ADMIN_TOKEN_KEY = "prompt-atlas-admin-token";
const MEDIUM_DEFINITIONS = [
  { key: "image", label: "图像", accent: "coral", Icon: ImagePlus },
  { key: "video", label: "视频", accent: "blue", Icon: Play },
  { key: "web", label: "网页", accent: "green", Icon: LayoutDashboard },
];

const samplePrompts = [
  {
    id: "seed-1",
    title: "模块化咖啡机产品爆炸图",
    uploader: "帝国小英",
    type: "产品爆炸图",
    tool: "Midjourney",
    chinese:
      "一台模块化咖啡机的爆炸分解图，展示水箱、研磨器、加热核心和金属外壳，适合工业设计提案。",
    english:
      "Exploded view of a modular espresso machine, floating components, brushed aluminum shell, translucent water tank, precision grinder, annotated industrial design render, studio lighting, ultra detailed",
    tags: ["3D渲染", "工业设计", "金属质感"],
    image:
      "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=900&q=80",
    createdAt: "2026-05-20T09:20:00.000Z",
  },
  {
    id: "seed-2",
    title: "复古港口手绘地图",
    uploader: "Eris Create Lab",
    type: "手绘地图",
    tool: "GPT image 2",
    chinese:
      "复古旅行海报风格的港口地图，带手写地名、小船、灯塔和旧纸纹理。",
    english:
      "Hand drawn illustrated map of an old harbor town, vintage travel poster style, tiny boats, lighthouse, handwritten labels, warm paper texture, charming details",
    tags: ["复古", "旅行", "插画"],
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    createdAt: "2026-05-18T14:36:00.000Z",
  },
  {
    id: "seed-3",
    title: "音乐应用深色 UI 样机",
    uploader: "Hidekazu Furukawa",
    type: "UI样机",
    tool: "Figma AI",
    chinese:
      "深色模式音乐播放器移动端界面，强调专辑封面、播放队列和清晰的底部导航。",
    english:
      "Dark mode mobile music app UI mockup, album art focus, glass controls, clean bottom navigation, queue panel, polished product screenshot, high contrast interface",
    tags: ["移动端", "暗色界面", "产品设计"],
    image:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80",
    createdAt: "2026-05-17T10:12:00.000Z",
  },
  {
    id: "seed-4",
    title: "赛博朋克雨夜街角",
    uploader: "雨夕",
    type: "动漫插画",
    tool: "Stable Diffusion",
    chinese:
      "雨夜街角的动漫场景，霓虹招牌、湿润路面反光和穿透明雨衣的人物。",
    english:
      "Anime illustration of a rainy cyberpunk street corner at night, neon shop signs, wet pavement reflections, character in translucent raincoat, cinematic color, detailed background",
    tags: ["赛博朋克", "夜景", "角色"],
    image:
      "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80",
    createdAt: "2026-05-15T21:45:00.000Z",
  },
  {
    id: "seed-5",
    title: "香水瓶商业摄影",
    uploader: "李岳",
    type: "商业摄影",
    tool: "Nano Banana Pro",
    chinese:
      "高端香水瓶商业大片，透明玻璃、花瓣、水珠和柔和侧逆光。",
    english:
      "Luxury perfume bottle product photography, transparent glass, flower petals, water droplets, soft rim light, editorial advertising composition, premium beauty campaign",
    tags: ["广告", "美妆", "摄影"],
    image:
      "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=900&q=80",
    createdAt: "2026-05-12T16:08:00.000Z",
  },
  {
    id: "seed-6",
    title: "儿童科学百科跨页",
    uploader: "オズ",
    type: "版式设计",
    tool: "seedream(豆包)",
    chinese:
      "儿童科学百科书跨页设计，主题为火山结构，包含剖面图、图标和趣味说明。",
    english:
      "Children science encyclopedia spread about volcano structure, cutaway diagram, playful icons, colorful editorial layout, friendly educational illustration, clean labels",
    tags: ["教育", "儿童", "信息图"],
    image:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=80",
    createdAt: "2026-05-10T12:27:00.000Z",
  },
];

const emptyForm = {
  title: "",
  type: "",
  tool: "",
  medium: "",
  promptText: "",
  tagsInput: "",
  resultImagesInput: "",
  referenceImagesInput: "",
  processText: "",
};

function readStoredPrompts() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return samplePrompts;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return samplePrompts;
    if (!parsed.length) return samplePrompts;
    return parsed.map((item, index) => ({
      ...item,
      uploader:
        item.uploader ||
        samplePrompts.find((sample) => sample.id === item.id)?.uploader ||
        samplePrompts[index]?.uploader ||
        "未命名",
    }));
  } catch {
    return samplePrompts;
  }
}

function readFeaturedIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FEATURED_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 5) : [];
  } catch {
    return [];
  }
}

function getFeaturedIdsFromPrompts(items) {
  return [...items]
    .filter((item) => Number(item.featuredSort) > 0)
    .sort((a, b) => Number(a.featuredSort) - Number(b.featuredSort))
    .slice(0, 5)
    .map((item) => item.id);
}

function normalizeText(value) {
  return value.trim().toLowerCase();
}

function parseTags(value) {
  return value
    .split(/[,，、\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseLines(value) {
  return value
    .split(/\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function appendLines(current, nextLines, limit = Infinity) {
  const merged = [...parseLines(current), ...nextLines.map((item) => item.trim()).filter(Boolean)];
  return Array.from(new Set(merged)).slice(0, limit).join("\n");
}

function isImageUrl(value) {
  return /^https?:\/\/\S+\.(png|jpe?g|webp|gif|avif)(\?\S*)?$/i.test(value.trim());
}

function extractDetailImages(value) {
  const text = String(value || "");
  const markdownImages = Array.from(text.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)).map(
    (match) => match[1]
  );
  const plainImageLines = text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(isImageUrl);
  return Array.from(new Set([...markdownImages, ...plainImageLines]));
}

function parseDetailContent(content, fallbackImages = []) {
  const blocks = [];
  const paragraph = [];
  const quote = [];
  const usedImages = new Set();

  function flushParagraph() {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", text: paragraph.join("\n") });
    paragraph.length = 0;
  }

  function flushQuote() {
    if (!quote.length) return;
    blocks.push({ type: "quote", text: quote.join("\n") });
    quote.length = 0;
  }

  String(content || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushParagraph();
        flushQuote();
        return;
      }

      const imageMatch = trimmed.match(/^!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)$/);
      if (imageMatch || isImageUrl(trimmed)) {
        flushParagraph();
        flushQuote();
        const src = imageMatch ? imageMatch[1] : trimmed;
        usedImages.add(src);
        blocks.push({ type: "image", src });
        return;
      }

      const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        flushParagraph();
        flushQuote();
        blocks.push({
          type: "heading",
          level: headingMatch[1].length,
          text: headingMatch[2].trim(),
        });
        return;
      }

      if (trimmed.startsWith(">")) {
        flushParagraph();
        quote.push(trimmed.replace(/^>\s?/, ""));
        return;
      }

      flushQuote();
      paragraph.push(trimmed);
    });

  flushParagraph();
  flushQuote();

  fallbackImages
    .filter((src) => src && !usedImages.has(src))
    .forEach((src) => blocks.push({ type: "image", src }));

  return blocks;
}

function shouldStorePromptAsEnglish(text) {
  const hasChinese = /[\u4e00-\u9fff]/.test(text);
  const hasEnglishLetters = /[A-Za-z]/.test(text);
  return hasEnglishLetters && !hasChinese;
}

async function adminFetch(url, options = {}) {
  let token = sessionStorage.getItem(ADMIN_TOKEN_KEY) || "";

  async function sendRequest() {
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }

  let response = await sendRequest();
  if (response.status !== 401) return response;

  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  token = window.prompt("请输入管理员口令")?.trim() || "";
  if (!token) return response;

  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  response = await sendRequest();
  if (response.status === 401) sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  return response;
}

function inferPromptMedium(item) {
  const explicitMedium = normalizeText(String(item.medium || item.media || ""));
  if (["video", "视频"].includes(explicitMedium)) return "video";
  if (["web", "网页", "website"].includes(explicitMedium)) return "web";
  if (["image", "图像", "图片"].includes(explicitMedium)) return "image";
  return "";
}

function App() {
  const [prompts, setPrompts] = useState([]);
  const [dataSource, setDataSource] = useState("local");
  const [isSyncingRemote, setIsSyncingRemote] = useState(true);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState({ kind: "all", value: "全部" });
  const [view, setView] = useState("board");
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [copiedDetail, setCopiedDetail] = useState(false);
  const [formNotice, setFormNotice] = useState("");
  const [featuredIds, setFeaturedIds] = useState(readFeaturedIds);
  const [isSavingFeatured, setIsSavingFeatured] = useState(false);
  const [showFeaturedPicker, setShowFeaturedPicker] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({ types: [], tags: [], tools: [] });
  const [draftFilters, setDraftFilters] = useState({ types: [], tags: [], tools: [] });
  const [activeMedium, setActiveMedium] = useState("");
  const [quickFilterGroup, setQuickFilterGroup] = useState("types");
  const formRef = useRef(null);
  const boardScrollTopRef = useRef(0);

  useEffect(() => {
    let active = true;

    async function loadRemotePrompts() {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch("/api/prompts", { signal: controller.signal });
        if (!response.ok) throw new Error("Remote prompts unavailable");
        const data = await response.json();
        if (active && Array.isArray(data.prompts) && data.prompts.length > 0) {
          setPrompts(data.prompts);
          setFeaturedIds(getFeaturedIdsFromPrompts(data.prompts));
          setDataSource(data.source || "feishu");
        } else {
          throw new Error("Remote prompts empty");
        }
      } catch {
        if (active) {
          setPrompts(readStoredPrompts());
          setFeaturedIds(readFeaturedIds());
          setDataSource("local");
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (active) setIsSyncingRemote(false);
      }
    }

    loadRemotePrompts();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (dataSource !== "local") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
  }, [prompts, dataSource]);

  const featuredPrompts = useMemo(() => {
    const selectedPrompts = featuredIds
      .map((id) => prompts.find((item) => item.id === id))
      .filter(Boolean);
    return selectedPrompts.length ? selectedPrompts : prompts.slice(0, 5);
  }, [featuredIds, prompts]);

  useEffect(() => {
    if (dataSource !== "local") return;
    localStorage.setItem(FEATURED_KEY, JSON.stringify(featuredIds.slice(0, 5)));
  }, [featuredIds, dataSource]);

  useEffect(() => {
    if (!featuredPrompts.length) return undefined;
    const timer = window.setInterval(() => {
      setFeaturedIndex((current) => (current + 1) % featuredPrompts.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [featuredPrompts.length]);

  useEffect(() => {
    setFeaturedIndex(0);
  }, [featuredIds]);

  const types = useMemo(
    () => Array.from(new Set(prompts.map((item) => item.type).filter(Boolean))).sort(),
    [prompts]
  );

  const tags = useMemo(
    () => Array.from(new Set(prompts.flatMap((item) => item.tags || []))).sort(),
    [prompts]
  );

  const tools = useMemo(
    () => Array.from(new Set(prompts.map((item) => item.tool).filter(Boolean))).sort(),
    [prompts]
  );

  const mediumStats = useMemo(
    () =>
      MEDIUM_DEFINITIONS.map((medium) => {
        const items = prompts.filter((item) => inferPromptMedium(item) === medium.key);
        const modelCount = new Set(items.map((item) => item.tool).filter(Boolean)).size;
        return {
          ...medium,
          count: items.length,
          modelCount,
        };
      }),
    [prompts]
  );

  const filteredPrompts = useMemo(() => {
    const keyword = normalizeText(query);
    const hasAdvancedFilters =
      appliedFilters.types.length > 0 ||
      appliedFilters.tags.length > 0 ||
      appliedFilters.tools.length > 0;
    return prompts.filter((item) => {
      const pool = [
        item.title,
        item.uploader,
        item.type,
        item.medium,
        item.tool,
        item.chinese,
        item.english,
        ...(item.tags || []),
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = !keyword || pool.includes(keyword);
      const matchesFilter =
        activeFilter.kind === "all" ||
        (activeFilter.kind === "type" && item.type === activeFilter.value) ||
        (activeFilter.kind === "tag" && (item.tags || []).includes(activeFilter.value));
      const matchesMedium = !activeMedium || inferPromptMedium(item) === activeMedium;
      const matchesAdvanced =
        !hasAdvancedFilters ||
        ((appliedFilters.types.length === 0 || appliedFilters.types.includes(item.type)) &&
          (appliedFilters.tags.length === 0 ||
            (item.tags || []).some((tag) => appliedFilters.tags.includes(tag))) &&
          (appliedFilters.tools.length === 0 || appliedFilters.tools.includes(item.tool)));
      return matchesQuery && matchesFilter && matchesMedium && matchesAdvanced;
    });
  }, [prompts, query, activeFilter, activeMedium, appliedFilters]);

  const visibleTypes = useMemo(() => {
    const source = activeMedium
      ? prompts.filter((item) => inferPromptMedium(item) === activeMedium)
      : prompts;
    return Array.from(new Set(source.map((item) => item.type).filter(Boolean))).sort();
  }, [prompts, activeMedium]);

  const visibleTags = useMemo(() => {
    if (!activeMedium) return [];
    const source = prompts.filter((item) => inferPromptMedium(item) === activeMedium);
    return Array.from(new Set(source.flatMap((item) => item.tags || []).filter(Boolean))).sort();
  }, [prompts, activeMedium]);

  const activeMediumDefinition = useMemo(
    () => MEDIUM_DEFINITIONS.find((item) => item.key === activeMedium) || null,
    [activeMedium]
  );

  const mediumFilterOptions = useMemo(() => {
    const source = activeMedium
      ? prompts.filter((item) => inferPromptMedium(item) === activeMedium)
      : prompts;
    return {
      types: Array.from(new Set(source.map((item) => item.type).filter(Boolean))).sort(),
      tags: Array.from(new Set(source.flatMap((item) => item.tags || []))).sort(),
      tools: Array.from(new Set(source.map((item) => item.tool).filter(Boolean))).sort(),
    };
  }, [prompts, activeMedium]);

  const selectedPrompt = useMemo(
    () => prompts.find((item) => item.id === selectedId) || null,
    [prompts, selectedId]
  );
  const hasAppliedFilters =
    appliedFilters.types.length > 0 ||
    appliedFilters.tags.length > 0 ||
    appliedFilters.tools.length > 0;

  function updateForm(field, value) {
    if (formNotice) setFormNotice("");
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setFormNotice("");
  }

  async function refreshPromptsFromRemote() {
    if (dataSource !== "feishu") return;
    try {
      const response = await fetch("/api/prompts");
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(data.prompts)) return;
      setPrompts(data.prompts);
      setFeaturedIds(getFeaturedIdsFromPrompts(data.prompts));
      setDataSource(data.source || "feishu");
    } catch {
      // Keep the current optimistic item if a silent refresh fails.
    }
  }

  function scheduleTranslationRefresh() {
    [2500, 6500, 12000].forEach((delay) => {
      window.setTimeout(() => {
        refreshPromptsFromRemote();
      }, delay);
    });
  }

  async function uploadFileToUrl(file) {
    if (!file) return;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = String(reader.result);
        try {
          const response = await adminFetch("/api/uploads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dataUrl, filename: file.name }),
          });
          if (!response.ok) {
            const message = await response.json().catch(() => ({}));
            throw new Error(message.error || "图片上传失败");
          }
          const data = await response.json();
          resolve(data.url || "");
        } catch (error) {
          window.alert(error instanceof Error ? error.message : "图片上传失败");
          resolve("");
        }
      };
      reader.readAsDataURL(file);
    });
  }

  async function uploadImagesToField(files, field, limit = Infinity) {
    const imageFiles = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) return;
    const urls = (await Promise.all(imageFiles.map((file) => uploadFileToUrl(file)))).filter(Boolean);
    setForm((current) => ({
      ...current,
      [field]: appendLines(current[field], urls, limit),
    }));
  }

  async function handleImagePaste(event, field, limit = Infinity) {
    const files = Array.from(event.clipboardData?.files || []).filter((file) =>
      file.type.startsWith("image/")
    );
    if (!files.length) return;
    event.preventDefault();
    await uploadImagesToField(files, field, limit);
  }

  async function pasteImageFromClipboard(field, limit = Infinity) {
    if (!navigator.clipboard?.read) {
      window.alert("当前浏览器不支持直接读取剪贴板图片，请在输入框内粘贴。");
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      const files = [];
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          files.push(new File([blob], `clipboard-${Date.now()}.png`, { type: imageType }));
        }
      }
      await uploadImagesToField(files, field, limit);
    } catch {
      window.alert("没有读取到剪贴板图片，请先复制图片后再试。");
    }
  }

  async function insertImagesIntoText(files, field, selectionStart, selectionEnd) {
    const imageFiles = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) return;
    const urls = (await Promise.all(imageFiles.map((file) => uploadFileToUrl(file)))).filter(Boolean);
    if (!urls.length) return;
    const insertText = urls.map((url) => `![图片](${url})`).join("\n\n");

    setForm((current) => {
      const value = current[field] || "";
      const start = Number.isInteger(selectionStart) ? selectionStart : value.length;
      const end = Number.isInteger(selectionEnd) ? selectionEnd : start;
      const before = value.slice(0, start).replace(/\s*$/, "");
      const after = value.slice(end).replace(/^\s*/, "");
      return {
        ...current,
        [field]: [before, insertText, after].filter(Boolean).join("\n\n"),
      };
    });
  }

  async function pasteImageIntoTextFromClipboard(field) {
    if (!navigator.clipboard?.read) {
      window.alert("当前浏览器不支持直接读取剪贴板图片，请在输入框内粘贴。");
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      const files = [];
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          files.push(new File([blob], `clipboard-${Date.now()}.png`, { type: imageType }));
        }
      }
      await insertImagesIntoText(files, field);
    } catch {
      window.alert("没有读取到剪贴板图片，请先复制图片后再试。");
    }
  }

  async function uploadImageFile(file) {
    if (!file) return;
    const url = await uploadFileToUrl(file);
    if (!url) return;
    updateForm("resultImagesInput", appendLines(form.resultImagesInput, [url]));
  }

  async function uploadImageUrl(url) {
    return url;
  }

  async function uploadDataUrl(dataUrl, filename = "image.png") {
      try {
        const response = await adminFetch("/api/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl, filename }),
        });
        if (!response.ok) {
          const message = await response.json().catch(() => ({}));
          throw new Error(message.error || "图片上传失败");
        }
        const data = await response.json();
        return data.url || "";
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "图片上传失败");
        return "";
      }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    const sourcePrompt = form.promptText.trim();
    if (!form.title.trim() || !sourcePrompt) {
      setFormNotice("请先填写标题和提示词，再添加到收藏库。");
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (!MEDIUM_DEFINITIONS.some((item) => item.label === form.medium.trim())) {
      setFormNotice("请选择图像、视频或网页中的一种媒介。");
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setIsSubmitting(true);
    setFormNotice("正在保存到飞书，翻译会在后台自动补齐。");

    const sourceIsEnglish = shouldStorePromptAsEnglish(sourcePrompt);
    const chinesePrompt = sourceIsEnglish ? "" : sourcePrompt;
    const englishPrompt = sourceIsEnglish ? sourcePrompt : "";

    const nextItem = {
      id: `prompt-${Date.now()}`,
      title: form.title.trim(),
      uploader: "Suyeya",
      type: form.type.trim() || "未分类",
      tool: form.tool.trim() || "未指定",
      medium: form.medium.trim(),
      chinese: chinesePrompt,
      english: englishPrompt,
      tags: parseTags(form.tagsInput),
      image: parseLines(form.resultImagesInput)[0] || "",
      images: parseLines(form.resultImagesInput),
      referenceImages: parseLines(form.referenceImagesInput).slice(0, 8),
      detailText: form.processText.trim(),
      detailImages: extractDetailImages(form.processText),
      createdAt: new Date().toISOString(),
    };

    if (dataSource === "feishu") {
      const response = await adminFetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...nextItem,
          detailImagesInput: form.resultImagesInput,
          referenceImagesInput: form.referenceImagesInput,
          detailText: form.processText,
          detailContentImagesInput: extractDetailImages(form.processText).join("\n"),
          status: "已发布",
          autoTranslate: true,
        }),
      });

      if (!response.ok) {
        const message = await response.json().catch(() => ({}));
        setFormNotice(message.error || "写入飞书失败，请检查权限。");
        setIsSubmitting(false);
        return;
      }

      const data = await response.json();
      setPrompts((current) => [data.prompt || nextItem, ...current]);
      scheduleTranslationRefresh();
      resetForm();
      setActiveMedium("");
      setView("board");
      setIsSubmitting(false);
      return;
    }

    setPrompts((current) =>
      [nextItem, ...current]
    );
    resetForm();
    setActiveMedium("");
    setView("board");
    setIsSubmitting(false);
  }

  function openPromptDetail(id) {
    boardScrollTopRef.current = window.scrollY || window.pageYOffset || 0;
    setSelectedId(id);
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  }

  function returnToPromptList() {
    const scrollTop = boardScrollTopRef.current || 0;
    setSelectedId(null);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: scrollTop, behavior: "auto" });
    });
  }

  function goHome() {
    setSelectedId(null);
    setView("board");
    setShowFeaturedPicker(false);
    setShowFilterPanel(false);
    setQuery("");
    setActiveMedium("");
    setActiveFilter({ kind: "all", value: "全部" });
    setAppliedFilters({ types: [], tags: [], tools: [] });
    setDraftFilters({ types: [], tags: [], tools: [] });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openMediumPage(value) {
    setSelectedId(null);
    setView("board");
    setShowFeaturedPicker(false);
    setShowFilterPanel(false);
    setQuery("");
    setActiveMedium(value);
    setQuickFilterGroup("types");
    setActiveFilter({ kind: "all", value: "全部" });
    setAppliedFilters({ types: [], tags: [], tools: [] });
    setDraftFilters({ types: [], tags: [], tools: [] });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleFeaturedPrompt(id) {
    const nextIds = featuredIds.includes(id)
      ? featuredIds.filter((itemId) => itemId !== id)
      : featuredIds.length >= 5
        ? featuredIds
        : [...featuredIds, id];
    if (nextIds === featuredIds) return;

    const previousIds = featuredIds;
    setFeaturedIds(nextIds);

    if (dataSource !== "feishu") {
      localStorage.setItem(FEATURED_KEY, JSON.stringify(nextIds.slice(0, 5)));
      return;
    }

    setIsSavingFeatured(true);
    try {
      const response = await adminFetch("/api/featured", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: nextIds }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(data.prompts)) {
        throw new Error(data.error || "精选保存失败，请检查飞书字段。");
      }
      setPrompts(data.prompts);
      setFeaturedIds(getFeaturedIdsFromPrompts(data.prompts));
    } catch (error) {
      setFeaturedIds(previousIds);
      window.alert(error instanceof Error ? error.message : "精选保存失败，请稍后再试。");
    } finally {
      setIsSavingFeatured(false);
    }
  }

  function openFilterPanel() {
    setDraftFilters(appliedFilters);
    setShowFilterPanel((current) => !current);
  }

  function toggleQuickFilter(group, value) {
    setActiveFilter({ kind: "all", value: "全部" });
    setAppliedFilters((current) => {
      const values = current[group] || [];
      const nextValues = values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value];
      const nextFilters = { ...current, [group]: nextValues };
      setDraftFilters(nextFilters);
      return nextFilters;
    });
  }

  function toggleDraftFilter(group, value) {
    setDraftFilters((current) => {
      const values = current[group] || [];
      const nextValues = values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value];
      return { ...current, [group]: nextValues };
    });
  }

  function applyDraftFilters() {
    setAppliedFilters(draftFilters);
    setActiveFilter({ kind: "all", value: "全部" });
    setShowFilterPanel(false);
  }

  function clearDraftFilters() {
    const emptyFilters = { types: [], tags: [], tools: [] };
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setActiveFilter({ kind: "all", value: "全部" });
  }

  async function copyPromptText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedDetail(true);
    window.setTimeout(() => setCopiedDetail(false), 1400);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand brand-button" onClick={goHome} aria-label="返回首页">
          <span className="brand-mark">PA</span>
          <div>
            <h1>Suyeya prompt</h1>
            <p>收集管理灵感提示词</p>
          </div>
        </button>

        <div className="search-wrap">
          <Search size={18} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题、内容、工具或标签"
          />
          {query && (
            <button className="icon-button ghost" onClick={() => setQuery("")} aria-label="清空搜索">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="top-actions">
          <span className="total-count">
            提示词收录总计：{isSyncingRemote ? "同步中" : prompts.length}
          </span>
          <button
            className={view === "board" && !activeMedium ? "nav-button active" : "nav-button"}
            onClick={goHome}
          >
            <LayoutDashboard size={17} />
            看板
          </button>
          <button
            className={showFeaturedPicker ? "nav-button active" : "nav-button"}
            onClick={() => {
              setSelectedId(null);
              setActiveMedium("");
              setActiveFilter({ kind: "all", value: "全部" });
              setView("board");
              setShowFeaturedPicker((current) => !current);
            }}
          >
            <Star size={17} />
            精选
          </button>
          <button
            className="primary-button"
            onClick={() => {
              resetForm();
              setActiveMedium("");
              setShowFeaturedPicker(false);
              setView("manage");
              window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
            }}
          >
            <Plus size={18} />
            新增
          </button>
        </div>
      </header>

      {showFeaturedPicker && view === "board" && !selectedPrompt && !activeMedium && (
        <FeaturedPicker
          prompts={prompts}
          selectedIds={featuredIds}
          isSaving={isSavingFeatured}
          onToggle={toggleFeaturedPrompt}
          onClose={() => setShowFeaturedPicker(false)}
        />
      )}

      {view === "board" && !selectedPrompt && !activeMedium && (
        <HeroPoster
          prompts={featuredPrompts}
          total={prompts.length}
          featuredIndex={featuredIndex}
          onFeaturedChange={setFeaturedIndex}
          onOpen={openPromptDetail}
        />
      )}

      {view === "board" && !selectedPrompt && !activeMedium && (
        <MediumBrowser
          items={mediumStats}
          onSelect={openMediumPage}
        />
      )}

      {view === "board" && !selectedPrompt && activeMediumDefinition && (
        <MediumPageHeader
          definition={activeMediumDefinition}
          count={filteredPrompts.length}
          onBack={goHome}
        />
      )}

      {view === "board" && !selectedPrompt && activeMedium && (
        <QuickFilterRail
          activeGroup={quickFilterGroup}
          filters={appliedFilters}
          options={{ types: visibleTypes, tags: visibleTags }}
          isPanelOpen={showFilterPanel}
          onGroupChange={setQuickFilterGroup}
          onToggle={toggleQuickFilter}
          onOpenPanel={openFilterPanel}
        />
      )}

      {view === "board" && !selectedPrompt && !activeMedium && (
        <section className="filter-strip" aria-label="筛选">
          <button
            className={
              activeFilter.kind === "all" && !hasAppliedFilters
                ? "filter-chip active"
                : "filter-chip"
            }
            onClick={() => {
              setActiveFilter({ kind: "all", value: "全部" });
              setAppliedFilters({ types: [], tags: [], tools: [] });
            }}
          >
            全部
          </button>
          {visibleTypes.map((type) => (
            <button
              key={type}
              className={
                activeFilter.kind === "type" && activeFilter.value === type
                  ? "filter-chip active"
                  : "filter-chip"
              }
              onClick={() => {
                setActiveFilter({ kind: "type", value: type });
                setAppliedFilters({ types: [], tags: [], tools: [] });
              }}
            >
              {type}
            </button>
          ))}
          {visibleTags.map((tag) => (
            <button
              key={tag}
              className={
                activeFilter.kind === "tag" && activeFilter.value === tag
                  ? "filter-chip tag active"
                  : "filter-chip tag"
              }
              onClick={() => {
                setActiveFilter({ kind: "tag", value: tag });
                setAppliedFilters({ types: [], tags: [], tools: [] });
              }}
            >
              #{tag}
            </button>
          ))}
          <button
            className={
              showFilterPanel || hasAppliedFilters
                ? "filter-chip filter-trigger active"
                : "filter-chip filter-trigger"
            }
            onClick={openFilterPanel}
          >
            <SlidersHorizontal size={16} />
            筛选
          </button>
        </section>
      )}

      {showFilterPanel && view === "board" && !selectedPrompt && (
        <div className="filter-modal-backdrop" onClick={() => setShowFilterPanel(false)}>
          <AdvancedFilterPanel
            filters={draftFilters}
            options={mediumFilterOptions}
            onToggle={toggleDraftFilter}
            onApply={applyDraftFilters}
            onClear={clearDraftFilters}
            onClose={() => setShowFilterPanel(false)}
          />
        </div>
      )}

      {view === "board" && selectedPrompt ? (
        <PromptDetail
          item={selectedPrompt}
          copied={copiedDetail}
          onBack={returnToPromptList}
          onCopy={copyPromptText}
        />
      ) : view === "board" ? (
        <Board
          prompts={filteredPrompts}
          onOpen={openPromptDetail}
          layout={
            activeMedium || activeFilter.kind !== "all" || hasAppliedFilters
              ? "packed"
              : "masonry"
          }
        />
      ) : (
        <Manage
          form={form}
          formRef={formRef}
          typeOptions={types}
          tagOptions={tags}
          toolOptions={tools}
          isSubmitting={isSubmitting}
          formNotice={formNotice}
          onFormChange={updateForm}
          onImagesToField={uploadImagesToField}
          onImagePaste={handleImagePaste}
          onPasteFromClipboard={pasteImageFromClipboard}
          onImagesIntoText={insertImagesIntoText}
          onPasteIntoText={pasteImageIntoTextFromClipboard}
          onSubmit={handleSubmit}
          onCancel={resetForm}
        />
      )}
    </main>
  );
}

function FeaturedPicker({ prompts, selectedIds, isSaving, onToggle, onClose }) {
  const selectedCount = selectedIds.length;

  return (
    <section className="featured-picker" aria-label="首页精选设置">
      <div className="featured-picker-head">
        <div>
          <strong>首页精选</strong>
          <span>{isSaving ? "正在保存到飞书..." : "选择最多 5 张提示词卡片，用于首页右侧轮播展示。"}</span>
        </div>
        <button type="button" className="secondary-button" onClick={onClose}>
          收起
        </button>
      </div>

      <div className="featured-picker-count">已选择 {selectedCount} / 5</div>

      <div className="featured-picker-grid">
        {prompts.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          const isDisabled = !isSelected && selectedCount >= 5;
          return (
            <button
              type="button"
              key={item.id}
              className={isSelected ? "featured-option selected" : "featured-option"}
              disabled={isDisabled || isSaving}
              onClick={() => onToggle(item.id)}
            >
              {item.image ? (
                <img src={item.image} alt={item.title || "精选候选图"} />
              ) : (
                <span className="featured-option-empty">
                  <ImagePlus size={18} />
                </span>
              )}
              <span>
                <strong>{item.title || "未命名提示词"}</strong>
                <small>{item.type || "未分类"}</small>
              </span>
              <i>{isSelected ? "已选" : isDisabled ? "已满" : "选择"}</i>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function MediumBrowser({ items, onSelect }) {
  return (
    <section className="medium-browser" aria-label="按媒介浏览">
      <h2>按媒介浏览</h2>
      <div className="medium-grid">
        {items.map(({ key, label, accent, Icon }) => (
          <button
            type="button"
            key={key}
            className={`medium-card ${accent}`}
            onClick={() => onSelect(key)}
          >
            <span className="medium-icon">
              <Icon size={24} strokeWidth={2.4} />
            </span>
            <ChevronRight className="medium-arrow" size={22} />
            <strong>{label}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

function MediumPageHeader({ definition, count, onBack }) {
  const { label, accent, Icon } = definition;
  return (
    <section className={`medium-page-header ${accent}`}>
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeft size={18} />
        返回首页
      </button>
      <div className="medium-page-title">
        <span className="medium-icon">
          <Icon size={26} strokeWidth={2.4} />
        </span>
        <div>
          <p>按媒介浏览</p>
          <h2>{label}提示词</h2>
        </div>
        <strong>{count.toLocaleString("zh-CN")} 条</strong>
      </div>
    </section>
  );
}

function QuickFilterRail({
  activeGroup,
  filters,
  options,
  isPanelOpen,
  onGroupChange,
  onToggle,
  onOpenPanel,
}) {
  const items = options[activeGroup] || [];
  const selectedValues = filters[activeGroup] || [];

  return (
    <section className="quick-filter-rail" aria-label="分类和标签筛选">
      <div className="quick-filter-tabs" role="tablist" aria-label="筛选类型">
        {[
          { key: "types", label: "分类" },
          { key: "tags", label: "标签" },
        ].map((group) => {
          const count = filters[group.key].length;
          return (
            <button
              type="button"
              role="tab"
              aria-selected={activeGroup === group.key}
              className={activeGroup === group.key ? "active" : ""}
              key={group.key}
              onClick={() => onGroupChange(group.key)}
            >
              {group.label}
              {count > 0 && <span>{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="quick-filter-divider" />

      <div className="quick-filter-options">
        {items.length > 0 ? (
          items.map((item, index) => {
            const isSelected = selectedValues.includes(item);
            return (
              <button
                type="button"
                className={isSelected ? `quick-filter-pill selected tone-${(index % 5) + 1}` : "quick-filter-pill"}
                aria-pressed={isSelected}
                key={item}
                onClick={() => onToggle(activeGroup, item)}
              >
                {activeGroup === "tags" ? `#${item}` : item}
              </button>
            );
          })
        ) : (
          <span className="quick-filter-empty">
            当前媒介还没有{activeGroup === "types" ? "分类" : "标签"}
          </span>
        )}
      </div>

      <button
        type="button"
        className={isPanelOpen ? "quick-filter-more active" : "quick-filter-more"}
        onClick={onOpenPanel}
        aria-label="打开完整筛选"
        aria-expanded={isPanelOpen}
      >
        <ChevronDown size={20} />
      </button>
    </section>
  );
}

function AdvancedFilterPanel({ filters, options, onToggle, onApply, onClear, onClose }) {
  const [expandedGroups, setExpandedGroups] = useState({});
  const groups = [
    { key: "types", title: "分类", items: options.types },
    { key: "tags", title: "标签", items: options.tags },
    { key: "tools", title: "模型", items: options.tools },
  ];
  const selectedCount = filters.types.length + filters.tags.length + filters.tools.length;

  function toggleExpandedGroup(key) {
    setExpandedGroups((current) => ({ ...current, [key]: !current[key] }));
  }

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <section
      className="advanced-filter-panel"
      role="dialog"
      aria-modal="true"
      aria-label="高级筛选"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="advanced-filter-head">
        <strong>筛选</strong>
        <button type="button" className="icon-button ghost" aria-label="关闭筛选" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="advanced-filter-grid">
        {groups.map((group) => {
          const isExpanded = Boolean(expandedGroups[group.key]);
          const visibleItems = isExpanded ? group.items : group.items.slice(0, 8);
          const hiddenCount = Math.max(group.items.length - visibleItems.length, 0);

          return (
            <div className={isExpanded ? "filter-group expanded" : "filter-group"} key={group.key}>
              <div className="filter-group-head">
                <strong>{group.title}</strong>
                <span>{filters[group.key].length} 已选</span>
              </div>

              <div className="filter-option-list">
                {visibleItems.length > 0 ? (
                  visibleItems.map((item, index) => {
                    const isSelected = filters[group.key].includes(item);
                    return (
                      <button
                        type="button"
                        key={item}
                        className={
                          isSelected
                            ? `filter-option selected tone-${(index % 5) + 1}`
                            : `filter-option tone-${(index % 5) + 1}`
                        }
                        onClick={() => onToggle(group.key, item)}
                      >
                        <span>{item}</span>
                        {isSelected && (
                          <i aria-hidden="true">
                            <X size={10} strokeWidth={3} />
                          </i>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <span className="filter-empty">暂无可选项</span>
                )}
              </div>

              {group.items.length > 8 && (
                <button
                  type="button"
                  className="filter-more-button"
                  onClick={() => toggleExpandedGroup(group.key)}
                >
                  {isExpanded ? "收起" : `展开 ${hiddenCount} 项`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="advanced-filter-actions">
        <span>当前选择 {selectedCount} 项，确认后更新下方卡片。</span>
        <div>
          <button type="button" className="secondary-button" onClick={onClear}>
            清空
          </button>
          <button type="button" className="primary-button" onClick={onApply}>
            确认筛选
          </button>
        </div>
      </div>
    </section>
  );
}

function HeroPoster({ prompts, total, featuredIndex, onFeaturedChange, onOpen }) {
  const featured = prompts[featuredIndex % Math.max(prompts.length, 1)];

  function moveFeatured(direction) {
    if (!prompts.length) return;
    onFeaturedChange((featuredIndex + direction + prompts.length) % prompts.length);
  }

  function openFeatured() {
    if (featured?.id) onOpen(featured.id);
  }

  return (
    <section className="hero-poster">
      <div className="hero-copy">
        <span className="hero-badge">每日收录 · 免费整理</span>
        <h2>
          灵感提示词
          <span>资料库</span>
        </h2>
        <p>
          收集自己感兴趣的AIGC提示词库，覆盖图像、视频和网页提示词。持续追踪最新模型，每日上新。
        </p>
      </div>

      <div className="hero-side">
        <div
          className={featured?.id ? "featured-card is-clickable" : "featured-card"}
          role={featured?.id ? "button" : undefined}
          tabIndex={featured?.id ? 0 : undefined}
          onClick={openFeatured}
          onKeyDown={(event) => {
            if (!featured?.id) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openFeatured();
            }
          }}
          aria-label={featured?.title ? `查看${featured.title}` : "查看精选提示词"}
        >
          <div className="featured-accent" />
          <div className="featured-ribbon">精选推荐</div>
          {featured?.image ? (
            <img src={featured.image} alt={featured.title || "精选提示词预览图"} />
          ) : (
            <div className="featured-empty">
              <ImagePlus size={32} />
            </div>
          )}
          <div className="featured-footer">
            <strong>{featured?.title || "精选提示词"}</strong>
            <span>{featured?.tool || "AI IMAGE"}</span>
          </div>
          <div className="featured-controls">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                moveFeatured(-1);
              }}
              aria-label="上一张"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                moveFeatured(1);
              }}
              aria-label="下一张"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="hero-stat">
          <span>已收录</span>
          <strong>{total.toLocaleString("zh-CN")}</strong>
          <small>条提示词</small>
        </div>
      </div>
    </section>
  );
}

function Board({ prompts, onOpen, layout = "masonry" }) {
  if (!prompts.length) {
    return (
      <section className="empty-state">
        <ImagePlus size={36} />
        <h2>没有匹配的提示词</h2>
        <p>换个关键词或筛选条件试试。</p>
      </section>
    );
  }

  const isPacked = layout === "packed" || prompts.length <= 4;

  return (
    <section className={isPacked ? "masonry packed-results" : "masonry"} aria-label="提示词瀑布流">
      {prompts.map((item) => (
        <PromptCard
          key={item.id}
          item={item}
          packed={isPacked}
          onOpen={onOpen}
        />
      ))}
    </section>
  );
}

function PromptCard({ item, packed, onOpen }) {
  const cardRef = useRef(null);

  useEffect(() => {
    if (!packed || !cardRef.current || typeof ResizeObserver === "undefined") return undefined;
    const card = cardRef.current;

    function updateSpan() {
      const grid = card.parentElement;
      if (!grid) return;
      const styles = window.getComputedStyle(grid);
      const rowHeight = Number.parseFloat(styles.gridAutoRows) || 1;
      const cardGap =
        Number.parseFloat(styles.getPropertyValue("--masonry-card-gap")) || 24;
      const height = card.getBoundingClientRect().height;
      card.style.setProperty("--masonry-span", Math.ceil((height + cardGap) / rowHeight));
    }

    const observer = new ResizeObserver(() => window.requestAnimationFrame(updateSpan));
    observer.observe(card);
    updateSpan();
    return () => observer.disconnect();
  }, [packed, item.id]);

  return (
    <article
      ref={cardRef}
      className="prompt-card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(item.id);
        }
      }}
    >
      {item.image ? (
        <img
          className="preview-image"
          src={item.image}
          alt={item.title || "提示词预览图"}
          loading="lazy"
        />
      ) : (
        <div className="preview-placeholder">
          <ImagePlus size={28} />
        </div>
      )}
      <div className="card-body">
        <h2>{item.title || "未命名提示词"}</h2>
        <div className="display-meta">
          <span>@{item.uploader || "未命名"}</span>
          <strong>{item.tool || "未指定"}</strong>
        </div>
      </div>
    </article>
  );
}

function PromptDetail({ item, copied, onBack, onCopy }) {
  const [imageIndex, setImageIndex] = useState(0);
  const [promptLanguage, setPromptLanguage] = useState("chinese");
  const [previewReference, setPreviewReference] = useState("");
  const images = item.images?.length ? item.images : [item.image].filter(Boolean);
  const activeImage = images[imageIndex] || item.image;
  const referenceImages = (item.referenceImages || []).slice(0, 8);
  const detailImages = item.detailImages || [];
  const activePrompt =
    promptLanguage === "chinese" ? item.chinese || item.english : item.english || item.chinese;
  const dateLabel = item.createdAt
    ? new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(item.createdAt))
    : "未记录";

  useEffect(() => {
    setImageIndex(0);
    setPromptLanguage("chinese");
    setPreviewReference("");
  }, [item.id]);

  useEffect(() => {
    if (!previewReference) return undefined;
    function closeOnEscape(event) {
      if (event.key === "Escape") setPreviewReference("");
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [previewReference]);

  function moveImage(direction) {
    if (!images.length) return;
    setImageIndex((current) => (current + direction + images.length) % images.length);
  }

  return (
    <section className="detail-page">
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={18} />
        返回提示词列表
      </button>

      <div className="detail-grid">
        <article className="detail-main">
          <div className="breadcrumb">提示词 / 图像 / {item.title}</div>
          <h2>{item.title}</h2>

          <div className="detail-image-wrap">
            {activeImage ? (
              <button
                type="button"
                className="detail-image-button"
                onClick={() => setPreviewReference(activeImage)}
                aria-label="查看预览大图"
              >
                <img className="detail-image" src={activeImage} alt={item.title} />
              </button>
            ) : (
              <div className="detail-image-empty">
                <ImagePlus size={40} />
              </div>
            )}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="detail-image-arrow previous"
                  onClick={() => moveImage(-1)}
                  aria-label="上一张详情图"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  className="detail-image-arrow next"
                  onClick={() => moveImage(1)}
                  aria-label="下一张详情图"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}
            {images.length > 1 && (
              <div className="detail-image-dots">
                {images.map((_, index) => (
                  <button
                    type="button"
                    key={index}
                    className={index === imageIndex ? "active" : ""}
                    onClick={() => setImageIndex(index)}
                    aria-label={`切换结果图 ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {referenceImages.length > 0 && (
            <div className="reference-strip">
              <div className="reference-heading">参考图</div>
              <div className="reference-grid">
                {referenceImages.map((image, index) => (
                  <button
                    type="button"
                    key={`${image}-${index}`}
                    onClick={() => setPreviewReference(image)}
                    aria-label={`查看参考图 ${index + 1}`}
                  >
                    <img src={image} alt={`参考图 ${index + 1}`} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="prompt-box">
            <div className="prompt-box-head">
              <strong>{promptLanguage === "chinese" ? "中文提示词" : "English Prompt"}</strong>
              <div className="prompt-head-actions">
                <button type="button" onClick={() => onCopy(activePrompt)} disabled={!activePrompt}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "已复制" : "复制提示词"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPromptLanguage((current) => (current === "chinese" ? "english" : "chinese"))
                  }
                >
                  {promptLanguage === "chinese" ? "切换英文" : "切换中文"}
                </button>
              </div>
            </div>
            <p>{activePrompt || "暂无提示词内容"}</p>
          </div>

        </article>

        <aside className="detail-side">
          <section className="side-card author-card">
            <div className="avatar">{(item.uploader || "未").slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>@{item.uploader || "未命名"}</strong>
              <span>提示词上传人</span>
            </div>
          </section>

          <section className="side-card meta-card">
            <div>
              <span>发布时间</span>
              <strong>
                <CalendarDays size={16} />
                {dateLabel}
              </strong>
            </div>
            <div>
              <span>模型</span>
              <strong>{item.tool || "未指定"}</strong>
            </div>
            <div>
              <span>分类</span>
              <strong>{item.type || "未分类"}</strong>
            </div>
            <div>
              <span>标签</span>
              <div className="detail-tags">
                {(item.tags || []).length > 0 ? (
                  item.tags.map((tag) => <span key={tag}>{tag}</span>)
                ) : (
                  <span>未添加标签</span>
                )}
              </div>
            </div>
          </section>

        </aside>
      </div>
      <DetailArticle
        content={item.detailText}
        images={detailImages}
        onPreviewImage={setPreviewReference}
      />
      {previewReference && (
        <div
          className="reference-modal"
          role="dialog"
          aria-modal="true"
          aria-label="图片预览"
          onClick={() => setPreviewReference("")}
        >
          <button type="button" aria-label="关闭参考图" onClick={() => setPreviewReference("")}>
            <X size={22} />
          </button>
          <img src={previewReference} alt="参考图预览" onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </section>
  );
}

function DetailArticle({ content, images, onPreviewImage }) {
  const blocks = parseDetailContent(content, images);
  if (!blocks.length) return null;
  const headings = blocks.filter((block) => block.type === "heading");

  return (
    <section className="process-section detail-article-section">
      <div className="article-heading-row">
        <h3>详情介绍</h3>
      </div>
      <div className={headings.length > 1 ? "detail-article-layout has-toc" : "detail-article-layout"}>
        <div className="detail-article-body">
          {blocks.map((block, index) => {
            if (block.type === "heading") {
              const HeadingTag = block.level === 1 ? "h4" : "h5";
              return (
                <HeadingTag key={`${block.text}-${index}`} id={`detail-heading-${index}`}>
                  {block.text}
                </HeadingTag>
              );
            }

            if (block.type === "quote") {
              return <blockquote key={`${block.text}-${index}`}>{block.text}</blockquote>;
            }

            if (block.type === "image") {
              return (
                <button
                  type="button"
                  className="article-image-button"
                  key={`${block.src}-${index}`}
                  onClick={() => onPreviewImage(block.src)}
                  aria-label={`查看详情插图 ${index + 1}`}
                >
                  <img src={block.src} alt={`详情插图 ${index + 1}`} />
                </button>
              );
            }

            return <p key={`${block.text}-${index}`}>{block.text}</p>;
          })}
        </div>

        {headings.length > 1 && (
          <aside className="detail-article-toc">
            <strong>目录</strong>
            {headings.map((heading, headingIndex) => (
              <span key={`${heading.text}-${headingIndex}`}>{heading.text}</span>
            ))}
          </aside>
        )}
      </div>
    </section>
  );
}

function Manage({
  form,
  formRef,
  typeOptions,
  tagOptions,
  toolOptions,
  isSubmitting,
  formNotice,
  onFormChange,
  onImagesToField,
  onImagePaste,
  onPasteFromClipboard,
  onImagesIntoText,
  onPasteIntoText,
  onSubmit,
  onCancel,
}) {
  return (
    <section className="manage-layout">
      <form className="editor-panel" ref={formRef} onSubmit={onSubmit} aria-busy={isSubmitting}>
        <div className="panel-heading">
          <div>
            <h2>新增提示词</h2>
          </div>
        </div>

        <div className="editor-form-columns">
          <div className="editor-main-fields">
        <div className="form-grid compact-fields">
          <label className="plain-field">
            标题
            <input
              value={form.title}
              onChange={(event) => onFormChange("title", event.target.value)}
              placeholder="例如：模块化咖啡机产品爆炸图"
              required
            />
          </label>
          <ComboInput
            label="分类"
            value={form.type}
            options={typeOptions}
            placeholder="产品场景图"
            onChange={(value) => onFormChange("type", value)}
            onSelect={(value) => onFormChange("type", value)}
          />
        </div>

        <div className="form-grid compact-fields with-wide-tag">
          <ComboInput
            label="生成工具"
            value={form.tool}
            options={toolOptions}
            placeholder="GPT image 2"
            maxSelected={1}
            onChange={(value) => onFormChange("tool", value)}
            onSelect={(value) => onFormChange("tool", value)}
          />
          <ComboInput
            label="媒介"
            value={form.medium}
            options={MEDIUM_DEFINITIONS.map((item) => item.label)}
            placeholder="请选择媒介"
            maxSelected={1}
            allowCustom={false}
            onChange={(value) => onFormChange("medium", value)}
            onSelect={(value) => onFormChange("medium", value)}
          />
          <ComboInput
            label="标签"
            value={form.tagsInput}
            options={tagOptions}
            placeholder="复古，3D渲染，赛博朋克"
            maxSelected={Infinity}
            onChange={(value) => onFormChange("tagsInput", value)}
            onSelect={(value, nextValues) => {
              const nextTags = nextValues || parseTags(form.tagsInput).concat(value);
              onFormChange("tagsInput", Array.from(new Set(nextTags)).join("，"));
            }}
          />
        </div>

        <label className="prompt-field full-prompt-field">
          <span className="label-row">
            提示词
            <button
              type="button"
              className="text-tool-button"
              disabled
            >
              <Languages size={15} />
              提交后后台翻译
            </button>
          </span>
          <textarea
            value={form.promptText}
            onChange={(event) => onFormChange("promptText", event.target.value)}
            placeholder="中文或英文都可以，提交后会在后台自动补齐另一种语言"
            rows={3}
            required
          />
        </label>

          </div>

          <div className="editor-media-fields">
        <UploadModule
          title="预览图 / 结果图"
          description="首页展示第一张；详情页可用圆点切换，3秒自动轮播。"
          field="resultImagesInput"
          value={form.resultImagesInput}
          onFormChange={onFormChange}
          onImagesToField={onImagesToField}
          onImagePaste={onImagePaste}
          onPasteFromClipboard={onPasteFromClipboard}
        />

        <UploadModule
          title="参考图"
          description="最多8张，详情页展示缩略图，点击放大；没有可留空。"
          field="referenceImagesInput"
          value={form.referenceImagesInput}
          limit={8}
          onFormChange={onFormChange}
          onImagesToField={onImagesToField}
          onImagePaste={onImagePaste}
          onPasteFromClipboard={onPasteFromClipboard}
        />

        <RichDetailEditor
          value={form.processText}
          onFormChange={onFormChange}
          onImagesIntoText={onImagesIntoText}
          onPasteIntoText={onPasteIntoText}
        />

          </div>
        </div>

        <div className="form-actions">
          {formNotice && (
            <p className="form-notice" role="status">
              {formNotice}
            </p>
          )}
          <button
            className="primary-button"
            type="submit"
            disabled={isSubmitting || !form.title.trim() || !form.promptText.trim()}
          >
            <Check size={18} />
            {isSubmitting ? "写入中" : "添加提示词"}
          </button>
          <button className="secondary-button" type="button" onClick={onCancel} disabled={isSubmitting}>
            清空
          </button>
        </div>
      </form>
    </section>
  );
}

function ComboInput({
  label,
  value,
  options,
  placeholder,
  maxSelected = 1,
  allowCustom = true,
  onChange,
  onSelect,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const cleanOptions = Array.from(new Set((options || []).filter(Boolean)));
  const selectedValues = parseTags(value).slice(0, maxSelected);
  const selectedValueSet = new Set(selectedValues);
  const availableOptions = cleanOptions.filter((option) => !selectedValueSet.has(option));
  const shellClassName = [
    isOpen ? "combo-shell open" : "combo-shell",
    selectedValues.length > 0 ? "has-pills" : "",
  ]
    .filter(Boolean)
    .join(" ");

  function removeSelectedValue(valueToRemove) {
    const nextValues = selectedValues.filter((selectedValue) => selectedValue !== valueToRemove);
    onChange(nextValues.join("，"));
    setIsOpen(false);
  }

  function selectValue(nextValue) {
    if (maxSelected === 1) {
      onSelect(nextValue);
      setIsOpen(false);
      return;
    }

    const currentValues = parseTags(value);
    const nextValues = currentValues.includes(nextValue) ? currentValues : [...currentValues, nextValue];
    onSelect(nextValue, nextValues);
    setIsOpen(false);
  }

  return (
    <label className="combo-field">
      <span>{label}</span>
      <div className={shellClassName}>
        {selectedValues.length > 0 && (
          <div className="choice-pills">
            {selectedValues.map((selectedValue, index) => (
              <span className={`choice-pill tone-${(index % 5) + 1}`} key={selectedValue}>
                <span className="choice-pill-text">{selectedValue}</span>
                <button
                  type="button"
                  className="choice-remove"
                  aria-label={`删除${selectedValue}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeSelectedValue(selectedValue);
                  }}
                >
                  <X size={10} strokeWidth={3} />
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          value={value}
          onChange={(event) => {
            if (!allowCustom) return;
            onChange(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          placeholder={placeholder}
          autoComplete="off"
          readOnly={!allowCustom}
        />
        <button
          type="button"
          className="combo-toggle"
          aria-label={`展开${label}候选`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setIsOpen((current) => !current)}
        >
          <ChevronRight size={16} />
        </button>
        {isOpen && availableOptions.length > 0 && (
          <div className="combo-menu" role="listbox">
            {availableOptions.map((option) => (
              <button
                type="button"
                key={option}
                role="option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  selectValue(option);
                }}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </label>
  );
}

function RichDetailEditor({ value, onFormChange, onImagesIntoText, onPasteIntoText }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  async function handlePaste(event) {
    const files = Array.from(event.clipboardData?.files || []).filter((file) =>
      file.type.startsWith("image/")
    );
    if (!files.length) return;
    event.preventDefault();
    await onImagesIntoText(files, "processText", event.target.selectionStart, event.target.selectionEnd);
  }

  async function handleFileChange(event) {
    const target = textareaRef.current;
    await onImagesIntoText(
      event.target.files,
      "processText",
      target?.selectionStart,
      target?.selectionEnd
    );
    event.target.value = "";
  }

  return (
    <section className="upload-module detail-editor-module">
      <div className="upload-module-head">
        <div>
          <strong>详情正文</strong>
          <span>文字和图片会按正文顺序展示。</span>
        </div>
        <div className="upload-actions">
          <button type="button" onClick={() => onPasteIntoText("processText")}>
            粘贴图片
          </button>
          <label className="upload-action-file">
            上传图片
            <input type="file" accept="image/*" multiple onChange={handleFileChange} />
          </label>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => {
          event.target.style.height = "auto";
          event.target.style.height = `${event.target.scrollHeight}px`;
          onFormChange("processText", event.target.value);
        }}
        onPaste={handlePaste}
        placeholder={"# 为什么这个提示词有效\n正文段落...\n> 这里可以写重点提示\n\n粘贴图片会自动插入到正文里"}
        rows={5}
      />
    </section>
  );
}

function UploadModule({
  title,
  description,
  field,
  value,
  limit = Infinity,
  compact = false,
  onFormChange,
  onImagesToField,
  onImagePaste,
  onPasteFromClipboard,
}) {
  const images = parseLines(value);
  const canAddMore = images.length < limit;
  const moduleClassName = [
    compact ? "upload-module compact-upload-module" : "upload-module",
    `upload-${field}`,
  ].join(" ");

  return (
    <section className={moduleClassName}>
      <div className="upload-module-head">
        <div>
          <strong>{title}</strong>
          <span>{description}</span>
        </div>
        <div className="upload-actions">
          <button type="button" onClick={() => onPasteFromClipboard(field, limit)} disabled={!canAddMore}>
            粘贴图片
          </button>
          <label className="upload-action-file">
            上传图片
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={!canAddMore}
              onChange={async (event) => {
                await onImagesToField(event.target.files, field, limit);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {images.length > 0 && (
        <div className="upload-preview-row">
          {images.map((image, index) => (
            <div key={`${image}-${index}`} className="upload-preview-item">
              <img src={image} alt={`${title} ${index + 1}`} />
              <span>{index + 1}</span>
            </div>
          ))}
        </div>
      )}

      <textarea
        value={value}
        onChange={(event) =>
          onFormChange(field, limit === Infinity ? event.target.value : parseLines(event.target.value).slice(0, limit).join("\n"))
        }
        onPaste={(event) => onImagePaste(event, field, limit)}
        placeholder="可粘贴图片链接；也可以直接复制图片后在这里粘贴上传"
        rows={compact ? 1 : 2}
      />
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App />);

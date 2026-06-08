import http from "node:http";
import { createHash } from "node:crypto";
import { URL } from "node:url";
import {
  createPromptInFeishu,
  loadPromptsFromFeishu,
  updateFeaturedPromptsInFeishu,
  updatePromptTranslationInFeishu,
} from "./services/feishu.mjs";
import { loadEnvFile } from "./services/env.mjs";
import { uploadDataUrlToR2 } from "./services/r2.mjs";

loadEnvFile();

const port = Number(process.env.API_PORT || 8787);
const googleTranslateTimeoutMs = Number(process.env.GOOGLE_TRANSLATE_TIMEOUT_MS || 4_000);
const baiduTranslateTimeoutMs = Number(process.env.BAIDU_TRANSLATE_TIMEOUT_MS || 12_000);
const customTranslateTimeoutMs = Number(process.env.TRANSLATION_API_TIMEOUT_MS || 12_000);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 12 * 1024 * 1024) {
        rejectBody(new Error("Request body is too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolveBody(body ? JSON.parse(body) : {});
      } catch {
        rejectBody(new Error("Invalid JSON body"));
      }
    });
    request.on("error", rejectBody);
  });
}

async function translateText(text, direction) {
  const trimmed = String(text || "").trim();
  if (!trimmed) throw new Error("没有可翻译的内容。");

  const attempts = [
    ["google", "Google", () => translateWithGoogle(trimmed, direction)],
    ["baidu", "百度", () => translateWithBaidu(trimmed, direction)],
    ["custom", "自定义", () => translateWithCustomService(trimmed, direction)],
  ];
  const errors = [];

  for (const [provider, providerLabel, translate] of attempts) {
    try {
      const translated = await translate();
      if (translated) return { text: translated, provider };
    } catch (error) {
      errors.push(`${providerLabel}: ${error instanceof Error ? error.message : "请求失败"}`);
    }
  }

  throw new Error(
    `自动翻译暂时不可用。请检查翻译服务配置。${errors.length ? `(${errors.join("；")})` : ""}`,
  );
}

async function translatePromptInBackground(prompt) {
  if (!prompt?.id) return;
  const chinese = String(prompt.chinese || "").trim();
  const english = String(prompt.english || "").trim();
  const englishHasChinese = /[\u4e00-\u9fff]/.test(english);
  if (chinese && english && !englishHasChinese) return;

  if (englishHasChinese) {
    const sourceText = chinese || english;
    const translated = await translateText(sourceText, "zh-en");
    await updatePromptTranslationInFeishu(prompt.id, {
      chinese: sourceText,
      english: translated.text,
    });
    return;
  }

  const sourceIsEnglish = Boolean(english && !chinese);
  const sourceText = sourceIsEnglish ? english : chinese;
  if (!sourceText) return;

  const translated = await translateText(sourceText, sourceIsEnglish ? "en-zh" : "zh-en");
  await updatePromptTranslationInFeishu(prompt.id, {
    chinese: sourceIsEnglish ? translated.text : chinese,
    english: sourceIsEnglish ? english : translated.text,
  });
}

async function translateWithGoogle(text, direction) {
  const googleKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!googleKey) return "";

  const target = direction === "en-zh" ? "zh-CN" : "en";
  const source = direction === "en-zh" ? "en" : "zh-CN";
  const url = new URL("https://translation.googleapis.com/language/translate/v2");
  url.searchParams.set("key", googleKey);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(googleTranslateTimeoutMs),
    body: JSON.stringify({
      q: text,
      source,
      target,
      format: "text",
    }),
  });
  const data = await response.json().catch(() => ({}));
  const translated = data.data?.translations?.[0]?.translatedText;
  if (!response.ok || !translated) {
    throw new Error(data.error?.message || "Google 翻译暂时不可用。");
  }
  return translated;
}

async function translateWithBaidu(text, direction) {
  const appId = process.env.BAIDU_TRANSLATE_APP_ID;
  const secretKey = process.env.BAIDU_TRANSLATE_SECRET_KEY;
  if (!appId || !secretKey) return "";

  const from = direction === "en-zh" ? "en" : "zh";
  const to = direction === "en-zh" ? "zh" : "en";
  const salt = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  const sign = createHash("md5").update(`${appId}${text}${salt}${secretKey}`).digest("hex");
  const params = new URLSearchParams({
    q: text,
    from,
    to,
    appid: appId,
    salt,
    sign,
  });

  const response = await fetch("https://fanyi-api.baidu.com/api/trans/vip/translate", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal: AbortSignal.timeout(baiduTranslateTimeoutMs),
    body: params,
  });
  const data = await response.json().catch(() => ({}));
  const translated = data.trans_result?.map((item) => item.dst).filter(Boolean).join("\n");
  if (!response.ok || !translated) {
    throw new Error(data.error_msg || data.error_code || "百度翻译暂时不可用。");
  }
  return translated;
}

async function translateWithCustomService(text, direction) {
  if (!process.env.TRANSLATION_API_URL) return "";

  const response = await fetch(process.env.TRANSLATION_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.TRANSLATION_API_KEY
        ? { Authorization: `Bearer ${process.env.TRANSLATION_API_KEY}` }
        : {}),
    },
    signal: AbortSignal.timeout(customTranslateTimeoutMs),
    body: JSON.stringify({ text, direction }),
  });
  const data = await response.json().catch(() => ({}));
  const translated = data.text || data.translation || data.translatedText;
  if (!response.ok || !translated) throw new Error(data.error || "自定义翻译暂时不可用。");
  return translated;
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/config") {
      sendJson(response, 200, {
        feishuTableUrl: process.env.FEISHU_TABLE_URL || "",
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/prompts") {
      const prompts = await loadPromptsFromFeishu();
      sendJson(response, 200, { source: "feishu", prompts });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/prompts") {
      const body = await readJsonBody(request);
      if (!["图像", "视频", "网页"].includes(String(body.medium || "").trim())) {
        sendJson(response, 400, { error: "请选择图像、视频或网页中的一种媒介。" });
        return;
      }
      const prompt = await createPromptInFeishu(body);
      sendJson(response, 201, { source: "feishu", prompt });
      if (body.autoTranslate !== false) {
        translatePromptInBackground(prompt).catch((error) => {
          console.warn(
            `Background translation failed for ${prompt.id}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        });
      }
      return;
    }

    if (request.method === "PUT" && url.pathname === "/api/featured") {
      const body = await readJsonBody(request);
      const prompts = await updateFeaturedPromptsInFeishu(body.ids || []);
      sendJson(response, 200, { source: "feishu", prompts });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/uploads") {
      const body = await readJsonBody(request);
      const uploadedUrl = await uploadDataUrlToR2(body.dataUrl, body.filename);
      sendJson(response, 201, { url: uploadedUrl });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/translate") {
      const body = await readJsonBody(request);
      const translated = await translateText(body.text, body.direction);
      sendJson(response, 200, translated);
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Unknown server error",
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Prompt Atlas API listening on http://127.0.0.1:${port}`);
});

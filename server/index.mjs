import http from "node:http";
import { createHash, timingSafeEqual } from "node:crypto";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
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

const port = Number(process.env.PORT || process.env.API_PORT || 8787);
const host = process.env.HOST || "0.0.0.0";
const adminToken = String(process.env.ADMIN_TOKEN || "").trim();
const distDir = resolve(process.cwd(), "dist");
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

function isAdminAuthorized(request) {
  if (!adminToken) return true;
  const authorization = String(request.headers.authorization || "");
  const providedToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!providedToken) return false;
  const expected = Buffer.from(adminToken);
  const provided = Buffer.from(providedToken);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

function requireAdmin(request, response) {
  if (isAdminAuthorized(request)) return true;
  sendJson(response, 401, { error: "需要管理员口令。" });
  return false;
}

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function serveFile(request, response, filePath, pathname) {
  const extension = extname(filePath).toLowerCase();
  response.writeHead(200, {
    "Content-Type": contentTypes[extension] || "application/octet-stream",
    "Cache-Control": pathname.startsWith("/assets/")
      ? "public, max-age=31536000, immutable"
      : "no-cache",
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(filePath).pipe(response);
}

function serveFrontend(request, response, url) {
  if (!["GET", "HEAD"].includes(request.method) || !existsSync(distDir)) return false;

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return false;
  }

  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const requestedPath = resolve(distDir, relativePath);
  const isInsideDist = requestedPath === distDir || requestedPath.startsWith(`${distDir}${sep}`);
  if (!isInsideDist) return false;

  if (existsSync(requestedPath) && statSync(requestedPath).isFile()) {
    serveFile(request, response, requestedPath, pathname);
    return true;
  }

  if (!extname(pathname)) {
    const indexPath = resolve(distDir, "index.html");
    if (existsSync(indexPath)) {
      serveFile(request, response, indexPath, "/index.html");
      return true;
    }
  }
  return false;
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
        adminProtected: Boolean(adminToken),
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/prompts") {
      const prompts = await loadPromptsFromFeishu();
      sendJson(response, 200, { source: "feishu", prompts });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/prompts") {
      if (!requireAdmin(request, response)) return;
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
      if (!requireAdmin(request, response)) return;
      const body = await readJsonBody(request);
      const prompts = await updateFeaturedPromptsInFeishu(body.ids || []);
      sendJson(response, 200, { source: "feishu", prompts });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/uploads") {
      if (!requireAdmin(request, response)) return;
      const body = await readJsonBody(request);
      const uploadedUrl = await uploadDataUrlToR2(body.dataUrl, body.filename);
      sendJson(response, 201, { url: uploadedUrl });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/translate") {
      if (!requireAdmin(request, response)) return;
      const body = await readJsonBody(request);
      const translated = await translateText(body.text, body.direction);
      sendJson(response, 200, translated);
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      sendJson(response, 404, { error: "Not found" });
      return;
    }

    if (serveFrontend(request, response, url)) return;
    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Unknown server error",
    });
  }
});

server.listen(port, host, () => {
  console.log(`Prompt Atlas listening on http://${host}:${port}`);
});

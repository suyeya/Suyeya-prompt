import http from "node:http";
import { URL } from "node:url";
import { createPromptInFeishu, loadPromptsFromFeishu } from "./services/feishu.mjs";
import { loadEnvFile } from "./services/env.mjs";
import { uploadDataUrlToR2 } from "./services/r2.mjs";

loadEnvFile();

const port = Number(process.env.API_PORT || 8787);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
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
  if (!trimmed) throw new Error("没有可翻译的内容");

  const googleKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (googleKey) {
    const target = direction === "en-zh" ? "zh-CN" : "en";
    const source = direction === "en-zh" ? "en" : "zh-CN";
    const url = new URL("https://translation.googleapis.com/language/translate/v2");
    url.searchParams.set("key", googleKey);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: trimmed,
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

  if (!process.env.TRANSLATION_API_URL) {
    throw new Error("还没有配置 Google 翻译 API Key，请先手动填写另一种语言。");
  }

  const response = await fetch(process.env.TRANSLATION_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.TRANSLATION_API_KEY
        ? { Authorization: `Bearer ${process.env.TRANSLATION_API_KEY}` }
        : {}),
    },
    body: JSON.stringify({ text: trimmed, direction }),
  });
  const data = await response.json().catch(() => ({}));
  const translated = data.text || data.translation || data.translatedText;
  if (!response.ok || !translated) throw new Error(data.error || "自动翻译暂时不可用。");
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
      const prompt = await createPromptInFeishu(body);
      sendJson(response, 201, { source: "feishu", prompt });
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
      const text = await translateText(body.text, body.direction);
      sendJson(response, 200, { text });
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

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { loadEnvFile } from "./env.mjs";

loadEnvFile();

let client = null;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function getR2Client() {
  if (client) return client;

  const accountId = requiredEnv("R2_ACCOUNT_ID");
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

function extensionForMime(mime) {
  if (mime === "image/jpeg" || mime === "image/jpg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  return "";
}

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/i.exec(dataUrl || "");
  if (!match) throw new Error("Only base64 image data URLs are supported");
  return {
    mime: match[1].toLowerCase(),
    buffer: Buffer.from(match[2], "base64"),
  };
}

function buildPublicUrl(key) {
  const baseUrl = requiredEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");
  return `${baseUrl}/${key}`;
}

export async function uploadDataUrlToR2(dataUrl, filename = "image.png") {
  const bucket = requiredEnv("R2_BUCKET");
  const { mime, buffer } = parseDataUrl(dataUrl);
  const rawExtension = extname(filename).toLowerCase();
  const extension = rawExtension || extensionForMime(mime);
  const safeBaseName = filename
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w.-]+/g, "-")
    .slice(0, 80);
  const key = `prompt-images/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${safeBaseName || randomUUID()}${extension}`;

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mime,
    })
  );

  return buildPublicUrl(key);
}

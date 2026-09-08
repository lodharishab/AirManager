import { logWarning } from "./logger";
import { Client } from "@replit/object-storage";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";

let _client: Client | null = null;

function getClient(): Client {
  if (!_client) {
    _client = new Client();
  }
  return _client;
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Local fallback directory for environments without Replit object storage
const LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || "/opt/AirManager/uploads";

function localPathFor(objectName: string): string {
  return path.join(LOCAL_UPLOAD_DIR, objectName.replace(/^uploads\//, ""));
}

function isVideoMime(mimetype: string): boolean {
  return ALLOWED_VIDEO_MIME_TYPES.includes(mimetype);
}

export function validateImageFile(file: { mimetype: string; size: number }): string | null {
  const isMedia = ALLOWED_MIME_TYPES.includes(file.mimetype) || isVideoMime(file.mimetype);
  if (!isMedia) {
    return "Only JPEG, PNG, WebP images and MP4/MOV/WebM videos are accepted";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File size must be under 10MB";
  }
  return null;
}

export async function uploadImage(
  buffer: Buffer,
  _originalName: string,
  mimetype: string
): Promise<string> {
  const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
  const ext = extensions[mimetype];
  if (!ext) throw new Error("Unsupported media type");
  const uniqueName = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  // Try object storage first; fall back to local disk when it is unavailable
  try {
    const result = await getClient().uploadFromBytes(uniqueName, buffer);
    if (result.ok) {
      return uniqueName;
    }
    throw new Error((result.error as { message?: string })?.message || "Unknown object storage error");
  } catch {
    const localFile = localPathFor(uniqueName);
    mkdirSync(path.dirname(localFile), { recursive: true });
    writeFileSync(localFile, buffer);
    return uniqueName;
  }
}

export async function deleteImage(objectName: string): Promise<void> {
  try {
    const result = await getClient().delete(objectName);
    if (!result.ok) {
      logWarning(`Failed to delete image from storage: ${objectName}`);
    }
  } catch {
    logWarning(`Object storage unavailable; attempting local delete: ${objectName}`);
  }
  try {
    const localFile = localPathFor(objectName);
    if (existsSync(localFile)) {
      const { unlinkSync } = await import("fs");
      unlinkSync(localFile);
    }
  } catch {
    // ignore local delete errors
  }
}

export async function getImageBuffer(objectName: string): Promise<Buffer | null> {
  // Local disk first (fast path when object storage is unavailable)
  try {
    const localFile = localPathFor(objectName);
    if (existsSync(localFile)) {
      return readFileSync(localFile);
    }
  } catch {
    // fall through to object storage
  }
  try {
    const result = await getClient().downloadAsBytes(objectName);
    if (!result.ok) {
      return null;
    }
    return result.value[0];
  } catch {
    return null;
  }
}

export function isObjectStorageUrl(url: string): boolean {
  return url.startsWith("uploads/");
}

const MIME_MAP: Record<string, string> = {
  png: "image/png",
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  m4v: "video/mp4",
};

export function getMimeType(objectName: string): string {
  const ext = objectName.split(".").pop()?.toLowerCase() || "";
  return MIME_MAP[ext] || "application/octet-stream";
}

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

const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Local fallback directory for environments without Replit object storage
const LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || "/opt/AirManager/uploads";

function localPathFor(objectName: string): string {
  return path.join(LOCAL_UPLOAD_DIR, objectName.replace(/^uploads\//, ""));
}

/**
 * Content families we can recognise from a file signature. MP4 and QuickTime
 * share the ISO base media container and are only distinguished by an internal
 * brand, so they are deliberately treated as one family rather than rejecting
 * a valid .mov that a browser labelled video/mp4.
 */
type MediaFamily = "jpeg" | "png" | "webp" | "isobmff" | "webm";

const MIME_FAMILY: Record<string, MediaFamily> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "isobmff",
  "video/quicktime": "isobmff",
  "video/webm": "webm",
};

/** Identify a buffer by its magic bytes, ignoring any client-supplied label. */
function detectFamily(buffer: Buffer): MediaFamily | null {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";

  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "png";
  }

  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return "webp";
  }

  // EBML header, used by both WebM and Matroska.
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return "webm";
  }

  // ISO base media: a size field followed by the 'ftyp' box type.
  if (buffer.toString("ascii", 4, 8) === "ftyp") return "isobmff";

  return null;
}

export function validateImageFile(file: { mimetype: string; size: number; buffer?: Buffer }): string | null {
  const declaredFamily = MIME_FAMILY[file.mimetype];
  if (!declaredFamily) {
    return "Only JPEG, PNG, WebP images and MP4/MOV/WebM videos are accepted";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File size must be under 10MB";
  }

  // multer is configured with memoryStorage, so the bytes are always present.
  // Guard anyway so a future streaming storage engine fails closed rather than
  // silently falling back to trusting the declared Content-Type.
  if (!file.buffer) {
    return "File contents could not be read for verification";
  }

  const actualFamily = detectFamily(file.buffer);
  if (!actualFamily) {
    return "File contents are not a recognised JPEG, PNG, WebP, MP4/MOV or WebM file";
  }
  if (actualFamily !== declaredFamily) {
    return "File contents do not match the declared file type";
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

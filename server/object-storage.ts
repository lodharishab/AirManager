import { Client } from "@replit/object-storage";

let _client: Client | null = null;

function getClient(): Client {
  if (!_client) {
    _client = new Client();
  }
  return _client;
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function validateImageFile(file: { mimetype: string; size: number }): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return "Only JPEG, PNG, and WebP images are accepted";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File size must be under 10MB";
  }
  return null;
}

export async function uploadImage(
  buffer: Buffer,
  originalName: string,
  mimetype: string
): Promise<string> {
  const ext = originalName.split(".").pop()?.toLowerCase() || "jpg";
  const uniqueName = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const result = await getClient().uploadFromBytes(uniqueName, buffer);
  if (!result.ok) {
    throw new Error(`Failed to upload image: ${(result.error as any)?.message || "Unknown error"}`);
  }

  return uniqueName;
}

export async function deleteImage(objectName: string): Promise<void> {
  const result = await getClient().delete(objectName);
  if (!result.ok) {
    console.warn(`Failed to delete image from storage: ${objectName}`);
  }
}

export async function getImageBuffer(objectName: string): Promise<Buffer | null> {
  const result = await getClient().downloadAsBytes(objectName);
  if (!result.ok) {
    return null;
  }
  return result.value[0];
}

export function isObjectStorageUrl(url: string): boolean {
  return url.startsWith("uploads/");
}

export function getMimeType(objectName: string): string {
  const ext = objectName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png": return "image/png";
    case "webp": return "image/webp";
    case "jpg":
    case "jpeg":
    default: return "image/jpeg";
  }
}

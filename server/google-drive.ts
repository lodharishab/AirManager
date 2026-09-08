import { storage } from "./storage";
import { config } from "./config";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  webViewLink?: string;
}

export async function importFromGoogleDrive(folderId: string, propertyId?: number): Promise<number> {
  const apiKey = config.googleDrive.apiKey;
  if (!apiKey) {
    throw new Error("Google Drive API key not configured. Set GOOGLE_DRIVE_API_KEY in environment variables.");
  }

  const listUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'&fields=files(id,name,mimeType,thumbnailLink,webContentLink,webViewLink)&key=${apiKey}&pageSize=100`;

  const response = await fetch(listUrl);
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google Drive API error: ${response.status} — ${err}`);
  }

  const data = await response.json() as { files: DriveFile[] };
  if (!data.files || data.files.length === 0) {
    return 0;
  }

  const allImagesResult = await storage.getGalleryImages({ page: 1, limit: 10000 });
  const existingDriveIds = new Set(allImagesResult.data.filter((img) => img.driveFileId).map((img) => img.driveFileId));

  let imported = 0;
  for (const file of data.files) {
    if (existingDriveIds.has(file.id)) continue;

    const imageUrl = `https://drive.google.com/thumbnail?id=${file.id}&sz=w1200`;

    await storage.createGalleryImage({
      propertyId: propertyId || null,
      imageUrl,
      title: file.name.replace(/\.[^/.]+$/, ""),
      tags: [],
      starRating: 0,
      source: "google_drive",
      driveFileId: file.id,
      createdAt: new Date().toISOString(),
    });
    imported++;
  }

  return imported;
}

export function extractFolderId(input: string): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();

  const folderPatterns = [
    /drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/(?:#folders|open)\?id=([a-zA-Z0-9_-]+)/,
    /folders\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of folderPatterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }

  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;

  return null;
}

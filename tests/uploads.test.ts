import { describe, it, expect } from "vitest";
import { validateImageFile, isSafeUploadFilename } from "../server/object-storage";

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)]);
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(16),
]);
const WEBP = Buffer.concat([
  Buffer.from("RIFF", "ascii"),
  Buffer.alloc(4),
  Buffer.from("WEBP", "ascii"),
  Buffer.alloc(16),
]);
const MP4 = Buffer.concat([Buffer.alloc(4), Buffer.from("ftypisom", "ascii"), Buffer.alloc(16)]);
const WEBM = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(16)]);

function file(mimetype: string, buffer: Buffer, size = buffer.length) {
  return { mimetype, size, buffer };
}

describe("upload content verification", () => {
  it("accepts each supported format when the bytes match the declared type", () => {
    expect(validateImageFile(file("image/jpeg", JPEG))).toBeNull();
    expect(validateImageFile(file("image/png", PNG))).toBeNull();
    expect(validateImageFile(file("image/webp", WEBP))).toBeNull();
    expect(validateImageFile(file("video/mp4", MP4))).toBeNull();
    expect(validateImageFile(file("video/webm", WEBM))).toBeNull();
  });

  it("treats MP4 and QuickTime as one container family", () => {
    // A .mov and an .mp4 are both ISO base media; the browser's label for a
    // given file varies by platform, so either declaration must be accepted.
    expect(validateImageFile(file("video/quicktime", MP4))).toBeNull();
  });

  it("rejects a file whose bytes contradict its declared type", () => {
    // The attack the MIME check alone missed: an executable or script renamed
    // and posted with an image Content-Type.
    expect(validateImageFile(file("image/png", JPEG))).toMatch(/do not match/i);
    expect(validateImageFile(file("image/jpeg", WEBM))).toMatch(/do not match/i);
  });

  it("rejects content that is not a recognised media format", () => {
    const script = Buffer.from("#!/bin/sh\nrm -rf /\n", "utf8");
    expect(validateImageFile(file("image/png", script))).toMatch(/not a recognised/i);
  });

  it("rejects a disallowed declared type outright", () => {
    expect(validateImageFile(file("application/pdf", PNG))).toMatch(/Only JPEG/i);
  });

  it("rejects oversized files before inspecting content", () => {
    expect(validateImageFile(file("image/png", PNG, 11 * 1024 * 1024))).toMatch(/under 10MB/i);
  });

  it("fails closed when the bytes are unavailable", () => {
    expect(validateImageFile({ mimetype: "image/png", size: 100 })).toMatch(/could not be read/i);
  });

  it("rejects a truncated file too short to identify", () => {
    expect(validateImageFile(file("image/png", Buffer.from([0x89, 0x50])))).toMatch(/not a recognised/i);
  });
});

describe("upload filename validation (path traversal guard)", () => {
  it("accepts the server-generated and historical library naming schemes", () => {
    expect(isSafeUploadFilename("1730142779492-a1b2c3.jpg")).toBe(true);
    expect(isSafeUploadFilename("sonibagh-26.jpg")).toBe(true);
    expect(isSafeUploadFilename("kubervatika-05.webp")).toBe(true);
    expect(isSafeUploadFilename("rivaan-video-01.mp4")).toBe(true);
  });

  it("rejects traversal sequences in any encoding", () => {
    expect(isSafeUploadFilename("../../etc/passwd")).toBe(false);
    expect(isSafeUploadFilename("..%2f..%2fetc%2fhostname")).toBe(false);
    expect(isSafeUploadFilename("a/../../etc/hostname")).toBe(false);
    expect(isSafeUploadFilename("....//....//etc/passwd")).toBe(false);
  });

  it("rejects hidden files, separators and injection characters", () => {
    expect(isSafeUploadFilename(".env")).toBe(false);
    expect(isSafeUploadFilename("a/b.jpg")).toBe(false);
    expect(isSafeUploadFilename("name with spaces.jpg")).toBe(false);
    expect(isSafeUploadFilename("$(whoami).jpg")).toBe(false);
    expect(isSafeUploadFilename("")).toBe(false);
  });
});

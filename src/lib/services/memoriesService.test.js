import { describe, expect, it } from "vitest";
import {
  MAX_MEMORY_PHOTO_BYTES,
  MAX_MEMORY_VIDEO_BYTES,
  validateMemoryFile,
} from "./memoriesService.js";

const file = (type, size) => ({ name: "memory", type, size });

describe("memory media validation", () => {
  it("accepts supported photos and videos within their separate limits", () => {
    expect(validateMemoryFile(file("image/webp", MAX_MEMORY_PHOTO_BYTES))).toBeNull();
    expect(validateMemoryFile(file("video/mp4", MAX_MEMORY_VIDEO_BYTES))).toBeNull();
    expect(validateMemoryFile(file("video/quicktime", 20))).toBeNull();
  });

  it("rejects unsupported and oversized files", () => {
    expect(validateMemoryFile(file("image/gif", 20)).message).toMatch(/JPEG/);
    expect(validateMemoryFile(file("image/jpeg", MAX_MEMORY_PHOTO_BYTES + 1)).message).toMatch(/10 MB/);
    expect(validateMemoryFile(file("video/webm", MAX_MEMORY_VIDEO_BYTES + 1)).message).toMatch(/50 MB/);
  });
});

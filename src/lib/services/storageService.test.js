import { describe, expect, it } from "vitest";
import { MAX_SERVICE_PHOTO_BYTES, validateServicePhoto } from "./storageService.js";

describe("service photo validation", () => {
  it("accepts the supported server-validated image formats", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validateServicePhoto({ type, size: MAX_SERVICE_PHOTO_BYTES })).toBeNull();
    }
  });

  it("rejects an unsupported type and an oversized file before upload", () => {
    expect(validateServicePhoto({ type: "image/gif", size: 1 })?.message).toMatch(/JPEG, PNG, or WebP/);
    expect(validateServicePhoto({ type: "image/png", size: MAX_SERVICE_PHOTO_BYTES + 1 })?.message).toMatch(/10 MB/);
  });
});

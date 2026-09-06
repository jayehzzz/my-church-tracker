import { api } from "../../../convex/_generated/api.js";
import { getConvexHttpClient, unavailableError } from "$lib/convex.js";

// Convex has no buckets: a service photo is stored as a file plus a durable
// service_photos record. Blob URLs are used only to preview a chosen file.
export const BUCKET_NAME = "service-photos";
export const MAX_SERVICE_PHOTO_BYTES = 10 * 1024 * 1024;
export const ALLOWED_SERVICE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateServicePhoto(file) {
  if (!file) return new Error("Choose a photo to upload.");
  if (!ALLOWED_SERVICE_PHOTO_TYPES.includes(file.type)) {
    return new Error("Use a JPEG, PNG, or WebP photo.");
  }
  if (file.size > MAX_SERVICE_PHOTO_BYTES) {
    return new Error("Each service photo must be 10 MB or smaller.");
  }
  return null;
}

function postFile(uploadUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", uploadUrl);
    request.setRequestHeader("Content-Type", file.type);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error("The photo upload could not reach storage. Check your connection and try again."));
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error("The photo upload was rejected by storage. Please try again."));
        return;
      }
      try {
        resolve(JSON.parse(request.responseText));
      } catch {
        reject(new Error("Storage returned an invalid upload response."));
      }
    };
    request.send(file);
  });
}

export async function uploadImage(file, { onProgress } = {}) {
  const validationError = validateServicePhoto(file);
  if (validationError) return { data: null, error: validationError };
  const client = getConvexHttpClient();
  if (!client) return { data: null, error: unavailableError() };

  try {
    onProgress?.(0);
    const uploadUrl = await client.mutation(api.servicePhotos.generateUploadUrl, {});
    const response = await postFile(uploadUrl, file, onProgress);
    if (!response.storageId) throw new Error("Storage did not return a file reference.");
    const photo = await client.mutation(api.servicePhotos.registerUpload, {
      storageId: response.storageId,
      filename: file.name,
    });
    onProgress?.(100);
    return { data: { id: photo._id, previewUrl: URL.createObjectURL(file) }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// This can only discard a pending upload. Attached image deletion happens when
// the authenticated service-record mutation saves the updated photo set.
export async function deleteImage(photoId) {
  const client = getConvexHttpClient();
  if (!client) return { error: unavailableError() };
  try {
    await client.mutation(api.servicePhotos.discardPending, { photoId });
    return { error: null };
  } catch (error) {
    return { error };
  }
}

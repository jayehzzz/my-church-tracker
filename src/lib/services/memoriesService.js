import { api } from "../../../convex/_generated/api.js";
import { getConvexHttpClient, isDemoMode, unavailableError } from "$lib/convex.js";
import { mockServices } from "$lib/data/mockData.js";

export const MAX_MEMORY_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_MEMORY_VIDEO_BYTES = 50 * 1024 * 1024;
export const MEMORY_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MEMORY_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export function validateMemoryFile(file) {
  if (!file) return new Error("Choose a photo or video to upload.");
  if (MEMORY_PHOTO_TYPES.includes(file.type)) {
    return file.size > MAX_MEMORY_PHOTO_BYTES
      ? new Error("Each photo must be 10 MB or smaller.") : null;
  }
  if (MEMORY_VIDEO_TYPES.includes(file.type)) {
    return file.size > MAX_MEMORY_VIDEO_BYTES
      ? new Error("Each video must be 50 MB or smaller.") : null;
  }
  return new Error("Use a JPEG, PNG, WebP, MP4, WebM or MOV file.");
}

function demoAlbums() {
  return mockServices
    .filter(service => Array.isArray(service.photos) && service.photos.length)
    .map(service => ({
      id: `service-${service.id || service._id}`,
      sourceType: "service",
      sourceId: service.id || service._id,
      title: service.sermon_topic || "Sunday Service",
      eventDate: service.service_date,
      location: service.location,
      category: "service",
      reflection: service.notes,
      visibility: "church",
      editable: false,
      recordHref: "/services",
      media: service.photos.map((url, index) => ({
        id: `demo-${service.id || service._id}-${index}`,
        type: "photo",
        url: url.replace("w=100&h=100", "w=1200&h=800"),
        filename: `Service photo ${index + 1}`,
      })),
    }))
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
}

function request(method, args, timeoutMs = 8000) {
  const client = getConvexHttpClient();
  if (!client) throw unavailableError();
  return Promise.race([
    client[method](...args),
    new Promise((_, reject) => setTimeout(() => reject(new Error("The memories request timed out.")), timeoutMs)),
  ]);
}

export async function getAll() {
  if (isDemoMode()) return { data: demoAlbums(), error: null };
  try {
    const data = await request("query", [api.memories.getAll, {}]);
    return { data: data || [], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

function postFile(uploadUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new Error("The upload could not reach storage. Check your connection and try again."));
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error("Storage rejected the upload. Please try again."));
        return;
      }
      try { resolve(JSON.parse(xhr.responseText)); }
      catch { reject(new Error("Storage returned an invalid upload response.")); }
    };
    xhr.send(file);
  });
}

export async function upload(file, { onProgress } = {}) {
  const validation = validateMemoryFile(file);
  if (validation) return { data: null, error: validation };
  if (isDemoMode()) return { data: null, error: new Error("Uploads are disabled in the local demo.") };
  try {
    onProgress?.(0);
    const uploadUrl = await request("mutation", [api.memories.generateUploadUrl, {}]);
    const response = await postFile(uploadUrl, file, onProgress);
    if (!response.storageId) throw new Error("Storage did not return a file reference.");
    const saved = await request("mutation", [api.memories.registerUpload, {
      storageId: response.storageId,
      filename: file.name,
    }]);
    onProgress?.(100);
    return {
      data: {
        id: saved.id,
        type: saved.type,
        url: URL.createObjectURL(file),
        filename: file.name,
        isNew: true,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
}

export async function save(album) {
  if (isDemoMode()) return { data: null, error: new Error("Albums are read-only in the local demo.") };
  const { id, ...values } = album;
  try {
    const endpoint = id ? api.memories.update : api.memories.create;
    const args = id ? { id, ...values } : values;
    const data = await request("mutation", [endpoint, args], 12000);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function discardPending(mediaId) {
  if (isDemoMode()) return { error: null };
  try {
    await request("mutation", [api.memories.discardPending, { mediaId }]);
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function remove(id) {
  if (isDemoMode()) return { error: new Error("Albums are read-only in the local demo.") };
  try {
    await request("mutation", [api.memories.remove, { id }], 12000);
    return { error: null };
  } catch (error) {
    return { error };
  }
}

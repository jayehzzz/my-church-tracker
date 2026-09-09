import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { forbidden, isAdmin, requireUser } from "./lib/security";

export const MAX_MEMORY_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_MEMORY_VIDEO_BYTES = 50 * 1024 * 1024;
export const MEMORY_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MEMORY_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const visibility = v.union(v.literal("church"), v.literal("leaders"), v.literal("private"));
const mediaInput = v.object({ id: v.id("memory_media"), caption: v.optional(v.string()) });

function cleanText(value: string | undefined, maximum: number) {
  const cleaned = value?.trim();
  if (!cleaned) return undefined;
  if (cleaned.length > maximum) throw new ConvexError("MEMORY_TEXT_TOO_LONG");
  return cleaned;
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())) {
    throw new ConvexError("INVALID_MEMORY_DATE");
  }
}

function canRead(user: any, album: any) {
  if (isAdmin(user)) return true;
  if (album.visibility === "church") return true;
  return album.visibility === "leaders" && user.role === "leader";
}

async function audit(ctx: any, actor: any, operation: string, recordId: any) {
  await ctx.db.insert("security_audit", {
    actor_user_id: actor._id,
    operation,
    record_id: String(recordId),
    created_at: new Date().toISOString(),
  });
}

async function resolvedMedia(ctx: any, albumId: any) {
  const rows = await ctx.db.query("memory_media")
    .withIndex("by_album", (q: any) => q.eq("album_id", albumId)).collect();
  const media = await Promise.all(rows.sort((a: any, b: any) => a.sort_order - b.sort_order).map(async (item: any) => ({
    id: item._id,
    type: item.media_type,
    url: await ctx.storage.getUrl(item.storage_id),
    caption: item.caption,
    filename: item.original_filename,
    sizeBytes: item.size_bytes,
  })));
  return media.filter((item: any) => item.url);
}

// All approved accounts can see the internal library according to each
// album's visibility. Service records are projected into a deliberately small,
// non-attendance shape so their existing photos also appear without migration.
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    // Viewer accounts are intentionally aggregate-only elsewhere in the app;
    // event photographs can identify people, so they remain outside that role.
    if (user.role === "viewer") forbidden();
    const albums = (await ctx.db.query("memory_albums").withIndex("by_event_date").order("desc").collect())
      .filter(album => canRead(user, album));
    const standalone = await Promise.all(albums.map(async album => ({
      id: album._id,
      sourceType: "album" as const,
      title: album.title,
      eventDate: album.event_date,
      location: album.location,
      category: album.category,
      reflection: album.reflection,
      visibility: album.visibility,
      serviceId: album.service_id,
      meetingId: album.meeting_id,
      coverMediaId: album.cover_media_id,
      editable: isAdmin(user),
      media: await resolvedMedia(ctx, album._id),
    })));

    const photoRows = await ctx.db.query("service_photos").collect();
    const byService = new Map<string, any[]>();
    for (const photo of photoRows) {
      if (!photo.service_id) continue;
      const values = byService.get(String(photo.service_id)) ?? [];
      values.push(photo);
      byService.set(String(photo.service_id), values);
    }
    const services = await ctx.db.query("services").withIndex("by_service_date").order("desc").collect();
    const serviceAlbums = await Promise.all(services.filter(service =>
      (service.photos?.length ?? 0) > 0 || byService.has(String(service._id))
    ).map(async service => {
      const stored = await Promise.all((byService.get(String(service._id)) ?? []).map(async photo => ({
        id: photo._id,
        type: "photo" as const,
        url: await ctx.storage.getUrl(photo.storage_id),
        filename: photo.original_filename,
        sizeBytes: photo.size_bytes,
      })));
      const legacy = (service.photos ?? []).map((url, index) => ({
        id: `legacy-${service._id}-${index}`,
        type: "photo" as const,
        url,
        filename: `Service photo ${index + 1}`,
      }));
      return {
        id: `service-${service._id}`,
        sourceType: "service" as const,
        sourceId: service._id,
        title: service.sermon_topic || (service.service_type === "sunday_service" ? "Sunday Service" : "Church Service"),
        eventDate: service.service_date,
        location: service.location,
        category: "service",
        reflection: user.can_view_confidential ? service.notes : undefined,
        visibility: "church" as const,
        editable: false,
        recordHref: "/services",
        media: [...legacy, ...stored.filter(item => item.url)],
      };
    }));

    return [...standalone, ...serviceAlbums]
      .filter(album => album.media.length > 0)
      .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (!isAdmin(user)) forbidden();
    return await ctx.storage.generateUploadUrl();
  },
});

export const registerUpload = mutation({
  args: { storageId: v.id("_storage"), filename: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!isAdmin(user)) forbidden();
    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (!metadata) throw new ConvexError("MEMORY_UPLOAD_NOT_FOUND");
    const contentType = metadata.contentType || "";
    const mediaType = MEMORY_PHOTO_TYPES.has(contentType) ? "photo"
      : MEMORY_VIDEO_TYPES.has(contentType) ? "video" : null;
    if (!mediaType) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError("UNSUPPORTED_MEMORY_FILE");
    }
    const limit = mediaType === "photo" ? MAX_MEMORY_PHOTO_BYTES : MAX_MEMORY_VIDEO_BYTES;
    if (metadata.size > limit) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError(mediaType === "photo" ? "MEMORY_PHOTO_TOO_LARGE" : "MEMORY_VIDEO_TOO_LARGE");
    }
    const existing = await ctx.db.query("memory_media").withIndex("by_storage", q => q.eq("storage_id", args.storageId)).unique();
    if (existing) throw new ConvexError("MEMORY_UPLOAD_ALREADY_REGISTERED");
    const id = await ctx.db.insert("memory_media", {
      storage_id: args.storageId,
      media_type: mediaType,
      original_filename: (cleanText(args.filename, 255) || "Church memory"),
      content_type: contentType,
      size_bytes: metadata.size,
      sort_order: 0,
      uploaded_by_user_id: user._id,
      created_at: new Date().toISOString(),
    });
    await audit(ctx, user, "register_memory_upload", id);
    return { id, type: mediaType };
  },
});

export const discardPending = mutation({
  args: { mediaId: v.id("memory_media") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!isAdmin(user)) forbidden();
    const media = await ctx.db.get(args.mediaId);
    if (!media) return { deleted: false };
    if (media.album_id) throw new ConvexError("ATTACHED_MEMORY_MEDIA");
    if (String(media.uploaded_by_user_id) !== String(user._id)) forbidden();
    await ctx.storage.delete(media.storage_id);
    await ctx.db.delete(media._id);
    await audit(ctx, user, "discard_memory_upload", media._id);
    return { deleted: true };
  },
});

const albumArgs = {
  title: v.string(),
  eventDate: v.string(),
  location: v.optional(v.string()),
  category: v.string(),
  reflection: v.optional(v.string()),
  visibility,
  serviceId: v.optional(v.id("services")),
  meetingId: v.optional(v.id("meetings")),
  coverMediaId: v.optional(v.id("memory_media")),
  media: v.array(mediaInput),
};

async function saveAlbum(ctx: any, user: any, input: any, id?: any) {
  const title = cleanText(input.title, 120);
  if (!title) throw new ConvexError("MEMORY_TITLE_REQUIRED");
  validDate(input.eventDate);
  if (input.serviceId && input.meetingId) throw new ConvexError("MEMORY_ONE_GATHERING_LINK");
  if (input.serviceId && !await ctx.db.get(input.serviceId)) throw new ConvexError("SERVICE_NOT_FOUND");
  if (input.meetingId && !await ctx.db.get(input.meetingId)) throw new ConvexError("MEETING_NOT_FOUND");
  if (input.media.length < 1 || input.media.length > 100) throw new ConvexError("MEMORY_MEDIA_LIMIT");
  const uniqueIds = new Set(input.media.map((item: any) => String(item.id)));
  if (uniqueIds.size !== input.media.length) throw new ConvexError("DUPLICATE_MEMORY_MEDIA");
  if (input.coverMediaId && !uniqueIds.has(String(input.coverMediaId))) throw new ConvexError("INVALID_MEMORY_COVER");

  const now = new Date().toISOString();
  const values = {
    title,
    event_date: input.eventDate,
    location: cleanText(input.location, 160),
    category: cleanText(input.category, 40) || "other",
    reflection: cleanText(input.reflection, 4000),
    visibility: input.visibility,
    service_id: input.serviceId,
    meeting_id: input.meetingId,
    cover_media_id: input.coverMediaId,
    updated_at: now,
  };
  let albumId = id;
  if (albumId) {
    const album = await ctx.db.get(albumId);
    if (!album) throw new ConvexError("MEMORY_ALBUM_NOT_FOUND");
    await ctx.db.patch(albumId, values);
  } else {
    albumId = await ctx.db.insert("memory_albums", {
      ...values,
      created_by_user_id: user._id,
      created_at: now,
    });
  }

  const existing = await ctx.db.query("memory_media").withIndex("by_album", (q: any) => q.eq("album_id", albumId)).collect();
  for (const item of existing) {
    if (!uniqueIds.has(String(item._id))) {
      await ctx.storage.delete(item.storage_id);
      await ctx.db.delete(item._id);
    }
  }
  for (const [index, item] of input.media.entries()) {
    const stored = await ctx.db.get(item.id);
    if (!stored) throw new ConvexError("MEMORY_MEDIA_NOT_FOUND");
    if (stored.album_id && String(stored.album_id) !== String(albumId)) throw new ConvexError("MEMORY_MEDIA_ALREADY_ATTACHED");
    if (!stored.album_id && String(stored.uploaded_by_user_id) !== String(user._id)) forbidden();
    await ctx.db.patch(item.id, {
      album_id: albumId,
      sort_order: index,
      caption: cleanText(item.caption, 280),
    });
  }
  await audit(ctx, user, id ? "update_memory_album" : "create_memory_album", albumId);
  return albumId;
}

export const create = mutation({
  args: albumArgs,
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!isAdmin(user)) forbidden();
    return await saveAlbum(ctx, user, args);
  },
});

export const update = mutation({
  args: { id: v.id("memory_albums"), ...albumArgs },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!isAdmin(user)) forbidden();
    const { id, ...input } = args;
    return await saveAlbum(ctx, user, input, id);
  },
});

export const remove = mutation({
  args: { id: v.id("memory_albums") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!isAdmin(user)) forbidden();
    const album = await ctx.db.get(args.id);
    if (!album) return { deleted: false };
    const media = await ctx.db.query("memory_media").withIndex("by_album", q => q.eq("album_id", args.id)).collect();
    for (const item of media) {
      await ctx.storage.delete(item.storage_id);
      await ctx.db.delete(item._id);
    }
    await ctx.db.delete(args.id);
    await audit(ctx, user, "delete_memory_album", args.id);
    return { deleted: true };
  },
});

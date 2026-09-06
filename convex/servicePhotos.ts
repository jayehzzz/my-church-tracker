import { queryFor, mutationFor } from "./lib/security";

import { v } from "convex/values";

export const MAX_SERVICE_PHOTO_BYTES = 10 * 1024 * 1024;
export const ALLOWED_SERVICE_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function requirePhotoManager(ctx: any) {
    // The shared mutation wrapper has already approved an owner/admin.
    return (await ctx.auth.getUserIdentity())!.tokenIdentifier;
}

function validateFile(metadata: any) {
    if (!metadata) throw new Error("The uploaded file was not found in storage.");
    if (!ALLOWED_SERVICE_PHOTO_TYPES.has(metadata.contentType || "")) {
        throw new Error("Only JPEG, PNG, and WebP service photos are allowed.");
    }
    if (metadata.size > MAX_SERVICE_PHOTO_BYTES) {
        throw new Error("Service photos must be 10 MB or smaller.");
    }
}

// The caller is authorized before Convex allocates the short-lived direct URL.
export const generateUploadUrl = mutationFor("servicePhotos:generateUploadUrl")({
    args: {},
    handler: async (ctx) => {
        await requirePhotoManager(ctx);
        return await ctx.storage.generateUploadUrl();
    },
});

// Store a durable database reference after validating Convex's file metadata.
export const registerUpload = mutationFor("servicePhotos:registerUpload")({
    args: { storageId: v.id("_storage"), filename: v.string() },
    handler: async (ctx, args) => {
        const uploadedBy = await requirePhotoManager(ctx);
        const metadata = await ctx.db.system.get("_storage", args.storageId);
        validateFile(metadata);
        const existing = await ctx.db.query("service_photos")
            .withIndex("by_storage", (q) => q.eq("storage_id", args.storageId))
            .unique();
        if (existing) throw new Error("This upload has already been registered.");
        const id = await ctx.db.insert("service_photos", {
            storage_id: args.storageId,
            original_filename: args.filename.slice(0, 255),
            content_type: metadata!.contentType!,
            size_bytes: metadata!.size,
            uploaded_by: uploadedBy,
            created_at: new Date().toISOString(),
        });
        return await ctx.db.get(id);
    },
});

// Cancelled or failed forms discard only their own pending uploads. Attached
// photos are deleted by services.record alongside their relationship change.
export const discardPending = mutationFor("servicePhotos:discardPending")({
    args: { photoId: v.id("service_photos") },
    handler: async (ctx, args) => {
        const uploadedBy = await requirePhotoManager(ctx);
        const photo = await ctx.db.get(args.photoId);
        if (!photo) return { deleted: false };
        if (photo.service_id) throw new Error("Attached service photos must be removed while editing the service.");
        if (photo.uploaded_by !== uploadedBy) throw new Error("You may only discard your own pending uploads.");
        await ctx.storage.delete(photo.storage_id);
        await ctx.db.delete(photo._id);
        return { deleted: true };
    },
});

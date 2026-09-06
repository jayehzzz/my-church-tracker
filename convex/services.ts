import { queryFor, mutationFor } from "./lib/security";
import { actualDate, date, deleteGathering, prepareServiceCounts, reconcileServiceCounts, serviceRows, syncServiceAttendance } from "./lib/attendanceWorkflow";

import { v } from "convex/values";

async function servicePhotoReferences(ctx: any, serviceId: any) {
    const photos = await ctx.db.query("service_photos")
        .withIndex("by_service", (q: any) => q.eq("service_id", serviceId))
        .collect();
    const entries = await Promise.all(photos.map(async (photo: any) => ({
        id: photo._id,
        url: await ctx.storage.getUrl(photo.storage_id),
    })));
    const available = entries.filter((entry: any) => entry.url);
    return { ids: available.map((entry: any) => entry.id), urls: available.map((entry: any) => entry.url) };
}

async function enrichService(ctx: any, service: any, attendance: any[]) {
    const individuals = (await Promise.all(attendance.map((record: any) => ctx.db.get(record.person_id))))
        .filter(Boolean);
    const photos = await servicePhotoReferences(ctx, service._id);
    return {
        ...service,
        // Legacy URL values remain readable; all newly recorded images are
        // resolved from storage IDs in service_photos.
        photos: [...(service.photos || []), ...photos.urls],
        photo_ids: photos.ids,
        individuals,
    };
}

// Get all services sorted by date descending
export const getAll = queryFor("services:getAll")({
    args: {},
    handler: async (ctx) => {
        const services = await ctx.db.query("services").collect();
        const enriched = await Promise.all(services.map(async (service) => {
            const attendance = await ctx.db
                .query("attendance")
                .withIndex("by_service", (q) => q.eq("service_id", service._id))
                .collect();
            return await enrichService(ctx, service, attendance);
        }));
        return enriched.sort(
            (a, b) =>
                new Date(b.service_date).getTime() - new Date(a.service_date).getTime()
        );
    },
});

// Get service by ID
export const getById = queryFor("services:getById")({
    args: { id: v.id("services") },
    handler: async (ctx, args) => {
        const service = await ctx.db.get(args.id);
        if (!service) return null;
        const attendance = await ctx.db
            .query("attendance")
            .withIndex("by_service", (q) => q.eq("service_id", args.id))
            .collect();
        return await enrichService(ctx, service, attendance);
    },
});

// Create a new service
export const create = mutationFor("services:create")({
    args: {
        service_date: v.string(),
        service_type: v.string(),
        service_time: v.optional(v.string()),
        location: v.optional(v.string()),
        sermon_topic: v.optional(v.string()),
        sermon_speaker: v.optional(v.string()),
        notes: v.optional(v.string()),
        total_attendance: v.optional(v.float64()),
        guests_count: v.optional(v.float64()),
        salvation_decisions: v.optional(v.float64()),
        tithers_count: v.optional(v.float64()),
        individuals: v.optional(v.array(v.string())),
        photos: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        date(args.service_date);
        if (args.total_attendance) actualDate(args.service_date);
        if (args.individuals?.length) throw new Error("Use record to save named attendance atomically");
        const id = await ctx.db.insert("services", { ...args, individuals: undefined, created_at: new Date().toISOString() });
        await reconcileServiceCounts(ctx, id, args);
        return await ctx.db.get(id);

    },
});

// Update a service
export const update = mutationFor("services:update")({
    args: {
        id: v.id("services"),
        service_date: v.optional(v.string()),
        service_type: v.optional(v.string()),
        service_time: v.optional(v.string()),
        location: v.optional(v.string()),
        sermon_topic: v.optional(v.string()),
        sermon_speaker: v.optional(v.string()),
        notes: v.optional(v.string()),
        total_attendance: v.optional(v.float64()),
        guests_count: v.optional(v.float64()),
        salvation_decisions: v.optional(v.float64()),
        tithers_count: v.optional(v.float64()),
        individuals: v.optional(v.array(v.string())),
        photos: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        if (updates.individuals) throw new Error("Use record to save named attendance atomically");
        if (updates.service_date) {
            date(updates.service_date);
            if (updates.total_attendance ?? (await ctx.db.get(id))?.total_attendance) actualDate(updates.service_date);
        }
        await prepareServiceCounts(ctx, id);
        await ctx.db.patch(id, { ...updates, updated_at: new Date().toISOString() });
        const rows = (await serviceRows(ctx, id)).map(({person_id, first_timer, gave_tithe, made_salvation_decision}) => ({person_id, first_timer, gave_tithe, made_salvation_decision}));
        await syncServiceAttendance(ctx, id, rows, updates);
        return await ctx.db.get(id);

    },
});

// Record the service and its named attendance as one atomic operation.
// Aggregate headcounts remain authoritative because they may include unnamed attendees.
export const record = mutationFor("services:record")({
    args: {
        request_id: v.optional(v.string()),
        id: v.optional(v.id("services")),
        service_date: v.string(),
        service_type: v.string(),
        service_time: v.optional(v.string()),
        location: v.optional(v.string()),
        sermon_topic: v.optional(v.string()),
        sermon_speaker: v.optional(v.string()),
        notes: v.optional(v.string()),
        total_attendance: v.float64(),
        guests_count: v.float64(),
        salvation_decisions: v.float64(),
        tithers_count: v.float64(),
        photos: v.optional(v.array(v.string())),
        photoIds: v.optional(v.array(v.id("service_photos"))),
        attendanceData: v.array(v.object({
            person_id: v.id("people"),
            made_salvation_decision: v.boolean(),
            gave_tithe: v.boolean(),
            first_timer: v.boolean(),
        })),
    },
    handler: async (ctx, args) => {
        const { id, attendanceData, photoIds = [], ...serviceData } = args;
        date(serviceData.service_date);
        if (serviceData.total_attendance) actualDate(serviceData.service_date);
        if (!id && args.request_id) {
            const previous = await ctx.db.query("services").filter(q => q.eq(q.field("request_id"), args.request_id)).first();
            if (previous) return await enrichService(ctx, previous, await serviceRows(ctx, previous._id));
        }
        let serviceId = id;
        if (serviceId) {
            await prepareServiceCounts(ctx, serviceId);
            await ctx.db.patch(serviceId, { ...serviceData, updated_at: new Date().toISOString() });
        } else serviceId = await ctx.db.insert("services", { ...serviceData, created_at: new Date().toISOString() });

        const existingPhotos = await ctx.db.query("service_photos")
            .withIndex("by_service", (q) => q.eq("service_id", serviceId))
            .collect();
        const incomingPhotoIds = new Set(photoIds.map(String));
        for (const photo of existingPhotos) {
            if (!incomingPhotoIds.has(String(photo._id))) {
                await ctx.storage.delete(photo.storage_id);
                await ctx.db.delete(photo._id);
            }
        }
        for (const photoId of photoIds) {
            const photo = await ctx.db.get(photoId);
            if (!photo) throw new Error("A selected service photo no longer exists.");
            if (photo.service_id && photo.service_id !== serviceId) {
                throw new Error("A service photo is already attached to another service.");
            }
            await ctx.db.patch(photoId, { service_id: serviceId });
        }
        await syncServiceAttendance(ctx, serviceId, attendanceData, serviceData);
        return await enrichService(ctx, await ctx.db.get(serviceId), await serviceRows(ctx, serviceId));

    },
});

// Delete a service
export const remove = mutationFor("services:remove")({
    args: { id: v.id("services") },
    handler: async (ctx, args) => {
        const photos = await ctx.db.query("service_photos")
            .withIndex("by_service", (q) => q.eq("service_id", args.id))
            .collect();
        for (const photo of photos) {
            await ctx.storage.delete(photo.storage_id);
            await ctx.db.delete(photo._id);
        }
        return await deleteGathering(ctx, { serviceId: args.id });

    },
});

// Get services by date range
export const getByDateRange = queryFor("services:getByDateRange")({
    args: { startDate: v.string(), endDate: v.string() },
    handler: async (ctx, args) => {
        // Use index for efficient date range filtering
        const services = await ctx.db
            .query("services")
            .withIndex("by_service_date", (q) =>
                q.gte("service_date", args.startDate).lte("service_date", args.endDate)
            )
            .collect();
        return services.sort(
            (a, b) =>
                new Date(b.service_date).getTime() - new Date(a.service_date).getTime()
        );
    },
});

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const now = "2026-09-08T10:00:00.000Z";

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async ctx => {
    const users: Record<string, any> = {};
    for (const [name, role] of [["owner", "owner"], ["leader", "leader"], ["viewer", "viewer"]] as const) {
      users[name] = await ctx.db.insert("crm_users", {
        external_auth_id: `https://identity.example/|${name}`,
        role,
        status: "active",
        created_at: now,
        updated_at: now,
      });
    }
    return { users };
  });
  const as = (name: string) => t.withIdentity({
    issuer: "https://identity.example/",
    subject: name,
    tokenIdentifier: `https://identity.example/|${name}`,
  });
  return { t, ids, as };
}

async function registeredPhoto(t: any, ownerUserId: any, filename = "memory.png") {
  return await t.run(async (ctx: any) => {
    // convex-test does not currently preserve Blob contentType in _storage, so
    // seed the already-validated durable reference for album transaction tests.
    const storageId = await ctx.storage.store(new Blob(["photo"]));
    return await ctx.db.insert("memory_media", {
      storage_id: storageId, media_type: "photo", original_filename: filename,
      content_type: "image/png", size_bytes: 5, sort_order: 0,
      uploaded_by_user_id: ownerUserId, created_at: now,
    });
  });
}

describe("church memories", () => {
  it("lets administrators create albums and applies album visibility to approved readers", async () => {
    const { t, as, ids } = await fixture();
    const photoId = await registeredPhoto(t, ids.users.owner);
    const albumId = await as("owner").mutation(api.memories.create, {
      title: "Summer outing",
      eventDate: "2026-08-12",
      category: "trip",
      reflection: "A joyful day together.",
      visibility: "church",
      coverMediaId: photoId,
      media: [{ id: photoId, caption: "At the seaside" }],
    });
    await expect(as("viewer").query(api.memories.getAll, {})).rejects.toThrow(/FORBIDDEN/);
    expect((await as("leader").query(api.memories.getAll, {}))[0]).toMatchObject({
      id: albumId,
      title: "Summer outing",
      editable: false,
      media: [{ id: photoId, type: "photo", caption: "At the seaside" }],
    });

    await as("owner").mutation(api.memories.update, {
      id: albumId,
      title: "Summer outing",
      eventDate: "2026-08-12",
      category: "trip",
      visibility: "private",
      coverMediaId: photoId,
      media: [{ id: photoId }],
    });
    expect(await as("leader").query(api.memories.getAll, {})).toEqual([]);
    expect(await as("owner").query(api.memories.getAll, {})).toHaveLength(1);
  });

  it("rejects non-administrator writes and removes album media with the album", async () => {
    const { t, as, ids } = await fixture();
    await expect(as("leader").mutation(api.memories.generateUploadUrl, {})).rejects.toThrow(/FORBIDDEN/);
    const photoId = await registeredPhoto(t, ids.users.owner);
    const albumId = await as("owner").mutation(api.memories.create, {
      title: "Baptism day", eventDate: "2026-09-01", category: "baptism",
      visibility: "leaders", coverMediaId: photoId, media: [{ id: photoId }],
    });
    expect(await as("leader").query(api.memories.getAll, {})).toHaveLength(1);
    await as("owner").mutation(api.memories.remove, { id: albumId });
    expect(await t.run((ctx: any) => ctx.db.get(photoId))).toBeNull();
    expect(await as("owner").query(api.memories.getAll, {})).toEqual([]);
  });

  it("projects existing service photos into the library without copying them", async () => {
    const { t, as, ids } = await fixture();
    await t.run(async ctx => {
      await ctx.db.insert("services", {
        service_date: "2026-09-06", service_type: "sunday_service",
        sermon_topic: "Grace for the journey", photos: ["https://example.test/service.jpg"],
        created_at: now,
      });
    });
    const album = (await as("leader").query(api.memories.getAll, {}))[0];
    expect(album).toMatchObject({ sourceType: "service", title: "Grace for the journey", editable: false });
    expect(album.media[0].url).toBe("https://example.test/service.jpg");
    expect(await t.run(ctx => ctx.db.query("memory_albums").collect())).toEqual([]);
    expect(ids.users.owner).toBeTruthy();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

async function loadConfiguration(environment) {
  vi.resetModules();
  vi.stubEnv("VITE_CONVEX_URL", environment.url || "");
  vi.stubEnv("VITE_APP_ENV", environment.name);
  vi.stubEnv("VITE_APP_MODE", environment.mode);
  vi.stubEnv("VITE_APP_VARIANT", environment.variant || "");
  vi.stubEnv("HOSTING_ENV", environment.hosting || "");
  return await import("./convex.js");
}

afterEach(() => vi.unstubAllEnvs());

describe("shared Convex environment configuration", () => {
  it("treats a missing live deployment as unavailable rather than demo data", async () => {
    const config = await loadConfiguration({ name: "development", mode: "live" });
    const people = await import("./services/peopleService.js");

    expect(config.getDataSource()).toBe("unavailable");
    expect((await people.getAll()).error?.message).toMatch(/No Convex deployment/);
  });

  it("allows demo only when it is explicitly selected for development", async () => {
    const config = await loadConfiguration({ name: "development", mode: "demo" });
    const people = await import("./services/peopleService.js");

    expect(config.getDataSource()).toBe("demo");
    expect((await people.getAll()).data.length).toBeGreaterThan(0);
  });

  it("rejects demo mode for staging", async () => {
    const config = await loadConfiguration({ name: "staging", mode: "demo" });

    expect(config.getDataSource()).toBe("unavailable");
    expect(config.getConfigurationError()).toMatch(/only in the development environment/);
  });

  it("accepts the explicit Practice variant only on its pinned deployment", async () => {
    const config = await loadConfiguration({
      name: "staging",
      mode: "live",
      variant: "rehearsal",
      url: "https://standing-mongoose-699.convex.cloud",
    });

    expect(config.isRehearsalMode()).toBe(true);
    expect(config.isConvexConfigured()).toBe(true);
  });

  it("identifies the pinned rehearsal deployment even without the variant flag", async () => {
    const config = await loadConfiguration({
      name: "staging",
      mode: "live",
      url: "https://standing-mongoose-699.convex.cloud",
    });

    expect(config.isRehearsalMode()).toBe(true);
  });

  it.each([
    ["another deployment", "https://example.convex.cloud"],
    ["no deployment", ""],
    ["a Practice URL with a path", "https://standing-mongoose-699.convex.cloud/other"],
  ])("fails closed when explicit Practice points to %s", async (_description, url) => {
    const config = await loadConfiguration({ name: "staging", mode: "live", variant: "rehearsal", url });

    expect(config.getDataSource()).toBe("unavailable");
    expect(config.isConvexConfigured()).toBe(false);
    expect(config.isRehearsalMode()).toBe(false);
    expect(config.getConfigurationError()).toMatch(/pinned standing-mongoose-699/);
  });

  it.each(["development", "staging"])("rejects the live deployment in %s", async name => {
    const config = await loadConfiguration({
      name,
      mode: "live",
      url: "https://elated-bee-284.convex.cloud/",
    });

    expect(config.getDataSource()).toBe("unavailable");
    expect(config.isRehearsalMode()).toBe(false);
    expect(config.getConfigurationError()).toMatch(/live elated-bee-284/);
  });

  it("does not label production as Practice even when pointed at the Practice deployment", async () => {
    const config = await loadConfiguration({
      name: "production",
      mode: "live",
      url: "https://standing-mongoose-699.convex.cloud",
    });

    expect(config.getDataSource()).toBe("unavailable");
    expect(config.isRehearsalMode()).toBe(false);
  });

  it("does not label an ordinary production deployment as Practice", async () => {
    const config = await loadConfiguration({
      name: "production",
      mode: "live",
      url: "https://elated-bee-284.convex.cloud",
    });

    expect(config.getDataSource()).toBe("convex");
    expect(config.isRehearsalMode()).toBe(false);
  });

  it("rejects a Vercel Preview carrying production app settings and the live deployment", async () => {
    const config = await loadConfiguration({
      hosting: "preview",
      name: "production",
      mode: "live",
      url: "https://elated-bee-284.convex.cloud",
    });

    expect(config.getConfigurationError()).toMatch(/Vercel Preview requires explicit staging Practice/);
    expect(config.getDataSource()).toBe("unavailable");
    expect(config.getConvexHttpClient()).toBeNull();
    expect(await config.getConvexClient()).toBeNull();
    expect(config.isRehearsalMode()).toBe(false);
  });

  it("accepts only pinned explicit Practice settings on Vercel Preview", async () => {
    const config = await loadConfiguration({
      hosting: "preview",
      name: "staging",
      mode: "live",
      variant: "rehearsal",
      url: "https://standing-mongoose-699.convex.cloud",
    });

    expect(config.getConfigurationError()).toBeNull();
    expect(config.isRehearsalMode()).toBe(true);
    expect(config.getDataSource()).toBe("convex");
  });

  it("rejects a Vercel Preview pointed at live even with staging settings", async () => {
    const config = await loadConfiguration({
      hosting: "preview",
      name: "staging",
      mode: "live",
      variant: "rehearsal",
      url: "https://elated-bee-284.convex.cloud",
    });

    expect(config.getDataSource()).toBe("unavailable");
    expect(config.getConvexHttpClient()).toBeNull();
  });

  it("accepts a Vercel Production target with production app settings and live deployment", async () => {
    const config = await loadConfiguration({
      hosting: "production",
      name: "production",
      mode: "live",
      url: "https://elated-bee-284.convex.cloud",
    });

    expect(config.getConfigurationError()).toBeNull();
    expect(config.getDataSource()).toBe("convex");
    expect(config.isRehearsalMode()).toBe(false);
  });

  it("rejects a Vercel Development target with production app settings", async () => {
    const config = await loadConfiguration({
      hosting: "development",
      name: "production",
      mode: "live",
      url: "https://elated-bee-284.convex.cloud",
    });

    expect(config.getDataSource()).toBe("unavailable");
    expect(config.getConfigurationError()).toMatch(/Vercel Development/);
  });
});

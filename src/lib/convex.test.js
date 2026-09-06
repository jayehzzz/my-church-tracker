import { afterEach, describe, expect, it, vi } from "vitest";

async function loadConfiguration(environment) {
  vi.resetModules();
  vi.stubEnv("VITE_CONVEX_URL", environment.url || "");
  vi.stubEnv("VITE_APP_ENV", environment.name);
  vi.stubEnv("VITE_APP_MODE", environment.mode);
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
});

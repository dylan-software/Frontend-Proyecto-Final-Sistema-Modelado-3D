import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
  delete process.env.NEXT_PUBLIC_API_URL;
});

beforeEach(() => {
  vi.resetModules();
});

/**
 * The frontend must never hardcode where the backend lives — the same
 * built frontend code has to work whether the backend is the local dev
 * server or the deployed Render/Railway/Azure/AWS URL, purely based on
 * NEXT_PUBLIC_API_URL. These tests catch a regression where someone
 * accidentally hardcodes "localhost" somewhere in lib/api.ts.
 */
describe("api client — base URL resolution", () => {
  it("defaults to localhost:8000 when NEXT_PUBLIC_API_URL is not set (local dev)", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));

    const { api } = await import("../src/lib/api");
    await api.health();

    expect(fetch).toHaveBeenCalledWith("http://localhost:8000/api/health", expect.anything());
  });

  it("targets the deployed backend URL when NEXT_PUBLIC_API_URL is set (production)", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://proyecto3d-backend.onrender.com";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));

    const { api } = await import("../src/lib/api");
    await api.health();

    expect(fetch).toHaveBeenCalledWith("https://proyecto3d-backend.onrender.com/api/health", expect.anything());
  });

  it("surfaces the backend's error message instead of a generic failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: "Invalid space data" }) })
    );

    const { api } = await import("../src/lib/api");
    await expect(api.getSpace("missing-project")).rejects.toThrow("Invalid space data");
  });
});

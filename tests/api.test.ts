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

describe("api client — per-account catalog (FastAPI /api/v1)", () => {
  it("sends DELETE to /api/v1/spaces/furniture/{id} on the configured backend", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://proyecto3d-backend.onrender.com";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) }));

    const { api } = await import("../src/lib/api");
    await api.deleteFurniture("42");

    expect(fetch).toHaveBeenCalledWith(
      "https://proyecto3d-backend.onrender.com/api/v1/spaces/furniture/42",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("keeps the HTTP status of a failed request so callers can tell 404 from 503", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({ detail: "No existe un mueble con id 7." }) })
    );

    const { api, ApiError } = await import("../src/lib/api");
    const error = await api.deleteFurniture("7").catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, message: "HTTP 404: No existe un mueble con id 7." });
  });

  it("scopes the spaces query to the logged-in account with ?user_id=", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user_id: "5", habitaciones: [], catalogo: [] }) })
    );

    const { api } = await import("../src/lib/api");
    await api.listUserSpaces("5");

    expect(fetch).toHaveBeenCalledWith("http://localhost:8000/api/v1/spaces?user_id=5", expect.anything());
  });
});

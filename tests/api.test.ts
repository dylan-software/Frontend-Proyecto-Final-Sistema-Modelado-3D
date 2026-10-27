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

    expect(fetch).toHaveBeenCalledWith("http://localhost:8000/api/v1/health", expect.anything());
  });

  it("targets the deployed backend URL when NEXT_PUBLIC_API_URL is set (production)", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://proyecto3d-backend.onrender.com";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));

    const { api } = await import("../src/lib/api");
    await api.health();

    expect(fetch).toHaveBeenCalledWith("https://proyecto3d-backend.onrender.com/api/v1/health", expect.anything());
  });

  it("surfaces the backend's error message instead of a generic failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: "Invalid space data" }) })
    );

    const { api } = await import("../src/lib/api");
    await expect(api.chat("p", [])).rejects.toThrow("Invalid space data");
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
    expect(error).toMatchObject({ status: 404, message: "No existe un mueble con id 7." });
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

/** In-memory stand-in for the browser's localStorage (vitest runs in Node). */
function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    has: (key: string) => data.has(key),
  };
}

const SESSION = { auth_token: "header.payload.signature", auth_user_id: "5" };

describe("api client — session token", () => {
  it("sends Authorization: Bearer on the FastAPI (/api/v1) requests", async () => {
    vi.stubGlobal("localStorage", memoryStorage(SESSION));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ user_id: "5", habitaciones: [], catalogo: [] }) })
    );

    const { api } = await import("../src/lib/api");
    await api.listUserSpaces("5");

    const init = vi.mocked(fetch).mock.calls[0]![1]!;
    expect(init.headers).toMatchObject({
      Authorization: "Bearer header.payload.signature",
      "Content-Type": "application/json",
    });
  });

  it("sends Authorization: Bearer on the legacy (/api) requests too", async () => {
    vi.stubGlobal("localStorage", memoryStorage(SESSION));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) }));

    const { api } = await import("../src/lib/api");
    await api.chat("p", []);

    expect(vi.mocked(fetch).mock.calls[0]![1]!.headers).toMatchObject({ Authorization: "Bearer header.payload.signature" });
  });

  it("sends no Authorization header without a session", async () => {
    vi.stubGlobal("localStorage", memoryStorage());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) }));

    const { api } = await import("../src/lib/api");
    await api.deleteFurniture("1");

    expect(vi.mocked(fetch).mock.calls[0]![1]!.headers).not.toHaveProperty("Authorization");
  });

  it("keeps sending user_id in the body, for backends that still read it", async () => {
    vi.stubGlobal("localStorage", memoryStorage(SESSION));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({}) }));

    const { api } = await import("../src/lib/api");
    await api.createCatalogFurniture({ user_id: "5", nombre: "Silla", categoria: "chair", ancho: 50, alto: 90, profundidad: 50 });

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string);
    expect(body.user_id).toBe("5");
  });

  it("clears the stored session and notifies the page on a 401", async () => {
    const storage = memoryStorage(SESSION);
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ detail: "Token de sesión inválido o caducado." }) })
    );

    const { api, ApiError } = await import("../src/lib/api");
    const { onSessionExpired } = await import("../src/lib/session");
    const expired = vi.fn();
    onSessionExpired(expired);

    const error = await api.listUserSpaces("5").catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 401 });
    expect(storage.has("auth_token")).toBe(false);
    expect(storage.has("auth_user_id")).toBe(false);
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it("clears the session on a 401 from the legacy (/api) routes as well", async () => {
    const storage = memoryStorage(SESSION);
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }));

    const { api } = await import("../src/lib/api");
    await expect(api.chat("p", [])).rejects.toThrow();

    expect(storage.has("auth_token")).toBe(false);
  });

  it("does not treat a wrong password on /auth/login as an expired session", async () => {
    const storage = memoryStorage(SESSION);
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ detail: "Email o contraseña incorrectos." }) })
    );

    const { api } = await import("../src/lib/api");
    const { onSessionExpired } = await import("../src/lib/session");
    const expired = vi.fn();
    onSessionExpired(expired);

    await expect(api.login({ email: "a@b.co", password: "x" })).rejects.toThrow("Email o contraseña incorrectos.");
    expect(storage.has("auth_token")).toBe(true);
    expect(expired).not.toHaveBeenCalled();
  });

  it("stops notifying a listener after it unsubscribes", async () => {
    vi.stubGlobal("localStorage", memoryStorage(SESSION));
    const { expireSession, onSessionExpired } = await import("../src/lib/session");
    const listener = vi.fn();

    onSessionExpired(listener)();
    expireSession();

    expect(listener).not.toHaveBeenCalled();
  });
});

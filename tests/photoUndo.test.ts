import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

import { es } from "../src/i18n/es";
import { MAX_PHOTO_UNDO_DEPTH, nextUndoDepth } from "../src/lib/photoUndo";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const SESSION = { auth_token: "header.payload.signature", auth_user_id: "5" };
const UNDONE = {
  room: { id: 3, name: "Sala", vertices: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 4 }, { x: 0, y: 4 }], heightM: 2.6, areaM2: 20 },
  items: [{ id: 12, name: "Mesa", x: 1.4, y: 1.1, rotation: 0, widthM: 1.2, depthM: 0.8, heightM: 0.75, elevationM: 0 }],
  remaining: 2,
};

function answer(status: number, body: unknown, headers: Record<string, string> = {}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => lower[name.toLowerCase()] ?? null },
    json: async () => body,
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("localStorage", memoryStorage(SESSION));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("api.undoRoomPhoto", () => {
  it("posts to /rooms/{id}/photo-undo without a body and returns the restored room", async () => {
    vi.stubGlobal("fetch", answer(200, UNDONE));
    const { api } = await import("../src/lib/api");

    const result = await api.undoRoomPhoto(3);

    const [url, init] = vi.mocked(fetch).mock.calls.at(-1)!;
    expect(url).toBe("http://localhost:8000/api/v1/spaces/rooms/3/photo-undo");
    expect(init!.method).toBe("POST");
    expect(init!.body).toBeUndefined();
    expect((init!.headers as Record<string, string>).Authorization).toBe(`Bearer ${SESSION.auth_token}`);
    expect(result).toEqual(UNDONE);
  });
});

describe("nextUndoDepth", () => {
  it("a photo adds one, up to 5", () => {
    expect(nextUndoDepth(0, { type: "photo" })).toBe(1);
    expect(nextUndoDepth(4, { type: "photo" })).toBe(5);
    expect(nextUndoDepth(5, { type: "photo" })).toBe(MAX_PHOTO_UNDO_DEPTH);
  });

  it("an undo takes the remaining count from the backend", () => {
    expect(nextUndoDepth(3, { type: "undone", remaining: 2 })).toBe(2);
    expect(nextUndoDepth(1, { type: "undone", remaining: 0 })).toBe(0);
    // Valores raros del servidor no rompen el contador.
    expect(nextUndoDepth(1, { type: "undone", remaining: 9 })).toBe(5);
    expect(nextUndoDepth(1, { type: "undone", remaining: -1 })).toBe(0);
    expect(nextUndoDepth(1, { type: "undone", remaining: Number.NaN })).toBe(0);
  });

  it("a 409 and a room change or reload go back to 0", () => {
    expect(nextUndoDepth(4, { type: "nothing" })).toBe(0);
    expect(nextUndoDepth(4, { type: "reset" })).toBe(0);
  });
});

describe("photoUndoErrorMessage", () => {
  async function failWith(status: number, detail: string | null, headers: Record<string, string> = {}) {
    vi.stubGlobal("fetch", answer(status, detail === null ? {} : { detail }, headers));
    const { api } = await import("../src/lib/api");
    const { photoUndoErrorMessage } = await import("../src/lib/photoUndo");
    const error = await api.undoRoomPhoto(3).catch((err: unknown) => err);
    return photoUndoErrorMessage(error);
  }

  it.each([
    [404, "No existe una habitación con id 3.", "Esta sala ya no existe o no es de tu cuenta. Recarga la página."],
    [
      409,
      "No hay ninguna foto que deshacer en esta sala. El historial de Deshacer solo se guarda mientras el servidor está encendido y se pierde si se reinicia.",
      "No hay ninguna foto que deshacer en esta sala. El historial de Deshacer solo se guarda mientras el servidor está encendido y se pierde si se reinicia.",
    ],
    [409, null, "No queda ninguna foto que deshacer. El historial se borra si el servidor se reinicia."],
    [401, null, "Tu sesión ha caducado. Vuelve a iniciar sesión."],
    [503, null, "La base de datos no está disponible ahora. Inténtalo más tarde."],
  ])("status %i (detail %s)", async (status, detail, expected) => {
    expect(await failWith(status, detail)).toBe(expected);
  });

  it("an unreachable server keeps its own text", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const { api } = await import("../src/lib/api");
    const { photoUndoErrorMessage } = await import("../src/lib/photoUndo");

    const error = await api.undoRoomPhoto(3).catch((err: unknown) => err);

    expect(photoUndoErrorMessage(error)).toMatch(/^No se pudo conectar con el servidor/);
  });
});

describe("es.photo.undo.done", () => {
  it("says how many more photos can be undone", () => {
    expect(es.photo.undo.done(0)).toBe("Se restauró la sala de antes de la foto.");
    expect(es.photo.undo.done(1)).toBe("Se restauró la sala de antes de la foto. Puedes deshacer 1 más.");
    expect(es.photo.undo.done(4)).toBe("Se restauró la sala de antes de la foto. Puedes deshacer 4 más.");
  });
});

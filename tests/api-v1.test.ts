import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

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
const ROOM = { id: 3, name: "Sala", vertices: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }], heightM: 2.5, areaM2: 6 };

/** A fetch mock answering once with this status, JSON body and headers. */
function answer(status: number, body: unknown, headers: Record<string, string> = {}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => lower[name.toLowerCase()] ?? null },
    json: async () => body,
  });
}

function lastCall() {
  const [url, init] = vi.mocked(fetch).mock.calls.at(-1)!;
  return { url, init: init!, body: init!.body ? JSON.parse(init!.body as string) : undefined };
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

describe("api client — /api/v1 room routes", () => {
  it("creates a room with POST /api/v1/spaces/rooms, vertices in meters and heightM", async () => {
    vi.stubGlobal("fetch", answer(201, ROOM));
    const { api } = await import("../src/lib/api");

    const room = await api.createRoom({ name: "Sala", vertices: ROOM.vertices, heightM: 2.5 });

    const { url, init, body } = lastCall();
    expect(url).toBe("http://localhost:8000/api/v1/spaces/rooms");
    expect(init.method).toBe("POST");
    expect(body).toEqual({ name: "Sala", vertices: ROOM.vertices, heightM: 2.5 });
    expect(room).toEqual(ROOM);
  });

  it("reads a room with GET /api/v1/spaces/rooms/{id}", async () => {
    vi.stubGlobal("fetch", answer(200, ROOM));
    const { api } = await import("../src/lib/api");

    await api.getRoom(3);

    expect(lastCall().url).toBe("http://localhost:8000/api/v1/spaces/rooms/3");
    expect(lastCall().init.method).toBeUndefined();
  });

  it("moves a vertex with PATCH /rooms/{id}/vertices/{index} and {x, y}", async () => {
    vi.stubGlobal("fetch", answer(200, ROOM));
    const { api } = await import("../src/lib/api");

    await api.moveRoomVertex(3, 1, { x: 4.5, y: 0 });

    const { url, init, body } = lastCall();
    expect(url).toBe("http://localhost:8000/api/v1/spaces/rooms/3/vertices/1");
    expect(init.method).toBe("PATCH");
    expect(body).toEqual({ x: 4.5, y: 0 });
  });

  it("inserts a vertex with POST /rooms/{id}/vertices and {afterIndex, x, y}", async () => {
    vi.stubGlobal("fetch", answer(200, ROOM));
    const { api } = await import("../src/lib/api");

    await api.insertRoomVertex(3, 2, { x: 2, y: 3 });

    const { url, init, body } = lastCall();
    expect(url).toBe("http://localhost:8000/api/v1/spaces/rooms/3/vertices");
    expect(init.method).toBe("POST");
    expect(body).toEqual({ afterIndex: 2, x: 2, y: 3 });
  });

  it("deletes a vertex with DELETE /rooms/{id}/vertices/{index}", async () => {
    vi.stubGlobal("fetch", answer(200, ROOM));
    const { api } = await import("../src/lib/api");

    await api.deleteRoomVertex(3, 0);

    expect(lastCall().url).toBe("http://localhost:8000/api/v1/spaces/rooms/3/vertices/0");
    expect(lastCall().init.method).toBe("DELETE");
  });

  it("lists the placed furniture with GET /rooms/{id}/items", async () => {
    const items = [{ id: 9, name: "Sofá", x: 0.5, y: 1, rotation: 0 }];
    vi.stubGlobal("fetch", answer(200, { items }));
    const { api } = await import("../src/lib/api");

    const res = await api.listRoomItems(3);

    expect(lastCall().url).toBe("http://localhost:8000/api/v1/spaces/rooms/3/items");
    expect(res.items).toEqual(items);
  });

  it("asks for a layout with POST /rooms/{id}/layout sending only constraints and itemIds", async () => {
    vi.stubGlobal("fetch", answer(200, { layout: { positions: [], warnings: [] }, readyToRender: true, errors: [] }));
    const { api } = await import("../src/lib/api");

    await api.generateRoomLayout(3, {
      constraints: { minDistanceBetweenItemsCm: 15, minClearPathCm: 60 },
      itemIds: [1, 2],
    });

    const { url, init, body } = lastCall();
    expect(url).toBe("http://localhost:8000/api/v1/spaces/rooms/3/layout");
    expect(init.method).toBe("POST");
    expect(body).toEqual({ constraints: { minDistanceBetweenItemsCm: 15, minClearPathCm: 60 }, itemIds: [1, 2] });
  });

  it("chats with POST /api/v1/chat sending roomId and the messages", async () => {
    vi.stubGlobal("fetch", answer(200, { role: "assistant", content: "Hola" }));
    const { api } = await import("../src/lib/api");

    const reply = await api.chatAboutRoom(3, [{ role: "user", content: "¿Dónde pongo el sofá?" }]);

    const { url, init, body } = lastCall();
    expect(url).toBe("http://localhost:8000/api/v1/chat");
    expect(init.method).toBe("POST");
    expect(body).toEqual({ roomId: 3, messages: [{ role: "user", content: "¿Dónde pongo el sofá?" }] });
    expect(reply.content).toBe("Hola");
  });

  it("sends Authorization: Bearer on every new route", async () => {
    vi.stubGlobal("fetch", answer(200, {}));
    const { api } = await import("../src/lib/api");

    await api.health();
    await api.createRoom({ name: "S", vertices: ROOM.vertices, heightM: 2 });
    await api.getRoom(3);
    await api.moveRoomVertex(3, 0, { x: 0, y: 0 });
    await api.insertRoomVertex(3, 0, { x: 1, y: 0 });
    await api.deleteRoomVertex(3, 0);
    await api.listRoomItems(3);
    await api.generateRoomLayout(3, { constraints: { minDistanceBetweenItemsCm: 15, minClearPathCm: 60 } });
    await api.chatAboutRoom(3, []);

    const calls = vi.mocked(fetch).mock.calls;
    expect(calls).toHaveLength(9);
    for (const [, init] of calls) {
      expect(init!.headers).toMatchObject({ Authorization: "Bearer header.payload.signature" });
    }
  });
});

describe("api client — error messages in Spanish", () => {
  it("a 401 on a room route clears the session and says it expired", async () => {
    const storage = memoryStorage(SESSION);
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("fetch", answer(401, { detail: "Token de sesión inválido o caducado." }));
    const { api } = await import("../src/lib/api");

    const error = await api.getRoom(3).catch((err: unknown) => err);

    expect(error).toMatchObject({ status: 401, message: "Tu sesión ha caducado. Vuelve a iniciar sesión." });
    expect(storage.has("auth_token")).toBe(false);
    expect(storage.has("auth_user_id")).toBe(false);
  });

  it("a 429 tells how many seconds to wait from Retry-After", async () => {
    vi.stubGlobal(
      "fetch",
      answer(429, { detail: "Has hecho demasiadas peticiones a la IA." }, { "Retry-After": "37" })
    );
    const { api } = await import("../src/lib/api");

    const error = await api.chatAboutRoom(3, []).catch((err: unknown) => err);

    expect(error).toMatchObject({
      status: 429,
      retryAfterSeconds: 37,
      message: "Has hecho demasiadas peticiones a la IA. Podrás volver a intentarlo en 37 segundos.",
    });
  });

  it("a 429 without a readable Retry-After still asks to wait", async () => {
    vi.stubGlobal("fetch", answer(429, { detail: "Se han creado demasiadas cuentas." }));
    const { api } = await import("../src/lib/api");

    const error = await api.register({ nombre: "a", email: "a@b.co", password: "12345678" }).catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 429, retryAfterSeconds: null });
    expect((error as Error).message).toBe("Se han creado demasiadas cuentas. Espera un momento antes de volver a intentarlo.");
  });

  it("a 502 says the AI assistant is not available", async () => {
    vi.stubGlobal("fetch", answer(502, { detail: "OmniRoute timeout" }));
    const { api } = await import("../src/lib/api");

    await expect(api.chatAboutRoom(3, [])).rejects.toThrow("El asistente de IA no está disponible ahora.");
  });

  it("a 422 keeps the backend's explanation (for example an invalid polygon)", async () => {
    vi.stubGlobal("fetch", answer(422, { detail: "Habitación inválida: the polygon intersects itself" }));
    const { api } = await import("../src/lib/api");

    await expect(api.moveRoomVertex(3, 0, { x: 9, y: 9 })).rejects.toThrow(
      "Habitación inválida: the polygon intersects itself"
    );
  });

  it("a 422 with a list of field errors gets a generic message", async () => {
    vi.stubGlobal("fetch", answer(422, { detail: [{ type: "missing", loc: ["body", "name"], msg: "Field required" }] }));
    const { api } = await import("../src/lib/api");

    await expect(api.createRoom({ name: "", vertices: [], heightM: 0 })).rejects.toThrow(
      "Los datos enviados no son válidos."
    );
  });

  it("413 and 415 explain what is wrong with the photo", async () => {
    const { describeApiError } = await import("../src/lib/api");

    expect(describeApiError(413, null, "/x", null)).toBe("La foto es demasiado grande: el máximo es 5 MB.");
    expect(describeApiError(415, null, "/x", null)).toBe("Formato de foto no admitido: usa una imagen JPEG o PNG.");
  });

  it("a network failure says the server could not be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const { api, BackendUnreachableError } = await import("../src/lib/api");

    const error = await api.getRoom(3).catch((err: unknown) => err);

    expect(error).toBeInstanceOf(BackendUnreachableError);
    expect((error as Error).message).toMatch(/^No se pudo conectar con el servidor/);
  });
});

describe("parseRetryAfter", () => {
  it("reads delta-seconds and HTTP dates, and ignores anything else", async () => {
    const { parseRetryAfter } = await import("../src/lib/api");
    const now = Date.parse("2026-10-18T12:00:00Z");

    expect(parseRetryAfter("120", now)).toBe(120);
    expect(parseRetryAfter("Sun, 18 Oct 2026 12:00:30 GMT", now)).toBe(30);
    expect(parseRetryAfter(null, now)).toBeNull();
    expect(parseRetryAfter("soon", now)).toBeNull();
  });
});

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const SESSION = { auth_token: "header.payload.signature", auth_user_id: "5" };
const ANALYSIS = {
  room: { id: 3, name: "Sala", vertices: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }], heightM: 2.5, areaM2: 12 },
  estimated: true,
  description: "Sala pequeña.",
  items: [{ id: 9, name: "Sofá", x: 0.5, y: 0.55, rotation: 0, widthM: 2, depthM: 0.9, heightM: 0.85, elevationM: 0 }],
  discarded: [{ name: "Lámpara", reason: "fuera de la habitación" }],
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

function lastCall() {
  const [url, init] = vi.mocked(fetch).mock.calls.at(-1)!;
  return { url, init: init! };
}

const photo = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: "image/jpeg" });

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("localStorage", memoryStorage(SESSION));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("api.analyzeRoomPhoto", () => {
  it("posts a multipart form with the photo, confirm_replace and the trimmed instructions", async () => {
    vi.stubGlobal("fetch", answer(200, ANALYSIS));
    const { api } = await import("../src/lib/api");

    const result = await api.analyzeRoomPhoto(3, photo(), { confirmReplace: true, instructions: "  Solo muebles grandes " });

    const { url, init } = lastCall();
    expect(url).toBe("http://localhost:8000/api/v1/spaces/rooms/3/analyze-photo");
    expect(init.method).toBe("POST");
    const form = init.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect((form.get("file") as File).name).toBe("foto.jpg");
    expect((form.get("file") as File).type).toBe("image/jpeg");
    expect(form.get("confirm_replace")).toBe("true");
    expect(form.get("instrucciones")).toBe("Solo muebles grandes");
    // Sin Content-Type: el navegador pone el boundary del multipart.
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
    expect(headers.Authorization).toBe(`Bearer ${SESSION.auth_token}`);
    expect(result).toEqual(ANALYSIS);
  });

  it("sends confirm_replace=false and no instructions when they are blank", async () => {
    vi.stubGlobal("fetch", answer(200, ANALYSIS));
    const { api } = await import("../src/lib/api");

    await api.analyzeRoomPhoto(3, photo(), { confirmReplace: false, instructions: "   " });

    const form = lastCall().init.body as FormData;
    expect(form.get("confirm_replace")).toBe("false");
    expect(form.has("instrucciones")).toBe(false);
  });

  it("still sends JSON requests with Content-Type: application/json", async () => {
    vi.stubGlobal("fetch", answer(200, ANALYSIS.room));
    const { api } = await import("../src/lib/api");

    await api.createRoom({ name: "Sala", vertices: ANALYSIS.room.vertices, heightM: 2.5 });

    expect((lastCall().init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });
});

describe("describeApiError: Spanish messages per status", () => {
  it.each([
    [401, null, "Tu sesión ha caducado. Vuelve a iniciar sesión."],
    [404, null, "No se encontró lo que buscabas; puede que ya no exista."],
    [404, "No existe una habitación con id 3.", "No existe una habitación con id 3."],
    [409, null, "La operación choca con lo que ya está guardado."],
    [413, null, "La foto es demasiado grande: el máximo es 5 MB."],
    [415, null, "Formato de foto no admitido: usa una imagen JPEG o PNG."],
    [422, null, "Los datos enviados no son válidos."],
    [502, "OmniRoute: fallo", "El asistente de IA no está disponible ahora."],
    [503, null, "La base de datos no está disponible ahora. Inténtalo más tarde."],
    [504, null, "El servidor tardó demasiado en responder. Inténtalo de nuevo en un momento."],
    [500, null, "La petición falló (HTTP 500)."],
  ])("status %i (detail %s)", async (status, detail, expected) => {
    const { describeApiError } = await import("../src/lib/api");

    expect(describeApiError(status, detail, "/spaces/rooms/3/analyze-photo", null)).toBe(expected);
  });

  it("a 429 adds how long to wait", async () => {
    const { describeApiError } = await import("../src/lib/api");

    expect(describeApiError(429, "Demasiadas peticiones a la IA.", "/x", 20)).toBe(
      "Demasiadas peticiones a la IA. Podrás volver a intentarlo en 20 segundos."
    );
    expect(describeApiError(429, null, "/x", null)).toBe(
      "Has hecho demasiadas peticiones. Espera un momento antes de volver a intentarlo."
    );
  });
});

describe("photoErrorMessage", () => {
  async function failWith(status: number, detail: string | null, headers: Record<string, string> = {}) {
    vi.stubGlobal("fetch", answer(status, detail === null ? {} : { detail }, headers));
    const { api } = await import("../src/lib/api");
    const { photoErrorMessage } = await import("../src/lib/photoErrors");
    const error = await api.analyzeRoomPhoto(3, photo(), { confirmReplace: true }).catch((err: unknown) => err);
    return photoErrorMessage(error);
  }

  it.each([
    [401, null, "Tu sesión ha caducado. Vuelve a iniciar sesión."],
    [404, "No existe una habitación con id 3.", "Esta sala ya no existe o no es de tu cuenta. Recarga la página."],
    [409, "Esta sala ya tiene forma o muebles guardados.", "Esta sala ya tiene forma o muebles guardados."],
    [409, null, "Hay que confirmar que se reemplazan la forma y los muebles de la sala."],
    [413, null, "La foto es demasiado grande: el máximo es 5 MB."],
    [415, null, "Formato de foto no admitido: usa una imagen JPEG o PNG."],
    [422, "Imagen inválida: no se pudo leer la foto.", "Imagen inválida: no se pudo leer la foto."],
    [
      502,
      "El servicio de IA no devolvió una estimación válida.",
      "La IA no pudo estimar la sala con esta foto. Prueba con otra más clara, con el suelo y las paredes a la vista.",
    ],
    [503, null, "La base de datos no está disponible ahora. Inténtalo más tarde."],
    [
      504,
      null,
      "El análisis de la foto tardó demasiado. Inténtalo de nuevo en un momento o con una foto más pequeña.",
    ],
  ])("status %i", async (status, detail, expected) => {
    expect(await failWith(status, detail)).toBe(expected);
  });

  it("a 429 keeps the backend detail and the wait", async () => {
    const message = await failWith(429, "Has hecho demasiadas peticiones a la IA.", { "Retry-After": "40" });

    expect(message).toBe("Has hecho demasiadas peticiones a la IA. Podrás volver a intentarlo en 40 segundos.");
  });

  it("an unreachable server and a photo that cannot be read have their own texts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const { api } = await import("../src/lib/api");
    const { photoErrorMessage } = await import("../src/lib/photoErrors");

    const unreachable = await api.analyzeRoomPhoto(3, photo(), { confirmReplace: true }).catch((err: unknown) => err);

    expect(photoErrorMessage(unreachable)).toMatch(/^No se pudo conectar con el servidor/);
    expect(photoErrorMessage(new Error("canvas sin contexto 2d"))).toBe(
      "No se pudo leer la foto en el navegador. Prueba con otra imagen JPEG o PNG."
    );
  });
});

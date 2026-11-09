import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

import { es } from "../src/i18n/es";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const SESSION = { auth_token: "header.payload.signature", auth_user_id: "5" };
const IMPORTED = {
  room: { id: 77, name: "Prueba 1", vertices: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }], heightM: 2.5, areaM2: 6 },
  items: [{ id: 501, name: "Mesa", x: 1, y: 1, rotation: 0, widthM: 1.2, depthM: 0.8, heightM: 0.75, elevationM: 0 }],
};
const FILE_TEXT = '{"format": "habita-project", "version": 1}';

function answer(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  });
}

function file(text: string, size = text.length) {
  return { size, text: vi.fn(async () => text) };
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

describe("api.importRoom", () => {
  it("posts the file text unchanged as application/json and returns the new project", async () => {
    const fetchMock = answer(201, IMPORTED);
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await import("../src/lib/api");

    const result = await api.importRoom(FILE_TEXT);

    expect(result).toEqual(IMPORTED);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/spaces\/rooms\/import$/);
    expect(init.method).toBe("POST");
    expect(init.body).toBe(FILE_TEXT);
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.headers.Authorization).toBe("Bearer header.payload.signature");
  });
});

describe("checkImportFile", () => {
  it("refuses empty files and files over 256 KB", async () => {
    const { checkImportFile, MAX_IMPORT_BYTES } = await import("../src/lib/projectImport");

    expect(MAX_IMPORT_BYTES).toBe(262144);
    expect(checkImportFile({ size: 0 })).toBe(es.projectTransfer.importEmpty);
    expect(checkImportFile({ size: 1 })).toBeNull();
    expect(checkImportFile({ size: 262144 })).toBeNull();
    expect(checkImportFile({ size: 262145 })).toBe(es.projectTransfer.importTooLarge);
  });
});

describe("importErrorMessage", () => {
  it("has its own texts for 413 and 415 and keeps the backend reason of a 422", async () => {
    const { ApiError } = await import("../src/lib/api");
    const { importErrorMessage } = await import("../src/lib/projectImport");
    const t = es.projectTransfer;

    expect(importErrorMessage(new ApiError(413, "El cuerpo de la petición supera el máximo de 0.25 MB."))).toBe(
      t.importTooLarge
    );
    expect(importErrorMessage(new ApiError(415, "El archivo debe enviarse como JSON."))).toBe(t.importType);
    expect(importErrorMessage(new ApiError(422, "El objeto 3 se sale de la habitación."))).toBe(
      t.importFailed("El objeto 3 se sale de la habitación.")
    );
    expect(importErrorMessage(new ApiError(422, null))).toBe(t.importFailed(es.errors.invalidData));
  });

  it("keeps the wait of a 429 and the text of a network error", async () => {
    const { ApiError, BackendUnreachableError } = await import("../src/lib/api");
    const { importErrorMessage } = await import("../src/lib/projectImport");

    const limited = importErrorMessage(new ApiError(429, "Has importado demasiados proyectos.", "", 120));
    expect(limited).toContain("Has importado demasiados proyectos.");
    expect(limited).toContain("120");
    const offline = new BackendUnreachableError();
    expect(importErrorMessage(offline)).toBe(es.projectTransfer.importFailed(offline.message));
    expect(importErrorMessage("raro")).toBe(es.projectTransfer.importFailed(es.errors.invalidData));
  });
});

describe("importProjectFile", () => {
  it("reads the file, uploads it and returns the new project", async () => {
    const fetchMock = answer(201, IMPORTED);
    vi.stubGlobal("fetch", fetchMock);
    const { importProjectFile } = await import("../src/lib/projectImport");
    const chosen = file(FILE_TEXT);

    const result = await importProjectFile(chosen);

    expect(result.room.id).toBe(77);
    expect(chosen.text).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][1].body).toBe(FILE_TEXT);
  });

  it("does not read or send a file that is empty or too large", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { importProjectFile } = await import("../src/lib/projectImport");
    const big = file("x", 262145);
    const empty = file("", 0);

    await expect(importProjectFile(big)).rejects.toThrow(es.projectTransfer.importTooLarge);
    await expect(importProjectFile(empty)).rejects.toThrow(es.projectTransfer.importEmpty);
    expect(big.text).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a file that cannot be read", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { importProjectFile } = await import("../src/lib/projectImport");
    const broken = { size: 10, text: vi.fn(async () => Promise.reject(new Error("NotReadableError"))) };

    await expect(importProjectFile(broken)).rejects.toThrow(es.projectTransfer.importReadFailed);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("turns a 422 of the backend into a sentence for the user", async () => {
    vi.stubGlobal("fetch", answer(422, { detail: "Versión de archivo no compatible: esta aplicación solo lee la versión 1." }));
    const { importProjectFile } = await import("../src/lib/projectImport");

    await expect(importProjectFile(file(FILE_TEXT))).rejects.toThrow(
      es.projectTransfer.importFailed("Versión de archivo no compatible: esta aplicación solo lee la versión 1.")
    );
  });

  it("explains a 413 from the server as a file that is too large", async () => {
    vi.stubGlobal("fetch", answer(413, { detail: "El cuerpo de la petición supera el máximo de 0.25 MB." }));
    const { importProjectFile } = await import("../src/lib/projectImport");

    await expect(importProjectFile(file(FILE_TEXT))).rejects.toThrow(es.projectTransfer.importTooLarge);
  });
});

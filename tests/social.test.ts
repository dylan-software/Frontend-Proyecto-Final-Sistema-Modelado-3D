/** Red social (CONTRATO-FASE9.md): llamadas de lib/api.ts y funciones puras de lib/social.ts. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SOCIAL_NETWORK_NAME, es } from "../src/i18n/es";
import { ApiError, type PublicPublication } from "../src/lib/api";
import {
  appendCatalogPage,
  checkPublicationForm,
  copyErrorMessage,
  formatPublishedDate,
  publishErrorMessage,
  unpublishErrorMessage,
} from "../src/lib/social";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const SESSION = { auth_token: "header.payload.signature", auth_user_id: "5" };

function answer(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  });
}

function card(code: string, extra: Partial<PublicPublication> = {}): PublicPublication {
  return {
    code,
    title: `Sala ${code}`,
    description: null,
    publishedAt: "2026-11-08T10:00:00Z",
    updatedAt: "2026-11-08T10:00:00Z",
    copies: 0,
    mine: false,
    room: { vertices: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }], heightM: 2.5, areaM2: 12 },
    itemCount: 0,
    ...extra,
  };
}

const OWN = {
  code: "AbCdEfGhIjKlMn_-",
  title: "Mi dormitorio",
  description: null,
  publishedAt: "2026-11-08T10:00:00Z",
  updatedAt: "2026-11-08T10:00:00Z",
  copies: 0,
};

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("localStorage", memoryStorage(SESSION));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("llamadas de la red social", () => {
  it("lee el estado de publicación de un proyecto", async () => {
    const fetchMock = answer(200, { published: false, publication: null });
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await import("../src/lib/api");

    expect(await api.getRoomPublication(7)).toEqual({ published: false, publication: null });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/spaces\/rooms\/7\/publication$/);
    expect(init.method).toBeUndefined();
    expect(init.headers.Authorization).toBe("Bearer header.payload.signature");
  });

  it("publica con PUT y solo título y descripción", async () => {
    const fetchMock = answer(201, OWN);
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await import("../src/lib/api");

    expect(await api.publishRoom(7, { title: "Mi dormitorio", description: null })).toEqual(OWN);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/spaces\/rooms\/7\/publication$/);
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ title: "Mi dormitorio", description: null });
  });

  it("deja de publicar con DELETE y acepta el 204 sin cuerpo", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: { get: () => null },
      json: async () => {
        throw new SyntaxError("sin cuerpo");
      },
    });
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await import("../src/lib/api");

    await expect(api.unpublishRoom(7)).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
  });

  it("pide el catálogo por página y copia por código", async () => {
    const page = { items: [card("A".repeat(16))], page: 2, hasMore: false };
    const copied = { room: { id: 90, name: "Sala", vertices: [], heightM: 2.5, areaM2: 12 }, items: [] };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => null }, json: async () => page })
      .mockResolvedValueOnce({ ok: true, status: 201, headers: { get: () => null }, json: async () => copied });
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await import("../src/lib/api");

    expect(await api.listPublications(2)).toEqual(page);
    expect(await api.copyPublication("AbCdEfGhIjKlMn_-")).toEqual(copied);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/social\/publications\?page=2$/);
    const [copyUrl, copyInit] = fetchMock.mock.calls[1];
    expect(copyUrl).toMatch(/\/api\/v1\/social\/publications\/AbCdEfGhIjKlMn_-\/copy$/);
    expect(copyInit.method).toBe("POST");
    expect(copyInit.body).toBeUndefined();
  });

  it("un 404 al copiar llega como ApiError", async () => {
    vi.stubGlobal("fetch", answer(404, { detail: "No existe una publicación pública con ese código." }));
    const { api, ApiError: FreshApiError } = await import("../src/lib/api");

    await expect(api.copyPublication("A".repeat(16))).rejects.toBeInstanceOf(FreshApiError);
  });
});

describe("formatPublishedDate", () => {
  it("da día, mes abreviado y año en UTC", () => {
    expect(formatPublishedDate("2026-11-08T23:30:00Z")).toBe("8 nov 2026");
    expect(formatPublishedDate("2027-01-01T00:00:00+00:00")).toBe("1 ene 2027");
    expect(formatPublishedDate("2026-09-15T12:00:00Z")).toBe("15 sept 2026");
  });

  it("devuelve una cadena vacía si la fecha no se puede leer", () => {
    expect(formatPublishedDate("ayer")).toBe("");
  });
});

describe("checkPublicationForm", () => {
  it("recorta y convierte la descripción vacía en null", () => {
    expect(checkPublicationForm("  Mi sala  ", "   ")).toEqual({ ok: true, value: { title: "Mi sala", description: null } });
    expect(checkPublicationForm("Mi sala", " Con sofá\ny mesa ")).toEqual({
      ok: true,
      value: { title: "Mi sala", description: "Con sofá\ny mesa" },
    });
  });

  it("rechaza títulos vacíos, largos o con < >", () => {
    expect(checkPublicationForm("", "")).toMatchObject({ ok: false, field: "title" });
    expect(checkPublicationForm("x".repeat(121), "")).toMatchObject({ ok: false, field: "title" });
    expect(checkPublicationForm("x".repeat(120), "")).toMatchObject({ ok: true });
    expect(checkPublicationForm("<b>Sala</b>", "")).toMatchObject({ ok: false, field: "title" });
  });

  it("rechaza descripciones de más de 1000 caracteres", () => {
    expect(checkPublicationForm("Sala", "x".repeat(1001))).toMatchObject({ ok: false, field: "description" });
    expect(checkPublicationForm("Sala", "x".repeat(1000))).toMatchObject({ ok: true });
  });
});

describe("mensajes de error", () => {
  it("413 al publicar tiene su propio texto, no el de la foto", () => {
    expect(publishErrorMessage(new ApiError(413, null))).toBe(es.publish.tooLarge);
  });

  it("409 y 422 al publicar conservan el motivo del backend", () => {
    const cap = "Ya tienes 20 proyectos publicados, el máximo; deja de publicar alguno antes de publicar otro.";
    expect(publishErrorMessage(new ApiError(409, cap))).toBe(es.publish.failed(cap));
    expect(publishErrorMessage(new ApiError(422, "El objeto 3 se sale de la habitación."))).toContain("objeto 3");
  });

  it("dejar de publicar y copiar dan textos propios", () => {
    expect(unpublishErrorMessage(new Error("Sin conexión."))).toBe(es.publish.unpublishFailed("Sin conexión."));
    expect(copyErrorMessage(new ApiError(404, "No existe una publicación pública con ese código."))).toBe(es.social.copyGone);
    expect(copyErrorMessage(new ApiError(429, "Has importado demasiados proyectos en la última hora."))).toContain(
      "demasiados proyectos"
    );
  });
});

describe("appendCatalogPage", () => {
  it("añade la página siguiente sin repetir códigos", () => {
    const loaded = [card("A".repeat(16)), card("B".repeat(16))];
    const next = [card("B".repeat(16)), card("C".repeat(16))];

    expect(appendCatalogPage(loaded, next).map((item) => item.code[0])).toEqual(["A", "B", "C"]);
  });
});

describe("textos", () => {
  it("el nombre de la red social sale siempre de la constante", () => {
    expect(SOCIAL_NETWORK_NAME).toBe("Habita");
    expect(es.publish.button).toBe("Publicar en Habita");
    expect(es.social.copies(1)).toBe("1 copia");
    expect(es.social.copies(3)).toBe("3 copias");
    expect(es.social.itemCount(0)).toBe("Sin objetos");
  });
});

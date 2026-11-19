/** Perfiles públicos (CONTRATO-HABITA-PERFILES.md, parte A): llamadas de lib/api.ts, ruta y funciones puras. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SOCIAL_NETWORK_NAME, es } from "../src/i18n/es";
import { ApiError, type AuthorCard, type PublicProfile } from "../src/lib/api";
import { ROUTES, sessionRedirect } from "../src/lib/routes";
import {
  MAX_DISPLAY_NAME_LENGTH,
  appendCatalogPage,
  authorLabel,
  checkDisplayName,
  displayNameErrorMessage,
  displayNameNeedsSaving,
  initialDisplayName,
  profileErrorMessage,
  publicationCountLabel,
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
const CODE = "AbCdEfGhIjKlMn_-";

function answer(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  });
}

function profile(extra: Partial<PublicProfile> = {}): PublicProfile {
  return { code: CODE, displayName: "Lola", publicationCount: 2, mine: true, ...extra };
}

function authorCard(code: string): AuthorCard {
  return {
    code,
    title: `Sala ${code}`,
    description: null,
    publishedAt: "2026-11-08T10:00:00Z",
    updatedAt: "2026-11-08T10:00:00Z",
    copies: 0,
    mine: false,
    room: { vertices: [], heightM: 2.5, areaM2: 12 },
    itemCount: 0,
    author: { code: CODE, displayName: null, mine: false },
    authorPublicationCount: 1,
  };
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

describe("llamadas de perfiles", () => {
  it("pide el catálogo por autor por página", async () => {
    const page = { items: [authorCard("A".repeat(16))], page: 2, hasMore: false };
    const fetchMock = answer(200, page);
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await import("../src/lib/api");

    expect(await api.listAuthors(2)).toEqual(page);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/social\/authors\?page=2$/);
    expect(init.method).toBeUndefined();
    expect(init.headers.Authorization).toBe("Bearer header.payload.signature");
  });

  it("pide un perfil por código y página, con el código escapado", async () => {
    const body = { profile: profile({ mine: false }), items: [], page: 1, hasMore: false };
    const fetchMock = answer(200, body);
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await import("../src/lib/api");

    expect(await api.getProfile("a/b?c", 1)).toEqual(body);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/social\/profiles\/a%2Fb%3Fc\?page=1$/);
  });

  it("lee el perfil propio y devuelve null si aún no hay", async () => {
    const fetchMock = answer(200, { profile: null });
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await import("../src/lib/api");

    expect(await api.getMyProfile()).toBeNull();
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/social\/me\/profile$/);
  });

  it("cambia el nombre visible con PATCH y solo displayName", async () => {
    const fetchMock = answer(200, profile());
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await import("../src/lib/api");

    expect(await api.updateMyProfile("Lola")).toEqual(profile());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/social\/me\/profile$/);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ displayName: "Lola" });
  });

  it("envía null para quedar anónimo", async () => {
    const fetchMock = answer(200, profile({ displayName: null }));
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await import("../src/lib/api");

    await api.updateMyProfile(null);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ displayName: null });
  });
});

describe("ruta del perfil", () => {
  it("va bajo /red/perfil con el código escapado", () => {
    expect(ROUTES.profile(CODE)).toBe(`/red/perfil/${CODE}`);
    expect(ROUTES.profile("a/b")).toBe("/red/perfil/a%2Fb");
  });

  it("está protegida por la regla de sesión de siempre", () => {
    expect(sessionRedirect("/red/perfil/[code]", false)).toBe(ROUTES.login);
    expect(sessionRedirect("/red/perfil/[code]", true)).toBeNull();
  });
});

describe("autores y contadores", () => {
  it("muestra el nombre visible o Autor anónimo", () => {
    expect(authorLabel({ displayName: "Lola" })).toBe("Lola");
    expect(authorLabel({ displayName: null })).toBe(es.profile.anonymous);
    expect(authorLabel(null)).toBe("Autor anónimo");
    expect(authorLabel(undefined)).toBe("Autor anónimo");
  });

  it("cuenta proyectos en singular y plural", () => {
    expect(publicationCountLabel(1)).toBe("1 proyecto");
    expect(publicationCountLabel(0)).toBe("0 proyectos");
    expect(publicationCountLabel(3)).toBe("3 proyectos");
  });

  it("el título del perfil y la etiqueta del campo usan el nombre de la red", () => {
    expect(es.profile.title).toContain(SOCIAL_NETWORK_NAME);
    expect(es.publish.displayNameLabel).toBe(`Nombre visible en ${SOCIAL_NETWORK_NAME}`);
  });

  it("une páginas del catálogo por autor sin repetir códigos", () => {
    const [a, b, c] = ["A", "B", "C"].map((letter) => authorCard(letter.repeat(16)));
    expect(appendCatalogPage([a, b], [b, c]).map((item) => item.code)).toEqual([a.code, b.code, c.code]);
  });
});

describe("nombre visible", () => {
  it("acepta de 1 a 40 caracteres y recorta los extremos", () => {
    expect(checkDisplayName("L")).toEqual({ ok: true, value: "L" });
    expect(checkDisplayName("  Lola Pérez ")).toEqual({ ok: true, value: "Lola Pérez" });
    expect(checkDisplayName("x".repeat(MAX_DISPLAY_NAME_LENGTH))).toEqual({ ok: true, value: "x".repeat(40) });
    // 40 emojis son 40 caracteres (puntos de código), como los cuenta el backend.
    expect(checkDisplayName("😀".repeat(40))).toEqual({ ok: true, value: "😀".repeat(40) });
  });

  it("vacío o solo espacios es anónimo (null)", () => {
    expect(checkDisplayName("")).toEqual({ ok: true, value: null });
    expect(checkDisplayName("   ")).toEqual({ ok: true, value: null });
  });

  it("rechaza 41 caracteres, < > y caracteres de control", () => {
    expect(checkDisplayName("x".repeat(41))).toEqual({ ok: false, error: es.profile.tooLong });
    expect(checkDisplayName("<b>Lola</b>")).toEqual({ ok: false, error: es.profile.invalidChars });
    expect(checkDisplayName("Lola\u0007")).toEqual({ ok: false, error: es.profile.invalidChars });
  });

  it("empieza con el nombre del perfil, vacío si es anónimo y el de la cuenta si no hay perfil", () => {
    expect(initialDisplayName(profile(), "Ana Cuenta")).toBe("Lola");
    expect(initialDisplayName(profile({ displayName: null }), "Ana Cuenta")).toBe("");
    expect(initialDisplayName(null, "  Ana Cuenta ")).toBe("Ana Cuenta");
    expect(initialDisplayName(null, null)).toBe("");
    expect(initialDisplayName(null, "y".repeat(120))).toBe("y".repeat(40));
  });

  it("solo hay que guardar si no hay perfil o el nombre cambió", () => {
    expect(displayNameNeedsSaving(null, null)).toBe(true);
    expect(displayNameNeedsSaving(null, "Lola")).toBe(true);
    expect(displayNameNeedsSaving(profile(), "Lola")).toBe(false);
    expect(displayNameNeedsSaving(profile(), "Dolores")).toBe(true);
    expect(displayNameNeedsSaving(profile(), null)).toBe(true);
    expect(displayNameNeedsSaving(profile({ displayName: null }), null)).toBe(false);
  });
});

describe("errores de perfiles", () => {
  it("un 404 del perfil es que no existe", () => {
    expect(profileErrorMessage(new ApiError(404, "Este perfil no existe."))).toBe(es.profile.notFound);
  });

  it("el resto lleva su motivo", () => {
    const tooMany = new ApiError(429, "Espera.");
    expect(profileErrorMessage(tooMany)).toBe(tooMany.message);
    expect(profileErrorMessage(tooMany)).toContain("Espera.");
    expect(profileErrorMessage("raro")).toBe(es.errors.invalidData);
  });

  it("un fallo al guardar el nombre dice que no se publicó", () => {
    const tooMany = new ApiError(429, "Demasiados cambios.");
    const message = displayNameErrorMessage(tooMany);
    expect(message).toBe(es.publish.displayNameFailed(tooMany.message));
    expect(message).toContain("Demasiados cambios.");
    expect(message).toContain("no se publicó");
  });
});

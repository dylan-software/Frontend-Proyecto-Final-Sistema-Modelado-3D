/**
 * Parpadeo al abrir una ruta: las páginas con guardia no pintan su contenido (ni el login) hasta
 * saber si hay sesión; sin sesión van al login con replace y con sesión "/" va a Proyectos.
 * vitest corre en Node sin DOM: los efectos no se ejecutan, así que se prueba la decisión pura de la
 * guardia y el primer pintado de cada página con react-dom/server (lo mismo que se ve antes de saber).
 */
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { es } from "../src/i18n/es";
import { followSessionRedirect, sessionGate } from "../src/lib/routes";
import { forgetExpiredSession, isTokenExpired, readSessionUserId, readTokenExpiry } from "../src/lib/session";

const router = vi.hoisted(() => ({
  pathname: "/",
  isReady: false,
  query: {},
  replace: () => Promise.resolve(true),
  push: () => Promise.resolve(true),
}));
vi.mock("next/router", () => ({ useRouter: () => router }));

const NOW_MS = 1_800_000_000_000;
const PROTECTED = ["/proyectos", "/red", "/proyecto/[id]"];

/** Token con la forma del backend (cabecera.carga.firma); la firma no se comprueba en el navegador. */
function token(payload: Record<string, unknown>): string {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "HS256", typ: "JWT" })}.${part(payload)}.firma`;
}

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    has: (key: string) => data.has(key),
  };
}

/** Primer pintado de una página (antes de que corran los efectos que leen la sesión). */
async function firstPaint(page: string, pathname: string): Promise<string> {
  router.pathname = pathname;
  const module = (await import(page)) as { default: ComponentType };
  return renderToStaticMarkup(createElement(module.default));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sin sesión", () => {
  it("no cuenta como sesión un token caducado ni la ausencia de token", () => {
    const expired = token({ sub: "5", exp: NOW_MS / 1000 - 1 });
    vi.stubGlobal("localStorage", memoryStorage({ auth_token: expired, auth_user_id: "5" }));
    expect(readSessionUserId(NOW_MS)).toBeNull();

    vi.stubGlobal("localStorage", memoryStorage({ auth_user_id: "5" }));
    expect(readSessionUserId(NOW_MS)).toBeNull();
  });

  it("caduca con la misma regla que el backend (exp <= ahora)", () => {
    expect(isTokenExpired(token({ exp: NOW_MS / 1000 }), NOW_MS)).toBe(true);
    expect(isTokenExpired(token({ exp: NOW_MS / 1000 + 1 }), NOW_MS)).toBe(false);
  });

  it("olvida la sesión guardada con un token caducado, como tras un 401", () => {
    const storage = memoryStorage({
      auth_token: token({ sub: "5", exp: NOW_MS / 1000 - 60 }),
      auth_user_id: "5",
      auth_user: "Ana",
      current_room_id: "12",
    });
    vi.stubGlobal("localStorage", storage);

    expect(forgetExpiredSession(NOW_MS)).toBe(true);
    for (const key of ["auth_token", "auth_user_id", "auth_user", "current_room_id"]) expect(storage.has(key)).toBe(false);
    expect(forgetExpiredSession(NOW_MS)).toBe(false);
  });

  it("mientras no se sabe si hay sesión, ninguna ruta redirige y todas muestran solo la carga", () => {
    for (const page of ["/", ...PROTECTED]) {
      expect(sessionGate(page, null, true)).toEqual({ redirect: null, view: "loading" });
      expect(sessionGate(page, false, false)).toEqual({ redirect: null, view: "loading" });
    }
  });

  it("las rutas protegidas van al login sin mostrar su contenido", () => {
    for (const page of PROTECTED) expect(sessionGate(page, false, true)).toEqual({ redirect: "/", view: "loading" });
  });

  it("redirige con replace, no con push", () => {
    const calls: string[] = [];
    const fake = {
      replace: (url: string) => calls.push(`replace ${url}`),
      push: (url: string) => calls.push(`push ${url}`),
    };
    followSessionRedirect(fake, "/");
    followSessionRedirect(fake, null);
    expect(calls).toEqual(["replace /"]);
  });

  it("el primer pintado de Proyectos, Red Social y un proyecto es solo la carga neutra", async () => {
    const pages: [string, string][] = [
      ["../src/pages/proyectos", "/proyectos"],
      ["../src/pages/red", "/red"],
      ["../src/pages/proyecto/[id]", "/proyecto/[id]"],
    ];
    for (const [page, pathname] of pages) {
      const html = await firstPaint(page, pathname);
      expect(html).toContain('class="session-loading"');
      expect(html).toContain(es.session.checking);
      expect(html).not.toContain("app-shell");
      expect(html).not.toContain(es.shell.projects);
      expect(html).not.toContain(es.shell.social);
    }
  });
});

describe("con sesión", () => {
  it("cuenta como sesión un token sin caducar con su cuenta", () => {
    const storage = memoryStorage({ auth_token: token({ sub: "5", exp: NOW_MS / 1000 + 3600 }), auth_user_id: "5" });
    vi.stubGlobal("localStorage", storage);
    expect(readSessionUserId(NOW_MS)).toBe("5");
    expect(forgetExpiredSession(NOW_MS)).toBe(false);
    expect(storage.has("auth_token")).toBe(true);
  });

  it("sin un exp legible decide el backend (no se cierra la sesión en el navegador)", () => {
    expect(readTokenExpiry("t")).toBeNull();
    expect(readTokenExpiry("a.no-es-json.c")).toBeNull();
    expect(readTokenExpiry(token({ exp: "mañana" }))).toBeNull();
    vi.stubGlobal("localStorage", memoryStorage({ auth_token: "t", auth_user_id: "5" }));
    expect(readSessionUserId(NOW_MS)).toBe("5");
  });

  it('"/" lleva a Proyectos sin pintar el login', () => {
    expect(sessionGate("/", true, true)).toEqual({ redirect: "/proyectos", view: "loading" });
  });

  it("las rutas protegidas se muestran sin redirigir", () => {
    for (const page of PROTECTED) expect(sessionGate(page, true, true)).toEqual({ redirect: null, view: "page" });
  });

  it('el primer pintado de "/" es la carga neutra, no el formulario del login', async () => {
    const html = await firstPaint("../src/pages/index", "/");
    expect(html).toContain(es.session.checking);
    expect(html).not.toContain("<form");
    expect(html).not.toContain('type="password"');
  });

  it("sin sesión, el login sí se muestra en /", () => {
    expect(sessionGate("/", false, true)).toEqual({ redirect: null, view: "page" });
  });
});

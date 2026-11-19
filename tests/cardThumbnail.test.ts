/**
 * Miniatura 3D en la tarjeta de Proyectos (paso 2c): visibilidad, sala para la miniatura, la tarjeta
 * con imagen o con el plano 2D de respaldo, limpieza al cerrar sesión y three.js fuera de la carga
 * inicial. vitest no tiene DOM ni WebGL: la tarjeta se pinta con react-dom/server y la imagen se mete
 * en la caché a mano (como si ya se hubiera pintado).
 */
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProjectCard } from "../src/components/ProjectCard";
import { forgetAccountData } from "../src/hooks/useSessionGuard";
import { es } from "../src/i18n/es";
import type { RoomDetail, RoomSummary } from "../src/lib/api";
import { rectangleVertices } from "../src/lib/projects";
import { roomDetailLoader } from "../src/lib/roomDetails";
import { roomThumbnailCache, roomThumbnailKey, thumbnailRoomOf } from "../src/lib/roomThumbnails";
import { observeVisibility, VISIBILITY_MARGIN } from "../src/lib/visibility";

const summary = {
  id: 31,
  nombre: "Estudio",
  ancho: 4,
  alto: 2.5,
  profundidad: 3,
  muebles: [
    { id: 1, nombre: "Cama", ancho: 2, alto: 0.5, profundidad: 1.5, posicion_x: 1, posicion_y: 0, posicion_z: 0.75 },
  ],
  group_id: null,
  description: null,
} satisfies RoomSummary;

const detail: RoomDetail = { id: 31, name: "Estudio", vertices: rectangleVertices(4, 3), heightM: 2.5, areaM2: 12 };

/** Carga la forma real de la sala en la caché de planos (GET /rooms/{id} con fetch falso). */
async function loadDetail() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(detail), { status: 200, headers: { "Content-Type": "application/json" } }))
  );
  await roomDetailLoader.load(summary.id);
}

/** Mete en la caché la miniatura de la sala, como si ya se hubiera pintado; devuelve su URL. */
function cacheImage(): Promise<string> {
  const key = roomThumbnailKey(summary.id, thumbnailRoomOf(detail, summary)!);
  return roomThumbnailCache.request(key, summary.id, async () => new Blob(["png"], { type: "image/png" }));
}

const card = () =>
  renderToStaticMarkup(createElement(ProjectCard, { room: summary, index: 0, groups: [], onMove: async () => undefined }));

afterEach(() => {
  vi.unstubAllGlobals();
  roomDetailLoader.clear();
  roomThumbnailCache.clear();
});

describe("observeVisibility", () => {
  it("avisa al entrar y salir de pantalla, con margen, y deja de observar al terminar", () => {
    let callback: IntersectionObserverCallback = () => undefined;
    const log: string[] = [];
    class FakeObserver {
      constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        callback = cb;
        log.push(`margen ${options?.rootMargin}`);
      }
      observe() {
        log.push("observe");
      }
      disconnect() {
        log.push("disconnect");
      }
    }
    const seen: boolean[] = [];
    const stop = observeVisibility({} as Element, (visible) => seen.push(visible), FakeObserver);
    const fire = (isIntersecting: boolean) =>
      callback([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);

    fire(true);
    fire(false);
    stop();
    expect(seen).toEqual([true, false]);
    expect(log).toEqual([`margen ${VISIBILITY_MARGIN}`, "observe", "disconnect"]);
  });

  it("sin IntersectionObserver da la tarjeta por visible", () => {
    const seen: boolean[] = [];
    observeVisibility({} as Element, (visible) => seen.push(visible), undefined);
    expect(seen).toEqual([true]);
  });
});

describe("thumbnailRoomOf", () => {
  it("solo hay sala para el 3D con la forma real; los objetos salen de la lista", () => {
    expect(thumbnailRoomOf(null, summary)).toBeNull();
    expect(thumbnailRoomOf({ ...detail, vertices: rectangleVertices(4, 3).slice(0, 2) }, summary)).toBeNull();

    const room = thumbnailRoomOf(detail, summary)!;
    expect(room.vertices).toBe(detail.vertices);
    expect(room.heightM).toBe(2.5);
    expect(room.items.map((item) => [item.name, item.x, item.y])).toEqual([["Cama", 0, 0]]);
  });
});

describe("ProjectCard con miniatura 3D", () => {
  it("sin la forma real se queda el rectángulo provisional, aunque haya imágenes guardadas", async () => {
    await cacheImage();
    const html = card();
    expect(html).toContain("room-plan-provisional");
    expect(html).not.toContain("<img");
  });

  it("con la forma real pero sin imagen todavía, muestra el plano 2D con sus objetos", async () => {
    await loadDetail();
    const html = card();
    expect(html).toContain("room-plan-object");
    expect(html).not.toContain("<img");
  });

  it("con la imagen pintada, la muestra en lugar del 2D con el mismo texto accesible", async () => {
    await loadDetail();
    const url = await cacheImage();
    const html = card();

    expect(html).toContain(`<img class="project-card-render" src="${url}" alt="Estudio. ${es.projects.planObjects(1)}"`);
    expect(html).toContain('width="480" height="360"');
    expect(html).not.toContain('class="room-plan');
  });

  it("si la sala cambia (otra clave), vuelve al 2D hasta tener la imagen nueva", async () => {
    await loadDetail();
    await cacheImage();
    const moved = { ...summary, muebles: [{ ...summary.muebles[0]!, posicion_x: 2 }] };
    const html = renderToStaticMarkup(createElement(ProjectCard, { room: moved, index: 0, groups: [], onMove: async () => undefined }));
    expect(html).not.toContain("<img");
    expect(html).toContain("room-plan-object");
  });
});

describe("limpieza", () => {
  it("al cerrar sesión se olvidan las salas y las miniaturas", async () => {
    await loadDetail();
    await cacheImage();
    expect(roomThumbnailCache.size).toBe(1);

    forgetAccountData();
    expect(roomThumbnailCache.size).toBe(0);
    expect(roomDetailLoader.peek(summary.id)).toBeUndefined();
  });

  it("la tarjeta no descarga three.js al cargar: la escena se importa al pedir la primera miniatura", () => {
    const sources = ["src/components/ProjectCard.tsx", "src/hooks/useRoomThumbnail.ts", "src/lib/roomThumbnails.ts", "src/render/thumbnailSize.ts"];
    for (const file of sources) {
      const code = readFileSync(file, "utf8");
      expect(code).not.toMatch(/from "three"/);
      expect(code).not.toMatch(/from "[^"]*render\/(thumbnailScene|thumbnailRenderer)"/);
    }
    expect(readFileSync("src/hooks/useRoomThumbnail.ts", "utf8")).toContain('import("../render/thumbnailScene")');
  });
});

/**
 * Objetos en el plano 2D de la tarjeta de Proyectos: adaptador de los muebles de GET /spaces, encaje
 * sobre el plano (mismo marco que el polígono), miniatura y tarjeta (solo con la forma real).
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProjectCard } from "../src/components/ProjectCard";
import { RoomPlanThumbnail } from "../src/components/RoomPlanThumbnail";
import { es } from "../src/i18n/es";
import { summaryFootprints, type RoomDetail, type RoomSummary, type SpaceFurniture } from "../src/lib/api";
import { fitFootprintsToPlan, fitPlanToBox, MIN_FOOTPRINT_SVG, rectangleVertices } from "../src/lib/projects";
import { roomDetailLoader } from "../src/lib/roomDetails";

// Lienzo de RoomPlanThumbnail.
const VIEW_W = 240;
const VIEW_H = 180;
const PADDING = 34;

function piece(overrides: Partial<SpaceFurniture> = {}): SpaceFurniture {
  return {
    id: 1,
    nombre: "Cama",
    ancho: 2,
    alto: 0.5,
    profundidad: 1.5,
    posicion_x: 1,
    posicion_y: 0,
    posicion_z: 0.75,
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  roomDetailLoader.clear();
});

describe("summaryFootprints", () => {
  it("pasa del centro a la esquina mínima; posicion_z es el eje y y posicion_y la base", () => {
    expect(summaryFootprints({ muebles: [piece({ posicion_y: 1.4 })] })).toEqual([
      { x: 0, y: 0, widthM: 2, depthM: 1.5, elevationM: 1.4 },
    ]);
  });

  it("descarta medidas o posiciones no válidas y tolera la lista ausente", () => {
    const bad = [
      piece({ ancho: 0 }),
      piece({ profundidad: -1 }),
      piece({ posicion_x: Number.NaN }),
      piece({ posicion_z: Number.POSITIVE_INFINITY }),
      { ...piece(), posicion_y: undefined } as unknown as SpaceFurniture,
    ];
    expect(summaryFootprints({ muebles: bad })).toEqual([]);
    expect(summaryFootprints({})).toEqual([]);
    expect(summaryFootprints({ muebles: null })).toEqual([]);
  });
});

describe("fitFootprintsToPlan", () => {
  it("usa la misma escala y el mismo origen que el polígono", () => {
    const vertices = rectangleVertices(4, 3);
    const fitted = fitPlanToBox(vertices, VIEW_W, VIEW_H, PADDING);
    const [rect] = fitFootprintsToPlan([{ x: 0, y: 0, widthM: 1, depthM: 1, elevationM: 0 }], vertices, fitted);

    expect(rect).toEqual({ x: fitted.box.x, y: fitted.box.y, width: 37.33, height: 37.33, raised: false });
    const [opposite] = fitFootprintsToPlan([{ x: 3, y: 2, widthM: 1, depthM: 1, elevationM: 0 }], vertices, fitted);
    expect(opposite!.x + opposite!.width).toBeCloseTo(fitted.box.x + fitted.box.width, 1);
    expect(opposite!.y + opposite!.height).toBeCloseTo(fitted.box.y + fitted.box.height, 1);
  });

  it("respeta salas que no empiezan en el origen", () => {
    const vertices = rectangleVertices(4, 3).map(({ x, y }) => ({ x: x + 2, y: y + 1 }));
    const fitted = fitPlanToBox(vertices, VIEW_W, VIEW_H, PADDING);
    const [rect] = fitFootprintsToPlan([{ x: 2, y: 1, widthM: 1, depthM: 1, elevationM: 0 }], vertices, fitted);

    expect(rect!.x).toBe(fitted.box.x);
    expect(rect!.y).toBe(fitted.box.y);
  });

  it("agranda alrededor de su centro un objeto demasiado fino para verse", () => {
    const vertices = rectangleVertices(4, 3);
    const fitted = fitPlanToBox(vertices, VIEW_W, VIEW_H, PADDING);
    // Ventana de 1 m x 2 cm pegada a la pared del fondo.
    const [rect] = fitFootprintsToPlan([{ x: 1, y: 0, widthM: 1, depthM: 0.02, elevationM: 1 }], vertices, fitted);

    expect(rect!.height).toBe(MIN_FOOTPRINT_SVG);
    expect(rect!.y + rect!.height / 2).toBeCloseTo(fitted.box.y + 0.01 * fitted.scale, 1);
    expect(rect!.raised).toBe(true);
  });

  it("dibuja los levantados después de los de suelo (quedan encima)", () => {
    const vertices = rectangleVertices(4, 3);
    const fitted = fitPlanToBox(vertices, VIEW_W, VIEW_H, PADDING);
    const rects = fitFootprintsToPlan(
      [
        { x: 0, y: 0, widthM: 0.4, depthM: 0.3, elevationM: 0.5 },
        { x: 0, y: 0, widthM: 2, depthM: 1.5, elevationM: 0 },
        { x: 1, y: 1, widthM: 1, depthM: 1, elevationM: 0.004 },
      ],
      vertices,
      fitted
    );
    expect(rects.map((r) => r.raised)).toEqual([false, false, true]);
  });

  it("sin forma no dibuja nada", () => {
    const fitted = fitPlanToBox([], VIEW_W, VIEW_H, PADDING);
    expect(fitFootprintsToPlan([{ x: 0, y: 0, widthM: 1, depthM: 1, elevationM: 0 }], [], fitted)).toEqual([]);
  });
});

describe("RoomPlanThumbnail con objetos", () => {
  it("dibuja un rectángulo por objeto, los levantados con su clase, sin texto para lectores", () => {
    const html = renderToStaticMarkup(
      createElement(RoomPlanThumbnail, {
        vertices: rectangleVertices(4, 3),
        label: "Estudio",
        footprints: [
          { x: 0, y: 0, widthM: 2, depthM: 1.5, elevationM: 0 },
          { x: 3, y: 0, widthM: 1, depthM: 0.3, elevationM: 1.2 },
        ],
      })
    );
    expect(html).toContain('class="room-plan-objects" aria-hidden="true"');
    expect(html.match(/class="room-plan-object"/g)).toHaveLength(1);
    expect(html.match(/class="room-plan-object room-plan-object-raised"/g)).toHaveLength(1);
  });

  it("sin objetos queda como antes", () => {
    const html = renderToStaticMarkup(createElement(RoomPlanThumbnail, { vertices: rectangleVertices(4, 3), label: "Estudio" }));
    expect(html).not.toContain("room-plan-object");
  });
});

describe("ProjectCard con objetos", () => {
  const room = {
    id: 21,
    nombre: "Estudio",
    ancho: 4,
    alto: 2.5,
    profundidad: 3,
    muebles: [piece(), piece({ id: 2, nombre: "Cuadro", ancho: 0.8, profundidad: 0.05, posicion_x: 2, posicion_y: 1.4, posicion_z: 0.025 })],
    group_id: null,
    description: null,
  } satisfies RoomSummary;

  function card(): string {
    return renderToStaticMarkup(createElement(ProjectCard, { room, index: 0, groups: [], onMove: async () => undefined }));
  }

  it("con el rectángulo provisional no dibuja los objetos (su marco puede ser otro)", () => {
    const html = card();
    expect(html).toContain("room-plan-provisional");
    expect(html).not.toContain("room-plan-object");
  });

  it("con la forma real dibuja los objetos de la lista y los cuenta en el texto del plano", async () => {
    const detail: RoomDetail = { id: 21, name: "Estudio", vertices: rectangleVertices(4, 3), heightM: 2.5, areaM2: 12 };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(detail), { status: 200, headers: { "Content-Type": "application/json" } }))
    );
    await roomDetailLoader.load(21);

    const html = card();
    expect(html).not.toContain("room-plan-provisional");
    expect(html.match(/class="room-plan-object"/g)).toHaveLength(1);
    expect(html.match(/room-plan-object-raised/g)).toHaveLength(1);
    expect(html).toContain(`aria-label="Estudio. ${es.projects.planObjects(2)}"`);
  });
});

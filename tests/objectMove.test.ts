/** FASE 3: vista previa de mover objetos a mano y cuerpo del PATCH /rooms/{id}/items/{itemId}. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { es } from "../src/i18n/es";
import { ApiError, type Point2D, type RoomItem } from "../src/lib/api";
import {
  arrowLabel,
  attachedWall,
  containsPoint,
  dragTarget,
  elevationRange,
  MIN_WALL_ELEVATION_M,
  moveBody,
  moveErrorMessage,
  moveHint,
  moveModeOf,
  moveResultMessage,
  nudge,
  planeTarget,
  roomRectangle,
  samePlace,
  wallTarget,
  withElevation,
  withPreview,
} from "../src/lib/objectMove";

const RECT: Point2D[] = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 3 },
  { x: 0, y: 3 },
];
// Sala en L: falta la esquina x > 2, y > 2.
const L_ROOM: Point2D[] = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 2 },
  { x: 2, y: 2 },
  { x: 2, y: 4 },
  { x: 0, y: 4 },
];

function item(changes: Partial<RoomItem> = {}): RoomItem {
  return { id: 1, name: "Mesa", x: 1, y: 1, rotation: 0, widthM: 1.2, depthM: 0.8, heightM: 0.75, elevationM: 0, ...changes };
}

// Cuadro de 60 cm pegado a la pared izquierda (5 cm de grosor en x, 60 cm a lo largo de z).
const PICTURE = item({ id: 2, name: "Cuadro", x: 0, y: 1, widthM: 0.05, depthM: 0.6, heightM: 0.4, elevationM: 1.5 });

describe("roomRectangle y attachedWall (como rectangle_of y attached_wall del backend)", () => {
  it("reconoce un rectángulo, también con un vértice colineal, y no una L", () => {
    expect(roomRectangle(RECT)).toEqual({ minX: 0, minZ: 0, maxX: 4, maxZ: 3 });
    expect(roomRectangle([...RECT.slice(0, 1), { x: 2, y: 0 }, ...RECT.slice(1)])).toEqual(roomRectangle(RECT));
    expect(roomRectangle(L_ROOM)).toBeNull();
    expect(roomRectangle([])).toBeNull();
  });

  it("pegado a 1 cm o menos; en una esquina gana la pared del fondo", () => {
    const rect = roomRectangle(RECT)!;
    expect(attachedWall(PICTURE, rect)).toBe("left");
    expect(attachedWall(item({ x: 2, y: 3 - 0.8 + 0.005 }), rect)).toBe("front");
    expect(attachedWall(item({ x: 4 - 1.2, y: 1 }), rect)).toBe("right");
    expect(attachedWall(item({ x: 0, y: 0 }), rect)).toBe("back");
    expect(attachedWall(item({ x: 0.02, y: 1 }), rect)).toBeNull();
  });
});

describe("moveModeOf", () => {
  it("suelo con la base a 0; pared si está levantado y pegado en una sala rectangular", () => {
    expect(moveModeOf(item(), RECT)).toEqual({ kind: "floor" });
    expect(moveModeOf(PICTURE, RECT)).toEqual({ kind: "wall", wall: "left" });
  });

  it("levantado sin pared, o en una sala no rectangular: raised (decide el servidor)", () => {
    expect(moveModeOf(item({ elevationM: 0.5 }), RECT)).toEqual({ kind: "raised" });
    expect(moveModeOf(PICTURE, L_ROOM)).toEqual({ kind: "raised" });
  });
});

describe("arrastrar por el suelo, limitado a la sala", () => {
  it("sigue al puntero dentro de la sala", () => {
    expect(planeTarget(item(), { x: 2, y: 1.5 }, RECT, item())).toMatchObject({ x: 2, y: 1.5 });
  });

  it("no sale de la caja de la sala por ningún lado", () => {
    const table = item();
    expect(planeTarget(table, { x: -3, y: -3 }, RECT, table)).toMatchObject({ x: 0, y: 0 });
    expect(planeTarget(table, { x: 9, y: 9 }, RECT, table)).toMatchObject({ x: 4 - 1.2, y: 3 - 0.8 });
  });

  it("en una sala en L, si el centro cae en el hueco se queda donde estaba", () => {
    const table = item({ x: 0.2, y: 0.2, widthM: 0.5, depthM: 0.5 });
    const previous = { ...table, x: 1, y: 1 };
    expect(planeTarget(table, { x: 3, y: 3 }, L_ROOM, previous)).toBe(previous);
    expect(planeTarget(table, { x: 3, y: 0.5 }, L_ROOM, previous)).toMatchObject({ x: 3, y: 0.5 });
  });

  it("containsPoint respeta la forma real", () => {
    expect(containsPoint(L_ROOM, 1, 3)).toBe(true);
    expect(containsPoint(L_ROOM, 3, 3)).toBe(false);
  });
});

describe("deslizar un objeto de pared a lo largo de su pared", () => {
  const rect = roomRectangle(RECT)!;

  it("solo cuenta la coordenada a lo largo de la pared; queda pegado a 0 cm", () => {
    expect(wallTarget(PICTURE, "left", { x: 1.7, y: 2 }, rect)).toMatchObject({ x: 0, y: 2 });
    const shelf = item({ widthM: 0.8, depthM: 0.2, elevationM: 1.2 });
    expect(wallTarget(shelf, "back", { x: 1, y: 2 }, rect)).toMatchObject({ x: 1, y: 0 });
    expect(wallTarget(shelf, "front", { x: 1, y: 0 }, rect)).toMatchObject({ x: 1, y: 3 - 0.2 });
    expect(wallTarget(PICTURE, "right", { x: 0, y: 1 }, rect)).toMatchObject({ x: 4 - 0.05, y: 1 });
  });

  it("entero dentro del tramo de la pared", () => {
    expect(wallTarget(PICTURE, "left", { x: 0, y: -5 }, rect)).toMatchObject({ y: 0 });
    expect(wallTarget(PICTURE, "left", { x: 0, y: 5 }, rect)).toMatchObject({ y: 3 - 0.6 });
  });

  it("dragTarget usa la pared en modo wall y el plano en los demás", () => {
    expect(dragTarget({ kind: "wall", wall: "left" }, PICTURE, { x: 2, y: 2 }, RECT, PICTURE)).toMatchObject({ x: 0, y: 2 });
    expect(dragTarget({ kind: "raised" }, PICTURE, { x: 2, y: 2 }, RECT, PICTURE)).toMatchObject({ x: 2, y: 2 });
  });

  it("no cambia la altura ni las medidas", () => {
    const moved = wallTarget(PICTURE, "left", { x: 0, y: 2 }, rect);
    expect([moved.elevationM, moved.widthM, moved.depthM, moved.heightM]).toEqual([1.5, 0.05, 0.6, 0.4]);
  });
});

describe("control de altura", () => {
  it("entre 5 cm y el techo menos el alto del objeto", () => {
    expect(elevationRange(PICTURE, 2.5)).toEqual({ min: MIN_WALL_ELEVATION_M, max: 2.1 });
    expect(withElevation(PICTURE, 0, 2.5).elevationM).toBe(MIN_WALL_ELEVATION_M);
    expect(withElevation(PICTURE, 9, 2.5).elevationM).toBeCloseTo(2.1);
    expect(withElevation(PICTURE, 1.2, 2.5).elevationM).toBe(1.2);
  });
});

describe("flechas de respaldo", () => {
  it("en el suelo: 10 cm por toque, arriba = hacia el fondo, sin salir de la sala", () => {
    const table = item();
    expect(nudge(table, { kind: "floor" }, "up", RECT, 2.5)).toMatchObject({ x: 1, y: 0.9 });
    expect(nudge(table, { kind: "floor" }, "down", RECT, 2.5)).toMatchObject({ x: 1, y: 1.1 });
    expect(nudge(table, { kind: "floor" }, "left", RECT, 2.5)).toMatchObject({ x: 0.9, y: 1 });
    expect(nudge(table, { kind: "floor" }, "right", RECT, 2.5)).toMatchObject({ x: 1.1, y: 1 });
    expect(nudge(item({ x: 0 }), { kind: "floor" }, "left", RECT, 2.5)).toMatchObject({ x: 0 });
  });

  it("en una pared: ← y → la recorren; ↑ y ↓ cambian la altura 5 cm", () => {
    const mode = { kind: "wall", wall: "left" } as const;
    expect(nudge(PICTURE, mode, "right", RECT, 2.5)).toMatchObject({ x: 0, y: 1.1, elevationM: 1.5 });
    expect(nudge(PICTURE, mode, "left", RECT, 2.5)).toMatchObject({ x: 0, y: 0.9 });
    expect(nudge(PICTURE, mode, "up", RECT, 2.5).elevationM).toBeCloseTo(1.55);
    expect(nudge(PICTURE, mode, "down", RECT, 2.5)).toMatchObject({ x: 0, y: 1 });
    expect(nudge(PICTURE, mode, "down", RECT, 2.5).elevationM).toBeCloseTo(1.45);
  });

  it("cada flecha tiene su texto según el modo y la pared", () => {
    const t = es.objectMove.arrows;
    expect(arrowLabel({ kind: "floor" }, "up")).toBe(t.plane.up);
    expect(arrowLabel({ kind: "wall", wall: "back" }, "left")).toBe(t.plane.left);
    expect(arrowLabel({ kind: "wall", wall: "left" }, "right")).toBe(t.plane.down);
    expect(arrowLabel({ kind: "wall", wall: "left" }, "up")).toBe(t.raise);
    expect(arrowLabel({ kind: "wall", wall: "front" }, "down")).toBe(t.lower);
  });
});

describe("cuerpo del PATCH", () => {
  it("suelo: solo x/y (redondeados a 0,1 mm)", () => {
    expect(moveBody({ kind: "floor" }, item({ x: 1.000004, y: 2.00006 }))).toEqual({ position: { x: 1, y: 2.0001 } });
  });

  it("pared: x/y, altura y la pared; levantado sin pared: x/y y altura", () => {
    expect(moveBody({ kind: "wall", wall: "left" }, PICTURE)).toEqual({
      position: { x: 0, y: 1, elevationM: 1.5, wall: "left" },
    });
    expect(moveBody({ kind: "raised" }, PICTURE)).toEqual({ position: { x: 0, y: 1, elevationM: 1.5 } });
  });

  it("samePlace evita mandar un PATCH sin cambios", () => {
    expect(samePlace(item(), item({ x: 1.00001 }))).toBe(true);
    expect(samePlace(item(), item({ x: 1.1 }))).toBe(false);
    expect(samePlace(PICTURE, { ...PICTURE, elevationM: 1.55 })).toBe(false);
  });

  it("withPreview cambia solo el objeto movido", () => {
    const moved = { ...PICTURE, y: 2 };
    expect(withPreview([item(), PICTURE], moved)).toEqual([item(), moved]);
    const items = [item()];
    expect(withPreview(items, null)).toBe(items);
  });
});

describe("mensajes", () => {
  it("indicación del panel según el modo", () => {
    expect(moveHint({ kind: "floor" })).toBe(es.objectMove.hintFloor);
    expect(moveHint({ kind: "raised" })).toBe(es.objectMove.hintRaised);
    expect(moveHint({ kind: "wall", wall: "back" })).toContain("del fondo");
  });

  it("dice si el servidor ajustó la posición", () => {
    expect(moveResultMessage({ item: item(), wall: null, adjusted: true })).toBe(es.objectMove.adjusted);
    expect(moveResultMessage({ item: item(), wall: null, adjusted: false })).toBe(es.objectMove.saved);
  });

  it("los errores muestran el texto del servidor (409 no cabe) o uno genérico", () => {
    const conflict = new ApiError(409, "«Mesa» no cabe en esa posición sin salirse de la sala ni chocar con otro objeto.");
    expect(moveErrorMessage(conflict)).toBe(es.objectMove.failed(conflict.message));
    expect(moveErrorMessage("x")).toBe(es.objectMove.failedUnknown);
  });
});

/** Respuesta falsa de fetch con este estado y cuerpo JSON. */
function answer(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  });
}

describe("api.updateRoomItem", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("manda PATCH /rooms/{id}/items/{itemId} con la posición y devuelve la final", async () => {
    const result = { item: item(), wall: null, adjusted: true };
    vi.stubGlobal("fetch", answer(200, result));
    const { api } = await import("../src/lib/api");

    const reply = await api.updateRoomItem(3, 9, { position: { x: 1, y: 2 } });

    const [url, init] = vi.mocked(fetch).mock.calls.at(-1)!;
    expect(url).toBe("http://localhost:8000/api/v1/spaces/rooms/3/items/9");
    expect(init!.method).toBe("PATCH");
    expect(JSON.parse(init!.body as string)).toEqual({ position: { x: 1, y: 2 } });
    expect(reply).toEqual(result);
  });
});

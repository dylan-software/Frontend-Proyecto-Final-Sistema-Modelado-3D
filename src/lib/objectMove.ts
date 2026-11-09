/**
 * Mover objetos a mano en el 3D (PLAN-COMPLETO.md, FASE 3): funciones puras, sin three.js, para
 * arrastrar, mover con flechas y cambiar la altura. Solo calculan la VISTA PREVIA y el cuerpo del PATCH
 * /rooms/{id}/items/{itemId} (FASE 0); el servidor revalida y su respuesta es la posición final.
 *
 * Coordenadas como RoomItem: x/y = esquina MÍNIMA de la huella en metros; la y del plano es la z del 3D.
 * Paredes como el backend: back = z mínima, front = z máxima, left = x mínima, right = x máxima.
 */
import { es } from "../i18n/es";
import type { PlacedItemResult, Point2D, RoomItem, WallSide } from "./api";

/** Como ATTACH_TOLERANCE_M del backend: a 1 cm o menos de una pared, el objeto está pegado a ella. */
export const ATTACH_TOLERANCE_M = 0.01;
/** Como RECTANGLE_AREA_TOLERANCE del backend (relativa al área). */
export const RECTANGLE_AREA_TOLERANCE = 1e-6;
/** Base por encima de esta altura = objeto levantado (de pared o apoyado sobre otro). */
export const FLOOR_EPSILON_M = 1e-6;
/** Paso de las flechas en el plano y de las flechas de altura. */
export const ARROW_STEP_M = 0.1;
export const HEIGHT_STEP_M = 0.05;
/** Altura mínima de un objeto de pared: a 0 cm sería un objeto de suelo. */
export const MIN_WALL_ELEVATION_M = 0.05;
/** El orden de WALL_SIDES del backend: en una esquina gana la primera. */
export const WALL_ORDER: readonly WallSide[] = ["back", "left", "right", "front"];

/** Caja de una sala rectangular alineada con los ejes. */
export interface RoomRect {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

/**
 * Cómo se mueve un objeto:
 * - floor: en el suelo, en los dos ejes, sin salir de la sala.
 * - wall: pegado a su pared (sala rectangular), solo a lo largo de ella; la altura se cambia aparte.
 * - raised: levantado pero sin pared (apoyado encima de otro o en una sala no rectangular): se mueve
 *   en el plano a su altura y el servidor decide dónde queda.
 */
export type MoveMode = { kind: "floor" } | { kind: "wall"; wall: WallSide } | { kind: "raised" };

/** Dirección de una flecha: en el plano para floor/raised; a lo largo de la pared y altura para wall. */
export type ArrowDirection = "up" | "down" | "left" | "right";

const ARROW_KEYS: Readonly<Record<string, ArrowDirection>> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

/**
 * Flecha de la cruceta que corresponde a una tecla (FASE 8: mover con el teclado), o null si la tecla
 * no es una flecha. Solo lee una tabla fija: O(1).
 */
export function arrowKeyDirection(key: string): ArrowDirection | null {
  return Object.hasOwn(ARROW_KEYS, key) ? ARROW_KEYS[key] : null;
}

/** Cuerpo del PATCH: solo `position` (las medidas y el nombre no cambian). */
export interface ItemMoveBody {
  position: { x: number; y: number; elevationM?: number; wall?: WallSide };
}

function signedArea(vertices: Point2D[]): number {
  let sum = 0;
  vertices.forEach((a, i) => {
    const b = vertices[(i + 1) % vertices.length]!;
    sum += a.x * b.y - b.x * a.y;
  });
  return sum / 2;
}

/** La caja de la sala si su polígono es un rectángulo alineado con los ejes (como rectangle_of), o null. */
export function roomRectangle(vertices: Point2D[]): RoomRect | null {
  if (vertices.length < 3) return null;
  const xs = vertices.map((v) => v.x);
  const zs = vertices.map((v) => v.y);
  const rect = { minX: Math.min(...xs), minZ: Math.min(...zs), maxX: Math.max(...xs), maxZ: Math.max(...zs) };
  const boxArea = (rect.maxX - rect.minX) * (rect.maxZ - rect.minZ);
  if (Math.abs(Math.abs(signedArea(vertices)) - boxArea) > RECTANGLE_AREA_TOLERANCE * Math.max(1, boxArea)) {
    return null;
  }
  return rect;
}

/** Pared a la que está pegado el objeto (a 1 cm o menos), o null. Como attached_wall del backend. */
export function attachedWall(item: RoomItem, rect: RoomRect): WallSide | null {
  const gaps: Record<WallSide, number> = {
    back: item.y - rect.minZ,
    left: item.x - rect.minX,
    right: rect.maxX - (item.x + item.widthM),
    front: rect.maxZ - (item.y + item.depthM),
  };
  return WALL_ORDER.find((side) => Math.abs(gaps[side]) <= ATTACH_TOLERANCE_M) ?? null;
}

/** El modo de mover un objeto según su altura y la forma de la sala. */
export function moveModeOf(item: RoomItem, vertices: Point2D[]): MoveMode {
  if (!(item.elevationM > FLOOR_EPSILON_M)) return { kind: "floor" };
  const rect = roomRectangle(vertices);
  const wall = rect ? attachedWall(item, rect) : null;
  return wall ? { kind: "wall", wall } : { kind: "raised" };
}

/** Si la pared va a lo largo del eje x (fondo y delante) o del eje z (izquierda y derecha). */
export function wallRunsAlongX(wall: WallSide): boolean {
  return wall === "back" || wall === "front";
}

function clamp(value: number, low: number, high: number): number {
  // Si el objeto es más grande que el hueco, se queda en el borde inferior (el servidor dirá 409).
  return high < low ? low : Math.min(Math.max(value, low), high);
}

/** Punto en polígono por lanzamiento de rayos (como Room.contains_point). */
export function containsPoint(vertices: Point2D[], x: number, z: number): boolean {
  let inside = false;
  vertices.forEach((vi, i) => {
    const vj = vertices[(i + vertices.length - 1) % vertices.length]!;
    if (vi.y > z !== vj.y > z && x < ((vj.x - vi.x) * (z - vi.y)) / (vj.y - vi.y) + vi.x) inside = !inside;
  });
  return inside;
}

function bounds(vertices: Point2D[]): RoomRect {
  const xs = vertices.map((v) => v.x);
  const zs = vertices.map((v) => v.y);
  return { minX: Math.min(...xs), minZ: Math.min(...zs), maxX: Math.max(...xs), maxZ: Math.max(...zs) };
}

/**
 * Vista previa de un objeto movido en el plano (floor y raised): la esquina pedida, acotada a la caja de
 * la sala. En una sala no rectangular, si el centro cae fuera del polígono, el objeto se queda donde
 * estaba (`previous`). El servidor comprueba después el polígono exacto y los choques.
 */
export function planeTarget(item: RoomItem, corner: Point2D, vertices: Point2D[], previous: RoomItem): RoomItem {
  const box = bounds(vertices);
  const x = clamp(corner.x, box.minX, box.maxX - item.widthM);
  const y = clamp(corner.y, box.minZ, box.maxZ - item.depthM);
  if (!containsPoint(vertices, x + item.widthM / 2, y + item.depthM / 2)) return previous;
  return { ...item, x, y };
}

/**
 * Vista previa de un objeto de pared deslizado a lo largo de su pared: pegado a ella (0 cm) y entero
 * dentro de su tramo. `corner` es la esquina pedida; solo cuenta su coordenada a lo largo de la pared.
 */
export function wallTarget(item: RoomItem, wall: WallSide, corner: Point2D, rect: RoomRect): RoomItem {
  switch (wall) {
    case "back":
      return { ...item, x: clamp(corner.x, rect.minX, rect.maxX - item.widthM), y: rect.minZ };
    case "front":
      return { ...item, x: clamp(corner.x, rect.minX, rect.maxX - item.widthM), y: rect.maxZ - item.depthM };
    case "left":
      return { ...item, x: rect.minX, y: clamp(corner.y, rect.minZ, rect.maxZ - item.depthM) };
    case "right":
      return { ...item, x: rect.maxX - item.widthM, y: clamp(corner.y, rect.minZ, rect.maxZ - item.depthM) };
  }
}

/** Vista previa al arrastrar: según el modo, en el plano o a lo largo de la pared. */
export function dragTarget(
  mode: MoveMode,
  item: RoomItem,
  corner: Point2D,
  vertices: Point2D[],
  previous: RoomItem
): RoomItem {
  if (mode.kind === "wall") {
    const rect = roomRectangle(vertices);
    if (rect) return wallTarget(item, mode.wall, corner, rect);
  }
  return planeTarget(item, corner, vertices, previous);
}

/** Alturas posibles de la base de un objeto levantado: entre 5 cm y el techo menos su alto. */
export function elevationRange(item: RoomItem, roomHeightM: number): { min: number; max: number } {
  const max = Math.max(MIN_WALL_ELEVATION_M, roomHeightM - item.heightM);
  return { min: MIN_WALL_ELEVATION_M, max };
}

/** El objeto con su base a `elevationM`, acotada a elevationRange. */
export function withElevation(item: RoomItem, elevationM: number, roomHeightM: number): RoomItem {
  const { min, max } = elevationRange(item, roomHeightM);
  return { ...item, elevationM: clamp(elevationM, min, max) };
}

/**
 * Un toque de flecha. floor/raised: arriba = hacia el fondo (z menor), abajo = hacia delante, izquierda
 * y derecha en x. wall: izquierda y derecha a lo largo de la pared; arriba y abajo cambian la altura.
 */
export function nudge(
  item: RoomItem,
  mode: MoveMode,
  direction: ArrowDirection,
  vertices: Point2D[],
  roomHeightM: number
): RoomItem {
  if (mode.kind === "wall") {
    if (direction === "up" || direction === "down") {
      const step = direction === "up" ? HEIGHT_STEP_M : -HEIGHT_STEP_M;
      return withElevation(item, item.elevationM + step, roomHeightM);
    }
    const step = direction === "right" ? ARROW_STEP_M : -ARROW_STEP_M;
    const corner = wallRunsAlongX(mode.wall) ? { x: item.x + step, y: item.y } : { x: item.x, y: item.y + step };
    return dragTarget(mode, item, corner, vertices, item);
  }
  const dx = direction === "left" ? -ARROW_STEP_M : direction === "right" ? ARROW_STEP_M : 0;
  const dz = direction === "up" ? -ARROW_STEP_M : direction === "down" ? ARROW_STEP_M : 0;
  return planeTarget(item, { x: item.x + dx, y: item.y + dz }, vertices, item);
}

/** Redondeo a 0,1 mm: quita el ruido de coma flotante del rayo sin mover nada visible. */
function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/**
 * Cuerpo del PATCH para dejar el objeto en `target`. floor: solo x/y. wall: x/y, altura y la pared
 * (el servidor lo pega a ella). raised: x/y y altura (el servidor decide si va a una pared o se apoya).
 */
export function moveBody(mode: MoveMode, target: RoomItem): ItemMoveBody {
  const position: ItemMoveBody["position"] = { x: round(target.x), y: round(target.y) };
  if (mode.kind !== "floor") position.elevationM = round(target.elevationM);
  if (mode.kind === "wall") position.wall = mode.wall;
  return { position };
}

/** Si dos versiones de un objeto están en el mismo sitio (para no mandar un PATCH sin cambios). */
export function samePlace(a: RoomItem, b: RoomItem): boolean {
  const near = (p: number, q: number) => Math.abs(p - q) < 1e-4;
  return near(a.x, b.x) && near(a.y, b.y) && near(a.elevationM, b.elevationM);
}

/** Texto (aria-label y title) de cada flecha según el modo. */
export function arrowLabel(mode: MoveMode, direction: ArrowDirection): string {
  const t = es.objectMove.arrows;
  if (mode.kind === "wall") {
    if (direction === "up") return t.raise;
    if (direction === "down") return t.lower;
    // En las paredes izquierda y derecha, recorrerla es ir hacia el fondo o hacia delante.
    if (!wallRunsAlongX(mode.wall)) return direction === "left" ? t.plane.up : t.plane.down;
  }
  return t.plane[direction];
}

/** Indicación del panel según el modo. */
export function moveHint(mode: MoveMode): string {
  const t = es.objectMove;
  if (mode.kind === "wall") return t.hintWall(t.walls[mode.wall]);
  return mode.kind === "raised" ? t.hintRaised : t.hintFloor;
}

/** Cuánto se ve "Posición guardada…" (o el aviso de hueco más cercano) antes de ocultarse solo. */
export const MOVE_STATUS_HIDE_MS = 4000;

/**
 * Milisegundos tras los que se oculta el mensaje del panel, o null si se queda: los avisos de un
 * movimiento correcto se van solos; un error se queda hasta el siguiente movimiento o selección.
 */
export function statusHideDelay(kind: "info" | "error"): number | null {
  return kind === "info" ? MOVE_STATUS_HIDE_MS : null;
}

/** Mensaje tras un PATCH correcto: si el servidor movió el objeto a otro sitio, se dice. */
export function moveResultMessage(result: PlacedItemResult): string {
  return result.adjusted ? es.objectMove.adjusted : es.objectMove.saved;
}

/** Mensaje de un PATCH fallido: ApiError ya trae el texto en español (409 "no cabe", red...). */
export function moveErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return es.objectMove.failed(error.message);
  return es.objectMove.failedUnknown;
}

/** La lista de objetos con la vista previa en lugar de su objeto (mismo id). */
export function withPreview(items: RoomItem[], preview: RoomItem | null): RoomItem[] {
  if (!preview) return items;
  return items.map((item) => (item.id === preview.id ? preview : item));
}

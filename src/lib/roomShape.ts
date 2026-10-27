/**
 * Client-side checks on a room before it is sent to the backend, with
 * the same limits the backend enforces (it still re-validates the shape
 * and answers 422 for a self-intersecting polygon). Meters throughout.
 */
import type { Point2D } from "./api";

export const MIN_ROOM_VERTICES = 3;
export const MAX_ROOM_VERTICES = 200;
export const MAX_ROOM_HEIGHT_M = 20;
export const MAX_ROOM_NAME_LENGTH = 120;

/** Middle of the edge from vertex `index` to the next one (wrapping around): where a new vertex is inserted. */
export function edgeMidpoint(vertices: Point2D[], index: number): Point2D {
  const a = vertices[index]!;
  const b = vertices[(index + 1) % vertices.length]!;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** A room keeps at least MIN_ROOM_VERTICES corners; the backend answers 422 otherwise. */
export function canDeleteVertex(vertexCount: number): boolean {
  return vertexCount > MIN_ROOM_VERTICES;
}

export type NewRoomCheck =
  | { ok: true; room: { name: string; vertices: Point2D[]; heightM: number } }
  | { ok: false; error: string };

/** Validates the scan form; returns the POST /api/v1/spaces/rooms body or a Spanish error. */
export function checkNewRoom(name: string, heightText: string, vertices: Point2D[]): NewRoomCheck {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Ponle un nombre a la sala." };
  if (trimmed.length > MAX_ROOM_NAME_LENGTH)
    return { ok: false, error: `El nombre admite como mucho ${MAX_ROOM_NAME_LENGTH} caracteres.` };
  const heightM = Number(heightText);
  if (!Number.isFinite(heightM) || heightM <= 0 || heightM > MAX_ROOM_HEIGHT_M)
    return { ok: false, error: `La altura debe ser mayor que 0 y como mucho ${MAX_ROOM_HEIGHT_M} m.` };
  if (vertices.length < MIN_ROOM_VERTICES)
    return { ok: false, error: `Marca al menos ${MIN_ROOM_VERTICES} esquinas.` };
  if (vertices.length > MAX_ROOM_VERTICES)
    return { ok: false, error: `Una sala admite como mucho ${MAX_ROOM_VERTICES} esquinas.` };
  return { ok: true, room: { name: trimmed, vertices: vertices.map(({ x, y }) => ({ x, y })), heightM } };
}

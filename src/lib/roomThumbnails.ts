/**
 * Miniaturas 3D de las tarjetas, la parte SIN three.js: qué se dibuja de cada sala, su clave en la
 * caché y la caché compartida de la app. Así la pantalla de Proyectos solo descarga three.js (con la
 * escena, render/thumbnailScene.ts) cuando una tarjeta se hace visible, y la sesión puede vaciar la
 * caché sin importarlo.
 */
import { summaryRoomItems, type Point2D, type RoomDetail, type RoomItem, type RoomSummary } from "./api";
import { toSceneBoxes } from "./roomBoxes";
import { createThumbnailCache, thumbnailKey } from "./thumbnailCache";

/** Sube este número si cambia el dibujo: las miniaturas guardadas dejan de valer. */
export const THUMBNAIL_STYLE_VERSION = 1;

/** Lo que se dibuja de una sala: su forma, su altura y sus objetos (esquina mínima, metros). */
export interface ThumbnailRoom {
  vertices: Point2D[];
  heightM: number;
  items: RoomItem[];
}

/**
 * Lo que cambia el aspecto de la miniatura (y nada más): forma, altura y cajas (tamaño, centro y si
 * están levantadas). Los nombres no se dibujan, así que renombrar un objeto no la invalida.
 */
export function thumbnailLook(room: ThumbnailRoom): unknown {
  return {
    version: THUMBNAIL_STYLE_VERSION,
    vertices: room.vertices.map(({ x, y }) => [x, y]),
    heightM: room.heightM,
    boxes: toSceneBoxes(room.items).map((box) => [box.size, box.center, box.raised]),
  };
}

/** Clave de la miniatura de la sala en la caché. */
export function roomThumbnailKey(roomId: number, room: ThumbnailRoom): string {
  return thumbnailKey(roomId, thumbnailLook(room));
}

/**
 * La sala de una tarjeta lista para la miniatura: la forma y la altura reales (GET /rooms/{id}) con los
 * objetos de la lista. null sin la forma real (mientras carga o si falló): entonces no hay 3D, como
 * tampoco hay objetos sobre el rectángulo provisional del 2D.
 */
export function thumbnailRoomOf(detail: RoomDetail | null, summary: Pick<RoomSummary, "muebles">): ThumbnailRoom | null {
  if (!detail || detail.vertices.length < 3) return null;
  return { vertices: detail.vertices, heightM: detail.heightM, items: summaryRoomItems(summary) };
}

/** Caché única de las miniaturas de la app: se olvida una sala al salir de ella y todo al cerrar sesión. */
export const roomThumbnailCache = createThumbnailCache();

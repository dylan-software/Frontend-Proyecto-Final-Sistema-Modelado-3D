/**
 * Caché compartida de las salas completas (GET /rooms/{id}) para las tarjetas de proyectos: como
 * mucho 4 peticiones a la vez y respuestas guardadas en memoria durante la sesión. Se vacía al
 * cerrar sesión.
 */
import { api, type RoomDetail } from "./api";
import { createRoomLoader } from "./roomLoader";

/** Máximo de peticiones GET /rooms/{id} simultáneas desde la pantalla de proyectos. */
export const ROOM_DETAIL_CONCURRENCY = 4;

export const roomDetailLoader = createRoomLoader<RoomDetail>((id) => api.getRoom(id), ROOM_DETAIL_CONCURRENCY);

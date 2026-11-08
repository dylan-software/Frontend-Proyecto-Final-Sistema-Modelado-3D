import { es } from "../i18n/es";
import { ApiError } from "./api";

/** Fotos que el backend deja deshacer por sala (LinkedStack de capacidad 5). */
export const MAX_PHOTO_UNDO_DEPTH = 5;

/** Lo que cambia el contador de fotos que se pueden deshacer en la visita actual a la página. */
export type PhotoUndoEvent =
  /** Se guardó una foto nueva. */
  | { type: "photo" }
  /** Se deshizo una foto; el backend dice cuántas quedan. */
  | { type: "undone"; remaining: number }
  /** El backend respondió 409: no queda nada (p. ej., se reinició y perdió la pila). */
  | { type: "nothing" }
  /** Se abrió otra sala o se recargó la página. */
  | { type: "reset" };

/**
 * Siguiente valor del contador de "Deshacer foto" (CONTRATO-DESHACER-FOTO.md, decisión 3).
 *
 * Tras una foto, min(d + 1, 5); tras deshacer, `remaining`; con un 409 o al cambiar de sala, 0. El
 * botón solo se muestra con el contador mayor que 0, así que tras recargar no aparece aunque el
 * servidor aún guarde la pila.
 */
export function nextUndoDepth(depth: number, event: PhotoUndoEvent): number {
  switch (event.type) {
    case "photo":
      return Math.min(depth + 1, MAX_PHOTO_UNDO_DEPTH);
    case "undone":
      return Math.min(Math.max(0, Math.floor(event.remaining)), MAX_PHOTO_UNDO_DEPTH) || 0;
    case "nothing":
    case "reset":
      return 0;
  }
}

/**
 * Mensaje en español para un fallo de "Deshacer foto": 404 el texto de la foto (la sala ya no es de
 * la cuenta), 409 el detail del backend o `es.photo.undo.nothing`; el resto, el mensaje general
 * (401, 429, 503, servidor inalcanzable…).
 */
export function photoUndoErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return es.photo.errors.notFound;
    if (error.status === 409) return error.detail ?? es.photo.undo.nothing;
  }
  return error instanceof Error ? error.message : String(error);
}

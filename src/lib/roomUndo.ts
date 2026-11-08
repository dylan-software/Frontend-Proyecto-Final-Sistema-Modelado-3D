import { es } from "../i18n/es";
import { ApiError, type UndoneChange } from "./api";

/** Cambios que el backend deja deshacer por sala (una sola LinkedStack de capacidad 50). */
export const MAX_UNDO_DEPTH = 50;

/** Lo que cambia el contador de "Deshacer" en la visita actual a la página (CONTRATO-FASE2.md). */
export type UndoEvent =
  /** Se guardó un cambio que se puede deshacer: una foto o un mensaje del chat con cambios. */
  | { type: "change" }
  /** Se deshizo un cambio; el backend dice cuántos quedan. */
  | { type: "undone"; remaining: number }
  /** El backend respondió 409: no queda nada (p. ej., se reinició y perdió la pila). */
  | { type: "nothing" }
  /** Se abrió otra sala o se recargó la página. */
  | { type: "reset" };

/**
 * Siguiente valor del contador de "Deshacer".
 *
 * Tras un cambio, min(d + 1, 50); tras deshacer, `remaining`; con un 409 o al cambiar de sala, 0. El
 * botón solo se muestra con el contador mayor que 0, así que tras recargar no aparece aunque el
 * servidor aún guarde la pila (sin `undoAvailable`, como se decidió para la foto).
 */
export function nextUndoDepth(depth: number, event: UndoEvent): number {
  switch (event.type) {
    case "change":
      return Math.min(depth + 1, MAX_UNDO_DEPTH);
    case "undone":
      return Math.min(Math.max(0, Math.floor(event.remaining)), MAX_UNDO_DEPTH) || 0;
    case "nothing":
    case "reset":
      return 0;
  }
}

/**
 * Mensaje en español para un fallo de "Deshacer": 404 la sala ya no es de la cuenta, 409 el detail del
 * backend o `es.undo.nothing`; el resto, el mensaje general (401, 429, 503, servidor inalcanzable…).
 */
export function undoErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return es.photo.errors.notFound;
    if (error.status === 409) return error.detail ?? es.undo.nothing;
  }
  return error instanceof Error ? error.message : String(error);
}

/** Qué se deshizo y cuántos cambios quedan, p. ej. "Se deshizo la foto. Puedes deshacer 2 más." */
export function undoneMessage(undone: UndoneChange | undefined, remaining: number): string {
  const what = (undone && es.undo.done[undone]) || es.undo.done.other;
  return remaining > 0 ? `${what} ${es.undo.more(remaining)}` : what;
}

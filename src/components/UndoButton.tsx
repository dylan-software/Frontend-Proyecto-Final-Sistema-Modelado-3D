import { useEffect, useRef, useState } from "react";

import { es } from "../i18n/es";
import { api, ApiError, type RoomUndoResult } from "../lib/api";
import { undoErrorMessage, undoneMessage } from "../lib/roomUndo";

interface UndoButtonProps {
  /** Sala abierta, o null mientras no haya ninguna. */
  roomId: number | null;
  /** Cambios de esta visita que aún se pueden deshacer; con 0 el botón no se muestra. */
  depth: number;
  /** Se llama con la sala ya restaurada en el backend. */
  onUndone: (result: RoomUndoResult) => void;
  /** El backend respondió 409: no queda nada que deshacer (el contador pasa a 0). */
  onNothingToUndo: () => void;
}

/**
 * "Deshacer" único de la sala (CONTRATO-FASE2.md): deshace el último cambio, sea la foto o lo que hizo el
 * chat. Va en la fila de acciones del chat, junto a "Foto a 3D". Solo aparece tras un cambio hecho en esta
 * visita a la página; se desactiva mientras deshace. Sin diálogo de confirmación. El resultado o el error
 * quedan en una línea debajo, aunque el botón desaparezca al llegar el contador a 0.
 */
export function UndoButton({ roomId, depth, onUndone, onNothingToUndo }: UndoButtonProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Un cambio nuevo (el contador sube) deja viejo el último mensaje.
  const previousDepth = useRef(depth);
  useEffect(() => {
    if (depth > previousDepth.current) setMessage(null);
    previousDepth.current = depth;
  }, [depth]);

  async function handleUndo() {
    if (roomId === null || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await api.undoRoom(roomId);
      onUndone(result);
      setMessage({ text: undoneMessage(result.undone, result.remaining), isError: false });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) onNothingToUndo();
      setMessage({ text: undoErrorMessage(err), isError: true });
    } finally {
      setBusy(false);
    }
  }

  if (depth <= 0 && !message) return null;

  return (
    <div className="photo-to-room photo-to-room-compact">
      {depth > 0 && (
        <button
          type="button"
          className="photo-to-room-button"
          onClick={handleUndo}
          disabled={roomId === null || busy}
          title={es.undo.hint}
        >
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <path
              d="M7.5 5 4 8.5 7.5 12M4.5 8.5h7a4 4 0 0 1 0 8H9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {busy ? es.undo.busy : es.undo.button}
        </button>
      )}
      {message && (
        <p className={message.isError ? "warning" : "hint"} role={message.isError ? "alert" : "status"}>
          {message.text}
        </p>
      )}
    </div>
  );
}

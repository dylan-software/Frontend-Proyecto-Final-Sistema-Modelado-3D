import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { es } from "../i18n/es";
import { api, MAX_PHOTO_INSTRUCTIONS_CHARS, type DiscardedObject, type PhotoAnalysis } from "../lib/api";
import { ACCEPTED_PHOTO_TYPES, downscalePhoto, MAX_PHOTO_BYTES } from "../lib/photo";
import { photoErrorMessage } from "../lib/photoErrors";

interface PhotoToRoomProps {
  /** Sala abierta, o null si todavía no hay ninguna (el botón se desactiva). */
  roomId: number | null;
  /** Muebles guardados en la sala: el diálogo dice cuántos se perderán. */
  savedItemCount: number;
  /** Se llama con la respuesta del backend cuando la estimación ya está guardada. */
  onAnalyzed: (result: PhotoAnalysis) => void;
  /**
   * Versión para la fila de acciones del chat: sin la introducción, con un botón pequeño y el
   * resultado en una línea debajo. El diálogo, el envío y los mensajes no cambian.
   */
  compact?: boolean;
}

/**
 * Foto a 3D (CONTRATO-FOTO-A-3D.md): elegir o hacer una foto, confirmar en un diálogo que avisa de la
 * privacidad y de lo que se pierde, reducirla en el navegador y enviarla. Solo tras aceptar el
 * diálogo se envía confirm_replace=true. En el móvil, `capture` abre la cámara sin getUserMedia.
 */
export function PhotoToRoom({ roomId, savedItemCount, onAnalyzed, compact = false }: PhotoToRoomProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Foto elegida que espera la confirmación del diálogo.
  const [pending, setPending] = useState<File | null>(null);
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ count: number; description: string; discarded: DiscardedObject[] } | null>(
    null
  );

  // Escape cierra el diálogo, como el botón Cancelar.
  useEffect(() => {
    if (!pending) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setPending(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    // Se vacía para que elegir la misma foto otra vez vuelva a disparar onChange.
    event.target.value = "";
    if (!file) return;
    if (!(ACCEPTED_PHOTO_TYPES as readonly string[]).includes(file.type)) {
      setError(es.errors.photoType);
      return;
    }
    setError(null);
    setPending(file);
  }

  async function confirmAndSend() {
    const file = pending;
    if (!file || roomId === null || busy) return;
    setPending(null);
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const photo = await downscalePhoto(file);
      if (photo.size > MAX_PHOTO_BYTES) {
        setError(es.errors.photoTooLarge);
        return;
      }
      const analysis = await api.analyzeRoomPhoto(roomId, photo, { confirmReplace: true, instructions });
      onAnalyzed(analysis);
      setResult({ count: analysis.items.length, description: analysis.description, discarded: analysis.discarded });
    } catch (err) {
      setError(photoErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "photo-to-room photo-to-room-compact" : "photo-to-room"}>
      {!compact && <p className="hint">{es.photo.ui.intro}</p>}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_PHOTO_TYPES.join(",")}
        capture="environment"
        hidden
        onChange={handleFileChange}
      />
      <button
        type="button"
        className={compact ? "photo-to-room-button" : undefined}
        onClick={() => fileInputRef.current?.click()}
        disabled={roomId === null || busy}
        title={compact ? es.photo.ui.intro : undefined}
      >
        {compact && (
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <path
              d="M3 6.5A1.5 1.5 0 0 1 4.5 5h2l1.2-1.6h4.6L13.5 5h2A1.5 1.5 0 0 1 17 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <circle cx="10" cy="10.5" r="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        )}
        {busy ? (compact ? es.photo.ui.analyzingShort : es.photo.ui.analyzing) : es.photo.ui.button}
      </button>
      {roomId === null && !compact && <p className="hint">{es.photo.ui.noRoom}</p>}
      {busy && (
        <p className="hint" role="status">
          {es.photo.ui.analyzing}
        </p>
      )}

      {result && (
        <div className="photo-result" role="status">
          <p>{es.photo.ui.done(result.count)}</p>
          {result.description && <p className="hint">{result.description}</p>}
          {result.discarded.length > 0 && (
            <details>
              <summary>
                {es.photo.ui.discardedTitle} ({result.discarded.length})
              </summary>
              <ul>
                {result.discarded.map((d, i) => (
                  <li key={i}>
                    {d.name}: {d.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {error && (
        <p className="warning" role="alert">
          {error}
        </p>
      )}

      {pending && (
        <div className="photo-dialog-backdrop">
          <div className="photo-dialog" role="dialog" aria-modal="true" aria-labelledby="photo-dialog-title">
            <h3 id="photo-dialog-title">{es.photo.dialog.title}</h3>
            <p className="photo-dialog-privacy">{es.photo.dialog.privacy}</p>
            <p className="photo-dialog-replace">{es.photo.dialog.replace(savedItemCount)}</p>
            <label className="photo-dialog-instructions">
              {es.photo.dialog.instructionsLabel}
              <textarea
                value={instructions}
                maxLength={MAX_PHOTO_INSTRUCTIONS_CHARS}
                placeholder={es.photo.dialog.instructionsPlaceholder}
                rows={2}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </label>
            <div className="photo-dialog-actions">
              <button type="button" className="link-button" onClick={() => setPending(null)} autoFocus>
                {es.photo.dialog.cancel}
              </button>
              <button type="button" onClick={confirmAndSend}>
                {es.photo.dialog.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

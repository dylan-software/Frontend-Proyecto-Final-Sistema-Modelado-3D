import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { es } from "../i18n/es";
import type { RoomItem } from "../lib/api";
import { arrowKeyDirection, arrowLabel, elevationRange, moveHint, type ArrowDirection, type MoveMode } from "../lib/objectMove";
import { readMoveHelpSeen, saveMoveHelpSeen } from "../lib/uiPrefs";
import { IconArrowDown, IconArrowLeft, IconArrowRight, IconArrowUp, IconClose } from "./icons";

/** Mensaje bajo los controles: el resultado del último movimiento o su error. */
export interface MoveStatus {
  kind: "info" | "error";
  text: string;
}

interface ObjectMovePanelProps {
  /** El objeto seleccionado como se ve ahora (con la vista previa, si la hay). */
  item: RoomItem;
  mode: MoveMode;
  roomHeightM: number;
  /** Un movimiento se está guardando: los controles esperan. */
  busy: boolean;
  status: MoveStatus | null;
  onArrow: (direction: ArrowDirection) => void;
  /** La barra de altura se mueve: solo vista previa. */
  onElevationPreview: (elevationM: number) => void;
  /** Se suelta la barra (o se deja de pulsar una tecla): se guarda la altura. */
  onElevationCommit: () => void;
  onClose: () => void;
  /**
   * Petición de foco (FASE 8): cada vez que el objeto se elige desde la lista, este número cambia y el
   * foco pasa al panel, para que las flechas lo muevan sin buscar los botones. 0 = sin petición (el
   * objeto se eligió tocándolo en el 3D y el foco se queda donde estaba).
   */
  focusRequest?: number;
}

// Orden en la cruceta de 3 x 3 (CSS): arriba, izquierda, derecha y abajo.
const ARROWS: { direction: ArrowDirection; Glyph: typeof IconArrowUp }[] = [
  { direction: "up", Glyph: IconArrowUp },
  { direction: "left", Glyph: IconArrowLeft },
  { direction: "right", Glyph: IconArrowRight },
  { direction: "down", Glyph: IconArrowDown },
];

/**
 * Panel del objeto seleccionado en el 3D (FASE 3): cómo moverlo, las flechas de respaldo (por si el
 * arrastre falla en el móvil; 10 cm por toque, o 5 cm de altura en una pared), la barra de altura de
 * los objetos levantados y el resultado del último movimiento. Cada movimiento lo guarda el servidor.
 *
 * Teclado (FASE 8): con el foco dentro del panel, las flechas hacen lo mismo que los botones de la
 * cruceta y Escape suelta el objeto. La barra de altura conserva sus flechas propias. Tras cada flecha
 * el foco queda en el panel (no en un botón, que se deshabilita mientras se guarda y lo perdería).
 *
 * Ayuda: las dos líneas de instrucciones (cómo moverlo y el teclado) solo se abren solas la primera vez
 * en este navegador (localStorage "ui_move_help_seen", un booleano). Después el panel abre compacto
 * (nombre, flechas, cerrar) y el botón "?" las vuelve a mostrar u ocultar.
 */
export function ObjectMovePanel({
  item,
  mode,
  roomHeightM,
  busy,
  status,
  onArrow,
  onElevationPreview,
  onElevationCommit,
  onClose,
  focusRequest = 0,
}: ObjectMovePanelProps) {
  const t = es.objectMove;
  const range = elevationRange(item, roomHeightM);
  const message = busy ? t.saving : status?.text ?? "";
  const panelRef = useRef<HTMLDivElement>(null);
  const helpId = useId();
  // El panel solo existe en el navegador tras elegir un objeto: leer localStorage aquí no desajusta la hidratación.
  const [showHelp, setShowHelp] = useState(() => !readMoveHelpSeen());

  useEffect(() => {
    if (focusRequest > 0) panelRef.current?.focus();
  }, [focusRequest]);

  // En cuanto la ayuda se ha visto una vez, las siguientes veces el panel abre compacto.
  useEffect(() => {
    if (showHelp) saveMoveHelpSeen();
  }, [showHelp]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    // La barra de altura usa las flechas para su propio valor.
    if ((event.target as HTMLElement).tagName === "INPUT") return;
    const direction = arrowKeyDirection(event.key);
    if (!direction) return;
    event.preventDefault();
    panelRef.current?.focus();
    if (!busy) onArrow(direction);
  }

  return (
    <div
      ref={panelRef}
      className="object-move-panel glass"
      data-help={showHelp ? "open" : "closed"}
      role="group"
      aria-label={t.panelLabel(item.name)}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <div className="object-move-header">
        <span className="object-move-title">{t.title}</span>
        <strong className="object-move-name" title={item.name}>
          {item.name}
        </strong>
        <button
          type="button"
          className="object-move-help-toggle"
          onClick={() => setShowHelp((open) => !open)}
          aria-expanded={showHelp}
          aria-controls={helpId}
          aria-label={showHelp ? t.hideHelp : t.showHelp}
          title={showHelp ? t.hideHelp : t.showHelp}
        >
          {t.helpButton}
        </button>
        <button type="button" className="object-move-close" onClick={onClose} aria-label={t.close} title={t.close}>
          <IconClose size={16} />
        </button>
      </div>
      <div id={helpId} className="object-move-help">
        {showHelp && (
          <>
            <p className="object-move-hint">{moveHint(mode)}</p>
            <p className="object-move-hint object-move-keys">{t.keyboardHint}</p>
          </>
        )}
      </div>

      <div className="object-move-arrows" role="group" aria-label={t.arrowsLabel}>
        {ARROWS.map(({ direction, Glyph }) => (
          <button
            key={direction}
            type="button"
            className={`object-move-arrow object-move-arrow-${direction}`}
            onClick={() => onArrow(direction)}
            disabled={busy}
            aria-label={arrowLabel(mode, direction)}
            title={arrowLabel(mode, direction)}
          >
            <Glyph size={18} />
          </button>
        ))}
      </div>

      {mode.kind !== "floor" && (
        <label className="object-move-height">
          <span>
            {t.height}: <strong>{t.heightValue(Math.round(item.elevationM * 100))}</strong>
          </span>
          <input
            type="range"
            min={range.min}
            max={range.max}
            step={0.01}
            value={item.elevationM}
            disabled={busy || range.max <= range.min}
            onChange={(event) => onElevationPreview(Number(event.target.value))}
            onPointerUp={onElevationCommit}
            onKeyUp={onElevationCommit}
            onBlur={onElevationCommit}
          />
        </label>
      )}

      <p
        className={`object-move-status${!busy && status?.kind === "error" ? " object-move-status-error" : ""}`}
        role="status"
        aria-live="polite"
      >
        {message}
      </p>
    </div>
  );
}

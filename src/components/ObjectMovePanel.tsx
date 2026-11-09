import { es } from "../i18n/es";
import type { RoomItem } from "../lib/api";
import { arrowLabel, elevationRange, moveHint, type ArrowDirection, type MoveMode } from "../lib/objectMove";
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
}: ObjectMovePanelProps) {
  const t = es.objectMove;
  const range = elevationRange(item, roomHeightM);
  const message = busy ? t.saving : status?.text ?? "";

  return (
    <div className="object-move-panel glass" role="group" aria-label={t.panelLabel(item.name)}>
      <div className="object-move-header">
        <span className="object-move-title">{t.title}</span>
        <strong className="object-move-name" title={item.name}>
          {item.name}
        </strong>
        <button type="button" className="object-move-close" onClick={onClose} aria-label={t.close} title={t.close}>
          <IconClose size={16} />
        </button>
      </div>
      <p className="object-move-hint">{moveHint(mode)}</p>

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

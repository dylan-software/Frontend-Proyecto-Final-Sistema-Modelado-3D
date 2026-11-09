import type { ReactNode } from "react";

/**
 * Estados de vacío y de carga del sistema «Plano de obra». Son el único elemento decorativo de la
 * app: un dibujo lineal de plano con sus cotas en roble. Los dibujos son decorativos (aria-hidden);
 * el texto que los acompaña es lo que leen los lectores de pantalla.
 */

/** Qué dibuja el estado vacío: una sala vacía, una sala con huecos de muebles o láminas apiladas. */
export type PlanDrawing = "room" | "objects" | "sheets";

/** Cotas de un plano: línea con dos marcas en los extremos. */
function Dimension({ d }: { d: string }) {
  return <path className="plan-state-measure" d={d} />;
}

function Drawing({ kind }: { kind: PlanDrawing }) {
  return (
    <svg className="plan-state-drawing" viewBox="0 0 160 112" width="160" height="112" aria-hidden="true" focusable="false">
      {kind === "sheets" && (
        <>
          <rect className="plan-state-sheet" x="32" y="16" width="112" height="76" rx="2" />
          <rect className="plan-state-sheet" x="26" y="20" width="112" height="76" rx="2" />
        </>
      )}
      {/* Cotas: ancho arriba y fondo a la izquierda. */}
      <Dimension d="M20 10h120M20 6v8M140 6v8" />
      <Dimension d="M8 24v76M4 24h8M4 100h8" />
      {/* Muros con el hueco de la puerta abajo a la derecha y su barrido. */}
      <path className="plan-state-wall" d="M100 100H20V24h120v76h-18" />
      <path className="plan-state-door" d="M100 100V78A22 22 0 0 1 122 100" />
      {kind === "objects" && (
        <>
          <rect className="plan-state-slot" x="32" y="36" width="40" height="24" rx="2" />
          <rect className="plan-state-slot" x="96" y="36" width="32" height="18" rx="2" />
        </>
      )}
    </svg>
  );
}

interface PlanEmptyProps {
  title: string;
  /** Qué hacer para salir del vacío (una frase). */
  text?: ReactNode;
  /** Botón o enlace con la acción principal. */
  action?: ReactNode;
  drawing?: PlanDrawing;
  /** Versión compacta para paneles estrechos (lista de objetos). */
  compact?: boolean;
  className?: string;
}

/** Estado vacío: el plano dibujado, un título, una frase de qué hacer y, si la hay, la acción. */
export function PlanEmpty({ title, text, action, drawing = "room", compact = false, className = "" }: PlanEmptyProps) {
  return (
    <div className={`plan-state${compact ? " plan-state-compact" : ""} ${className}`.trim()}>
      <Drawing kind={drawing} />
      <p className="plan-state-title">{title}</p>
      {text && <p className="plan-state-text">{text}</p>}
      {action && <div className="plan-state-action">{action}</div>}
    </div>
  );
}

interface PlanLoadingProps {
  /** Lo que se está cargando ("Cargando tus proyectos…"); se anuncia con role="status". */
  label: string;
  /** Muestra el texto bajo la cota (si no, solo lo leen los lectores de pantalla). */
  showLabel?: boolean;
  className?: string;
}

/** Carga: una cota que se traza de un extremo al otro mientras llega la respuesta. */
export function PlanLoading({ label, showLabel = true, className = "" }: PlanLoadingProps) {
  return (
    <div className={`plan-loading ${className}`.trim()} role="status">
      <svg className="plan-loading-drawing" viewBox="0 0 120 16" width="120" height="16" aria-hidden="true" focusable="false">
        <path className="plan-loading-ticks" d="M2 2v12M118 2v12" />
        <path className="plan-loading-line" d="M2 8h116" pathLength={100} />
      </svg>
      <span className={showLabel ? "plan-loading-label" : "visually-hidden"}>{label}</span>
    </div>
  );
}

import { useId } from "react";

import type { Point2D } from "../lib/api";
import { fitPlanToBox, formatMeters, planBounds } from "../lib/projects";

// Lienzo 4:3 en unidades SVG; el margen deja sitio a las cotas.
const VIEW_W = 240;
const VIEW_H = 180;
const PADDING = 34;
// Distancia de la línea de cota a la sala.
const DIM_GAP = 12;

interface RoomPlanThumbnailProps {
  vertices: Point2D[];
  /** Texto accesible del plano. */
  label: string;
  /** true mientras se muestra el rectángulo provisional (trazo discontinuo y más tenue). */
  provisional?: boolean;
}

/**
 * Plano de la sala visto desde arriba, como en un plano técnico: retícula de fondo, contorno en el
 * color de acento y las cotas de ancho (arriba) y fondo (a la derecha) en metros.
 */
export function RoomPlanThumbnail({ vertices, label, provisional = false }: RoomPlanThumbnailProps) {
  // useId trae caracteres (":" o "«»") que rompen la referencia url(#…): se dejan solo los seguros.
  const patternId = `plan-grid-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const bounds = planBounds(vertices);
  const { points, box } = fitPlanToBox(vertices, VIEW_W, VIEW_H, PADDING);
  const top = box.y - DIM_GAP;
  const right = box.x + box.width + DIM_GAP;

  return (
    <svg
      className={`room-plan${provisional ? " room-plan-provisional" : ""}`}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <pattern id={patternId} width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M12 0H0V12" className="room-plan-grid" />
        </pattern>
      </defs>
      <rect width={VIEW_W} height={VIEW_H} fill={`url(#${patternId})`} />

      {points && <polygon points={points} className="room-plan-shape" />}

      {box.width > 0 && (
        <g className="room-plan-dimension" aria-hidden="true">
          <path d={`M${box.x} ${top}H${box.x + box.width}M${box.x} ${top - 4}v8M${box.x + box.width} ${top - 4}v8`} />
          <text x={box.x + box.width / 2} y={top - 6} textAnchor="middle">
            {formatMeters(bounds.width)}
          </text>
        </g>
      )}
      {box.height > 0 && (
        <g className="room-plan-dimension" aria-hidden="true">
          <path d={`M${right} ${box.y}V${box.y + box.height}M${right - 4} ${box.y}h8M${right - 4} ${box.y + box.height}h8`} />
          <text
            x={right + 6}
            y={box.y + box.height / 2}
            textAnchor="middle"
            transform={`rotate(90 ${right + 6} ${box.y + box.height / 2})`}
          >
            {formatMeters(bounds.depth)}
          </text>
        </g>
      )}
    </svg>
  );
}

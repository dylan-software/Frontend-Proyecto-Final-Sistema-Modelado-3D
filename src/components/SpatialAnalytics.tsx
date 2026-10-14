import { useMemo } from "react";
import type { Dimensions3D } from "../types/spatial";

interface SpatialAnalyticsProps {
  /** Floor area of the room in m², or null while no room has been scanned. */
  roomAreaM2: number | null;
  /** Bounding boxes (meters) of every piece currently placed in the room. */
  items: Dimensions3D[];
}

interface MeterProps {
  label: string;
  percent: number;
  variant: "occupied" | "free";
}

/** Labeled horizontal progress bar. */
function Meter({ label, percent, variant }: MeterProps) {
  const rounded = Math.round(percent);
  return (
    <div className="meter">
      <div className="meter-label">
        <span>{label}</span>
        <span className="meter-value">{rounded}%</span>
      </div>
      <div
        className="meter-track"
        role="progressbar"
        aria-label={label}
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`meter-fill meter-fill-${variant}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/**
 * Sidebar panel summarizing how much of the room's floor is taken up by
 * the placed furniture and how much is still free.
 */
export function SpatialAnalytics({ roomAreaM2, items }: SpatialAnalyticsProps) {
  // Each piece's footprint is approximated by its bounding box (width × depth),
  // ignoring rotation and overlaps.
  // Complexity: O(n) single pass over the items, memoized so it only reruns
  // when the `items` array changes (the parent memoizes it as well).
  const totals = useMemo(() => {
    let footprintM2 = 0;
    let volumeM3 = 0;
    for (const { width, height, depth } of items) {
      footprintM2 += width * depth;
      volumeM3 += width * height * depth;
    }
    return { footprintM2, volumeM3 };
  }, [items]);

  const occupiedPercent = roomAreaM2 && roomAreaM2 > 0 ? Math.min(100, (totals.footprintM2 / roomAreaM2) * 100) : null;

  return (
    <section className="spatial-analytics">
      <h3>Ocupación del espacio</h3>

      {occupiedPercent === null ? (
        <p className="hint">Escanea una habitación para calcular su ocupación.</p>
      ) : (
        <>
          <Meter label="% de Espacio Ocupado" percent={occupiedPercent} variant="occupied" />
          <Meter label="% de Espacio Libre" percent={100 - occupiedPercent} variant="free" />
        </>
      )}

      <dl className="analytics-stats">
        <div>
          <dt>Superficie ocupada</dt>
          <dd>{totals.footprintM2.toFixed(2)} m²</dd>
        </div>
        <div>
          <dt>Volumen de muebles</dt>
          <dd>{totals.volumeM3.toFixed(2)} m³</dd>
        </div>
      </dl>
    </section>
  );
}

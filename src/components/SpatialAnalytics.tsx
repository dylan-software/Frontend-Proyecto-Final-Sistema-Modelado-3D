import { useMemo } from "react";
import type { Dimensions3D } from "../types/spatial";

interface SpatialAnalyticsProps {
  /** Floor area of the room in m², or null while no room has been scanned. */
  roomAreaM2: number | null;
  /** Bounding boxes (meters) of every piece currently placed in the room. */
  items: Dimensions3D[];
}

/**
 * Sidebar panel summarizing how much of the room's floor is taken up by
 * the placed furniture and how much is still free.
 */
export function SpatialAnalytics({ roomAreaM2, items }: SpatialAnalyticsProps) {
  // Each piece's footprint is approximated by its bounding box (width × depth),
  // ignoring rotation and overlaps.
  const totals = useMemo(() => {
    let footprintM2 = 0;
    let volumeM3 = 0;
    for (const { width, height, depth } of items) {
      footprintM2 += width * depth;
      volumeM3 += width * height * depth;
    }
    return { footprintM2, volumeM3 };
  }, [items]);

  const occupiedPercent =
    roomAreaM2 && roomAreaM2 > 0 ? Math.min(100, (totals.footprintM2 / roomAreaM2) * 100) : null;

  return (
    <section className="spatial-analytics">
      <h3>Ocupación del espacio</h3>
    </section>
  );
}

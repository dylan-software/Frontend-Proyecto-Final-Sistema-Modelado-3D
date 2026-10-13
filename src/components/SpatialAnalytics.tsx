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
  return (
    <section className="spatial-analytics">
      <h3>Ocupación del espacio</h3>
    </section>
  );
}

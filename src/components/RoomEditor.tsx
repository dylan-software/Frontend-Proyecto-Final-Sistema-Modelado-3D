import { useRef, useState } from "react";
import type { Point2D } from "../lib/api";

interface RoomEditorProps {
  vertices: Point2D[];
  areaM2: number;
  onVertexMoved: (index: number, point: Point2D) => Promise<void>;
}

const PX_PER_METER = 40;

/**
 * Lets the user MODIFY the shape of an already-scanned space — drag
 * any vertex to a new position. Each drag ends with a call to
 * PATCH /api/spaces/:projectId/vertices/:index (via onVertexMoved),
 * which re-validates the polygon server-side before saving it.
 */
export function RoomEditor({ vertices, areaM2, onVertexMoved }: RoomEditorProps) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const xs = vertices.map((v) => v.x);
  const ys = vertices.map((v) => v.y);
  const minX = Math.min(...xs) - 1;
  const minY = Math.min(...ys) - 1;

  function toPx(p: Point2D) {
    return { x: (p.x - minX) * PX_PER_METER, y: (p.y - minY) * PX_PER_METER };
  }

  function toMeters(px: number, py: number): Point2D {
    return { x: px / PX_PER_METER + minX, y: py / PX_PER_METER + minY };
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (draggingIndex === null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    // Visual-only feedback is handled by re-rendering with a local override;
    // the actual save happens on pointer up to avoid flooding the backend.
    dragPreview.current = toMeters(px, py);
    forceRerender((n) => n + 1);
  }

  const dragPreview = useRef<Point2D | null>(null);
  const [, forceRerender] = useState(0);

  async function handlePointerUp() {
    if (draggingIndex === null || !dragPreview.current) {
      setDraggingIndex(null);
      return;
    }
    const point = dragPreview.current;
    const index = draggingIndex;
    setDraggingIndex(null);
    dragPreview.current = null;
    setError(null);
    try {
      await onVertexMoved(index, point);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const displayVertices = vertices.map((v, i) => (i === draggingIndex && dragPreview.current ? dragPreview.current : v));

  return (
    <div className="room-editor">
      <p className="hint">Drag any corner to reshape the room. Area: {areaM2} m².</p>
      {error && <p className="warning">{error}</p>}
      <svg
        ref={svgRef}
        width="100%"
        height="320"
        viewBox={`0 0 ${(Math.max(...xs) - minX + 2) * PX_PER_METER} ${(Math.max(...ys) - minY + 2) * PX_PER_METER}`}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <polygon
          points={displayVertices.map((v) => {
            const p = toPx(v);
            return `${p.x},${p.y}`;
          }).join(" ")}
          fill="#2f6f4f22"
          stroke="#2f6f4f"
          strokeWidth={2}
        />
        {displayVertices.map((v, i) => {
          const p = toPx(v);
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={8}
              fill={i === draggingIndex ? "#d94f4f" : "#2f6f4f"}
              style={{ cursor: "grab" }}
              onPointerDown={() => setDraggingIndex(i)}
            />
          );
        })}
      </svg>
    </div>
  );
}

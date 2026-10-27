import { useRef, useState } from "react";
import type { Point2D } from "../lib/api";
import { canDeleteVertex, edgeMidpoint } from "../lib/roomShape";

interface RoomEditorProps {
  vertices: Point2D[];
  areaM2: number;
  onVertexMoved: (index: number, point: Point2D) => Promise<void>;
  onVertexInserted: (afterIndex: number, point: Point2D) => Promise<void>;
  onVertexDeleted: (index: number) => Promise<void>;
}

const PX_PER_METER = 40;

/**
 * Lets the user MODIFY the shape of an already-scanned space: drag any
 * vertex to a new position, click a "+" on an edge to add a corner
 * there, or select a corner and delete it. Each change is one call to
 * PATCH, POST or DELETE /api/v1/spaces/rooms/{id}/vertices (through the
 * callbacks), and the backend re-validates the polygon before saving it:
 * an invalid shape comes back as a 422 and the room stays as it was.
 */
export function RoomEditor({ vertices, areaM2, onVertexMoved, onVertexInserted, onVertexDeleted }: RoomEditorProps) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  // True while a vertex change is being saved; edits wait for it.
  const [saving, setSaving] = useState(false);
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

  /** Runs one vertex change, showing the backend's message if it is rejected. */
  async function save(change: () => Promise<void>) {
    setSaving(true);
    setError(null);
    try {
      await change();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (draggingIndex === null || !svgRef.current) return;
    // The SVG is scaled to fit its box (width 100%, viewBox in px at
    // PX_PER_METER), so screen pixels are mapped back to viewBox units
    // through the inverse of its screen transform.
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    // Visual-only feedback is handled by re-rendering with a local override;
    // the actual save happens on pointer up to avoid flooding the backend.
    dragPreview.current = toMeters(p.x, p.y);
    forceRerender((n) => n + 1);
  }

  const dragPreview = useRef<Point2D | null>(null);
  const [, forceRerender] = useState(0);

  async function handlePointerUp() {
    // A press without movement only selects the corner.
    if (draggingIndex === null || !dragPreview.current) {
      setDraggingIndex(null);
      return;
    }
    const point = dragPreview.current;
    const index = draggingIndex;
    setDraggingIndex(null);
    dragPreview.current = null;
    await save(() => onVertexMoved(index, point));
  }

  async function handleInsert(afterIndex: number) {
    setSelectedIndex(null);
    await save(() => onVertexInserted(afterIndex, edgeMidpoint(vertices, afterIndex)));
  }

  async function handleDeleteSelected() {
    if (selectedIndex === null) return;
    const index = selectedIndex;
    setSelectedIndex(null);
    await save(() => onVertexDeleted(index));
  }

  const displayVertices = vertices.map((v, i) => (i === draggingIndex && dragPreview.current ? dragPreview.current : v));
  const deletable = canDeleteVertex(vertices.length);

  return (
    <div className="room-editor">
      <p className="hint">
        Arrastra una esquina para cambiar la forma, pulsa «+» en una pared para añadir una esquina o selecciona una
        esquina para eliminarla. Área: {areaM2} m².
      </p>
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
        {draggingIndex === null &&
          !saving &&
          vertices.map((_, i) => {
            const p = toPx(edgeMidpoint(vertices, i));
            return (
              <g key={`insert-${i}`} style={{ cursor: "copy" }} onClick={() => handleInsert(i)}>
                <title>Añadir una esquina en esta pared</title>
                <circle cx={p.x} cy={p.y} r={7} fill="#ffffff" stroke="#2f6f4f" strokeWidth={1.5} />
                <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={12} fill="#2f6f4f" pointerEvents="none">
                  +
                </text>
              </g>
            );
          })}
        {displayVertices.map((v, i) => {
          const p = toPx(v);
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={8}
              fill={i === draggingIndex ? "#d94f4f" : i === selectedIndex ? "#d9a04f" : "#2f6f4f"}
              style={{ cursor: saving ? "wait" : "grab" }}
              onPointerDown={() => {
                if (saving) return;
                setSelectedIndex(i);
                setDraggingIndex(i);
              }}
            />
          );
        })}
      </svg>
      {selectedIndex !== null && (
        <div className="room-editor-actions">
          <button type="button" onClick={handleDeleteSelected} disabled={saving || !deletable}>
            Eliminar esquina {selectedIndex + 1}
          </button>
          {!deletable && <span className="hint"> Una sala necesita al menos 3 esquinas.</span>}
        </div>
      )}
      {saving && <p className="hint">Guardando…</p>}
    </div>
  );
}

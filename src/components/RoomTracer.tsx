import { useState } from "react";
import { ARPointPicker, type Point2D } from "./ARPointPicker";

interface RoomTracerProps {
  onFinish: (vertices: Point2D[]) => void;
}

const GRID_SIZE_PX = 24; // 1 grid cell = 0.5m
const METERS_PER_CELL = 0.5;

/**
 * Lets the user trace the real shape of a space — NOT assumed to be
 * rectangular. In AR mode, each tap drops a vertex at the real-world
 * hit-test position (see ARPointPicker); the user can trace an L-shape,
 * a cut corner, any irregular room. Without AR support, the manual grid
 * editor below offers the same capability: click points on a scaled
 * grid to build any polygon, not just a 4-corner rectangle.
 */
export function RoomTracer({ onFinish }: RoomTracerProps) {
  const [points, setPoints] = useState<Point2D[]>([]);
  const [useManual, setUseManual] = useState(false);

  function handlePointAdded(_point: Point2D, all: Point2D[]) {
    setPoints(all);
  }

  function handleGridClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const x = Math.round(px / GRID_SIZE_PX) * METERS_PER_CELL;
    const y = Math.round(py / GRID_SIZE_PX) * METERS_PER_CELL;
    setPoints((prev) => [...prev, { x, y }]);
  }

  function undoLast() {
    setPoints((prev) => prev.slice(0, -1));
  }

  function reset() {
    setPoints([]);
  }

  return (
    <div className="room-tracer">
      {!useManual ? (
        <>
          <ARPointPicker points={points} onPointAdded={handlePointAdded} closeLoop />
          <button className="link-button" onClick={() => setUseManual(true)}>
            No AR camera available — draw the room shape manually
          </button>
        </>
      ) : (
        <div>
          <p className="hint">
            Click to place each corner of the room, in order, going around the shape — it does not have to be a
            rectangle. Each grid cell is {METERS_PER_CELL}m.
          </p>
          <div
            className="manual-grid"
            onClick={handleGridClick}
            style={{
              backgroundSize: `${GRID_SIZE_PX}px ${GRID_SIZE_PX}px`,
            }}
          >
            <svg className="manual-grid-overlay" width="100%" height="100%">
              {points.length >= 2 &&
                points.map((p, i) => {
                  const next = points[(i + 1) % points.length];
                  if (!next || (i === points.length - 1 && points.length < 3)) return null;
                  return (
                    <line
                      key={i}
                      x1={(p.x / METERS_PER_CELL) * GRID_SIZE_PX}
                      y1={(p.y / METERS_PER_CELL) * GRID_SIZE_PX}
                      x2={(next.x / METERS_PER_CELL) * GRID_SIZE_PX}
                      y2={(next.y / METERS_PER_CELL) * GRID_SIZE_PX}
                      stroke="#2f6f4f"
                      strokeWidth={2}
                    />
                  );
                })}
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={(p.x / METERS_PER_CELL) * GRID_SIZE_PX}
                  cy={(p.y / METERS_PER_CELL) * GRID_SIZE_PX}
                  r={5}
                  fill="#d94f4f"
                />
              ))}
            </svg>
          </div>
          <div className="button-row">
            <button onClick={undoLast} disabled={points.length === 0}>
              Undo last point
            </button>
            <button onClick={reset} disabled={points.length === 0}>
              Reset
            </button>
          </div>
        </div>
      )}

      <p>{points.length} point(s) placed.</p>
      <button disabled={points.length < 3} onClick={() => onFinish(points)}>
        Finish room shape ({points.length < 3 ? "need at least 3 points" : "looks good"})
      </button>
    </div>
  );
}

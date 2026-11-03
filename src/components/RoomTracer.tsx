import { useState } from "react";
import { es } from "../i18n/es";
import { ARPointPicker, type Point2D } from "./ARPointPicker";

interface RoomTracerProps {
  onFinish: (vertices: Point2D[]) => void;
}

const GRID_SIZE_PX = 24; // 1 celda de la cuadrícula = 0,5 m
const METERS_PER_CELL = 0.5;

/**
 * Permite trazar la forma REAL de un espacio, sin suponer que es rectangular. En modo AR cada toque
 * pone un vértice en la posición real del hit-test (ver ARPointPicker): se puede trazar una L, una
 * esquina cortada o cualquier sala irregular. Sin soporte AR, el editor manual de abajo ofrece lo
 * mismo: clic en una cuadrícula a escala para construir cualquier polígono, no solo un rectángulo.
 */
export function RoomTracer({ onFinish }: RoomTracerProps) {
  const t = es.tracer;
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
            {t.noArDrawManually}
          </button>
        </>
      ) : (
        <div>
          <p className="hint">{t.gridHint(METERS_PER_CELL)}</p>
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
              {t.undoLastPoint}
            </button>
            <button onClick={reset} disabled={points.length === 0}>
              {t.reset}
            </button>
          </div>
        </div>
      )}

      <p>{t.pointsPlaced(points.length)}</p>
      <button disabled={points.length < 3} onClick={() => onFinish(points)}>
        {t.finish(points.length)}
      </button>
    </div>
  );
}

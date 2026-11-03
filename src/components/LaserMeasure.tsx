import { useState } from "react";
import { es } from "../i18n/es";
import { mToCm } from "../lib/units";
import { ARPointPicker, type Point2D } from "./ARPointPicker";

interface LaserMeasureProps {
  label: string;
  onMeasured: (cm: number) => void;
}

function distanceCm(a: Point2D, b: Point2D): number {
  return Math.round(mToCm(Math.hypot(b.x - a.x, b.y - a.y)));
}

/**
 * Medición "láser": se toca el punto inicial y el final, y la distancia real entre ellos (en cm) sale
 * de los dos puntos del hit-test AR, el equivalente web de un metro láser. Sin soporte WebXR se escribe
 * el número a mano.
 */
export function LaserMeasure({ label, onMeasured }: LaserMeasureProps) {
  const t = es.laser;
  const [points, setPoints] = useState<Point2D[]>([]);
  const [manualValue, setManualValue] = useState("");
  const [useManual, setUseManual] = useState(false);

  function handlePointAdded(_point: Point2D, all: Point2D[]) {
    if (all.length >= 2) {
      const cm = distanceCm(all[0]!, all[1]!);
      onMeasured(cm);
      setPoints([]); // se reinicia para la siguiente medición
    } else {
      setPoints(all);
    }
  }

  return (
    <div className="laser-measure">
      <p>
        <strong>{label}</strong>
      </p>
      {!useManual ? (
        <>
          <ARPointPicker points={points} onPointAdded={handlePointAdded} />
          <button className="link-button" onClick={() => setUseManual(true)}>
            {t.noArEnterManually}
          </button>
        </>
      ) : (
        <div className="manual-entry">
          <input
            type="number"
            placeholder={t.distancePlaceholder}
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
          />
          <button
            onClick={() => {
              const cm = Number(manualValue);
              if (cm > 0) onMeasured(cm);
              setManualValue("");
            }}
          >
            {t.useValue}
          </button>
        </div>
      )}
    </div>
  );
}

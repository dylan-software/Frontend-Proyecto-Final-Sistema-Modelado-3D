import { useState } from "react";
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
 * "Laser" measurement: tap the start point, tap the end point, the
 * real-world distance between them (in cm) is computed from the two AR
 * hit-test points — the web equivalent of a laser tape measure bouncing
 * a beam out and back. Falls back to typing the number directly when
 * the device/browser has no WebXR support.
 */
export function LaserMeasure({ label, onMeasured }: LaserMeasureProps) {
  const [points, setPoints] = useState<Point2D[]>([]);
  const [manualValue, setManualValue] = useState("");
  const [useManual, setUseManual] = useState(false);

  function handlePointAdded(_point: Point2D, all: Point2D[]) {
    if (all.length >= 2) {
      const cm = distanceCm(all[0]!, all[1]!);
      onMeasured(cm);
      setPoints([]); // reset for the next measurement
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
            No AR camera available — enter the measurement manually
          </button>
        </>
      ) : (
        <div className="manual-entry">
          <input
            type="number"
            placeholder="Distance in cm"
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
            Use this value
          </button>
        </div>
      )}
    </div>
  );
}

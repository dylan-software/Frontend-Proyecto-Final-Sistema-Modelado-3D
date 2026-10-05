import { useEffect, useRef, useState } from "react";

/**
 * Captures the user's webcam stream so frames can be sent to the
 * backend's space-fitting AI.
 */
export default function CameraCapture() {
  const [error, setError] = useState<string | null>(null);

  return <div>{error && <p>{error}</p>}</div>;
}

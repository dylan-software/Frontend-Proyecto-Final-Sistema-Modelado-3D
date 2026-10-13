import { useEffect, useRef, useState } from "react";

/**
 * Captures the user's webcam stream so frames can be sent to the
 * backend's space-fitting AI.
 */
export default function CameraCapture() {
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Este navegador no permite acceder a la cámara.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo acceder a la cámara.");
    }
  }

  // Release the camera hardware when the component unmounts.
  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  return (
    <div>
      <button onClick={startCamera}>Iniciar cámara</button>
      {error && <p>{error}</p>}
    </div>
  );
}

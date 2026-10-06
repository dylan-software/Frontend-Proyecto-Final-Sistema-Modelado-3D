import { useEffect, useRef, useState } from "react";
import { isValidVector3D, type SpaceAnalysisResponse } from "../types/spatial";

const ANALYZE_URL = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/spaces/analyze`;

interface CameraCaptureProps {
  onAnalyzed?: (result: SpaceAnalysisResponse) => void;
}

/** Grabs the current video frame as a JPEG blob. */
function captureFrame(video: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo capturar la imagen."))), "image/jpeg", 0.9)
  );
}

/**
 * Captures the user's webcam stream so frames can be sent to the
 * backend's space-fitting AI.
 */
export default function CameraCapture({ onAnalyzed }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<string | null>(null);

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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraOn(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo acceder a la cámara.");
    }
  }

  async function analyzeSpace() {
    if (!videoRef.current || analyzing) return;
    setAnalyzing(true);
    setError(null);
    try {
      const blob = await captureFrame(videoRef.current);
      const form = new FormData();
      form.append("file", blob, "capture.jpg");

      // No Content-Type header: the browser sets the multipart boundary itself.
      const res = await fetch(ANALYZE_URL, { method: "POST", body: form });
      if (!res.ok) throw new Error(`El análisis falló con estado ${res.status}`);

      const result: SpaceAnalysisResponse = await res.json();
      if (!result.success) throw new Error("El backend no pudo analizar el espacio.");
      if (!isValidVector3D(result.suggested_coordinates)) {
        throw new Error("El backend devolvió coordenadas inválidas.");
      }

      setRecommendations(result.recommendations);
      onAnalyzed?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo analizar el espacio.");
    } finally {
      setAnalyzing(false);
    }
  }

  // Release the camera hardware when the component unmounts.
  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%" }} />
      <button onClick={startCamera}>Iniciar cámara</button>
      <button onClick={analyzeSpace} disabled={!cameraOn || analyzing}>
        {analyzing ? "Analizando…" : "Analizar espacio"}
      </button>
      {recommendations && <p className="hint">{recommendations}</p>}
      {error && <p>{error}</p>}
    </div>
  );
}

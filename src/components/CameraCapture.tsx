import { useEffect, useRef, useState } from "react";
import { fetchBackend } from "../lib/api";
import { isValidVector3D, type SpaceAnalysisResponse } from "../types/spatial";

/** FastAPI endpoint that receives a room photo and suggests where to place furniture. */
const ANALYZE_URL = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/spaces/analyze`;

interface CameraCaptureProps {
  /** Called with the backend's answer once its coordinates have been validated. */
  onAnalyzed?: (result: SpaceAnalysisResponse) => void;
  /** Called with `true` when an analysis request starts and `false` when it ends. */
  onAnalyzingChange?: (analyzing: boolean) => void;
}

/**
 * Grabs the frame currently shown by the <video> element as a JPEG blob.
 * The frame is drawn onto an off-screen canvas at the camera's native
 * resolution and encoded with `canvas.toBlob`.
 *
 * @param video - A <video> element that is already playing a camera stream.
 * @returns The encoded image, ready to be appended to a FormData.
 */
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
 *
 * Flow: `startCamera` asks the browser for camera access and plays the
 * stream in the <video>; `analyzeSpace` takes a snapshot of it, uploads
 * it as multipart/form-data under the `file` key (FastAPI's UploadFile),
 * validates the returned coordinates and hands them to `onAnalyzed`.
 */
export default function CameraCapture({ onAnalyzed, onAnalyzingChange }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<string | null>(null);

  /**
   * Requests camera access through `navigator.mediaDevices.getUserMedia`,
   * preferring the rear camera on phones, and attaches the stream to the
   * <video>. Requires HTTPS or http://localhost.
   */
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

  /**
   * Sends the current frame to the backend and reports the result.
   * Errors (no frame, server down, invalid coordinates) are shown in the UI
   * instead of being thrown.
   */
  async function analyzeSpace() {
    if (!videoRef.current || analyzing) return;
    setAnalyzing(true);
    onAnalyzingChange?.(true);
    setError(null);
    try {
      const blob = await captureFrame(videoRef.current);
      const form = new FormData();
      form.append("file", blob, "capture.jpg");

      // No Content-Type header: the browser sets the multipart boundary itself.
      const res = await fetchBackend(ANALYZE_URL, { method: "POST", body: form });
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
      onAnalyzingChange?.(false);
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
      {error && (
        <p className="warning connection-alert" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

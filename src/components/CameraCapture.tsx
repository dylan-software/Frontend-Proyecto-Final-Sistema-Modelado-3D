import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { fetchBackend, handleUnauthorized } from "../lib/api";
import { authHeaders } from "../lib/session";
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
 * Uploads an image to the backend's space analysis as multipart/form-data
 * under the `file` key (FastAPI's UploadFile) and validates the answer.
 *
 * @param image - A camera frame or a photo picked from the device.
 * @param filename - Name sent along with the file part.
 * @throws Error with a user-facing message when the request or its result fails.
 */
async function requestSpaceAnalysis(image: Blob, filename: string): Promise<SpaceAnalysisResponse> {
  const form = new FormData();
  form.append("file", image, filename);

  // No Content-Type header: the browser sets the multipart boundary itself.
  const res = await fetchBackend(ANALYZE_URL, { method: "POST", body: form, headers: authHeaders() });
  handleUnauthorized(res, "/spaces/analyze");
  if (!res.ok) throw new Error(`El análisis falló con estado ${res.status}`);

  const result: SpaceAnalysisResponse = await res.json();
  if (!result.success) throw new Error("El backend no pudo analizar el espacio.");
  if (!isValidVector3D(result.suggested_coordinates)) {
    throw new Error("El backend devolvió coordenadas inválidas.");
  }
  return result;
}

/**
 * Captures the user's webcam stream so frames can be sent to the
 * backend's space-fitting AI.
 *
 * Two ways to get an image to analyze:
 * - Live camera: `startCamera` asks the browser for camera access and plays
 *   the stream in the <video>; `analyzeSpace` takes a snapshot of it.
 * - Local photo: "Upload Photo" opens the file picker (gallery or photo
 *   camera on phones); the photo is previewed and sent with
 *   `uploadSelectedFileToBackend`.
 * Both go through `requestSpaceAnalysis` and hand the validated result to
 * `onAnalyzed`, which places the suggested coordinates in the 3D viewer.
 */
export default function CameraCapture({ onAnalyzed, onAnalyzingChange }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Hidden <input type="file">, opened programmatically from the visible button.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<string | null>(null);
  // Photo picked from the device, kept until it is analyzed or discarded.
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // Temporary blob: URL used by the <img> preview of `selectedFile`.
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  // True while the picked photo is being analyzed by the backend.
  const [uploading, setUploading] = useState(false);

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
      // Pressing "Iniciar cámara" twice must not leave the first stream running unreferenced.
      stopCameraStream();
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
   * Physically releases the camera: `track.stop()` on every track of the
   * stream turns the device (and its indicator light) off — clearing
   * `srcObject` alone would only hide the picture. Safe to call when no
   * stream is active. Touches refs only, so it also runs on unmount.
   */
  function stopCameraStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  /** "Desactivar Cámara": frees the hardware and puts the controls back in their initial state. */
  function handleStopCamera() {
    stopCameraStream();
    setCameraOn(false);
    setError(null);
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
      const result = await requestSpaceAnalysis(blob, "capture.jpg");
      setRecommendations(result.recommendations);
      onAnalyzed?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo analizar el espacio.");
    } finally {
      setAnalyzing(false);
      onAnalyzingChange?.(false);
    }
  }

  /**
   * Opens the system file picker: the file explorer on desktop, or the
   * native gallery / photo camera chooser on phones (accept="image/*").
   */
  function triggerFileInput() {
    fileInputRef.current?.click();
  }

  /** Keeps the photo the user picked, rejecting anything that isn't an image. */
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    // Reset the input so picking the same photo again still fires onChange.
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("El archivo seleccionado no es una imagen.");
      return;
    }
    setSelectedFile(file);
    setFilePreviewUrl(URL.createObjectURL(file));
    setError(null);
  }

  /**
   * Sends the picked photo to the backend's space analysis. Errors are
   * shown in the UI instead of being thrown.
   */
  async function uploadSelectedFileToBackend() {
    if (!selectedFile || uploading) return;
    setUploading(true);
    onAnalyzingChange?.(true);
    setError(null);

    try {
      const result = await requestSpaceAnalysis(selectedFile, selectedFile.name);
      // Same path as a live-camera analysis: the parent places the suggested
      // {x, y, z} in the 3D viewer.
      setRecommendations(result.recommendations);
      onAnalyzed?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo analizar la foto.");
    } finally {
      setUploading(false);
      onAnalyzingChange?.(false);
    }
  }

  /** Discards the picked photo; the effect below frees its preview URL. */
  function clearSelectedFile() {
    setSelectedFile(null);
    setFilePreviewUrl(null);
  }

  // Free each preview URL once it is replaced or the component unmounts.
  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  // Release the camera hardware when the component unmounts.
  useEffect(() => {
    return stopCameraStream;
  }, []);

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%" }} />
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
      <button onClick={startCamera}>Iniciar cámara</button>
      <button type="button" className="camera-off-button" onClick={handleStopCamera} disabled={!cameraOn || analyzing}>
        <span aria-hidden="true">⏻</span> Desactivar Cámara
      </button>
      <button onClick={analyzeSpace} disabled={!cameraOn || analyzing || uploading}>
        {analyzing ? "Analizando…" : "Analizar espacio"}
      </button>
      <button type="button" className="upload-button" onClick={triggerFileInput} disabled={uploading}>
        <span aria-hidden="true">📎</span> Upload Photo
      </button>
      {filePreviewUrl && (
        <figure className="photo-preview">
          <button
            type="button"
            className="photo-preview-remove"
            onClick={clearSelectedFile}
            disabled={uploading}
            aria-label="Descartar foto"
          >
            ×
          </button>
          <img src={filePreviewUrl} alt="Foto seleccionada para analizar" />
          <figcaption className="hint">{selectedFile?.name}</figcaption>
          <button type="button" onClick={uploadSelectedFileToBackend} disabled={uploading || analyzing}>
            {uploading ? "Analizando…" : "Analizar foto"}
          </button>
          {uploading && (
            <p className="hint" role="status">
              Procesando foto con IA...
            </p>
          )}
        </figure>
      )}
      {recommendations && <p className="hint">{recommendations}</p>}
      {error && (
        <p className="warning connection-alert" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

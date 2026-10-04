import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export interface Point2D {
  x: number;
  y: number;
}

interface ARPointPickerProps {
  /** Called every time the user taps and a new point is placed. */
  onPointAdded: (point: Point2D, allPoints: Point2D[]) => void;
  /** Rendered points, drawn as connected markers so the user sees what they've traced so far. */
  points: Point2D[];
  /** Close the loop back to the first point once there are 3+ (used for tracing a room). */
  closeLoop?: boolean;
}

type ARSupportState = "checking" | "supported" | "unsupported";

/**
 * Plain Three.js + raw WebXR (no @react-three/fiber here on purpose):
 * an 'immersive-ar' session with the 'hit-test' feature projects a
 * laser-like ray from the phone into the real world and reports where
 * it hits a detected surface — this is the browser/web equivalent of
 * "bouncing a laser back and forth" to measure distances, the same
 * technique AR measuring apps use. Each screen tap places a point at
 * the ray's current hit position, in real meters.
 *
 * Hard platform limitation (not a bug): WebXR's 'immersive-ar' mode
 * with hit-test is supported on Chrome for Android (ARCore) today.
 * Safari on iOS does not expose WebXR passthrough AR to web pages, so
 * this component reports "unsupported" there — see the manual-entry
 * fallback rendered by the parent components when that happens.
 */
export function ARPointPicker({ onPointAdded, points, closeLoop }: ARPointPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [support, setSupport] = useState<ARSupportState>("checking");
  const [sessionActive, setSessionActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<XRSession | null>(null);
  const onPointAddedRef = useRef(onPointAdded);
  onPointAddedRef.current = onPointAdded;

  useEffect(() => {
    const xr = (navigator as any).xr;
    if (!xr) {
      setSupport("unsupported");
      return;
    }
    xr.isSessionSupported("immersive-ar")
      .then((ok: boolean) => setSupport(ok ? "supported" : "unsupported"))
      .catch(() => setSupport("unsupported"));
  }, []);

  async function startSession() {
    setError(null);
    const container = containerRef.current;
    const xr = (navigator as any).xr;
    if (!container || !xr) return;

    try {
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.xr.enabled = true;
      container.innerHTML = "";
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera();

      const reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.04, 0.05, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x2f6f4f })
      );
      reticle.visible = false;
      scene.add(reticle);

      const markersGroup = new THREE.Group();
      scene.add(markersGroup);

      function redrawMarkers(currentPoints: Point2D[]) {
        markersGroup.clear();
        for (const p of currentPoints) {
          const marker = new THREE.Mesh(
            new THREE.SphereGeometry(0.03, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xd94f4f })
          );
          marker.position.set(p.x, 0, p.y);
          markersGroup.add(marker);
        }
        const loopPoints = closeLoop && currentPoints.length >= 3 ? [...currentPoints, currentPoints[0]!] : currentPoints;
        if (loopPoints.length >= 2) {
          const lineGeom = new THREE.BufferGeometry().setFromPoints(
            loopPoints.map((p) => new THREE.Vector3(p.x, 0, p.y))
          );
          const line = new THREE.Line(lineGeom, new THREE.LineBasicMaterial({ color: 0x2f6f4f }));
          markersGroup.add(line);
        }
      }
      redrawMarkers(points);

      const session: XRSession = await xr.requestSession("immersive-ar", {
        requiredFeatures: ["hit-test"],
      });
      sessionRef.current = session;
      setSessionActive(true);

      await renderer.xr.setSession(session);
      const referenceSpace = await session.requestReferenceSpace("local");
      const viewerSpace = await session.requestReferenceSpace("viewer");
      const hitTestSource = await session.requestHitTestSource!({ space: viewerSpace });

      let lastHitPose: { x: number; y: number } | null = null;

      session.addEventListener("select", () => {
        if (!lastHitPose) return;
        const next = [...pointsRef.current, lastHitPose];
        onPointAddedRef.current(lastHitPose, next);
      });

      const pointsRef = { current: points };
      // Keep the local ref in sync whenever the parent re-renders with new points.
      const syncInterval = setInterval(() => {
        pointsRef.current = points;
        redrawMarkers(points);
      }, 200);

      renderer.setAnimationLoop((_time, frame?: XRFrame) => {
        if (frame) {
          const hitResults = frame.getHitTestResults(hitTestSource!);
          if (hitResults.length > 0) {
            const pose = hitResults[0].getPose(referenceSpace);
            if (pose) {
              reticle.visible = true;
              reticle.matrix.fromArray(pose.transform.matrix);
              reticle.matrix.decompose(reticle.position, reticle.quaternion, reticle.scale);
              lastHitPose = { x: reticle.position.x, y: reticle.position.z };
            }
          } else {
            reticle.visible = false;
            lastHitPose = null;
          }
        }
        renderer.render(scene, camera);
      });

      session.addEventListener("end", () => {
        clearInterval(syncInterval);
        renderer.setAnimationLoop(null);
        setSessionActive(false);
        sessionRef.current = null;
      });
    } catch (err) {
      setError((err as Error).message);
      setSessionActive(false);
    }
  }

  function stopSession() {
    sessionRef.current?.end();
  }

  useEffect(() => {
    return () => {
      sessionRef.current?.end();
    };
  }, []);

  if (support === "checking") {
    return <p>Checking AR camera support…</p>;
  }

  if (support === "unsupported") {
    return (
      <p className="warning">
        AR camera scanning needs WebXR with hit-test (Chrome on Android today). This browser/device doesn't support
        it — use the manual entry below instead.
      </p>
    );
  }

  return (
    <div>
      <div ref={containerRef} className="ar-viewport" />
      {error && <p className="warning">{error}</p>}
      {!sessionActive ? (
        <button onClick={startSession}>Start camera scan</button>
      ) : (
        <button onClick={stopSession}>Stop scanning</button>
      )}
      <p className="hint">Point the camera at the floor, tap the screen to drop a point on each real corner.</p>
    </div>
  );
}

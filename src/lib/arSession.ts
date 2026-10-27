/** The part of THREE.WebGLRenderer that opening an AR session needs. */
export interface ArRenderer {
  xr: {
    setReferenceSpaceType(type: XRReferenceSpaceType): void;
    setSession(session: XRSession): Promise<void>;
  };
}

export interface HitTestSession {
  session: XRSession;
  /** Space the hit poses are read in (real meters, origin where the session started). */
  referenceSpace: XRReferenceSpace;
  hitTestSource: XRHitTestSource;
}

export const AR_UNSUPPORTED_MESSAGE =
  "Este dispositivo no admite el escaneo con la cámara (realidad aumentada). Funciona en Android con Google Chrome " +
  "y ARCore (Servicios de Google Play para RA) actualizado; no funciona en iPhone ni en PC. Usa la entrada manual.";

/**
 * Opens an 'immersive-ar' session with hit-test and hands it to the
 * renderer. Only 'hit-test' is requested, so the renderer must use the
 * 'local' reference space: three.js asks for 'local-floor' by default
 * inside setSession, which a session that did not declare it rejects
 * ("This device does not support the requested reference space type").
 * The official ARButton makes the same call. If any step after
 * requestSession fails, the session is ended before rethrowing so the
 * camera does not stay open.
 */
export async function openHitTestSession(xr: XRSystem, renderer: ArRenderer): Promise<HitTestSession> {
  const session = await xr.requestSession("immersive-ar", { requiredFeatures: ["hit-test"] });
  try {
    renderer.xr.setReferenceSpaceType("local");
    await renderer.xr.setSession(session);
    const referenceSpace = await session.requestReferenceSpace("local");
    const viewerSpace = await session.requestReferenceSpace("viewer");
    const hitTestSource = await session.requestHitTestSource!({ space: viewerSpace });
    return { session, referenceSpace, hitTestSource };
  } catch (err) {
    await endSessionQuietly(session);
    throw err;
  }
}

/** Ends a session, ignoring the error of one that has already ended. */
export async function endSessionQuietly(session: XRSession): Promise<void> {
  try {
    await session.end();
  } catch {
    // Already ended.
  }
}

/** Spanish message for an error raised while starting the AR scan. */
export function describeArError(err: unknown): string {
  const name = (err as { name?: string } | null)?.name;
  if (name === "NotSupportedError") return AR_UNSUPPORTED_MESSAGE;
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "No se pudo abrir la cámara: permite el acceso a la cámara y abre la página con HTTPS.";
  }
  const detail = (err as Error | null)?.message;
  return detail ? `No se pudo iniciar el escaneo con la cámara: ${detail}` : "No se pudo iniciar el escaneo con la cámara.";
}

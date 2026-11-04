import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";

import { roomDetailLoader } from "../lib/roomDetails";
import { sessionRedirect } from "../lib/routes";
import { clearStoredSession, onSessionExpired, readSessionUserId, readUserName } from "../lib/session";

export type SessionState =
  | { status: "checking" }
  | { status: "signedOut" }
  | { status: "signedIn"; userId: string; userName: string | null };

/** Lee la sesión guardada; fuera del navegador (prerenderizado) no hay sesión. */
function readSession(): SessionState {
  const userId = readSessionUserId();
  return userId === null ? { status: "signedOut" } : { status: "signedIn", userId, userName: readUserName() };
}

/**
 * Sesión de la página actual y la redirección que le toca (regla única de lib/routes.ts): "/" con
 * sesión va a Proyectos y las demás rutas sin sesión van a "/". Mientras se comprueba o se redirige,
 * `status` es "checking" y la página no debe pintar nada. Un 401 del backend o `logout()` borran la
 * sesión y la caché de salas, y llevan a "/".
 */
export function useSessionGuard(): { session: SessionState; refresh: () => void; logout: () => void } {
  const router = useRouter();
  const [session, setSession] = useState<SessionState>({ status: "checking" });

  const refresh = useCallback(() => setSession(readSession()), []);

  // localStorage solo existe en el navegador: la sesión se lee después de montar.
  useEffect(() => {
    refresh();
    return onSessionExpired(() => {
      roomDetailLoader.clear();
      refresh();
    });
  }, [refresh]);

  const target =
    session.status === "checking" || !router.isReady
      ? null
      : sessionRedirect(router.pathname, session.status === "signedIn");

  useEffect(() => {
    if (target !== null) void router.replace(target);
  }, [target, router]);

  const logout = useCallback(() => {
    clearStoredSession();
    roomDetailLoader.clear();
    refresh();
  }, [refresh]);

  return { session: target !== null ? { status: "checking" } : session, refresh, logout };
}

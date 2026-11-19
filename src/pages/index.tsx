import { AuthScreen } from "../components/AuthScreen";
import { SessionLoading } from "../components/SessionLoading";
import { useSessionGuard } from "../hooks/useSessionGuard";

/**
 * "/": sin sesión, la pantalla de inicio de sesión; con sesión, useSessionGuard redirige a Proyectos.
 * La pantalla de un proyecto vive ahora en /proyecto/[id] (components/ProjectWorkspace.tsx).
 */
export default function Home() {
  const { session, refresh } = useSessionGuard();
  // Mientras se comprueba la sesión o se redirige, solo la carga neutra (el login no parpadea).
  if (session.status !== "signedOut") return <SessionLoading />;
  return <AuthScreen onAuthenticated={refresh} />;
}

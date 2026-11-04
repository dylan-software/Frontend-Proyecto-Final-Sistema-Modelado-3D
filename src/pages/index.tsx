import { AuthScreen } from "../components/AuthScreen";
import { useSessionGuard } from "../hooks/useSessionGuard";

/**
 * "/": sin sesión, la pantalla de inicio de sesión; con sesión, useSessionGuard redirige a Proyectos.
 * La pantalla de un proyecto vive ahora en /proyecto/[id] (components/ProjectWorkspace.tsx).
 */
export default function Home() {
  const { session, refresh } = useSessionGuard();
  // Mientras se comprueba la sesión o se redirige no se pinta nada (evita el parpadeo del login).
  if (session.status !== "signedOut") return null;
  return <AuthScreen onAuthenticated={refresh} />;
}

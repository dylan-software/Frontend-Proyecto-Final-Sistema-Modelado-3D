import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import { ProjectWorkspace } from "../../components/ProjectWorkspace";
import { useSessionGuard } from "../../hooks/useSessionGuard";
import { es } from "../../i18n/es";
import { roomDetailLoader } from "../../lib/roomDetails";
import { ROUTES } from "../../lib/routes";

/** Id de sala válido de la URL (entero positivo), o null. */
function parseRoomId(value: string | string[] | undefined): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * /proyecto/[id]: la pantalla del proyecto, sin barra superior ni barra lateral. Al salir se olvida
 * la sala en la caché de planos, para que su tarjeta muestre la forma editada.
 */
export default function ProjectPage() {
  const router = useRouter();
  const { session } = useSessionGuard();
  const roomId = router.isReady ? parseRoomId(router.query.id) : null;

  useEffect(() => {
    if (roomId === null) return;
    return () => roomDetailLoader.forget(roomId);
  }, [roomId]);

  if (session.status !== "signedIn" || !router.isReady) return null;

  if (roomId === null) {
    return (
      <div className="project-invalid">
        <p>{es.project.invalidId}</p>
        <Link href={ROUTES.projects} className="project-exit">
          {es.project.exit}
        </Link>
      </div>
    );
  }

  return <ProjectWorkspace key={roomId} roomId={roomId} userId={session.userId} />;
}

import Link from "next/link";

import { es } from "../i18n/es";
import type { PublicProfile } from "../lib/api";
import { ROUTES } from "../lib/routes";
import { authorLabel, publicationCountLabel } from "../lib/social";

/**
 * Cabecera de un perfil público (CONTRATO-HABITA-PERFILES.md, parte A, con recorte): nombre visible (o
 * "Autor anónimo"), número de proyectos y "Tuyo" si es de quien mira. Solo lectura, también para el
 * dueño: el nombre se cambia en el diálogo de publicar. Sin estado (se prueba renderizándolo en el
 * servidor).
 */
export function ProfileHeader({ profile }: { profile: PublicProfile }) {
  const t = es.profile;
  return (
    <div className="page-header">
      <p className="page-subtitle">
        <Link href={ROUTES.social} className="social-back">
          {t.backToSocial}
        </Link>
      </p>
      <h1 className="page-title">{authorLabel(profile)}</h1>
      <p className="profile-header-count">
        {profile.mine && <span className="publication-mine">{es.social.mine}</span>} {t.title} ·{" "}
        {publicationCountLabel(profile.publicationCount)}
      </p>
    </div>
  );
}

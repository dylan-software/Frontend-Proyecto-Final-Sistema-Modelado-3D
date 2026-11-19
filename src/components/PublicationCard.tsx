import Link from "next/link";
import type { CSSProperties } from "react";

import { es } from "../i18n/es";
import type { PublicationAuthor, PublicPublication } from "../lib/api";
import { formatAreaM2, formatMeters } from "../lib/projects";
import { ROUTES } from "../lib/routes";
import { authorLabel, formatPublishedDate, publicationCountLabel } from "../lib/social";
import { IconCopy } from "./icons";
import { RoomPlanThumbnail } from "./RoomPlanThumbnail";

/** Autor de la tarjeta en el catálogo por autor (CONTRATO-HABITA-PERFILES.md). */
export interface PublicationByline {
  /** null = sin perfil: "Autor anónimo" y sin enlace. */
  author: PublicationAuthor | null;
  /** Publicaciones públicas del autor. */
  count: number;
}

interface PublicationCardProps {
  publication: PublicPublication;
  /**
   * Línea del autor con "Ver perfil". Opcional: dentro del propio perfil no se muestra (la cabecera ya
   * dice de quién es).
   */
  byline?: PublicationByline | null;
  /** Posición en la cuadrícula, para escalonar la aparición. */
  index: number;
  /** true mientras se copia ESTA publicación. */
  copying: boolean;
  /** true mientras se copia cualquier publicación: solo una copia a la vez. */
  disabled: boolean;
  error: string | null;
  onCopy: (code: string) => void;
}

/**
 * Tarjeta del catálogo de la red social: planta, título, área, descripción, autor (si se pide), cifras y
 * "Copiar a mis proyectos". Solo muestra lo que llega del backend como público: nada de correos ni ids
 * internos; del autor, solo el nombre visible que eligió (o "Autor anónimo") y su código público.
 */
export function PublicationCard({
  publication,
  byline = null,
  index,
  copying,
  disabled,
  error,
  onCopy,
}: PublicationCardProps) {
  const t = es.social;
  const { title, description, room } = publication;
  const date = formatPublishedDate(publication.publishedAt);
  const facts = [
    t.itemCount(publication.itemCount),
    t.height(formatMeters(room.heightM)),
    t.copies(publication.copies),
  ];

  return (
    <li className="project-card-item" style={{ "--i": Math.min(index, 12) } as CSSProperties}>
      <article className="project-card glass publication-card">
        <span className="project-card-plan">
          <RoomPlanThumbnail vertices={room.vertices} label={t.plan(title)} />
        </span>
        <div className="project-card-body">
          <h2 className="project-card-name publication-title" title={title}>
            {title}
          </h2>
          <span className="project-card-area">{formatAreaM2(room.areaM2)}</span>
        </div>
        <p className={`publication-description${description ? "" : " project-card-description-empty"}`}>
          {description ?? t.noDescription}
        </p>
        {byline && (
          <p className="publication-author">
            <span className="publication-author-name">{authorLabel(byline.author)}</span>
            <span className="publication-author-count">{publicationCountLabel(byline.count)}</span>
            {byline.author && (
              <Link
                href={ROUTES.profile(byline.author.code)}
                className="publication-author-link"
                aria-label={es.profile.viewProfileLabel(authorLabel(byline.author))}
              >
                {es.profile.viewProfile}
              </Link>
            )}
          </p>
        )}
        <p className="publication-facts">
          {publication.mine && <span className="publication-mine">{t.mine}</span>}
          <span>{facts.join(" · ")}</span>
        </p>
        {date && <p className="publication-date">{t.publishedOn(date)}</p>}
        <div className="project-card-footer">
          <button
            type="button"
            className="new-group-button publication-copy"
            onClick={() => onCopy(publication.code)}
            disabled={disabled}
            aria-label={t.copyLabel(title)}
          >
            <IconCopy size={18} />
            {copying ? t.copying : t.copy}
          </button>
        </div>
        {error && (
          <p className="project-card-error" role="alert">
            {error}
          </p>
        )}
      </article>
    </li>
  );
}

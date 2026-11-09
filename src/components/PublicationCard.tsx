import type { CSSProperties } from "react";

import { es } from "../i18n/es";
import type { PublicPublication } from "../lib/api";
import { formatAreaM2, formatMeters } from "../lib/projects";
import { formatPublishedDate } from "../lib/social";
import { RoomPlanThumbnail } from "./RoomPlanThumbnail";

interface PublicationCardProps {
  publication: PublicPublication;
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
 * Tarjeta del catálogo de la red social: planta, título, área, descripción, cifras y "Copiar a mis
 * proyectos". Solo muestra lo que llega del backend como público: nada de correos, nombres ni ids.
 */
export function PublicationCard({ publication, index, copying, disabled, error, onCopy }: PublicationCardProps) {
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

import type { CSSProperties } from "react";

import { es } from "../i18n/es";

interface NewProjectCardProps {
  onCreate: () => void;
  creating: boolean;
  disabled?: boolean;
}

/** Primera tarjeta de la cuadrícula: crea una sala de 4 × 3 m y 2,5 m de alto y la abre. */
export function NewProjectCard({ onCreate, creating, disabled = false }: NewProjectCardProps) {
  const t = es.projects;
  return (
    <li className="project-card-item" style={{ "--i": 0 } as CSSProperties}>
      <button
        type="button"
        className="new-project-card"
        onClick={onCreate}
        disabled={disabled || creating}
        aria-busy={creating}
      >
        <span className="new-project-icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" width="48" height="48">
            <path d="M24 10v28M10 24h28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </span>
        <span className="new-project-title">{creating ? t.creating : t.newProject}</span>
        <span className="new-project-hint">{t.newProjectHint}</span>
      </button>
    </li>
  );
}

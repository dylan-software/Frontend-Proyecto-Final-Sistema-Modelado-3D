import type { CSSProperties } from "react";

import { es } from "../i18n/es";
import { IconPlus } from "./icons";

interface NewProjectCardProps {
  onCreate: () => void;
  creating: boolean;
  disabled?: boolean;
  /** Título de la tarjeta: "Nuevo proyecto" (sin grupo) o "Proyecto aquí" (dentro de un grupo). */
  title?: string;
}

/** Primera tarjeta de la cuadrícula: crea una sala de 4 × 3 m y 2,5 m de alto y la abre. */
export function NewProjectCard({ onCreate, creating, disabled = false, title }: NewProjectCardProps) {
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
          <IconPlus size={28} />
        </span>
        <span className="new-project-title">{creating ? t.creating : (title ?? t.newProject)}</span>
        <span className="new-project-hint">{t.newProjectHint}</span>
      </button>
    </li>
  );
}

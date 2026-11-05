import type { ReactNode } from "react";

import { es } from "../i18n/es";
import type { ProjectGroup, RoomSummary } from "../lib/api";
import { checkDescription, checkPlainName, MAX_GROUP_NAME_LENGTH } from "../lib/groups";
import { InlineEdit } from "./InlineEdit";
import { NewProjectCard } from "./NewProjectCard";
import { ProjectCard } from "./ProjectCard";

interface GroupSectionProps {
  /** El grupo, o null para la sección "Proyectos sin grupo". */
  group: ProjectGroup | null;
  rooms: RoomSummary[];
  /** Todos los grupos de la cuenta, para "Mover a grupo". */
  groups: ProjectGroup[];
  /** Total de proyectos de la sección sin filtrar (la búsqueda puede ocultar algunos). */
  total: number;
  creating: boolean;
  disabled?: boolean;
  onCreateProject: () => void;
  onMove: (roomId: number, groupId: number | null) => Promise<void>;
  onUpdateGroup?: (changes: { name?: string; description?: string | null }) => Promise<void>;
  /** Contenido extra bajo la cuadrícula (p. ej. el mensaje de lista vacía). */
  footer?: ReactNode;
}

/**
 * Una "lámina" de la pantalla de Proyectos: cabecera con el nombre y la descripción del grupo, editables
 * en el sitio, y la cuadrícula con la tarjeta "+" y una tarjeta por proyecto. Sin grupo, la cabecera es
 * fija ("Proyectos sin grupo").
 */
export function GroupSection({
  group,
  rooms,
  groups,
  total,
  creating,
  disabled = false,
  onCreateProject,
  onMove,
  onUpdateGroup,
  footer,
}: GroupSectionProps) {
  const t = es.groups;

  return (
    <section
      className={`group-section${group ? "" : " group-section-ungrouped"}`}
      aria-label={group ? group.name : t.ungroupedTitle}
    >
      <header className="group-section-header">
        <div className="group-section-title-row">
          {group && onUpdateGroup ? (
            <InlineEdit
              as="h2"
              className="group-section-title"
              kind="name"
              value={group.name}
              editLabel={t.editGroupName(group.name)}
              check={(text) => checkPlainName(text, MAX_GROUP_NAME_LENGTH)}
              onSave={(name) => onUpdateGroup({ name: name ?? group.name })}
            />
          ) : (
            <h2 className="group-section-title">{t.ungroupedTitle}</h2>
          )}
          <span className="group-section-count">{t.projectCount(total)}</span>
        </div>
        {group && onUpdateGroup && (
          <InlineEdit
            as="p"
            className="group-section-description"
            kind="description"
            value={group.description}
            placeholder={t.noDescription}
            editLabel={t.editGroupDescription(group.name)}
            check={checkDescription}
            onSave={(description) => onUpdateGroup({ description })}
          />
        )}
      </header>

      <ul className="project-grid">
        <NewProjectCard
          onCreate={onCreateProject}
          creating={creating}
          disabled={disabled}
          title={group ? t.projectHere : undefined}
        />
        {rooms.map((room, i) => (
          <ProjectCard key={room.id} room={room} index={i + 1} groups={groups} onMove={onMove} />
        ))}
      </ul>
      {group && total === 0 && <p className="group-section-empty">{t.emptyGroup}</p>}
      {footer}
    </section>
  );
}

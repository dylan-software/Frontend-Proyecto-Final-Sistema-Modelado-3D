import { useEffect, useId, useState, type ReactNode } from "react";

import { es } from "../i18n/es";
import type { ProjectGroup, RoomSummary } from "../lib/api";
import { checkDescription, checkPlainName, MAX_GROUP_NAME_LENGTH } from "../lib/groups";
import { readGroupOpen, saveGroupOpen } from "../lib/uiPrefs";
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
 * fija ("Proyectos sin grupo"). La flecha de la cabecera pliega o despliega la cuadrícula y el estado
 * se recuerda por grupo en este navegador (lib/uiPrefs.ts, solo "true"/"false").
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
  const groupId = group ? group.id : null;
  const title = group ? group.name : t.ungroupedTitle;
  const bodyId = useId();
  // Desplegada en el servidor y en el primer render; el estado recordado se aplica al montar (sin
  // desajuste de hidratación).
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen(readGroupOpen(groupId));
  }, [groupId]);

  function toggle() {
    const next = !open;
    setOpen(next);
    saveGroupOpen(groupId, next);
  }

  return (
    <section
      className={`group-section${group ? "" : " group-section-ungrouped"}${open ? "" : " group-section-closed"}`}
      aria-label={title}
    >
      <header className="group-section-header">
        <div className="group-section-title-row">
          <button
            type="button"
            className="group-section-toggle"
            aria-expanded={open}
            aria-controls={bodyId}
            aria-label={open ? t.collapse(title) : t.expand(title)}
            title={open ? t.collapse(title) : t.expand(title)}
            onClick={toggle}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path
                d="M4 6l4 4 4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
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

      <div id={bodyId} className="group-section-body" hidden={!open}>
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
      </div>
    </section>
  );
}

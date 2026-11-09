import Link from "next/link";
import { useEffect, useId, useState, type CSSProperties } from "react";

import { es } from "../i18n/es";
import type { ProjectGroup, RoomDetail, RoomSummary } from "../lib/api";
import { formatAreaM2, polygonAreaM2, rectangleVertices } from "../lib/projects";
import { roomDetailLoader } from "../lib/roomDetails";
import { ROUTES } from "../lib/routes";
import { IconMore } from "./icons";
import { PublishProjectButton } from "./PublishProjectButton";
import { RoomPlanThumbnail } from "./RoomPlanThumbnail";

interface ProjectCardProps {
  room: RoomSummary;
  /** Posición en la cuadrícula, para escalonar la aparición. */
  index: number;
  /** Grupos de la cuenta, para "Mover a grupo". */
  groups: ProjectGroup[];
  /** Mueve el proyecto a otro grupo (null = sin grupo); si lanza, la tarjeta muestra el error. */
  onMove: (roomId: number, groupId: number | null) => Promise<void>;
}

/**
 * La sala completa (con vértices) desde la caché compartida: como mucho 4 peticiones a la vez. null
 * mientras llega o si falla; entonces la tarjeta dibuja el rectángulo ancho × fondo.
 */
function useRoomDetail(roomId: number): RoomDetail | null {
  const [detail, setDetail] = useState<RoomDetail | null>(() => roomDetailLoader.peek(roomId) ?? null);
  useEffect(() => {
    let active = true;
    roomDetailLoader.load(roomId).then(
      (room) => {
        if (active) setDetail(room);
      },
      () => {
        // Sin plano real: se queda el rectángulo provisional (el error no bloquea la tarjeta).
      }
    );
    return () => {
      active = false;
    };
  }, [roomId]);
  return detail;
}

/**
 * Tarjeta de un proyecto: plano, nombre, área y una línea de descripción, todo como enlace al proyecto.
 * Debajo, fuera del enlace, "Mover a grupo" con un selector nativo (teclado y móvil sin código propio)
 * y "Más acciones" (tres puntos), que despliega "Publicar en Habita": el mismo PublishProjectButton de
 * la pantalla del proyecto, con sus diálogos como modales. Solo se monta al desplegar el menú, así que
 * el estado de publicación se pide al abrirlo y no por cada tarjeta al cargar la lista.
 */
export function ProjectCard({ room, index, groups, onMove }: ProjectCardProps) {
  const t = es.projects;
  const g = es.groups;
  const detail = useRoomDetail(room.id);
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const selectId = useId();
  const actionsId = useId();
  const vertices = detail?.vertices ?? rectangleVertices(room.ancho, room.profundidad);
  const area = detail ? formatAreaM2(detail.areaM2) : t.approxArea(formatAreaM2(polygonAreaM2(vertices)));
  // El nombre y la descripción de la lista son los más recientes (la caché de planos puede ser anterior).
  const name = room.nombre;
  const description = room.description ?? null;

  async function handleMove(value: string) {
    const groupId = value === "" ? null : Number(value);
    setMoving(true);
    setMoveError(null);
    try {
      await onMove(room.id, groupId);
    } catch (err) {
      setMoveError(g.moveFailed((err as Error).message));
    } finally {
      setMoving(false);
    }
  }

  return (
    <li className="project-card-item" style={{ "--i": Math.min(index, 12) } as CSSProperties}>
      <div className="project-card glass">
        <Link href={ROUTES.project(room.id)} className="project-card-link" aria-label={t.open(name, area)}>
          <span className="project-card-plan">
            <RoomPlanThumbnail
              vertices={vertices}
              provisional={!detail}
              label={detail ? name : `${name}. ${t.planPending}`}
            />
          </span>
          <span className="project-card-body">
            <span className="project-card-name">{name}</span>
            <span className="project-card-area">{area}</span>
          </span>
          <span className={`project-card-description${description ? "" : " project-card-description-empty"}`}>
            {description ?? g.noDescription}
          </span>
        </Link>
        <div className="project-card-footer">
          <label className="visually-hidden" htmlFor={selectId}>
            {g.moveLabel(name)}
          </label>
          <select
            id={selectId}
            className="project-card-move"
            value={room.group_id ?? ""}
            disabled={moving}
            title={g.moveTitle}
            onChange={(e) => void handleMove(e.target.value)}
          >
            <option value="">{g.noGroupOption}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          {moving && <span className="project-card-moving">{g.moving}</span>}
          <button
            type="button"
            className="project-card-more"
            aria-expanded={actionsOpen}
            aria-controls={actionsId}
            aria-label={t.moreActions(name)}
            title={t.moreActionsTitle}
            onClick={() => setActionsOpen((open) => !open)}
          >
            <IconMore size={18} />
          </button>
        </div>
        <div id={actionsId} className="project-card-actions" hidden={!actionsOpen}>
          {actionsOpen && <PublishProjectButton room={{ id: room.id, name }} variant="card" />}
        </div>
        {moveError && (
          <p className="project-card-error" role="alert">
            {moveError}
          </p>
        )}
      </div>
    </li>
  );
}

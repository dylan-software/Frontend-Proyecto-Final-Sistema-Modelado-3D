import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";

import { es } from "../i18n/es";
import type { RoomDetail, RoomSummary } from "../lib/api";
import { formatAreaM2, polygonAreaM2, rectangleVertices } from "../lib/projects";
import { roomDetailLoader } from "../lib/roomDetails";
import { ROUTES } from "../lib/routes";
import { RoomPlanThumbnail } from "./RoomPlanThumbnail";

interface ProjectCardProps {
  room: RoomSummary;
  /** Posición en la cuadrícula, para escalonar la aparición. */
  index: number;
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

/** Tarjeta de un proyecto: plano, nombre y área. Toda la tarjeta es el enlace al proyecto. */
export function ProjectCard({ room, index }: ProjectCardProps) {
  const t = es.projects;
  const detail = useRoomDetail(room.id);
  const vertices = detail?.vertices ?? rectangleVertices(room.ancho, room.profundidad);
  const area = detail ? formatAreaM2(detail.areaM2) : t.approxArea(formatAreaM2(polygonAreaM2(vertices)));
  const name = detail?.name ?? room.nombre;

  return (
    <li className="project-card-item" style={{ "--i": Math.min(index, 12) } as CSSProperties}>
      <Link href={ROUTES.project(room.id)} className="project-card glass" aria-label={t.open(name, area)}>
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
      </Link>
    </li>
  );
}

import { es } from "../i18n/es";
import type { RoomItem } from "./api";

/** Por debajo de esta altura (metros) un objeto se considera apoyado en el suelo (medio centímetro). */
const FLOOR_TOLERANCE_M = 0.005;

/** Una línea de la lista "Objetos del proyecto", ya en texto legible y sin coordenadas. */
export interface RoomItemLine {
  id: number;
  name: string;
  /** "En el suelo" o "A 1,40 m del suelo". */
  place: string;
  /** "2,00 × 0,90 × 0,75 m" (ancho × fondo × alto). */
  size: string;
  /** La misma medida dicha con palabras, para lectores de pantalla. */
  sizeLabel: string;
  /** Si el objeto está levantado del suelo (p. ej. un cuadro o una repisa). */
  raised: boolean;
}

/** Metros con dos decimales y coma decimal: 1.4 -> "1,40". Sin depender del ICU del entorno. */
export function formatMeters(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  return safe.toFixed(2).replace(".", ",");
}

/**
 * Arma la línea de un objeto de la sala: nombre, altura sobre el suelo y medidas. Nunca muestra x, y
 * ni la rotación: son coordenadas internas del plano, no información útil para el usuario.
 */
export function describeRoomItem(item: RoomItem): RoomItemLine {
  const t = es.projectObjects;
  const raised = Number.isFinite(item.elevationM) && item.elevationM >= FLOOR_TOLERANCE_M;
  const width = formatMeters(item.widthM);
  const depth = formatMeters(item.depthM);
  const height = formatMeters(item.heightM);
  return {
    id: item.id,
    name: item.name.trim() || "—",
    place: raised ? t.aboveFloor(`${formatMeters(item.elevationM)} m`) : t.onFloor,
    size: t.size(width, depth, height),
    sizeLabel: t.sizeLabel(width, depth, height),
    raised,
  };
}

/** Texto comparable: sin tildes, en minúsculas y con los espacios colapsados ("  Sofá " -> "sofa"). */
export function normalizeForFilter(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Objetos cuyo nombre contiene el texto del filtro, sin distinguir tildes ni mayúsculas. Con el filtro
 * vacío devuelve todos. Conserva el orden de la lista original.
 */
export function filterRoomItems<T extends { name: string }>(items: readonly T[], query: string): T[] {
  const needle = normalizeForFilter(query);
  if (!needle) return [...items];
  return items.filter((item) => normalizeForFilter(item.name).includes(needle));
}

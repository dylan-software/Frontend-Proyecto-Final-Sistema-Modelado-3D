import { es } from "../i18n/es";
import type { RoomItem } from "./api";

/** Distancia en metros entre la tapa de una caja y su rótulo. */
export const LABEL_GAP_M = 0.12;

export type Vec3 = [number, number, number];

/** Un objeto de la sala listo para three.js: tamaño y centro de la caja, y dónde va su rótulo. */
export interface SceneBox {
  id: number;
  label: string;
  /** [ancho (x), alto (y), fondo (z)] en metros. */
  size: Vec3;
  center: Vec3;
  labelAt: Vec3;
  /** Colgado de la pared o apoyado sobre algo (base por encima del suelo). */
  raised: boolean;
}

/** Rótulo de una caja: su nombre y, si no está en el suelo, la altura de su base. */
export function boxLabel(name: string, elevationM: number): string {
  return elevationM > 0 ? `${name} · ${es.photo.scene.elevation(elevationM)}` : name;
}

/**
 * Convierte un RoomItem (esquina mínima de la huella, eje y del plano = eje z en 3D) en una caja
 * centrada en three.js, con la base a elevationM sobre el suelo.
 *
 * @returns null si alguna medida no es un número finito o el tamaño no es positivo.
 */
export function toSceneBox(item: RoomItem): SceneBox | null {
  const { x, y, widthM, depthM, heightM, elevationM } = item;
  const values = [x, y, widthM, depthM, heightM, elevationM];
  if (!values.every(Number.isFinite) || widthM <= 0 || depthM <= 0 || heightM <= 0) return null;
  const base = Math.max(0, elevationM);
  const centerX = x + widthM / 2;
  const centerZ = y + depthM / 2;
  return {
    id: item.id,
    label: boxLabel(item.name, base),
    size: [widthM, heightM, depthM],
    center: [centerX, base + heightM / 2, centerZ],
    labelAt: [centerX, base + heightM + LABEL_GAP_M, centerZ],
    raised: base > 0,
  };
}

/** Las cajas que se pueden dibujar; los objetos con medidas inválidas se omiten. */
export function toSceneBoxes(items: RoomItem[]): SceneBox[] {
  return items.map(toSceneBox).filter((box): box is SceneBox => box !== null);
}

/**
 * Exportar un proyecto como archivo "habita-project" (versión 1), en el navegador y sin ruta del backend
 * (CONTRATO-FASE6.md, secciones 1 y 2).
 *
 * El archivo NO lleva datos personales: ni ids (de sala, de objeto o de cuenta), ni correos, ni grupo,
 * ni descripción, ni fechas. Solo el nombre, la forma, el alto y, por objeto, su nombre, medidas y
 * posición. Las claves van en snake_case: es el formato del archivo, no el de la API.
 */
import { es } from "../i18n/es";
import type { RoomDetail, RoomItem } from "./api";

export const PROJECT_FILE_FORMAT = "habita-project";
export const PROJECT_FILE_VERSION = 1;
/** Máximo de caracteres del nombre del archivo descargado (sin la extensión). */
export const MAX_FILE_NAME_LENGTH = 60;

export type WallSide = "back" | "front" | "left" | "right";

export interface ProjectFilePart {
  shape: "box" | "cylinder" | "sphere" | "plane";
  size_cm: [number, number, number];
  offset_cm: [number, number, number];
  color: string;
}

export interface ProjectFileItem {
  name: string;
  category: string | null;
  kind: "floor" | "wall";
  /** [ancho (eje x), alto, fondo (eje z)] en cm. */
  size_cm: [number, number, number];
  /** x_m/z_m: CENTRO de la huella, en metros; elevation_m: altura de la base. */
  position: { x_m: number; z_m: number; elevation_m: number; rotation_deg: number };
  wall: WallSide | null;
  parts: ProjectFilePart[];
}

export interface ProjectFile {
  format: typeof PROJECT_FILE_FORMAT;
  version: typeof PROJECT_FILE_VERSION;
  name: string;
  room: { height_m: number; vertices: [number, number][]; estimated: boolean };
  items: ProjectFileItem[];
}

/** Lo que se exporta: la sala y sus objetos tal como los devuelve la API. */
export interface ProjectSnapshot {
  room: RoomDetail;
  items: RoomItem[];
}

/** Un formato de exportación: hoy solo JSON; mañana podría haber otro (p. ej. GLB) con la misma interfaz. */
export interface ProjectExporter {
  readonly mimeType: string;
  readonly extension: string;
  serialize(project: ProjectSnapshot): string;
  fileName(projectName: string): string;
}

/** Redondea a `decimals` cifras decimales (evita 60.00000000000001 en el archivo). */
function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Nombre de archivo seguro: letras y dígitos (con tildes), "-" y "_"; el resto pasa a "_". */
export function safeFileName(projectName: string, extension: string): string {
  const base = Array.from(
    projectName
      .normalize("NFC")
      .replace(/[^\p{L}\p{N}_-]+/gu, "_")
      .replace(/^_+/, "")
  )
    .slice(0, MAX_FILE_NAME_LENGTH)
    .join("")
    .replace(/_+$/, "");
  return `${base || es.projectTransfer.defaultFileName}${extension}`;
}

/** Exportador al archivo JSON "habita-project", versión 1. */
export class JsonProjectExporter implements ProjectExporter {
  readonly mimeType = "application/json";
  readonly extension = ".json";

  /** El documento del archivo, construido campo a campo (nunca copiando objetos de la API). */
  toDocument({ room, items }: ProjectSnapshot): ProjectFile {
    return {
      format: PROJECT_FILE_FORMAT,
      version: PROJECT_FILE_VERSION,
      name: room.name,
      room: {
        height_m: room.heightM,
        vertices: room.vertices.map((vertex) => [vertex.x, vertex.y] as [number, number]),
        // No se guarda en el backend: un proyecto guardado ya no es una estimación de la foto.
        estimated: false,
      },
      items: items.map((item) => ({
        name: item.name,
        category: null,
        // Misma regla que el backend: un objeto levantado es de pared.
        kind: item.elevationM > 0 ? "wall" : "floor",
        size_cm: [round(item.widthM * 100, 4), round(item.heightM * 100, 4), round(item.depthM * 100, 4)],
        position: {
          // La API da la esquina mínima; el archivo, el centro.
          x_m: round(item.x + item.widthM / 2, 6),
          z_m: round(item.y + item.depthM / 2, 6),
          elevation_m: item.elevationM,
          rotation_deg: 0,
        },
        wall: null,
        parts: [],
      })),
    };
  }

  serialize(project: ProjectSnapshot): string {
    return `${JSON.stringify(this.toDocument(project), null, 2)}\n`;
  }

  fileName(projectName: string): string {
    return safeFileName(projectName, this.extension);
  }
}

/**
 * Descarga el proyecto en el navegador con un Blob y un enlace temporal. Nada sale del navegador.
 */
export function downloadProject(exporter: ProjectExporter, project: ProjectSnapshot): void {
  const blob = new Blob([exporter.serialize(project)], { type: exporter.mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = exporter.fileName(project.room.name);
  link.rel = "noopener";
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Tras el clic el navegador ya tiene el archivo; se libera la URL en el siguiente ciclo.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

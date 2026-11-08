/**
 * Funciones puras de la pantalla de proyectos: plano SVG de una sala, área, filtro por nombre,
 * nombre del proyecto nuevo e inicial del usuario. Sin React ni red, para poder probarlas solas.
 * Un "proyecto" es una sala del backend; todo va en metros.
 */
import type { Point2D } from "./api";

/** Medidas del proyecto nuevo: 4 x 3 m de planta y 2,5 m de alto (decisión 41). */
export const NEW_PROJECT_WIDTH_M = 4;
export const NEW_PROJECT_DEPTH_M = 3;
export const NEW_PROJECT_HEIGHT_M = 2.5;

/** Máximo de caracteres del nombre de una sala (el backend responde 422 por encima). */
export const MAX_PROJECT_NAME_LENGTH = 120;

/** Caja delimitadora de una sala, en metros. */
export interface PlanBounds {
  minX: number;
  minY: number;
  width: number;
  depth: number;
}

/** Caja delimitadora de los vértices; con una lista vacía, todo a 0. */
export function planBounds(vertices: Point2D[]): PlanBounds {
  if (vertices.length === 0) return { minX: 0, minY: 0, width: 0, depth: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { x, y } of vertices) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, width: maxX - minX, depth: maxY - minY };
}

/** Rectángulo de ancho x fondo con la esquina en el origen: el plano provisional de una tarjeta. */
export function rectangleVertices(widthM: number, depthM: number): Point2D[] {
  return [
    { x: 0, y: 0 },
    { x: widthM, y: 0 },
    { x: widthM, y: depthM },
    { x: 0, y: depthM },
  ];
}

/**
 * Plano encajado en un lienzo SVG: el atributo `points`, la escala usada (unidades SVG por metro) y
 * la caja delimitadora ya encajada (para dibujar las cotas), en unidades SVG.
 */
export interface FittedPlan {
  points: string;
  scale: number;
  box: { x: number; y: number; width: number; height: number };
}

/**
 * Encaja el polígono en un lienzo de `width` x `height` con `padding` de margen, centrado y sin
 * deformarlo. El eje y del plano crece hacia abajo, igual que en el SVG. Coordenadas con 2 decimales.
 */
export function fitPlanToBox(vertices: Point2D[], width: number, height: number, padding = 0): FittedPlan {
  if (vertices.length === 0) return { points: "", scale: 0, box: { x: width / 2, y: height / 2, width: 0, height: 0 } };
  const bounds = planBounds(vertices);
  const innerW = Math.max(width - 2 * padding, 0);
  const innerH = Math.max(height - 2 * padding, 0);
  // Una sala degenerada (todo en una línea) no divide por cero: su lado nulo no limita la escala.
  const scaleX = bounds.width > 0 ? innerW / bounds.width : Infinity;
  const scaleY = bounds.depth > 0 ? innerH / bounds.depth : Infinity;
  const scale = Number.isFinite(Math.min(scaleX, scaleY)) ? Math.min(scaleX, scaleY) : 0;
  const offsetX = (width - bounds.width * scale) / 2;
  const offsetY = (height - bounds.depth * scale) / 2;
  const round = (n: number) => Math.round(n * 100) / 100;
  const points = vertices
    .map(({ x, y }) => `${round(offsetX + (x - bounds.minX) * scale)},${round(offsetY + (y - bounds.minY) * scale)}`)
    .join(" ");
  const box = {
    x: round(offsetX),
    y: round(offsetY),
    width: round(bounds.width * scale),
    height: round(bounds.depth * scale),
  };
  return { points, scale, box };
}

/** Área del polígono en m² (fórmula del cordón de zapato); el sentido de los vértices no importa. */
export function polygonAreaM2(vertices: Point2D[]): number {
  if (vertices.length < 3) return 0;
  let twice = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i]!;
    const b = vertices[(i + 1) % vertices.length]!;
    twice += a.x * b.y - b.x * a.y;
  }
  return Math.abs(twice) / 2;
}

/** Número con coma decimal y los decimales indicados, p. ej. 12,5 -> "12,50". */
function decimalEs(value: number, digits: number): string {
  return value.toFixed(digits).replace(".", ",");
}

/** "12,50 m²". */
export function formatAreaM2(areaM2: number): string {
  return `${decimalEs(areaM2, 2)} m²`;
}

/** Cota en metros con hasta dos decimales y sin ceros sobrantes: 4 -> "4 m", 3.5 -> "3,5 m". */
export function formatMeters(meters: number): string {
  const rounded = Math.round(meters * 100) / 100;
  return `${String(rounded).replace(".", ",")} m`;
}

/** Texto en minúsculas y sin tildes, para comparar nombres. */
export function normalizeName(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * Proyectos cuyo nombre contiene la búsqueda, sin distinguir mayúsculas ni tildes. Una búsqueda
 * vacía devuelve la lista entera. Mantiene el orden original.
 */
export function filterProjects<T extends { nombre: string }>(projects: T[], query: string): T[] {
  const needle = normalizeName(query);
  if (!needle) return projects;
  return projects.filter((project) => normalizeName(project.nombre).includes(needle));
}

/**
 * Nombre libre para un proyecto nuevo: `base` si nadie lo usa; si no, "base 2", "base 3"… con el
 * menor número libre. Compara sin distinguir mayúsculas, tildes ni espacios de los extremos.
 *
 * @deprecated Sin uso desde 2fe7107: el nombre por defecto es "Prueba N" y lo calcula `nextTestName`
 * (lib/groups.ts). Se conserva sin borrar.
 */
export function nextProjectName(existingNames: string[], base: string): string {
  const taken = new Set(existingNames.map(normalizeName));
  if (!taken.has(normalizeName(base))) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base} ${n}`;
    if (!taken.has(normalizeName(candidate))) return candidate;
  }
}

/** Cuerpo de POST /api/v1/spaces/rooms para un proyecto nuevo de 4 x 3 x 2,5 m. */
export function newProjectRoom(name: string): { name: string; vertices: Point2D[]; heightM: number } {
  return {
    name: name.slice(0, MAX_PROJECT_NAME_LENGTH),
    vertices: rectangleVertices(NEW_PROJECT_WIDTH_M, NEW_PROJECT_DEPTH_M),
    heightM: NEW_PROJECT_HEIGHT_M,
  };
}

/**
 * Inicial que muestra el chip de usuario: la primera letra o cifra del nombre, en mayúscula. Respeta
 * caracteres de más de una unidad UTF-16. Sin nombre utilizable, la de `fallback`.
 */
export function userInitial(name: string | null, fallback: string): string {
  const pick = (text: string) => Array.from(text).find((ch) => /[\p{L}\p{N}]/u.test(ch));
  const ch = (name && pick(name)) || pick(fallback) || "?";
  return ch.toLocaleUpperCase("es");
}

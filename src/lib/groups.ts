/**
 * Funciones puras de los grupos de proyectos (CONTRATO-GRUPOS.md): agrupar las salas por grupo, el nombre
 * por defecto "Prueba N" y la validación de nombres y descripciones con las mismas reglas que el backend.
 */
import { es } from "../i18n/es";
import type { ProjectGroup, RoomSummary } from "./api";
import { normalizeName } from "./projects";

export const MAX_GROUP_NAME_LENGTH = 80;
export const MAX_PROJECT_NAME_LENGTH = 120;
export const MAX_DESCRIPTION_LENGTH = 1000;

/** Caracteres de control (Unicode Cc y Cf). */
const CONTROL = /[\p{Cc}\p{Cf}]/u;
/** Controles permitidos en una descripción: saltos de línea y tabulador. */
const ALLOWED_IN_DESCRIPTION = new Set(["\n", "\r", "\t"]);

/** Longitud en caracteres (puntos de código), como la cuenta el backend. */
export function charCount(text: string): number {
  return Array.from(text).length;
}

/**
 * "Prueba N" con el menor N (desde 1) que no usa ningún nombre de la lista, comparando sin mayúsculas,
 * tildes ni espacios de los extremos. La lista son los nombres de UN grupo (o los proyectos sin grupo).
 */
export function nextTestName(existingNames: string[], base: string = es.groups.testBase): string {
  const taken = new Set(existingNames.map(normalizeName));
  for (let n = 1; ; n++) {
    const candidate = `${base} ${n}`;
    if (!taken.has(normalizeName(candidate))) return candidate;
  }
}

/** Un grupo con sus proyectos. */
export interface GroupWithProjects<R> {
  group: ProjectGroup;
  rooms: R[];
}

/**
 * Reparte las salas entre sus grupos (en orden de id) y "sin grupo". Una sala cuyo group_id no está en la
 * lista de grupos (o falta) cuenta como sin grupo. Las salas quedan en orden de id dentro de cada sección.
 */
export function groupProjects<R extends Pick<RoomSummary, "id" | "group_id">>(
  rooms: R[],
  groups: ProjectGroup[]
): { sections: GroupWithProjects<R>[]; ungrouped: R[] } {
  const byId = (a: { id: number }, b: { id: number }) => a.id - b.id;
  const sections = [...groups].sort(byId).map((group) => ({ group, rooms: [] as R[] }));
  const index = new Map(sections.map((section) => [section.group.id, section]));
  const ungrouped: R[] = [];
  for (const room of [...rooms].sort(byId)) {
    const section = room.group_id != null ? index.get(room.group_id) : undefined;
    if (section) section.rooms.push(room);
    else ungrouped.push(room);
  }
  return { sections, ungrouped };
}

export type TextCheck<T> = { ok: true; value: T } | { ok: false; error: string };

/** Nombre en texto plano: sin espacios en los extremos, de 1 a max caracteres, sin < > ni controles. */
export function checkPlainName(text: string, max: number): TextCheck<string> {
  const value = text.trim();
  const length = charCount(value);
  if (length === 0) return { ok: false, error: es.groups.validation.nameRequired };
  if (length > max) return { ok: false, error: es.groups.validation.nameTooLong(max) };
  if (/[<>]/.test(value) || CONTROL.test(value)) return { ok: false, error: es.groups.validation.nameChars };
  return { ok: true, value };
}

/** Descripción libre: vacía es null; hasta 1000 caracteres; solo saltos de línea y tabuladores como controles. */
export function checkDescription(text: string): TextCheck<string | null> {
  const value = text.trim();
  if (!value) return { ok: true, value: null };
  if (charCount(value) > MAX_DESCRIPTION_LENGTH) {
    return { ok: false, error: es.groups.validation.descriptionTooLong(MAX_DESCRIPTION_LENGTH) };
  }
  if (Array.from(value).some((char) => CONTROL.test(char) && !ALLOWED_IN_DESCRIPTION.has(char))) {
    return { ok: false, error: es.groups.validation.descriptionChars };
  }
  return { ok: true, value };
}

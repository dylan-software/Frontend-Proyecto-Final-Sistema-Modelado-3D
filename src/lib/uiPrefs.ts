/**
 * Preferencias de la interfaz guardadas en localStorage. Solo comodidades de cada navegador: si el
 * almacenamiento está bloqueado, se usan los valores por defecto.
 */

/** Clave del panel de IA de la pantalla del proyecto: solo "true" o "false". */
export const AI_PANEL_OPEN_KEY = "ui_ai_panel_open";

/** Si el panel de IA está desplegado; por defecto, sí. Cualquier valor distinto de "false" cuenta como abierto. */
export function readAiPanelOpen(): boolean {
  try {
    return localStorage.getItem(AI_PANEL_OPEN_KEY) !== "false";
  } catch {
    return true;
  }
}

/** Recuerda si el panel de IA queda desplegado ("true") o recogido ("false"). */
export function saveAiPanelOpen(open: boolean): void {
  try {
    localStorage.setItem(AI_PANEL_OPEN_KEY, open ? "true" : "false");
  } catch {
    // Almacenamiento bloqueado: el panel vuelve a abrirse en la próxima visita.
  }
}

/**
 * Clave de una sección de /proyectos: "ui_group_open_<id>" para un grupo y "ui_group_open_none" para
 * "Proyectos sin grupo". Solo guarda "true" o "false", nunca nombres ni otros datos del grupo.
 */
export function groupOpenKey(groupId: number | null): string {
  return `ui_group_open_${groupId === null ? "none" : groupId}`;
}

/** Si la sección del grupo está desplegada; por defecto, sí (como el panel de IA). */
export function readGroupOpen(groupId: number | null): boolean {
  try {
    return localStorage.getItem(groupOpenKey(groupId)) !== "false";
  } catch {
    return true;
  }
}

/** Recuerda si la sección del grupo queda desplegada ("true") o plegada ("false"). */
export function saveGroupOpen(groupId: number | null, open: boolean): void {
  try {
    localStorage.setItem(groupOpenKey(groupId), open ? "true" : "false");
  } catch {
    // Almacenamiento bloqueado: la sección vuelve a desplegarse en la próxima visita.
  }
}

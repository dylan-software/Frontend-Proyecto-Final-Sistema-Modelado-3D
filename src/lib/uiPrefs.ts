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

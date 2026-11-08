import { es } from "../i18n/es";
import { MAX_CHAT_MESSAGE_CHARS, MAX_CHAT_MESSAGES, type ChatChange, type ChatTurn } from "./api";

/**
 * Las líneas discretas que confirman lo que guardó el chat ("Añadí: Cuadro, en la pared izquierda").
 * Una acción desconocida no se muestra.
 */
export function describeChanges(changes: readonly ChatChange[]): string[] {
  const t = es.chat.changes;
  return changes.flatMap((change) => {
    if (change.action === "added") return [t.added(change.name, change.where)];
    if (change.action === "removed") return [t.removed(change.name)];
    if (change.action === "moved") return [t.moved(change.name, change.where)];
    return [];
  });
}

/**
 * Prepara la conversación para POST /api/v1/chat dentro de sus límites, que el
 * backend hace cumplir con un 422: quita los turnos vacíos, conserva solo los
 * últimos MAX_CHAT_MESSAGES y recorta cada texto a MAX_CHAT_MESSAGE_CHARS.
 * El recorte importa en las respuestas largas del asistente, que vuelven a
 * enviarse en el siguiente mensaje. Cuenta puntos de código, como Python.
 */
export function toChatRequest(history: readonly ChatTurn[]): ChatTurn[] {
  return history
    .filter((turn) => turn.content.trim().length > 0)
    .slice(-MAX_CHAT_MESSAGES)
    .map((turn) => ({ role: turn.role, content: Array.from(turn.content).slice(0, MAX_CHAT_MESSAGE_CHARS).join("") }));
}

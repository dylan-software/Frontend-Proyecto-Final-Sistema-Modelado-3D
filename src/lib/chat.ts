import { MAX_CHAT_MESSAGE_CHARS, MAX_CHAT_MESSAGES, type ChatTurn } from "./api";

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

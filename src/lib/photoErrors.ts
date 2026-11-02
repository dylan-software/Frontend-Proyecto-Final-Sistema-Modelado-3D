import { es } from "../i18n/es";
import { ApiError, BackendUnreachableError } from "./api";

/**
 * Mensaje en español para un fallo de la foto a 3D, por código HTTP (CONTRATO-FOTO-A-3D.md).
 *
 * 404, 502 y 504 tienen un texto propio de la foto; 409 y 422 conservan el `detail` del backend
 * cuando lo hay; 401, 413, 415, 429 (con Retry-After) y 503 usan el mensaje general de ApiError.
 * Un error que no viene del servidor (la foto no se pudo leer o reducir) da el texto "unreadable".
 */
export function photoErrorMessage(error: unknown): string {
  const text = es.photo.errors;
  if (error instanceof BackendUnreachableError) return error.message;
  if (!(error instanceof ApiError)) return text.unreadable;
  switch (error.status) {
    case 404:
      return text.notFound;
    case 409:
      return error.detail ?? text.conflict;
    case 502:
      return text.badEstimate;
    case 504:
      return error.detail ?? text.timeout;
    default:
      return error.message;
  }
}

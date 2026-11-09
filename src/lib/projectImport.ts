/**
 * Importar un proyecto desde un archivo JSON exportado (CONTRATO-FASE6.md, sección 4).
 *
 * El navegador solo comprueba lo barato (vacío o más de 256 KB) para no subir un archivo que el backend
 * rechazaría; todo lo demás (JSON, versión, esquema, geometría) lo valida el backend.
 */
import { es } from "../i18n/es";
import { api, ApiError, type RoomImportResult } from "./api";

/** Mismo tope que el backend (BodySizeLimitMiddleware de POST /rooms/import). */
export const MAX_IMPORT_BYTES = 256 * 1024;

/** Lo mínimo de un File que se usa: tamaño y lectura como texto. */
export interface ImportFile {
  size: number;
  text(): Promise<string>;
}

/** Mensaje si el archivo no se debe enviar (vacío o demasiado grande), o null si se puede. */
export function checkImportFile(file: { size: number }): string | null {
  if (file.size === 0) return es.projectTransfer.importEmpty;
  if (file.size > MAX_IMPORT_BYTES) return es.projectTransfer.importTooLarge;
  return null;
}

/**
 * Texto para el usuario de una importación fallida. 413 y 415 llevan texto propio (ApiError los
 * describe como errores de la foto); un 422 trae el motivo del backend, ya en español y sin eco.
 */
export function importErrorMessage(err: unknown): string {
  const t = es.projectTransfer;
  if (err instanceof ApiError) {
    if (err.status === 413) return t.importTooLarge;
    if (err.status === 415) return t.importType;
  }
  const reason = err instanceof Error && err.message ? err.message : es.errors.invalidData;
  return t.importFailed(reason);
}

/**
 * Comprueba, lee y sube el archivo. Lanza un Error cuyo message ya es el texto para el usuario.
 */
export async function importProjectFile(file: ImportFile): Promise<RoomImportResult> {
  const problem = checkImportFile(file);
  if (problem) throw new Error(problem);
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new Error(es.projectTransfer.importReadFailed);
  }
  try {
    return await api.importRoom(text);
  } catch (err) {
    throw new Error(importErrorMessage(err));
  }
}

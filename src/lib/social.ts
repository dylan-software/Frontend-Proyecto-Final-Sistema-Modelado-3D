/**
 * Funciones puras de la red social (CONTRATO-FASE9.md): fechas, validación del formulario de publicar,
 * mensajes de error y unión de páginas del catálogo. Sin React ni red.
 */
import { es } from "../i18n/es";
import { ApiError, type PublicPublication } from "./api";
import { checkDescription, checkPlainName, MAX_PROJECT_NAME_LENGTH, type TextCheck } from "./groups";

/**
 * Fecha corta en español ("8 nov 2026") de una fecha ISO del backend, en UTC para que no dependa de la
 * zona del navegador. Cadena vacía si la fecha no se puede leer.
 */
export function formatPublishedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getUTCDate()} ${es.social.months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Título y descripción listos para enviar, o el primer error en español (mismas reglas que el backend). */
export function checkPublicationForm(
  title: string,
  description: string
): { ok: true; value: { title: string; description: string | null } } | { ok: false; field: "title" | "description"; error: string } {
  // "error" in: con "strict": false, TypeScript no estrecha la unión con !check.ok.
  const checkedTitle: TextCheck<string> = checkPlainName(title, MAX_PROJECT_NAME_LENGTH);
  if ("error" in checkedTitle) return { ok: false, field: "title", error: checkedTitle.error };
  const checkedDescription = checkDescription(description);
  if ("error" in checkedDescription) return { ok: false, field: "description", error: checkedDescription.error };
  return { ok: true, value: { title: checkedTitle.value, description: checkedDescription.value } };
}

/** Texto de un error al publicar o actualizar. 413 lleva su propio texto (ApiError lo describe como foto). */
export function publishErrorMessage(err: unknown): string {
  const t = es.publish;
  if (err instanceof ApiError && err.status === 413) return t.tooLarge;
  // 409 (tope), 422 (no importable) y 429 traen el motivo del backend, ya en español.
  const reason = err instanceof Error && err.message ? err.message : es.errors.invalidData;
  return t.failed(reason);
}

/** Texto de un error al dejar de publicar. */
export function unpublishErrorMessage(err: unknown): string {
  const reason = err instanceof Error && err.message ? err.message : es.errors.invalidData;
  return es.publish.unpublishFailed(reason);
}

/** Texto de un error al copiar: un 404 es una publicación retirada; el resto lleva su motivo. */
export function copyErrorMessage(err: unknown): string {
  const t = es.social;
  if (err instanceof ApiError && err.status === 404) return t.copyGone;
  const reason = err instanceof Error && err.message ? err.message : es.errors.invalidData;
  return t.copyFailed(reason);
}

/**
 * Añade una página nueva del catálogo a las ya cargadas sin repetir códigos: si alguien publica mientras
 * se lee, las publicaciones se desplazan una página y la siguiente repetiría la última ya mostrada.
 */
export function appendCatalogPage(loaded: PublicPublication[], next: PublicPublication[]): PublicPublication[] {
  const seen = new Set(loaded.map((item) => item.code));
  return [...loaded, ...next.filter((item) => !seen.has(item.code))];
}

/**
 * Funciones puras de la red social (CONTRATO-FASE9.md y CONTRATO-HABITA-PERFILES.md): fechas, validación
 * del formulario de publicar y del nombre visible, autores, mensajes de error y unión de páginas del
 * catálogo. Sin React ni red.
 */
import { es } from "../i18n/es";
import { ApiError, type PublicationAuthor, type PublicProfile, type PublicPublication } from "./api";
import { charCount, checkPlainName, checkProjectDescription, MAX_PROJECT_NAME_LENGTH, type TextCheck } from "./groups";

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
  // Mismo límite que la descripción del proyecto (500).
  const checkedDescription = checkProjectDescription(description);
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
 * se lee, las publicaciones se desplazan una página y la siguiente repetiría la última ya mostrada. Vale
 * para el catálogo, el catálogo por autor y la página de un perfil.
 */
export function appendCatalogPage<T extends Pick<PublicPublication, "code">>(loaded: T[], next: T[]): T[] {
  const seen = new Set(loaded.map((item) => item.code));
  return [...loaded, ...next.filter((item) => !seen.has(item.code))];
}

// --- Perfiles públicos (CONTRATO-HABITA-PERFILES.md, parte A) ------------------------------------------

/** Máximo de caracteres del nombre visible (el mismo que el backend). */
export const MAX_DISPLAY_NAME_LENGTH = 40;

/** Nombre que se muestra de un autor: su nombre visible, o "Autor anónimo" si no tiene o no hay autor. */
export function authorLabel(author: Pick<PublicationAuthor, "displayName"> | null | undefined): string {
  return author?.displayName ?? es.profile.anonymous;
}

/** "1 proyecto" / "N proyectos". */
export function publicationCountLabel(count: number): string {
  return es.profile.publicationCount(count);
}

/**
 * Nombre visible listo para enviar (null = anónimo si queda vacío), o su error en español. Mismas reglas
 * que el backend: sin espacios en los extremos, 1-40 caracteres, sin < > ni caracteres de control.
 */
export function checkDisplayName(text: string): TextCheck<string | null> {
  if (!text.trim()) return { ok: true, value: null };
  const checked = checkPlainName(text, MAX_DISPLAY_NAME_LENGTH);
  if ("error" in checked) {
    const tooLong = charCount(text.trim()) > MAX_DISPLAY_NAME_LENGTH;
    return { ok: false, error: tooLong ? es.profile.tooLong : es.profile.invalidChars };
  }
  return checked;
}

/**
 * Valor inicial del campo "Nombre visible" del diálogo de publicar: el del perfil; si la cuenta aún no
 * tiene perfil, el nombre de la cuenta que guarda el navegador (recortado a 40); si el perfil es anónimo,
 * vacío (nunca se rellena con el nombre de la cuenta: eligió no mostrarlo).
 */
export function initialDisplayName(profile: PublicProfile | null, accountName: string | null): string {
  if (profile) return profile.displayName ?? "";
  return Array.from((accountName ?? "").trim()).slice(0, MAX_DISPLAY_NAME_LENGTH).join("");
}

/**
 * Si hay que enviar PATCH /me/profile antes de publicar: cuando la cuenta no tiene perfil (para guardar
 * el nombre elegido, aunque sea anónimo) o cuando el nombre cambió.
 */
export function displayNameNeedsSaving(profile: PublicProfile | null, value: string | null): boolean {
  return profile === null || (profile.displayName ?? null) !== value;
}

/** Texto de un error al guardar el nombre visible (el PUT ya no se envía). */
export function displayNameErrorMessage(err: unknown): string {
  const reason = err instanceof Error && err.message ? err.message : es.errors.invalidData;
  return es.publish.displayNameFailed(reason);
}

/** Texto de un error al cargar un perfil: 404 = no existe; el resto, su motivo. */
export function profileErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 404) return es.profile.notFound;
  return err instanceof Error && err.message ? err.message : es.errors.invalidData;
}

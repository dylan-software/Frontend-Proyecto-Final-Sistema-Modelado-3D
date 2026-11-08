/**
 * Correos que ya iniciaron sesión (o se registraron) en ESTE navegador, para la lista desplegable del
 * login. Solo correos: nunca contraseñas, tokens ni nombres. No hay ningún endpoint que liste usuarios;
 * la lista sale únicamente de este localStorage y se puede perder sin consecuencias.
 */

/** Clave de localStorage: un arreglo JSON de correos, el más reciente primero. */
export const KNOWN_EMAILS_KEY = "auth_known_emails";
/** Máximo de correos recordados. */
export const MAX_KNOWN_EMAILS = 8;
/** Longitud máxima de un correo (RFC 5321). */
const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Si text parece un correo (la misma comprobación que el formulario) y no es demasiado largo. */
export function isEmail(text: string): boolean {
  return text.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(text);
}

function sameEmail(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * La lista guardada, validada: solo cadenas con forma de correo, sin repetir (sin distinguir
 * mayúsculas) y como mucho MAX_KNOWN_EMAILS. Cualquier otra cosa (JSON roto, objetos) da [].
 */
export function parseKnownEmails(raw: string | null): string[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const emails: string[] = [];
  for (const entry of data) {
    if (typeof entry !== "string") continue;
    const email = entry.trim();
    if (!isEmail(email) || emails.some((known) => sameEmail(known, email))) continue;
    emails.push(email);
    if (emails.length === MAX_KNOWN_EMAILS) break;
  }
  return emails;
}

/** La lista con email al principio (sin duplicarlo) y recortada a MAX_KNOWN_EMAILS. */
export function withKnownEmail(emails: readonly string[], email: string): string[] {
  const clean = email.trim();
  if (!isEmail(clean)) return emails.slice(0, MAX_KNOWN_EMAILS);
  return [clean, ...emails.filter((known) => !sameEmail(known, clean))].slice(0, MAX_KNOWN_EMAILS);
}

/** Los correos recordados en este navegador ([] si el almacenamiento está bloqueado). */
export function readKnownEmails(): string[] {
  try {
    return parseKnownEmails(localStorage.getItem(KNOWN_EMAILS_KEY));
  } catch {
    return [];
  }
}

/** Recuerda email tras un inicio de sesión correcto. Solo guarda el correo. */
export function rememberEmail(email: string): void {
  try {
    const next = withKnownEmail(readKnownEmails(), email);
    localStorage.setItem(KNOWN_EMAILS_KEY, JSON.stringify(next));
  } catch {
    // Almacenamiento bloqueado: la lista sigue vacía; el login funciona igual.
  }
}

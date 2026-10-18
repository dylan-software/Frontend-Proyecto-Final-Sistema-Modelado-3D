/**
 * Session stored in localStorage: the bearer token and the id of the
 * logged-in account. Kept apart from AuthScreen so the API client can
 * read it without importing a React component.
 */

/** localStorage key holding the session token. */
export const AUTH_TOKEN_KEY = "auth_token";
/** localStorage key holding the id of the logged-in account. */
export const AUTH_USER_ID_KEY = "auth_user_id";

/** The stored token, or null without a session (or when storage is blocked / during prerendering). */
export function readAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** `Authorization: Bearer <token>` when there is a session, otherwise no header at all. */
export function authHeaders(): Record<string, string> {
  const token = readAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type SessionExpiredListener = () => void;
const listeners = new Set<SessionExpiredListener>();

/** Registers a callback for when the backend rejects the session; returns the unsubscribe function. */
export function onSessionExpired(listener: SessionExpiredListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Called on a 401 from the backend: forgets the token and the account id
 * and tells the page to show the login screen again.
 */
export function expireSession(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_ID_KEY);
  } catch {
    // Storage blocked: there is no stored token to remove anyway.
  }
  listeners.forEach((listener) => listener());
}

/**
 * Session stored in localStorage: the bearer token, the id of the
 * logged-in account and the room being worked on. Kept apart from
 * AuthScreen so the API client can read it without importing a React
 * component.
 */

/** localStorage key holding the session token. */
export const AUTH_TOKEN_KEY = "auth_token";
/** localStorage key holding the id of the logged-in account. */
export const AUTH_USER_ID_KEY = "auth_user_id";
/** localStorage key holding the id of the room the user is working on. */
export const CURRENT_ROOM_ID_KEY = "current_room_id";

/** Forgets every session key: token, account and current room. */
export function clearStoredSession(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_ID_KEY);
    localStorage.removeItem(CURRENT_ROOM_ID_KEY);
  } catch {
    // Storage blocked: there is no stored session to remove anyway.
  }
}

/** The stored current room id, or null when there is none (or storage is blocked). */
export function readCurrentRoomId(): number | null {
  try {
    const value = Number(localStorage.getItem(CURRENT_ROOM_ID_KEY));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

/** Remembers the room the user is working on, so it is opened again after a reload. */
export function saveCurrentRoomId(roomId: number): void {
  try {
    localStorage.setItem(CURRENT_ROOM_ID_KEY, String(roomId));
  } catch {
    // Storage blocked: the room is simply not remembered.
  }
}

/**
 * The room to open: the remembered one if it still belongs to the
 * account, otherwise the newest (the list comes ordered by id). null
 * when the account has no rooms yet.
 */
export function chooseCurrentRoom(rooms: { id: number }[], storedId: number | null): number | null {
  if (storedId !== null && rooms.some((room) => room.id === storedId)) return storedId;
  return rooms.length > 0 ? rooms[rooms.length - 1]!.id : null;
}

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
 * Called on a 401 from the backend: forgets the token, the account id
 * and the current room, and tells the page to show the login screen again.
 */
export function expireSession(): void {
  clearStoredSession();
  listeners.forEach((listener) => listener());
}

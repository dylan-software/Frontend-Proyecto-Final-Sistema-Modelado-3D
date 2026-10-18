/**
 * Thin fetch wrapper around the backend API. The backend's base URL is
 * the ONLY thing that changes between local development and a real
 * deployment (Vercel frontend + Render/Railway/Azure/AWS backend) — it
 * is never hardcoded anywhere else in the app.
 *
 * Every request carries the session token as `Authorization: Bearer`.
 */
import { authHeaders, expireSession } from "./session";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Thrown when the backend can't be reached at all (server down, no network, CORS). */
export class BackendUnreachableError extends Error {
  constructor() {
    super(`No se pudo conectar con el servidor (${BASE_URL}). Verifica que el backend en Python esté encendido.`);
    this.name = "BackendUnreachableError";
  }
}

/** fetch() that turns network-level failures into a BackendUnreachableError. */
export async function fetchBackend(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new BackendUnreachableError();
  }
}

/**
 * A 401 means the backend no longer accepts the session (missing, expired
 * or re-keyed token): the stored session is cleared and the login screen
 * comes back. The auth endpoints themselves answer 401 for a wrong
 * password, which is not an expired session.
 */
export function handleUnauthorized(res: Response, path: string): void {
  if (res.status === 401 && !path.startsWith("/auth/")) expireSession();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetchBackend(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...init?.headers },
  });
  handleUnauthorized(res, path);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error ?? `Request to ${path} failed with status ${res.status}`);
  }
  return json as T;
}

export const AI_UNAVAILABLE_MESSAGE = "El asistente de IA no está disponible ahora.";

/**
 * Seconds to wait from a Retry-After header (delta-seconds or an HTTP
 * date), or null when it is missing or unreadable. Cross-origin, the
 * browser only shows the header if the backend lists it in CORS
 * expose_headers.
 */
export function parseRetryAfter(value: string | null | undefined, now: number = Date.now()): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return null;
  return Math.max(0, Math.ceil((date - now) / 1000));
}

/**
 * The Spanish message shown to the user for a failed /api/v1 call. The
 * backend's own `detail` (already in Spanish) is kept when it explains
 * the problem better than a generic text.
 */
export function describeApiError(status: number, detail: string | null, path: string, retryAfterSeconds: number | null): string {
  switch (status) {
    case 401:
      // On /auth/* a 401 is a wrong password, not an expired session.
      return path.startsWith("/auth/") && detail ? detail : "Tu sesión ha caducado. Vuelve a iniciar sesión.";
    case 413:
      return "La foto es demasiado grande: el máximo es 5 MB.";
    case 415:
      return "Formato de foto no admitido: usa una imagen JPEG o PNG.";
    case 422:
      return detail ?? "Los datos enviados no son válidos.";
    case 429: {
      const base = detail ?? "Has hecho demasiadas peticiones.";
      return retryAfterSeconds !== null
        ? `${base} Podrás volver a intentarlo en ${retryAfterSeconds} segundos.`
        : `${base} Espera un momento antes de volver a intentarlo.`;
    }
    case 502:
      return AI_UNAVAILABLE_MESSAGE;
    case 503:
      return detail ?? "La base de datos no está disponible ahora. Inténtalo más tarde.";
    default:
      return detail ?? `La petición falló (HTTP ${status}).`;
  }
}

/** Non-2xx answer from the FastAPI (/api/v1) endpoints, keeping the HTTP status code. */
export class ApiError extends Error {
  readonly status: number;
  /** The backend's own detail, when it sent a string. */
  readonly detail: string | null;
  /** From Retry-After on a 429, when the browser lets us read it. */
  readonly retryAfterSeconds: number | null;

  constructor(status: number, detail: string | null, path = "", retryAfterSeconds: number | null = null) {
    super(describeApiError(status, detail, path, retryAfterSeconds));
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Calls a FastAPI endpoint; its errors come as {"detail": "..."} (or a list on 422). */
async function v1Request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetchBackend(`${BASE_URL}/api/v1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...init?.headers },
  });
  handleUnauthorized(res, path);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = typeof json.detail === "string" ? json.detail : null;
    throw new ApiError(res.status, detail, path, parseRetryAfter(res.headers?.get("Retry-After")));
  }
  return json as T;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface FurnitureInput {
  id: string;
  name: string;
  widthCm: number;
  heightCm: number;
  depthCm: number;
  category: string;
  material: string;
  price: number;
  style: string;
  createdManually?: boolean;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Account returned by the FastAPI auth endpoints. */
export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
}

/** Catalog entry as stored by the FastAPI backend (sizes in the same cm the form sends). */
export interface CatalogItemOut {
  id: number;
  nombre: string;
  categoria_id: number;
  categoria: string;
  ancho: number;
  alto: number;
  profundidad: number;
}

/** A room as listed by GET /api/v1/spaces: no vertices (read them with getRoom), box in meters. */
export interface RoomSummary {
  id: number;
  nombre: string;
  ancho: number;
  alto: number;
  profundidad: number;
  muebles: unknown[];
}

/** A polygonal room, in meters; a vertex's y is the 3D z axis. */
export interface RoomDetail {
  id: number;
  name: string;
  vertices: Point2D[];
  heightM: number;
  areaM2: number;
}

/** A piece placed in a room. x/y are the MINIMUM corner of its footprint, in meters. */
export interface RoomItem {
  id: number;
  name: string;
  x: number;
  y: number;
  rotation: number;
}

export interface LayoutConstraints {
  minDistanceBetweenItemsCm: number;
  /** Accepted by the backend but not used yet (no doors are stored). */
  minClearPathCm: number;
}

export interface LayoutResult {
  layout: { positions: { itemId: number; x: number; y: number; rotation: number }[]; warnings: string[] };
  validation: { valid: boolean; collisions: { itemA: number; itemB: number; overlapCm: number }[] };
  lighting: { position: { x: number; y: number; z: number }; intensity: number; color: string; source: string };
  readyToRender: boolean;
  errors: string[];
}

/** Limits of POST /api/v1/chat; the backend answers 422 beyond them. */
export const MAX_CHAT_MESSAGES = 20;
export const MAX_CHAT_MESSAGE_CHARS = 2000;

const roomPath = (roomId: number) => `/spaces/rooms/${encodeURIComponent(roomId)}`;

/** Converts a backend catalog row into the shape the UI works with. */
export function toFurnitureInput(item: CatalogItemOut): FurnitureInput {
  return {
    id: String(item.id),
    name: item.nombre,
    widthCm: item.ancho,
    heightCm: item.alto,
    depthCm: item.profundidad,
    category: item.categoria,
    material: "unspecified",
    price: 0,
    style: "unspecified",
  };
}

export const api = {
  register: (body: { nombre: string; email: string; password: string }) =>
    v1Request<AuthUser>("/auth/register", { method: "POST", body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    v1Request<{ access_token: string; token_type: string; expires_in: number; usuario: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** 200 when the backend and its database are up; 503 when the database is offline. */
  health: () => v1Request<{ status: string; database: string }>("/health"),

  createRoom: (body: { name: string; vertices: Point2D[]; heightM: number }) =>
    v1Request<RoomDetail>("/spaces/rooms", { method: "POST", body: JSON.stringify(body) }),

  getRoom: (roomId: number) => v1Request<RoomDetail>(roomPath(roomId)),

  /** 422 (and the room unchanged) if the move leaves an invalid polygon. */
  moveRoomVertex: (roomId: number, index: number, point: Point2D) =>
    v1Request<RoomDetail>(`${roomPath(roomId)}/vertices/${index}`, {
      method: "PATCH",
      body: JSON.stringify({ x: point.x, y: point.y }),
    }),

  insertRoomVertex: (roomId: number, afterIndex: number, point: Point2D) =>
    v1Request<RoomDetail>(`${roomPath(roomId)}/vertices`, {
      method: "POST",
      body: JSON.stringify({ afterIndex, x: point.x, y: point.y }),
    }),

  /** A room keeps at least 3 vertices (422 otherwise). */
  deleteRoomVertex: (roomId: number, index: number) =>
    v1Request<RoomDetail>(`${roomPath(roomId)}/vertices/${index}`, { method: "DELETE" }),

  listRoomItems: (roomId: number) => v1Request<{ items: RoomItem[] }>(`${roomPath(roomId)}/items`),

  /**
   * Lays out the account's catalog (or only itemIds) inside the stored
   * room. When readyToRender is true the backend REPLACES the room's
   * previously placed furniture.
   */
  generateRoomLayout: (roomId: number, body: { constraints: LayoutConstraints; itemIds?: number[] }) =>
    v1Request<LayoutResult>(`${roomPath(roomId)}/layout`, { method: "POST", body: JSON.stringify(body) }),

  chatAboutRoom: (roomId: number, messages: ChatTurn[]) =>
    v1Request<{ role: "assistant"; content: string }>("/chat", {
      method: "POST",
      body: JSON.stringify({ roomId, messages }),
    }),

  /** @deprecated Legacy Node route; replaced by chatAboutRoom (4C). */
  chat: (projectId: string, messages: ChatTurn[]) =>
    request<{ role: "assistant"; content: string }>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ projectId, messages }),
    }),

  /** @deprecated Legacy Node route; replaced by createRoom (4B). */
  createSpace: (projectId: string, body: { userId: string; name: string; vertices: Point2D[]; heightM: number }) =>
    request<{ ok: true; areaM2: number; vertices: Point2D[] }>(`/api/spaces/${projectId}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** @deprecated Legacy Node route; replaced by getRoom. */
  getSpace: (projectId: string) =>
    request<{ vertices: Point2D[]; heightM: number; areaM2: number }>(`/api/spaces/${projectId}`),

  /** @deprecated Legacy Node route; replaced by moveRoomVertex (4B). */
  updateVertex: (projectId: string, index: number, point: Point2D) =>
    request<{ ok: true; areaM2: number; vertices: Point2D[] }>(`/api/spaces/${projectId}/vertices/${index}`, {
      method: "PATCH",
      body: JSON.stringify(point),
    }),

  /** @deprecated Legacy Node route; replaced by listRoomItems. */
  listSpaceItems: (projectId: string) =>
    request<{ items: { id: number; furnitureId: string; name: string; x: number; y: number; rotation: number }[] }>(
      `/api/spaces/${projectId}/items`
    ),

  /**
   * Rooms and catalog of one account. Account isolation is enforced by the
   * backend, which only returns rows stored with this exact user_id — so
   * every request that reads or creates data must carry the session's id.
   */
  listUserSpaces: (userId: string) =>
    v1Request<{ user_id: string; habitaciones: RoomSummary[]; catalogo: CatalogItemOut[] }>(
      `/spaces?user_id=${encodeURIComponent(userId)}`
    ),

  createCatalogFurniture: (body: {
    user_id: string;
    nombre: string;
    categoria: string;
    custom_category?: string;
    ancho: number;
    alto: number;
    profundidad: number;
  }) =>
    v1Request<CatalogItemOut & { categoria_nueva: boolean }>("/spaces/catalog", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteFurniture: (id: string) =>
    v1Request<{ success: boolean; message: string }>(`/spaces/furniture/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  /** @deprecated Legacy Node route; replaced by generateRoomLayout (4C). */
  generateLayout: (body: {
    projectId: string;
    room: { vertices: Point2D[]; heightM: number };
    items: FurnitureInput[];
    constraints: { minDistanceBetweenItemsCm: number; minClearPathCm: number };
    useAI?: boolean;
  }) =>
    request<{
      layout: { positions: { itemId: string; x: number; y: number; rotation: number }[]; warnings: string[] };
      validation: { valid: boolean; collisions: unknown[] };
      clearPath: { valid: boolean; blockedDoors: string[] };
      lighting: { position: { x: number; y: number; z: number }; intensity: number; color: string; source: string };
      readyToRender: boolean;
      errors: string[];
    }>("/api/layout/generate", { method: "POST", body: JSON.stringify(body) }),
};

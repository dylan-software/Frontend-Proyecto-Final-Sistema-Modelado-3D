/**
 * Thin fetch wrapper around the backend API. The backend's base URL is
 * the ONLY thing that changes between local development and a real
 * deployment (Vercel frontend + Render/Railway/Azure/AWS backend) — it
 * is never hardcoded anywhere else in the app.
 *
 * Every request carries the session token as `Authorization: Bearer`.
 */
import { es } from "../i18n/es";
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
    throw new Error(json.error ?? es.errors.legacyFailed(path, res.status));
  }
  return json as T;
}

export const AI_UNAVAILABLE_MESSAGE = es.errors.aiUnavailable;

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
 * Mensaje en español para una llamada fallida a /api/v1. Se conserva el `detail` del backend (ya en
 * español) cuando explica el problema mejor que un texto genérico. Los textos viven en i18n/es.ts.
 */
export function describeApiError(status: number, detail: string | null, path: string, retryAfterSeconds: number | null): string {
  const text = es.errors;
  switch (status) {
    case 401:
      // En /auth/* un 401 es una contraseña incorrecta, no una sesión caducada.
      return path.startsWith("/auth/") && detail ? detail : text.sessionExpired;
    case 404:
      return detail ?? text.notFound;
    case 409:
      return detail ?? text.conflict;
    case 413:
      return text.photoTooLarge;
    case 415:
      return text.photoType;
    case 422:
      return detail ?? text.invalidData;
    case 429: {
      const base = detail ?? text.tooManyRequests;
      return `${base} ${retryAfterSeconds !== null ? text.retryIn(retryAfterSeconds) : text.retrySoon}`;
    }
    case 502:
      return AI_UNAVAILABLE_MESSAGE;
    case 503:
      return detail ?? text.databaseUnavailable;
    case 504:
      return detail ?? text.timeout;
    default:
      return detail ?? text.failed(status);
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

/**
 * Llama a un endpoint de FastAPI; sus errores llegan como {"detail": "..."} (o una lista en un 422).
 * Con un FormData no se pone Content-Type: el navegador añade él mismo el boundary del multipart.
 */
async function v1Request<T>(path: string, init?: RequestInit): Promise<T> {
  const isForm = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const res = await fetchBackend(`${BASE_URL}/api/v1${path}`, {
    ...init,
    headers: { ...(isForm ? {} : { "Content-Type": "application/json" }), ...authHeaders(), ...init?.headers },
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
  /** Grupo del proyecto (null = sin grupo); el backend siempre lo manda desde la migración 005. */
  group_id?: number | null;
  /** Descripción del proyecto, o null. */
  description?: string | null;
}

/** A polygonal room, in meters; a vertex's y is the 3D z axis. */
export interface RoomDetail {
  id: number;
  name: string;
  vertices: Point2D[];
  heightM: number;
  areaM2: number;
  /** Solo llega cuando tiene valor: ausente equivale a null (sin grupo). */
  groupId?: number | null;
  /** Solo llega cuando tiene valor: ausente equivale a null (sin descripción). */
  description?: string | null;
}

/** Grupo (carpeta) de proyectos, como lo devuelve /api/v1/spaces/groups. */
export interface ProjectGroup {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  projectCount: number;
}

/** Cambios de PATCH /rooms/{id}: al menos uno. groupId null saca el proyecto de su grupo. */
export interface RoomChanges {
  name?: string;
  description?: string | null;
  groupId?: number | null;
}

/**
 * Un mueble colocado en una sala. x/y son la esquina MÍNIMA de su huella, en metros; widthM (eje x),
 * depthM (eje z), heightM y elevationM (altura de la base) bastan para dibujarlo como una caja.
 */
export interface RoomItem {
  id: number;
  name: string;
  x: number;
  y: number;
  rotation: number;
  widthM: number;
  depthM: number;
  heightM: number;
  elevationM: number;
}

/** Objeto que la IA propuso a partir de la foto y no se guardó, con el motivo (en español). */
export interface DiscardedObject {
  name: string;
  reason: string;
}

/** Respuesta 200 de POST /rooms/{id}/analyze-photo (CONTRATO-FOTO-A-3D.md). */
export interface PhotoAnalysis {
  room: RoomDetail;
  /** Siempre true: las medidas son estimadas. No se guarda en el backend. */
  estimated: boolean;
  description: string;
  items: RoomItem[];
  discarded: DiscardedObject[];
}

/** Qué cambio se deshizo (el que vino después de la copia restaurada). */
export type UndoneChange = "photo" | "chat" | "add" | "update" | "delete" | "layout" | "vertices";

/** Respuesta 200 de POST /rooms/{id}/undo (CONTRATO-FASE2.md, 1.3). */
export interface RoomUndoResult {
  /** La sala como estaba antes del último cambio. Los objetos vuelven con ids nuevos. */
  room: RoomDetail;
  items: RoomItem[];
  /** Cuántos cambios más se pueden deshacer en esta sala. */
  remaining: number;
  undone: UndoneChange;
}

/** Un cambio guardado por el chat; `where` ya viene en palabras ("en la pared izquierda"). */
export interface ChatChange {
  action: "added" | "removed" | "moved";
  name: string;
  where: string;
}

/** Respuesta de POST /api/v1/chat; `changes` vale [] si el mensaje no cambió nada. */
export interface ChatReply {
  role: "assistant";
  content: string;
  changes: ChatChange[];
}

/**
 * Respuesta 200 de POST /rooms/{id}/photo-undo (CONTRATO-DESHACER-FOTO.md).
 * @deprecated Usa RoomUndoResult y api.undoRoom (un solo Deshacer por sala).
 */
export interface PhotoUndoResult {
  /** La sala como estaba antes de la última foto, igual que en analyze-photo. */
  room: RoomDetail;
  items: RoomItem[];
  /** Cuántas fotos más se pueden deshacer en esta sala. */
  remaining: number;
}

/** Máximo de caracteres de las instrucciones opcionales de la foto (422 por encima). */
export const MAX_PHOTO_INSTRUCTIONS_CHARS = 500;

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

  createRoom: (body: {
    name: string;
    vertices: Point2D[];
    heightM: number;
    groupId?: number | null;
    description?: string | null;
  }) => v1Request<RoomDetail>("/spaces/rooms", { method: "POST", body: JSON.stringify(body) }),

  getRoom: (roomId: number) => v1Request<RoomDetail>(roomPath(roomId)),

  /** Renombra, describe o mueve de grupo un proyecto; no toca su forma ni sus muebles. */
  updateRoom: (roomId: number, changes: RoomChanges) =>
    v1Request<RoomDetail>(roomPath(roomId), { method: "PATCH", body: JSON.stringify(changes) }),

  /** Grupos de la cuenta, del más antiguo al más nuevo, con su número de proyectos. */
  listGroups: () => v1Request<{ groups: ProjectGroup[] }>("/spaces/groups"),

  /** 409 al llegar al tope de grupos de la cuenta. */
  createGroup: (body: { name: string; description?: string | null }) =>
    v1Request<ProjectGroup>("/spaces/groups", { method: "POST", body: JSON.stringify(body) }),

  /** Cambia el nombre o la descripción (null o "" la borra) de un grupo. */
  updateGroup: (groupId: number, changes: { name?: string; description?: string | null }) =>
    v1Request<ProjectGroup>(`/spaces/groups/${encodeURIComponent(groupId)}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    }),

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

  /**
   * Envía la foto (ya reducida) para que la IA estime la sala y hasta 10 objetos. Con
   * confirmReplace la respuesta REEMPLAZA la forma y los muebles guardados de la sala; sin él, una
   * sala con contenido responde 409. Las instrucciones vacías no se envían.
   */
  analyzeRoomPhoto: (roomId: number, photo: Blob, options: { confirmReplace: boolean; instructions?: string }) => {
    const form = new FormData();
    form.append("file", photo, "foto.jpg");
    form.append("confirm_replace", options.confirmReplace ? "true" : "false");
    const instructions = options.instructions?.trim();
    if (instructions) form.append("instrucciones", instructions);
    return v1Request<PhotoAnalysis>(`${roomPath(roomId)}/analyze-photo`, { method: "POST", body: form });
  },

  /**
   * Deshace el último cambio de la sala, sea cual sea: foto, chat u objetos (sin cuerpo). 409 si no
   * queda nada que deshacer (también tras un reinicio del servidor). No gasta cuota de IA.
   */
  undoRoom: (roomId: number) => v1Request<RoomUndoResult>(`${roomPath(roomId)}/undo`, { method: "POST" }),

  /** @deprecated Alias viejo del backend; usa undoRoom (misma pila). */
  undoRoomPhoto: (roomId: number) =>
    v1Request<PhotoUndoResult>(`${roomPath(roomId)}/photo-undo`, { method: "POST" }),

  /** El chat puede añadir, quitar o mover objetos; lo que guardó llega en `changes`. */
  chatAboutRoom: async (roomId: number, messages: ChatTurn[]): Promise<ChatReply> => {
    const reply = await v1Request<Partial<ChatReply> & { content: string }>("/chat", {
      method: "POST",
      body: JSON.stringify({ roomId, messages }),
    });
    return { role: "assistant", content: reply.content, changes: Array.isArray(reply.changes) ? reply.changes : [] };
  },

  /** @deprecated Legacy Node route; replaced by chatAboutRoom (4C). */
  chat: (projectId: string, messages: ChatTurn[]) =>
    request<{ role: "assistant"; content: string }>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ projectId, messages }),
    }),

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

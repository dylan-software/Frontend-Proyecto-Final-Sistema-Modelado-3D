/**
 * Thin fetch wrapper around the backend API. The backend's base URL is
 * the ONLY thing that changes between local development and a real
 * deployment (Vercel frontend + Render/Railway/Azure/AWS backend) — it
 * is never hardcoded anywhere else in the app.
 */
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetchBackend(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error ?? `Request to ${path} failed with status ${res.status}`);
  }
  return json as T;
}

/** Non-2xx answer from the FastAPI (/api/v1) endpoints, keeping the HTTP status code. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, detail: string) {
    super(`HTTP ${status}: ${detail}`);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Calls a FastAPI endpoint; its errors come as {"detail": "..."} (or a list on 422). */
async function v1Request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetchBackend(`${BASE_URL}/api/v1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, typeof json.detail === "string" ? json.detail : "la petición falló");
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

  health: () => request<{ ok: boolean; service: string }>("/api/health"),

  chat: (projectId: string, messages: ChatTurn[]) =>
    request<{ role: "assistant"; content: string }>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ projectId, messages }),
    }),

  createSpace: (projectId: string, body: { userId: string; name: string; vertices: Point2D[]; heightM: number }) =>
    request<{ ok: true; areaM2: number; vertices: Point2D[] }>(`/api/spaces/${projectId}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getSpace: (projectId: string) =>
    request<{ vertices: Point2D[]; heightM: number; areaM2: number }>(`/api/spaces/${projectId}`),

  updateVertex: (projectId: string, index: number, point: Point2D) =>
    request<{ ok: true; areaM2: number; vertices: Point2D[] }>(`/api/spaces/${projectId}/vertices/${index}`, {
      method: "PATCH",
      body: JSON.stringify(point),
    }),

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
    v1Request<{ user_id: string; habitaciones: unknown[]; catalogo: CatalogItemOut[] }>(
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

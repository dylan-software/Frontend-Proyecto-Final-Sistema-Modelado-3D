/**
 * Thin fetch wrapper around the backend API. The backend's base URL is
 * the ONLY thing that changes between local development and a real
 * deployment (Vercel frontend + Render/Railway/Azure/AWS backend) — it
 * is never hardcoded anywhere else in the app.
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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

export const api = {
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

  listFurniture: (category?: string) =>
    request<{ items: FurnitureInput[] }>(`/api/furniture${category ? `?category=${category}` : ""}`),

  createFurniture: (item: FurnitureInput) =>
    request<{ ok: true; item: FurnitureInput }>("/api/furniture", {
      method: "POST",
      body: JSON.stringify(item),
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

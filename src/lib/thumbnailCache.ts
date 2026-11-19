/**
 * Miniaturas 3D de las tarjetas de Proyectos: cola de UNA en una y memoria de la sesión con tope.
 *
 * Cada imagen se guarda como una URL de objeto (blob:) con una clave que incluye todo lo que cambia
 * su aspecto (ver thumbnailKey): si la sala o el tema cambian, la clave es otra y se vuelve a generar.
 * Las peticiones de la misma clave se comparten; un fallo no se guarda (la próxima vez se reintenta).
 * Sin React ni WebGL: el trabajo de pintar llega como una función, así que se prueba sola.
 */

/** Máximo de imágenes en memoria; al pasarlo se libera la usada hace más tiempo. */
export const MAX_THUMBNAILS = 60;

/** Error con el que se rechaza una petición cancelada antes de empezar (nadie la esperaba ya). */
export class ThumbnailCancelledError extends Error {
  constructor() {
    super("Miniatura cancelada antes de pintarse");
    this.name = "ThumbnailCancelledError";
  }
}

/** Huella corta y determinista (FNV-1a de 32 bits, en hexadecimal) de cualquier dato serializable. */
export function thumbnailSignature(value: unknown): string {
  const text = JSON.stringify(value) ?? "";
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Clave de la miniatura de una sala: su id más la huella de lo que se dibuja (forma, objetos, tema...). */
export function thumbnailKey(roomId: number, look: unknown): string {
  return `${roomId}:${thumbnailSignature(look)}`;
}

export interface ThumbnailCacheOptions {
  /** Tope de imágenes guardadas (por defecto MAX_THUMBNAILS). */
  maxEntries?: number;
  /** Crea la URL de la imagen (por defecto URL.createObjectURL). */
  createUrl?: (blob: Blob) => string;
  /** Libera una URL creada (por defecto URL.revokeObjectURL). */
  revokeUrl?: (url: string) => void;
  /** Deja respirar a la página entre dos trabajos (por defecto setTimeout 0). */
  yieldBetweenJobs?: () => Promise<void>;
}

export interface ThumbnailCache {
  /** URL guardada de esa clave, o undefined (no la pide ni cambia nada). */
  peek(key: string): string | undefined;
  /**
   * URL de la miniatura: la guardada, la que ya está en camino o una nueva puesta a la cola. Si
   * `signal` se cancela antes de empezar y nadie más la espera, sale de la cola y se rechaza con
   * ThumbnailCancelledError; una vez empezada, se termina y se guarda.
   */
  request(key: string, roomId: number, job: () => Promise<Blob>, signal?: AbortSignal): Promise<string>;
  /** Olvida (y libera) las imágenes de una sala, también la que se esté pintando. */
  forget(roomId: number): void;
  /** Olvida todo (al cerrar sesión): libera las imágenes y vacía la cola. */
  clear(): void;
  /** Imágenes guardadas ahora mismo. */
  readonly size: number;
  /** Trabajos en la cola o pintándose. */
  readonly pending: number;
}

interface Entry {
  key: string;
  roomId: number;
  job: () => Promise<Blob>;
  promise: Promise<string>;
  resolve: (url: string) => void;
  reject: (reason: unknown) => void;
  waiters: number;
  started: boolean;
  /** false si se olvidó mientras se pintaba: su resultado no se guarda. */
  wanted: boolean;
}

export function createThumbnailCache(options: ThumbnailCacheOptions = {}): ThumbnailCache {
  const maxEntries = Math.max(1, options.maxEntries ?? MAX_THUMBNAILS);
  const createUrl = options.createUrl ?? ((blob: Blob) => URL.createObjectURL(blob));
  const revokeUrl = options.revokeUrl ?? ((url: string) => URL.revokeObjectURL(url));
  const yieldBetweenJobs = options.yieldBetweenJobs ?? (() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

  // Map conserva el orden de inserción: la primera clave es la usada hace más tiempo.
  const stored = new Map<string, { url: string; roomId: number }>();
  const inFlight = new Map<string, Entry>();
  const queue: Entry[] = [];
  let running = false;

  function store(key: string, roomId: number, url: string) {
    stored.delete(key);
    stored.set(key, { url, roomId });
    while (stored.size > maxEntries) {
      const oldest = stored.keys().next().value as string;
      revokeUrl(stored.get(oldest)!.url);
      stored.delete(oldest);
    }
  }

  async function pump() {
    if (running) return;
    running = true;
    try {
      while (queue.length > 0) {
        const entry = queue.shift()!;
        entry.started = true;
        try {
          const blob = await entry.job();
          if (entry.wanted) {
            const url = createUrl(blob);
            store(entry.key, entry.roomId, url);
            entry.resolve(url);
          } else {
            entry.reject(new ThumbnailCancelledError());
          }
        } catch (err) {
          entry.reject(err);
        } finally {
          if (inFlight.get(entry.key) === entry) inFlight.delete(entry.key);
        }
        if (queue.length > 0) await yieldBetweenJobs();
      }
    } finally {
      running = false;
    }
  }

  function cancel(entry: Entry) {
    const index = queue.indexOf(entry);
    if (index >= 0) queue.splice(index, 1);
    if (inFlight.get(entry.key) === entry) inFlight.delete(entry.key);
    entry.reject(new ThumbnailCancelledError());
  }

  function watch(entry: Entry, signal?: AbortSignal) {
    if (!signal) return;
    signal.addEventListener(
      "abort",
      () => {
        entry.waiters -= 1;
        if (entry.waiters <= 0 && !entry.started) cancel(entry);
      },
      { once: true }
    );
  }

  return {
    peek(key) {
      return stored.get(key)?.url;
    },

    request(key, roomId, job, signal) {
      const hit = stored.get(key);
      if (hit) {
        // Recién usada: pasa al final del orden de liberación.
        stored.delete(key);
        stored.set(key, hit);
        return Promise.resolve(hit.url);
      }
      if (signal?.aborted) return Promise.reject(new ThumbnailCancelledError());
      const current = inFlight.get(key);
      if (current) {
        current.waiters += 1;
        watch(current, signal);
        return current.promise;
      }
      let resolve!: (url: string) => void;
      let reject!: (reason: unknown) => void;
      const promise = new Promise<string>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      // Nadie más que el que la pidió espera este rechazo: se evita el aviso de promesa sin manejar.
      promise.catch(() => undefined);
      const entry: Entry = { key, roomId, job, promise, resolve, reject, waiters: 1, started: false, wanted: true };
      inFlight.set(key, entry);
      queue.push(entry);
      watch(entry, signal);
      void pump();
      return promise;
    },

    forget(roomId) {
      for (const [key, value] of [...stored]) {
        if (value.roomId === roomId) {
          revokeUrl(value.url);
          stored.delete(key);
        }
      }
      for (const entry of [...inFlight.values()]) {
        if (entry.roomId !== roomId) continue;
        entry.wanted = false;
        if (!entry.started) cancel(entry);
        else inFlight.delete(entry.key);
      }
    },

    clear() {
      for (const { url } of stored.values()) revokeUrl(url);
      stored.clear();
      for (const entry of [...inFlight.values()]) {
        entry.wanted = false;
        if (!entry.started) cancel(entry);
      }
      inFlight.clear();
    },

    get size() {
      return stored.size;
    },

    get pending() {
      return inFlight.size;
    },
  };
}

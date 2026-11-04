/**
 * Cargador de salas para las tarjetas de proyectos: como mucho `maxConcurrent` peticiones a la vez,
 * una sola petición por sala aunque varias tarjetas la pidan, y caché en memoria de las respuestas
 * correctas mientras dure la sesión. Un fallo no se guarda: la siguiente llamada lo reintenta.
 */
export interface RoomLoader<T> {
  /** El resultado de la sala: de la caché, de la petición en curso o de una nueva en cola. */
  load(id: number): Promise<T>;
  /** El resultado ya guardado, sin pedir nada. */
  peek(id: number): T | undefined;
  /** Olvida una sala (p. ej. tras editarla), para que la próxima carga la pida de nuevo. */
  forget(id: number): void;
  /** Olvida todo (al cerrar sesión). Las peticiones en curso terminan, pero no se guardan. */
  clear(): void;
}

export function createRoomLoader<T>(fetcher: (id: number) => Promise<T>, maxConcurrent = 4): RoomLoader<T> {
  const limit = Math.max(1, Math.floor(maxConcurrent));
  const cache = new Map<number, T>();
  const inFlight = new Map<number, Promise<T>>();
  const waiting: (() => void)[] = [];
  let running = 0;
  // Cambia con clear() y forget(): una respuesta pedida antes no entra en la caché nueva.
  const generations = new Map<number, number>();
  let globalGeneration = 0;
  const generationOf = (id: number) => `${globalGeneration}:${generations.get(id) ?? 0}`;

  /** Arranca tareas en espera mientras haya hueco. */
  function pump() {
    while (running < limit && waiting.length > 0) {
      running++;
      waiting.shift()!();
    }
  }

  /** Pone en cola la petición de una sala; la promesa se resuelve cuando le toque y responda. */
  function enqueue(id: number): Promise<T> {
    const requested = generationOf(id);
    return new Promise<T>((resolve, reject) => {
      waiting.push(() => {
        // Promise.resolve().then: un fetcher que lanza de forma síncrona también libera su hueco.
        Promise.resolve()
          .then(() => fetcher(id))
          .then((value) => {
            if (generationOf(id) === requested) cache.set(id, value);
            resolve(value);
          }, reject)
          .finally(() => {
            running--;
            pump();
          });
      });
      pump();
    });
  }

  return {
    load(id) {
      if (cache.has(id)) return Promise.resolve(cache.get(id)!);
      const pending = inFlight.get(id);
      if (pending) return pending;
      const promise = enqueue(id);
      inFlight.set(id, promise);
      const release = () => {
        if (inFlight.get(id) === promise) inFlight.delete(id);
      };
      promise.then(release, release);
      return promise;
    },
    peek: (id) => cache.get(id),
    forget(id) {
      generations.set(id, (generations.get(id) ?? 0) + 1);
      cache.delete(id);
      inFlight.delete(id);
    },
    clear() {
      globalGeneration++;
      generations.clear();
      cache.clear();
      inFlight.clear();
    },
  };
}

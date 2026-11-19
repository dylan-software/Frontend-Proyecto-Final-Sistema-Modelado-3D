/**
 * Cola y memoria de las miniaturas 3D (src/lib/thumbnailCache.ts): una a la vez, peticiones
 * compartidas, fallos sin guardar, cancelación, tope con liberación y olvido por sala o total.
 */
import { describe, expect, it } from "vitest";

import { createThumbnailCache, thumbnailKey, thumbnailSignature, ThumbnailCancelledError } from "../src/lib/thumbnailCache";

/** Promesa que se resuelve o rechaza desde fuera. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const image = () => new Blob(["png"], { type: "image/png" });

/** Caché con URLs falsas ("blob:1", "blob:2"...) y registro de las liberadas. */
function setup(maxEntries?: number) {
  let created = 0;
  const revoked: string[] = [];
  const cache = createThumbnailCache({
    maxEntries,
    createUrl: () => `blob:${++created}`,
    revokeUrl: (url) => void revoked.push(url),
    yieldBetweenJobs: () => Promise.resolve(),
  });
  return { cache, revoked, created: () => created };
}

describe("thumbnailKey", () => {
  it("es determinista y cambia con lo que se dibuja", () => {
    const look = { vertices: [{ x: 0, y: 0 }], theme: "dark" };
    expect(thumbnailSignature(look)).toBe(thumbnailSignature({ vertices: [{ x: 0, y: 0 }], theme: "dark" }));
    expect(thumbnailSignature(look)).toMatch(/^[0-9a-f]{8}$/);
    expect(thumbnailSignature({ ...look, theme: "light" })).not.toBe(thumbnailSignature(look));
    expect(thumbnailKey(7, look)).toBe(`7:${thumbnailSignature(look)}`);
  });
});

describe("createThumbnailCache", () => {
  it("pinta una vez y después responde desde la memoria", async () => {
    const { cache } = setup();
    let calls = 0;
    const job = async () => {
      calls += 1;
      return image();
    };

    expect(await cache.request("1:a", 1, job)).toBe("blob:1");
    expect(cache.peek("1:a")).toBe("blob:1");
    expect(await cache.request("1:a", 1, job)).toBe("blob:1");
    expect(calls).toBe(1);
    expect(cache.size).toBe(1);
  });

  it("comparte la petición en camino de la misma clave", async () => {
    const { cache } = setup();
    const pending = deferred<Blob>();
    let calls = 0;
    const job = () => {
      calls += 1;
      return pending.promise;
    };

    const first = cache.request("1:a", 1, job);
    const second = cache.request("1:a", 1, job);
    expect(cache.pending).toBe(1);
    pending.resolve(image());

    expect(await Promise.all([first, second])).toEqual(["blob:1", "blob:1"]);
    expect(calls).toBe(1);
    expect(cache.pending).toBe(0);
  });

  it("pinta de una en una, en orden de llegada", async () => {
    const { cache } = setup();
    const order: string[] = [];
    const firstJob = deferred<Blob>();
    const one = cache.request("1:a", 1, () => {
      order.push("start 1");
      return firstJob.promise;
    });
    const two = cache.request("2:a", 2, async () => {
      order.push("start 2");
      return image();
    });

    await flush();
    expect(order).toEqual(["start 1"]);
    firstJob.resolve(image());
    await Promise.all([one, two]);
    expect(order).toEqual(["start 1", "start 2"]);
  });

  it("no guarda un fallo: la siguiente petición vuelve a intentarlo", async () => {
    const { cache } = setup();
    await expect(cache.request("1:a", 1, () => Promise.reject(new Error("sin WebGL")))).rejects.toThrow("sin WebGL");
    expect(cache.size).toBe(0);
    expect(await cache.request("1:a", 1, async () => image())).toBe("blob:1");
  });

  it("cancelar antes de empezar la saca de la cola sin pintarla", async () => {
    const { cache, created } = setup();
    const blocker = deferred<Blob>();
    void cache.request("1:a", 1, () => blocker.promise);
    const controller = new AbortController();
    let ran = false;
    const queued = cache.request(
      "2:a",
      2,
      async () => {
        ran = true;
        return image();
      },
      controller.signal
    );

    controller.abort();
    await expect(queued).rejects.toBeInstanceOf(ThumbnailCancelledError);
    blocker.resolve(image());
    await flush();
    expect(ran).toBe(false);
    expect(created()).toBe(1);
  });

  it("no cancela mientras otra tarjeta siga esperando la misma clave", async () => {
    const { cache } = setup();
    const blocker = deferred<Blob>();
    void cache.request("1:a", 1, () => blocker.promise);
    const controller = new AbortController();
    const job = async () => image();
    void cache.request("2:a", 2, job, controller.signal);
    const other = cache.request("2:a", 2, job);

    controller.abort();
    blocker.resolve(image());
    expect(await other).toBe("blob:2");
  });

  it("una vez empezada, termina y se guarda aunque se cancele", async () => {
    const { cache } = setup();
    const running = deferred<Blob>();
    const controller = new AbortController();
    const result = cache.request("1:a", 1, () => running.promise, controller.signal);

    await flush();
    controller.abort();
    running.resolve(image());
    expect(await result).toBe("blob:1");
    expect(cache.peek("1:a")).toBe("blob:1");
  });

  it("con el tope lleno libera la imagen usada hace más tiempo", async () => {
    const { cache, revoked } = setup(2);
    const job = async () => image();
    await cache.request("1:a", 1, job); // blob:1
    await cache.request("2:a", 2, job); // blob:2
    await cache.request("1:a", 1, job); // usada otra vez: la más vieja pasa a ser 2:a
    await cache.request("3:a", 3, job); // blob:3

    expect(revoked).toEqual(["blob:2"]);
    expect(cache.peek("1:a")).toBe("blob:1");
    expect(cache.peek("2:a")).toBeUndefined();
    expect(cache.size).toBe(2);
  });

  it("olvida una sala: libera sus imágenes, la saca de la cola y no guarda la que se pintaba", async () => {
    const { cache, revoked, created } = setup();
    await cache.request("1:old", 1, async () => image()); // blob:1
    await cache.request("2:a", 2, async () => image()); // blob:2
    const running = deferred<Blob>();
    const painting = cache.request("1:new", 1, () => running.promise);
    await flush();

    cache.forget(1);
    running.resolve(image());

    await expect(painting).rejects.toBeInstanceOf(ThumbnailCancelledError);
    expect(revoked).toEqual(["blob:1"]);
    expect(cache.peek("1:new")).toBeUndefined();
    expect(cache.peek("2:a")).toBe("blob:2");
    expect(created()).toBe(2);
  });

  it("clear libera todo y vacía la cola (al cerrar sesión)", async () => {
    const { cache, revoked } = setup();
    await cache.request("1:a", 1, async () => image());
    const blocker = deferred<Blob>();
    void cache.request("2:a", 2, () => blocker.promise);
    const queued = cache.request("3:a", 3, async () => image());

    cache.clear();
    blocker.resolve(image());

    await expect(queued).rejects.toBeInstanceOf(ThumbnailCancelledError);
    await flush();
    expect(revoked).toEqual(["blob:1"]);
    expect(cache.size).toBe(0);
    expect(cache.pending).toBe(0);
  });
});

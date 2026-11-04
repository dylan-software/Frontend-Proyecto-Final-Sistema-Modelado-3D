import { describe, it, expect } from "vitest";

import { createRoomLoader } from "../src/lib/roomLoader";

/** Petición falsa que el test resuelve o rechaza a mano. */
function controllableFetcher() {
  const calls: number[] = [];
  const pending = new Map<number, { resolve: (v: string) => void; reject: (e: Error) => void }>();
  let active = 0;
  let maxActive = 0;
  const fetcher = (id: number) => {
    calls.push(id);
    active++;
    maxActive = Math.max(maxActive, active);
    return new Promise<string>((resolve, reject) => {
      pending.set(id, {
        resolve: (v) => {
          active--;
          resolve(v);
        },
        reject: (e) => {
          active--;
          reject(e);
        },
      });
    });
  };
  return { fetcher, calls, pending, maxActive: () => maxActive };
}

/** Deja correr las promesas ya resueltas. */
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("createRoomLoader", () => {
  it("never runs more than 4 requests at once and serves all of them", async () => {
    const fake = controllableFetcher();
    const loader = createRoomLoader(fake.fetcher, 4);
    const results = Array.from({ length: 10 }, (_, i) => loader.load(i + 1));
    await flush();
    expect(fake.calls).toEqual([1, 2, 3, 4]);

    for (let id = 1; id <= 10; id++) {
      await flush();
      fake.pending.get(id)!.resolve(`room ${id}`);
    }
    expect(await Promise.all(results)).toEqual(Array.from({ length: 10 }, (_, i) => `room ${i + 1}`));
    expect(fake.maxActive()).toBe(4);
    expect(fake.calls).toHaveLength(10);
  });

  it("asks once per room and then answers from the cache", async () => {
    const fake = controllableFetcher();
    const loader = createRoomLoader(fake.fetcher);
    const a = loader.load(7);
    const b = loader.load(7);
    await flush();
    fake.pending.get(7)!.resolve("seven");
    expect(await a).toBe("seven");
    expect(await b).toBe("seven");
    expect(loader.peek(7)).toBe("seven");
    expect(await loader.load(7)).toBe("seven");
    expect(fake.calls).toEqual([7]);
  });

  it("does not cache a failure: the next load asks again", async () => {
    const fake = controllableFetcher();
    const loader = createRoomLoader(fake.fetcher);
    const first = loader.load(3);
    await flush();
    fake.pending.get(3)!.reject(new Error("503"));
    await expect(first).rejects.toThrow("503");
    expect(loader.peek(3)).toBeUndefined();

    const second = loader.load(3);
    await flush();
    fake.pending.get(3)!.resolve("ok");
    expect(await second).toBe("ok");
    expect(fake.calls).toEqual([3, 3]);
  });

  it("frees the slot of a request that fails or throws synchronously", async () => {
    let n = 0;
    const loader = createRoomLoader<string>((id) => {
      n++;
      if (id === 1) throw new Error("sync");
      return Promise.resolve(`r${id}`);
    }, 1);
    await expect(loader.load(1)).rejects.toThrow("sync");
    expect(await loader.load(2)).toBe("r2");
    expect(n).toBe(2);
  });

  it("forget and clear drop cached rooms, and late answers from before are not stored", async () => {
    const fake = controllableFetcher();
    const loader = createRoomLoader(fake.fetcher);
    const late = loader.load(1);
    await flush();
    loader.clear();
    fake.pending.get(1)!.resolve("old");
    expect(await late).toBe("old");
    expect(loader.peek(1)).toBeUndefined();

    const again = loader.load(1);
    await flush();
    fake.pending.get(1)!.resolve("new");
    await again;
    expect(loader.peek(1)).toBe("new");
    loader.forget(1);
    expect(loader.peek(1)).toBeUndefined();
  });
});

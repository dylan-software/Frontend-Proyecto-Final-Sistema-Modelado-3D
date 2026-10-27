import { describe, it, expect } from "vitest";

import { canDeleteVertex, checkNewRoom, edgeMidpoint } from "../src/lib/roomShape";

const L_ROOM = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 3 },
  { x: 2, y: 3 },
  { x: 2, y: 5 },
  { x: 0, y: 5 },
];

describe("checkNewRoom — the scan form before POST /rooms", () => {
  it("builds the body with the trimmed name, vertices in meters and heightM as a number", () => {
    expect(checkNewRoom("  Salón ", "2.6", L_ROOM)).toEqual({
      ok: true,
      room: { name: "Salón", vertices: L_ROOM, heightM: 2.6 },
    });
  });

  it("sends only x and y of each vertex", () => {
    const check = checkNewRoom("S", "2", L_ROOM.map((p) => ({ ...p, z: 1 })));

    expect(check.ok && check.room.vertices[0]).toEqual({ x: 0, y: 0 });
  });

  it("asks for a name", () => {
    expect(checkNewRoom("   ", "2.6", L_ROOM)).toEqual({ ok: false, error: "Ponle un nombre a la sala." });
  });

  it("rejects a height that is not between 0 and 20 m", () => {
    for (const height of ["0", "-1", "21", "", "abc"]) {
      expect(checkNewRoom("S", height, L_ROOM).ok).toBe(false);
    }
  });

  it("needs at least 3 corners", () => {
    expect(checkNewRoom("S", "2.6", L_ROOM.slice(0, 2))).toEqual({ ok: false, error: "Marca al menos 3 esquinas." });
  });
});

describe("RoomEditor helpers", () => {
  it("inserts a new corner at the middle of an edge, wrapping from the last vertex to the first", () => {
    expect(edgeMidpoint(L_ROOM, 0)).toEqual({ x: 2, y: 0 });
    expect(edgeMidpoint(L_ROOM, 5)).toEqual({ x: 0, y: 2.5 });
  });

  it("only lets a corner be deleted while the room keeps at least 3", () => {
    expect(canDeleteVertex(4)).toBe(true);
    expect(canDeleteVertex(3)).toBe(false);
  });
});

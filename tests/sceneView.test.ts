import { describe, it, expect } from "vitest";

import {
  CAMERA_ELEVATION_DEG,
  CAMERA_FOV_DEG,
  computeSceneView,
  floorBounds,
  MAX_DISTANCE_FACTOR,
  wallPlanes,
} from "../src/lib/sceneView";

const ROOM = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 3 },
  { x: 0, y: 3 },
];

const toRad = (deg: number) => (deg * Math.PI) / 180;

describe("computeSceneView", () => {
  it("aims at the center of the room", () => {
    expect(computeSceneView(ROOM, 2.5).target).toEqual([2, 1.25, 1.5]);
  });

  it("looks from above, on a diagonal", () => {
    const { target, position, distance } = computeSceneView(ROOM, 2.5);
    const [dx, dy, dz] = [position[0] - target[0], position[1] - target[1], position[2] - target[2]];

    expect(Math.hypot(dx, dy, dz)).toBeCloseTo(distance);
    expect(Math.asin(dy / distance)).toBeCloseTo(toRad(CAMERA_ELEVATION_DEG));
    expect(dx).toBeGreaterThan(0);
    expect(dx).toBeCloseTo(dz); // azimut de 45°
  });

  it("fits the whole room in the field of view and grows with its size", () => {
    const small = computeSceneView(ROOM, 2.5);
    const big = computeSceneView(
      ROOM.map((v) => ({ x: v.x * 3, y: v.y * 3 })),
      2.5
    );
    const radius = Math.hypot(4, 3, 2.5) / 2;

    expect(small.distance * Math.sin(toRad(CAMERA_FOV_DEG / 2))).toBeGreaterThan(radius);
    expect(big.distance).toBeGreaterThan(small.distance * 2);
  });

  it("limits zoom between a short minimum and three times the initial distance", () => {
    const view = computeSceneView(ROOM, 2.5);

    expect(view.minDistance).toBe(0.5);
    expect(view.maxDistance).toBeCloseTo(view.distance * MAX_DISTANCE_FACTOR);
    expect(view.minDistance).toBeLessThan(view.distance);
    expect(view.maxDistance).toBeGreaterThan(view.distance);
  });

  it("works for a room far from the origin and for degenerate input", () => {
    const far = computeSceneView(
      ROOM.map((v) => ({ x: v.x + 100, y: v.y - 50 })),
      2.5
    );
    expect(far.target).toEqual([102, 1.25, -48.5]);

    const empty = computeSceneView([], Number.NaN);
    expect(empty.target).toEqual([0, 0, 0]);
    expect(Number.isFinite(empty.distance) && empty.distance > 0).toBe(true);
  });
});

describe("floorBounds", () => {
  it("uses the plan's y as the 3D z", () => {
    expect(floorBounds([{ x: -1, y: 5 }, { x: 3, y: -2 }])).toEqual({ minX: -1, maxX: 3, minZ: -2, maxZ: 5 });
  });
});

describe("wallPlanes", () => {
  it("makes one wall per edge, including the closing one", () => {
    const walls = wallPlanes(ROOM, 2.5);

    expect(walls.map((w) => w.width)).toEqual([4, 3, 4, 3]);
    expect(walls[0]!.center).toEqual([2, 1.25, 0]);
    expect(walls[3]!.center).toEqual([0, 1.25, 1.5]);
    expect(walls.every((w) => w.height === 2.5)).toBe(true);
  });

  it("rotates each plane so its local x runs along the edge", () => {
    for (const [i, wall] of wallPlanes(ROOM, 2.5).entries()) {
      const from = ROOM[i]!;
      const to = ROOM[(i + 1) % ROOM.length]!;
      // Eje x local tras girar rotationY alrededor de y: (cos θ, 0, -sin θ).
      const along = [Math.cos(wall.rotationY), -Math.sin(wall.rotationY)];
      expect(along[0]!).toBeCloseTo((to.x - from.x) / wall.width);
      expect(along[1]!).toBeCloseTo((to.y - from.y) / wall.width);
    }
  });

  it("skips zero-length edges and needs a height and two vertices", () => {
    expect(wallPlanes([ROOM[0]!, ROOM[0]!, ROOM[1]!], 2.5)).toHaveLength(2);
    expect(wallPlanes(ROOM, 0)).toEqual([]);
    expect(wallPlanes([ROOM[0]!], 2.5)).toEqual([]);
  });
});

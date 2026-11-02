import { describe, it, expect } from "vitest";

import type { RoomItem } from "../src/lib/api";
import { boxLabel, LABEL_GAP_M, toSceneBox, toSceneBoxes } from "../src/lib/roomBoxes";

function item(overrides: Partial<RoomItem> = {}): RoomItem {
  return { id: 9, name: "Sofá", x: 0.5, y: 0.55, rotation: 0, widthM: 2, depthM: 0.9, heightM: 0.85, elevationM: 0, ...overrides };
}

describe("toSceneBox", () => {
  it("turns the minimum corner into the center of the box, on the floor", () => {
    const box = toSceneBox(item())!;

    expect(box.size).toEqual([2, 0.85, 0.9]);
    // Centro: x 0.5 + 1 = 1.5; y 0.85 / 2; z (el y del plano) 0.55 + 0.45 = 1.
    expect(box.center[0]).toBeCloseTo(1.5);
    expect(box.center[1]).toBeCloseTo(0.425);
    expect(box.center[2]).toBeCloseTo(1.0);
    expect(box.labelAt[1]).toBeCloseTo(0.85 + LABEL_GAP_M);
    expect(box.raised).toBe(false);
    expect(box.label).toBe("Sofá");
  });

  it("raises a wall object to its elevationM and says so in the label", () => {
    const box = toSceneBox(item({ name: "Cuadro", widthM: 0.8, depthM: 0.05, heightM: 0.6, elevationM: 1.4 }))!;

    expect(box.center[1]).toBeCloseTo(1.4 + 0.3);
    expect(box.labelAt[1]).toBeCloseTo(2.0 + LABEL_GAP_M);
    expect(box.raised).toBe(true);
    expect(box.label).toBe("Cuadro · a 1,40 m del suelo");
  });

  it.each([
    { widthM: 0 },
    { heightM: -1 },
    { depthM: Number.NaN },
    { x: Number.POSITIVE_INFINITY },
    { elevationM: Number.NaN },
    { widthM: undefined as unknown as number },
  ])("skips an item with invalid measures %o", (bad) => {
    expect(toSceneBox(item(bad))).toBeNull();
  });

  it("puts a negative elevation on the floor", () => {
    expect(toSceneBox(item({ elevationM: -0.2 }))!.center[1]).toBeCloseTo(0.425);
  });
});

describe("toSceneBoxes", () => {
  it("keeps the drawable items in order and drops the rest", () => {
    const boxes = toSceneBoxes([item({ id: 1 }), item({ id: 2, widthM: 0 }), item({ id: 3 })]);

    expect(boxes.map((b) => b.id)).toEqual([1, 3]);
  });
});

describe("boxLabel", () => {
  it("only adds the height when the object is off the floor", () => {
    expect(boxLabel("Mesa", 0)).toBe("Mesa");
    expect(boxLabel("Repisa", 1.255)).toBe("Repisa · a 1,25 m del suelo");
  });
});

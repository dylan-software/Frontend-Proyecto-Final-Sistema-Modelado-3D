import { describe, it, expect } from "vitest";

import type { RoomItem } from "../src/lib/api";
import { toSceneBoxes, type SceneBox } from "../src/lib/roomBoxes";

/**
 * Items de GET /rooms/{id}/items tal como los devolvió el backend para la escena de la captura
 * (cama, bandeja, espejo, mochila, pantuflas y puerta amontonados). Copiados de la salida de
 * app/tests/test_photo_end_to_end.py (backend) el 2026-11-04, sin IA real.
 */
const CAPTURE_ITEMS: RoomItem[] = [
  { id: 1, name: "Cama", x: 0.5, y: 0.55, rotation: 0, widthM: 1.4, depthM: 1.9, heightM: 0.5, elevationM: 0 },
  { id: 2, name: "Bandeja para portátil", x: 0.95, y: 1.25, rotation: 0, widthM: 0.5, depthM: 0.3, heightM: 0.25, elevationM: 0.5 },
  { id: 3, name: "Espejo de tocador", x: 0.81, y: 0, rotation: 0, widthM: 0.5, depthM: 0.05, heightM: 1.2, elevationM: 0.3 },
  { id: 4, name: "Mochila", x: 1.75, y: 1.9, rotation: 0, widthM: 0.3, depthM: 0.2, heightM: 0.45, elevationM: 0.5 },
  { id: 5, name: "Pantuflas", x: 0.75, y: 2.46, rotation: 0, widthM: 0.3, depthM: 0.25, heightM: 0.1, elevationM: 0 },
  { id: 6, name: "Puerta", x: 0, y: 0, rotation: 0, widthM: 0.8, depthM: 0.05, heightM: 2, elevationM: 0 },
];

const ROOM = { widthM: 3.5, lengthM: 3.2, heightM: 2.5 };
const TOUCH_M = 1e-6;

/** [mín, máx] de una caja de three.js en cada eje (x, y = alto, z). */
function extent(box: SceneBox): [number, number][] {
  return box.center.map((c, axis) => [c - box.size[axis]! / 2, c + box.size[axis]! / 2] as [number, number]);
}

function intersect(a: SceneBox, b: SceneBox): boolean {
  const ea = extent(a);
  const eb = extent(b);
  return [0, 1, 2].every((axis) => Math.min(ea[axis]![1], eb[axis]![1]) - Math.max(ea[axis]![0], eb[axis]![0]) > TOUCH_M);
}

describe("photo boxes as drawn in 3D", () => {
  const boxes = toSceneBoxes(CAPTURE_ITEMS);

  it("draws every item of the capture", () => {
    expect(boxes.map((b) => b.label.split(" · ")[0])).toEqual(CAPTURE_ITEMS.map((i) => i.name));
  });

  it("keeps the footprint the backend placed: corner + half size, plan y on the 3D z axis, meters", () => {
    for (const item of CAPTURE_ITEMS) {
      const box = boxes.find((b) => b.id === item.id)!;
      expect(box.center[0]).toBeCloseTo(item.x + item.widthM / 2, 9);
      expect(box.center[2]).toBeCloseTo(item.y + item.depthM / 2, 9);
      expect(box.center[1]).toBeCloseTo(item.elevationM + item.heightM / 2, 9);
      expect(box.size).toEqual([item.widthM, item.heightM, item.depthM]);
    }
  });

  it("has no two boxes sharing volume (resting on top only touches)", () => {
    const hits: string[] = [];
    boxes.forEach((a, i) =>
      boxes.slice(i + 1).forEach((b) => {
        if (intersect(a, b)) hits.push(`${a.label} / ${b.label}`);
      })
    );
    expect(hits).toEqual([]);
  });

  it("keeps every box inside the room", () => {
    const limits = [ROOM.widthM, ROOM.heightM, ROOM.lengthM];
    for (const box of boxes) {
      extent(box).forEach(([low, high], axis) => {
        expect(low).toBeGreaterThanOrEqual(-TOUCH_M);
        expect(high).toBeLessThanOrEqual(limits[axis]! + TOUCH_M);
      });
    }
  });

  it("detects a real collision (the check is not vacuous)", () => {
    const [bed] = toSceneBoxes([CAPTURE_ITEMS[0]!]);
    const [inside] = toSceneBoxes([{ ...CAPTURE_ITEMS[3]!, elevationM: 0 }]);
    expect(intersect(bed!, inside!)).toBe(true);
  });
});

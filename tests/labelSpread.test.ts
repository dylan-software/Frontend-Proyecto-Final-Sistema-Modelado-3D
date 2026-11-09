import { describe, expect, it } from "vitest";

import { LABEL_SPACING_PX, spreadLabels, type LabelRect } from "../src/lib/labelSpread";

function rect(left: number, top: number, width = 60, height = 18): LabelRect {
  return { left, top, width, height };
}

function shifted(rects: (LabelRect | null)[], offsets: number[]) {
  return rects.map((r, i) => (r ? { ...r, top: r.top - offsets[i] } : null));
}

function anyOverlap(rects: (LabelRect | null)[]) {
  const shown = rects.filter((r): r is LabelRect => r !== null && r.width > 0);
  return shown.some((a, i) =>
    shown.some(
      (b, j) =>
        i < j &&
        a.left < b.left + b.width &&
        b.left < a.left + a.width &&
        a.top < b.top + b.height &&
        b.top < a.top + a.height,
    ),
  );
}

describe("spreadLabels", () => {
  it("leaves labels that do not touch where they are", () => {
    expect(spreadLabels([rect(0, 0), rect(100, 0), rect(0, 40)])).toEqual([0, 0, 0]);
  });

  it("lifts the upper of two overlapping labels just above the lower one", () => {
    const offsets = spreadLabels([rect(0, 100), rect(20, 110)]);

    // El de abajo (top 110) se queda; el otro sube hasta 110 - 2 - 18 = 90.
    expect(offsets).toEqual([100 - (110 - LABEL_SPACING_PX - 18), 0]);
  });

  it("stacks labels at the same spot one above the other, in input order", () => {
    const offsets = spreadLabels([rect(0, 100), rect(0, 100), rect(0, 100)]);

    expect(offsets).toEqual([0, 20, 40]);
  });

  it("ignores hidden labels", () => {
    expect(spreadLabels([rect(0, 100), null, rect(0, 100, 0, 0), rect(0, 100)])).toEqual([0, 0, 0, 20]);
  });

  it("never leaves two labels overlapping (random scenes)", () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed / 2 ** 31;
    };
    for (let scene = 0; scene < 200; scene++) {
      const rects = Array.from({ length: 1 + Math.floor(random() * 30) }, () =>
        rect(random() * 300, random() * 200, 20 + random() * 120, 14 + random() * 8),
      );

      const offsets = spreadLabels(rects);

      expect(offsets.every((offset) => offset >= 0)).toBe(true);
      expect(anyOverlap(shifted(rects, offsets))).toBe(false);
    }
  });
});

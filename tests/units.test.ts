import { describe, it, expect } from "vitest";

import { CM_PER_M, cmToM, mToCm } from "../src/lib/units";

describe("units — the single cm/m conversion point", () => {
  it("converts catalog centimeters to room meters", () => {
    expect(cmToM(250)).toBe(2.5);
    expect(cmToM(CM_PER_M)).toBe(1);
  });

  it("converts room meters to catalog centimeters", () => {
    expect(mToCm(0.8)).toBeCloseTo(80);
    expect(mToCm(3)).toBe(300);
  });

  it("round-trips a value", () => {
    expect(mToCm(cmToM(137))).toBeCloseTo(137);
  });
});

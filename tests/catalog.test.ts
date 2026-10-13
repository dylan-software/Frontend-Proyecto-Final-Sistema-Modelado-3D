import { describe, it, expect } from "vitest";

import type { FurnitureInput } from "../src/lib/api";
import { groupByCategory } from "../src/lib/catalog";

function item(id: string, category: string): FurnitureInput {
  return {
    id,
    name: `Mueble ${id}`,
    widthCm: 100,
    heightCm: 80,
    depthCm: 50,
    category,
    material: "wood",
    price: 0,
    style: "modern",
  };
}

describe("groupByCategory", () => {
  it("returns no groups for an empty catalog", () => {
    expect(groupByCategory([])).toEqual([]);
  });

  it("orders groups by the first appearance of each category and keeps item order inside them", () => {
    const catalog = [item("1", "chair"), item("2", "bed"), item("3", "chair"), item("4", "table"), item("5", "bed")];

    const groups = groupByCategory(catalog);

    expect(groups.map((g) => g.category)).toEqual(["chair", "bed", "table"]);
    expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([["1", "3"], ["2", "5"], ["4"]]);
  });

  it("keeps custom category names as their own group", () => {
    const groups = groupByCategory([item("1", "Escritorio gamer"), item("2", "Escritorio gamer")]);

    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBe("Escritorio gamer");
    expect(groups[0].items).toHaveLength(2);
  });

  it("does not mutate the input catalog", () => {
    const catalog = [item("1", "chair"), item("2", "bed")];
    const snapshot = [...catalog];

    groupByCategory(catalog);

    expect(catalog).toEqual(snapshot);
  });
});

import { describe, it, expect } from "vitest";

import {
  filterProjects,
  fitPlanToBox,
  formatAreaM2,
  formatMeters,
  newProjectRoom,
  nextProjectName,
  planBounds,
  polygonAreaM2,
  rectangleVertices,
  userInitial,
} from "../src/lib/projects";

// Sala de 21 vértices de la decisión 12 (metros): su área es 28,75 m².
const ROOM_21 = [
  [0, 0], [2, 0], [2, 1.5], [4, 1.5], [4, 0], [6, 0], [6, 1.5], [7.5, 1.5], [7.5, 4], [6, 4], [6, 5],
  [4.5, 5], [4.5, 3], [2.5, 3], [2.5, 4], [3.5, 4], [3.5, 5], [3.5, 6], [2.5, 6], [2.5, 5], [0, 5],
].map(([x, y]) => ({ x: x!, y: y! }));

describe("polygonAreaM2", () => {
  it("gives the area of a rectangle in either winding", () => {
    const rect = rectangleVertices(4, 3);
    expect(polygonAreaM2(rect)).toBe(12);
    expect(polygonAreaM2([...rect].reverse())).toBe(12);
  });

  it("matches the backend's area for the 21-vertex room", () => {
    expect(polygonAreaM2(ROOM_21)).toBeCloseTo(28.75, 10);
  });

  it("is 0 with fewer than 3 vertices", () => {
    expect(polygonAreaM2([])).toBe(0);
    expect(polygonAreaM2([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(0);
  });
});

describe("planBounds and fitPlanToBox", () => {
  it("measures the bounding box of a shifted polygon", () => {
    expect(planBounds([{ x: -1, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 5 }])).toEqual({ minX: -1, minY: 2, width: 4, depth: 3 });
    expect(planBounds([])).toEqual({ minX: 0, minY: 0, width: 0, depth: 0 });
  });

  it("fits a 4 x 3 room into a 4:3 box with padding, centered and undistorted", () => {
    const fitted = fitPlanToBox(rectangleVertices(4, 3), 200, 150, 10);
    // Ancho útil 180 / 4 m = 45; alto útil 130 / 3 m = 43,33: manda el alto.
    expect(fitted.scale).toBeCloseTo(130 / 3, 10);
    const pts = fitted.points.split(" ").map((p) => p.split(",").map(Number));
    expect(pts).toHaveLength(4);
    const xs = pts.map(([x]) => x!);
    const ys = pts.map(([, y]) => y!);
    // Centrado: los márgenes izquierdo y derecho son iguales; arriba y abajo, 10.
    expect(Math.min(...xs)).toBeCloseTo(200 - Math.max(...xs), 1);
    expect(Math.min(...ys)).toBeCloseTo(10, 1);
    expect(Math.max(...ys)).toBeCloseTo(140, 1);
    // La caja encajada coincide con los extremos del polígono.
    expect(fitted.box.x).toBeCloseTo(Math.min(...xs), 1);
    expect(fitted.box.y).toBeCloseTo(10, 1);
    expect(fitted.box.width).toBeCloseTo(Math.max(...xs) - Math.min(...xs), 1);
    expect(fitted.box.height).toBeCloseTo(130, 1);
  });

  it("never divides by zero for a degenerate room or an empty list", () => {
    const line = fitPlanToBox([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 4, y: 0 }], 100, 100);
    expect(line.points).not.toMatch(/NaN|Infinity/);
    const point = fitPlanToBox([{ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 1 }], 100, 100);
    expect(point.points).toBe("50,50 50,50 50,50");
    expect(fitPlanToBox([], 100, 100)).toEqual({ points: "", scale: 0, box: { x: 50, y: 50, width: 0, height: 0 } });
  });
});

describe("formatting", () => {
  it("formats areas with a decimal comma and two decimals", () => {
    expect(formatAreaM2(12)).toBe("12,00 m²");
    expect(formatAreaM2(28.75)).toBe("28,75 m²");
  });

  it("formats dimensions without trailing zeros", () => {
    expect(formatMeters(4)).toBe("4 m");
    expect(formatMeters(3.5)).toBe("3,5 m");
    expect(formatMeters(3.256)).toBe("3,26 m");
  });
});

describe("filterProjects", () => {
  const projects = [{ nombre: "Salón principal" }, { nombre: "Dormitorio" }, { nombre: "Cocina" }];

  it("returns every project for an empty or blank query", () => {
    expect(filterProjects(projects, "")).toBe(projects);
    expect(filterProjects(projects, "   ")).toBe(projects);
  });

  it("ignores case and accents and keeps the order", () => {
    expect(filterProjects(projects, "SALON")).toEqual([{ nombre: "Salón principal" }]);
    expect(filterProjects(projects, "o")).toEqual(projects);
    expect(filterProjects(projects, "baño")).toEqual([]);
  });
});

describe("nextProjectName", () => {
  const base = "Proyecto nuevo";

  it("uses the base name when it is free", () => {
    expect(nextProjectName([], base)).toBe(base);
    expect(nextProjectName(["Cocina"], base)).toBe(base);
  });

  it("adds the smallest free number from 2 on", () => {
    expect(nextProjectName([base], base)).toBe("Proyecto nuevo 2");
    expect(nextProjectName([base, "Proyecto nuevo 2"], base)).toBe("Proyecto nuevo 3");
    expect(nextProjectName([base, "Proyecto nuevo 3"], base)).toBe("Proyecto nuevo 2");
  });

  it("treats names that differ only in case, accents or outer spaces as taken", () => {
    expect(nextProjectName(["  proyecto NUEVO "], base)).toBe("Proyecto nuevo 2");
  });
});

describe("newProjectRoom", () => {
  it("is a 4 x 3 m room 2.5 m high", () => {
    const room = newProjectRoom("Proyecto nuevo");
    expect(room).toEqual({
      name: "Proyecto nuevo",
      vertices: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }],
      heightM: 2.5,
    });
    expect(polygonAreaM2(room.vertices)).toBe(12);
  });

  it("cuts the name to the backend's 120 characters", () => {
    expect(newProjectRoom("x".repeat(200)).name).toHaveLength(120);
  });
});

describe("userInitial", () => {
  it("takes the first letter or digit, uppercased", () => {
    expect(userInitial("dylan", "Mi cuenta")).toBe("D");
    expect(userInitial("  ángela", "Mi cuenta")).toBe("Á");
    expect(userInitial("_3d", "Mi cuenta")).toBe("3");
  });

  it("falls back to the fallback's initial without a usable name", () => {
    expect(userInitial(null, "Mi cuenta")).toBe("M");
    expect(userInitial("", "Mi cuenta")).toBe("M");
    expect(userInitial("🙂", "Mi cuenta")).toBe("M");
    expect(userInitial(null, "")).toBe("?");
  });
});

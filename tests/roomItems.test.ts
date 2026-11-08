import { describe, it, expect } from "vitest";

import { es } from "../src/i18n/es";
import type { RoomItem } from "../src/lib/api";
import { describeRoomItem, filterRoomItems, formatMeters, normalizeForFilter } from "../src/lib/roomItems";

function item(overrides: Partial<RoomItem> = {}): RoomItem {
  return {
    id: 7,
    name: "Sofá",
    x: 1.234,
    y: 2.345,
    rotation: 90,
    widthM: 2,
    depthM: 0.9,
    heightM: 0.75,
    elevationM: 0,
    ...overrides,
  };
}

describe("formatMeters", () => {
  it("usa dos decimales y coma decimal", () => {
    expect(formatMeters(1.4)).toBe("1,40");
    expect(formatMeters(0.756)).toBe("0,76");
    expect(formatMeters(12)).toBe("12,00");
  });

  it("no muestra valores negativos ni no finitos", () => {
    expect(formatMeters(-0.2)).toBe("0,00");
    expect(formatMeters(Number.NaN)).toBe("0,00");
    expect(formatMeters(Number.POSITIVE_INFINITY)).toBe("0,00");
  });
});

describe("describeRoomItem", () => {
  it("un objeto en el suelo: nombre, 'En el suelo' y medidas", () => {
    const line = describeRoomItem(item());
    expect(line).toEqual({
      id: 7,
      name: "Sofá",
      place: "En el suelo",
      size: "2,00 × 0,90 × 0,75 m",
      sizeLabel: "2,00 m de ancho, 0,90 m de fondo y 0,75 m de alto",
      raised: false,
    });
  });

  it("un objeto levantado dice a qué altura del suelo está", () => {
    const line = describeRoomItem(item({ name: "Cuadro", elevationM: 1.4, depthM: 0.05 }));
    expect(line.place).toBe("A 1,40 m del suelo");
    expect(line.place).toBe(es.projectObjects.aboveFloor("1,40 m"));
    expect(line.raised).toBe(true);
  });

  it("menos de medio centímetro cuenta como el suelo", () => {
    expect(describeRoomItem(item({ elevationM: 0.004 })).place).toBe("En el suelo");
    expect(describeRoomItem(item({ elevationM: 0.005 })).place).toBe("A 0,01 m del suelo");
  });

  it("nunca muestra coordenadas ni la rotación", () => {
    const line = describeRoomItem(item({ x: 3.21, y: 4.56, rotation: 37 }));
    const text = `${line.name} ${line.place} ${line.size} ${line.sizeLabel}`;
    expect(text).not.toMatch(/3,21|4,56|3\.21|4\.56|37/);
  });

  it("un nombre vacío se muestra como una raya", () => {
    expect(describeRoomItem(item({ name: "   " })).name).toBe("—");
  });
});

describe("filterRoomItems", () => {
  const items = [item({ id: 1, name: "Sofá" }), item({ id: 2, name: "Mesa de centro" }), item({ id: 3, name: "SOFA cama" })];

  it("con el filtro vacío devuelve todos, en el mismo orden", () => {
    expect(filterRoomItems(items, "").map((i) => i.id)).toEqual([1, 2, 3]);
    expect(filterRoomItems(items, "   ").map((i) => i.id)).toEqual([1, 2, 3]);
  });

  it("no distingue tildes, mayúsculas ni espacios de más", () => {
    expect(filterRoomItems(items, "sofa").map((i) => i.id)).toEqual([1, 3]);
    expect(filterRoomItems(items, "  MESA   de ").map((i) => i.id)).toEqual([2]);
  });

  it("sin coincidencias devuelve una lista vacía", () => {
    expect(filterRoomItems(items, "lámpara")).toEqual([]);
  });

  it("no modifica la lista original", () => {
    const copy = [...items];
    filterRoomItems(items, "sofa");
    expect(items).toEqual(copy);
  });
});

describe("normalizeForFilter", () => {
  it("quita tildes y colapsa espacios", () => {
    expect(normalizeForFilter("  Lámpara   de PIE ")).toBe("lampara de pie");
  });
});

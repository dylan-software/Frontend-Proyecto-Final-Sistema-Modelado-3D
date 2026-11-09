import { describe, it, expect, vi, afterEach } from "vitest";

import type { RoomDetail, RoomItem } from "../src/lib/api";
import {
  downloadProject,
  JsonProjectExporter,
  PROJECT_FILE_FORMAT,
  PROJECT_FILE_VERSION,
  safeFileName,
  type ProjectSnapshot,
} from "../src/lib/projectExport";

const ROOM: RoomDetail = {
  id: 41,
  name: "Dormitorio de Ana",
  vertices: [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 3 },
    { x: 0, y: 3 },
  ],
  heightM: 2.5,
  areaM2: 12,
  groupId: 7,
  description: "Correo: ana@example.com",
};
const TABLE: RoomItem = { id: 901, name: "Mesa", x: 1.4, y: 1.1, rotation: 0, widthM: 1.2, depthM: 0.8, heightM: 0.75, elevationM: 0 };
const PICTURE: RoomItem = { id: 902, name: "Cuadro", x: 0, y: 1.2, rotation: 0, widthM: 0.05, depthM: 0.6, heightM: 0.4, elevationM: 1.3 };
const PROJECT: ProjectSnapshot = { room: ROOM, items: [TABLE, PICTURE] };

const exporter = new JsonProjectExporter();

/** Todas las claves de un valor JSON, a cualquier profundidad. */
function allKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(allKeys);
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, inner]) => [key, ...allKeys(inner)]);
  }
  return [];
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("JsonProjectExporter.toDocument", () => {
  it("builds the habita-project file, version 1, with the exact shape", () => {
    expect(exporter.toDocument(PROJECT)).toEqual({
      format: "habita-project",
      version: 1,
      name: "Dormitorio de Ana",
      room: { height_m: 2.5, vertices: [[0, 0], [4, 0], [4, 3], [0, 3]], estimated: false },
      items: [
        {
          name: "Mesa",
          category: null,
          kind: "floor",
          size_cm: [120, 75, 80],
          position: { x_m: 2, z_m: 1.5, elevation_m: 0, rotation_deg: 0 },
          wall: null,
          parts: [],
        },
        {
          name: "Cuadro",
          category: null,
          kind: "wall",
          size_cm: [5, 40, 60],
          position: { x_m: 0.025, z_m: 1.5, elevation_m: 1.3, rotation_deg: 0 },
          wall: null,
          parts: [],
        },
      ],
    });
    expect([PROJECT_FILE_FORMAT, PROJECT_FILE_VERSION]).toEqual(["habita-project", 1]);
  });

  it("carries no ids, account data, group or description", () => {
    const text = exporter.serialize(PROJECT);
    const keys = allKeys(JSON.parse(text));

    for (const forbidden of ["id", "groupId", "group_id", "description", "user_id", "userId", "email", "areaM2"]) {
      expect(keys).not.toContain(forbidden);
    }
    expect(text).not.toContain("901");
    expect(text).not.toContain("41");
    expect(text).not.toContain("@");
    expect(text).not.toContain("Correo");
  });

  it("rounds floating point noise away from sizes and centers", () => {
    const shelf: RoomItem = { ...TABLE, widthM: 0.6, depthM: 0.3, heightM: 0.07, x: 0.1, y: 0.2 };

    const [item] = exporter.toDocument({ room: ROOM, items: [shelf] }).items;

    expect(item.size_cm).toEqual([60, 7, 30]);
    expect(item.position.x_m).toBe(0.4);
    expect(item.position.z_m).toBe(0.35);
  });

  it("keeps the vertices exactly and does not touch the API objects", () => {
    const room = { ...ROOM, vertices: [{ x: 0.1 + 0.2, y: -1 / 3 }, { x: 5, y: 0 }, { x: 5, y: 4 }] };
    const snapshot = { room, items: [TABLE] };
    const before = JSON.stringify(snapshot);

    const doc = exporter.toDocument(snapshot);

    expect(doc.room.vertices[0]).toEqual([0.1 + 0.2, -1 / 3]);
    expect(JSON.stringify(snapshot)).toBe(before);
  });

  it("exports a project without objects", () => {
    expect(exporter.toDocument({ room: ROOM, items: [] }).items).toEqual([]);
  });
});

describe("JsonProjectExporter.serialize", () => {
  it("is parseable JSON with two-space indentation and a final newline", () => {
    const text = exporter.serialize(PROJECT);

    expect(JSON.parse(text)).toEqual(exporter.toDocument(PROJECT));
    expect(text.startsWith('{\n  "format": "habita-project"')).toBe(true);
    expect(text.endsWith("}\n")).toBe(true);
    expect(exporter.mimeType).toBe("application/json");
  });
});

describe("file names", () => {
  it("keeps letters with accents and digits and replaces the rest", () => {
    expect(exporter.fileName("Dormitorio de Ana")).toBe("Dormitorio_de_Ana.json");
    expect(safeFileName("Salón 2 / planta <alta>", ".json")).toBe("Salón_2_planta_alta.json");
    expect(safeFileName("../../etc/passwd", ".json")).toBe("etc_passwd.json");
  });

  it("falls back to 'proyecto' and caps the length at 60 characters", () => {
    expect(safeFileName("   ", ".json")).toBe("proyecto.json");
    expect(safeFileName("<<>>", ".json")).toBe("proyecto.json");
    expect(safeFileName("a".repeat(80), ".json")).toBe(`${"a".repeat(60)}.json`);
    expect(safeFileName(`${"b".repeat(59)} c`, ".json")).toBe(`${"b".repeat(59)}.json`);
  });
});

describe("downloadProject", () => {
  it("downloads a Blob through a temporary link and frees the URL", async () => {
    vi.useFakeTimers();
    const link = { href: "", download: "", rel: "", click: vi.fn(), remove: vi.fn() };
    const appendChild = vi.fn();
    vi.stubGlobal("document", { createElement: vi.fn(() => link), body: { appendChild } });
    const createObjectURL = vi.fn((_blob: Blob) => "blob:habita/1");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    downloadProject(exporter, PROJECT);

    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe("application/json");
    expect(JSON.parse(await blob.text()).name).toBe("Dormitorio de Ana");
    expect(link.href).toBe("blob:habita/1");
    expect(link.download).toBe("Dormitorio_de_Ana.json");
    expect(appendChild).toHaveBeenCalledWith(link);
    expect(link.click).toHaveBeenCalledOnce();
    expect(link.remove).toHaveBeenCalledOnce();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:habita/1");
    vi.useRealTimers();
  });
});

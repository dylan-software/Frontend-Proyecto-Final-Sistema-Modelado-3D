import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

import type { ProjectGroup } from "../src/lib/api";
import {
  checkDescription,
  checkPlainName,
  groupProjects,
  MAX_GROUP_NAME_LENGTH,
  MAX_PROJECT_NAME_LENGTH,
  nextTestName,
} from "../src/lib/groups";

function group(id: number, name = `Grupo ${id}`): ProjectGroup {
  return { id, name, description: null, createdAt: "2026-11-05T00:00:00Z", projectCount: 0 };
}

describe("nextTestName", () => {
  it("starts at Prueba 1 and takes the smallest free number", () => {
    expect(nextTestName([])).toBe("Prueba 1");
    expect(nextTestName(["Prueba 1", "Prueba 2"])).toBe("Prueba 3");
    expect(nextTestName(["Prueba 1", "Prueba 3"])).toBe("Prueba 2");
  });

  it("ignores other names and compares without case, accents or outer spaces", () => {
    expect(nextTestName(["Mi sala", "Proyecto nuevo"])).toBe("Prueba 1");
    expect(nextTestName(["  PRUEBA 1 ", "prueba 2"])).toBe("Prueba 3");
  });
});

describe("groupProjects", () => {
  it("puts each room in its group, in id order, and the rest without group", () => {
    const rooms = [
      { id: 5, group_id: 2 },
      { id: 1, group_id: null },
      { id: 3, group_id: 2 },
      { id: 4 },
      { id: 2, group_id: 1 },
    ];

    const { sections, ungrouped } = groupProjects(rooms, [group(2), group(1)]);

    expect(sections.map((s) => [s.group.id, s.rooms.map((r) => r.id)])).toEqual([
      [1, [2]],
      [2, [3, 5]],
    ]);
    expect(ungrouped.map((r) => r.id)).toEqual([1, 4]);
  });

  it("keeps empty groups and treats an unknown group_id as no group", () => {
    const { sections, ungrouped } = groupProjects([{ id: 1, group_id: 99 }], [group(7)]);

    expect(sections).toEqual([{ group: group(7), rooms: [] }]);
    expect(ungrouped.map((r) => r.id)).toEqual([1]);
  });
});

describe("checkPlainName", () => {
  it("trims and accepts plain names up to the limit", () => {
    expect(checkPlainName("  Casa  ", MAX_GROUP_NAME_LENGTH)).toEqual({ ok: true, value: "Casa" });
    expect(checkPlainName("x".repeat(80), MAX_GROUP_NAME_LENGTH).ok).toBe(true);
    expect(checkPlainName("ñ".repeat(120), MAX_PROJECT_NAME_LENGTH).ok).toBe(true);
  });

  it("rejects empty, too long, < >, and control characters", () => {
    for (const bad of ["", "   ", "x".repeat(81), "<b>", "Casa > Sala", "Casa\u0007", "Casa​"]) {
      const check = checkPlainName(bad, MAX_GROUP_NAME_LENGTH);
      expect(check.ok, bad).toBe(false);
    }
  });
});

describe("checkDescription", () => {
  it("turns an empty description into null", () => {
    expect(checkDescription("   ")).toEqual({ ok: true, value: null });
  });

  it("accepts up to 1000 characters with line breaks and tabs", () => {
    expect(checkDescription(" Sala\n\tcomedor ")).toEqual({ ok: true, value: "Sala\n\tcomedor" });
    expect(checkDescription("x".repeat(1000)).ok).toBe(true);
  });

  it("rejects 1001 characters and other control characters", () => {
    expect(checkDescription("x".repeat(1001)).ok).toBe(false);
    expect(checkDescription("Sala\u0000").ok).toBe(false);
  });
});

/** Respuesta falsa de fetch con este estado y cuerpo JSON. */
function answer(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  });
}

function lastCall() {
  const [url, init] = vi.mocked(fetch).mock.calls.at(-1)!;
  return { url, init: init!, body: init!.body ? JSON.parse(init!.body as string) : undefined };
}

describe("api client — groups", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("lists, creates and updates groups under /api/v1/spaces/groups", async () => {
    vi.stubGlobal("fetch", answer(200, { groups: [] }));
    const { api } = await import("../src/lib/api");

    await api.listGroups();
    expect(lastCall().url).toBe("http://localhost:8000/api/v1/spaces/groups");

    await api.createGroup({ name: "Casa", description: "Sala" });
    expect([lastCall().init.method, lastCall().body]).toEqual(["POST", { name: "Casa", description: "Sala" }]);

    await api.updateGroup(7, { description: null });
    expect(lastCall().url).toBe("http://localhost:8000/api/v1/spaces/groups/7");
    expect([lastCall().init.method, lastCall().body]).toEqual(["PATCH", { description: null }]);
  });

  it("moves, renames and describes a project with PATCH /rooms/{id}", async () => {
    vi.stubGlobal("fetch", answer(200, { id: 3 }));
    const { api } = await import("../src/lib/api");

    await api.updateRoom(3, { groupId: null, name: "Prueba 2" });

    expect(lastCall().url).toBe("http://localhost:8000/api/v1/spaces/rooms/3");
    expect([lastCall().init.method, lastCall().body]).toEqual(["PATCH", { groupId: null, name: "Prueba 2" }]);
  });

  it("creates a project inside a group", async () => {
    vi.stubGlobal("fetch", answer(201, { id: 4 }));
    const { api } = await import("../src/lib/api");

    await api.createRoom({ name: "Prueba 1", vertices: [], heightM: 2.5, groupId: 7 });

    expect(lastCall().body).toEqual({ name: "Prueba 1", vertices: [], heightM: 2.5, groupId: 7 });
  });
});

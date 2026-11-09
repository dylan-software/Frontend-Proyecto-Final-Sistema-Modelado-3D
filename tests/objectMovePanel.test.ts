/**
 * FASE 3: el panel del objeto seleccionado (flechas de respaldo y control de altura). Se renderiza en el
 * servidor (react-dom/server), sin DOM ni efectos, como tests/newProject.test.ts.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ObjectMovePanel, type MoveStatus } from "../src/components/ObjectMovePanel";
import { es } from "../src/i18n/es";
import type { RoomItem } from "../src/lib/api";
import type { MoveMode } from "../src/lib/objectMove";

const TABLE: RoomItem = { id: 1, name: "Mesa", x: 1, y: 1, rotation: 0, widthM: 1.2, depthM: 0.8, heightM: 0.75, elevationM: 0 };
const PICTURE: RoomItem = { ...TABLE, id: 2, name: "Cuadro", x: 0, widthM: 0.05, depthM: 0.6, heightM: 0.4, elevationM: 1.4 };

function render(item: RoomItem, mode: MoveMode, extra: { busy?: boolean; status?: MoveStatus | null } = {}) {
  const noop = () => {};
  return renderToStaticMarkup(
    createElement(ObjectMovePanel, {
      item,
      mode,
      roomHeightM: 2.5,
      busy: extra.busy ?? false,
      status: extra.status ?? null,
      onArrow: noop,
      onElevationPreview: noop,
      onElevationCommit: noop,
      onClose: noop,
    })
  );
}

function arrowButtons(html: string): string[] {
  return [...html.matchAll(/<button[^>]*class="object-move-arrow [^"]*"[^>]*>/g)].map((match) => match[0]);
}

describe("ObjectMovePanel", () => {
  it("un objeto de suelo: cuatro flechas en el plano y sin control de altura", () => {
    const html = render(TABLE, { kind: "floor" });

    expect(html).toContain(es.objectMove.panelLabel("Mesa"));
    expect(html).toContain(es.objectMove.hintFloor);
    const buttons = arrowButtons(html);
    expect(buttons).toHaveLength(4);
    for (const label of Object.values(es.objectMove.arrows.plane)) expect(html).toContain(`aria-label="${label}"`);
    expect(html).not.toContain('type="range"');
  });

  it("un objeto de pared: ← y → la recorren, ↑ y ↓ suben y bajan, y hay barra de altura", () => {
    const html = render(PICTURE, { kind: "wall", wall: "left" });

    expect(html).toContain(`aria-label="${es.objectMove.arrows.raise}"`);
    expect(html).toContain(`aria-label="${es.objectMove.arrows.lower}"`);
    expect(html).toContain(`aria-label="${es.objectMove.arrows.plane.up}"`); // ← en la pared izquierda
    expect(html).toMatch(/type="range"[^>]*min="0.05"[^>]*max="2.1"[^>]*value="1.4"/);
    expect(html).toContain(es.objectMove.heightValue(140));
  });

  it("mientras se guarda, las flechas y la barra esperan y se dice que se está guardando", () => {
    const html = render(PICTURE, { kind: "raised" }, { busy: true, status: { kind: "error", text: "viejo" } });

    expect(arrowButtons(html).every((button) => button.includes("disabled"))).toBe(true);
    expect(html).toMatch(/type="range"[^>]*disabled/);
    expect(html).toContain(es.objectMove.saving);
    expect(html).not.toContain("viejo");
  });

  it("muestra el resultado o el error del último movimiento", () => {
    expect(render(TABLE, { kind: "floor" }, { status: { kind: "info", text: es.objectMove.adjusted } })).toContain(
      es.objectMove.adjusted
    );
    const failed = render(TABLE, { kind: "floor" }, { status: { kind: "error", text: "No cabe" } });
    expect(failed).toContain("object-move-status-error");
    expect(failed).toContain("No cabe");
  });
});

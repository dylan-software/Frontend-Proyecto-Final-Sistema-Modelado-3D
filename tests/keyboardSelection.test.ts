/**
 * FASE 8: elegir un objeto desde la lista con el teclado y moverlo con las flechas de la FASE 3.
 * Las piezas puras y el marcado se comprueban sin DOM (react-dom/server); el foco real y las teclas
 * en el navegador quedan para la prueba manual.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ObjectMovePanel } from "../src/components/ObjectMovePanel";
import { RoomItemList, roomObjectRowId } from "../src/components/RoomItemList";
import { es } from "../src/i18n/es";
import type { RoomItem } from "../src/lib/api";
import { arrowKeyDirection } from "../src/lib/objectMove";

const TABLE: RoomItem = { id: 1, name: "Mesa", x: 1, y: 1, rotation: 0, widthM: 1.2, depthM: 0.8, heightM: 0.75, elevationM: 0 };
const PICTURE: RoomItem = { ...TABLE, id: 2, name: "Cuadro", x: 0, widthM: 0.05, depthM: 0.6, heightM: 0.4, elevationM: 1.4 };

describe("arrowKeyDirection", () => {
  it("traduce las cuatro flechas del teclado a las de la cruceta", () => {
    expect(arrowKeyDirection("ArrowUp")).toBe("up");
    expect(arrowKeyDirection("ArrowDown")).toBe("down");
    expect(arrowKeyDirection("ArrowLeft")).toBe("left");
    expect(arrowKeyDirection("ArrowRight")).toBe("right");
  });

  it("ignora el resto de teclas, también las propiedades heredadas", () => {
    for (const key of ["Enter", " ", "Escape", "w", "Up", "toString", ""]) expect(arrowKeyDirection(key)).toBeNull();
  });
});

describe("RoomItemList con selección", () => {
  const noop = () => {};

  it("convierte cada fila en un botón con id estable y marca el seleccionado con aria-pressed", () => {
    const html = renderToStaticMarkup(createElement(RoomItemList, { items: [TABLE, PICTURE], selectedId: 2, onSelect: noop }));
    const buttons = [...html.matchAll(/<button[^>]*>/g)].map((m) => m[0]);
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toContain(`id="${roomObjectRowId(1)}"`);
    expect(buttons[0]).toContain('aria-pressed="false"');
    expect(buttons[1]).toContain(`id="${roomObjectRowId(2)}"`);
    expect(buttons[1]).toContain('aria-pressed="true"');
    expect(buttons.every((b) => b.includes('type="button"'))).toBe(true);
    expect(html).toContain(es.projectObjects.selectHint);
  });

  it("sin onSelect sigue siendo una lista de solo lectura", () => {
    const html = renderToStaticMarkup(createElement(RoomItemList, { items: [TABLE, PICTURE] }));
    expect(html).not.toContain("room-objects-select");
    expect(html).not.toContain(es.projectObjects.selectHint);
  });
});

describe("ObjectMovePanel con teclado", () => {
  it("puede recibir el foco y explica las teclas", () => {
    const noop = () => {};
    const html = renderToStaticMarkup(
      createElement(ObjectMovePanel, {
        item: TABLE,
        mode: { kind: "floor" },
        roomHeightM: 2.5,
        busy: false,
        status: null,
        onArrow: noop,
        onElevationPreview: noop,
        onElevationCommit: noop,
        onClose: noop,
        focusRequest: 1,
      })
    );
    expect(html).toMatch(/<div[^>]*class="object-move-panel glass"[^>]*tabindex="-1"/i);
    expect(html).toContain(es.objectMove.keyboardHint);
  });
});

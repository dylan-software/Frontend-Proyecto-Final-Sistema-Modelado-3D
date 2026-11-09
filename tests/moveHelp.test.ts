/**
 * Ayuda del panel "Mover": las instrucciones solo se abren solas la primera vez; después el panel es
 * compacto y el botón "?" las vuelve a mostrar. Se renderiza en el servidor (react-dom/server), sin DOM.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ObjectMovePanel } from "../src/components/ObjectMovePanel";
import { es } from "../src/i18n/es";
import type { RoomItem } from "../src/lib/api";
import { MOVE_HELP_SEEN_KEY, readMoveHelpSeen, saveMoveHelpSeen } from "../src/lib/uiPrefs";

const TABLE: RoomItem = { id: 1, name: "Mesa", x: 1, y: 1, rotation: 0, widthM: 1.2, depthM: 0.8, heightM: 0.75, elevationM: 0 };

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, String(value)),
    removeItem: (key: string) => void data.delete(key),
  };
}

function render() {
  const noop = () => {};
  return renderToStaticMarkup(
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
    })
  );
}

function helpButton(html: string): string {
  return html.match(/<button[^>]*class="object-move-help-toggle"[^>]*>/)?.[0] ?? "";
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ayuda del panel Mover", () => {
  it("la primera vez muestra las dos instrucciones y el ? aparece pulsado", () => {
    vi.stubGlobal("localStorage", memoryStorage());
    const html = render();

    expect(html).toContain(es.objectMove.hintFloor);
    expect(html).toContain(es.objectMove.keyboardHint);
    expect(html).toContain('data-help="open"');
    expect(helpButton(html)).toContain('aria-expanded="true"');
    expect(helpButton(html)).toContain(`aria-label="${es.objectMove.hideHelp}"`);
  });

  it("si ya se vio, el panel es compacto: nombre, flechas, ? y cerrar, sin instrucciones", () => {
    vi.stubGlobal("localStorage", memoryStorage({ [MOVE_HELP_SEEN_KEY]: "true" }));
    const html = render();

    expect(html).not.toContain(es.objectMove.hintFloor);
    expect(html).not.toContain(es.objectMove.keyboardHint);
    expect(html).toContain('data-help="closed"');
    expect(html).toContain(">Mesa</strong>");
    expect(html).toContain(`aria-label="${es.objectMove.close}"`);
    expect(html.match(/class="object-move-arrow /g)).toHaveLength(4);
    const button = helpButton(html);
    expect(button).toContain('aria-expanded="false"');
    expect(button).toContain(`aria-label="${es.objectMove.showHelp}"`);
    // El ? apunta al contenedor de la ayuda, que existe aunque esté vacío.
    const controls = button.match(/aria-controls="([^"]+)"/)?.[1];
    expect(controls).toBeTruthy();
    expect(html).toContain(`id="${controls}" class="object-move-help"`);
  });

  it("sin almacenamiento (bloqueado) la ayuda se muestra y nada falla", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
    });
    expect(readMoveHelpSeen()).toBe(false);
    expect(() => saveMoveHelpSeen()).not.toThrow();
    expect(render()).toContain(es.objectMove.hintFloor);
  });

  it("guarda solo un booleano y solo cuenta el valor exacto \"true\"", () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);
    expect(readMoveHelpSeen()).toBe(false);
    saveMoveHelpSeen();
    expect([...storage.data.entries()]).toEqual([[MOVE_HELP_SEEN_KEY, "true"]]);
    expect(readMoveHelpSeen()).toBe(true);
    storage.data.set(MOVE_HELP_SEEN_KEY, "yes");
    expect(readMoveHelpSeen()).toBe(false);
  });
});

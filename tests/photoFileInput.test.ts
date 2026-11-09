/**
 * "Foto a 3D": el selector de archivo nativo no se ve; lo abre el botón, que es lo que alcanza el
 * teclado. Se renderiza en el servidor (sin DOM) y se comprueba la regla de globals.css que hace
 * respetar el atributo hidden frente a `input { display: block }`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PhotoToRoom } from "../src/components/PhotoToRoom";
import { es } from "../src/i18n/es";

const globalsCss = readFileSync(join(__dirname, "../src/styles/globals.css"), "utf8");

function render(roomId: number | null) {
  return renderToStaticMarkup(
    createElement(PhotoToRoom, { compact: true, roomId, savedItemCount: 0, onAnalyzed: () => undefined })
  );
}

describe("selector de archivo de «Foto a 3D»", () => {
  it("el input de archivo va oculto y fuera del orden de tabulación", () => {
    const input = /<input[^>]*type="file"[^>]*>/.exec(render(4))?.[0] ?? "";

    expect(input).not.toBe("");
    expect(input).toContain('hidden=""');
    expect(input).toContain('tabindex="-1"');
  });

  it("lo abre un botón de verdad (alcanzable con Tab, Enter y Espacio)", () => {
    const html = render(4);
    const button = /<button[^>]*class="photo-to-room-button"[^>]*>/.exec(html)?.[0] ?? "";

    expect(button).toContain('type="button"');
    expect(button).not.toContain("disabled");
    expect(html).toContain(es.photo.ui.button);
  });

  it("globals.css hace que hidden gane a input { display: block }", () => {
    expect(globalsCss).toMatch(/input\[type="file"\]\[hidden\]\s*\{\s*display:\s*none;?\s*\}/);
  });
});

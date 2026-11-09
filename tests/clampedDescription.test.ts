/**
 * Descripción de la cabecera recortada en el móvil: "Ver más" / "Ver menos" y la medida que decide si
 * hace falta el botón. Se renderiza en el servidor, sin DOM.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CLAMPED_LINES,
  ClampedDescription,
  DescriptionToggle,
  exceedsLines,
} from "../src/components/ClampedDescription";
import { es } from "../src/i18n/es";

const noop = () => undefined;

describe("DescriptionToggle", () => {
  it("recogida: «Ver más» con aria-expanded=false y aria-controls al bloque", () => {
    const html = renderToStaticMarkup(createElement(DescriptionToggle, { expanded: false, controls: "d1", onToggle: noop }));

    expect(html).toContain(`>${es.project.showMore}<`);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="d1"');
    expect(html).toContain('type="button"');
  });

  it("desplegada: «Ver menos» con aria-expanded=true", () => {
    const html = renderToStaticMarkup(createElement(DescriptionToggle, { expanded: true, controls: "d1", onToggle: noop }));

    expect(html).toContain(`>${es.project.showLess}<`);
    expect(html).toContain('aria-expanded="true"');
  });
});

describe("exceedsLines", () => {
  it("dos líneas justas no necesitan botón; una tercera sí", () => {
    expect(CLAMPED_LINES).toBe(2);
    expect(exceedsLines(34, 17, 12, 2)).toBe(false);
    expect(exceedsLines(35, 17, 12, 2)).toBe(false); // 1 px de margen por redondeo
    expect(exceedsLines(51, 17, 12, 2)).toBe(true);
  });

  it("con line-height «normal» (NaN) supone 1,4 veces la letra", () => {
    expect(exceedsLines(33, Number.NaN, 12, 2)).toBe(false);
    expect(exceedsLines(40, Number.NaN, 12, 2)).toBe(true);
  });

  it("sin medidas válidas no enseña el botón", () => {
    expect(exceedsLines(100, Number.NaN, Number.NaN, 2)).toBe(false);
    expect(exceedsLines(100, 0, 0, 2)).toBe(false);
  });
});

describe("ClampedDescription", () => {
  it("envuelve la descripción y, antes de medir, no muestra el botón", () => {
    const html = renderToStaticMarkup(
      createElement(ClampedDescription, { expanded: false, onToggle: noop, children: createElement("p", null, "Texto") })
    );

    expect(html).toContain('class="description-clamp"');
    expect(html).toContain("<p>Texto</p>");
    expect(html).not.toContain(es.project.showMore);
  });

  it("desplegada lleva la clase is-expanded (el CSS deja de recortar)", () => {
    const html = renderToStaticMarkup(
      createElement(ClampedDescription, { expanded: true, onToggle: noop, children: createElement("p", null, "Texto") })
    );

    expect(html).toContain('class="description-clamp is-expanded"');
  });
});

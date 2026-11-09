/**
 * FASE 8: estados de vacío y de carga (PlanState). El dibujo es decorativo y el texto es lo que se
 * anuncia. Se renderiza en el servidor (react-dom/server), sin DOM.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PlanEmpty, PlanLoading } from "../src/components/PlanState";

describe("PlanEmpty", () => {
  it("muestra el título y la frase, con el dibujo oculto a los lectores de pantalla", () => {
    const html = renderToStaticMarkup(createElement(PlanEmpty, { title: "Sin objetos", text: "Usa Foto a 3D." }));
    expect(html).toContain('<p class="plan-state-title">Sin objetos</p>');
    expect(html).toContain('<p class="plan-state-text">Usa Foto a 3D.</p>');
    expect(html).toMatch(/<svg class="plan-state-drawing"[^>]*aria-hidden="true"/);
    expect(html).not.toContain("plan-state-action");
  });

  it("dibuja los huecos de muebles solo en la variante de objetos y añade la acción si la hay", () => {
    const room = renderToStaticMarkup(createElement(PlanEmpty, { title: "Vacío" }));
    const objects = renderToStaticMarkup(
      createElement(PlanEmpty, { title: "Vacío", drawing: "objects", compact: true, action: createElement("button", null, "Crear") })
    );
    expect(room).not.toContain("plan-state-slot");
    expect(objects).toContain("plan-state-slot");
    expect(objects).toContain("plan-state-compact");
    expect(objects).toContain('<div class="plan-state-action"><button>Crear</button></div>');
  });
});

describe("PlanLoading", () => {
  it("anuncia la carga con role=status y el texto visible", () => {
    const html = renderToStaticMarkup(createElement(PlanLoading, { label: "Cargando…" }));
    expect(html).toMatch(/^<div class="plan-loading" role="status">/);
    expect(html).toContain('<span class="plan-loading-label">Cargando…</span>');
  });

  it("puede dejar el texto solo para los lectores de pantalla", () => {
    const html = renderToStaticMarkup(createElement(PlanLoading, { label: "Cargando…", showLabel: false }));
    expect(html).toContain('<span class="visually-hidden">Cargando…</span>');
  });
});

/**
 * Tarjeta del catálogo de /red (CONTRATO-FASE9.md): muestra solo lo público (planta, título, cifras) y el
 * botón de copiar. Se renderiza en el servidor (react-dom/server), sin DOM.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PublicationCard } from "../src/components/PublicationCard";
import { es } from "../src/i18n/es";
import type { PublicPublication } from "../src/lib/api";

const PUBLICATION: PublicPublication = {
  code: "AbCdEfGhIjKlMn_-",
  title: "Dormitorio con escritorio",
  description: "Escritorio junto a la ventana",
  publishedAt: "2026-11-08T10:00:00Z",
  updatedAt: "2026-11-08T12:00:00Z",
  copies: 3,
  mine: false,
  room: { vertices: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }], heightM: 2.5, areaM2: 12 },
  itemCount: 2,
};

function render(overrides: Partial<PublicPublication> = {}, props: Partial<{ copying: boolean; disabled: boolean; error: string | null }> = {}) {
  return renderToStaticMarkup(
    createElement(PublicationCard, {
      publication: { ...PUBLICATION, ...overrides },
      index: 0,
      copying: false,
      disabled: false,
      error: null,
      onCopy: () => undefined,
      ...props,
    })
  );
}

/** Solo el texto visible, sin etiquetas ni atributos. */
function visibleText(html: string): string {
  return html.replace(/<[^>]*>/g, " ");
}

describe("PublicationCard", () => {
  it("muestra título, descripción, área, objetos, alto, copias y fecha", () => {
    const html = render();
    const text = visibleText(html);

    expect(text).toContain("Dormitorio con escritorio");
    expect(text).toContain("Escritorio junto a la ventana");
    expect(text).toContain("2 objetos");
    expect(text).toContain("3 copias");
    expect(text).toContain("Publicado el 8 nov 2026");
    expect(text).toContain(es.social.copy);
    expect(html).toContain('class="room-plan');
  });

  it("no muestra el código público ni ningún dato de cuenta", () => {
    const html = render();

    expect(html).not.toContain(PUBLICATION.code);
    expect(html).not.toContain("@");
    expect(visibleText(html)).not.toContain(es.social.mine);
  });

  it("marca como «Tuyo» la publicación propia", () => {
    expect(visibleText(render({ mine: true }))).toContain(es.social.mine);
  });

  it("sin descripción usa el texto por defecto", () => {
    const html = render({ description: null, itemCount: 1, copies: 1 });

    expect(visibleText(html)).toContain(es.social.noDescription);
    expect(visibleText(html)).toContain("1 objeto");
    expect(visibleText(html)).toContain("1 copia");
  });

  it("mientras copia, el botón dice «Copiando…» y queda deshabilitado; el error se anuncia", () => {
    const html = render({}, { copying: true, disabled: true, error: es.social.copyGone });

    expect(html).toContain(es.social.copying);
    expect(html).toContain('disabled=""');
    expect(html).toContain('role="alert"');
  });
});

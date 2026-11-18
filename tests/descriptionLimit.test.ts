/**
 * Límite de 500 caracteres al escribir la descripción de un proyecto o de su publicación, con su contador
 * "120 / 500". Las descripciones antiguas más largas se siguen mostrando; solo hay que recortarlas al
 * editarlas. Los grupos siguen con 1000. Se renderiza en el servidor, sin DOM.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DescriptionCounter } from "../src/components/DescriptionCounter";
import { InlineEdit } from "../src/components/InlineEdit";
import { PublishForm } from "../src/components/PublishProjectButton";
import { es } from "../src/i18n/es";
import {
  checkDescription,
  checkProjectDescription,
  descriptionCount,
  MAX_DESCRIPTION_LENGTH,
  MAX_PROJECT_DESCRIPTION_LENGTH,
} from "../src/lib/groups";
import { checkPublicationForm } from "../src/lib/social";

const noop = () => undefined;
const OLD_LONG = "Descripción antigua. " + "x".repeat(779);

function counter(text: string, max = MAX_PROJECT_DESCRIPTION_LENGTH): string {
  return renderToStaticMarkup(createElement(DescriptionCounter, { id: "c", text, max }));
}

describe("límites", () => {
  it("el proyecto admite 500 y el grupo sigue en 1000", () => {
    expect(MAX_PROJECT_DESCRIPTION_LENGTH).toBe(500);
    expect(MAX_DESCRIPTION_LENGTH).toBe(1000);
    expect(Array.from(OLD_LONG)).toHaveLength(800);
  });

  it("checkProjectDescription acepta 500 y rechaza 501 con el mensaje en español", () => {
    expect(checkProjectDescription("x".repeat(500))).toEqual({ ok: true, value: "x".repeat(500) });
    expect(checkProjectDescription("x".repeat(501))).toEqual({
      ok: false,
      error: es.groups.validation.descriptionTooLong(500),
    });
  });

  it("cuenta como el backend: sin espacios en los extremos y por puntos de código", () => {
    expect(checkProjectDescription("  " + "x".repeat(500) + "\n ").ok).toBe(true);
    // 500 emojis son 1000 unidades UTF-16 pero 500 caracteres.
    expect(checkProjectDescription("🛋".repeat(500)).ok).toBe(true);
    expect(checkProjectDescription("🛋".repeat(501)).ok).toBe(false);
  });

  it("la descripción de un grupo conserva el límite de 1000", () => {
    expect(checkDescription("x".repeat(1000)).ok).toBe(true);
    expect(checkDescription("x".repeat(1001)).ok).toBe(false);
  });

  it("publicar usa el mismo límite que el proyecto", () => {
    expect(checkPublicationForm("Sala", "x".repeat(500)).ok).toBe(true);
    expect(checkPublicationForm("Sala", "x".repeat(501))).toEqual({
      ok: false,
      field: "description",
      error: es.groups.validation.descriptionTooLong(500),
    });
  });
});

describe("contador", () => {
  it("el texto visible es «120 / 500»", () => {
    expect(es.inlineEdit.count(120, 500)).toBe("120 / 500");
    expect(descriptionCount("  " + "x".repeat(120) + "  ", 500)).toEqual({ used: 120, max: 500, over: 0 });
  });

  it("muestra el contador y su versión para lectores de pantalla, sin marca si cabe", () => {
    const html = counter("x".repeat(120));

    expect(html).toContain('id="c"');
    expect(html).toContain('<span aria-hidden="true">120 / 500</span>');
    expect(html).toContain(es.inlineEdit.countLabel(120, 500));
    expect(html).not.toContain("is-over");
    expect(html).not.toContain("description-count-over");
  });

  it("una descripción antigua de 800 se marca y dice cuántos caracteres sobran", () => {
    const html = counter(OLD_LONG);

    expect(descriptionCount(OLD_LONG, 500).over).toBe(300);
    expect(html).toContain("is-over");
    expect(html).toContain("800 / 500");
    expect(html).toContain(es.inlineEdit.overLimit(300));
  });

  it("sobra 1 carácter va en singular", () => {
    expect(es.inlineEdit.overLimit(1)).toContain("Sobra 1 carácter");
    expect(es.inlineEdit.overLimit(2)).toContain("Sobran 2 caracteres");
  });
});

describe("formulario de publicar", () => {
  function form(description: string): string {
    return renderToStaticMarkup(
      createElement(PublishForm, {
        mode: "update",
        title: "Mi dormitorio",
        description,
        busy: false,
        error: null,
        invalidField: null,
        onTitleChange: noop,
        onDescriptionChange: noop,
        onSubmit: noop,
        onCancel: noop,
      })
    );
  }

  it("el campo lleva maxLength 500 y el contador enlazado con aria-describedby", () => {
    const html = form("x".repeat(120));

    expect(html).toContain('maxLength="500"');
    expect(html).toContain("120 / 500");
    const describedBy = /aria-describedby="([^"]+)"/.exec(html.slice(html.indexOf("<textarea")))?.[1];
    expect(describedBy).toBeTruthy();
    expect(html).toContain(`id="${describedBy}" class="description-count`);
  });

  it("una descripción antigua más larga se muestra entera para recortarla", () => {
    const html = form(OLD_LONG);

    expect(html).toContain(OLD_LONG);
    expect(html).toContain("800 / 500");
    expect(html).toContain(es.inlineEdit.overLimit(300));
  });
});

describe("descripción del proyecto sin editar", () => {
  it("una descripción antigua de 800 se muestra entera", () => {
    const html = renderToStaticMarkup(
      createElement(InlineEdit, {
        value: OLD_LONG,
        kind: "description",
        editLabel: "Editar la descripción",
        check: checkProjectDescription,
        onSave: async () => undefined,
        maxLength: MAX_PROJECT_DESCRIPTION_LENGTH,
      })
    );

    expect(html).toContain(OLD_LONG);
    expect(html).not.toContain("is-over");
  });
});

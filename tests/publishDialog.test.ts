/**
 * "Publicar en Habita" (CONTRATO-FASE9.md): el formulario avisa de qué se publica y el botón empieza
 * deshabilitado hasta saber si el proyecto está publicado. Se renderiza en el servidor, sin DOM.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PublishForm, PublishProjectButton } from "../src/components/PublishProjectButton";
import { es } from "../src/i18n/es";

const noop = () => undefined;

function form(props: Partial<Parameters<typeof PublishForm>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(PublishForm, {
      mode: "publish",
      title: "Mi dormitorio",
      description: "",
      busy: false,
      error: null,
      invalidField: null,
      onTitleChange: noop,
      onDescriptionChange: noop,
      onSubmit: noop,
      onCancel: noop,
      ...props,
    })
  );
}

/** El texto tal como lo escapa React en el HTML. */
function escaped(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

describe("PublishForm", () => {
  it("explica qué se publica, que no se muestran correo ni nombre y que es una copia congelada", () => {
    const html = form();

    expect(html).toContain(escaped(es.publish.dialogTitle));
    expect(html).toContain(escaped(es.publish.notice));
    expect(html).toContain(escaped(es.publish.noticeSnapshot));
    expect(html).toContain(escaped(es.publish.noticePrivateDescription));
    expect(html).toContain('role="dialog"');
    expect(html).toContain('value="Mi dormitorio"');
    expect(html).toContain('maxLength="120"');
    expect(html).toContain('maxLength="1000"');
    expect(html).toContain(">0/1000<");
    expect(html).toContain(escaped(es.publish.submit));
  });

  it("en modo actualizar cambia el título y el botón", () => {
    const html = form({ mode: "update" });

    expect(html).toContain(escaped(es.publish.dialogUpdateTitle));
    expect(html).toContain(escaped(es.publish.submitUpdate));
  });

  it("muestra el error, marca el campo y deshabilita mientras guarda", () => {
    const html = form({ busy: true, error: "Escribe un nombre.", invalidField: "title" });

    expect(html).toContain('role="alert"');
    expect(html).toContain("Escribe un nombre.");
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain(escaped(es.publish.saving));
    expect(html.match(/disabled=""/g)?.length).toBeGreaterThanOrEqual(4);
  });
});

describe("PublishProjectButton", () => {
  it("sin sala (cargando) muestra «Publicar en Habita» deshabilitado y sin formulario", () => {
    const html = renderToStaticMarkup(createElement(PublishProjectButton, { room: null }));

    expect(html).toContain(escaped(es.publish.button));
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('role="dialog"');
  });

  it("con la sala, mientras no se sabe si está publicada, sigue deshabilitado: privado por defecto", () => {
    const room = { id: 7, name: "Dormitorio", vertices: [], heightM: 2.5, areaM2: 12 };
    const html = renderToStaticMarkup(createElement(PublishProjectButton, { room }));

    expect(html).toContain(escaped(es.publish.button));
    expect(html).toContain('disabled=""');
    expect(html).not.toContain(escaped(es.publish.published));
  });
});

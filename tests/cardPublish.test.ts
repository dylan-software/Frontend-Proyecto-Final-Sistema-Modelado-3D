/**
 * "Publicar en Habita" en las tarjetas de /proyectos: el mismo PublishProjectButton y los mismos
 * diálogos que en la cabecera del proyecto, pero como modales, detrás del menú "Más acciones" de la
 * tarjeta. Se renderiza en el servidor, sin DOM.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProjectCard } from "../src/components/ProjectCard";
import { PublishForm, PublishProjectButton, UnpublishConfirm } from "../src/components/PublishProjectButton";
import { es } from "../src/i18n/es";
import type { RoomSummary } from "../src/lib/api";

const noop = () => undefined;

function escaped(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

function form(modal: boolean) {
  return renderToStaticMarkup(
    createElement(PublishForm, {
      mode: "publish",
      title: "Dormitorio",
      description: "",
      busy: false,
      error: null,
      invalidField: null,
      onTitleChange: noop,
      onDescriptionChange: noop,
      onSubmit: noop,
      onCancel: noop,
      modal,
    })
  );
}

describe("PublishForm modal", () => {
  it("modal: el mismo formulario dentro de un fondo, con aria-modal", () => {
    const html = form(true);

    expect(html).toMatch(/^<div class="publish-modal-backdrop">/);
    expect(html).toContain('class="publish-panel glass publish-panel-modal"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain(escaped(es.publish.notice));
    expect(html).toContain(escaped(es.publish.submit));
  });

  it("sin modal (cabecera) sigue igual que antes: sin fondo ni aria-modal", () => {
    const html = form(false);

    expect(html).toMatch(/^<form class="publish-panel glass"/);
    expect(html).not.toContain("publish-modal-backdrop");
    expect(html).not.toContain("aria-modal");
  });
});

describe("UnpublishConfirm", () => {
  it("pide confirmación con los mismos textos, flotante o modal", () => {
    const floating = renderToStaticMarkup(createElement(UnpublishConfirm, { busy: false, error: null, onCancel: noop, onConfirm: noop }));
    const modal = renderToStaticMarkup(
      createElement(UnpublishConfirm, { busy: false, error: null, modal: true, onCancel: noop, onConfirm: noop })
    );

    for (const html of [floating, modal]) {
      expect(html).toContain('role="alertdialog"');
      expect(html).toContain(escaped(es.publish.confirmUnpublish));
      expect(html).toContain(escaped(es.publish.confirmUnpublishYes));
    }
    expect(floating).not.toContain("publish-modal-backdrop");
    expect(modal).toContain("publish-modal-backdrop");
    expect(modal).toContain('aria-modal="true"');
  });

  it("mientras retira, deshabilita los botones y muestra el error", () => {
    const html = renderToStaticMarkup(
      createElement(UnpublishConfirm, { busy: true, error: "Sin conexión.", modal: true, onCancel: noop, onConfirm: noop })
    );

    expect(html).toContain(escaped(es.publish.removing));
    expect(html).toContain("Sin conexión.");
    expect(html.match(/disabled=""/g)?.length).toBe(2);
  });
});

describe("PublishProjectButton en la tarjeta", () => {
  it("solo necesita id y nombre; mientras no sabe si está publicado, deshabilitado (privado por defecto)", () => {
    const html = renderToStaticMarkup(
      createElement(PublishProjectButton, { room: { id: 3, name: "Cocina" }, variant: "card" })
    );

    expect(html).toContain(escaped(es.publish.button));
    expect(html).toContain('disabled=""');
    expect(html).not.toContain('role="dialog"');
  });
});

describe("ProjectCard", () => {
  const room: RoomSummary = {
    id: 9,
    nombre: "Estudio",
    ancho: 4,
    profundidad: 3,
    group_id: null,
    description: null,
  } as RoomSummary;

  it("lleva «Más acciones» plegado y no monta el botón de publicar hasta abrirlo", () => {
    const html = renderToStaticMarkup(
      createElement(ProjectCard, { room, index: 0, groups: [], onMove: async () => undefined })
    );

    expect(html).toContain(`aria-label="${escaped(es.projects.moreActions("Estudio"))}"`);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toMatch(/class="project-card-actions" hidden=""/);
    expect(html).not.toContain(escaped(es.publish.button));
  });
});

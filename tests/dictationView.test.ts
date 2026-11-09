/**
 * Botón de dictado (FASE 7): sin soporte no hay botón y se explica; con soporte, aviso de privacidad,
 * estado con aria-live y "Cancelar" mientras escucha. Se renderiza en el servidor, sin DOM.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChatDock } from "../src/components/ChatDock";
import { DictationButton, DictationView } from "../src/components/DictationButton";
import { es } from "../src/i18n/es";

const t = es.dictation;
const noop = () => undefined;

function view(props: Partial<Parameters<typeof DictationView>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(DictationView, {
      support: "supported",
      listening: false,
      status: null,
      error: null,
      disabled: false,
      onToggle: noop,
      ...props,
    })
  );
}

/** El texto tal como lo escapa React en el HTML. */
function escaped(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

describe("DictationView", () => {
  it("mientras no se sabe si hay soporte (en el servidor) no pinta nada", () => {
    expect(view({ support: "unknown" })).toBe("");
  });

  it("sin soporte no hay botón y una línea lo explica", () => {
    const html = view({ support: "unsupported" });
    expect(html).not.toContain("<button");
    expect(html).toContain(escaped(t.unsupported));
  });

  it("en una página no segura no hay botón y se explica", () => {
    const html = view({ support: "insecure" });
    expect(html).not.toContain("<button");
    expect(html).toContain(escaped(t.errors.insecure));
  });

  it("con soporte: botón «Dictar» enlazado al aviso de privacidad y estado con aria-live", () => {
    const html = view();
    expect(html).toContain(`>${t.start}</button>`);
    expect(html).toContain(`aria-label="${escaped(t.startLabel)}"`);
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain(escaped(t.privacy));
    const describedBy = /aria-describedby="([^"]+)"/.exec(html)?.[1];
    expect(describedBy).toBeTruthy();
    expect(html).toContain(`id="${describedBy}"`);
    expect(html).toMatch(/role="status" aria-live="polite"/);
  });

  it("mientras escucha: «Cancelar», punto animado y el estado", () => {
    const html = view({ listening: true, status: t.listening });
    expect(html).toContain(`>${t.cancel}</button>`);
    expect(html).toContain(`aria-label="${escaped(t.cancelLabel)}"`);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("dictation-pulse");
    expect(html).toContain(escaped(t.listening));
  });

  it("deshabilitado no deja empezar, pero sí cancelar si ya escuchaba", () => {
    expect(view({ disabled: true })).toMatch(/<button[^>]*disabled=""/);
    expect(view({ disabled: true, listening: true })).not.toMatch(/<button[^>]*disabled=""/);
  });

  it("los errores se muestran en español con role=alert", () => {
    const html = view({ error: t.errors.permissionDenied });
    expect(html).toContain('role="alert"');
    expect(html).toContain(escaped(t.errors.permissionDenied));
  });
});

describe("DictationButton y ChatDock", () => {
  it("en el primer render no toca window ni el micrófono", () => {
    expect(renderToStaticMarkup(createElement(DictationButton, { disabled: false, onText: noop }))).toBe("");
  });

  it("el chat sigue teniendo su campo y su botón de enviar", () => {
    const html = renderToStaticMarkup(createElement(ChatDock, { roomId: 1 }));
    expect(html).toContain(`>${es.chat.send}</button>`);
    expect(html).toContain('class="chat-dock-actions"');
  });
});

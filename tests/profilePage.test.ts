/**
 * Perfiles públicos en la interfaz (CONTRATO-HABITA-PERFILES.md, parte A con recorte): línea del autor en
 * la tarjeta, cabecera del perfil y campo del nombre visible en el diálogo de publicar. Se renderiza en
 * el servidor, sin DOM.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProfileHeader } from "../src/components/ProfileHeader";
import { PublicationCard, type PublicationByline } from "../src/components/PublicationCard";
import { PublishForm } from "../src/components/PublishProjectButton";
import { SOCIAL_NETWORK_NAME, es } from "../src/i18n/es";
import type { PublicProfile, PublicPublication } from "../src/lib/api";

const noop = () => undefined;
const AUTHOR_CODE = "PerfilPublico_-1";

const PUBLICATION: PublicPublication = {
  code: "AbCdEfGhIjKlMn_-",
  title: "Dormitorio con escritorio",
  description: null,
  publishedAt: "2026-11-08T10:00:00Z",
  updatedAt: "2026-11-08T10:00:00Z",
  copies: 0,
  mine: false,
  room: { vertices: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }], heightM: 2.5, areaM2: 12 },
  itemCount: 2,
};

function escaped(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

function card(byline?: PublicationByline | null) {
  return renderToStaticMarkup(
    createElement(PublicationCard, {
      publication: PUBLICATION,
      byline,
      index: 0,
      copying: false,
      disabled: false,
      error: null,
      onCopy: noop,
    })
  );
}

function header(extra: Partial<PublicProfile> = {}) {
  const profile: PublicProfile = { code: AUTHOR_CODE, displayName: "Lola", publicationCount: 3, mine: false, ...extra };
  return renderToStaticMarkup(createElement(ProfileHeader, { profile }));
}

function form(displayName?: Parameters<typeof PublishForm>[0]["displayName"], extra: Partial<Parameters<typeof PublishForm>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(PublishForm, {
      mode: "publish",
      title: "Mi dormitorio",
      description: "",
      busy: false,
      error: null,
      invalidField: null,
      displayName,
      onTitleChange: noop,
      onDescriptionChange: noop,
      onSubmit: noop,
      onCancel: noop,
      ...extra,
    })
  );
}

describe("PublicationCard con autor", () => {
  it("muestra el nombre visible, sus proyectos y «Ver perfil» hacia su código público", () => {
    const html = card({ author: { code: AUTHOR_CODE, displayName: "Lola", mine: false }, count: 3 });

    expect(html).toContain('class="publication-author"');
    expect(html).toContain(">Lola<");
    expect(html).toContain(">3 proyectos<");
    expect(html).toContain(`href="/red/perfil/${AUTHOR_CODE}"`);
    expect(html).toContain(escaped(es.profile.viewProfile));
    expect(html).toContain(`aria-label="${escaped(es.profile.viewProfileLabel("Lola"))}"`);
  });

  it("sin nombre visible sale «Autor anónimo», con enlace si tiene perfil", () => {
    const html = card({ author: { code: AUTHOR_CODE, displayName: null, mine: false }, count: 1 });

    expect(html).toContain(escaped(es.profile.anonymous));
    expect(html).toContain(">1 proyecto<");
    expect(html).toContain(`href="/red/perfil/${AUTHOR_CODE}"`);
  });

  it("sin perfil sale «Autor anónimo» y sin enlace", () => {
    const html = card({ author: null, count: 1 });

    expect(html).toContain(escaped(es.profile.anonymous));
    expect(html).not.toContain("/red/perfil/");
    expect(html).not.toContain(escaped(es.profile.viewProfile));
  });

  it("sin byline (dentro de un perfil) no hay línea de autor", () => {
    const html = card();

    expect(html).not.toContain("publication-author");
    expect(html).not.toContain("/red/perfil/");
  });
});

describe("ProfileHeader", () => {
  it("muestra el nombre, el número de proyectos y vuelve a la red", () => {
    const html = header();

    expect(html).toContain("<h1");
    expect(html).toContain(">Lola</h1>");
    expect(html).toContain(escaped(es.profile.title));
    expect(html).toContain(SOCIAL_NETWORK_NAME);
    expect(html).toContain("3 proyectos");
    expect(html).toContain('href="/red"');
    expect(html).not.toContain(escaped(es.social.mine));
  });

  it("anónimo, con un solo proyecto y propio", () => {
    const html = header({ displayName: null, publicationCount: 1, mine: true });

    expect(html).toContain(`>${escaped(es.profile.anonymous)}</h1>`);
    expect(html).toContain("1 proyecto");
    expect(html).toContain(escaped(es.social.mine));
  });

  it("es de solo lectura y no muestra datos personales", () => {
    const html = header();

    expect(html).not.toContain("<input");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("@");
    expect(html).not.toContain(AUTHOR_CODE);
  });
});

describe("PublishForm con el nombre visible", () => {
  it("muestra el campo con su valor, el máximo de 40 y la explicación", () => {
    const html = form({ value: "Lola", loading: false, onChange: noop });

    expect(html).toContain(escaped(es.publish.displayNameLabel));
    expect(html).toContain('value="Lola"');
    expect(html).toContain('maxLength="40"');
    expect(html).toContain(escaped(es.publish.displayNameHint));
    expect(html).not.toContain(escaped(es.publish.displayNameLoading));
  });

  it("mientras carga el perfil, el campo y «Publicar» quedan deshabilitados", () => {
    const html = form({ value: "", loading: true, onChange: noop });

    expect(html).toContain(escaped(es.publish.displayNameLoading));
    expect(html).toMatch(/<button type="submit" disabled="">/);
  });

  it("marca el campo con el error del nombre", () => {
    const html = form({ value: "x", loading: false, onChange: noop }, { invalidField: "displayName", error: es.profile.tooLong });

    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain(escaped(es.profile.tooLong));
  });

  it("sin la prop no hay campo (compatibilidad con los usos antiguos)", () => {
    const html = form();

    expect(html).not.toContain(escaped(es.publish.displayNameLabel));
    expect(html).toMatch(/<button type="submit">/);
  });

  it("el aviso ya no promete ocultar el nombre: dice que solo se ve el nombre visible", () => {
    expect(es.publish.notice).toContain("nombre visible");
    expect(es.publish.notice).not.toContain("ni tu nombre");
  });
});

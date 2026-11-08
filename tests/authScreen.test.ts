/**
 * Login (FASE 1, punto 3), renderizado en el servidor sin DOM: ojito, atributos autocomplete y que la
 * lista de correos no sale del servidor (se lee de localStorage al montar, en el navegador).
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AuthScreen } from "../src/components/AuthScreen";
import { es } from "../src/i18n/es";

function render() {
  return renderToStaticMarkup(createElement(AuthScreen, { onAuthenticated: () => {} }));
}

/** La etiqueta <input …> cuyo name es name (los atributos pueden ir en cualquier orden). */
function inputTag(html: string, name: string) {
  return html.match(/<input [^>]*>/g)?.find((tag) => tag.includes(`name="${name}"`)) ?? "";
}

describe("AuthScreen login form", () => {
  it("marks the email as the account username and the password as the current one", () => {
    const html = render();

    const email = inputTag(html, "email");
    expect(email).toContain('type="email"');
    expect(email).toContain('autoComplete="username"');
    const password = inputTag(html, "password");
    expect(password).toContain('type="password"');
    expect(password).toContain('autoComplete="current-password"');
  });

  it("has an eye button that starts hidden and points to the password field", () => {
    const html = render();

    const id = /id="([^"]+)"/.exec(inputTag(html, "password"))?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain(`<label for="${id}" class="auth-password-label">`);
    expect(html).toContain(`aria-controls="${id}" aria-pressed="false" aria-label="${es.auth.showPassword}"`);
  });

  it("renders no list of emails on the server", () => {
    expect(render()).not.toContain("auth-known-emails");
  });
});

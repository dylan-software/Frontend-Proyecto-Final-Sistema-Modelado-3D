import { describe, it, expect } from "vitest";

import { ROUTES, sessionRedirect } from "../src/lib/routes";

const PAGES = ["/", "/proyectos", "/red", "/proyecto/[id]", "/scan"];

describe("sessionRedirect", () => {
  it("sends a signed-in user from / to the projects", () => {
    expect(sessionRedirect("/", true)).toBe("/proyectos");
  });

  it("sends every other page to / without a session", () => {
    for (const page of PAGES.filter((p) => p !== "/")) expect(sessionRedirect(page, false)).toBe("/");
  });

  it("leaves the page alone when it fits the session state", () => {
    expect(sessionRedirect("/", false)).toBeNull();
    for (const page of PAGES.filter((p) => p !== "/")) expect(sessionRedirect(page, true)).toBeNull();
  });

  it("never loops: following redirects always stops after at most one hop", () => {
    for (const signedIn of [true, false]) {
      for (const page of PAGES) {
        const target = sessionRedirect(page, signedIn);
        if (target !== null) expect(sessionRedirect(target, signedIn)).toBeNull();
      }
    }
  });

  it("builds project URLs", () => {
    expect(ROUTES.project(12)).toBe("/proyecto/12");
  });
});

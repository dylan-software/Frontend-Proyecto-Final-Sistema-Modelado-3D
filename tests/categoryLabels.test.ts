import { describe, it, expect } from "vitest";

import { es } from "../src/i18n/es";
import { categoryLabel } from "../src/lib/catalog";

describe("categoryLabel", () => {
  it("shows the Spanish group title of a known category", () => {
    expect(categoryLabel("sofa")).toBe("Sofás");
    expect(categoryLabel("bed")).toBe("Camas");
    expect(categoryLabel("other")).toBe("Otros");
  });

  it("uses the singular map for the form options", () => {
    expect(categoryLabel("chair", es.categories.options)).toBe("Silla");
    expect(categoryLabel("Others", es.categories.options)).toBe("Otra (escribir…)");
  });

  it("falls back to the original value for categories typed by the user", () => {
    expect(categoryLabel("Mesas auxiliares")).toBe("Mesas auxiliares");
    expect(categoryLabel("rug", es.categories.options)).toBe("rug");
  });

  it("does not treat inherited object keys as labels", () => {
    expect(categoryLabel("toString")).toBe("toString");
    expect(categoryLabel("constructor", es.categories.options)).toBe("constructor");
  });

  it("has a group title for every option the form offers", () => {
    for (const value of Object.keys(es.categories.options)) {
      expect(categoryLabel(value)).not.toBe(value);
    }
  });
});

import { describe, it, expect } from "vitest";

import { es } from "../src/i18n/es";

describe("photo dialog texts", () => {
  it("warns that the photo goes to an external AI service and is not stored", () => {
    const privacy = es.photo.dialog.privacy;

    expect(privacy).toContain("servicio de IA externo");
    expect(privacy).toContain("no incluyas personas ni datos personales");
    expect(privacy).toContain("no se guarda");
  });

  it.each([
    [0, "Se perderá la forma actual de la sala: se reemplazará por la que estime la foto."],
    [1, "Se perderán la forma actual de la sala y su mueble guardado: se reemplazarán por lo que estime la foto."],
    [4, "Se perderán la forma actual de la sala y sus 4 muebles guardados: se reemplazarán por lo que estime la foto."],
  ])("says what is lost with %i saved items", (count, expected) => {
    expect(es.photo.dialog.replace(count)).toBe(expected);
  });

  it("counts the drawn objects in singular and plural", () => {
    expect(es.photo.ui.done(1)).toBe("Se dibujó 1 objeto estimado.");
    expect(es.photo.ui.done(0)).toBe("Se dibujaron 0 objetos estimados.");
    expect(es.photo.ui.done(7)).toBe("Se dibujaron 7 objetos estimados.");
  });
});

/**
 * Cabecera de una sección de grupo (FASE 1, puntos 1 y 2), renderizada en el servidor sin DOM: la
 * flecha para plegar, el título truncable con el nombre completo en `title` y el lápiz siempre presente.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { GroupSection } from "../src/components/GroupSection";
import { es } from "../src/i18n/es";
import type { ProjectGroup } from "../src/lib/api";

const LONG_NAME = "Casa de la abuela en el pueblo, segunda planta y desván";

function render(group: ProjectGroup | null) {
  return renderToStaticMarkup(
    createElement(GroupSection, {
      group,
      rooms: [],
      groups: group ? [group] : [],
      total: 0,
      creating: false,
      onCreateProject: () => {},
      onMove: async () => {},
      onUpdateGroup: group ? async () => {} : undefined,
    }),
  );
}

function escaped(text: string) {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

describe("GroupSection header", () => {
  const group = { id: 5, name: LONG_NAME, description: null } as unknown as ProjectGroup;

  it("starts open, with a toggle that controls the grid", () => {
    const html = render(group);

    expect(html).toContain('class="group-section-toggle"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain(`aria-label="${escaped(es.groups.collapse(LONG_NAME))}"`);
    const controls = /aria-controls="([^"]+)"/.exec(html)?.[1];
    expect(controls).toBeTruthy();
    expect(html).toContain(`id="${controls}" class="group-section-body"`);
    expect(html).not.toContain("group-section-closed");
  });

  it("truncates the name, keeps the pencil and puts the full name in title", () => {
    const html = render(group);

    expect(html).toContain("inline-edit-truncate");
    expect(html).toContain(`title="${escaped(LONG_NAME)}"`);
    expect(html).toContain("inline-edit-pencil");
    // El botón conserva su etiqueta accesible ("Editar el nombre del grupo …").
    expect(html).toContain(`aria-label="${escaped(es.groups.editGroupName(LONG_NAME))}"`);
  });

  it("also folds the projects without a group", () => {
    const html = render(null);

    expect(html).toContain(`aria-label="${escaped(es.groups.collapse(es.groups.ungroupedTitle))}"`);
    expect(html).not.toContain("inline-edit-truncate");
  });
});

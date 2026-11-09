import Link from "next/link";
import type { ComponentType } from "react";

import { es } from "../i18n/es";
import { ROUTES } from "../lib/routes";
import { IconProjects, IconSocial } from "./icons";

export type NavSection = "projects" | "social";

const ITEMS: { id: NavSection; href: string; label: string; Icon: ComponentType }[] = [
  { id: "projects", href: ROUTES.projects, label: es.shell.projects, Icon: IconProjects },
  { id: "social", href: ROUTES.social, label: es.shell.social, Icon: IconSocial },
];

/**
 * Barra lateral con las dos secciones; la activa lleva `aria-current="page"`. En pantallas estrechas
 * el CSS la convierte en una barra inferior fija.
 */
export function SideNav({ active }: { active: NavSection }) {
  return (
    <nav className="side-nav glass" aria-label={es.shell.navLabel}>
      <p className="side-nav-title" aria-hidden="true">
        {es.shell.navTitle}
      </p>
      <ul className="side-nav-list">
        {ITEMS.map(({ id, href, label, Icon }) => (
          <li key={id}>
            <Link href={href} className="side-nav-link" aria-current={id === active ? "page" : undefined}>
              <Icon />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

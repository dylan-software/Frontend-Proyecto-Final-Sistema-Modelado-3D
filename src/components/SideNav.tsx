import Link from "next/link";
import type { ComponentType } from "react";

import { es } from "../i18n/es";
import { ROUTES } from "../lib/routes";

export type NavSection = "projects" | "social";

/** Icono de Proyectos: la planta de una sala en L. */
function ProjectsIcon() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
      <path d="M3 3h14v8h-6v6H3z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M3 9h5M8 3v3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Icono de Red Social: tres nodos conectados. */
function SocialIcon() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
      <circle cx="5" cy="10" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15" cy="4.5" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15" cy="15.5" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="m7 9 6-3.4M7 11l6 3.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

const ITEMS: { id: NavSection; href: string; label: string; Icon: ComponentType }[] = [
  { id: "projects", href: ROUTES.projects, label: es.shell.projects, Icon: ProjectsIcon },
  { id: "social", href: ROUTES.social, label: es.shell.social, Icon: SocialIcon },
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

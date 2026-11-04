import Link from "next/link";
import type { ReactElement } from "react";

import { AppShell } from "../components/AppShell";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { es } from "../i18n/es";
import { ROUTES } from "../lib/routes";

type IdeaId = (typeof es.social.ideas)[number]["id"];

/** Iconos de trazo fino de cada idea, en el mismo estilo que la barra lateral. */
const IDEA_ICONS: Record<IdeaId, ReactElement> = {
  share: (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d="M12 15V4M8 8l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 13v6h14v-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  explore: (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="m15 9-2 4-4 2 2-4z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  copy: (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <rect x="8" y="8" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 15V6a1 1 0 0 1 1-1h9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
};

/** Plano a medio trazar: paredes terminadas y otras aún discontinuas, como una obra en curso. */
function UnderConstructionPlan() {
  return (
    <svg className="social-plan" viewBox="0 0 160 120" aria-hidden="true">
      <path className="social-plan-done" d="M20 100V20h70" />
      <path className="social-plan-pending" d="M90 20h50v50M140 70v30H20" />
      <path className="social-plan-done" d="M90 20v35h-25" />
      <circle className="social-plan-cursor" cx="140" cy="70" r="4" />
    </svg>
  );
}

/** /red: la red social todavía no existe; se explica qué será, sin datos ni backend. */
export default function SocialPage() {
  const t = es.social;
  const { session, logout } = useSessionGuard();
  if (session.status !== "signedIn") return null;

  return (
    <AppShell active="social" userName={session.userName} onLogout={logout}>
      <div className="social-panel glass">
        <div className="social-hero">
          <UnderConstructionPlan />
          <div>
            <p className="social-status">{t.status}</p>
            <h1 className="page-title">{t.title}</h1>
            <p className="social-lead">{t.lead}</p>
          </div>
        </div>

        <h2 className="social-ideas-title">{t.ideasTitle}</h2>
        <ul className="social-ideas">
          {t.ideas.map((idea) => (
            <li key={idea.id} className="social-idea">
              <span className="social-idea-icon">{IDEA_ICONS[idea.id]}</span>
              <span className="social-idea-title">{idea.title}</span>
              <span className="social-idea-text">{idea.text}</span>
            </li>
          ))}
        </ul>

        <p className="social-note">
          {t.note}{" "}
          <Link href={ROUTES.projects} className="social-back">
            {t.backToProjects}
          </Link>
        </p>
      </div>
    </AppShell>
  );
}

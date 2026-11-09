import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";

import { AppShell } from "../components/AppShell";
import { PlanEmpty, PlanLoading } from "../components/PlanState";
import { PublicationCard } from "../components/PublicationCard";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { es } from "../i18n/es";
import { api, type PublicPublication } from "../lib/api";
import { ROUTES } from "../lib/routes";
import { appendCatalogPage, copyErrorMessage } from "../lib/social";

type CatalogState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: PublicPublication[]; page: number; hasMore: boolean };

/**
 * /red: catálogo público de la red social (CONTRATO-FASE9.md). Lista los proyectos publicados, de la
 * publicación más nueva a la más vieja, y copia el elegido a los proyectos de la cuenta.
 */
export default function SocialPage() {
  const t = es.social;
  const router = useRouter();
  const { session, logout } = useSessionGuard();
  const signedIn = session.status === "signedIn";
  const [state, setState] = useState<CatalogState>({ status: "loading" });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [copyingCode, setCopyingCode] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<{ code: string; message: string } | null>(null);

  const loadFirstPage = useCallback(async () => {
    setState({ status: "loading" });
    setMoreError(null);
    try {
      const result = await api.listPublications(1);
      setState({ status: "ready", items: result.items, page: result.page, hasMore: result.hasMore });
    } catch (err) {
      setState({ status: "error", message: (err as Error).message });
    }
  }, []);

  useEffect(() => {
    if (signedIn) void loadFirstPage();
  }, [signedIn, loadFirstPage]);

  async function handleLoadMore() {
    if (state.status !== "ready" || loadingMore) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const result = await api.listPublications(state.page + 1);
      setState((prev) =>
        prev.status === "ready"
          ? { status: "ready", items: appendCatalogPage(prev.items, result.items), page: result.page, hasMore: result.hasMore }
          : prev
      );
    } catch (err) {
      setMoreError(t.loadMoreFailed((err as Error).message));
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleCopy(code: string) {
    if (copyingCode) return;
    setCopyingCode(code);
    setCopyError(null);
    try {
      const copied = await api.copyPublication(code);
      await router.push(ROUTES.project(copied.room.id));
    } catch (err) {
      setCopyError({ code, message: copyErrorMessage(err) });
      setCopyingCode(null);
    }
  }

  if (!signedIn) return null;

  return (
    <AppShell active="social" userName={session.userName} onLogout={logout}>
      <div className="page-header">
        <h1 className="page-title">{t.title}</h1>
        <p className="page-subtitle">{t.catalogLead}</p>
      </div>
      <p className="social-privacy">
        {t.privacyNote} {t.howToPublish}
      </p>

      {state.status === "loading" && <PlanLoading label={t.loading} />}

      {state.status === "error" && (
        <div className="page-state glass" role="alert">
          <p className="page-state-title">{t.loadFailed}</p>
          <p className="page-state-text">{state.message}</p>
          <button type="button" className="page-state-action" onClick={() => void loadFirstPage()}>
            {t.retry}
          </button>
        </div>
      )}

      {state.status === "ready" && state.items.length === 0 && (
        <PlanEmpty
          drawing="sheets"
          title={t.emptyTitle}
          text={t.emptyText}
          action={
            <Link href={ROUTES.projects} className="social-back">
              {t.backToProjects}
            </Link>
          }
        />
      )}

      {state.status === "ready" && state.items.length > 0 && (
        <>
          <ul className="project-grid">
            {state.items.map((publication, index) => (
              <PublicationCard
                key={publication.code}
                publication={publication}
                index={index}
                copying={copyingCode === publication.code}
                disabled={copyingCode !== null}
                error={copyError?.code === publication.code ? copyError.message : null}
                onCopy={(code) => void handleCopy(code)}
              />
            ))}
          </ul>
          {moreError && (
            <p className="page-alert social-more-error" role="alert">
              {moreError}
            </p>
          )}
          {state.hasMore && (
            <div className="social-more">
              <button type="button" className="new-group-button" onClick={() => void handleLoadMore()} disabled={loadingMore}>
                {loadingMore ? t.loadingMore : t.loadMore}
              </button>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

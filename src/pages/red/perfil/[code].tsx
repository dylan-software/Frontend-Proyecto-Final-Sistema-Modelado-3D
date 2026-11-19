import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";

import { AppShell } from "../../../components/AppShell";
import { PlanEmpty, PlanLoading } from "../../../components/PlanState";
import { ProfileHeader } from "../../../components/ProfileHeader";
import { PublicationCard } from "../../../components/PublicationCard";
import { SessionLoading } from "../../../components/SessionLoading";
import { usePublicationCopy } from "../../../hooks/usePublicationCopy";
import { useSessionGuard } from "../../../hooks/useSessionGuard";
import { es } from "../../../i18n/es";
import { api, ApiError, type PublicProfile, type PublicPublication } from "../../../lib/api";
import { ROUTES } from "../../../lib/routes";
import { appendCatalogPage, profileErrorMessage } from "../../../lib/social";

type ProfileState =
  | { status: "loading" }
  | { status: "error"; message: string; notFound: boolean }
  | { status: "ready"; profile: PublicProfile; items: PublicPublication[]; page: number; hasMore: boolean };

/**
 * /red/perfil/[code]: perfil público de un autor de la red social (CONTRATO-HABITA-PERFILES.md, parte A).
 * Solo lectura, también para su dueño: nombre visible, número de proyectos y sus publicaciones públicas,
 * de la más nueva a la más vieja, con "Cargar más". Protegida por la regla de sesión de siempre.
 */
export default function ProfilePageRoute() {
  const t = es.profile;
  const router = useRouter();
  const { session, logout } = useSessionGuard();
  const signedIn = session.status === "signedIn";
  const code = typeof router.query.code === "string" ? router.query.code : null;
  const [state, setState] = useState<ProfileState>({ status: "loading" });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const { copyingCode, copyError, copy } = usePublicationCopy();

  const loadFirstPage = useCallback(async (profileCode: string) => {
    setState({ status: "loading" });
    setMoreError(null);
    try {
      const result = await api.getProfile(profileCode, 1);
      setState({ status: "ready", profile: result.profile, items: result.items, page: result.page, hasMore: result.hasMore });
    } catch (err) {
      // Un 422 (código con otra forma) es, para quien mira, lo mismo que un perfil que no existe.
      const notFound = err instanceof ApiError && (err.status === 404 || err.status === 422);
      setState({ status: "error", message: notFound ? t.notFound : profileErrorMessage(err), notFound });
    }
  }, [t.notFound]);

  useEffect(() => {
    if (signedIn && router.isReady && code) void loadFirstPage(code);
  }, [signedIn, router.isReady, code, loadFirstPage]);

  async function handleLoadMore() {
    if (state.status !== "ready" || loadingMore || !code) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const result = await api.getProfile(code, state.page + 1);
      setState((prev) =>
        prev.status === "ready"
          ? {
              status: "ready",
              profile: result.profile,
              items: appendCatalogPage(prev.items, result.items),
              page: result.page,
              hasMore: result.hasMore,
            }
          : prev
      );
    } catch (err) {
      setMoreError(es.social.loadMoreFailed(profileErrorMessage(err)));
    } finally {
      setLoadingMore(false);
    }
  }

  // Hasta saber si hay sesión (o mientras se redirige al login), nada de la página: solo la carga neutra.
  if (!signedIn) return <SessionLoading />;

  return (
    <AppShell active="social" userName={session.userName} onLogout={logout}>
      {(state.status === "loading" || !code) && <PlanLoading label={t.loading} />}

      {state.status === "error" && (
        <div className="page-state glass" role="alert">
          <p className="page-state-title">{state.notFound ? t.notFound : t.loadFailed}</p>
          {!state.notFound && <p className="page-state-text">{state.message}</p>}
          {state.notFound ? (
            <Link href={ROUTES.social} className="social-back">
              {t.backToSocial}
            </Link>
          ) : (
            <button type="button" className="page-state-action" onClick={() => code && void loadFirstPage(code)}>
              {es.social.retry}
            </button>
          )}
        </div>
      )}

      {state.status === "ready" && (
        <>
          <ProfileHeader profile={state.profile} />
          {state.items.length === 0 ? (
            <PlanEmpty drawing="sheets" title={t.emptyTitle} text={t.emptyText} />
          ) : (
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
                    onCopy={(publicationCode) => void copy(publicationCode)}
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
                  <button
                    type="button"
                    className="new-group-button"
                    onClick={() => void handleLoadMore()}
                    disabled={loadingMore}
                  >
                    {loadingMore ? es.social.loadingMore : es.social.loadMore}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </AppShell>
  );
}

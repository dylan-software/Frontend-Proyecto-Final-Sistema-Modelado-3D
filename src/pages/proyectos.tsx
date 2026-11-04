import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";

import { AppShell } from "../components/AppShell";
import { NewProjectCard } from "../components/NewProjectCard";
import { ProjectCard } from "../components/ProjectCard";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { es } from "../i18n/es";
import { api, type RoomSummary } from "../lib/api";
import { filterProjects, newProjectRoom, nextProjectName } from "../lib/projects";
import { ROUTES } from "../lib/routes";
import { saveCurrentRoomId } from "../lib/session";

type ProjectsState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; rooms: RoomSummary[] };

/** Esqueletos con el contorno de un plano mientras llega la lista. */
function ProjectSkeletons() {
  return (
    <>
      {[1, 2, 3].map((n) => (
        <li key={n} className="project-card-item" aria-hidden="true">
          <div className="project-card project-card-skeleton glass">
            <span className="project-card-plan" />
            <span className="project-card-body">
              <span className="skeleton-line" />
              <span className="skeleton-line skeleton-line-short" />
            </span>
          </div>
        </li>
      ))}
    </>
  );
}

/** /proyectos: cuadrícula con "Nuevo proyecto" y una tarjeta por sala de la cuenta. */
export default function ProjectsPage() {
  const t = es.projects;
  const router = useRouter();
  const { session, logout } = useSessionGuard();
  const [state, setState] = useState<ProjectsState>({ status: "loading" });
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const userId = session.status === "signedIn" ? session.userId : null;

  // La búsqueda puede llegar en la URL (?q=…) desde el buscador de otra sección.
  useEffect(() => {
    if (router.isReady && typeof router.query.q === "string") setQuery(router.query.q);
  }, [router.isReady, router.query.q]);

  const load = useCallback(async (accountId: string) => {
    setState({ status: "loading" });
    try {
      const res = await api.listUserSpaces(accountId);
      setState({ status: "ready", rooms: res.habitaciones });
    } catch (err) {
      setState({ status: "error", message: (err as Error).message });
    }
  }, []);

  useEffect(() => {
    if (userId) void load(userId);
  }, [userId, load]);

  /** Crea la sala de 4 × 3 m con un nombre libre y abre el proyecto. */
  async function handleCreate() {
    if (state.status !== "ready" || creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const name = nextProjectName(
        state.rooms.map((room) => room.nombre),
        t.newProjectName
      );
      const room = await api.createRoom(newProjectRoom(name));
      saveCurrentRoomId(room.id);
      await router.push(ROUTES.project(room.id));
    } catch (err) {
      setCreateError(t.createFailed((err as Error).message));
      setCreating(false);
    }
  }

  if (session.status !== "signedIn") return null;

  const rooms = state.status === "ready" ? filterProjects(state.rooms, query) : [];
  const total = state.status === "ready" ? state.rooms.length : null;

  return (
    <AppShell active="projects" userName={session.userName} onLogout={logout} searchQuery={query} onSearchChange={setQuery}>
      <div className="page-header">
        <h1 className="page-title">{t.title}</h1>
        {total !== null && <p className="page-subtitle">{t.count(total)}</p>}
      </div>

      {createError && (
        <p className="page-alert" role="alert">
          {createError}
        </p>
      )}

      {state.status === "error" ? (
        <div className="page-state glass" role="alert">
          <p className="page-state-title">{t.loadFailed}</p>
          <p className="page-state-text">{state.message}</p>
          <button type="button" className="page-state-action" onClick={() => userId && load(userId)}>
            {t.retry}
          </button>
        </div>
      ) : (
        <ul className="project-grid" aria-busy={state.status === "loading"}>
          <NewProjectCard onCreate={handleCreate} creating={creating} disabled={state.status !== "ready"} />
          {state.status === "loading" ? (
            <ProjectSkeletons />
          ) : (
            rooms.map((room, i) => <ProjectCard key={room.id} room={room} index={i + 1} />)
          )}
        </ul>
      )}

      {state.status === "loading" && <p className="visually-hidden" role="status">{t.loading}</p>}

      {state.status === "ready" && state.rooms.length === 0 && <p className="page-empty">{t.empty}</p>}

      {state.status === "ready" && state.rooms.length > 0 && rooms.length === 0 && (
        <p className="page-empty" role="status">
          {t.noMatches(query.trim())}{" "}
          <button type="button" className="link-button" onClick={() => setQuery("")}>
            {t.clearSearch}
          </button>
        </p>
      )}
    </AppShell>
  );
}

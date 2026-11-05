import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";

import { AppShell } from "../components/AppShell";
import { GroupSection } from "../components/GroupSection";
import { NewGroupButton } from "../components/NewGroupButton";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { es } from "../i18n/es";
import { api, type ProjectGroup, type RoomSummary } from "../lib/api";
import { groupProjects, nextTestName } from "../lib/groups";
import { filterProjects, newProjectRoom } from "../lib/projects";
import { roomDetailLoader } from "../lib/roomDetails";
import { ROUTES } from "../lib/routes";
import { saveCurrentRoomId } from "../lib/session";

type ProjectsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; rooms: RoomSummary[]; groups: ProjectGroup[] };

/** Esqueletos con el contorno de un plano mientras llega la lista. */
function ProjectSkeletons() {
  return (
    <ul className="project-grid" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <li key={n} className="project-card-item">
          <div className="project-card project-card-skeleton glass">
            <span className="project-card-plan" />
            <span className="project-card-body">
              <span className="skeleton-line" />
              <span className="skeleton-line skeleton-line-short" />
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * /proyectos: una sección por grupo (nombre y descripción editables, "+ Proyecto aquí" y sus proyectos),
 * "+ Nuevo grupo" arriba y "Proyectos sin grupo" al final. Los proyectos nuevos se llaman "Prueba N" con
 * el menor N libre dentro de su sección.
 */
export default function ProjectsPage() {
  const t = es.projects;
  const g = es.groups;
  const router = useRouter();
  const { session, logout } = useSessionGuard();
  const [state, setState] = useState<ProjectsState>({ status: "loading" });
  const [query, setQuery] = useState("");
  // Sección donde se está creando un proyecto: id del grupo, "none" (sin grupo) o null.
  const [creatingIn, setCreatingIn] = useState<number | "none" | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const userId = session.status === "signedIn" ? session.userId : null;

  // La búsqueda puede llegar en la URL (?q=…) desde el buscador de otra sección.
  useEffect(() => {
    if (router.isReady && typeof router.query.q === "string") setQuery(router.query.q);
  }, [router.isReady, router.query.q]);

  const load = useCallback(async (accountId: string) => {
    setState({ status: "loading" });
    try {
      const [spaces, groupList] = await Promise.all([api.listUserSpaces(accountId), api.listGroups()]);
      setState({ status: "ready", rooms: spaces.habitaciones, groups: groupList.groups });
    } catch (err) {
      setState({ status: "error", message: (err as Error).message });
    }
  }, []);

  useEffect(() => {
    if (userId) void load(userId);
  }, [userId, load]);

  /** Crea una sala de 4 × 3 m llamada "Prueba N" en el grupo (o sin grupo) y abre el proyecto. */
  async function handleCreate(groupId: number | null) {
    if (state.status !== "ready" || creatingIn !== null) return;
    setCreatingIn(groupId ?? "none");
    setCreateError(null);
    try {
      const siblings = state.rooms.filter((room) => (room.group_id ?? null) === groupId);
      const name = nextTestName(siblings.map((room) => room.nombre));
      const room = await api.createRoom({ ...newProjectRoom(name), ...(groupId !== null ? { groupId } : {}) });
      saveCurrentRoomId(room.id);
      await router.push(ROUTES.project(room.id));
    } catch (err) {
      setCreateError(t.createFailed((err as Error).message));
      setCreatingIn(null);
    }
  }

  async function handleCreateGroup(name: string) {
    const group = await api.createGroup({ name });
    setState((prev) => (prev.status === "ready" ? { ...prev, groups: [...prev.groups, group] } : prev));
  }

  async function handleUpdateGroup(groupId: number, changes: { name?: string; description?: string | null }) {
    const updated = await api.updateGroup(groupId, changes);
    setState((prev) =>
      prev.status === "ready"
        ? { ...prev, groups: prev.groups.map((group) => (group.id === groupId ? updated : group)) }
        : prev
    );
  }

  async function handleMove(roomId: number, groupId: number | null) {
    await api.updateRoom(roomId, { groupId });
    roomDetailLoader.forget(roomId);
    setState((prev) =>
      prev.status === "ready"
        ? { ...prev, rooms: prev.rooms.map((room) => (room.id === roomId ? { ...room, group_id: groupId } : room)) }
        : prev
    );
  }

  if (session.status !== "signedIn") return null;

  const ready = state.status === "ready" ? state : null;
  const all = ready ? groupProjects(ready.rooms, ready.groups) : null;
  const searching = query.trim() !== "";
  const visible = (rooms: RoomSummary[]) => filterProjects(rooms, query);
  const matches = ready ? visible(ready.rooms).length : 0;

  return (
    <AppShell active="projects" userName={session.userName} onLogout={logout} searchQuery={query} onSearchChange={setQuery}>
      <div className="page-header">
        <h1 className="page-title">{t.title}</h1>
        {ready && <p className="page-subtitle">{g.summary(ready.groups.length, ready.rooms.length)}</p>}
        <div className="page-header-actions">
          <NewGroupButton onCreate={handleCreateGroup} disabled={!ready} />
        </div>
      </div>

      {createError && (
        <p className="page-alert" role="alert">
          {createError}
        </p>
      )}

      {state.status === "loading" && (
        <>
          <p className="visually-hidden" role="status">
            {t.loading}
          </p>
          <ProjectSkeletons />
        </>
      )}

      {state.status === "error" && (
        <div className="page-state glass" role="alert">
          <p className="page-state-title">{t.loadFailed}</p>
          <p className="page-state-text">{state.message}</p>
          <button type="button" className="page-state-action" onClick={() => userId && load(userId)}>
            {t.retry}
          </button>
        </div>
      )}

      {ready && all && (
        <>
          {all.sections.map(({ group, rooms }) => {
            const shown = visible(rooms);
            // Mientras hay búsqueda, un grupo sin coincidencias se oculta.
            if (searching && shown.length === 0) return null;
            return (
              <GroupSection
                key={group.id}
                group={group}
                rooms={shown}
                groups={ready.groups}
                total={rooms.length}
                creating={creatingIn === group.id}
                disabled={creatingIn !== null}
                onCreateProject={() => void handleCreate(group.id)}
                onMove={handleMove}
                onUpdateGroup={(changes) => handleUpdateGroup(group.id, changes)}
              />
            );
          })}

          {(!searching || visible(all.ungrouped).length > 0) && (
            <GroupSection
              group={null}
              rooms={visible(all.ungrouped)}
              groups={ready.groups}
              total={all.ungrouped.length}
              creating={creatingIn === "none"}
              disabled={creatingIn !== null}
              onCreateProject={() => void handleCreate(null)}
              onMove={handleMove}
              footer={ready.rooms.length === 0 ? <p className="page-empty">{t.empty}</p> : null}
            />
          )}

          {searching && ready.rooms.length > 0 && matches === 0 && (
            <p className="page-empty" role="status">
              {t.noMatches(query.trim())}{" "}
              <button type="button" className="link-button" onClick={() => setQuery("")}>
                {t.clearSearch}
              </button>
            </p>
          )}
        </>
      )}
    </AppShell>
  );
}

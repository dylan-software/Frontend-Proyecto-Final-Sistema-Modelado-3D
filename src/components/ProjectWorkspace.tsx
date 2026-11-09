import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { AiPanel } from "./AiPanel";
import { ExportProjectButton } from "./ExportProjectButton";
import { IconAssistant } from "./icons";
import { PublishProjectButton } from "./PublishProjectButton";
import { InlineEdit } from "./InlineEdit";
import { ChatDock } from "./ChatDock";
import { PhotoToRoom } from "./PhotoToRoom";
import { UndoButton } from "./UndoButton";
import { RoomItemList } from "./RoomItemList";
import { SceneArea } from "./SceneArea";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { es } from "../i18n/es";
import {
  api,
  ApiError,
  toFurnitureInput,
  type FurnitureInput,
  type PhotoAnalysis,
  type PlacedItemResult,
  type Point2D,
  type RoomDetail,
  type RoomItem,
  type RoomUndoResult,
} from "../lib/api";
import { checkDescription, checkPlainName, MAX_PROJECT_NAME_LENGTH } from "../lib/groups";
import type { ItemMoveBody } from "../lib/objectMove";
import { nextUndoDepth } from "../lib/roomUndo";
import { ROUTES } from "../lib/routes";
import { saveCurrentRoomId } from "../lib/session";
import { readAiPanelOpen, saveAiPanelOpen } from "../lib/uiPrefs";
import { cmToM } from "../lib/units";
import { DEFAULT_DIMENSIONS, type Dimensions3D, type FurnitureObject } from "../types/spatial";

/** Por debajo de este ancho el 3D ocupa la pantalla y el panel de IA es una capa. */
const MOBILE_QUERY = "(max-width: 900px)";

/**
 * @deprecated Solo lo usa el layout viejo (/api/layout/generate); ninguna ruta /api/v1 lo usa.
 * TODO(4C): quitarlo cuando el layout pase a las rutas de la sala (o desaparezca de la interfaz, v4 R4).
 */
const DEMO_PROJECT_ID = "demo-project";

/** The current room, as GET /api/v1/spaces/rooms/{id} returns it (meters). */
type SpaceState = RoomDetail;

interface PlacedItemState {
  x: number;
  y: number;
  rotation: number;
  item: FurnitureInput;
}

const DEFAULT_LIGHTING = { position: { x: 0, y: 3, z: 0 }, intensity: 0.8, color: "#ffffff" };

interface ProjectWorkspaceProps {
  /** Sala del proyecto abierto (de la URL /proyecto/[id]). */
  roomId: number;
  /** Cuenta con sesión; la página ya comprobó que la hay. */
  userId: string;
}

/**
 * Pantalla de un proyecto. La cabecera mínima lleva "← Salir del proyecto" y el nombre; debajo, dos
 * columnas: el panel de IA (AiPanel: chat, "Foto a 3D", "Deshacer" y "Objetos del proyecto") y
 * el 3D (SceneArea). En el móvil el 3D ocupa la pantalla y el panel es una capa que se abre con un
 * botón flotante. Este componente conserva la lógica de siempre (carga de la sala, objetos, foto y
 * catálogo); RoomEditor, la distribución y el chat flotante ya no se montan (v4 R4), pero sus
 * manejadores siguen aquí sin cambios.
 *
 * Los objetos son del proyecto (TAREA-RENOMBRAR.md, punto 3): el buscador del catálogo de la cuenta
 * (CategoryAccordion) y "Crear objeto manualmente" (ManualObjectDrawer, que guardaba en el catálogo)
 * ya no se montan aquí. Sus componentes, el estado `catalog` y sus manejadores se conservan; la
 * creación manual volverá cuando exista el endpoint que añade objetos a la sala (TAREA-CHAT-ACCIONES.md).
 */
export function ProjectWorkspace({ roomId, userId }: ProjectWorkspaceProps) {
  // Panel de IA: desplegado o recogido en escritorio (se recuerda); en el móvil, capa abierta o no.
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [panelOpen, setPanelOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  useEffect(() => setPanelOpen(readAiPanelOpen()), []);

  function handlePanelOpenChange(open: boolean) {
    if (isMobile) {
      setSheetOpen(open);
      return;
    }
    setPanelOpen(open);
    saveAiPanelOpen(open);
  }

  // Escape cierra la capa del móvil.
  useEffect(() => {
    if (!isMobile || !sheetOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setSheetOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobile, sheetOpen]);

  const [space, setSpace] = useState<SpaceState | null | "loading" | "none">("loading");
  // Id of the room whose GET is the latest one asked for, so a slower earlier answer is dropped.
  const requestedRoomId = useRef<number | null>(null);
  const [catalog, setCatalog] = useState<FurnitureInput[]>([]);
  const [placedItems, setPlacedItems] = useState<PlacedItemState[]>([]);
  // Furniture whose coordinates were validated by the backend's Octree.
  const [placedFurniture, setPlacedFurniture] = useState<FurnitureObject[]>([]);
  // Objetos guardados en la sala abierta (GET /rooms/{id}/items o la respuesta de la foto).
  const [roomItems, setRoomItems] = useState<RoomItem[]>([]);
  // True mientras la sala abierta muestra lo que estimó una foto (solo en memoria; el backend no lo guarda).
  const [estimated, setEstimated] = useState(false);
  // Cambios de esta visita que se pueden deshacer (lib/roomUndo.ts); 0 al abrir otra sala o recargar.
  const [undoDepth, setUndoDepth] = useState(0);
  const [lighting, setLighting] = useState(DEFAULT_LIGHTING);
  const [generating, setGenerating] = useState(false);
  // Catalog entry whose DELETE request is in flight.
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // True while "Clear all furniture" is deleting the catalog on the server.
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Carga una sala con sus vértices y sus objetos guardados, y la recuerda como la actual. */
  async function openRoom(roomId: number) {
    requestedRoomId.current = roomId;
    saveCurrentRoomId(roomId);
    setSpace("loading");
    setPlacedItems([]);
    setRoomItems([]);
    setEstimated(false);
    setUndoDepth((depth) => nextUndoDepth(depth, { type: "reset" }));
    try {
      const [room, saved] = await Promise.all([api.getRoom(roomId), api.listRoomItems(roomId)]);
      if (requestedRoomId.current !== roomId) return;
      setSpace(room);
      setRoomItems(saved.items);
    } catch (err) {
      if (requestedRoomId.current !== roomId) return;
      setSpace("none");
      setError((err as Error).message);
    }
  }

  /** El catálogo de la cuenta y, después, la sala del proyecto. */
  async function loadWorkspace(accountId: string) {
    try {
      const res = await api.listUserSpaces(accountId);
      setCatalog(res.catalogo.map(toFurnitureInput));
      await openRoom(roomId);
    } catch (err) {
      setSpace("none");
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    loadWorkspace(userId);
  }, [userId, roomId]);

  /**
   * Applies one vertex change of the current room on the server and shows
   * the room it answers with. Errors (422 for an invalid shape) reach
   * RoomEditor, which shows them; the room on screen is left unchanged.
   */
  async function editCurrentRoom(change: (roomId: number) => Promise<RoomDetail>) {
    if (!space || space === "loading" || space === "none") return;
    const room = await change(space.id);
    if (requestedRoomId.current !== room.id) return;
    setSpace(room);
    // La forma ya no es la estimada por la foto: la editó el usuario.
    setEstimated(false);
  }

  const handleVertexMoved = (index: number, point: Point2D) =>
    editCurrentRoom((roomId) => api.moveRoomVertex(roomId, index, point));

  const handleVertexInserted = (afterIndex: number, point: Point2D) =>
    editCurrentRoom((roomId) => api.insertRoomVertex(roomId, afterIndex, point));

  const handleVertexDeleted = (index: number) => editCurrentRoom((roomId) => api.deleteRoomVertex(roomId, index));

  /** La foto ya se guardó en el backend: se muestra la sala estimada y sus objetos. */
  function handlePhotoAnalyzed(result: PhotoAnalysis) {
    if (requestedRoomId.current !== result.room.id) return;
    setSpace(result.room);
    setRoomItems(result.items);
    setEstimated(result.estimated);
    setPlacedItems([]);
    setUndoDepth((depth) => nextUndoDepth(depth, { type: "change" }));
  }

  /**
   * El chat guardó cambios en la sala: se recargan sus objetos (GET /items) para verlos en el 3D y el
   * mensaje cuenta como un cambio que se puede deshacer (una copia por mensaje en el backend).
   */
  async function handleChatChanges() {
    const changedRoomId = requestedRoomId.current;
    if (changedRoomId === null) return;
    setUndoDepth((depth) => nextUndoDepth(depth, { type: "change" }));
    try {
      const saved = await api.listRoomItems(changedRoomId);
      if (requestedRoomId.current !== changedRoomId) return;
      setRoomItems(saved.items);
      setPlacedItems([]);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  /**
   * Mover a mano (FASE 3): PATCH del objeto; el servidor revalida y su respuesta (la posición FINAL)
   * sustituye al objeto en la lista y en el 3D. Cuenta como un cambio que se puede deshacer (el backend
   * guarda una copia antes de cada PATCH correcto). Los errores se relanzan para que SceneArea los muestre.
   */
  async function handleMoveItem(roomId: number, itemId: number, body: ItemMoveBody): Promise<PlacedItemResult> {
    const result = await api.updateRoomItem(roomId, itemId, body);
    if (requestedRoomId.current === roomId) {
      setRoomItems((items) => items.map((item) => (item.id === result.item.id ? result.item : item)));
      setUndoDepth((depth) => nextUndoDepth(depth, { type: "change" }));
    }
    return result;
  }

  /** "Deshacer" ya restauró la sala en el backend: se muestra sin pedir nada más. */
  function handleUndone(result: RoomUndoResult) {
    if (requestedRoomId.current !== result.room.id) return;
    setSpace(result.room);
    setRoomItems(result.items);
    setEstimated(false);
    setPlacedItems([]);
    setUndoDepth((depth) => nextUndoDepth(depth, { type: "undone", remaining: result.remaining }));
  }

  // Cajas en metros de todo lo que ocupa la sala: el layout generado (medidas en cm), los objetos
  // guardados en la sala (p. ej. los de la foto) y las piezas sueltas del visor.
  const occupyingItems = useMemo<Dimensions3D[]>(
    () => [
      ...placedItems.map(({ item }) => ({
        width: cmToM(item.widthCm),
        height: cmToM(item.heightCm),
        depth: cmToM(item.depthCm),
      })),
      ...roomItems.map((item) => ({ width: item.widthM, height: item.heightM, depth: item.depthM })),
      ...placedFurniture.map((f) => f.dimensions ?? DEFAULT_DIMENSIONS),
    ],
    [placedItems, roomItems, placedFurniture]
  );

  /**
   * Deletes one catalog entry on the server (DELETE /api/v1/spaces/furniture/{id})
   * and, once it is gone, removes it from the catalog and from the 3D layout.
   * Only one deletion runs at a time; errors are shown instead of thrown.
   */
  async function deleteFurnitureById(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    setError(null);
    try {
      try {
        await api.deleteFurniture(id);
      } catch (err) {
        // 404: someone already deleted it on the server; still drop it locally.
        if (!(err instanceof ApiError && err.status === 404)) throw err;
      }
      // Drop the entry from the catalog and every copy of it placed in the generated layout.
      setCatalog((prev) => prev.filter((c) => c.id !== id));
      setPlacedItems((prev) => prev.filter((p) => p.item.id !== id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  /**
   * Empties the scene and deletes every catalog entry of this account on the
   * server, after confirmation. Entries whose DELETE failed (server down,
   * 5xx…) stay in the catalog and the error lists their HTTP status.
   */
  async function handleResetSpace() {
    const targets = catalog;
    if (
      targets.length > 0 &&
      !window.confirm(es.home.confirmClear(targets.length))
    ) {
      return;
    }
    setClearing(true);
    setError(null);
    // The scene itself is local state and is always emptied.
    setPlacedFurniture([]);
    setPlacedItems([]);
    try {
      // allSettled: one failed DELETE must not hide the outcome of the others.
      const results = await Promise.allSettled(targets.map((c) => api.deleteFurniture(c.id)));
      const removed = new Set<string>();
      const failures: string[] = [];
      results.forEach((result, i) => {
        const id = targets[i]!.id;
        // 404: the server no longer has it, so it is dropped locally as well.
        if (result.status === "fulfilled" || (result.reason instanceof ApiError && result.reason.status === 404)) {
          removed.add(id);
        } else {
          failures.push((result.reason as Error).message);
        }
      });
      setCatalog((prev) => prev.filter((c) => !removed.has(c.id)));
      if (failures.length > 0) {
        setError(es.home.clearFailed(failures.length, [...new Set(failures)].join(" · ")));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setClearing(false);
    }
  }

  async function handleGenerateLayout() {
    if (!space || space === "loading" || space === "none" || catalog.length === 0) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await api.generateLayout({
        projectId: DEMO_PROJECT_ID,
        room: { vertices: space.vertices, heightM: space.heightM },
        items: catalog,
        constraints: { minDistanceBetweenItemsCm: 15, minClearPathCm: 60 },
      });

      if (!result.readyToRender) {
        setError(
          result.layout.warnings.join(" ") ||
            result.errors.join(" ") ||
            es.home.layoutNotReady
        );
        return;
      }

      setPlacedItems(
        result.layout.positions.map((pos) => ({
          x: pos.x,
          y: pos.y,
          rotation: pos.rotation,
          item: catalog.find((c) => c.id === pos.itemId)!,
        }))
      );
      setLighting(result.lighting);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  // Sala ya cargada desde el backend (con id real), o null mientras se carga o si no hay ninguna.
  const openRoomId = space !== null && typeof space === "object" ? space.id : null;
  const currentRoom = space !== null && typeof space === "object" ? space : null;

  /**
   * Renombra o describe el proyecto (PATCH /rooms/{id}). Solo se copian el nombre y la descripción: la
   * forma no cambia y así la vista 3D no se reinicia.
   */
  async function saveRoomText(changes: { name?: string; description?: string | null }) {
    if (!currentRoom) return;
    const updated = await api.updateRoom(currentRoom.id, changes);
    if (requestedRoomId.current !== updated.id) return;
    setSpace((prev) =>
      prev !== null && typeof prev === "object"
        ? { ...prev, name: updated.name, description: updated.description ?? null }
        : prev
    );
  }

  return (
    <div className="project-screen">
      <header className="project-header glass">
        <Link href={ROUTES.projects} className="project-exit">
          {es.project.exit}
        </Link>
        {currentRoom ? (
          <div className="project-header-text">
            <InlineEdit
              as="h1"
              className="project-name"
              kind="name"
              value={currentRoom.name}
              editLabel={es.project.editName(currentRoom.name)}
              check={(text) => checkPlainName(text, MAX_PROJECT_NAME_LENGTH)}
              onSave={(name) => saveRoomText({ name: name ?? currentRoom.name })}
            />
            <InlineEdit
              as="p"
              className="project-description"
              kind="description"
              value={currentRoom.description ?? null}
              placeholder={es.groups.noDescription}
              editLabel={es.project.editDescription(currentRoom.name)}
              check={checkDescription}
              onSave={(description) => saveRoomText({ description })}
            />
          </div>
        ) : (
          <h1 className="project-name">{es.project.loadingName}</h1>
        )}
        <div className="page-header-actions">
          <PublishProjectButton room={currentRoom} />
          {/* La sala y sus objetos llegan juntos (openRoom): con currentRoom ya están los dos. */}
          <ExportProjectButton room={currentRoom} items={roomItems} />
        </div>
      </header>

      <div className={`project-layout${isMobile ? " project-layout-mobile" : ""}${panelOpen ? "" : " project-layout-collapsed"}`}>
        <AiPanel
          open={isMobile ? sheetOpen : panelOpen}
          onOpenChange={handlePanelOpenChange}
          collapseLabel={isMobile ? es.aiPanel.close : es.aiPanel.minimize}
          className={isMobile ? "ai-panel-sheet" : ""}
          chat={
            // Al cambiar de sala empieza una conversación nueva; recoger el panel no la borra.
            <ChatDock
              key={openRoomId ?? "none"}
              roomId={openRoomId}
              onChanges={handleChatChanges}
              actions={
                <>
                  <PhotoToRoom
                    compact
                    roomId={openRoomId}
                    savedItemCount={roomItems.length}
                    onAnalyzed={handlePhotoAnalyzed}
                  />
                  <UndoButton
                    roomId={openRoomId}
                    depth={undoDepth}
                    onUndone={handleUndone}
                    onNothingToUndo={() => setUndoDepth((depth) => nextUndoDepth(depth, { type: "nothing" }))}
                  />
                </>
              }
            />
          }
        >
          {error && (
            <p className="warning" role="alert">
              {error}
            </p>
          )}

          {space !== "none" && <RoomItemList items={roomItems} loading={space === "loading"} />}
        </AiPanel>

        <SceneArea
          space={space}
          roomItems={roomItems}
          estimated={estimated}
          occupyingItems={occupyingItems}
          onMoveItem={handleMoveItem}
        />

        {isMobile && sheetOpen && (
          <div className="ai-sheet-backdrop" aria-hidden="true" onClick={() => setSheetOpen(false)} />
        )}
        {isMobile && !sheetOpen && (
          <button
            type="button"
            className="ai-sheet-fab"
            onClick={() => setSheetOpen(true)}
            aria-label={es.aiPanel.expand}
            aria-expanded={false}
          >
            <IconAssistant size={24} />
          </button>
        )}
      </div>
    </div>
  );
}

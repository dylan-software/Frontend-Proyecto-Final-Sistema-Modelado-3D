import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import { es } from "../i18n/es";
import type { PlacedItemResult, RoomDetail, RoomItem } from "../lib/api";
import {
  moveBody,
  moveErrorMessage,
  moveModeOf,
  moveResultMessage,
  nudge,
  samePlace,
  withElevation,
  withPreview,
  type ArrowDirection,
  type ItemMoveBody,
} from "../lib/objectMove";
import type { Dimensions3D } from "../types/spatial";
import { IconClose, IconMeter } from "./icons";
import { PlanEmpty, PlanLoading } from "./PlanState";
import { ObjectMovePanel, type MoveStatus } from "./ObjectMovePanel";
import { SpatialAnalytics } from "./SpatialAnalytics";

// three.js no se puede evaluar durante el prerenderizado: el visor solo se carga en el navegador.
const RenderScene = dynamic(() => import("../render/RenderScene").then((m) => m.RenderScene), { ssr: false });

const DEFAULT_LIGHTING = { position: { x: 0, y: 3, z: 0 }, intensity: 0.8, color: "#ffffff" };

interface SceneAreaProps {
  /** La sala abierta, o el estado de su carga. */
  space: RoomDetail | null | "loading" | "none";
  /** Objetos guardados en la sala, dibujados como cajas con su nombre. */
  roomItems: RoomItem[];
  /** La sala muestra lo que estimó una foto (etiqueta "Estimado"). */
  estimated: boolean;
  /** Cajas en metros de todo lo que ocupa la sala, para la tarjeta de ocupación. */
  occupyingItems: Dimensions3D[];
  /**
   * Guarda un movimiento (PATCH de /items) y deja el objeto en la posición FINAL del servidor. Sin esta
   * prop los objetos no se pueden mover. Los errores llegan como excepción y se muestran en el panel.
   */
  onMoveItem?: (roomId: number, itemId: number, body: ItemMoveBody) => Promise<PlacedItemResult>;
}

/**
 * Zona derecha de la pantalla del proyecto: el 3D a todo el alto de su contenedor (que tiene altura
 * definida, así que el lienzo se reajusta al recoger el panel o al cambiar el tamaño de la ventana),
 * con "Restablecer vista" de RenderScene y una tarjeta pequeña de ocupación que se puede ocultar.
 *
 * Mover a mano (FASE 3): tocar un objeto lo selecciona y abre ObjectMovePanel; arrastrarlo, las flechas
 * o la barra de altura muestran una vista previa y, al soltar, se guarda con onMoveItem. Mientras se
 * guarda se ve la posición pedida; después, la que devolvió el servidor (o la de antes si falló).
 */
export function SceneArea({ space, roomItems, estimated, occupyingItems, onMoveItem }: SceneAreaProps) {
  const t = es.sceneArea;
  const [showOccupancy, setShowOccupancy] = useState(true);
  const room = space !== null && typeof space === "object" ? space : null;
  const roomId = room?.id ?? null;

  const [selectedId, setSelectedId] = useState<number | null>(null);
  // El objeto movido como se ve mientras se arrastra o se guarda (null = como está guardado).
  const [preview, setPreview] = useState<RoomItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<MoveStatus | null>(null);
  const shownItems = useMemo(() => withPreview(roomItems, preview), [roomItems, preview]);
  // Sin el objeto guardado (otra sala, o Deshacer lo recreó con otro id) no hay panel.
  const selected = roomItems.find((item) => item.id === selectedId) ?? null;
  const mode = selected && room ? moveModeOf(selected, room.vertices) : null;

  // Otra sala: nada seleccionado ni a medias.
  useEffect(() => {
    setSelectedId(null);
    setPreview(null);
    setStatus(null);
  }, [roomId]);

  function select(id: number | null) {
    if (id !== selectedId) setStatus(null);
    setSelectedId(id);
  }

  /** Guarda en el servidor que original pasa a target; la respuesta deja la posición final. */
  async function commitMove(original: RoomItem, target: RoomItem) {
    if (!onMoveItem || !room || busy) return;
    if (samePlace(original, target)) {
      setPreview(null);
      return;
    }
    setPreview(target);
    setBusy(true);
    setStatus(null);
    try {
      const result = await onMoveItem(room.id, original.id, moveBody(moveModeOf(original, room.vertices), target));
      setStatus({ kind: "info", text: moveResultMessage(result) });
    } catch (err) {
      setStatus({ kind: "error", text: moveErrorMessage(err) });
    } finally {
      setPreview(null);
      setBusy(false);
    }
  }

  function handleArrow(direction: ArrowDirection) {
    if (!selected || !mode || !room || busy) return;
    void commitMove(selected, nudge(selected, mode, direction, room.vertices, room.heightM));
  }

  function handleElevationPreview(elevationM: number) {
    if (!selected || !room || busy) return;
    setPreview(withElevation(preview?.id === selected.id ? preview : selected, elevationM, room.heightM));
  }

  function handleElevationCommit() {
    if (!selected || !preview || preview.id !== selected.id) return;
    void commitMove(selected, preview);
  }

  const movable = Boolean(onMoveItem);
  const shownSelected = selected ? (shownItems.find((item) => item.id === selected.id) ?? selected) : null;

  return (
    <section className="scene-area" aria-label={t.label}>
      {room ? (
        <RenderScene
          vertices={room.vertices}
          heightM={room.heightM}
          placedItems={[]}
          lighting={DEFAULT_LIGHTING}
          boxes={shownItems}
          estimated={estimated}
          selectedId={selected?.id ?? null}
          onSelect={movable ? select : undefined}
          dragEnabled={movable && !busy}
          onDragPreview={setPreview}
          onDragEnd={(original, target) => void commitMove(original, target)}
        />
      ) : space === "none" ? (
        <div className="scene-area-status" role="status">
          <PlanEmpty title={t.unavailable} />
        </div>
      ) : (
        <div className="scene-area-status">
          <PlanLoading label={t.loading} />
        </div>
      )}

      {room && movable && shownSelected && mode ? (
        <ObjectMovePanel
          item={shownSelected}
          mode={mode}
          roomHeightM={room.heightM}
          busy={busy}
          status={status}
          onArrow={handleArrow}
          onElevationPreview={handleElevationPreview}
          onElevationCommit={handleElevationCommit}
          onClose={() => select(null)}
        />
      ) : (
        room &&
        movable &&
        roomItems.length > 0 && <p className="object-move-tip glass">{es.objectMove.selectHint}</p>
      )}

      {showOccupancy ? (
        <div className="occupancy-card glass">
          <SpatialAnalytics roomAreaM2={room ? room.areaM2 : null} items={occupyingItems} />
          <button
            type="button"
            className="occupancy-toggle occupancy-hide"
            onClick={() => setShowOccupancy(false)}
            aria-label={t.hideOccupancy}
            title={t.hideOccupancy}
          >
            <IconClose size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="occupancy-toggle occupancy-show glass"
          onClick={() => setShowOccupancy(true)}
          aria-label={t.showOccupancy}
          title={t.showOccupancy}
        >
          <IconMeter />
        </button>
      )}
    </section>
  );
}

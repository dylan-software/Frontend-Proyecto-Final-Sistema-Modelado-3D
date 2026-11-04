import { useState } from "react";
import dynamic from "next/dynamic";

import { es } from "../i18n/es";
import type { RoomDetail, RoomItem } from "../lib/api";
import type { Dimensions3D } from "../types/spatial";
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
}

/** Icono de la tarjeta de ocupación recogida: dos barras de medidor. */
function MeterIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <rect x="3" y="5" width="14" height="3" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="3" y="12" width="14" height="3" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4.5 6.5h6M4.5 13.5h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Zona derecha de la pantalla del proyecto: el 3D a todo el alto de su contenedor (que tiene altura
 * definida, así que el lienzo se reajusta al recoger el panel o al cambiar el tamaño de la ventana),
 * con "Restablecer vista" de RenderScene y una tarjeta pequeña de ocupación que se puede ocultar.
 */
export function SceneArea({ space, roomItems, estimated, occupyingItems }: SceneAreaProps) {
  const t = es.sceneArea;
  const [showOccupancy, setShowOccupancy] = useState(true);
  const room = space !== null && typeof space === "object" ? space : null;

  return (
    <section className="scene-area" aria-label={t.label}>
      {room ? (
        <RenderScene
          vertices={room.vertices}
          heightM={room.heightM}
          placedItems={[]}
          lighting={DEFAULT_LIGHTING}
          boxes={roomItems}
          estimated={estimated}
        />
      ) : (
        <p className="scene-area-status" role="status">
          {space === "none" ? t.unavailable : t.loading}
        </p>
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
            ✕
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
          <MeterIcon />
        </button>
      )}
    </section>
  );
}

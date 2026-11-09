import { useId, useMemo, useState } from "react";

import { es } from "../i18n/es";
import type { RoomItem } from "../lib/api";
import { describeRoomItem, filterRoomItems } from "../lib/roomItems";
import { PlanEmpty, PlanLoading } from "./PlanState";

interface RoomItemListProps {
  /** Objetos guardados en la sala abierta (GET /rooms/{id}/items o la respuesta de la foto). */
  items: readonly RoomItem[];
  /** True mientras se carga la sala: no se muestra el estado vacío antes de tiempo. */
  loading?: boolean;
}

/**
 * Marca de alzado: la línea del suelo y una caja apoyada en ella o levantada (con su cota a trazos).
 * Distingue de un vistazo lo que está en el suelo de lo que cuelga de la pared.
 */
function ElevationMark({ raised }: { raised: boolean }) {
  return (
    <svg className="room-objects-mark" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M1.5 14.5h13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      {raised ? (
        <>
          <rect x="4.5" y="2.5" width="7" height="5" rx="0.8" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M8 8.5v5" stroke="currentColor" strokeWidth="1" strokeDasharray="1.2 1.4" />
        </>
      ) : (
        <rect x="4.5" y="8" width="7" height="5.5" rx="0.8" fill="none" stroke="currentColor" strokeWidth="1.2" />
      )}
    </svg>
  );
}

/**
 * "Objetos del proyecto": la lista de los objetos de ESTA sala, con un campo para filtrar por nombre.
 * Cada línea dice el nombre, si está en el suelo o a qué altura, y sus medidas; nunca coordenadas.
 * Componente pequeño y reutilizable: solo recibe los objetos y no llama a la API.
 */
export function RoomItemList({ items, loading = false }: RoomItemListProps) {
  const t = es.projectObjects;
  const titleId = useId();
  const filterId = useId();
  const [query, setQuery] = useState("");

  const lines = useMemo(() => items.map(describeRoomItem), [items]);
  const visible = useMemo(() => filterRoomItems(lines, query), [lines, query]);

  return (
    <section className="room-objects" aria-labelledby={titleId}>
      <h3 id={titleId} className="room-objects-title">
        {t.title(items.length)}
      </h3>

      {loading ? (
        <PlanLoading label={t.loading} className="room-objects-loading" />
      ) : items.length === 0 ? (
        <PlanEmpty compact drawing="objects" title={t.empty} text={t.emptyHint} className="room-objects-empty" />
      ) : (
        <>
          <label className="visually-hidden" htmlFor={filterId}>
            {t.filterLabel}
          </label>
          <input
            id={filterId}
            className="room-objects-filter"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.filterPlaceholder}
            autoComplete="off"
            maxLength={60}
          />

          {visible.length === 0 ? (
            <p className="hint room-objects-none" role="status">
              {t.noMatches(query.trim())}{" "}
              <button type="button" className="link-button" onClick={() => setQuery("")}>
                {t.clearFilter}
              </button>
            </p>
          ) : (
            <ul className="room-objects-list">
              {visible.map((line) => (
                <li key={line.id} className={`room-objects-row${line.raised ? " room-objects-row-raised" : ""}`}>
                  <ElevationMark raised={line.raised} />
                  <span className="room-objects-name">{line.name}</span>
                  <span className="room-objects-size" title={line.sizeLabel}>
                    <span aria-hidden="true">{line.size}</span>
                    <span className="visually-hidden">{line.sizeLabel}</span>
                  </span>
                  <span className="room-objects-place">{line.place}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

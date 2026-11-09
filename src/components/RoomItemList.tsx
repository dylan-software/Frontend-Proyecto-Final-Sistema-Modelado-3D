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
  /** Objeto seleccionado en el 3D (se marca en la lista). */
  selectedId?: number | null;
  /**
   * Elegir un objeto de la lista (FASE 8): cada fila pasa a ser un botón que se alcanza con Tab y se
   * pulsa con Enter o Espacio; el 3D abre su panel de mover. Sin esta prop la lista es solo lectura.
   */
  onSelect?: (id: number) => void;
}

/** id del botón de una fila, para devolverle el foco al soltar el objeto con Escape. */
export function roomObjectRowId(itemId: number): string {
  return `room-object-${itemId}`;
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
export function RoomItemList({ items, loading = false, selectedId = null, onSelect }: RoomItemListProps) {
  const t = es.projectObjects;
  const titleId = useId();
  const filterId = useId();
  const hintId = useId();
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
            <>
              {onSelect && (
                <p id={hintId} className="hint room-objects-hint">
                  {t.selectHint}
                </p>
              )}
              <ul className="room-objects-list" aria-describedby={onSelect ? hintId : undefined}>
                {visible.map((line) => {
                  const rowClass = `room-objects-row${line.raised ? " room-objects-row-raised" : ""}`;
                  const content = (
                    <>
                      <ElevationMark raised={line.raised} />
                      <span className="room-objects-name">{line.name}</span>
                      <span className="room-objects-size" title={line.sizeLabel}>
                        <span aria-hidden="true">{line.size}</span>
                        <span className="visually-hidden">{line.sizeLabel}</span>
                      </span>
                      <span className="room-objects-place">{line.place}</span>
                    </>
                  );
                  return onSelect ? (
                    <li key={line.id} className="room-objects-item">
                      <button
                        type="button"
                        id={roomObjectRowId(line.id)}
                        className={`${rowClass} room-objects-select`}
                        aria-pressed={line.id === selectedId}
                        onClick={() => onSelect(line.id)}
                      >
                        {content}
                      </button>
                    </li>
                  ) : (
                    <li key={line.id} className={rowClass}>
                      {content}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}

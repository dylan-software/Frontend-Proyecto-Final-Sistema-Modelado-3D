import { useState } from "react";

import { es } from "../i18n/es";
import type { RoomDetail, RoomItem } from "../lib/api";
import { downloadProject, JsonProjectExporter, type ProjectExporter } from "../lib/projectExport";

interface ExportProjectButtonProps {
  /** La sala abierta, o null mientras carga o si falló: entonces el botón está deshabilitado. */
  room: RoomDetail | null;
  items: RoomItem[];
  /** Formato de exportación; JSON por defecto. */
  exporter?: ProjectExporter;
}

const JSON_EXPORTER = new JsonProjectExporter();

/** "Exportar JSON": descarga el proyecto en el navegador, sin datos personales (CONTRATO-FASE6.md). */
export function ExportProjectButton({ room, items, exporter = JSON_EXPORTER }: ExportProjectButtonProps) {
  const t = es.projectTransfer;
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    if (!room) return;
    setError(null);
    try {
      downloadProject(exporter, { room, items });
    } catch {
      setError(t.exportFailed);
    }
  }

  return (
    <div className="project-export">
      <button
        type="button"
        className="new-group-button"
        onClick={handleExport}
        disabled={!room}
        title={room ? t.exportTitle : t.exportUnavailable}
      >
        {t.exportButton}
      </button>
      {error && (
        <p className="new-group-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

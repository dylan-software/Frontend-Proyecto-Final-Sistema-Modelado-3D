import { useRef, useState, type ChangeEvent } from "react";

import { es } from "../i18n/es";
import type { RoomImportResult } from "../lib/api";
import { importProjectFile } from "../lib/projectImport";
import { IconUpload } from "./icons";

interface ImportProjectButtonProps {
  /** El backend ya creó el proyecto nuevo (ids nuevos, sin grupo). */
  onImported: (result: RoomImportResult) => void | Promise<void>;
  /** Texto del error para el usuario (ya en español), o null al empezar otra importación. */
  onError: (message: string | null) => void;
  disabled?: boolean;
}

/** "Importar proyecto": elige un archivo JSON exportado y crea con él un proyecto nuevo (CONTRATO-FASE6.md). */
export function ImportProjectButton({ onImported, onError, disabled = false }: ImportProjectButtonProps) {
  const t = es.projectTransfer;
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Se vacía para poder volver a elegir el mismo archivo después de un error.
    event.target.value = "";
    if (!file || busy) return;
    setBusy(true);
    onError(null);
    try {
      await onImported(await importProjectFile(file));
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="new-group-button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        title={t.importTitle}
      >
        <IconUpload size={18} />
        {busy ? t.importing : t.importButton}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleChange}
      />
    </>
  );
}

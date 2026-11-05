import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { es } from "../i18n/es";
import { charCount, MAX_DESCRIPTION_LENGTH, type TextCheck } from "../lib/groups";

interface InlineEditProps {
  /** Valor guardado; null se muestra con `placeholder`. */
  value: string | null;
  /** Texto que se muestra cuando no hay valor ("Sin descripción"). */
  placeholder?: string;
  /** "name": una línea, Enter guarda. "description": varias líneas, Ctrl+Enter guarda. */
  kind: "name" | "description";
  /** Etiqueta accesible del botón de editar, p. ej. "Editar el nombre de Casa". */
  editLabel: string;
  /** Valida y normaliza el texto antes de guardar (mismas reglas que el backend). */
  check: (text: string) => TextCheck<string | null>;
  /** Guarda en el backend; si lanza, el campo sigue abierto con el mensaje del error. */
  onSave: (value: string | null) => Promise<void>;
  /** Etiqueta HTML del texto mostrado (h2 para el nombre de un grupo, p para descripciones…). */
  as?: "h1" | "h2" | "p" | "span";
  className?: string;
}

/**
 * Texto editable en el sitio: clic en el texto o en el lápiz abre un campo con el valor actual. Nombre:
 * Enter guarda. Descripción: Ctrl+Enter (o Cmd+Enter) guarda y Enter es un salto de línea. Escape
 * cancela en los dos. Mientras guarda, el campo queda deshabilitado; un error lo deja abierto.
 */
export function InlineEdit({
  value,
  placeholder = "",
  kind,
  editLabel,
  check,
  onSave,
  as: Tag = "span",
  className = "",
}: InlineEditProps) {
  const t = es.inlineEdit;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const errorId = useId();

  useEffect(() => {
    if (!editing) return;
    fieldRef.current?.focus();
    fieldRef.current?.select();
  }, [editing]);

  function open() {
    setDraft(value ?? "");
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
    // El foco vuelve al texto, en vez de perderse en <body>.
    requestAnimationFrame(() => toggleRef.current?.focus());
  }

  async function save() {
    if (saving) return;
    const result = check(draft);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    if (result.value === (value ?? null)) {
      cancel();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(result.value);
      setEditing(false);
      requestAnimationFrame(() => toggleRef.current?.focus());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    } else if (e.key === "Enter" && (kind === "name" || e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void save();
    }
  }

  if (!editing) {
    const empty = !value;
    return (
      <Tag className={`inline-edit ${className}`.trim()}>
        <button
          ref={toggleRef}
          type="button"
          className={`inline-edit-display${empty ? " inline-edit-empty" : ""}`}
          onClick={open}
          aria-label={editLabel}
          title={editLabel}
        >
          <span className="inline-edit-text">{empty ? placeholder : value}</span>
          <svg className="inline-edit-pencil" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path
              d="M11 2.5 13.5 5 6 12.5 3 13l.5-3z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </Tag>
    );
  }

  const fieldProps = {
    value: draft,
    disabled: saving,
    "aria-label": editLabel,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errorId : undefined,
    onChange: (e: { target: { value: string } }) => setDraft(e.target.value),
    onKeyDown: handleKeyDown,
  };

  return (
    <div className={`inline-edit inline-edit-open inline-edit-${kind} ${className}`.trim()}>
      {kind === "name" ? (
        <input ref={fieldRef} type="text" className="inline-edit-field" autoComplete="off" {...fieldProps} />
      ) : (
        <textarea ref={fieldRef} className="inline-edit-field" rows={3} {...fieldProps} />
      )}
      <div className="inline-edit-bar">
        {kind === "description" && (
          <span className="inline-edit-count" aria-live="polite">
            {t.count(charCount(draft.trim()), MAX_DESCRIPTION_LENGTH)}
          </span>
        )}
        <span className="inline-edit-hint">{kind === "name" ? t.hintName : t.hintDescription}</span>
        <button type="button" className="inline-edit-cancel" onClick={cancel} disabled={saving}>
          {t.cancel}
        </button>
        <button type="button" className="inline-edit-save" onClick={() => void save()} disabled={saving}>
          {saving ? t.saving : t.save}
        </button>
      </div>
      {error && (
        <p id={errorId} className="inline-edit-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

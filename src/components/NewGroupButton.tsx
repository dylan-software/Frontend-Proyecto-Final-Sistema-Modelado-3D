import { useEffect, useRef, useState, type FormEvent } from "react";

import { es } from "../i18n/es";
import { checkPlainName, MAX_GROUP_NAME_LENGTH } from "../lib/groups";

interface NewGroupButtonProps {
  /** Crea el grupo en el backend; si lanza (p. ej. 409 por el tope), el campo sigue abierto con el error. */
  onCreate: (name: string) => Promise<void>;
  disabled?: boolean;
}

/** "+ Nuevo grupo": se abre en el sitio un campo de nombre. Enter crea y Escape cancela. */
export function NewGroupButton({ onCreate, disabled = false }: NewGroupButtonProps) {
  const t = es.groups;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    setName("");
    setError(null);
    requestAnimationFrame(() => toggleRef.current?.focus());
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const check = checkPlainName(name, MAX_GROUP_NAME_LENGTH);
    if ("error" in check) {
      setError(check.error);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCreate(check.value);
      close();
    } catch (err) {
      setError(t.createGroupFailed((err as Error).message));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        ref={toggleRef}
        type="button"
        className="new-group-button"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        {t.newGroup}
      </button>
    );
  }

  return (
    <form className="new-group-form" onSubmit={handleSubmit} onKeyDown={(e) => e.key === "Escape" && close()}>
      <label className="visually-hidden" htmlFor="new-group-name">
        {t.newGroupLabel}
      </label>
      <input
        ref={inputRef}
        id="new-group-name"
        type="text"
        value={name}
        placeholder={t.newGroupPlaceholder}
        maxLength={MAX_GROUP_NAME_LENGTH}
        autoComplete="off"
        disabled={saving}
        aria-invalid={error ? true : undefined}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" disabled={saving}>
        {saving ? t.creatingGroup : t.createGroup}
      </button>
      <button type="button" className="new-group-cancel" onClick={close} disabled={saving}>
        {t.cancel}
      </button>
      {error && (
        <p className="new-group-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

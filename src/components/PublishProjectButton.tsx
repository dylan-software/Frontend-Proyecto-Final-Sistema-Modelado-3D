import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { es } from "../i18n/es";
import { api, type OwnPublication, type RoomDetail } from "../lib/api";
import { charCount, MAX_DESCRIPTION_LENGTH, MAX_PROJECT_NAME_LENGTH } from "../lib/groups";
import { checkPublicationForm, formatPublishedDate, publishErrorMessage, unpublishErrorMessage } from "../lib/social";

/** Estado de publicación del proyecto abierto. */
type PublicationState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; publication: OwnPublication | null };

interface PublishFormProps {
  /** "update" si el proyecto ya está publicado: el formulario actualiza su copia congelada. */
  mode: "publish" | "update";
  title: string;
  description: string;
  busy: boolean;
  error: string | null;
  /** Campo con el error, para marcarlo con aria-invalid. */
  invalidField: "title" | "description" | null;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
}

/**
 * Formulario de publicar o actualizar: título, descripción opcional y el aviso de qué se publica.
 * Sin estado propio (se prueba renderizándolo en el servidor).
 */
export function PublishForm({
  mode,
  title,
  description,
  busy,
  error,
  invalidField,
  onTitleChange,
  onDescriptionChange,
  onSubmit,
  onCancel,
}: PublishFormProps) {
  const t = es.publish;
  const titleId = useId();
  const descriptionId = useId();
  const headingId = useId();
  const noticeId = useId();
  return (
    <form
      className="publish-panel glass"
      role="dialog"
      aria-labelledby={headingId}
      aria-describedby={noticeId}
      onSubmit={onSubmit}
      onKeyDown={(e) => e.key === "Escape" && !busy && onCancel()}
    >
      <h2 id={headingId} className="publish-panel-title">
        {mode === "update" ? t.dialogUpdateTitle : t.dialogTitle}
      </h2>
      <div id={noticeId} className="publish-notice">
        <p>{t.notice}</p>
        <p>{t.noticeSnapshot}</p>
        <p>{t.noticePrivateDescription}</p>
      </div>
      <label className="publish-label" htmlFor={titleId}>
        {t.titleLabel}
      </label>
      <input
        id={titleId}
        type="text"
        value={title}
        maxLength={MAX_PROJECT_NAME_LENGTH}
        autoComplete="off"
        disabled={busy}
        aria-invalid={invalidField === "title" ? true : undefined}
        onChange={(e) => onTitleChange(e.target.value)}
      />
      <label className="publish-label" htmlFor={descriptionId}>
        {t.descriptionLabel}
      </label>
      <textarea
        id={descriptionId}
        value={description}
        rows={3}
        maxLength={MAX_DESCRIPTION_LENGTH}
        placeholder={t.descriptionPlaceholder}
        disabled={busy}
        aria-invalid={invalidField === "description" ? true : undefined}
        onChange={(e) => onDescriptionChange(e.target.value)}
      />
      <p className="publish-count">{es.inlineEdit.count(charCount(description), MAX_DESCRIPTION_LENGTH)}</p>
      {error && (
        <p className="publish-error" role="alert">
          {error}
        </p>
      )}
      <div className="publish-actions">
        <button type="button" className="publish-secondary" onClick={onCancel} disabled={busy}>
          {t.cancel}
        </button>
        <button type="submit" disabled={busy}>
          {busy ? t.saving : mode === "update" ? t.submitUpdate : t.submit}
        </button>
      </div>
    </form>
  );
}

interface PublishProjectButtonProps {
  /** La sala abierta, o null mientras carga o si falló: entonces el botón está deshabilitado. */
  room: RoomDetail | null;
}

/**
 * "Publicar en Habita" en la cabecera del proyecto (CONTRATO-FASE9.md). Sin publicar, abre el
 * formulario; publicado, muestra "Publicado en Habita" con "Actualizar" y "Dejar de publicar" (con
 * confirmación). El proyecto es privado hasta que se pulsa "Publicar".
 */
export function PublishProjectButton({ room }: PublishProjectButtonProps) {
  const t = es.publish;
  const roomId = room?.id ?? null;
  const [state, setState] = useState<PublicationState>({ status: "loading" });
  const [formOpen, setFormOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<"title" | "description" | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (roomId === null) return;
    let active = true;
    setState({ status: "loading" });
    setFormOpen(false);
    setConfirming(false);
    setError(null);
    api.getRoomPublication(roomId).then(
      (result) => active && setState({ status: "ready", publication: result.publication }),
      () => active && setState({ status: "error" })
    );
    return () => {
      active = false;
    };
  }, [roomId]);

  const publication = state.status === "ready" ? state.publication : null;

  function openForm() {
    if (!room) return;
    setTitle(publication?.title ?? room.name);
    setDescription(publication?.description ?? "");
    setError(null);
    setInvalidField(null);
    setConfirming(false);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setError(null);
    setInvalidField(null);
    requestAnimationFrame(() => toggleRef.current?.focus());
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy || roomId === null) return;
    const check = checkPublicationForm(title, description);
    if ("error" in check) {
      setError(check.error);
      setInvalidField(check.field);
      return;
    }
    setBusy(true);
    setError(null);
    setInvalidField(null);
    try {
      const saved = await api.publishRoom(roomId, check.value);
      setState({ status: "ready", publication: saved });
      closeForm();
    } catch (err) {
      setError(publishErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleUnpublish() {
    if (busy || roomId === null) return;
    setBusy(true);
    setError(null);
    try {
      await api.unpublishRoom(roomId);
      setState({ status: "ready", publication: null });
      setConfirming(false);
    } catch (err) {
      setError(unpublishErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const form = formOpen && (
    <PublishForm
      mode={publication ? "update" : "publish"}
      title={title}
      description={description}
      busy={busy}
      error={error}
      invalidField={invalidField}
      onTitleChange={setTitle}
      onDescriptionChange={setDescription}
      onSubmit={(e) => void handleSubmit(e)}
      onCancel={closeForm}
    />
  );

  if (!publication) {
    const ready = room !== null && state.status === "ready";
    return (
      <div className="publish-project">
        <button
          ref={toggleRef}
          type="button"
          className="new-group-button"
          onClick={openForm}
          disabled={!ready || formOpen}
          aria-expanded={formOpen}
          title={room ? t.buttonTitle : t.unavailable}
        >
          {t.button}
        </button>
        {state.status === "error" && (
          <p className="new-group-error" role="alert">
            {t.loadFailed}
          </p>
        )}
        {form}
      </div>
    );
  }

  return (
    <div className="publish-project">
      <div className="publish-status">
        <span
          className="publish-badge"
          title={t.publishedTitle(formatPublishedDate(publication.publishedAt), es.social.copies(publication.copies))}
        >
          {t.published}
        </span>
        <button
          ref={toggleRef}
          type="button"
          className="new-group-button"
          onClick={openForm}
          disabled={busy || formOpen}
          aria-expanded={formOpen}
          title={t.updateTitle}
        >
          {t.update}
        </button>
        <button
          type="button"
          className="new-group-button"
          onClick={() => {
            setFormOpen(false);
            setError(null);
            setConfirming(true);
          }}
          disabled={busy || confirming}
        >
          {t.unpublish}
        </button>
      </div>
      {confirming && (
        <div className="publish-panel glass" role="alertdialog" aria-label={t.unpublish}>
          <p className="publish-confirm-text">{t.confirmUnpublish}</p>
          {error && (
            <p className="publish-error" role="alert">
              {error}
            </p>
          )}
          <div className="publish-actions">
            <button type="button" className="publish-secondary" onClick={() => setConfirming(false)} disabled={busy}>
              {t.cancel}
            </button>
            <button type="button" className="publish-danger" onClick={() => void handleUnpublish()} disabled={busy}>
              {busy ? t.removing : t.confirmUnpublishYes}
            </button>
          </div>
        </div>
      )}
      {form}
    </div>
  );
}

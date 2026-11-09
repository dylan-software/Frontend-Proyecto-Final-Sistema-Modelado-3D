import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { es } from "../i18n/es";
import { api, type OwnPublication, type RoomDetail } from "../lib/api";
import { charCount, MAX_DESCRIPTION_LENGTH, MAX_PROJECT_NAME_LENGTH } from "../lib/groups";
import { checkPublicationForm, formatPublishedDate, publishErrorMessage, unpublishErrorMessage } from "../lib/social";
import { IconShare } from "./icons";

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
  /**
   * Diálogo modal centrado sobre un fondo (tarjetas de /proyectos) en vez de flotar bajo el botón:
   * la tarjeta es estrecha y recorta lo que se sale. El título recibe el foco al abrir.
   */
  modal?: boolean;
}

/**
 * Fondo de los diálogos modales de publicar: un clic fuera del diálogo equivale a "Cancelar" (salvo
 * mientras se guarda).
 */
export function PublishModalBackdrop({
  busy,
  onCancel,
  children,
}: {
  busy: boolean;
  onCancel: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="publish-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      {children}
    </div>
  );
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
  modal = false,
}: PublishFormProps) {
  const t = es.publish;
  const titleId = useId();
  const descriptionId = useId();
  const headingId = useId();
  const noticeId = useId();
  const form = (
    <form
      className={`publish-panel glass${modal ? " publish-panel-modal" : ""}`}
      role="dialog"
      aria-modal={modal || undefined}
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
        autoFocus={modal}
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
  return modal ? (
    <PublishModalBackdrop busy={busy} onCancel={onCancel}>
      {form}
    </PublishModalBackdrop>
  ) : (
    form
  );
}

interface UnpublishConfirmProps {
  busy: boolean;
  error: string | null;
  /** Como en PublishForm: diálogo modal sobre un fondo (tarjetas) o flotante bajo el botón. */
  modal?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmación de "Dejar de publicar". Sin estado (se prueba renderizándolo en el servidor). */
export function UnpublishConfirm({ busy, error, modal = false, onCancel, onConfirm }: UnpublishConfirmProps) {
  const t = es.publish;
  const panel = (
    <div
      className={`publish-panel glass${modal ? " publish-panel-modal" : ""}`}
      role="alertdialog"
      aria-modal={modal || undefined}
      aria-label={t.unpublish}
      onKeyDown={modal ? (e) => e.key === "Escape" && !busy && onCancel() : undefined}
    >
      <p className="publish-confirm-text">{t.confirmUnpublish}</p>
      {error && (
        <p className="publish-error" role="alert">
          {error}
        </p>
      )}
      <div className="publish-actions">
        <button type="button" className="publish-secondary" onClick={onCancel} disabled={busy} autoFocus={modal}>
          {t.cancel}
        </button>
        <button type="button" className="publish-danger" onClick={onConfirm} disabled={busy}>
          {busy ? t.removing : t.confirmUnpublishYes}
        </button>
      </div>
    </div>
  );
  return modal ? (
    <PublishModalBackdrop busy={busy} onCancel={onCancel}>
      {panel}
    </PublishModalBackdrop>
  ) : (
    panel
  );
}

/** Lo único que necesita el botón de la sala: su id y su nombre (título propuesto al publicar). */
export type PublishableRoom = Pick<RoomDetail, "id" | "name">;

interface PublishProjectButtonProps {
  /** La sala, o null mientras carga o si falló: entonces el botón está deshabilitado. */
  room: PublishableRoom | null;
  /**
   * "header" (cabecera del proyecto): formularios flotantes bajo el botón. "card" (tarjeta de
   * /proyectos): los mismos formularios como diálogos modales, fuera de la tarjeta.
   */
  variant?: "header" | "card";
}

/**
 * "Publicar en Habita" (CONTRATO-FASE9.md), en la cabecera del proyecto y en el menú de cada tarjeta
 * de /proyectos, con la misma lógica y los mismos diálogos. Sin publicar, abre el formulario; publicado,
 * muestra "Publicado en Habita" con "Actualizar" y "Dejar de publicar" (con confirmación). El proyecto
 * es privado hasta que se pulsa "Publicar".
 */
export function PublishProjectButton({ room, variant = "header" }: PublishProjectButtonProps) {
  const modal = variant === "card";
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
  const unpublishRef = useRef<HTMLButtonElement>(null);

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

  /** En la tarjeta, los diálogos van al final de <body>: así no los recorta ni los tapa ninguna tarjeta. */
  function layer(node: ReactNode): ReactNode {
    return modal && typeof document !== "undefined" ? createPortal(node, document.body) : node;
  }

  const form =
    formOpen &&
    layer(
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
        modal={modal}
      />
    );

  function cancelUnpublish() {
    setConfirming(false);
    setError(null);
    if (modal) requestAnimationFrame(() => unpublishRef.current?.focus());
  }

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
          <IconShare size={18} />
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
          ref={unpublishRef}
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
      {confirming && layer(<UnpublishConfirm busy={busy} error={error} modal={modal} onCancel={cancelUnpublish} onConfirm={() => void handleUnpublish()} />)}
      {form}
    </div>
  );
}

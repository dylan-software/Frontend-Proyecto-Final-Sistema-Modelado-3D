import { es } from "../i18n/es";
import { PlanLoading } from "./PlanState";

/**
 * Carga neutra de las páginas con guardia mientras se sabe si hay sesión o mientras se redirige: sin
 * barras, sin contenido y sin el login. Aparece con un pequeño retraso (shell.css), así que una
 * comprobación instantánea no se llega a ver.
 */
export function SessionLoading() {
  return (
    <div className="session-loading">
      <PlanLoading label={es.session.checking} />
    </div>
  );
}

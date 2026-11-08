import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { es } from "../i18n/es";
import { api } from "../lib/api";
import { readKnownEmails, rememberEmail } from "../lib/knownEmails";
import { AUTH_TOKEN_KEY, AUTH_USER_ID_KEY, saveUserName } from "../lib/session";

// Se reexportan para que los imports existentes desde este componente sigan funcionando.
export { AUTH_TOKEN_KEY, AUTH_USER_ID_KEY };

// El backend rechaza registros con contraseñas más cortas.
const MIN_PASSWORD_LENGTH = 8;

interface AuthScreenProps {
  /** Se llama cuando el usuario ha iniciado sesión o se ha registrado. */
  onAuthenticated: () => void;
}

/**
 * Pantalla de bloqueo mientras no hay sesión: oculta el espacio 3D y ofrece los formularios de inicio
 * de sesión y de registro. Los textos vienen de i18n/es.ts.
 *
 * El ojito muestra u oculta la contraseña (y su confirmación). En el login, si este navegador ya inició
 * sesión antes, una lista desplegable ofrece esos correos (lib/knownEmails.ts: solo correos, nunca
 * contraseñas; no se pide nada al servidor). Los atributos autocomplete dejan que el gestor de
 * contraseñas del navegador rellene y guarde las credenciales.
 */
export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const t = es.auth;
  // true → formulario "Iniciar sesión", false → formulario "Registrarse".
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [knownEmails, setKnownEmails] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const passwordId = useId();

  // Se lee al montar (no en el render del servidor) para no desajustar la hidratación.
  useEffect(() => {
    setKnownEmails(readKnownEmails());
  }, []);

  function chooseKnownEmail(value: string) {
    if (!value) return;
    setEmail(value);
    setError(null);
    passwordRef.current?.focus();
  }

  function toggleView() {
    setIsLoginView((login) => !login);
    setError(null);
  }

  /** Mensaje de error del formulario actual, o null si es válido. */
  function validate(): string | null {
    if (!isLoginView && !username.trim()) return t.usernameRequired;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return t.invalidEmail;
    if (password.length < MIN_PASSWORD_LENGTH) return t.passwordTooShort(MIN_PASSWORD_LENGTH);
    if (!isLoginView && password !== confirmPassword) return t.passwordsDiffer;
    return null;
  }

  async function handleSubmitAuth(e: FormEvent) {
    e.preventDefault();
    const validationError = validate();
    setError(validationError);
    if (validationError) return;

    setSubmitting(true);
    // La contraseña vuelve a ocultarse al enviar (los gestores de contraseñas buscan type="password").
    setShowPassword(false);
    try {
      const credentials = { email: email.trim(), password };
      // Registrarse no abre sesión, así que una cuenta nueva inicia sesión justo después.
      if (!isLoginView) await api.register({ nombre: username.trim(), ...credentials });
      const session = await api.login(credentials);
      localStorage.setItem(AUTH_TOKEN_KEY, session.access_token);
      localStorage.setItem(AUTH_USER_ID_KEY, String(session.usuario.id));
      // Solo el nombre, para el chip de la barra superior (nunca el correo ni el token).
      saveUserName(session.usuario.nombre);
      // Solo el correo, para la lista desplegable del próximo login en este navegador.
      rememberEmail(credentials.email);
      onAuthenticated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <header className="auth-header">
          <span className="auth-logo" aria-hidden="true">
            ◆
          </span>
          <h1 className="auth-title">{es.app.title}</h1>
          <p className="auth-subtitle">{isLoginView ? t.loginSubtitle : t.registerSubtitle}</p>
        </header>

        <form className="auth-form" onSubmit={handleSubmitAuth} noValidate>
          {!isLoginView && (
            <label>
              {t.username}
              <input
                type="text"
                name="username"
                // Es el nombre que se muestra, no el identificador del login (que es el correo).
                autoComplete="nickname"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.usernamePlaceholder}
              />
            </label>
          )}

          {isLoginView && knownEmails.length > 0 && (
            <label>
              {t.knownEmails}
              <select
                name="knownEmail"
                className="auth-known-emails"
                autoComplete="off"
                value=""
                onChange={(e) => chooseKnownEmail(e.target.value)}
              >
                <option value="">{t.knownEmailsPlaceholder}</option>
                {knownEmails.map((known) => (
                  <option key={known} value={known}>
                    {known}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            {t.email}
            <input
              type="email"
              name="email"
              inputMode="email"
              // El correo es el identificador de la cuenta: "username" para que el gestor de
              // contraseñas lo asocie a la contraseña guardada.
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
            />
          </label>

          <label htmlFor={passwordId} className="auth-password-label">
            {t.password}
          </label>
          <div className="auth-password">
            <input
              ref={passwordRef}
              id={passwordId}
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete={isLoginView ? "current-password" : "new-password"}
              autoCapitalize="none"
              spellCheck={false}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPlaceholder(MIN_PASSWORD_LENGTH)}
            />
            <button
              type="button"
              className="auth-password-toggle"
              aria-controls={passwordId}
              aria-pressed={showPassword}
              aria-label={showPassword ? t.hidePassword : t.showPassword}
              title={showPassword ? t.hidePassword : t.showPassword}
              onClick={() => setShowPassword((shown) => !shown)}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
                {showPassword && (
                  <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>

          {!isLoginView && (
            <label>
              {t.confirmPassword}
              <input
                type={showPassword ? "text" : "password"}
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t.confirmPasswordPlaceholder}
              />
            </label>
          )}

          {error && (
            <p className="warning connection-alert" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? t.verifying : isLoginView ? t.loginButton : t.registerButton}
          </button>
        </form>

        <p className="auth-switch">
          {isLoginView ? t.noAccount : t.haveAccount}{" "}
          <button type="button" className="link-button" onClick={toggleView}>
            {isLoginView ? t.switchToRegister : t.switchToLogin}
          </button>
        </p>
      </div>
    </div>
  );
}

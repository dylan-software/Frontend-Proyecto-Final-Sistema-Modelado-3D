import { useState, type FormEvent } from "react";

import { es } from "../i18n/es";
import { api } from "../lib/api";
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
 */
export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const t = es.auth;
  // true → formulario "Iniciar sesión", false → formulario "Registrarse".
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    try {
      const credentials = { email: email.trim(), password };
      // Registrarse no abre sesión, así que una cuenta nueva inicia sesión justo después.
      if (!isLoginView) await api.register({ nombre: username.trim(), ...credentials });
      const session = await api.login(credentials);
      localStorage.setItem(AUTH_TOKEN_KEY, session.access_token);
      localStorage.setItem(AUTH_USER_ID_KEY, String(session.usuario.id));
      // Solo el nombre, para el chip de la barra superior (nunca el correo ni el token).
      saveUserName(session.usuario.nombre);
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
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.usernamePlaceholder}
              />
            </label>
          )}

          <label>
            {t.email}
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
            />
          </label>

          <label>
            {t.password}
            <input
              type="password"
              name="password"
              autoComplete={isLoginView ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPlaceholder(MIN_PASSWORD_LENGTH)}
            />
          </label>

          {!isLoginView && (
            <label>
              {t.confirmPassword}
              <input
                type="password"
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

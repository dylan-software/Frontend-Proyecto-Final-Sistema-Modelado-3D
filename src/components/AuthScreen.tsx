import { useState, type FormEvent } from "react";

import { api } from "../lib/api";
import { AUTH_TOKEN_KEY, AUTH_USER_ID_KEY } from "../lib/session";

// Re-exported so existing imports from this component keep working.
export { AUTH_TOKEN_KEY, AUTH_USER_ID_KEY };

// The backend rejects registrations with shorter passwords.
const MIN_PASSWORD_LENGTH = 8;

interface AuthScreenProps {
  /** Called once the user has logged in or registered successfully. */
  onAuthenticated: () => void;
}

/**
 * Lock screen shown while there is no active session: it hides the 3D
 * workspace and offers the login and registration forms.
 */
export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  // true → "Iniciar sesión" form, false → "Registrarse" form.
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

  /** Returns an error message for the current form, or null when it's valid. */
  function validate(): string | null {
    if (!isLoginView && !username.trim()) return "El nombre de usuario es obligatorio.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Introduce un correo electrónico válido.";
    if (password.length < MIN_PASSWORD_LENGTH)
      return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    if (!isLoginView && password !== confirmPassword) return "Las contraseñas no coinciden.";
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
      // Registering doesn't open a session, so a new account logs in right after.
      if (!isLoginView) await api.register({ nombre: username.trim(), ...credentials });
      const session = await api.login(credentials);
      localStorage.setItem(AUTH_TOKEN_KEY, session.access_token);
      localStorage.setItem(AUTH_USER_ID_KEY, String(session.usuario.id));
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
          <h1 className="auth-title">3D Space Decoration System</h1>
          <p className="auth-subtitle">{isLoginView ? "Inicia sesión para continuar" : "Crea tu cuenta"}</p>
        </header>

        <form className="auth-form" onSubmit={handleSubmitAuth} noValidate>
          {!isLoginView && (
            <label>
              Nombre de usuario
              <input
                type="text"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ej. dylan3d"
              />
            </label>
          )}

          <label>
            Correo electrónico
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              name="password"
              autoComplete={isLoginView ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
            />
          </label>

          {!isLoginView && (
            <label>
              Confirmar contraseña
              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
              />
            </label>
          )}

          {error && (
            <p className="warning connection-alert" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? "Verificando…" : isLoginView ? "Iniciar Sesión" : "Crear cuenta"}
          </button>
        </form>

        <p className="auth-switch">
          {isLoginView ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
          <button type="button" className="link-button" onClick={toggleView}>
            {isLoginView ? "Registrarse" : "Iniciar sesión"}
          </button>
        </p>
      </div>
    </div>
  );
}

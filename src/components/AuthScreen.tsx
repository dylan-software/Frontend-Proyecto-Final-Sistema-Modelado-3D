import { useState } from "react";

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

        <form className="auth-form">
          {!isLoginView && (
            <label>
              Nombre de usuario
              <input type="text" name="username" autoComplete="username" placeholder="ej. dylan3d" />
            </label>
          )}

          <label>
            Correo electrónico
            <input type="email" name="email" autoComplete="email" placeholder="tu@correo.com" />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              name="password"
              autoComplete={isLoginView ? "current-password" : "new-password"}
              placeholder="Mínimo 6 caracteres"
            />
          </label>
        </form>
      </div>
    </div>
  );
}

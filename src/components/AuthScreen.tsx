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
        <form className="auth-form"></form>
      </div>
    </div>
  );
}

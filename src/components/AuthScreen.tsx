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
  return <div className="auth-screen" />;
}

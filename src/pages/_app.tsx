import type { AppProps } from "next/app";
import { Manrope } from "next/font/google";

import { ThemeProvider } from "../context/ThemeContext";
import "../styles/globals.css";
import "../styles/shell.css";
import "../styles/project.css";

// Manrope se descarga en el build y se sirve desde la propia app (sin peticiones a Google en el
// navegador). Con display "swap" el texto se pinta enseguida con la pila del sistema y cambia
// a Manrope cuando llega; si la fuente no carga, se queda la del sistema.
const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <div className={`${manrope.variable} app-font`}>
        <Component {...pageProps} />
      </div>
    </ThemeProvider>
  );
}

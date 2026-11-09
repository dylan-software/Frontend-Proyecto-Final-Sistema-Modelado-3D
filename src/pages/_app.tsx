import type { AppProps } from "next/app";
import { Instrument_Sans } from "next/font/google";

import { ThemeProvider } from "../context/ThemeContext";
import "../styles/tokens.css";
import "../styles/globals.css";
import "../styles/shell.css";
import "../styles/project.css";

// Instrument Sans (sistema de diseño «Plano de obra», tokens.css) se descarga en el build y se sirve
// desde la propia app (sin peticiones a Google en el navegador). Variable en peso y en anchura: los
// títulos usan la anchura un poco estrecha. Con display "swap" el texto se pinta enseguida con la pila
// del sistema y cambia a Instrument Sans cuando llega; si la fuente no carga, se queda la del sistema.
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  axes: ["wdth"],
  variable: "--font-sans",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <div className={`${instrumentSans.variable} app-font`}>
        <Component {...pageProps} />
      </div>
    </ThemeProvider>
  );
}

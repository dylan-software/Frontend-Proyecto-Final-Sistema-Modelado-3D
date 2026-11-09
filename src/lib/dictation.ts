/**
 * Dictado con la API de reconocimiento de voz del navegador (PLAN-COMPLETO.md, FASE 7; tarea V).
 *
 * Todo lo de aquí es independiente de React y del DOM real: los tipos son mínimos y propios (no todos
 * los navegadores ni todas las versiones de TypeScript traen `SpeechRecognition`), y DictationSession
 * recibe el constructor por parámetro, así que se prueba con uno falso.
 *
 * Reglas: el micrófono solo se pide al llamar a start() (es decir, al pulsar el botón); el texto
 * reconocido solo se entrega con onFinal y quien lo recibe lo escribe en el campo del chat, nunca lo
 * envía. Idioma es-CO con respaldo es-ES si el navegador no lo admite.
 */
import { es } from "../i18n/es";

/** Idiomas en orden de preferencia: español de Colombia y, si no lo admite el navegador, de España. */
export const DICTATION_LANGUAGES = ["es-CO", "es-ES"] as const;

/** Una alternativa reconocida (solo se usa la primera). */
export interface RecognitionAlternativeLike {
  transcript: string;
}

/** Un resultado: final o provisional, con sus alternativas indexadas. */
export interface RecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: RecognitionAlternativeLike;
}

/** Lo mínimo del evento `result` que se lee. */
export interface RecognitionResultEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: RecognitionResultLike };
}

/** Lo mínimo de `SpeechRecognition` que se usa. */
export interface RecognizerLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionResultEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type RecognizerCtor = new () => RecognizerLike;

/** Si se puede dictar en esta página y, si no, por qué. */
export type DictationSupport =
  | { kind: "supported"; ctor: RecognizerCtor }
  | { kind: "unsupported" }
  | { kind: "insecure" };

/**
 * Detecta el soporte SIN crear ningún reconocedor ni pedir el micrófono: solo mira si existe el
 * constructor (estándar o con prefijo webkit) y si la página está en un contexto seguro (https o
 * localhost), que el navegador exige para usar el micrófono.
 */
export function detectDictationSupport(win: unknown): DictationSupport {
  if (!win || typeof win !== "object") return { kind: "unsupported" };
  const scope = win as Record<string, unknown>;
  const ctor = scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
  if (typeof ctor !== "function") return { kind: "unsupported" };
  if (scope.isSecureContext === false) return { kind: "insecure" };
  return { kind: "supported", ctor: ctor as RecognizerCtor };
}

/**
 * Traduce el código de error del reconocimiento (`SpeechRecognitionErrorEvent.error`) a un mensaje
 * en español. Devuelve null para "aborted": es la cancelación del propio usuario y no es un error.
 */
export function dictationErrorMessage(code: string): string | null {
  const t = es.dictation.errors;
  switch (code) {
    case "aborted":
      return null;
    case "not-allowed":
    case "service-not-allowed":
      return t.permissionDenied;
    case "audio-capture":
      return t.noMicrophone;
    case "network":
    case "offline":
      return t.offline;
    case "no-speech":
      return t.noSpeech;
    case "language-not-supported":
      return t.language;
    case "unsupported":
      return t.unsupported;
    case "insecure":
      return t.insecure;
    default:
      return t.generic;
  }
}

/**
 * Añade lo dictado al texto que ya había en el campo, separado por un espacio, sin espacios sobrantes
 * y recortado al máximo del chat. Lo dictado en blanco deja el campo igual.
 */
export function appendDictation(current: string, dictated: string, maxChars: number): string {
  const addition = dictated.replace(/\s+/g, " ").trim();
  if (!addition) return current;
  const base = current.replace(/\s+$/, "");
  const joined = base ? `${base} ${addition}` : addition;
  return joined.slice(0, Math.max(0, maxChars));
}

/** Separa, desde `resultIndex`, el texto final del provisional de un evento `result`. */
export function readTranscript(event: RecognitionResultEventLike): { final: string; interim: string } {
  let finalText = "";
  let interim = "";
  for (let i = event.resultIndex; i < event.results.length; i += 1) {
    const result = event.results[i];
    const transcript = result && result.length > 0 ? result[0].transcript : "";
    if (result?.isFinal) finalText += transcript;
    else interim += transcript;
  }
  return { final: finalText.trim(), interim: interim.trim() };
}

export interface DictationCallbacks {
  /** Texto provisional mientras se habla (solo para mostrarlo). */
  onInterim: (text: string) => void;
  /** Texto definitivo: va al campo del chat, nunca se envía solo. */
  onFinal: (text: string) => void;
  /** Código de error del navegador (se traduce con dictationErrorMessage). */
  onError: (code: string) => void;
  /** Terminó la escucha (por silencio, error o cancelación). */
  onEnd: () => void;
}

/**
 * Una escucha cada vez (sin modo continuo: termina sola tras una pausa). Si el navegador no admite
 * es-CO, repite una vez con es-ES y recuerda el respaldo para las siguientes escuchas.
 */
export class DictationSession {
  private recognizer: RecognizerLike | null = null;
  private languageIndex = 0;
  private retrying = false;
  private cancelled = false;

  constructor(
    private readonly ctor: RecognizerCtor,
    private readonly callbacks: DictationCallbacks
  ) {}

  /** Idioma que se usará en la próxima escucha. */
  get language(): string {
    return DICTATION_LANGUAGES[this.languageIndex];
  }

  /** Si hay una escucha en marcha. */
  get active(): boolean {
    return this.recognizer !== null;
  }

  /** Empieza a escuchar; aquí, y solo aquí, el navegador pide el permiso del micrófono. */
  start(): void {
    if (this.recognizer) return;
    this.cancelled = false;
    this.retrying = false;
    this.launch();
  }

  /** Cancela la escucha y descarta lo que aún no era definitivo. */
  cancel(): void {
    this.cancelled = true;
    this.retrying = false;
    this.recognizer?.abort();
  }

  private launch(): void {
    const recognizer = new this.ctor();
    recognizer.lang = this.language;
    recognizer.continuous = false;
    recognizer.interimResults = true;
    recognizer.maxAlternatives = 1;

    recognizer.onresult = (event) => {
      if (this.cancelled) return;
      const { final, interim } = readTranscript(event);
      if (interim) this.callbacks.onInterim(interim);
      if (final) this.callbacks.onFinal(final);
    };
    recognizer.onerror = (event) => {
      if (event.error === "language-not-supported" && this.languageIndex < DICTATION_LANGUAGES.length - 1) {
        // Se repite con el idioma de respaldo cuando termine esta escucha.
        this.languageIndex += 1;
        this.retrying = true;
        return;
      }
      if (this.cancelled || event.error === "aborted") return;
      this.callbacks.onError(event.error);
    };
    recognizer.onend = () => {
      if (this.recognizer === recognizer) this.recognizer = null;
      if (this.retrying && !this.cancelled) {
        this.retrying = false;
        this.launch();
        return;
      }
      this.callbacks.onEnd();
    };

    this.recognizer = recognizer;
    try {
      recognizer.start();
    } catch {
      // start() puede lanzar (por ejemplo, InvalidStateError); entonces no llega onend.
      this.recognizer = null;
      this.callbacks.onError("start-failed");
      this.callbacks.onEnd();
    }
  }
}

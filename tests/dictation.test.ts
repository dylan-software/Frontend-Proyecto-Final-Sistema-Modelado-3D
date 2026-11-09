/**
 * Dictado (PLAN-COMPLETO.md, FASE 7): detección de soporte, mensajes de error en español, cómo se
 * añade lo dictado al campo y la sesión con un reconocedor falso (sin navegador ni micrófono).
 */
import { describe, expect, it } from "vitest";

import { es } from "../src/i18n/es";
import {
  DICTATION_LANGUAGES,
  DictationSession,
  appendDictation,
  detectDictationSupport,
  dictationErrorMessage,
  readTranscript,
  type RecognitionResultEventLike,
  type RecognizerLike,
} from "../src/lib/dictation";

/** Reconocedor falso: registra lo que se le pide y deja disparar los eventos a mano. */
class FakeRecognizer implements RecognizerLike {
  static instances: FakeRecognizer[] = [];
  static failOnStart = false;
  lang = "";
  continuous = true;
  interimResults = false;
  maxAlternatives = 5;
  onresult: RecognizerLike["onresult"] = null;
  onerror: RecognizerLike["onerror"] = null;
  onend: RecognizerLike["onend"] = null;
  started = 0;
  aborted = 0;
  stopped = 0;

  constructor() {
    FakeRecognizer.instances.push(this);
  }
  start() {
    if (FakeRecognizer.failOnStart) throw new Error("InvalidStateError");
    this.started += 1;
  }
  stop() {
    this.stopped += 1;
  }
  abort() {
    this.aborted += 1;
  }
  emitResult(parts: Array<[string, boolean]>, resultIndex = 0) {
    this.onresult?.(resultEvent(parts, resultIndex));
  }
  emitError(code: string) {
    this.onerror?.({ error: code });
  }
  emitEnd() {
    this.onend?.();
  }
}

function resultEvent(parts: Array<[string, boolean]>, resultIndex = 0): RecognitionResultEventLike {
  const results = parts.map(([transcript, isFinal]) => ({ isFinal, length: 1, 0: { transcript } }));
  return { resultIndex, results: Object.assign(results, { length: results.length }) };
}

function newSession() {
  FakeRecognizer.instances = [];
  FakeRecognizer.failOnStart = false;
  const log = { interim: [] as string[], final: [] as string[], errors: [] as string[], ends: 0 };
  const session = new DictationSession(FakeRecognizer, {
    onInterim: (text) => log.interim.push(text),
    onFinal: (text) => log.final.push(text),
    onError: (code) => log.errors.push(code),
    onEnd: () => {
      log.ends += 1;
    },
  });
  return { session, log };
}

describe("detectDictationSupport", () => {
  it("sin window o sin la API: no hay soporte", () => {
    expect(detectDictationSupport(undefined).kind).toBe("unsupported");
    expect(detectDictationSupport({}).kind).toBe("unsupported");
    expect(detectDictationSupport({ SpeechRecognition: "no es un constructor" }).kind).toBe("unsupported");
  });

  it("acepta la API estándar y la que lleva el prefijo webkit", () => {
    const standard = detectDictationSupport({ SpeechRecognition: FakeRecognizer, isSecureContext: true });
    const webkit = detectDictationSupport({ webkitSpeechRecognition: FakeRecognizer, isSecureContext: true });
    expect(standard).toEqual({ kind: "supported", ctor: FakeRecognizer });
    expect(webkit).toEqual({ kind: "supported", ctor: FakeRecognizer });
  });

  it("en una página no segura (http) no se ofrece", () => {
    expect(detectDictationSupport({ SpeechRecognition: FakeRecognizer, isSecureContext: false }).kind).toBe("insecure");
  });

  it("solo detecta: no crea ningún reconocedor (el micrófono no se pide al cargar)", () => {
    FakeRecognizer.instances = [];
    detectDictationSupport({ SpeechRecognition: FakeRecognizer, isSecureContext: true });
    expect(FakeRecognizer.instances).toHaveLength(0);
  });
});

describe("dictationErrorMessage", () => {
  const t = es.dictation.errors;

  it.each([
    ["not-allowed", t.permissionDenied],
    ["service-not-allowed", t.permissionDenied],
    ["audio-capture", t.noMicrophone],
    ["network", t.offline],
    ["offline", t.offline],
    ["no-speech", t.noSpeech],
    ["language-not-supported", t.language],
    ["unsupported", t.unsupported],
    ["insecure", t.insecure],
    ["start-failed", t.generic],
    ["algo-desconocido", t.generic],
  ])("%s -> mensaje en español", (code, message) => {
    expect(dictationErrorMessage(code)).toBe(message);
  });

  it("la cancelación del usuario (aborted) no es un error", () => {
    expect(dictationErrorMessage("aborted")).toBeNull();
  });

  it("los mensajes están en español y no vacíos", () => {
    for (const message of Object.values(t)) {
      expect(message.length).toBeGreaterThan(10);
    }
    expect(t.permissionDenied).toMatch(/permiso/i);
    expect(t.noMicrophone).toMatch(/micrófono/i);
    expect(t.offline).toMatch(/conexión/i);
    expect(t.unsupported).toMatch(/navegador/i);
  });
});

describe("appendDictation", () => {
  it("con el campo vacío, deja solo lo dictado", () => {
    expect(appendDictation("", "  pon una lámpara  ", 100)).toBe("pon una lámpara");
  });

  it("añade lo dictado tras lo escrito, con un solo espacio", () => {
    expect(appendDictation("Hola,  ", "pon una lámpara", 100)).toBe("Hola, pon una lámpara");
  });

  it("colapsa los espacios internos de lo dictado", () => {
    expect(appendDictation("", "pon\n una   lámpara", 100)).toBe("pon una lámpara");
  });

  it("lo dictado en blanco deja el campo igual", () => {
    expect(appendDictation("Hola ", "   ", 100)).toBe("Hola ");
  });

  it("recorta al máximo de caracteres del chat", () => {
    expect(appendDictation("abc", "defgh", 6)).toBe("abc de");
    expect(appendDictation("", "abc", 0)).toBe("");
  });
});

describe("readTranscript", () => {
  it("separa lo final de lo provisional desde resultIndex", () => {
    const event = resultEvent(
      [
        ["ya contado ", true],
        ["pon una ", true],
        ["lámpara", false],
      ],
      1
    );
    expect(readTranscript(event)).toEqual({ final: "pon una", interim: "lámpara" });
  });

  it("tolera un resultado sin alternativas", () => {
    const event: RecognitionResultEventLike = { resultIndex: 0, results: { length: 1, 0: { isFinal: true, length: 0 } } };
    expect(readTranscript(event)).toEqual({ final: "", interim: "" });
  });
});

describe("DictationSession", () => {
  it("no crea nada hasta start(); luego escucha en es-CO, sin modo continuo y con texto provisional", () => {
    const { session } = newSession();
    expect(FakeRecognizer.instances).toHaveLength(0);
    expect(session.active).toBe(false);

    session.start();
    const [recognizer] = FakeRecognizer.instances;
    expect(recognizer.lang).toBe("es-CO");
    expect(DICTATION_LANGUAGES[0]).toBe("es-CO");
    expect(recognizer.continuous).toBe(false);
    expect(recognizer.interimResults).toBe(true);
    expect(recognizer.maxAlternatives).toBe(1);
    expect(recognizer.started).toBe(1);
    expect(session.active).toBe(true);
  });

  it("entrega lo provisional y lo final por separado y termina con onEnd", () => {
    const { session, log } = newSession();
    session.start();
    const [recognizer] = FakeRecognizer.instances;

    recognizer.emitResult([["pon una", false]]);
    recognizer.emitResult([["pon una lámpara", true]]);
    recognizer.emitEnd();

    expect(log.interim).toEqual(["pon una"]);
    expect(log.final).toEqual(["pon una lámpara"]);
    expect(log.errors).toEqual([]);
    expect(log.ends).toBe(1);
    expect(session.active).toBe(false);
  });

  it("un segundo start() mientras escucha no abre otra escucha", () => {
    const { session } = newSession();
    session.start();
    session.start();
    expect(FakeRecognizer.instances).toHaveLength(1);
  });

  it("cancelar aborta, descarta lo que llegue después y no informa de error", () => {
    const { session, log } = newSession();
    session.start();
    const [recognizer] = FakeRecognizer.instances;

    session.cancel();
    expect(recognizer.aborted).toBe(1);
    recognizer.emitResult([["tarde", true]]);
    recognizer.emitError("aborted");
    recognizer.emitEnd();

    expect(log.final).toEqual([]);
    expect(log.errors).toEqual([]);
    expect(log.ends).toBe(1);
  });

  it("pasa los errores del navegador (permiso, micrófono, conexión, silencio)", () => {
    for (const code of ["not-allowed", "audio-capture", "network", "no-speech"]) {
      const { session, log } = newSession();
      session.start();
      FakeRecognizer.instances[0].emitError(code);
      FakeRecognizer.instances[0].emitEnd();
      expect(log.errors).toEqual([code]);
      expect(log.ends).toBe(1);
    }
  });

  it("si no admite es-CO, repite una vez con es-ES y lo recuerda", () => {
    const { session, log } = newSession();
    session.start();
    FakeRecognizer.instances[0].emitError("language-not-supported");
    FakeRecognizer.instances[0].emitEnd();

    expect(FakeRecognizer.instances).toHaveLength(2);
    expect(FakeRecognizer.instances[1].lang).toBe("es-ES");
    expect(FakeRecognizer.instances[1].started).toBe(1);
    expect(log.errors).toEqual([]);
    expect(log.ends).toBe(0);

    FakeRecognizer.instances[1].emitEnd();
    expect(log.ends).toBe(1);
    expect(session.language).toBe("es-ES");

    session.start();
    expect(FakeRecognizer.instances[2].lang).toBe("es-ES");
  });

  it("si tampoco admite es-ES, avisa con el error de idioma", () => {
    const { session, log } = newSession();
    session.start();
    FakeRecognizer.instances[0].emitError("language-not-supported");
    FakeRecognizer.instances[0].emitEnd();
    FakeRecognizer.instances[1].emitError("language-not-supported");
    FakeRecognizer.instances[1].emitEnd();

    expect(FakeRecognizer.instances).toHaveLength(2);
    expect(log.errors).toEqual(["language-not-supported"]);
    expect(log.ends).toBe(1);
  });

  it("si start() lanza, informa de un error genérico y termina", () => {
    const { session, log } = newSession();
    FakeRecognizer.failOnStart = true;
    session.start();
    expect(log.errors).toEqual(["start-failed"]);
    expect(log.ends).toBe(1);
    expect(session.active).toBe(false);
    FakeRecognizer.failOnStart = false;
  });
});

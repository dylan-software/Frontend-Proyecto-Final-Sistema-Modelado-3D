import { afterEach, describe, expect, it, vi } from "vitest";

import {
  KNOWN_EMAILS_KEY,
  MAX_KNOWN_EMAILS,
  parseKnownEmails,
  readKnownEmails,
  rememberEmail,
  withKnownEmail,
} from "../src/lib/knownEmails";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    keys: () => [...data.keys()],
    get: (key: string) => data.get(key),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("withKnownEmail", () => {
  it("puts the email first without repeating it, ignoring case", () => {
    expect(withKnownEmail(["b@x.co", "A@x.co"], " a@x.co ")).toEqual(["a@x.co", "b@x.co"]);
  });

  it(`keeps at most ${MAX_KNOWN_EMAILS} emails, dropping the oldest`, () => {
    const many = Array.from({ length: MAX_KNOWN_EMAILS }, (_, i) => `u${i}@x.co`);

    const next = withKnownEmail(many, "nuevo@x.co");

    expect(next).toHaveLength(MAX_KNOWN_EMAILS);
    expect(next[0]).toBe("nuevo@x.co");
    expect(next).not.toContain(`u${MAX_KNOWN_EMAILS - 1}@x.co`);
  });

  it("ignores something that is not an email", () => {
    expect(withKnownEmail(["a@x.co"], "no es un correo")).toEqual(["a@x.co"]);
  });
});

describe("parseKnownEmails", () => {
  it("accepts only a JSON array of emails", () => {
    expect(parseKnownEmails(null)).toEqual([]);
    expect(parseKnownEmails("{roto")).toEqual([]);
    expect(parseKnownEmails('{"email":"a@x.co"}')).toEqual([]);
    expect(parseKnownEmails('["a@x.co", 3, {"password":"x"}, "sin-arroba", "A@X.CO", "b@x.co"]')).toEqual([
      "a@x.co",
      "b@x.co",
    ]);
  });

  it("never returns more than the maximum", () => {
    const many = JSON.stringify(Array.from({ length: 20 }, (_, i) => `u${i}@x.co`));
    expect(parseKnownEmails(many)).toHaveLength(MAX_KNOWN_EMAILS);
  });
});

describe("remembering emails in this browser", () => {
  it("stores only the email list under one key", () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);

    rememberEmail("ana@x.co");
    rememberEmail("luis@x.co");
    rememberEmail("ana@x.co");

    expect(storage.keys()).toEqual([KNOWN_EMAILS_KEY]);
    expect(JSON.parse(storage.get(KNOWN_EMAILS_KEY) ?? "")).toEqual(["ana@x.co", "luis@x.co"]);
    expect(readKnownEmails()).toEqual(["ana@x.co", "luis@x.co"]);
  });

  it("works with blocked storage", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(readKnownEmails()).toEqual([]);
    expect(() => rememberEmail("ana@x.co")).not.toThrow();
  });
});

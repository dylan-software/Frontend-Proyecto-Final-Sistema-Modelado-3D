import { describe, it, expect, vi } from "vitest";

import { AR_UNSUPPORTED_MESSAGE, describeArError, openHitTestSession } from "../src/lib/arSession";

/** Fake XR system, session and renderer that record the order of the calls. */
function fakeAr({ hitTestFails = false } = {}) {
  const calls: string[] = [];
  const hitTestSource = { cancel: vi.fn() };
  const session = {
    requestReferenceSpace: vi.fn(async (type: string) => {
      calls.push(`requestReferenceSpace:${type}`);
      return { type };
    }),
    requestHitTestSource: vi.fn(async () => {
      calls.push("requestHitTestSource");
      if (hitTestFails) throw new Error("hit-test not available");
      return hitTestSource;
    }),
    end: vi.fn(async () => {
      calls.push("end");
    }),
  };
  const xr = {
    requestSession: vi.fn(async () => {
      calls.push("requestSession");
      return session;
    }),
  };
  const renderer = {
    xr: {
      setReferenceSpaceType: vi.fn((type: string) => {
        calls.push(`setReferenceSpaceType:${type}`);
      }),
      setSession: vi.fn(async () => {
        calls.push("setSession");
      }),
    },
  };
  return { calls, xr, session, renderer, hitTestSource };
}

describe("openHitTestSession", () => {
  it("asks only for hit-test and sets the 'local' reference space BEFORE setSession", async () => {
    const ar = fakeAr();

    const opened = await openHitTestSession(ar.xr as any, ar.renderer as any);

    expect(ar.xr.requestSession).toHaveBeenCalledWith("immersive-ar", { requiredFeatures: ["hit-test"] });
    expect(ar.calls.slice(0, 3)).toEqual(["requestSession", "setReferenceSpaceType:local", "setSession"]);
    expect(opened.session).toBe(ar.session);
    expect(opened.hitTestSource).toBe(ar.hitTestSource);
    expect(ar.session.end).not.toHaveBeenCalled();
  });

  it("ends the session and rethrows when requestHitTestSource fails", async () => {
    const ar = fakeAr({ hitTestFails: true });

    await expect(openHitTestSession(ar.xr as any, ar.renderer as any)).rejects.toThrow("hit-test not available");

    expect(ar.session.end).toHaveBeenCalledTimes(1);
    expect(ar.calls.at(-1)).toBe("end");
  });

  it("still rethrows the original error if ending the session fails too", async () => {
    const ar = fakeAr({ hitTestFails: true });
    ar.session.end.mockRejectedValueOnce(new Error("already ended"));

    await expect(openHitTestSession(ar.xr as any, ar.renderer as any)).rejects.toThrow("hit-test not available");
  });
});

describe("describeArError", () => {
  it("explains which devices are supported on NotSupportedError", () => {
    const err = Object.assign(new Error("This device does not support the requested reference space type."), {
      name: "NotSupportedError",
    });

    expect(describeArError(err)).toBe(AR_UNSUPPORTED_MESSAGE);
    expect(AR_UNSUPPORTED_MESSAGE).toContain("Android");
    expect(AR_UNSUPPORTED_MESSAGE).toContain("no funciona en iPhone ni en PC");
  });

  it("asks for camera permission and HTTPS when access is denied", () => {
    expect(describeArError(Object.assign(new Error("denied"), { name: "NotAllowedError" }))).toContain(
      "permite el acceso a la cámara"
    );
  });

  it("wraps any other error in a Spanish message", () => {
    expect(describeArError(new Error("boom"))).toBe("No se pudo iniciar el escaneo con la cámara: boom");
    expect(describeArError(null)).toBe("No se pudo iniciar el escaneo con la cámara.");
  });
});

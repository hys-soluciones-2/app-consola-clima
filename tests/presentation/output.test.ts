import { afterEach, describe, expect, it } from "bun:test";
import { WeatherError } from "../../src/api/client.ts";
import { blank, fail, line, messageOf, reportError, success } from "../../src/presentation/output.ts";
import { captureStdout } from "../utils/testHelpers.ts";

const originalNoColor = process.env.NO_COLOR;
const originalForceColor = process.env.FORCE_COLOR;
let restore: (() => void) | undefined;

afterEach(() => {
  restore?.();
  restore = undefined;
  if (originalNoColor === undefined) delete process.env.NO_COLOR;
  else process.env.NO_COLOR = originalNoColor;
  if (originalForceColor === undefined) delete process.env.FORCE_COLOR;
  else process.env.FORCE_COLOR = originalForceColor;
});

describe("messageOf", () => {
  it("extrae mensaje de Error y convierte otros valores", () => {
    expect(messageOf(new Error("boom"))).toBe("boom");
    expect(messageOf("x")).toBe("x");
    expect(messageOf(42)).toBe("42");
  });
});

describe("salida por consola", () => {
  it("escribe líneas y mensajes con prefijo", () => {
    delete process.env.FORCE_COLOR;
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    restore = cap.restore;
    blank();
    line("hola");
    success("ok");
    fail("mal");
    expect(cap.output()).toBe("\n" + "hola\n" + "  ok\n" + "  mal\n");
  });

  it("reporta WeatherError y errores inesperados de forma distinta", () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    restore = cap.restore;
    reportError(new WeatherError("fallo previsto"));
    reportError(new Error("boom"));
    const out = cap.output();
    expect(out).toContain("  fallo previsto\n");
    expect(out).toContain("  Error inesperado: boom\n");
  });
});

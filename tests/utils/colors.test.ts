import { afterEach, describe, expect, it } from "bun:test";
import { colorsEnabled, paint } from "../../src/utils/colors.ts";

const envKeys = ["NO_COLOR", "FORCE_COLOR", "TERM"] as const;
type Key = (typeof envKeys)[number];
const original: Record<Key, string | undefined> = {
  NO_COLOR: process.env.NO_COLOR,
  FORCE_COLOR: process.env.FORCE_COLOR,
  TERM: process.env.TERM,
};

function restoreEnv(): void {
  for (const key of envKeys) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

afterEach(() => {
  restoreEnv();
});

describe("colorsEnabled", () => {
  it("respeta FORCE_COLOR=0 y NO_COLOR", () => {
    process.env.FORCE_COLOR = "0";
    delete process.env.NO_COLOR;
    expect(colorsEnabled()).toBe(false);

    delete process.env.FORCE_COLOR;
    process.env.NO_COLOR = "1";
    expect(colorsEnabled()).toBe(false);
  });

  it("habilita color cuando FORCE_COLOR está activo", () => {
    process.env.FORCE_COLOR = "1";
    delete process.env.NO_COLOR;
    process.env.TERM = "dumb";
    expect(colorsEnabled()).toBe(true);
  });

  it("deshabilita color con TERM=dumb sin overrides", () => {
    delete process.env.FORCE_COLOR;
    delete process.env.NO_COLOR;
    process.env.TERM = "dumb";
    expect(colorsEnabled()).toBe(false);
  });

  it("sin overrides depende de si stdout es TTY", () => {
    delete process.env.FORCE_COLOR;
    delete process.env.NO_COLOR;
    process.env.TERM = "xterm-256color";
    expect(colorsEnabled()).toBe(process.stdout.isTTY === true);
  });
});

describe("paint", () => {
  it("devuelve el texto sin ANSI cuando el color está deshabilitado", () => {
    process.env.FORCE_COLOR = "0";
    expect(paint("hola", "green")).toBe("hola");
  });

  it("envuelve el texto con ANSI cuando el color está forzado", () => {
    process.env.FORCE_COLOR = "1";
    delete process.env.NO_COLOR;
    expect(paint("hola", "red")).toBe("\x1b[31mhola\x1b[0m");
  });
});

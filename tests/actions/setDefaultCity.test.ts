import { afterEach, describe, expect, it } from "bun:test";
import { runSetDefaultCity } from "../../src/actions/setDefaultCity.ts";
import type { AppContext } from "../../src/types/AppContext.ts";
import type { Config } from "../../src/types/Config.ts";
import { captureStdout, createPrompterStub } from "../utils/testHelpers.ts";

const originalNoColor = process.env.NO_COLOR;

function config(): Config {
  return {
    version: 1,
    unit: "celsius",
    defaultCityId: "1",
    cities: [
      { id: "1", name: "Ottawa", latitude: 1, longitude: 2 },
      { id: "2", name: "Lima", country: "Perú", latitude: 3, longitude: 4 },
    ],
  };
}

afterEach(() => {
  if (originalNoColor === undefined) delete process.env.NO_COLOR;
  else process.env.NO_COLOR = originalNoColor;
});

describe("runSetDefaultCity", () => {
  it("avisa cuando no hay ciudades", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    const ctx: AppContext = {
      config: { version: 1, unit: "celsius", defaultCityId: null, cities: [] },
      prompter: createPrompterStub([]),
      persist: async () => {},
    };
    try {
      await runSetDefaultCity(ctx);
      expect(cap.output()).toContain("Todavía no tienes ciudades guardadas.");
    } finally {
      cap.restore();
    }
  });

  it("permite cancelar y reporta selección inválida", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    let persisted = 0;
    const ctx: AppContext = {
      config: config(),
      prompter: createPrompterStub(["", "9"]),
      persist: async () => {
        persisted += 1;
      },
    };
    try {
      await runSetDefaultCity(ctx);
      await runSetDefaultCity(ctx);
      expect(ctx.config.defaultCityId).toBe("1");
      expect(persisted).toBe(0);
      expect(cap.output()).toContain("Opción inválida.");
    } finally {
      cap.restore();
    }
  });

  it("establece la ciudad default seleccionada y persiste", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    let persisted = 0;
    const ctx: AppContext = {
      config: config(),
      prompter: createPrompterStub(["2"]),
      persist: async () => {
        persisted += 1;
      },
    };
    try {
      await runSetDefaultCity(ctx);
      expect(ctx.config.defaultCityId).toBe("2");
      expect(persisted).toBe(1);
      expect(cap.output()).toContain("Ciudad default: Lima, Perú");
    } finally {
      cap.restore();
    }
  });
});

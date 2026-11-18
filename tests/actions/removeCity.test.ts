import { afterEach, describe, expect, it } from "bun:test";
import { runRemoveCity } from "../../src/actions/removeCity.ts";
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

describe("runRemoveCity", () => {
  it("avisa cuando no hay ciudades", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    const ctx: AppContext = {
      config: { version: 1, unit: "celsius", defaultCityId: null, cities: [] },
      prompter: createPrompterStub([]),
      persist: async () => {},
    };
    try {
      await runRemoveCity(ctx);
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
      prompter: createPrompterStub(["", "3"]),
      persist: async () => {
        persisted += 1;
      },
    };
    try {
      await runRemoveCity(ctx);
      await runRemoveCity(ctx);
      expect(ctx.config.cities).toHaveLength(2);
      expect(persisted).toBe(0);
      expect(cap.output()).toContain("Opción inválida.");
    } finally {
      cap.restore();
    }
  });

  it("elimina la ciudad, reasigna default y persiste", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    let persisted = 0;
    const ctx: AppContext = {
      config: config(),
      prompter: createPrompterStub(["1"]),
      persist: async () => {
        persisted += 1;
      },
    };
    try {
      await runRemoveCity(ctx);
      expect(ctx.config.cities.map((c) => c.id)).toEqual(["2"]);
      expect(ctx.config.defaultCityId).toBe("2");
      expect(persisted).toBe(1);
      expect(cap.output()).toContain("Eliminada: Ottawa");
    } finally {
      cap.restore();
    }
  });

  it("avisa si ya no queda ciudad default", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    const ctx: AppContext = {
      config: {
        version: 1,
        unit: "celsius",
        defaultCityId: "1",
        cities: [{ id: "1", name: "Ottawa", latitude: 1, longitude: 2 }],
      },
      prompter: createPrompterStub(["1"]),
      persist: async () => {},
    };
    try {
      await runRemoveCity(ctx);
      expect(ctx.config.defaultCityId).toBeNull();
      expect(cap.output()).toContain("Ya no tienes ciudad default.");
    } finally {
      cap.restore();
    }
  });
});

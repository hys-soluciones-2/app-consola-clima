import { afterEach, describe, expect, it } from "bun:test";
import { renderMenu, runMenu } from "../../src/presentation/menu.ts";
import type { AppContext } from "../../src/types/AppContext.ts";
import type { Config } from "../../src/types/Config.ts";
import { captureStdout, createPrompterStub } from "../utils/testHelpers.ts";

const originalNoColor = process.env.NO_COLOR;
const originalForceColor = process.env.FORCE_COLOR;

function baseConfig(overrides: Partial<Config> = {}): Config {
  return {
    version: 1,
    unit: "celsius",
    defaultCityId: null,
    cities: [],
    ...overrides,
  };
}

afterEach(() => {
  if (originalNoColor === undefined) delete process.env.NO_COLOR;
  else process.env.NO_COLOR = originalNoColor;
  if (originalForceColor === undefined) delete process.env.FORCE_COLOR;
  else process.env.FORCE_COLOR = originalForceColor;
});

describe("renderMenu", () => {
  it("incluye título, opciones, contador de ciudades y unidad", () => {
    const menu = renderMenu(baseConfig({ cities: [{ id: "1", name: "A", latitude: 0, longitude: 0 }], unit: "fahrenheit" }));
    expect(menu).toContain("WEATHER CLI");
    expect(menu).toContain("  1. Clima de ciudad default");
    expect(menu).toContain("  2. Clima de todas las ciudades (1)");
    expect(menu).toContain("  6. Pronóstico 7 días (todas las ciudades)");
    expect(menu).toContain("  8. Ajustes (°F)");
    expect(menu).toContain("  9. Salir");
  });
});

describe("runMenu", () => {
  it("sale con la opción 9", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    const prompter = createPrompterStub(["9"]);
    const ctx: AppContext = { config: baseConfig(), prompter, persist: async () => {} };
    try {
      await runMenu(ctx);
      expect(cap.output()).toContain("¡Hasta luego!");
    } finally {
      cap.restore();
    }
  });

  it("termina cuando la entrada se cierra (null)", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    const prompter = createPrompterStub([null]);
    const ctx: AppContext = { config: baseConfig(), prompter, persist: async () => {} };
    try {
      await runMenu(ctx);
      expect(cap.output()).toContain("WEATHER CLI");
    } finally {
      cap.restore();
    }
  });

  it("ignora entrada vacía y reporta opciones inválidas", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    const prompter = createPrompterStub(["", "7", "abc", "9"]);
    const ctx: AppContext = { config: baseConfig(), prompter, persist: async () => {} };
    try {
      await runMenu(ctx);
      const out = cap.output();
      expect(out.match(/Opción no válida\./g)?.length).toBe(2);
    } finally {
      cap.restore();
    }
  });

  it("despacha acciones que no requieren red cuando no hay ciudades (1,2,4,5,6)", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    const prompter = createPrompterStub(["1", "2", "4", "5", "6", "9"]);
    const ctx: AppContext = { config: baseConfig(), prompter, persist: async () => {} };
    try {
      await runMenu(ctx);
      const out = cap.output();
      expect(out).toContain("No hay ciudad default. Agrega una con la opción 3.");
      expect(out).toContain("Todavía no tienes ciudades guardadas. Usa la opción 3.");
      expect(out).toContain("Todavía no tienes ciudades guardadas.");
    } finally {
      cap.restore();
    }
  });

  it("alterna la unidad y persiste con la opción 8", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    const prompter = createPrompterStub(["8", "9"]);
    let persisted = 0;
    const config = baseConfig({ unit: "celsius" });
    const ctx: AppContext = {
      config,
      prompter,
      persist: async () => {
        persisted += 1;
      },
    };
    try {
      await runMenu(ctx);
      expect(ctx.config.unit).toBe("fahrenheit");
      expect(persisted).toBe(1);
      expect(cap.output()).toContain("Unidad establecida en °F.");
    } finally {
      cap.restore();
    }
  });
});

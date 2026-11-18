import { afterEach, describe, expect, it, mock } from "bun:test";
import { runAddCity } from "../../src/actions/addCity.ts";
import type { AppContext } from "../../src/types/AppContext.ts";
import type { Config } from "../../src/types/Config.ts";
import { captureStdout, createPrompterStub } from "../utils/testHelpers.ts";

const realFetch = globalThis.fetch;
const originalNoColor = process.env.NO_COLOR;

function emptyConfig(): Config {
  return { version: 1, unit: "celsius", defaultCityId: null, cities: [] };
}

function stubGeocoding(body: unknown, status = 200): void {
  globalThis.fetch = mock(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
  if (originalNoColor === undefined) delete process.env.NO_COLOR;
  else process.env.NO_COLOR = originalNoColor;
});

describe("runAddCity", () => {
  it("no hace nada si la entrada se cierra", async () => {
    process.env.NO_COLOR = "1";
    const ctx: AppContext = { config: emptyConfig(), prompter: createPrompterStub([null]), persist: async () => {} };
    await runAddCity(ctx);
    expect(ctx.config.cities).toHaveLength(0);
  });

  it("avisa si no se escribe nombre", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    const ctx: AppContext = { config: emptyConfig(), prompter: createPrompterStub([""]), persist: async () => {} };
    try {
      await runAddCity(ctx);
      expect(cap.output()).toContain("No escribiste ningún nombre.");
    } finally {
      cap.restore();
    }
  });

  it("reporta errores de búsqueda", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    stubGeocoding("fail", 500);
    const ctx: AppContext = { config: emptyConfig(), prompter: createPrompterStub(["Lima"]), persist: async () => {} };
    try {
      await runAddCity(ctx);
      expect(cap.output()).toContain("Open-Meteo respondió 500");
    } finally {
      cap.restore();
    }
  });

  it("avisa si no hay resultados", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    stubGeocoding({ results: [] });
    const ctx: AppContext = { config: emptyConfig(), prompter: createPrompterStub(["Atlantis"]), persist: async () => {} };
    try {
      await runAddCity(ctx);
      expect(cap.output()).toContain('No se encontró ninguna ciudad llamada "Atlantis".');
    } finally {
      cap.restore();
    }
  });

  it("permite cancelar y reporta selección inválida", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    let persisted = 0;
    stubGeocoding({ results: [{ id: 1, name: "Ottawa", latitude: 45.41, longitude: -75.69, country: "Canadá" }] });
    const ctx: AppContext = {
      config: emptyConfig(),
      prompter: createPrompterStub(["Ottawa", ""]),
      persist: async () => {
        persisted += 1;
      },
    };
    try {
      await runAddCity(ctx);
      expect(ctx.config.cities).toHaveLength(0);
      expect(persisted).toBe(0);

      stubGeocoding({ results: [{ id: 1, name: "Ottawa", latitude: 45.41, longitude: -75.69, country: "Canadá" }] });
      ctx.prompter = createPrompterStub(["Ottawa", "5"]);
      await runAddCity(ctx);
      expect(ctx.config.cities).toHaveLength(0);
      expect(cap.output()).toContain("Opción inválida.");
    } finally {
      cap.restore();
    }
  });

  it("agrega la ciudad elegida, persiste y marca default si es la primera", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    let persisted = 0;
    stubGeocoding({
      results: [
        { id: 1, name: "Ottawa", latitude: 45.41, longitude: -75.69, admin1: "Ontario", country: "Canadá" },
      ],
    });
    const ctx: AppContext = {
      config: emptyConfig(),
      prompter: createPrompterStub(["Ottawa", "1"]),
      persist: async () => {
        persisted += 1;
      },
    };
    try {
      await runAddCity(ctx);
      expect(ctx.config.cities).toHaveLength(1);
      expect(ctx.config.defaultCityId).toBe("1");
      expect(persisted).toBe(1);
      const out = cap.output();
      expect(out).toContain("1. Ottawa, Ontario, Canadá");
      expect(out).toContain("Agregada: Ottawa, Ontario, Canadá");
      expect(out).toContain("Quedó como tu ciudad default.");
    } finally {
      cap.restore();
    }
  });

  it("detecta ciudades ya guardadas", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    let persisted = 0;
    stubGeocoding({ results: [{ id: 1, name: "Ottawa", latitude: 45.41, longitude: -75.69, country: "Canadá" }] });
    const ctx: AppContext = {
      config: {
        version: 1,
        unit: "celsius",
        defaultCityId: "1",
        cities: [{ id: "1", name: "Ottawa", latitude: 45.41, longitude: -75.69, country: "Canadá" }],
      },
      prompter: createPrompterStub(["Ottawa", "1"]),
      persist: async () => {
        persisted += 1;
      },
    };
    try {
      await runAddCity(ctx);
      expect(persisted).toBe(0);
      expect(ctx.config.cities).toHaveLength(1);
      expect(cap.output()).toContain("ya está en tu lista.");
    } finally {
      cap.restore();
    }
  });
});

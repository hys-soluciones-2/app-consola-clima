import { afterEach, describe, expect, it, mock } from "bun:test";
import { runGetAllForecasts, runGetForecast } from "../../src/actions/getForecast.ts";
import type { AppContext } from "../../src/types/AppContext.ts";
import type { City } from "../../src/types/City.ts";
import { captureStdout, createPrompterStub } from "../utils/testHelpers.ts";

const realFetch = globalThis.fetch;
const originalNoColor = process.env.NO_COLOR;
const ottawa: City = { id: "1", name: "Ottawa", latitude: 45.41, longitude: -75.69 };
const lima: City = { id: "2", name: "Lima", country: "Perú", latitude: -12.04, longitude: -77.03 };

function stubFetch(body: unknown, status = 200): void {
  globalThis.fetch = mock(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
  if (originalNoColor === undefined) delete process.env.NO_COLOR;
  else process.env.NO_COLOR = originalNoColor;
});

const dailyPayload = {
  daily_units: { temperature_2m_max: "°C", temperature_2m_min: "°C", precipitation_probability_max: "%" },
  daily: {
    time: ["2026-11-18"],
    temperature_2m_max: [12.3],
    temperature_2m_min: [4.1],
    weather_code: [0],
    precipitation_probability_max: [10],
  },
};

describe("acciones de pronóstico", () => {
  it("muestra el pronóstico de una ciudad", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    stubFetch(dailyPayload);
    const ctx: AppContext = {
      config: { version: 1, unit: "celsius", defaultCityId: "1", cities: [ottawa] },
      prompter: createPrompterStub([]),
      persist: async () => {},
    };
    try {
      await runGetForecast(ctx, ottawa);
      const out = cap.output();
      expect(out).toContain("Ottawa");
      expect(out).toContain("Pronóstico 7 días");
      expect(out).toContain("12.3 / 4.1 °C");
    } finally {
      cap.restore();
    }
  });

  it("reporta errores de API sin lanzar", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    stubFetch({}, 200);
    const ctx: AppContext = {
      config: { version: 1, unit: "celsius", defaultCityId: "1", cities: [ottawa] },
      prompter: createPrompterStub([]),
      persist: async () => {},
    };
    try {
      await runGetForecast(ctx, ottawa);
      expect(cap.output()).toContain("pronóstico diario");
    } finally {
      cap.restore();
    }
  });

  it("avisa si no hay ciudades para pronóstico global", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    const ctx: AppContext = {
      config: { version: 1, unit: "celsius", defaultCityId: null, cities: [] },
      prompter: createPrompterStub([]),
      persist: async () => {},
    };
    try {
      await runGetAllForecasts(ctx);
      expect(cap.output()).toContain("Todavía no tienes ciudades guardadas. Usa la opción 3.");
    } finally {
      cap.restore();
    }
  });

  it("consulta el pronóstico de todas las ciudades", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    stubFetch(dailyPayload);
    const ctx: AppContext = {
      config: { version: 1, unit: "celsius", defaultCityId: "1", cities: [ottawa, lima] },
      prompter: createPrompterStub([]),
      persist: async () => {},
    };
    try {
      await runGetAllForecasts(ctx);
      const out = cap.output();
      expect(out).toContain("Ottawa");
      expect(out).toContain("Lima, Perú");
    } finally {
      cap.restore();
    }
  });
});

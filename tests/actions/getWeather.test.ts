import { afterEach, describe, expect, it, mock } from "bun:test";
import { runGetAllCitiesWeather, runGetDefaultCityWeather, runGetWeather } from "../../src/actions/getWeather.ts";
import type { AppContext } from "../../src/types/AppContext.ts";
import type { City } from "../../src/types/City.ts";
import { captureStdout, createPrompterStub } from "../utils/testHelpers.ts";

const realFetch = globalThis.fetch;
const originalNoColor = process.env.NO_COLOR;
const ottawa: City = { id: "1", name: "Ottawa", latitude: 45.41, longitude: -75.69 };
const lima: City = { id: "2", name: "Lima", country: "Perú", latitude: -12.04, longitude: -77.03 };

function stubWeatherFetch(body: unknown, status = 200): void {
  globalThis.fetch = mock(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
  if (originalNoColor === undefined) delete process.env.NO_COLOR;
  else process.env.NO_COLOR = originalNoColor;
});

const currentPayload = {
  current_units: { temperature_2m: "°C", wind_speed_10m: "km/h", relative_humidity_2m: "%" },
  current: {
    time: "2026-11-14T23:00",
    temperature_2m: 12.3,
    apparent_temperature: 10.1,
    relative_humidity_2m: 55,
    weather_code: 0,
    wind_speed_10m: 7.2,
  },
};

describe("acciones de clima actual", () => {
  it("muestra el clima de una ciudad", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    stubWeatherFetch(currentPayload);
    const ctx: AppContext = {
      config: { version: 1, unit: "celsius", defaultCityId: "1", cities: [ottawa] },
      prompter: createPrompterStub([]),
      persist: async () => {},
    };
    try {
      await runGetWeather(ctx, ottawa);
      const out = cap.output();
      expect(out).toContain("Ottawa");
      expect(out).toContain("12.3 °C");
      expect(out).toContain("Despejado");
    } finally {
      cap.restore();
    }
  });

  it("reporta errores de API sin lanzar", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    stubWeatherFetch("fallo", 500);
    const ctx: AppContext = {
      config: { version: 1, unit: "celsius", defaultCityId: "1", cities: [ottawa] },
      prompter: createPrompterStub([]),
      persist: async () => {},
    };
    try {
      await runGetWeather(ctx, ottawa);
      expect(cap.output()).toContain("Open-Meteo respondió 500");
    } finally {
      cap.restore();
    }
  });

  it("avisa si no hay ciudad default", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    const ctx: AppContext = {
      config: { version: 1, unit: "celsius", defaultCityId: null, cities: [] },
      prompter: createPrompterStub([]),
      persist: async () => {},
    };
    try {
      await runGetDefaultCityWeather(ctx);
      expect(cap.output()).toContain("No hay ciudad default. Agrega una con la opción 3.");
    } finally {
      cap.restore();
    }
  });

  it("consulta la ciudad default", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    stubWeatherFetch(currentPayload);
    const ctx: AppContext = {
      config: { version: 1, unit: "celsius", defaultCityId: "1", cities: [ottawa] },
      prompter: createPrompterStub([]),
      persist: async () => {},
    };
    try {
      await runGetDefaultCityWeather(ctx);
      expect(cap.output()).toContain("Ottawa");
    } finally {
      cap.restore();
    }
  });

  it("avisa si no hay ciudades para consultar todas", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    const ctx: AppContext = {
      config: { version: 1, unit: "celsius", defaultCityId: null, cities: [] },
      prompter: createPrompterStub([]),
      persist: async () => {},
    };
    try {
      await runGetAllCitiesWeather(ctx);
      expect(cap.output()).toContain("Todavía no tienes ciudades guardadas. Usa la opción 3.");
    } finally {
      cap.restore();
    }
  });

  it("consulta el clima de todas las ciudades", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    stubWeatherFetch(currentPayload);
    const ctx: AppContext = {
      config: { version: 1, unit: "celsius", defaultCityId: "1", cities: [ottawa, lima] },
      prompter: createPrompterStub([]),
      persist: async () => {},
    };
    try {
      await runGetAllCitiesWeather(ctx);
      const out = cap.output();
      expect(out).toContain("Ottawa");
      expect(out).toContain("Lima, Perú");
    } finally {
      cap.restore();
    }
  });
});

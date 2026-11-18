import { describe, expect, it } from "bun:test";
import { describeWeather, formatDailyForecast, formatForecastDate } from "./format.ts";
import type { WeeklyForecast } from "../types/Weather.ts";

delete process.env.FORCE_COLOR;
process.env.NO_COLOR = "1";

function sampleForecast(overrides: Partial<WeeklyForecast> = {}): WeeklyForecast {
  return {
    days: [
      {
        date: "2026-11-18",
        maxTemperature: 12.3,
        minTemperature: 4.1,
        weatherCode: 0,
        precipitationProbability: 10,
      },
      {
        date: "2026-11-19",
        maxTemperature: 9.8,
        minTemperature: 2.2,
        weatherCode: 61,
        precipitationProbability: null,
      },
    ],
    temperatureUnit: "°C",
    precipitationUnit: "%",
    ...overrides,
  };
}

describe("formatForecastDate", () => {
  it("muestra el día de la semana y la fecha sin correr por zona horaria", () => {
    expect(formatForecastDate("2026-11-18T00:00")).toBe("mié 18/11");
  });

  it("devuelve el texto original si no reconoce el formato", () => {
    expect(formatForecastDate("hoy")).toBe("hoy");
  });
});

describe("formatDailyForecast", () => {
  it("describe cada día con temperaturas, condición y probabilidad de lluvia", () => {
    const output = formatDailyForecast(sampleForecast());
    expect(output).toContain("Pronóstico 7 días");
    expect(output).toContain("mié 18/11");
    expect(output).toContain("12.3 / 4.1 °C");
    expect(output).toContain("Despejado");
    expect(output).toContain("lluvia 10%");
    expect(output).toContain("jue 19/11");
    expect(output).toContain("9.8 / 2.2 °C");
    expect(output).toContain("Lluvia ligera");
  });

  it("usa las unidades de la respuesta y omite la lluvia cuando no hay dato", () => {
    const output = formatDailyForecast(sampleForecast({ temperatureUnit: "°F" }));
    expect(output).toContain("12.3 / 4.1 °F");
    const secondDay = output.split("\n").find((line) => line.includes("jue 19/11"));
    expect(secondDay).toBeDefined();
    expect(secondDay).not.toContain("lluvia");
  });

  it("avisa cuando no hay días para mostrar", () => {
    expect(formatDailyForecast(sampleForecast({ days: [] }))).toContain(
      "No hay pronóstico disponible",
    );
  });
});

describe("describeWeather", () => {
  it("usa el texto WMO conocido y un fallback para códigos desconocidos", () => {
    expect(describeWeather(95)).toBe("Tormenta");
    expect(describeWeather(999)).toBe("Condición desconocida");
  });
});

import { afterEach, describe, expect, it } from "bun:test";
import {
  describeWeather,
  formatCity,
  formatCityList,
  formatCurrentWeather,
  formatDailyForecast,
  formatForecastDate,
  formatNumber,
  formatObservedAt,
  formatUnitLabel,
} from "../../src/utils/format.ts";
import type { City } from "../../src/types/City.ts";
import type { CurrentWeather, WeeklyForecast } from "../../src/types/Weather.ts";

const originalNoColor = process.env.NO_COLOR;
const originalForceColor = process.env.FORCE_COLOR;

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

function sampleCurrent(overrides: Partial<CurrentWeather> = {}): CurrentWeather {
  return {
    temperature: 12.34,
    apparentTemperature: 10.06,
    humidity: 55.4,
    weatherCode: 3,
    windSpeed: 7.25,
    temperatureUnit: "°C",
    windUnit: "km/h",
    humidityUnit: "%",
    observedAt: "2026-11-14T23:00",
    ...overrides,
  };
}

afterEach(() => {
  if (originalNoColor === undefined) delete process.env.NO_COLOR;
  else process.env.NO_COLOR = originalNoColor;
  if (originalForceColor === undefined) delete process.env.FORCE_COLOR;
  else process.env.FORCE_COLOR = originalForceColor;
});

delete process.env.FORCE_COLOR;
process.env.NO_COLOR = "1";

describe("describeWeather", () => {
  it("usa el texto WMO conocido y un fallback para códigos desconocidos", () => {
    expect(describeWeather(95)).toBe("Tormenta");
    expect(describeWeather(999)).toBe("Condición desconocida");
  });
});

describe("formatUnitLabel", () => {
  it("formatea las unidades soportadas", () => {
    expect(formatUnitLabel("celsius")).toBe("°C");
    expect(formatUnitLabel("fahrenheit")).toBe("°F");
  });
});

describe("formatNumber", () => {
  it("redondea a un decimal y normaliza -0.0", () => {
    expect(formatNumber(12.34)).toBe("12.3");
    expect(formatNumber(12.36)).toBe("12.4");
    expect(formatNumber(-0.04)).toBe("0.0");
  });
});

describe("formatCity", () => {
  it("compone nombre, admin1 y país evitando repetir nombre", () => {
    const city: City = {
      id: "1",
      name: "Ottawa",
      admin1: "Ontario",
      country: "Canadá",
      latitude: 45.41,
      longitude: -75.69,
    };
    expect(formatCity(city)).toBe("Ottawa, Ontario, Canadá");
    expect(formatCity({ ...city, admin1: "Ottawa" })).toBe("Ottawa, Canadá");
    expect(formatCity({ id: "2", name: "Lima", latitude: 0, longitude: 0 })).toBe("Lima");
  });
});

describe("formatObservedAt", () => {
  it("formatea fecha-hora ISO local esperada y tolera formatos desconocidos", () => {
    expect(formatObservedAt("2026-11-14T23:00")).toBe("14/11 23:00");
    expect(formatObservedAt("2026-11-14T23:00:00Z")).toBe("14/11 23:00");
    expect(formatObservedAt("hoy")).toBe("");
  });
});

describe("formatForecastDate", () => {
  it("muestra el día de la semana y la fecha sin correr por zona horaria", () => {
    expect(formatForecastDate("2026-11-18T00:00")).toBe("mié 18/11");
  });

  it("devuelve el texto original si no reconoce el formato", () => {
    expect(formatForecastDate("hoy")).toBe("hoy");
  });
});

describe("formatCurrentWeather", () => {
  it("incluye temperatura, sensación, condición, detalles y hora observada", () => {
    const output = formatCurrentWeather(sampleCurrent());
    expect(output).toContain("12.3 °C");
    expect(output).toContain("sensación 10.1 °C");
    expect(output).toContain("Nublado");
    expect(output).toContain("Humedad 55%");
    expect(output).toContain("Viento 7.3 km/h");
    expect(output).toContain("Actualizado 14/11 23:00");
  });

  it("omite la marca de actualización cuando no hay fecha reconocible", () => {
    const output = formatCurrentWeather(sampleCurrent({ observedAt: "" }));
    expect(output).not.toContain("Actualizado");
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

describe("formatCityList", () => {
  it("numera las ciudades y marca la predeterminada", () => {
    const cities: City[] = [
      { id: "1", name: "Ottawa", latitude: 1, longitude: 2 },
      { id: "2", name: "Lima", country: "Perú", latitude: 3, longitude: 4 },
    ];
    const output = formatCityList(cities, "2");
    expect(output).toContain("  1. Ottawa");
    expect(output).toContain("  2. Lima, Perú  (default)");
    expect(output).not.toContain("1. Ottawa  (default)");
  });
});

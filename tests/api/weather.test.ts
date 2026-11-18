import { afterEach, describe, expect, it, mock } from "bun:test";
import type { City } from "../../src/types/City.ts";
import { WeatherError } from "../../src/api/client.ts";
import { fetchCurrentWeather, fetchWeeklyForecast } from "../../src/api/weather.ts";

const realFetch = globalThis.fetch;
const city: City = { id: "1", name: "Ottawa", latitude: 45.41, longitude: -75.69 };
let requestedUrl = new URL("https://example.com");

const dailyPayload = {
  daily_units: {
    temperature_2m_max: "°C",
    temperature_2m_min: "°C",
    precipitation_probability_max: "%",
  },
  daily: {
    time: ["2026-11-18", "2026-11-19"],
    temperature_2m_max: [12.3, 9.8],
    temperature_2m_min: [4.1, 2.2],
    weather_code: [0, 61],
    precipitation_probability_max: [10, 70],
  },
};

const currentPayload = {
  current_units: {
    temperature_2m: "°C",
    wind_speed_10m: "km/h",
    relative_humidity_2m: "%",
  },
  current: {
    time: "2026-11-14T23:00",
    temperature_2m: 12.3,
    apparent_temperature: 10.1,
    relative_humidity_2m: 55,
    weather_code: 3,
    wind_speed_10m: 7.2,
  },
};

type FetchInput = Parameters<typeof fetch>[0];

function stubFetch(body: string, status: number = 200): void {
  globalThis.fetch = mock(async (input: FetchInput) => {
    requestedUrl = new URL(
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
    );
    return new Response(body, { status, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
}

async function expectWeatherError(promise: Promise<unknown>, message: string): Promise<void> {
  try {
    await promise;
    throw new Error("Debería haber lanzado WeatherError");
  } catch (error) {
    expect(error).toBeInstanceOf(WeatherError);
    expect((error as Error).message).toContain(message);
  }
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("fetchCurrentWeather", () => {
  it("pide clima actual con zona automática y sin parámetros de unidad en Celsius", async () => {
    stubFetch(JSON.stringify(currentPayload));
    await fetchCurrentWeather(city, "celsius");

    expect(requestedUrl.pathname).toBe("/v1/forecast");
    expect(requestedUrl.searchParams.get("latitude")).toBe("45.41");
    expect(requestedUrl.searchParams.get("longitude")).toBe("-75.69");
    expect(requestedUrl.searchParams.get("current")).toBe(
      "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
    );
    expect(requestedUrl.searchParams.get("timezone")).toBe("auto");
    expect(requestedUrl.searchParams.get("temperature_unit")).toBeNull();
    expect(requestedUrl.searchParams.get("wind_speed_unit")).toBeNull();
  });

  it("pide Fahrenheit y mph cuando la unidad configurada es fahrenheit", async () => {
    stubFetch(JSON.stringify(currentPayload));
    await fetchCurrentWeather(city, "fahrenheit");

    expect(requestedUrl.searchParams.get("temperature_unit")).toBe("fahrenheit");
    expect(requestedUrl.searchParams.get("wind_speed_unit")).toBe("mph");
  });

  it("normaliza la respuesta actual y usa unidades/fallbacks", async () => {
    stubFetch(
      JSON.stringify({
        current_units: { temperature_2m: "°F", wind_speed_10m: "mph", relative_humidity_2m: "%" },
        current: { time: "2026-11-14T23:00", temperature_2m: 54.1, weather_code: 2 },
      }),
    );
    const result = await fetchCurrentWeather(city, "fahrenheit");

    expect(result).toEqual({
      temperature: 54.1,
      apparentTemperature: 54.1,
      humidity: 0,
      weatherCode: 2,
      windSpeed: 0,
      temperatureUnit: "°F",
      windUnit: "mph",
      humidityUnit: "%",
      observedAt: "2026-11-14T23:00",
    });
  });

  it("usa unidades por defecto cuando faltan metadatos", async () => {
    stubFetch(JSON.stringify({ current: { temperature_2m: 1 } }));
    const celsius = await fetchCurrentWeather(city, "celsius");
    expect(celsius.temperatureUnit).toBe("°C");
    expect(celsius.windUnit).toBe("km/h");
    expect(celsius.observedAt).toBe("");

    stubFetch(JSON.stringify({ current: { temperature_2m: 33.8 } }));
    const fahrenheit = await fetchCurrentWeather(city, "fahrenheit");
    expect(fahrenheit.temperatureUnit).toBe("°F");
    expect(fahrenheit.windUnit).toBe("mp/h");
  });

  it("reporta WeatherError si no hay temperatura actual", async () => {
    stubFetch(JSON.stringify({ current: { weather_code: 1 } }));
    await expectWeatherError(fetchCurrentWeather(city, "celsius"), "temperatura actual");
  });

  it("propaga errores HTTP y JSON inválido", async () => {
    stubFetch("falló", 503);
    await expectWeatherError(fetchCurrentWeather(city, "celsius"), "Open-Meteo respondió 503");
    stubFetch("no es json");
    await expectWeatherError(fetchCurrentWeather(city, "celsius"), "no es un JSON válido");
  });
});

describe("fetchWeeklyForecast", () => {
  it("pide 7 días con zona horaria automática y sin parámetros de unidad en Celsius", async () => {
    stubFetch(JSON.stringify(dailyPayload));
    await fetchWeeklyForecast(city, "celsius");

    expect(requestedUrl.pathname).toBe("/v1/forecast");
    expect(requestedUrl.searchParams.get("latitude")).toBe("45.41");
    expect(requestedUrl.searchParams.get("longitude")).toBe("-75.69");
    expect(requestedUrl.searchParams.get("daily")).toBe(
      "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max",
    );
    expect(requestedUrl.searchParams.get("forecast_days")).toBe("7");
    expect(requestedUrl.searchParams.get("timezone")).toBe("auto");
    expect(requestedUrl.searchParams.get("temperature_unit")).toBeNull();
  });

  it("pide Fahrenheit y mph cuando la unidad configurada es fahrenheit", async () => {
    stubFetch(JSON.stringify({ daily: dailyPayload.daily }));
    const result = await fetchWeeklyForecast(city, "fahrenheit");

    expect(requestedUrl.searchParams.get("temperature_unit")).toBe("fahrenheit");
    expect(requestedUrl.searchParams.get("wind_speed_unit")).toBe("mph");
    expect(result.temperatureUnit).toBe("°F");
    expect(result.precipitationUnit).toBe("%");
  });

  it("convierte la respuesta diaria en días con unidades y probabilidad de lluvia", async () => {
    stubFetch(JSON.stringify(dailyPayload));
    const result = await fetchWeeklyForecast(city, "celsius");

    expect(result.temperatureUnit).toBe("°C");
    expect(result.precipitationUnit).toBe("%");
    expect(result.days).toEqual([
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
        precipitationProbability: 70,
      },
    ]);
  });

  it("no devuelve más de 7 días aunque el API mande más", async () => {
    const times = Array.from({ length: 9 }, (_, index) => `2026-11-${10 + index}`);
    const values = Array.from({ length: 9 }, (_, index) => 10 + index);
    stubFetch(
      JSON.stringify({
        ...dailyPayload,
        daily: {
          time: times,
          temperature_2m_max: values,
          temperature_2m_min: values.map((value) => value - 8),
          weather_code: values.map(() => 0),
          precipitation_probability_max: values.map(() => 10),
        },
      }),
    );
    const result = await fetchWeeklyForecast(city, "celsius");

    expect(result.days).toHaveLength(7);
    expect(result.days[6]?.date).toBe("2026-11-16");
  });

  it("rellena datos opcionales ausentes y descarta días sin temperaturas", async () => {
    stubFetch(
      JSON.stringify({
        daily: {
          time: ["2026-11-18", "2026-11-19"],
          temperature_2m_max: [12.3],
          temperature_2m_min: [4.1],
        },
      }),
    );
    const result = await fetchWeeklyForecast(city, "celsius");

    expect(result.days).toEqual([
      {
        date: "2026-11-18",
        maxTemperature: 12.3,
        minTemperature: 4.1,
        weatherCode: 0,
        precipitationProbability: null,
      },
    ]);
  });

  it("reporta WeatherError ante una respuesta HTTP fallida", async () => {
    stubFetch("falló", 500);
    await expectWeatherError(fetchWeeklyForecast(city, "celsius"), "Open-Meteo respondió 500");
  });

  it("reporta WeatherError si la respuesta no es JSON", async () => {
    stubFetch("no es json");
    await expectWeatherError(fetchWeeklyForecast(city, "celsius"), "no es un JSON válido");
  });

  it("reporta WeatherError si no hay datos diarios", async () => {
    stubFetch(JSON.stringify({}));
    await expectWeatherError(fetchWeeklyForecast(city, "celsius"), "pronóstico diario");
  });

  it("reporta WeatherError si ningún día tiene temperaturas", async () => {
    stubFetch(JSON.stringify({ daily: { time: ["2026-11-18"] } }));
    await expectWeatherError(fetchWeeklyForecast(city, "celsius"), "no devolvió temperaturas");
  });
});

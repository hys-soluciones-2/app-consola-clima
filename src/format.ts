import { paint } from "./color.ts";
import type { City, Unit } from "./config.ts";
import type { CurrentWeather, WeeklyForecast } from "./openmeteo.ts";

/** Códigos WMO que devuelve Open-Meteo. */
const WEATHER_CODES: Record<number, string> = {
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Niebla",
  48: "Niebla con escarcha",
  51: "Llovizna ligera",
  53: "Llovizna moderada",
  55: "Llovizna densa",
  56: "Llovizna helada ligera",
  57: "Llovizna helada densa",
  61: "Lluvia ligera",
  63: "Lluvia moderada",
  65: "Lluvia fuerte",
  66: "Lluvia helada ligera",
  67: "Lluvia helada fuerte",
  71: "Nieve ligera",
  73: "Nieve moderada",
  75: "Nieve fuerte",
  77: "Granos de nieve",
  80: "Chubascos ligeros",
  81: "Chubascos moderados",
  82: "Chubascos fuertes",
  85: "Chubascos de nieve ligeros",
  86: "Chubascos de nieve fuertes",
  95: "Tormenta",
  96: "Tormenta con granizo ligero",
  99: "Tormenta con granizo fuerte",
};

export function describeWeather(code: number): string {
  return WEATHER_CODES[code] ?? "Condición desconocida";
}

export function formatUnitLabel(unit: Unit): string {
  return unit === "fahrenheit" ? "°F" : "°C";
}

export function formatNumber(value: number): string {
  const text = value.toFixed(1);
  return text === "-0.0" ? "0.0" : text;
}

export function formatCity(city: City): string {
  const parts = [city.name];
  if (city.admin1 && city.admin1 !== city.name) parts.push(city.admin1);
  if (city.country) parts.push(city.country);
  return parts.join(", ");
}

/** "2026-11-14T23:00" -> "14/11 23:00" */
export function formatObservedAt(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!match) return "";
  const [, , month, day, hour, minute] = match;
  return `${day}/${month} ${hour}:${minute}`;
}

export function formatCurrentWeather(weather: CurrentWeather): string {
  const temperature = paint(
    `${formatNumber(weather.temperature)} ${weather.temperatureUnit}`,
    "yellow",
  );
  const feels = paint(
    `${formatNumber(weather.apparentTemperature)} ${weather.temperatureUnit}`,
    "yellow",
  );
  const details = [
    `Humedad ${Math.round(weather.humidity)}${weather.humidityUnit}`,
    `Viento ${formatNumber(weather.windSpeed)} ${weather.windUnit}`,
  ];
  const observed = formatObservedAt(weather.observedAt);
  if (observed) details.push(`Actualizado ${observed}`);

  return [
    `  ${temperature} (sensación ${feels}) · ${describeWeather(weather.weatherCode)}`,
    `  ${details.join(" · ")}`,
  ].join("\n");
}

const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"] as const;

/** "2026-11-18" -> "mié 18/11" (se parsea como fecha local para no correr el día). */
export function formatForecastDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  if (!year || !month || !day) return iso;

  const weekday = WEEKDAYS[new Date(Number(year), Number(month) - 1, Number(day)).getDay()];
  return `${weekday ? `${weekday} ` : ""}${day}/${month}`;
}

export function formatDailyForecast(forecast: WeeklyForecast): string {
  if (forecast.days.length === 0) {
    return `  ${paint("No hay pronóstico disponible.", "red")}`;
  }

  const lines = forecast.days.map((day) => {
    const temperature = `${formatNumber(day.maxTemperature)} / ${formatNumber(day.minTemperature)} ${forecast.temperatureUnit}`;
    const details = [describeWeather(day.weatherCode)];
    if (day.precipitationProbability !== null) {
      details.push(
        `lluvia ${Math.round(day.precipitationProbability)}${forecast.precipitationUnit}`,
      );
    }
    return `  ${formatForecastDate(day.date).padEnd(10)}${paint(temperature.padEnd(18), "yellow")}${details.join(" · ")}`;
  });

  return [`  ${paint("Pronóstico 7 días", "cyan")}`, ...lines].join("\n");
}

export function formatCityList(cities: City[], defaultCityId: string | null): string {
  return cities
    .map((city, index) => {
      const suffix = city.id === defaultCityId ? "  (default)" : "";
      return `  ${index + 1}. ${formatCity(city)}${suffix}`;
    })
    .join("\n");
}

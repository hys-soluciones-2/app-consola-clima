import { fetchCurrentWeather } from "../api/weather.ts";
import { blank, fail, line, reportError } from "../presentation/output.ts";
import { getDefaultCity } from "../storage/citiesStorage.ts";
import type { AppContext } from "../types/AppContext.ts";
import type { City } from "../types/City.ts";
import { formatCity, formatCurrentWeather } from "../utils/format.ts";

/** Obtiene y muestra el clima actual de una ciudad. */
export async function runGetWeather(ctx: AppContext, city: City): Promise<void> {
  blank();
  line(formatCity(city));
  try {
    const weather = await fetchCurrentWeather(city, ctx.config.unit);
    line(formatCurrentWeather(weather));
  } catch (error) {
    reportError(error);
  }
}

export async function runGetDefaultCityWeather(ctx: AppContext): Promise<void> {
  const city = getDefaultCity(ctx.config);
  if (!city) {
    fail("No hay ciudad default. Agrega una con la opción 3.");
    return;
  }
  await runGetWeather(ctx, city);
}

export async function runGetAllCitiesWeather(ctx: AppContext): Promise<void> {
  if (ctx.config.cities.length === 0) {
    fail("Todavía no tienes ciudades guardadas. Usa la opción 3.");
    return;
  }
  for (const city of ctx.config.cities) {
    await runGetWeather(ctx, city);
  }
}

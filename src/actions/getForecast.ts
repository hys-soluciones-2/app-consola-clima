import { fetchWeeklyForecast } from "../api/weather.ts";
import { blank, fail, line, reportError } from "../presentation/output.ts";
import type { AppContext } from "../types/AppContext.ts";
import type { City } from "../types/City.ts";
import { formatCity, formatDailyForecast } from "../utils/format.ts";

/** Obtiene y muestra el pronóstico a 7 días de una ciudad. */
export async function runGetForecast(ctx: AppContext, city: City): Promise<void> {
  blank();
  line(formatCity(city));
  try {
    const forecast = await fetchWeeklyForecast(city, ctx.config.unit);
    line(formatDailyForecast(forecast));
  } catch (error) {
    reportError(error);
  }
}

export async function runGetAllForecasts(ctx: AppContext): Promise<void> {
  if (ctx.config.cities.length === 0) {
    fail("Todavía no tienes ciudades guardadas. Usa la opción 3.");
    return;
  }
  for (const city of ctx.config.cities) {
    await runGetForecast(ctx, city);
  }
}

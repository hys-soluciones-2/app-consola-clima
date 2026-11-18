import { blank, fail, line } from "../presentation/output.ts";
import type { AppContext } from "../types/AppContext.ts";
import { formatCityList } from "../utils/format.ts";

/** Muestra el listado numerado de ciudades guardadas, marcando la default. */
export function runListCities(ctx: AppContext): void {
  if (ctx.config.cities.length === 0) {
    fail("Todavía no tienes ciudades guardadas.");
    return;
  }
  blank();
  line(formatCityList(ctx.config.cities, ctx.config.defaultCityId));
}

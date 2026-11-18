import { runAddCity } from "../actions/addCity.ts";
import { runGetAllCitiesWeather, runGetDefaultCityWeather } from "../actions/getWeather.ts";
import { runGetAllForecasts } from "../actions/getForecast.ts";
import { runRemoveCity } from "../actions/removeCity.ts";
import { runSetDefaultCity } from "../actions/setDefaultCity.ts";
import { runToggleUnit } from "../actions/toggleUnit.ts";
import type { AppContext } from "../types/AppContext.ts";
import type { Config } from "../types/Config.ts";
import { isMenuOption } from "../types/MenuOption.ts";
import { paint } from "../utils/colors.ts";
import { formatUnitLabel } from "../utils/format.ts";
import { blank, fail, line } from "./output.ts";

const WIDTH = 40;
const LINE = "═".repeat(WIDTH);

function center(text: string): string {
  const padding = Math.max(0, Math.floor((WIDTH - text.length) / 2));
  return `${" ".repeat(padding)}${text}`;
}

export function renderMenu(config: Config): string {
  return [
    LINE,
    center("WEATHER CLI"),
    LINE,
    "  1. Clima de ciudad default",
    `  2. Clima de todas las ciudades (${config.cities.length})`,
    "  3. Buscar y agregar ciudad",
    "  4. Eliminar ciudad",
    "  5. Establecer ciudad default",
    "  6. Pronóstico 7 días (todas las ciudades)",
    `  8. Ajustes (${formatUnitLabel(config.unit)})`,
    "  9. Salir",
    LINE,
  ].join("\n");
}

/** Renderiza el menú y despacha la opción elegida hasta que se cierre la entrada. */
export async function runMenu(ctx: AppContext): Promise<void> {
  for (;;) {
    blank();
    line(paint(renderMenu(ctx.config), "cyan"));
    const choice = await ctx.prompter.ask("  Selecciona una opción: ");

    if (choice === null) break;
    if (choice.length === 0) continue;
    if (!isMenuOption(choice)) {
      fail("Opción no válida.");
      continue;
    }

    switch (choice) {
      case "1":
        await runGetDefaultCityWeather(ctx);
        break;
      case "2":
        await runGetAllCitiesWeather(ctx);
        break;
      case "3":
        await runAddCity(ctx);
        break;
      case "4":
        await runRemoveCity(ctx);
        break;
      case "5":
        await runSetDefaultCity(ctx);
        break;
      case "6":
        await runGetAllForecasts(ctx);
        break;
      case "8":
        await runToggleUnit(ctx);
        break;
      case "9":
        line("  ¡Hasta luego!");
        return;
    }
  }
}

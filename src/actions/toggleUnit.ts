import { success } from "../presentation/output.ts";
import { toggleUnit } from "../storage/settingsStorage.ts";
import type { AppContext } from "../types/AppContext.ts";
import { formatUnitLabel } from "../utils/format.ts";

/** Alterna entre Celsius y Fahrenheit y guarda la preferencia. */
export async function runToggleUnit(ctx: AppContext): Promise<void> {
  ctx.config = toggleUnit(ctx.config);
  await ctx.persist();
  success(`Unidad establecida en ${formatUnitLabel(ctx.config.unit)}.`);
}

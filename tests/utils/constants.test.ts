import { describe, expect, it } from "bun:test";
import { homedir } from "node:os";
import { join } from "node:path";
import { CONFIG_DIR, CONFIG_PATH, WEATHER_CODES, WEEKDAYS } from "../../src/utils/constants.ts";

describe("constants", () => {
  it("define rutas de configuración bajo el home del usuario", () => {
    expect(CONFIG_DIR).toBe(join(homedir(), ".weather-cli"));
    expect(CONFIG_PATH).toBe(join(homedir(), ".weather-cli", "config.json"));
  });

  it("incluye códigos WMO representativos y días de semana en español", () => {
    expect(WEATHER_CODES[0]).toBe("Despejado");
    expect(WEATHER_CODES[61]).toBe("Lluvia ligera");
    expect(WEATHER_CODES[95]).toBe("Tormenta");
    expect(WEATHER_CODES[999]).toBeUndefined();
    expect(WEEKDAYS).toEqual(["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]);
  });
});

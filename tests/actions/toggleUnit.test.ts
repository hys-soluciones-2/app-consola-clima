import { afterEach, describe, expect, it } from "bun:test";
import { runToggleUnit } from "../../src/actions/toggleUnit.ts";
import type { AppContext } from "../../src/types/AppContext.ts";
import type { Config } from "../../src/types/Config.ts";
import { captureStdout, createPrompterStub } from "../utils/testHelpers.ts";

const originalNoColor = process.env.NO_COLOR;

afterEach(() => {
  if (originalNoColor === undefined) delete process.env.NO_COLOR;
  else process.env.NO_COLOR = originalNoColor;
});

describe("runToggleUnit", () => {
  it("alterna unidad, persiste y muestra mensaje", async () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    let persisted = 0;
    const config: Config = { version: 1, unit: "celsius", defaultCityId: null, cities: [] };
    const ctx: AppContext = {
      config,
      prompter: createPrompterStub([]),
      persist: async () => {
        persisted += 1;
      },
    };
    try {
      await runToggleUnit(ctx);
      expect(ctx.config.unit).toBe("fahrenheit");
      expect(persisted).toBe(1);
      expect(cap.output()).toContain("Unidad establecida en °F.");
      await runToggleUnit(ctx);
      expect(ctx.config.unit).toBe("celsius");
      expect(persisted).toBe(2);
      expect(cap.output()).toContain("Unidad establecida en °C.");
    } finally {
      cap.restore();
    }
  });
});

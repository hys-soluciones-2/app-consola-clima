import { afterEach, describe, expect, it } from "bun:test";
import { runListCities } from "../../src/actions/listCities.ts";
import type { AppContext } from "../../src/types/AppContext.ts";
import { captureStdout, createPrompterStub } from "../utils/testHelpers.ts";

const originalNoColor = process.env.NO_COLOR;

afterEach(() => {
  if (originalNoColor === undefined) delete process.env.NO_COLOR;
  else process.env.NO_COLOR = originalNoColor;
});

describe("runListCities", () => {
  it("avisa cuando no hay ciudades", () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    const ctx: AppContext = {
      config: { version: 1, unit: "celsius", defaultCityId: null, cities: [] },
      prompter: createPrompterStub([]),
      persist: async () => {},
    };
    try {
      runListCities(ctx);
      expect(cap.output()).toContain("Todavía no tienes ciudades guardadas.");
    } finally {
      cap.restore();
    }
  });

  it("lista ciudades numeradas y marca la default", () => {
    process.env.NO_COLOR = "1";
    const cap = captureStdout();
    const ctx: AppContext = {
      config: {
        version: 1,
        unit: "celsius",
        defaultCityId: "2",
        cities: [
          { id: "1", name: "Ottawa", latitude: 1, longitude: 2 },
          { id: "2", name: "Lima", country: "Perú", latitude: 3, longitude: 4 },
        ],
      },
      prompter: createPrompterStub([]),
      persist: async () => {},
    };
    try {
      runListCities(ctx);
      const out = cap.output();
      expect(out).toContain("  1. Ottawa");
      expect(out).toContain("  2. Lima, Perú  (default)");
    } finally {
      cap.restore();
    }
  });
});

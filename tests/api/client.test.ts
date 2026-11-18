import { afterEach, describe, expect, it, mock } from "bun:test";
import { requestJson, WeatherError } from "../../src/api/client.ts";

const realFetch = globalThis.fetch;
const url = new URL("https://example.com/data");

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("WeatherError", () => {
  it("es una instancia de Error con nombre propio", () => {
    const err = new WeatherError("x");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("WeatherError");
    expect(err.message).toBe("x");
  });
});

describe("requestJson", () => {
  it("devuelve el JSON parseado en respuestas exitosas", async () => {
    globalThis.fetch = mock(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })) as unknown as typeof fetch;
    await expect(requestJson<{ ok: boolean }>(url)).resolves.toEqual({ ok: true });
  });

  it("lanza WeatherError ante respuestas HTTP no exitosas", async () => {
    globalThis.fetch = mock(async () => new Response("nope", { status: 404, statusText: "Not Found" })) as unknown as typeof fetch;
    try {
      await requestJson(url);
      throw new Error("debió lanzar");
    } catch (error) {
      expect(error).toBeInstanceOf(WeatherError);
      expect((error as Error).message).toContain("Open-Meteo respondió 404");
    }
  });

  it("lanza WeatherError si el cuerpo no es JSON válido", async () => {
    globalThis.fetch = mock(async () => new Response("no-json", { status: 200 })) as unknown as typeof fetch;
    await expect(requestJson(url)).rejects.toThrow("no es un JSON válido");
  });

  it("lanza WeatherError ante fallos de red", async () => {
    globalThis.fetch = mock(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    try {
      await requestJson(url);
      throw new Error("debió lanzar");
    } catch (error) {
      expect(error).toBeInstanceOf(WeatherError);
      expect((error as Error).message).toContain("No se pudo conectar con Open-Meteo");
      expect((error as Error).message).toContain("network down");
    }
  });
});

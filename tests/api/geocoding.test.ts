import { afterEach, describe, expect, it, mock } from "bun:test";
import { WeatherError } from "../../src/api/client.ts";
import { searchCities } from "../../src/api/geocoding.ts";

const realFetch = globalThis.fetch;
let requestedUrl = new URL("https://example.com");

type FetchInput = Parameters<typeof fetch>[0];

function stubFetch(body: string, status = 200): void {
  globalThis.fetch = mock(async (input: FetchInput) => {
    requestedUrl = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    return new Response(body, { status, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("searchCities", () => {
  it("rechaza consultas vacías o solo espacios", async () => {
    await expect(searchCities("")).rejects.toBeInstanceOf(WeatherError);
    await expect(searchCities("   ")).rejects.toThrow("Escribe el nombre de una ciudad");
  });

  it("construye la URL de búsqueda y mapea resultados", async () => {
    stubFetch(
      JSON.stringify({
        results: [
          { id: 123, name: "Ottawa", latitude: 45.41, longitude: -75.69, admin1: "Ontario", country: "Canadá" },
          { name: "Springfield", latitude: 1, longitude: 2 },
        ],
      }),
    );

    const cities = await searchCities("  Ottawa  ", 3);
    expect(requestedUrl.origin + requestedUrl.pathname).toBe("https://geocoding-api.open-meteo.com/v1/search");
    expect(requestedUrl.searchParams.get("name")).toBe("Ottawa");
    expect(requestedUrl.searchParams.get("count")).toBe("3");
    expect(requestedUrl.searchParams.get("language")).toBe("es");
    expect(requestedUrl.searchParams.get("format")).toBe("json");

    expect(cities).toEqual([
      { id: "123", name: "Ottawa", latitude: 45.41, longitude: -75.69, admin1: "Ontario", country: "Canadá" },
      { id: "springfield-1-2", name: "Springfield", latitude: 1, longitude: 2 },
    ]);
  });

  it("devuelve arreglo vacío cuando no hay resultados", async () => {
    stubFetch(JSON.stringify({}));
    await expect(searchCities("Atlantis")).resolves.toEqual([]);
    stubFetch(JSON.stringify({ results: [] }));
    await expect(searchCities("Atlantis")).resolves.toEqual([]);
  });

  it("propaga errores HTTP como WeatherError", async () => {
    stubFetch("fail", 500);
    await expect(searchCities("Lima")).rejects.toThrow("Open-Meteo respondió 500");
  });
});

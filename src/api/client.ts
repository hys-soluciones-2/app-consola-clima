const REQUEST_TIMEOUT_MS = 10_000;

/** Error previsto (red, HTTP, datos faltantes) que se muestra al usuario. */
export class WeatherError extends Error {
  override name = "WeatherError";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function requestJson<T>(url: URL): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (error) {
    throw new WeatherError(`No se pudo conectar con Open-Meteo: ${errorMessage(error)}`);
  }

  if (!response.ok) {
    throw new WeatherError(`Open-Meteo respondió ${response.status} ${response.statusText}`.trim());
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new WeatherError("La respuesta de Open-Meteo no es un JSON válido");
  }
}

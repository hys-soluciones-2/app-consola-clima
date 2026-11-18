/** Clima actual devuelto por Open-Meteo (ya normalizado). */
export type CurrentWeather = {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  weatherCode: number;
  windSpeed: number;
  temperatureUnit: string;
  windUnit: string;
  humidityUnit: string;
  observedAt: string;
};

export type ForecastDay = {
  date: string;
  maxTemperature: number;
  minTemperature: number;
  weatherCode: number;
  precipitationProbability: number | null;
};

export type WeeklyForecast = {
  days: ForecastDay[];
  temperatureUnit: string;
  precipitationUnit: string;
};

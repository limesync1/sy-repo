import { describe, it, expect } from "vitest";
import { averageWeather, parseRouteForecast } from "./useRouteWeather";
import type { WeatherDay } from "./useWeather";
const day = (temp: number, code = 0): WeatherDay => ({ date: "2026-10-08", tempMax: temp, tempMin: temp - 5, weatherCode: code, precipitationMm: 2, precipitationProbability: 40, precipitationHours: 1, windSpeedMax: 4, windGustMax: 6, sunrise: null, sunset: null });
describe("route weather", () => {
  it("does not invent weather without locations", () => expect(averageWeather([])).toBeNull());
  it("averages stop measurements without adding rainfall", () => { const w = averageWeather([day(10), day(20)]); expect(w?.tempMax).toBe(15); expect(w?.precipitationMm).toBe(2); });
  it("uses the prevalent condition, not a meaningless average WMO code", () => expect(averageWeather([day(10, 61), day(10, 0), day(10, 61)])?.weatherCode).toBe(61));
  it("keeps available forecasts when the last provider day has null values", () => {
    const response = Object.fromEntries(["weather_code", "temperature_2m_max", "temperature_2m_min", "precipitation_sum", "precipitation_probability_max", "precipitation_hours", "wind_speed_10m_max", "wind_gusts_10m_max"].map(key => [key, [0, null]]));
    expect(parseRouteForecast({ ...response, time: ["2026-10-08", "2026-10-09"] })).toHaveLength(1);
    expect(parseRouteForecast({ ...response, time: ["2026-10-08", "2026-10-09"] })[0].tempMax).toBe(0);
  });
  it("reports malformed or entirely missing forecasts instead of inventing zeros", () => {
    expect(() => parseRouteForecast({})).toThrow("mangler");
    expect(() => parseRouteForecast({ time: ["2026-10-08"] })).toThrow("ufuldstændig");
  });
});
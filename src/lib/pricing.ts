/**
 * Pricing and Sunset utilities for booking surcharge calculations.
 * Region: Central Europe / Pardubice, CZ coordinates.
 */

/**
 * Calculates the day of the year (1-366) for a given Date,
 * assuming the UTC components of the Date match Prague local time.
 */
export function getDayOfYear(date: Date): number {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Calculates the astronomical sunset decimal hour (local Prague/Pardubice time)
 * for a given day of the year.
 */
export function getSunsetHour(dayOfYear: number): number {
  // Pardubice, CZ: lat ~50N. Sunset ranges from ~15.95 (3:57 PM CET) to ~21.25 (9:15 PM CEST)
  return 18.6 + 2.65 * Math.sin((2 * Math.PI * (dayOfYear - 80)) / 365);
}

/**
 * Calculates the astronomical sunrise decimal hour (local Prague/Pardubice time)
 * for a given day of the year.
 */
export function getSunriseHour(dayOfYear: number): number {
  // Sunrise ranges from ~4.3 (4:18 AM CEST) to ~7.7 (7:42 AM CET)
  return 6.0 - 1.7 * Math.sin((2 * Math.PI * (dayOfYear - 80)) / 365);
}

/**
 * Calculates the lighting surcharge for a booking slot based on a flat hourly rate.
 * The surcharge starts offsetMinutes before sunset and ends at sunrise.
 * Timeframes assume Prague local time values are stored/provided as UTC values.
 */
export function calculateLightingSurcharge(
  reservedFrom: Date,
  reservedTo: Date,
  flatRate: number,
  offsetMinutes: number = 60
): number {
  if (flatRate <= 0) return 0;

  let totalSurchargeHours = 0;
  const stepMs = 5 * 60 * 1000; // 5-minute evaluation steps
  const stepHours = 5 / 60;

  let currentMs = reservedFrom.getTime();
  const endMs = reservedTo.getTime();

  while (currentMs < endMs) {
    // Evaluate at the midpoint of each 5-minute step
    const currentStepDate = new Date(currentMs + stepMs / 2);
    const dayOfYear = getDayOfYear(currentStepDate);

    const sunset = getSunsetHour(dayOfYear);
    const surchargeStartHour = sunset - (offsetMinutes / 60); // dynamic offset relative to sunset
    const sunrise = getSunriseHour(dayOfYear);

    // Get the hour of day in local Prague time (which is represented directly as UTC)
    const hourOfDay = currentStepDate.getUTCHours() + currentStepDate.getUTCMinutes() / 60;

    // Surcharge applies if it's before sunrise or after the surcharge start hour
    if (hourOfDay < sunrise || hourOfDay >= surchargeStartHour) {
      totalSurchargeHours += stepHours;
    }

    currentMs += stepMs;
  }

  // Round to 2 decimals
  return Math.round((totalSurchargeHours * flatRate + Number.EPSILON) * 100) / 100;
}

/**
 * Simulates temperature for Central Europe (Pardubice, CZ) based on the month and hour.
 * Provides a highly realistic fallback when weather API is offline or rate-limited.
 */
export function getMockTemperature(date: Date): number {
  const month = date.getUTCMonth(); // 0-11
  // Prague average temperatures: Jan (-1), Feb (0), Mar (4), Apr (9), May (14), Jun (17), Jul (19), Aug (18), Sep (14), Oct (9), Nov (4), Dec (0)
  const monthlyAverages = [-1, 0, 4, 9, 14, 17, 19, 18, 14, 9, 4, 0];
  const baseTemp = monthlyAverages[month];

  // Daily cycle: coldest around 5 AM, warmest around 3 PM (15:00)
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60;
  const diurnalVariation = 4 * Math.sin((2 * Math.PI * (hour - 9)) / 24);

  return baseTemp + diurnalVariation;
}

/**
 * Resolves a city name to latitude and longitude using Open-Meteo Geocoding API.
 * Falls back to Prague/Pardubice CZ coordinates if geocoding fails.
 */
export async function getCoordinatesForCity(city: string): Promise<{ lat: number; lon: number }> {
  if (!city || !city.trim()) {
    return { lat: 50.0386, lon: 15.7792 };
  }
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city.trim())}&count=1&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return {
          lat: data.results[0].latitude,
          lon: data.results[0].longitude
        };
      }
    }
  } catch (err) {
    console.warn("Geocoding lookup failed for city:", city, err);
  }
  return { lat: 50.0386, lon: 15.7792 };
}

/**
 * Fetches temperature for a given date and time in Prague/Pardubice CZ (or custom location) from Open-Meteo API.
 * Falls back to mock temperature model on failure or timeout.
 */
export async function getTemperatureForDateTime(date: Date, location: string = ""): Promise<number> {
  try {
    const coords = await getCoordinatesForCity(location);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&hourly=temperature_2m&timezone=Europe/Prague`;
    const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) throw new Error(`Weather API error: ${res.status}`);

    const data = await res.json();
    if (!data.hourly || !Array.isArray(data.hourly.time) || !Array.isArray(data.hourly.temperature_2m)) {
      throw new Error("Invalid response format from weather API");
    }

    // Target format in local time: "YYYY-MM-DDTHH:00"
    const targetPrefix = date.toISOString().slice(0, 13); // e.g. "2026-06-26T14"
    const times: string[] = data.hourly.time;
    const temps: number[] = data.hourly.temperature_2m;

    const index = times.findIndex((t) => t.startsWith(targetPrefix));
    if (index !== -1) {
      return temps[index];
    }
  } catch (err) {
    console.warn("Failed to fetch temperature from API, using fallback model:", err);
  }
  return getMockTemperature(date);
}

/**
 * Calculates heating surcharge based on temperature conditions at booking midpoint.
 */
export async function calculateHeatingSurcharge(
  reservedFrom: Date,
  reservedTo: Date,
  flatRate: number,
  tempThreshold: number,
  location: string = ""
): Promise<number> {
  if (flatRate <= 0) return 0;

  // Evaluate temperature at the midpoint of the booking slot
  const midpoint = new Date((reservedFrom.getTime() + reservedTo.getTime()) / 2);
  const temp = await getTemperatureForDateTime(midpoint, location);

  if (temp < tempThreshold) {
    const durationHours = (reservedTo.getTime() - reservedFrom.getTime()) / (1000 * 60 * 60);
    return Math.round((durationHours * flatRate + Number.EPSILON) * 100) / 100;
  }

  return 0;
}

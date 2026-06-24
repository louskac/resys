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
 * The surcharge starts 1 hour before sunset and ends at sunrise.
 * Timeframes assume Prague local time values are stored/provided as UTC values.
 */
export function calculateLightingSurcharge(reservedFrom: Date, reservedTo: Date, flatRate: number): number {
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
 const surchargeStartHour = sunset - 1; // starts 1 hour before sunset
 const sunrise = getSunriseHour(dayOfYear);

 // Get the hour of day in local Prague time (which is represented directly as UTC)
 const hourOfDay = currentStepDate.getUTCHours() + currentStepDate.getUTCMinutes() / 60;

 // Surcharge applies if it's before sunrise or after the surcharge start hour
 if (hourOfDay < sunrise || hourOfDay >= surchargeStartHour) {
 totalSurchargeHours += stepHours;
 }

 currentMs += stepMs;
 }

 // Round to nearest integer (or keep 2 decimals for precision)
 return Math.round((totalSurchargeHours * flatRate + Number.EPSILON) * 100) / 100;
}

/**
 * Translation Dictionary & Locale Helpers for Multi-Tenant Localization
 */

export interface TranslationDict {
  days: {
    long: string[];
    short: string[];
  };
  months: string[];
  ui: {
    today: string;
    day: string;
    week: string;
    month: string;
    closed: string;
    open: string;
    openNow: string;
    operatingHours: string;
    book: string;
    capacity: string;
    instructor: string;
    room: string;
    surface: string;
    equipment: string;
    price: string;
    cancel: string;
    confirm: string;
    back: string;
    loading: string;
    save: string;
    edit: string;
    delete: string;
    logout: string;
    login: string;
    checkin: string;
    error: string;
    success: string;
  };
  errors: {
    [key: string]: string | ((params?: any) => string);
  };
}

const csTranslation: TranslationDict = {
  days: {
    long: ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"],
    short: ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"],
  },
  months: [
    "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
    "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"
  ],
  ui: {
    today: "Dnes",
    day: "Den",
    week: "Týden",
    month: "Měsíc",
    closed: "Zavřeno",
    open: "Otevřeno",
    openNow: "Nyní otevřeno",
    operatingHours: "Provozní doba",
    book: "Rezervovat",
    capacity: "Kapacita",
    instructor: "Instruktor",
    room: "Místnost",
    surface: "Povrch",
    equipment: "Vybavení",
    price: "Cena",
    cancel: "Zrušit",
    confirm: "Potvrdit",
    back: "Zpět",
    loading: "Načítání...",
    save: "Uložit",
    edit: "Upravit",
    delete: "Smazat",
    logout: "Odhlásit se",
    login: "Přihlásit se",
    checkin: "Odbavení",
    error: "Chyba",
    success: "Úspěch",
  },
  errors: {
    PAST_BOOKING_NOT_ALLOWED: "Rezervaci nelze vytvořit v minulosti.",
    OVERLAP_CONFLICT: "Zvolený čas se překrývá s jinou rezervací.",
    DAILY_LIMIT_EXCEEDED: "Překročen denní limit rezervací (max 2 hodiny/den).",
    WEEKLY_LIMIT_EXCEEDED: "Překročen týdenní limit rezervací (max 4 hodiny/týden).",
    OPERATING_HOURS_EXCEEDED: "Vybraný čas je mimo provozní dobu.",
    CLOSURE_EXCEPTION: (name: string) => `Provozovna je uzavřena z důvodu: ${name}`,
    SUBSCRIPTION_INACTIVE: "Předplatné poskytovatele není aktivní.",
    INVALID_TIME_RANGE: "Čas začátku musí předcházet času konce.",
    MISSING_PARAMETER: "Chybí povinné parametry rezervace.",
    CREDIT_LIMIT_EXCEEDED: "Překročen limit kreditu partnera. Rezervaci nelze dokončit.",
    TECHNICAL_BREAK_CONFLICT: "V tomto čase probíhá technická přestávka sportoviště.",
    CAPACITY_EXCEEDED: "Kapacita sportoviště v tomto čase je již plně obsazena.",
    INVALID_DAY_INDEX: "Neplatný den v týdnu pro rezervaci.",
    INVALID_TIME_FORMAT: "Neplatný formát zadaného času.",
    EQUIPMENT_CAPACITY_EXCEEDED: "Není k dispozici dostatečné množství požadovaného vybavení.",
    INVALID_EQUIPMENT: "Vybrané vybavení není pro toto sportoviště k dispozici.",
    SCHEDULE_RULE_NOT_FOUND: "Pravidlo rozvrhu nebylo nalezeno.",
    FORBIDDEN: "Nemáte oprávnění k provedení této akce.",
    INVALID_PARAMETER: "Neplatné parametry požadavku.",
    ALREADY_EXISTS: "Tato rezervace nebo zdroj již existuje.",
    DATABASE_ERROR: "Nastala neočekávaná chyba databáze při ukládání.",
    UNKNOWN_ERROR: "Nastala neznámá chyba při zpracování rezervace.",
    UNAUTHORIZED: "Pro dokončení rezervace se prosím nejprve přihlaste.",
    RESOURCE_NOT_FOUND: "Vybrané sportoviště nebylo nalezeno.",
    TENANT_NOT_FOUND: "Organizace nebyla nalezena.",
  }
};

const enTranslation: TranslationDict = {
  days: {
    long: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    short: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  },
  months: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ],
  ui: {
    today: "Today",
    day: "Day",
    week: "Week",
    month: "Month",
    closed: "Closed",
    open: "Open",
    openNow: "Open Now",
    operatingHours: "Operating Hours",
    book: "Book Slot",
    capacity: "Capacity",
    instructor: "Instructor",
    room: "Room",
    surface: "Surface",
    equipment: "Equipment",
    price: "Price",
    cancel: "Cancel",
    confirm: "Confirm",
    back: "Back",
    loading: "Loading...",
    save: "Save",
    edit: "Edit",
    delete: "Delete",
    logout: "Log Out",
    login: "Log In",
    checkin: "Check-in",
    error: "Error",
    success: "Success",
  },
  errors: {
    PAST_BOOKING_NOT_ALLOWED: "Bookings in the past are not allowed.",
    OVERLAP_CONFLICT: "This slot overlaps with an existing booking.",
    DAILY_LIMIT_EXCEEDED: "Daily booking limit exceeded (max 2 hours/day).",
    WEEKLY_LIMIT_EXCEEDED: "Weekly booking limit exceeded (max 4 hours/week).",
    OPERATING_HOURS_EXCEEDED: "Selected time is outside of operating hours.",
    CLOSURE_EXCEPTION: (name: string) => `The facility is closed for: ${name}`,
    SUBSCRIPTION_INACTIVE: "Tenant subscription is inactive.",
    INVALID_TIME_RANGE: "Start time must be before end time.",
    MISSING_PARAMETER: "Missing required booking parameters.",
    CREDIT_LIMIT_EXCEEDED: "Partner credit limit exceeded. The booking cannot be completed.",
    TECHNICAL_BREAK_CONFLICT: "A technical break is scheduled during this time slot.",
    CAPACITY_EXCEEDED: "The capacity of this resource is already fully booked.",
    INVALID_DAY_INDEX: "Invalid day of week for booking.",
    INVALID_TIME_FORMAT: "Invalid time format.",
    EQUIPMENT_CAPACITY_EXCEEDED: "Insufficient quantity of requested equipment available.",
    INVALID_EQUIPMENT: "Selected equipment is not available for this resource.",
    SCHEDULE_RULE_NOT_FOUND: "Schedule rule not found.",
    FORBIDDEN: "You are not authorized to perform this action.",
    INVALID_PARAMETER: "Invalid parameters.",
    ALREADY_EXISTS: "This booking or resource already exists.",
    DATABASE_ERROR: "An unexpected database error occurred during save.",
    UNKNOWN_ERROR: "An unknown error occurred while processing the reservation.",
    UNAUTHORIZED: "Please log in first to complete the reservation.",
    RESOURCE_NOT_FOUND: "Selected resource not found.",
    TENANT_NOT_FOUND: "Tenant organization not found.",
  }
};

const translationMap: { [locale: string]: TranslationDict } = {
  "cs-CZ": csTranslation,
  "cs": csTranslation,
  "en-US": enTranslation,
  "en-GB": enTranslation,
  "en": enTranslation,
};

/**
 * Returns the translation dictionary for a given locale. Falls back to English if not matched.
 */
export function getTranslations(locale?: string | null): TranslationDict {
  const norm = locale ? locale.trim() : "en-US";
  return translationMap[norm] || translationMap[norm.split("-")[0]] || enTranslation;
}

/**
 * Formats a decimal price with the currency symbol and format matching the locale/currency.
 */
export function formatCurrency(amount: number | string, currency: string = "CZK", locale: string = "cs-CZ"): string {
  const num = typeof amount === "number" ? amount : parseFloat(String(amount || 0));
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: num % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch (e) {
    // Fallback format
    const symbol = currency === "CZK" ? " Kč" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";
    const formattedNum = num.toLocaleString(locale);
    return currency === "CZK" ? `${formattedNum}${symbol}` : `${symbol}${formattedNum}`;
  }
}

/**
 * Translates an API error code to a human-readable message.
 */
export function translateError(errorCode: string, locale: string = "cs-CZ", contextParam?: string): string {
  const t = getTranslations(locale);
  // Support exception patterns e.g., OPERATING_HOURS_EXCEEDED:08:00:22:00 or CLOSURE_EXCEPTION:Státní svátek
  const baseCode = errorCode.split(":")[0];
  const param = contextParam || errorCode.split(":").slice(1).join(":");

  const translation = t.errors[baseCode];
  if (!translation) return errorCode;
  if (typeof translation === "function") {
    return translation(param);
  }
  return translation;
}

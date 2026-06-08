export interface TenantTheme {
  name: string;
  verticalName: string;
  tagline: string;
  primary: string;         /* Standard CSS color, e.g. "oklch(0.58 0.16 200)" */
  primaryHover: string;    /* Hover theme color */
  primaryForeground: string; /* Text on primary color, e.g. "#fff" */
  accent: string;          /* Secondary color accent */
  gradientStart: string;   /* Banner gradient start */
  gradientEnd: string;     /* Banner gradient end */
}

export function getTenantTheme(tenantId: string, vertical: string, tenantName?: string): TenantTheme {
  const normalized = tenantId.toLowerCase();
  const displayName = tenantName || tenantId.toUpperCase();
  
  // Custom overrides for Sféra and Umělka to keep their exact looks, now mapped to logical colors
  if (normalized === "sfera") {
    return {
      name: displayName,
      verticalName: "Educational Classes",
      tagline: "Vědecko-technologické centrum a laboratoře",
      primary: "oklch(0.58 0.16 200)",
      primaryHover: "oklch(0.50 0.16 200)",
      primaryForeground: "#ffffff",
      accent: "oklch(0.65 0.15 220)",
      gradientStart: "oklch(0.58 0.16 200)",
      gradientEnd: "oklch(0.40 0.16 230)",
    };
  }
  if (normalized === "umelka") {
    return {
      name: displayName,
      verticalName: "Sports Pitch Rental",
      tagline: "Zažijte nefalšovanou fotbalovou zábavu i bez přírodní trávy. Pronájem hřiště s umělým trávníkem 3. generace s certifikací FIFA.",
      primary: "oklch(0.48 0.18 270)",
      primaryHover: "oklch(0.40 0.18 270)",
      primaryForeground: "#ffffff",
      accent: "oklch(0.58 0.16 270)",
      gradientStart: "oklch(0.48 0.18 270)",
      gradientEnd: "oklch(0.35 0.15 290)",
    };
  }
  
  // Dynamic fallback based on Vertical
  switch (vertical) {
    case "SPORTS_GROUND":
      return {
        name: displayName,
        verticalName: "Sports Ground Rental",
        tagline: "Sport facility slots, courts, and fields reservations",
        primary: "oklch(0.55 0.15 145)",
        primaryHover: "oklch(0.48 0.15 145)",
        primaryForeground: "#ffffff",
        accent: "oklch(0.60 0.13 145)",
        gradientStart: "oklch(0.55 0.15 145)",
        gradientEnd: "oklch(0.40 0.15 160)",
      };
    case "CAPACITY_CLASS":
      return {
        name: displayName,
        verticalName: "Capacity Class & Training",
        tagline: "Group classes, workouts, and reservation slots",
        primary: "oklch(0.60 0.20 320)",
        primaryHover: "oklch(0.53 0.20 320)",
        primaryForeground: "#ffffff",
        accent: "oklch(0.65 0.18 340)",
        gradientStart: "oklch(0.60 0.20 320)",
        gradientEnd: "oklch(0.45 0.20 340)",
      };
    case "EDUCATIONAL_COURSE":
      return {
        name: displayName,
        verticalName: "Educational & Science Courses",
        tagline: "Interactive labs, lecture halls, and school bookings",
        primary: "oklch(0.58 0.16 200)",
        primaryHover: "oklch(0.50 0.16 200)",
        primaryForeground: "#ffffff",
        accent: "oklch(0.65 0.15 220)",
        gradientStart: "oklch(0.58 0.16 200)",
        gradientEnd: "oklch(0.40 0.16 230)",
      };
    case "EVENT_TICKETING":
      return {
        name: displayName,
        verticalName: "Event Ticketing & Seating",
        tagline: "Secure your tickets for upcoming matches, plays, or galleries",
        primary: "oklch(0.65 0.16 70)",
        primaryHover: "oklch(0.58 0.16 70)",
        primaryForeground: "#ffffff",
        accent: "oklch(0.70 0.15 80)",
        gradientStart: "oklch(0.65 0.16 70)",
        gradientEnd: "oklch(0.50 0.16 85)",
      };
    default:
      return {
        name: displayName,
        verticalName: "General SaaS Reservation Portal",
        tagline: "Rent resources, verify schedules, and book slots online",
        primary: "oklch(0.60 0.05 285)",
        primaryHover: "oklch(0.53 0.05 285)",
        primaryForeground: "#ffffff",
        accent: "oklch(0.65 0.04 285)",
        gradientStart: "oklch(0.60 0.05 285)",
        gradientEnd: "oklch(0.45 0.05 285)",
      };
  }
}

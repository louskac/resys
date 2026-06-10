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
      verticalName: "Vzdělávací lekce",
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
      verticalName: "Pronájem hřišť",
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
        verticalName: "Pronájem sportovišť",
        tagline: "Rezervace sportovních ploch, kurtů a hřišť",
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
        verticalName: "Skupinové lekce a tréninky",
        tagline: "Rezervace skupinových lekcí, cvičení a tréninků",
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
        verticalName: "Vzdělávací a vědecké kurzy",
        tagline: "Interaktivní laboratoře, přednáškové sály a školní rezervace",
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
        verticalName: "Vstupenky a rezervace míst",
        tagline: "Zajistěte si vstupenky na zápasy, představení nebo do galerií",
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
        verticalName: "Rezervační portál",
        tagline: "Rezervace ploch, termínů a lekcí online",
        primary: "oklch(0.60 0.05 285)",
        primaryHover: "oklch(0.53 0.05 285)",
        primaryForeground: "#ffffff",
        accent: "oklch(0.65 0.04 285)",
        gradientStart: "oklch(0.60 0.05 285)",
        gradientEnd: "oklch(0.45 0.05 285)",
      };
  }
}

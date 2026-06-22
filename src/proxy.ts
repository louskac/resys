import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. All API routes (global bypass)
     * 2. /_next (Next.js internals)
     * 3. /static, /images, /uploads, and root asset files (Static assets)
     */
    "/((?!api/|_next|static|images|uploads|favicon.ico|logo.png|logo.svg|robots.txt|icon.png|icon.svg|apple-icon.png|manifest.webmanifest).*)",
  ],
};

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";
  console.log(`[PROXY MATCH] Host: "${hostname}", Path: "${url.pathname}"`);

  // Exclude global superadmin host routes, API endpoints and static assets
  if (
    url.pathname.startsWith("/tenants/") ||
    url.pathname.startsWith("/host") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/uploads/") ||
    url.pathname.startsWith("/static/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/logo.png" ||
    url.pathname === "/logo.svg" ||
    url.pathname === "/robots.txt" ||
    url.pathname === "/icon.png" ||
    url.pathname === "/icon.svg" ||
    url.pathname === "/apple-icon.png" ||
    url.pathname === "/manifest.webmanifest"
  ) {
    return NextResponse.next();
  }

  let tenantId = "";

  // 1. Resolve tenant subdomain in development/testing (e.g., sfera.localhost:3000 or sfera.resys.vercel.app)
  if (
    hostname.includes("localhost") || 
    hostname.includes("127.0.0.1") || 
    hostname.includes("vercel.app")
  ) {
    const parts = hostname.split(".");
    
    if (hostname.includes("vercel.app")) {
      // For Vercel domains (e.g. sfera.resys-kohl.vercel.app or resys-kohl.vercel.app)
      // Vercel domains have at least 3 parts: [project], "vercel", "app"
      if (parts.length > 3) {
        tenantId = parts[0];
      }
    } else {
      // For localhost (e.g. sfera.localhost:3000)
      if (parts.length > 1 && parts[0] !== "localhost" && parts[0] !== "127") {
        tenantId = parts[0];
      }
    }
  } else {
    // 2. Resolve custom domain in production (e.g., rezervace.sferapardubice.eu)
    const domainMap: Record<string, string> = {
      "rezervace.sferapardubice.eu": "sfera",
      "rezervace.umelkapardubice.eu": "umelka",
    };

    tenantId = domainMap[hostname] || "";
  }

  // 3. Rewrite path internally to the tenant directory if resolved
  if (tenantId) {
    // Rewrite path to: /tenants/[tenantId]/current/path
    url.pathname = `/tenants/${tenantId}${url.pathname}`;
    console.log(`[PROXY REWRITE] Tenant: "${tenantId}", Rewrote path to: "${url.pathname}"`);
    const response = NextResponse.rewrite(url);
    response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    return response;
  }

  // Fallback to default pages if no tenant domain matches
  return NextResponse.next();
}

import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. All API routes (global bypass)
     * 2. /_next (Next.js internals)
     * 3. /static, /images, /favicon.ico (Static assets)
     */
    "/((?!api/|_next|static|images|favicon.ico|robots.txt).*)",
  ],
};

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";
  console.log(`[PROXY MATCH] Host: "${hostname}", Path: "${url.pathname}"`);

  // Exclude global superadmin host routes and API endpoints
  if (
    url.pathname.startsWith("/host") ||
    url.pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  let tenantId = "";

  // 1. Resolve tenant subdomain in development (e.g., sfera.localhost:3000)
  if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
    const parts = hostname.split(".");
    // If we have a subdomain prefix (e.g., sfera.localhost:3000 or umelka.localhost:3000)
    if (parts.length > 1 && parts[0] !== "localhost" && parts[0] !== "127") {
      tenantId = parts[0];
    }
  } else {
    // 2. Resolve custom domain in production (e.g., rezervace.sferapardubice.eu)
    // We can map domains directly to tenant IDs.
    // In a full implementation, we could query a cache or DB. Here we do a fast static map
    // and fallback to host string for dynamic database queries in page resolvers.
    const domainMap: Record<string, string> = {
      "rezervace.sferapardubice.eu": "sfera",
      "rezervace.umelkapardubice.eu": "umelka",
    };

    tenantId = domainMap[hostname] || hostname;
  }

  // 3. Rewrite path internally to the tenant directory if resolved
  if (tenantId) {
    // Rewrite path to: /tenants/[tenantId]/current/path
    url.pathname = `/tenants/${tenantId}${url.pathname}`;
    console.log(`[PROXY REWRITE] Tenant: "${tenantId}", Rewrote path to: "${url.pathname}"`);
    return NextResponse.rewrite(url);
  }

  // Fallback to default pages if no tenant domain matches
  return NextResponse.next();
}

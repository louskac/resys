import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const dbUrl = process.env.DATABASE_URL || "";
    // Redact password
    const redactedUrl = dbUrl.replace(/:[^:@]+@/, ":[REDACTED]@");

    const tenants = await prisma.tenant.findMany();
    const resources = await prisma.resource.findMany();
    const bookings = await prisma.booking.findMany();

    return NextResponse.json({
      databaseUrl: redactedUrl,
      tenants: tenants.map(t => ({ id: t.id, name: t.name })),
      resources: resources.map(r => ({ id: r.id, tenantId: r.tenantId, name: r.name, parentId: (r.attributes as any)?.parentId || null })),
      bookingsCount: bookings.length,
      bookings: bookings.map(b => ({
        id: b.id,
        tenantId: b.tenantId,
        resourceId: b.resourceId,
        reservedFrom: b.reservedFrom,
        reservedTo: b.reservedTo,
        status: b.status,
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

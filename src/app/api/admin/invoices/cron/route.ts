import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";
import { makeErrorResponse } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const host = request.headers.get("host") || "";
    const isLocalDev = host.includes("localhost") || host.includes("127.0.0.1");
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    
    // Auth check: allow if local dev, if matching cron secret, or if platform superadmin
    const isCronAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`;
    const isSuperAdmin = session?.user?.role === "SUPERADMIN";

    if (!isLocalDev && !isCronAuthorized && !isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const partners = await prisma.partner.findMany({
      where: { active: true, autoBillingEnabled: true },
      include: {
        tenant: true,
        invoices: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    const results: { partnerId: string; partnerName: string; status: string; invoiceId?: string; invoiceNumber?: string; bookingsInvoiced?: number; amount?: number }[] = [];

    for (const partner of partners) {
      // 1. Determine if billing is due
      let isDue = false;
      const cycle = partner.billingCycle || "MONTHLY";
      const lastInvoice = partner.invoices[0];
      
      const referenceDate = lastInvoice ? lastInvoice.createdAt : partner.createdAt;
      const msDiff = now.getTime() - referenceDate.getTime();
      const daysDiff = msDiff / (1000 * 60 * 60 * 24);

      let requiredDays = 30; // MONTHLY default
      if (cycle === "WEEKLY") requiredDays = 7;
      else if (cycle === "BI-WEEKLY") requiredDays = 14;

      if (daysDiff >= requiredDays - 0.5) { // 0.5 day grace buffer
        isDue = true;
      }

      // Allow forcing run via query parameter '?force=true'
      const force = request.nextUrl.searchParams.get("force") === "true";
      if (force) isDue = true;

      if (!isDue) {
        results.push({
          partnerId: partner.id,
          partnerName: partner.name,
          status: `SKIPPED: Not due yet (${daysDiff.toFixed(1)}/${requiredDays} days elapsed)`
        });
        continue;
      }

      // 2. Fetch unbilled bookings that have finished (reservedTo < now)
      const bookings = await prisma.booking.findMany({
        where: {
          partnerId: partner.id,
          tenantId: partner.tenantId,
          invoiceId: null,
          status: { in: ["CONFIRMED", "ATTENDED"] },
          reservedTo: { lt: now }
        }
      });

      if (bookings.length === 0) {
        results.push({
          partnerId: partner.id,
          partnerName: partner.name,
          status: "SKIPPED: No unbilled bookings found"
        });
        continue;
      }

      // 3. Calculate total amount
      const rawSum = bookings.reduce((sum, b) => sum + Number(b.price), 0);
      const totalAmount = Math.round((rawSum + Number.EPSILON) * 100) / 100;

      // 4. Generate next invoice number sequence
      const currentYear = now.getFullYear();
      const count = await prisma.invoice.count({
        where: { tenantId: partner.tenantId }
      });
      const seq = String(count + 1).padStart(4, "0");
      const invoiceNumber = `INV-${currentYear}-${seq}`;

      // 5. Create invoice and link bookings in a database transaction
      const invoice = await prisma.$transaction(async (tx) => {
        // Apply partner discount percentage
        const discountCoeff = (100 - partner.discount) / 100;
        const discountedAmount = Math.round((totalAmount * discountCoeff + Number.EPSILON) * 100) / 100;

        const inv = await tx.invoice.create({
          data: {
            tenantId: partner.tenantId,
            partnerId: partner.id,
            number: invoiceNumber,
            amount: discountedAmount,
            dueDate: new Date(now.getTime() + (partner.paymentTermsDays || 14) * 24 * 60 * 60 * 1000),
            status: "SENT", // Transition automatically to SENT (sent to billing email)
          }
        });

        // Link bookings
        await tx.booking.updateMany({
          where: { id: { in: bookings.map(b => b.id) } },
          data: { invoiceId: inv.id }
        });

        // Record Audit Log
        await tx.auditLog.create({
          data: {
            tenantId: partner.tenantId,
            action: "AUTO_INVOICE_GENERATE",
            entity: "Invoice",
            entityId: inv.id,
            payload: {
              partnerId: partner.id,
              bookingsCount: bookings.length,
              amount: discountedAmount,
              invoiceNumber
            }
          }
        });

        return inv;
      });

      results.push({
        partnerId: partner.id,
        partnerName: partner.name,
        status: "GENERATED",
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        bookingsInvoiced: bookings.length,
        amount: Number(invoice.amount)
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      processedCount: results.filter(r => r.status === "GENERATED").length,
      details: results
    });

  } catch (error: any) {
    console.error("Cron Invoicing Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

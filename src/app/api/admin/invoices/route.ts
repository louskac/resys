import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";
import { makeErrorResponse } from "@/lib/errors";

// Helper to verify if the requester has ADMIN role for a specific tenant or is in custom adminEmails
async function checkTenantAdmin(session: any, tenantId: string) {
  if (!session || !session.user) return false;
  
  const userRole = session.user.role;
  const userTenantId = session.user.tenantId;
  const userEmail = session.user.email || "";

  if (userRole === "ADMIN" && userTenantId === tenantId) {
    return true;
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { attributes: true }
    });
    if (tenant) {
      const attributes = (tenant.attributes as Record<string, any>) || {};
      const adminEmails = attributes.adminEmails || [];
      if (adminEmails.includes(userEmail)) {
        return true;
      }
    }
  } catch (err) {
    console.error("Error checking tenant admin authorization:", err);
  }

  return false;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const partnerId = searchParams.get("partnerId");

    if (!tenantId) {
      return makeErrorResponse("MISSING_PARAMETER", "Chybí identifikátor tenanta (tenantId).");
    }

    if (!await checkTenantAdmin(session, tenantId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const whereClause: any = { tenantId };
    if (partnerId) {
      whereClause.partnerId = partnerId;
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        partner: true,
        bookings: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invoices);
  } catch (error: any) {
    console.error("Invoices GET Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { tenantId, partnerId, startDate, endDate } = body;

    if (!tenantId || !partnerId || !startDate || !endDate) {
      return makeErrorResponse("MISSING_PARAMETER", "Všechny parametry (tenantId, partnerId, startDate, endDate) jsou povinné.");
    }

    if (!await checkTenantAdmin(session, tenantId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Verify partner exists
    const partner = await prisma.partner.findFirst({
      where: { id: partnerId, tenantId },
    });

    if (!partner) {
      return makeErrorResponse("RESOURCE_NOT_FOUND", "Partner nebyl nalezen.");
    }

    // 2. Fetch all confirmed/attended bookings for this partner within date range that aren't invoiced yet
    const start = new Date(startDate);
    const end = new Date(endDate);

    const bookings = await prisma.booking.findMany({
      where: {
        tenantId,
        partnerId,
        invoiceId: null,
        status: { in: ["CONFIRMED", "ATTENDED"] },
        reservedFrom: {
          gte: start,
          lte: end,
        },
      },
    });

    if (bookings.length === 0) {
      return makeErrorResponse("RESOURCE_NOT_FOUND", "Nebyly nalezeny žádné nevyfakturované rezervace pro tohoto partnera ve vybraném období.");
    }

    // 3. Calculate total sum
    const totalAmount = bookings.reduce((sum, booking) => sum + Number(booking.price), 0);

    // 4. Generate invoice number (e.g. INV-2026-0001)
    const currentYear = new Date().getFullYear();
    const count = await prisma.invoice.count({
      where: { tenantId },
    });
    const seq = String(count + 1).padStart(4, "0");
    const invoiceNumber = `INV-${currentYear}-${seq}`;

    // 5. Create invoice and associate bookings in a transaction
    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          tenantId,
          partnerId,
          number: invoiceNumber,
          amount: totalAmount,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days payment term
          status: "DRAFT",
        },
      });

      // Update all bookings to point to this invoice
      await tx.booking.updateMany({
        where: {
          id: { in: bookings.map(b => b.id) },
        },
        data: {
          invoiceId: inv.id,
        },
      });

      return inv;
    });

    return NextResponse.json({
      status: "success",
      invoice: {
        ...invoice,
        bookingsCount: bookings.length,
      },
    });
  } catch (error: any) {
    console.error("Invoice Generate Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { id, tenantId, status } = body;

    if (!id || !tenantId || !status) {
      return makeErrorResponse("MISSING_PARAMETER", "ID faktury, tenantId a nový status jsou povinné.");
    }

    if (!await checkTenantAdmin(session, tenantId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingInvoice = await prisma.invoice.findFirst({
      where: { id, tenantId },
    });

    if (!existingInvoice) {
      return makeErrorResponse("RESOURCE_NOT_FOUND", "Faktura nebyla nalezena.");
    }

    // If cancelled, unlink bookings
    if (status === "CANCELLED") {
      await prisma.$transaction([
        prisma.booking.updateMany({
          where: { invoiceId: id },
          data: { invoiceId: null },
        }),
        prisma.invoice.update({
          where: { id },
          data: { status: "CANCELLED" },
        }),
      ]);
    } else {
      await prisma.invoice.update({
        where: { id },
        data: { status },
      });
    }

    return NextResponse.json({ status: "success", message: "Stav faktury byl úspěšně aktualizován." });
  } catch (error: any) {
    console.error("Invoice Update Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

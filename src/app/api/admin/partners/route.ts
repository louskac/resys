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

  // 1. Check if user is the explicit ADMIN of this tenant
  if (userRole === "ADMIN" && userTenantId === tenantId) {
    return true;
  }

  // 2. Check if their email is in the tenant's adminEmails list
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

    if (!tenantId) {
      return makeErrorResponse("MISSING_PARAMETER", "Chybí identifikátor tenanta (tenantId).");
    }

    if (!await checkTenantAdmin(session, tenantId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const partners = await prisma.partner.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(partners);
  } catch (error: any) {
    console.error("Partners GET Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { 
      tenantId, 
      name, 
      email, 
      phone, 
      companyId, 
      vatId, 
      addressStreet, 
      addressCity, 
      addressZip, 
      addressCountry,
      discount,
      active
    } = body;

    if (!tenantId || !name || !email) {
      return makeErrorResponse("MISSING_PARAMETER", "Název a e-mail partnera jsou povinné.");
    }

    if (!await checkTenantAdmin(session, tenantId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const partner = await prisma.partner.create({
      data: {
        tenantId,
        name,
        email,
        phone: phone || null,
        companyId: companyId || null,
        vatId: vatId || null,
        addressStreet: addressStreet || null,
        addressCity: addressCity || null,
        addressZip: addressZip || null,
        addressCountry: addressCountry || "CZ",
        discount: discount !== undefined ? parseInt(discount, 10) : 0,
        active: active !== undefined ? Boolean(active) : true,
      },
    });

    return NextResponse.json({ status: "success", partner });
  } catch (error: any) {
    console.error("Partner Create Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { 
      id,
      tenantId, 
      name, 
      email, 
      phone, 
      companyId, 
      vatId, 
      addressStreet, 
      addressCity, 
      addressZip, 
      addressCountry,
      discount,
      active
    } = body;

    if (!id || !tenantId) {
      return makeErrorResponse("MISSING_PARAMETER", "ID partnera a tenantId jsou povinné.");
    }

    if (!await checkTenantAdmin(session, tenantId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingPartner = await prisma.partner.findFirst({
      where: { id, tenantId }
    });

    if (!existingPartner) {
      return makeErrorResponse("RESOURCE_NOT_FOUND", "Partner nebyl nalezen.");
    }

    const partner = await prisma.partner.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existingPartner.name,
        email: email !== undefined ? email : existingPartner.email,
        phone: phone !== undefined ? (phone || null) : existingPartner.phone,
        companyId: companyId !== undefined ? (companyId || null) : existingPartner.companyId,
        vatId: vatId !== undefined ? (vatId || null) : existingPartner.vatId,
        addressStreet: addressStreet !== undefined ? (addressStreet || null) : existingPartner.addressStreet,
        addressCity: addressCity !== undefined ? (addressCity || null) : existingPartner.addressCity,
        addressZip: addressZip !== undefined ? (addressZip || null) : existingPartner.addressZip,
        addressCountry: addressCountry !== undefined ? (addressCountry || "CZ") : existingPartner.addressCountry,
        discount: discount !== undefined ? parseInt(discount, 10) : existingPartner.discount,
        active: active !== undefined ? Boolean(active) : existingPartner.active,
      },
    });

    return NextResponse.json({ status: "success", partner });
  } catch (error: any) {
    console.error("Partner Update Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const tenantId = searchParams.get("tenantId");

    if (!id || !tenantId) {
      return makeErrorResponse("MISSING_PARAMETER", "Chybí id partnera nebo tenantId.");
    }

    if (!await checkTenantAdmin(session, tenantId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingPartner = await prisma.partner.findFirst({
      where: { id, tenantId }
    });

    if (!existingPartner) {
      return makeErrorResponse("RESOURCE_NOT_FOUND", "Partner nebyl nalezen.");
    }

    // Set partner active to false instead of hard delete, to preserve invoicing records
    const partner = await prisma.partner.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ status: "success", message: "Partner byl úspěšně deaktivován.", partner });
  } catch (error: any) {
    console.error("Partner Delete Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

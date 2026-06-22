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

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { 
      userId,
      tenantId, 
      partnerId // Pass null to unlink
    } = body;

    if (!userId || !tenantId) {
      return makeErrorResponse("MISSING_PARAMETER", "ID uživatele a tenantId jsou povinné.");
    }

    if (!await checkTenantAdmin(session, tenantId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingUser = await prisma.user.findFirst({
      where: { id: userId, tenantId }
    });

    if (!existingUser) {
      return makeErrorResponse("RESOURCE_NOT_FOUND", "Uživatel nebyl nalezen.");
    }

    // Link or unlink user to/from partner
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        partnerId: partnerId || null
      },
      include: {
        partner: true
      }
    });

    const { passwordHash: _, ...sanitizedUser } = updatedUser;
    return NextResponse.json({ status: "success", user: sanitizedUser });
  } catch (error: any) {
    console.error("User Partner Link PATCH Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

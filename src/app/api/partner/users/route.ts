import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";
import { makeErrorResponse } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, action } = body; // action: "add" | "remove"

    if (!email) {
      return makeErrorResponse("MISSING_PARAMETER", "E-mail uživatele je povinný.");
    }

    // Resolve requester's partner ID
    const requester = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { partnerId: true }
    });

    if (!requester || !requester.partnerId) {
      return NextResponse.json({ error: "Forbidden: You are not associated with any B2B partner account." }, { status: 403 });
    }

    const partnerId = requester.partnerId;

    if (action === "add") {
      // Find user by email
      const targetUser = await prisma.user.findUnique({
        where: { email }
      });

      if (!targetUser) {
        return makeErrorResponse("RESOURCE_NOT_FOUND", "Uživatel s tímto e-mailem nebyl nalezen. Uživatel se musí nejprve zaregistrovat.");
      }

      if (targetUser.partnerId) {
        if (targetUser.partnerId === partnerId) {
          return makeErrorResponse("ALREADY_EXISTS", "Tento uživatel již je přiřazen k vaší firmě.");
        }
        return makeErrorResponse("ALREADY_EXISTS", "Tento uživatel je již registrován pod jinou partnerskou firmou.");
      }

      // Link user
      const updatedUser = await prisma.user.update({
        where: { id: targetUser.id },
        data: { partnerId }
      });

      // Log action
      await prisma.auditLog.create({
        data: {
          tenantId: updatedUser.tenantId || "system",
          action: "PARTNER_USER_ADD",
          entity: "User",
          entityId: updatedUser.id,
          payload: { partnerId, email, addedBy: session.user.email }
        }
      });

      return NextResponse.json({
        success: true,
        message: "Uživatel byl úspěšně přidán k vaší firmě.",
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role
        }
      });
    }

    if (action === "remove") {
      // Find user
      const targetUser = await prisma.user.findFirst({
        where: { email, partnerId }
      });

      if (!targetUser) {
        return makeErrorResponse("RESOURCE_NOT_FOUND", "Uživatel s tímto e-mailem nepatří k vaší firmě.");
      }

      // Prevent unlinking yourself
      if (targetUser.email === session.user.email) {
        return makeErrorResponse("FORBIDDEN", "Nemůžete odebrat sami sebe ze své firmy.");
      }

      // Unlink user
      const updatedUser = await prisma.user.update({
        where: { id: targetUser.id },
        data: { partnerId: null }
      });

      // Log action
      await prisma.auditLog.create({
        data: {
          tenantId: updatedUser.tenantId || "system",
          action: "PARTNER_USER_REMOVE",
          entity: "User",
          entityId: updatedUser.id,
          payload: { partnerId, email, removedBy: session.user.email }
        }
      });

      return NextResponse.json({
        success: true,
        message: "Uživatel byl úspěšně odebrán z vaší firmy."
      });
    }

    return makeErrorResponse("INVALID_PARAMETER", "Neplatná akce.");

  } catch (error: any) {
    console.error("Partner Users Route Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

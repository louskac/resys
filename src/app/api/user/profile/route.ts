import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import authOptions from "@/lib/auth";
import { hashPassword } from "@/lib/crypto";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      phone, 
      password, 
      avatarUrl,
      addressStreet,
      addressCity,
      addressZip,
      addressCountry,
      organization
    } = body;

    const email = session.user.email;

    // Build update data
    const updateData: any = {
      name,
      phone: phone || null,
      avatarUrl: avatarUrl || null,
      addressStreet: addressStreet || null,
      addressCity: addressCity || null,
      addressZip: addressZip || null,
      addressCountry: addressCountry || null,
      organization: organization || null,
    };

    // If password is being changed
    if (password && password.trim() !== "") {
      updateData.passwordHash = hashPassword(password);
    }

    // Update DB
    const updatedUser = await prisma.user.update({
      where: { email },
      data: updateData,
    });

    // Remove password hash from response
    const { passwordHash, ...sanitizedUser } = updatedUser;

    return NextResponse.json({
      status: "success",
      user: sanitizedUser,
    });
  } catch (error: any) {
    console.error("User profile API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

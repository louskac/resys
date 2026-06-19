import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, phone, tenantId } = body;

    // 1. Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Jméno je povinné." }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ error: "E-mail je povinný." }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Heslo musí mít alespoň 6 znaků." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 2. Check for duplicate
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Tento e-mail je již registrován." }, { status: 409 });
    }

    // 3. Hash password & Create User
    const passwordHash = hashPassword(password);
    
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        phone: phone || null,
        tenantId: tenantId || null,
        role: "USER", // Regular user
      },
    });

    const { passwordHash: _, ...sanitizedUser } = user;

    return NextResponse.json({
      status: "success",
      user: sanitizedUser,
    });
  } catch (error: any) {
    console.error("User registration API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

import React from "react";
import prisma from "@/lib/prisma";
import { getTenantTheme } from "@/lib/tenantThemes";
import { notFound } from "next/navigation";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{
    tenantId: string;
  }>;
}

export default async function TenantLayout({ children, params }: LayoutProps) {
  const { tenantId } = await params;

  // Fetch tenant info to determine its vertical
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { vertical: true, name: true },
  });

  if (!tenant) {
    return notFound();
  }

  const theme = getTenantTheme(tenantId, tenant.vertical, tenant.name);

  const tenantStyles = {
    "--tenant-primary": theme.primary,
    "--tenant-primary-hover": theme.primaryHover,
    "--tenant-primary-foreground": theme.primaryForeground,
    "--tenant-accent": theme.accent,
    "--tenant-gradient": `linear-gradient(135deg, ${theme.gradientStart}, ${theme.gradientEnd})`,
  } as React.CSSProperties;

  return (
    <div style={tenantStyles} className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      {children}
    </div>
  );
}

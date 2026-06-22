import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getTenantTheme } from "@/lib/tenantThemes";
import CheckoutClient from "./CheckoutClient";

interface CheckoutPageProps {
  params: Promise<{
    tenantId: string;
  }>;
  searchParams: Promise<{
    bookingId?: string;
  }>;
}

export default async function TenantCheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const { tenantId } = await params;
  const { bookingId } = await searchParams;

  if (!bookingId) {
    return notFound();
  }

  // 1. Fetch booking and include resource details
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      resource: true,
      tenant: true,
    },
  });

  if (!booking || booking.tenantId !== tenantId) {
    return notFound();
  }

  const theme = getTenantTheme(tenantId, booking.tenant.vertical, booking.tenant.name);

  // 2. Format details
  const serializedBooking = {
    id: booking.id,
    resourceName: booking.resource.name,
    userName: booking.userName,
    userEmail: booking.userEmail,
    reservedFrom: booking.reservedFrom.toISOString(),
    reservedTo: booking.reservedTo.toISOString(),
    status: booking.status,
    price: booking.price.toString(),
    rentedEquipment: booking.rentedEquipment ? (booking.rentedEquipment as any) : null,
  };

  return (
    <div 
      className="min-h-screen bg-slate-50 dark:bg-[#07070C] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 md:p-8 transition-colors duration-250"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 120px, ${theme.primary}12, transparent 45%)`
      }}
    >
      {/* Inline styles to configure tenant-primary accent CSS variable dynamically */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --tenant-primary: ${theme.primary};
          --tenant-hover: ${theme.primaryHover};
          --tenant-gradient: linear-gradient(135deg, ${theme.gradientStart}, ${theme.gradientEnd});
        }
      `}} />

      <CheckoutClient 
        tenantId={tenantId}
        tenantName={booking.tenant.name}
        booking={serializedBooking}
        theme={theme}
      />
    </div>
  );
}

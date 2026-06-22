import { getServerSession } from "next-auth/next";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getTenantTheme } from "@/lib/tenantThemes";
import UserDashboardClient from "./UserDashboardClient";

interface DashboardPageProps {
  params: Promise<{
    tenantId: string;
  }>;
}

export default async function UserDashboardPage({ params }: DashboardPageProps) {
  const { tenantId } = await params;
  const session = await getServerSession(authOptions);

  // 1. Fetch Tenant
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return notFound();
  }

  // 2. Enforce Authentication
  if (!session || !session.user || !session.user.email) {
    redirect(`/tenants/${tenantId}?login=true`);
  }

  // 3. Fetch User details from DB
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    // Graceful fallback if user is authenticated in NextAuth but not yet fully persisted
    // (though our auth.ts upsert logic handles this, we make sure it doesn't fail)
    redirect(`/tenants/${tenantId}`);
  }

  // 4. Fetch Bookings for this user (could be across all tenants, but let's load all of them)
  const bookings = await prisma.booking.findMany({
    where: {
      userEmail: session.user.email,
    },
    orderBy: {
      reservedFrom: "desc",
    },
    include: {
      resource: true,
      tenant: true,
    },
  });

  // 5. Fetch Check-in logs associated with these bookings
  const bookingIds = bookings.map((b) => b.id);
  const checkinLogs = await prisma.checkinLog.findMany({
    where: {
      bookingId: { in: bookingIds },
    },
    orderBy: {
      scannedAt: "desc",
    },
    include: {
      device: true,
      booking: {
        include: {
          resource: true,
          tenant: true,
        },
      },
    },
  });

  const theme = getTenantTheme(tenantId, tenant.vertical, tenant.name);

  // 6. Serialize Prisma results cleanly
  const serializedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    addressStreet: user.addressStreet,
    addressCity: user.addressCity,
    addressZip: user.addressZip,
    addressCountry: user.addressCountry,
    organization: user.organization,
  };

  const serializedBookings = bookings.map((b) => ({
    id: b.id,
    tenantId: b.tenantId,
    tenantName: b.tenant.name,
    resourceId: b.resourceId,
    resourceName: b.resource.name,
    reservedFrom: b.reservedFrom.toISOString(),
    reservedTo: b.reservedTo.toISOString(),
    status: b.status,
    price: b.price.toString(),
    createdAt: b.createdAt.toISOString(),
    rentedEquipment: b.rentedEquipment ? (b.rentedEquipment as any) : null,
  }));

  const serializedLogs = checkinLogs.map((log) => ({
    id: log.id,
    scannedAt: log.scannedAt.toISOString(),
    result: log.result,
    deviceName: log.device.name,
    bookingId: log.bookingId,
    resourceName: log.booking.resource.name,
    tenantName: log.booking.tenant.name,
  }));

  return (
    <UserDashboardClient
      tenant={{ id: tenant.id, name: tenant.name, vertical: tenant.vertical }}
      user={serializedUser}
      bookings={serializedBookings}
      checkinLogs={serializedLogs}
      theme={theme}
    />
  );
}

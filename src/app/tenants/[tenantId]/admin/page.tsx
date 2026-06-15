import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import authOptions from "@/lib/auth";
import { getTenantTheme } from "@/lib/tenantThemes";
import AdminDashboardClient from "./AdminDashboardClient";
import AdminLoginClient from "./AdminLoginClient";

interface AdminPageProps {
  params: Promise<{
    tenantId: string;
  }>;
  searchParams: Promise<{
    date?: string;
  }>;
}

export default async function TenantAdminPage({ params, searchParams }: AdminPageProps) {
  const { tenantId } = await params;
  const { date } = await searchParams;
  const session = await getServerSession(authOptions);

  // Helper to format Date to UTC YYYY-MM-DD
  const formatUTCDate = (d: Date) => {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  let targetDate = new Date();
  if (date) {
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (!isNaN(parsed.getTime())) {
      targetDate = parsed;
    }
  } else {
    const today = new Date();
    targetDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  }

  // Find Monday of the week containing targetDate in UTC
  const getMondayOfDate = (d: Date) => {
    const temp = new Date(d);
    const day = temp.getUTCDay();
    const diff = temp.getUTCDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(temp);
    mon.setUTCDate(diff);
    mon.setUTCHours(0, 0, 0, 0);
    return mon;
  };

  const monday = getMondayOfDate(targetDate);

  // 1. Fetch tenant and all its relational records
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      resources: {
        orderBy: {
          name: "asc",
        },
        include: {
          scheduleRules: true,
        },
      },
      bookings: {
        orderBy: { createdAt: "desc" },
        include: {
          resource: true,
        },
      },
      devices: {
        include: {
          checkinLogs: {
            orderBy: { scannedAt: "desc" },
            include: {
              booking: {
                include: {
                  resource: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!tenant) {
    return notFound();
  }

  const theme = getTenantTheme(tenantId, tenant.vertical, tenant.name);

  // 2. Enforce authentication check via OneiD session
  if (!session || !session.user) {
    return (
      <AdminLoginClient
        tenantId={tenantId}
        tenantName={tenant.name}
        theme={theme}
      />
    );
  }

  // 3. Enforce administrator authorization checks
  const attributes = (tenant.attributes as Record<string, any>) || {};
  const adminEmails = attributes.adminEmails || ["josef.novak@deepvision.cz"];
  const userEmail = session.user.email || "";

  const isAuthorized = 
    adminEmails.includes(userEmail) || 
    userEmail.endsWith("@deepvision.cz"); // Developer convenience shortcut

  if (!isAuthorized) {
    return (
      <AdminLoginClient
        tenantId={tenantId}
        tenantName={tenant.name}
        theme={theme}
        isUnauthorized={true}
        loggedInEmail={userEmail}
      />
    );
  }

  // 4. Extract and format logs globally for convenience
  const allLogs = tenant.devices.flatMap(device => 
    device.checkinLogs.map(log => ({
      id: log.id,
      deviceName: device.name,
      userName: log.booking.userName,
      userEmail: log.booking.userEmail,
      resourceName: log.booking.resource.name,
      scannedAt: log.scannedAt.toISOString(),
      result: log.result,
    }))
  ).sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());

  // 5. Serialize prisma data safely for client component transmission
  const serializedTenant = {
    id: tenant.id,
    name: tenant.name,
    vertical: tenant.vertical,
    attributes: attributes,
  };

  const serializedResources = tenant.resources.map(res => ({
    id: res.id,
    name: res.name,
    type: res.type,
    maxCapacity: res.maxCapacity,
    attributes: (res.attributes as Record<string, any>) || {},
    scheduleRules: res.scheduleRules.map(rule => ({
      id: rule.id,
      name: rule.name,
      dayOfWeek: rule.dayOfWeek,
      startTime: rule.startTime,
      endTime: rule.endTime,
      price: rule.price.toString(),
      maxCapacity: rule.maxCapacity,
    })),
  }));

  const serializedBookings = tenant.bookings.map(booking => ({
    id: booking.id,
    resourceId: booking.resourceId,
    resourceName: booking.resource.name,
    userName: booking.userName,
    userEmail: booking.userEmail,
    reservedFrom: booking.reservedFrom.toISOString(),
    reservedTo: booking.reservedTo.toISOString(),
    status: booking.status,
    createdAt: booking.createdAt.toISOString(),
    recurrenceGroup: booking.recurrenceGroup,
  }));

  const serializedDevices = tenant.devices.map(device => ({
    id: device.id,
    name: device.name,
    active: device.active,
    logsCount: device.checkinLogs.length,
  }));

  return (
    <AdminDashboardClient
      tenant={serializedTenant}
      resources={serializedResources}
      bookings={serializedBookings}
      devices={serializedDevices}
      checkinLogs={allLogs}
      activeDate={date || formatUTCDate(targetDate)}
      weekStart={formatUTCDate(monday)}
    />
  );
}

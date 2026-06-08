import { getServerSession } from "next-auth/next";
import authOptions from "@/lib/auth";
import Link from "next/link";
import CalendarView from "@/components/CalendarView";
import prisma from "@/lib/prisma";
import { getTenantTheme } from "@/lib/tenantThemes";
import { notFound } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutButton from "@/components/LogoutButton";
import { Clock, Users, CreditCard } from "lucide-react";

interface PageProps {
  params: Promise<{
    tenantId: string;
  }>;
  searchParams: Promise<{
    date?: string;
  }>;
}

interface CalendarEvent {
  id: string;
  name: string;
  room: string;
  instructor: string;
  dayIndex: number;
  startHour: number;
  durationHours: number;
  resourceId: string;
  isOccupied?: boolean;
  resourceName?: string;
}

interface TenantAttributes {
  tagline?: string;
  openTime?: string;
  closeTime?: string;
  adminEmails?: string[];
}

interface ResourceAttributes {
  instructor?: string;
  room?: string;
  surface?: string;
}

// Convert "HH:MM" to decimal hours
function parseTimeToDecimal(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours + (minutes / 60);
}

// Map dayOfWeek (0=Sun, 1=Mon, ..., 6=Sat) to calendar index (0=Mon, ..., 6=Sun)
function getCalendarDayIndex(dayOfWeek: number): number {
  if (dayOfWeek === 0) return 6; // Sunday -> 6
  return dayOfWeek - 1;          // Monday -> 0, etc.
}

export default async function TenantPage({ params, searchParams }: PageProps) {
  const { tenantId } = await params;
  const { date } = await searchParams;

  // Helper to format Date to local YYYY-MM-DD
  const formatLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  let targetDate = new Date("2026-06-08T00:00:00");
  if (date) {
    const parsed = new Date(`${date}T00:00:00`);
    if (!isNaN(parsed.getTime())) {
      targetDate = parsed;
    }
  }

  // Find Monday of the week containing targetDate
  const getMondayOfDate = (d: Date) => {
    const temp = new Date(d);
    const day = temp.getDay();
    const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(temp.setDate(diff));
    mon.setHours(0, 0, 0, 0);
    return mon;
  };

  const monday = getMondayOfDate(targetDate);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  const session = await getServerSession(authOptions);

  // Fetch tenant and its resources/rules/bookings from PostgreSQL
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      resources: {
        include: {
          scheduleRules: true,
        },
      },
      bookings: {
        where: {
          status: "CONFIRMED",
          reservedFrom: {
            gte: monday,
            lt: nextMonday,
          },
        },
        include: {
          resource: true,
        },
      },
    },
  });

  if (!tenant) {
    return notFound();
  }

  const attributes = (tenant.attributes as unknown as TenantAttributes) || {};
  const data = getTenantTheme(tenantId, tenant.vertical, tenant.name);
  
  let tagline = data.tagline;
  if (attributes.tagline) {
    tagline = attributes.tagline;
  }
  const openTime = attributes.openTime || "08:00";
  const closeTime = attributes.closeTime || "18:00";

  const calendarEvents: CalendarEvent[] = [];

  // A. Add confirmed bookings for the week as occupied calendar overlays
  tenant.bookings.forEach((booking) => {
    const startHour = booking.reservedFrom.getHours() + booking.reservedFrom.getMinutes() / 60;
    const endHour = booking.reservedTo.getHours() + booking.reservedTo.getMinutes() / 60;
    const durationHours = endHour - startHour;
    const dayIndex = getCalendarDayIndex(booking.reservedFrom.getDay());

    const resAttrs = (booking.resource.attributes as unknown as ResourceAttributes) || {};

    calendarEvents.push({
      id: booking.id,
      name: booking.userName || booking.resource.name,
      room: resAttrs.surface || "Hřiště",
      instructor: booking.userEmail || "Pronájem",
      dayIndex,
      startHour,
      durationHours,
      resourceId: booking.resourceId,
      isOccupied: true, // Confirmed bookings are always occupied
      resourceName: booking.resource.name,
    });
  });

  // B. Add recurring schedule rules (only for non-sports grounds as they represent templates/classes rather than blockings)
  if (tenant.vertical !== "SPORTS_GROUND") {
    tenant.resources.forEach((resource) => {
      const resAttributes = (resource.attributes as unknown as ResourceAttributes) || {};
      const instructor = resAttributes.instructor || "Staff";
      const room = resAttributes.room || "Room";

      resource.scheduleRules.forEach((rule) => {
        const startHour = parseTimeToDecimal(rule.startTime);
        const endHour = parseTimeToDecimal(rule.endTime);
        const durationHours = endHour - startHour;
        const dayIndex = rule.dayOfWeek !== null ? getCalendarDayIndex(rule.dayOfWeek) : 0;

        calendarEvents.push({
          id: rule.id,
          name: rule.name,
          room: resAttributes.surface || room,
          instructor: instructor,
          dayIndex,
          startHour,
          durationHours,
          resourceId: resource.id,
          isOccupied: false,
          resourceName: resource.name,
        });
      });
    });
  }

  // Simple mapping of resource type for Czech UI readability
  const getResourceTypeName = (type: string) => {
    switch (type) {
      case "SPACE": return "Kapacitní lekce";
      case "SEAT": return "Sedadlo";
      case "COURSE_PROGRAM": return "Pravidelný program";
      default: return type;
    }
  };

  // List of flat resources to render in cards at bottom
  const resourcesList = tenant.resources.map((resource) => {
    // Find the first rule price/time or default
    const firstRule = resource.scheduleRules[0];
    const priceText = firstRule ? `${firstRule.price} Kč` : "Dle dohody";
    const timeText = firstRule ? `${firstRule.startTime} - ${firstRule.endTime}` : "Dle dohody";

    return {
      id: resource.id,
      name: resource.name,
      type: getResourceTypeName(resource.type),
      capacity: resource.maxCapacity,
      price: priceText,
      time: timeText,
    };
  });

  return (
    <div className="flex-1 bg-background text-foreground flex flex-col font-sans transition-colors duration-150">
      <header className="border-b border-border bg-card sticky top-0 z-40 transition-colors shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-tenant-primary flex items-center justify-center font-bold text-white text-md shadow-sm shadow-tenant-primary/15 transition-transform hover:scale-105 select-none">
              {tenantId[0].toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-foreground text-sm leading-tight">{data.name}</span>
              <span className="text-[10px] text-muted-foreground font-semibold tracking-wide mt-0.5">{data.verticalName} Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {session ? (
              <div className="flex items-center gap-3 bg-secondary/45 border border-border rounded-lg py-1.5 pl-3 pr-1.5 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-xs font-semibold text-foreground leading-none">{session.user?.name}</span>
                    <span className="text-[9px] text-muted-foreground mt-1">{session.user?.email}</span>
                  </div>
                  <div className="h-7 w-7 rounded bg-tenant-primary/10 text-tenant-primary border border-tenant-primary/20 flex items-center justify-center font-bold text-xs select-none">
                    {session.user?.name ? session.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U"}
                  </div>
                </div>
                <LogoutButton />
              </div>
            ) : (
              <Link
                href={`/api/auth/oneid/initiate?tenantId=${tenantId}`}
                className="btn-tenant text-xs py-1.5 px-3.5 flex items-center gap-2 rounded-lg font-semibold shadow-sm"
              >
                Sign In with OneiD
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
          {/* Left Column - Calendar (main area on desktop, stacked second on mobile) */}
          <div className="space-y-6 order-2 lg:order-1">
            <div className="mb-1">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 select-none">
                <span className="h-2.5 w-2.5 rounded-full bg-tenant-primary animate-pulse" />
                Weekly Schedule & Program Slots
              </h3>
            </div>
             <CalendarView 
              tenantId={tenantId} 
              initialEvents={calendarEvents} 
              session={session}
              resources={tenant.resources.map(r => ({ 
                id: r.id, 
                name: r.name,
                parentId: (r.attributes as any)?.parentId || null
              }))}
              openTime={openTime}
              closeTime={closeTime}
              weekStart={formatLocalDate(monday)}
              activeDate={date || formatLocalDate(monday)}
            />
          </div>

          {/* Right Column - Hero Info & Programs (sidebar on desktop, stacked first on mobile) */}
          <div className="space-y-6 order-1 lg:order-2">
            {/* Hero Banner Card */}
            <div className="card relative p-6 bg-card border-border hover:border-tenant-primary/30 transition-all shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-tenant-primary mb-2 block select-none">
                {data.verticalName}
              </span>
              <h2 className="text-xl font-extrabold text-foreground mb-2 leading-snug">
                Welcome to {data.name}
              </h2>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {tagline}. Select a program below to check details, check capacity slots, and secure your booking.
              </p>
            </div>

            {/* Programs List Widget */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-tenant-primary" />
                Available Programs & Classes
              </h3>
              
              {resourcesList.length === 0 ? (
                <div className="card p-6 text-center text-muted-foreground text-xs font-medium">
                  No resources or program slots are currently configured.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {resourcesList.map((res) => (
                    <div
                      key={res.id}
                      className="card p-5 border-l-4 border-l-tenant-primary hover:border-l-tenant-primary/80 transition-all flex flex-col justify-between group bg-card"
                    >
                      <div>
                        <span className="text-[9px] px-2.5 py-0.5 rounded bg-tenant-primary/10 text-tenant-primary font-bold border border-tenant-primary/20 uppercase tracking-wider select-none">
                          {res.type}
                        </span>
                        <h4 className="font-bold text-sm text-foreground mt-3.5 mb-2.5 group-hover:text-tenant-primary transition-colors">
                          {res.name}
                        </h4>
                        <div className="space-y-2 text-xs text-muted-foreground mb-4">
                          <div className="flex items-center justify-between py-0.5">
                            <span className="flex items-center gap-2">
                              <Clock size={13} className="text-tenant-primary" />
                              <span>Time slot</span>
                            </span>
                            <span className="text-foreground font-semibold">{res.time}</span>
                          </div>
                          <div className="flex items-center justify-between py-0.5">
                            <span className="flex items-center gap-2">
                              <Users size={13} className="text-tenant-primary" />
                              <span>Capacity</span>
                            </span>
                            <span className="text-foreground font-semibold">{res.capacity} slots</span>
                          </div>
                          <div className="flex items-center justify-between py-0.5">
                            <span className="flex items-center gap-2">
                              <CreditCard size={13} className="text-tenant-primary" />
                              <span>Admission</span>
                            </span>
                            <span className="text-tenant-primary font-bold">{res.price}</span>
                          </div>
                        </div>
                      </div>

                      {session ? (
                        <button
                          className="btn-outline w-full py-1.5 text-xs rounded-lg cursor-not-allowed opacity-60"
                          disabled
                        >
                          Active Session Booked
                        </button>
                      ) : (
                        <Link
                          href={`/api/auth/oneid/initiate?tenantId=${tenantId}`}
                          className="btn-secondary w-full py-1.5 text-center text-xs block rounded-lg font-semibold"
                        >
                          Sign in to Reserve
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mini Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground bg-card transition-colors">
        <p>This is a standalone portal powered by ReSys SaaS. Connected via secure SSO.</p>
      </footer>
    </div>
  );
}

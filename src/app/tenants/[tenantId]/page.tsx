import { getServerSession } from "next-auth/next";
import authOptions from "@/lib/auth";
import Link from "next/link";
import CalendarView from "@/components/CalendarView";
import prisma from "@/lib/prisma";
import { getTenantTheme } from "@/lib/tenantThemes";
import { notFound } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutButton from "@/components/LogoutButton";
import { Clock, Users, CreditCard, Layers, Wrench, GitMerge, MapPin, User } from "lucide-react";
import TenantBanner from "@/components/TenantBanner";
import LoginModal from "@/components/LoginModal";
import ResourceCard from "@/components/ResourceCard";
import AIAssistant from "@/components/AIAssistant";

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
  recurrenceGroup?: string | null;
}

interface TenantAttributes {
  tagline?: string;
  openTime?: string;
  closeTime?: string;
  adminEmails?: string[];
  bannerImage?: string;
  bannerPosition?: string;
  openingHours?: {
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    closed: boolean;
  }[];
  aiInstructions?: string;
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
  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(monday.getUTCDate() + 7);
  const session = await getServerSession(authOptions);

  let userBookingsCount = 0;
  if (session && session.user?.email) {
    userBookingsCount = await prisma.booking.count({
      where: {
        tenantId,
        userEmail: session.user.email,
        status: "CONFIRMED",
        reservedFrom: {
          gte: new Date(),
        },
      },
    });
  }

  // Fetch tenant and its resources/rules/bookings from PostgreSQL
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

  const czechFormattedDate = (() => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    const formatted = new Date().toLocaleDateString("cs-CZ", options);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  })();

  const activeResources = tenant.resources;

  const calendarEvents: CalendarEvent[] = [];

  // A. Add confirmed bookings for the week as occupied calendar overlays
  tenant.bookings.forEach((booking) => {
    const startHour = booking.reservedFrom.getUTCHours() + booking.reservedFrom.getUTCMinutes() / 60;
    const endHour = booking.reservedTo.getUTCHours() + booking.reservedTo.getUTCMinutes() / 60;
    const durationHours = endHour - startHour;
    const dayIndex = getCalendarDayIndex(booking.reservedFrom.getUTCDay());

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
      recurrenceGroup: booking.recurrenceGroup,
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

  const isOpenNow = (() => {
    try {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const [openH, openM] = openTime.split(":").map(Number);
      const [closeH, closeM] = closeTime.split(":").map(Number);
      const startMin = openH * 60 + openM;
      const endMin = closeH * 60 + closeM;
      return currentMin >= startMin && currentMin < endMin;
    } catch {
      return true;
    }
  })();

  return (
    <div className="flex-1 bg-background text-foreground flex flex-col font-sans transition-colors duration-150">
      <header className="border-b border-slate-200/50 dark:border-[#1F1F35]/30 bg-white/45 dark:bg-[#07070C]/35 backdrop-blur-xl sticky top-0 z-40 transition-all shadow-md shadow-slate-100/5 dark:shadow-black/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 500 500"
              className="h-9 w-9 transition-transform hover:scale-105 select-none shrink-0"
              fill="none"
            >
              <defs>
                <linearGradient id="resysGradientHeader" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7000FF" />
                  <stop offset="50%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
                <linearGradient id="slotGradientHeader" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00F5FF" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
                <filter id="subtleGlowHeader" x="-15%" y="-15%" width="130%" height="130%">
                  <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#7000FF" floodOpacity="0.35" />
                </filter>
              </defs>
              <g filter="url(#subtleGlowHeader)">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M 110 150 L 155 105 H 315 C 385 105 405 145 405 205 C 405 255 380 285 325 295 L 385 395 H 320 L 265 305 H 175 V 395 H 120 V 170 L 110 150 Z M 175 160 V 255 H 275 C 325 255 345 235 345 205 C 345 175 325 160 275 160 H 175 Z"
                  fill="url(#resysGradientHeader)"
                />
                <g>
                  {/* Row 1 */}
                  <rect x="290" y="325" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                  <rect x="312" y="325" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                  <rect x="334" y="325" width="10" height="10" rx="2.5" fill="url(#slotGradientHeader)" />
                  <rect x="356" y="325" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />

                  {/* Row 2 */}
                  <rect x="301" y="345" width="10" height="10" rx="2.5" fill="url(#slotGradientHeader)" />
                  <rect x="323" y="345" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                  <rect x="345" y="345" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                  <rect x="367" y="345" width="10" height="10" rx="2.5" fill="url(#slotGradientHeader)" />

                  {/* Row 3 */}
                  <rect x="312" y="365" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                  <rect x="334" y="365" width="10" height="10" rx="2.5" fill="url(#slotGradientHeader)" />
                  <rect x="356" y="365" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                  <rect x="378" y="365" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                </g>
              </g>
            </svg>
            <div className="flex flex-col">
              <span className="font-bold text-foreground text-sm leading-tight">{data.name}</span>
              <span className="text-[10px] text-muted-foreground font-semibold tracking-wide mt-0.5">{data.verticalName}</span>
            </div>
          </div>

          {/* Middle Header Widgets */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Czech Formatted Date */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white/35 dark:bg-[#0E0E1B]/35 backdrop-blur-xl border border-slate-200/40 dark:border-[#1F1F35]/40 rounded-full text-slate-500 dark:text-zinc-400 text-[10.5px] font-semibold select-none shadow-sm shadow-slate-100/5 dark:shadow-black/5 hover:border-slate-300 dark:hover:border-zinc-800 transition-colors">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-zinc-500 shrink-0" />
              <span>{czechFormattedDate}</span>
            </div>

            {/* Status Pill (Open/Closed) */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white/35 dark:bg-[#0E0E1B]/35 backdrop-blur-xl border border-slate-200/40 dark:border-[#1F1F35]/40 rounded-full text-[10.5px] font-semibold select-none shadow-sm shadow-slate-100/5 dark:shadow-black/5 hover:border-slate-300 dark:hover:border-zinc-800 transition-colors">
              <span className={`h-1.5 w-1.5 rounded-full shadow-lg shrink-0 animate-pulse ${isOpenNow ? "bg-emerald-500 shadow-[0_0_8px_#10B981]" : "bg-amber-500 shadow-[0_0_8px_#F59E0B]"}`} />
              <span className={isOpenNow ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                {isOpenNow ? "Nyní otevřeno" : "Zavřeno"}
              </span>
            </div>
          </div>

          {/* Integrated Glass Control Dock */}
          <div className="flex items-center bg-white/45 dark:bg-[#0E0E1B]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-2xl p-1 shadow-md shadow-slate-100/5 dark:shadow-black/5 transition-all">
            <ThemeToggle />
            
            <span className="h-6 w-px bg-slate-200/50 dark:bg-[#1F1F35] mx-1 shrink-0" />
            
            {session ? (
              <div className="flex items-center gap-3 pl-2 pr-1 py-0.5">
                {/* Active reservations counter */}
                {userBookingsCount > 0 && (
                  <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-tenant-primary/10 dark:bg-tenant-primary/15 border border-tenant-primary/20 text-tenant-primary dark:text-purple-400 rounded-xl text-[9px] font-extrabold uppercase tracking-wider select-none shadow-[inset_0_0.5px_0.5px_rgba(255,255,255,0.4)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-tenant-primary animate-pulse shrink-0" />
                    <span>{userBookingsCount} {userBookingsCount === 1 ? "rezervace" : userBookingsCount < 5 ? "rezervace" : "rezervací"}</span>
                  </div>
                )}
                
                <div className="hidden sm:flex flex-col text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    {((session.user as any).role === "ADMIN" || session.user?.email === "admin@deepvision.cz") && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-tenant-primary/10 border border-tenant-primary/20 text-tenant-primary uppercase tracking-wide leading-none">
                        Správce
                      </span>
                    )}
                    {(session.user as any).role === "SUPERADMIN" && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-rose-500/10 border border-rose-500/20 text-rose-500 uppercase tracking-wide leading-none">
                        Superadmin
                      </span>
                    )}
                    <Link href={`/tenants/${tenantId}/dashboard`} className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none hover:text-tenant-primary transition-colors">
                      {session.user?.name}
                    </Link>
                  </div>
                  <Link href={`/tenants/${tenantId}/dashboard`} className="text-[9px] text-slate-500 dark:text-zinc-400 mt-1 leading-none hover:underline">
                    Můj profil & rezervace
                  </Link>
                </div>
                
                {/* Avatar with gradient matching brand colors */}
                <Link
                  href={`/tenants/${tenantId}/dashboard`}
                  className="h-8 w-8 rounded-xl bg-gradient-to-tr from-tenant-primary/25 to-tenant-primary/5 dark:from-tenant-primary/30 dark:to-tenant-primary/10 border border-tenant-primary/20 dark:border-tenant-primary/30 text-tenant-primary dark:text-purple-400 flex items-center justify-center font-extrabold text-xs select-none shadow-sm shadow-tenant-primary/5 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="Můj profil a rezervace"
                >
                  {session.user?.name ? session.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U"}
                </Link>
                
                <LogoutButton />
              </div>
            ) : (
              <div className="pl-1 pr-0.5 py-0.5 flex items-center">
                <Link
                  href="?login=true"
                  className="bg-tenant-gradient hover:opacity-95 active:scale-95 transition-all text-white text-xs py-2 px-3.5 flex items-center gap-2 rounded-xl font-bold shadow-sm shadow-tenant-primary/15 cursor-pointer"
                >
                  Přihlásit se přes OneiD
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 grid grid-cols-1 md:grid-cols-2 gap-6 lg:block lg:flow-root">
        
        {/* Calendar Container */}
        <div className="col-span-1 md:col-span-2 order-2 lg:order-none lg:float-left lg:w-[calc(100%-390px)] lg:mr-6 lg:mb-6">
          <div className="mb-2.5 pl-1">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-tenant-primary flex items-center gap-2 select-none">
              <span className="h-1.5 w-1.5 rounded-full bg-tenant-primary shadow-[0_0_8px_var(--tenant-primary)] animate-pulse shrink-0" />
              Týdenní rozvrh a obsazenost
            </h3>
          </div>
          <CalendarView 
            tenantId={tenantId} 
            initialEvents={calendarEvents} 
            session={session}
            resources={activeResources.map(r => ({ 
              id: r.id, 
              name: r.name,
              parentId: ((r.attributes as Record<string, unknown>)?.parentId as string) || null
            }))}
            openTime={openTime}
            closeTime={closeTime}
            openingHours={attributes.openingHours}
            weekStart={formatUTCDate(monday)}
            activeDate={date || formatUTCDate(targetDate)}
          />
        </div>

        {/* Hero Banner Card */}
        <div className="col-span-1 md:col-span-2 order-1 lg:order-none lg:float-left lg:w-[340px] lg:mr-6 lg:mb-6 relative p-0 overflow-hidden bg-white/45 dark:bg-[#0D0D15]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-3xl shadow-md hover:border-tenant-primary/35 transition-all duration-300 shadow-slate-100/5 dark:shadow-black/10 group">
          {/* Top border glowing highlight */}
          <div className="absolute top-0 inset-x-0 h-1 bg-tenant-gradient opacity-90 z-20" />
          
          <div className="relative overflow-hidden">
            <TenantBanner 
              src={attributes.bannerImage} 
              alt="Tenant Banner" 
              heightClass="h-48"
              className="border-b border-slate-200/40 dark:border-[#1F1F35]/40"
              fallbackText={data.name || "Welcome"}
              objectPosition={attributes.bannerPosition || "center"}
            />
            {/* Floating Glass category badge */}
            <span className="absolute top-4 left-4 z-10 backdrop-blur-md bg-black/40 dark:bg-black/60 border border-white/20 text-white text-[9px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 select-none transition-transform duration-300 hover:scale-105">
              <span className="h-1.5 w-1.5 rounded-full bg-tenant-primary shadow-[0_0_8px_var(--tenant-primary)] animate-pulse" />
              {data.verticalName}
            </span>
            
            {/* Subtle soft overlay fade */}
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white/10 dark:from-[#0D0D15]/10 to-transparent pointer-events-none" />
          </div>
          
          <div className="p-6">
            {/* Dynamic Status / Hours Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-3 select-none shadow-[inset_0_0.5px_0.5px_rgba(255,255,255,0.4)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Dnes otevřeno: {openTime} - {closeTime}
            </span>
            
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-200 tracking-tight mb-2.5 leading-snug">
              Vítejte v {data.name}
            </h2>
            <p className="text-slate-600 dark:text-zinc-400 text-[11.5px] font-medium leading-relaxed">
              {tenant.vertical === "SPORTS_GROUND" 
                ? `${tagline}. Vyberte si plochu nebo sektor níže, prohlédněte si detaily a obsazenost v kalendáři a rezervujte si svůj termín.`
                : `${tagline}. Vyberte si program níže, prohlédněte si detaily, volnou kapacitu a rezervujte si své místo.`}
            </p>
            
            {/* Verified portal banner footer */}
            <div className="mt-5 pt-4 border-t border-slate-200/40 dark:border-[#1F1F35]/40 flex items-center justify-between text-[10px] text-slate-500 dark:text-zinc-400 font-medium select-none">
              <div className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-tenant-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Ověřený partner <strong>ReSys</strong></span>
              </div>
              <span className="font-semibold text-slate-400 dark:text-zinc-500">
                {tenant.vertical === "SPORTS_GROUND" ? "Sportoviště" : "Kurzy a lekce"}
              </span>
            </div>
          </div>
        </div>

        {/* Section Heading for Cards */}
        {activeResources.length > 0 && (
          <div className="col-span-1 md:col-span-2 order-3 lg:order-none lg:float-left lg:w-[340px] lg:mr-6 lg:mb-4 lg:mt-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-tenant-primary flex items-center gap-2 select-none">
              <span className="h-1.5 w-1.5 rounded-full bg-tenant-primary shadow-[0_0_8px_var(--tenant-primary)] animate-pulse shrink-0" />
              {tenant.vertical === "SPORTS_GROUND" ? "Dostupné plochy a sektory" : "Dostupné programy a lekce"}
            </h3>
          </div>
        )}

        {/* Available Spaces Cards */}
        {activeResources.map((res) => (
          <ResourceCard
            key={res.id}
            resource={res as any}
            vertical={tenant.vertical}
            openTime={openTime}
            closeTime={closeTime}
            allResources={activeResources as any}
            className="col-span-1 order-4 lg:order-none lg:float-left lg:w-[340px] lg:mr-6 lg:mb-6 lg:h-[400px]"
            footer={
              session ? (
                <div className="flex items-center justify-center gap-2 py-2 text-xs font-bold text-tenant-primary bg-tenant-primary/5 dark:bg-tenant-primary/10 border border-tenant-primary/20 dark:border-tenant-primary/30 rounded-xl select-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-tenant-primary shadow-[0_0_8px_var(--tenant-primary)] animate-pulse shrink-0" />
                  <span>Pro rezervaci klikněte do kalendáře</span>
                </div>
              ) : (
                <Link
                  href="?login=true"
                  className="w-full py-2 text-center text-xs block rounded-xl font-bold bg-white/50 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-300/60 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-700 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer shadow-sm"
                >
                  Přihlásit se pro rezervaci
                </Link>
              )
            }
          />
        ))}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/40 dark:border-[#1F1F35]/40 py-12 text-slate-500 dark:text-zinc-400 text-xs bg-white/10 dark:bg-[#07070C]/20 transition-colors backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 flex flex-col items-center justify-center text-center gap-5">
          {/* Brand/logo badge */}
          <div className="flex items-center gap-2 select-none">
            <span className="font-extrabold tracking-tight text-slate-800 dark:text-slate-200 text-sm">
              Re<span className="text-tenant-primary">Sys</span>
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981] animate-pulse" title="Všechny systémy funkční" />
            <span className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest pl-1">PORTÁL</span>
          </div>
          
          <div className="flex flex-col items-center gap-1.5 text-slate-500 dark:text-zinc-400">
            <p className="max-w-md leading-relaxed">
              Tento rezervační portál využívá systém <span className="font-medium text-slate-700 dark:text-zinc-300">ReSys</span> pro správu ploch, lekcí a rezervací.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500">
              Všechna data jsou chráněna a šifrována. Zabezpečené přihlášení přes SSO.
            </p>
          </div>
          
          <div className="h-px w-12 bg-slate-200 dark:bg-[#1F1F35]" />
          
          <div className="flex items-center gap-2.5 bg-slate-100/60 dark:bg-[#131322]/50 border border-slate-200/50 dark:border-[#2A2A40]/50 rounded-full py-1.5 px-4 text-[10px] font-semibold tracking-wide shadow-sm hover:border-slate-300 dark:hover:border-[#383857] transition-all">
            <span className="text-slate-400 dark:text-zinc-500">Jednotné přihlášení:</span>
            <a 
              href="https://oneid.cz" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-tenant-primary hover:underline transition-colors flex items-center gap-1"
            >
              OneiD SSO
              <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
          
          <p className="text-[10px] text-slate-400 dark:text-zinc-600 mt-2">
            © {new Date().getFullYear()} ReSys. Všechna práva vyhrazena.
          </p>
        </div>
      </footer>
      <LoginModal tenantId={tenantId} />
      <AIAssistant 
        tenantId={tenantId} 
        resources={activeResources.map(r => ({ 
          id: r.id, 
          name: r.name,
          parentId: ((r.attributes as Record<string, unknown>)?.parentId as string) || null
        }))}
        initialEvents={calendarEvents}
        tenantName={tenant.name}
        tenantVertical={tenant.vertical}
        tenantTagline={attributes.tagline || ""}
        tenantAiInstructions={attributes.aiInstructions || ""}
      />
    </div>
  );
}

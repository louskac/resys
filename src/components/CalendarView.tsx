"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Check, Calendar, AlertCircle, ShieldCheck, Lock, ChevronDown, X, Ticket, Loader2 } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import ConfirmDialog from "./ConfirmDialog";
import AlertDialog from "./AlertDialog";
import Pusher from "pusher-js";

export interface CalendarEvent {
  id: string;
  name: string;
  room: string;
  instructor: string;
  dayIndex: number; // 0 (Monday) to 6 (Sunday)
  startHour: number; // e.g. 12.5 for 12:30
  durationHours: number; // e.g. 1.5 for 1.5 hours (90 mins)
  resourceId: string;
  isOccupied?: boolean;
  resourceName?: string;
  lane?: number;
  totalLanes?: number;
  recurrenceGroup?: string | null;
  status?: string;
}

export interface Partner {
  id: string;
  name: string;
  email: string;
  active: boolean;
}

interface CalendarViewProps {
  tenantId: string;
  initialEvents: CalendarEvent[];
  session: { user?: { name?: string | null; email?: string | null } } | null;
  resources: { 
    id: string; 
    name: string; 
    parentId?: string | null;
    scheduleRules?: {
      id: string;
      name: string;
      dayOfWeek: number | null;
      startTime: string;
      endTime: string;
      price: string;
      maxCapacity: number;
    }[];
    attributes?: {
      openTime?: string;
      closeTime?: string;
      openingHours?: {
        dayOfWeek: number;
        openTime: string;
        closeTime: string;
        closed: boolean;
      }[];
    };
  }[];
  openTime?: string;
  closeTime?: string;
  weekStart?: string;
  activeDate?: string;
  isAdmin?: boolean;
  openingHours?: {
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    closed: boolean;
  }[];
  partners?: Partner[];
}

const SLOT_HEIGHT = 60;
const HOUR_HEIGHT = SLOT_HEIGHT * 2;

// DAYS is dynamically generated inside CalendarView based on baseDate

const getOpeningSlots = (openTime: string = "08:00", closeTime: string = "18:00") => {
  const slots = [];
  const [openHours, openMins] = openTime.split(":").map(Number);
  const [closeHours, closeMins] = closeTime.split(":").map(Number);
  
  let current = openHours * 60 + openMins;
  const end = closeHours * 60 + closeMins;
  
  while (current < end) {
    const hh = Math.floor(current / 60);
    const mm = current % 60;
    slots.push(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
    current += 30; // 30 min intervals
  }
  return slots;
}

const defaultOpeningHours = [
  { dayOfWeek: 1, name: "Pondělí", openTime: "08:00", closeTime: "22:00", closed: false },
  { dayOfWeek: 2, name: "Úterý", openTime: "08:00", closeTime: "22:00", closed: false },
  { dayOfWeek: 3, name: "Středa", openTime: "08:00", closeTime: "22:00", closed: false },
  { dayOfWeek: 4, name: "Čtvrtek", openTime: "08:00", closeTime: "22:00", closed: false },
  { dayOfWeek: 5, name: "Pátek", openTime: "08:00", closeTime: "22:00", closed: false },
  { dayOfWeek: 6, name: "Sobota", openTime: "09:00", closeTime: "17:00", closed: false },
  { dayOfWeek: 0, name: "Neděle", openTime: "09:00", closeTime: "17:00", closed: false }
];

const formatDurationCzech = (val: number) => {
  if (val === 0.5) return "30 minut";
  if (val === 1) return "1 hodina";
  if (val === 1.5) return "1,5 hodiny";
  if (val === 2) return "2 hodiny";
  if (val === 2.5) return "2,5 hodiny";
  if (val === 3) return "3 hodiny";
  if (val === 3.5) return "3,5 hodiny";
  if (val === 4) return "4 hodiny";
  if (val === 4.5) return "4,5 hodiny";
  if (val === 5) return "5 hodin";
  if (val === 6) return "6 hodin";
  if (val === 8) return "8 hodin";
  return `${val} hod.`;
};

const formatResourceTag = (name?: string) => {
  if (!name) return "";
  const clean = name.split(" (")[0];
  return clean
    .replace(/sektor\s+/i, "Sek. ")
    .replace(/sector\s+/i, "Sek. ")
    .replace(/celá plocha/i, "Plocha");
};

const sapphireV2StylesMap: Record<string, {
  badgeBg: string;
  themeClassOccupied: string;
  themeClassFree: string;
  textHex: string;
  barColor: string;
  glowColor: string;
  colorName: string;
}> = {
  rose: {
    badgeBg: "bg-tenant-primary/10 dark:bg-tenant-primary/20 text-tenant-primary dark:text-zinc-200 border border-tenant-primary/15 dark:border-tenant-primary/10 font-bold text-[7.5px] tracking-wide rounded-none px-1.5 py-0.5 uppercase",
    themeClassOccupied: "bg-white dark:bg-[#0E0E18] border-l-[4px] border-l-tenant-primary border-y border-r border-[#E2E2ED]/85 dark:border-[#1F1F2E]/85 text-tenant-primary dark:text-zinc-100 shadow-sm rounded-none hover:scale-[1.01] hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:shadow-md transition-all duration-300 ease-out font-medium",
    themeClassFree: "bg-white dark:bg-[#0E0E18] border border-[#E2E2ED] dark:border-[#1F1F2E] text-slate-800 dark:text-slate-355 hover:border-tenant-primary/40 dark:hover:border-tenant-primary/30 hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:scale-[1.01] hover:shadow-md transition-all duration-300 ease-out shadow-sm rounded-none",
    textHex: "text-tenant-primary dark:text-zinc-100",
    barColor: "bg-tenant-primary shadow-[0_0_8px_#7000FF]",
    glowColor: "rgba(112,0,255,0.15)",
    colorName: "rose"
  },
  amber: {
    badgeBg: "bg-tenant-primary/10 dark:bg-tenant-primary/20 text-tenant-primary dark:text-zinc-200 border border-tenant-primary/15 dark:border-tenant-primary/10 font-bold text-[7.5px] tracking-wide rounded-none px-1.5 py-0.5 uppercase",
    themeClassOccupied: "bg-white dark:bg-[#0E0E18] border-l-[4px] border-l-tenant-primary border-y border-r border-[#E2E2ED]/85 dark:border-[#1F1F2E]/85 text-tenant-primary dark:text-zinc-100 shadow-sm rounded-none hover:scale-[1.01] hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:shadow-md transition-all duration-300 ease-out font-medium",
    themeClassFree: "bg-white dark:bg-[#0E0E18] border border-[#E2E2ED] dark:border-[#1F1F2E] text-slate-800 dark:text-slate-355 hover:border-tenant-primary/40 dark:hover:border-tenant-primary/30 hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:scale-[1.01] hover:shadow-md transition-all duration-300 ease-out shadow-sm rounded-none",
    textHex: "text-tenant-primary dark:text-zinc-100",
    barColor: "bg-tenant-primary shadow-[0_0_8px_#7000FF]",
    glowColor: "rgba(112,0,255,0.15)",
    colorName: "amber"
  },
  emerald: {
    badgeBg: "bg-tenant-primary/10 dark:bg-tenant-primary/20 text-tenant-primary dark:text-zinc-200 border border-tenant-primary/15 dark:border-tenant-primary/10 font-bold text-[7.5px] tracking-wide rounded-none px-1.5 py-0.5 uppercase",
    themeClassOccupied: "bg-white dark:bg-[#0E0E18] border-l-[4px] border-l-tenant-primary border-y border-r border-[#E2E2ED]/85 dark:border-[#1F1F2E]/85 text-tenant-primary dark:text-zinc-100 shadow-sm rounded-none hover:scale-[1.01] hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:shadow-md transition-all duration-300 ease-out font-medium",
    themeClassFree: "bg-white dark:bg-[#0E0E18] border border-[#E2E2ED] dark:border-[#1F1F2E] text-slate-800 dark:text-slate-355 hover:border-tenant-primary/40 dark:hover:border-tenant-primary/30 hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:scale-[1.01] hover:shadow-md transition-all duration-300 ease-out shadow-sm rounded-none",
    textHex: "text-tenant-primary dark:text-zinc-100",
    barColor: "bg-tenant-primary shadow-[0_0_8px_#7000FF]",
    glowColor: "rgba(112,0,255,0.15)",
    colorName: "emerald"
  },
  orange: {
    badgeBg: "bg-tenant-primary/10 dark:bg-tenant-primary/20 text-tenant-primary dark:text-zinc-200 border border-tenant-primary/15 dark:border-tenant-primary/10 font-bold text-[7.5px] tracking-wide rounded-none px-1.5 py-0.5 uppercase",
    themeClassOccupied: "bg-white dark:bg-[#0E0E18] border-l-[4px] border-l-tenant-primary border-y border-r border-[#E2E2ED]/85 dark:border-[#1F1F2E]/85 text-tenant-primary dark:text-zinc-100 shadow-sm rounded-none hover:scale-[1.01] hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:shadow-md transition-all duration-300 ease-out font-medium",
    themeClassFree: "bg-white dark:bg-[#0E0E18] border border-[#E2E2ED] dark:border-[#1F1F2E] text-slate-800 dark:text-slate-355 hover:border-tenant-primary/40 dark:hover:border-tenant-primary/30 hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:scale-[1.01] hover:shadow-md transition-all duration-300 ease-out shadow-sm rounded-none",
    textHex: "text-tenant-primary dark:text-zinc-100",
    barColor: "bg-tenant-primary shadow-[0_0_8px_#7000FF]",
    glowColor: "rgba(112,0,255,0.15)",
    colorName: "orange"
  },
  blue: {
    badgeBg: "bg-tenant-primary/10 dark:bg-tenant-primary/20 text-tenant-primary dark:text-zinc-200 border border-tenant-primary/15 dark:border-tenant-primary/10 font-bold text-[7.5px] tracking-wide rounded-none px-1.5 py-0.5 uppercase",
    themeClassOccupied: "bg-white dark:bg-[#0E0E18] border-l-[4px] border-l-tenant-primary border-y border-r border-[#E2E2ED]/85 dark:border-[#1F1F2E]/85 text-tenant-primary dark:text-zinc-100 shadow-sm rounded-none hover:scale-[1.01] hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:shadow-md transition-all duration-300 ease-out font-medium",
    themeClassFree: "bg-white dark:bg-[#0E0E18] border border-[#E2E2ED] dark:border-[#1F1F2E] text-slate-800 dark:text-slate-355 hover:border-tenant-primary/40 dark:hover:border-tenant-primary/30 hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:scale-[1.01] hover:shadow-md transition-all duration-300 ease-out shadow-sm rounded-none",
    textHex: "text-tenant-primary dark:text-zinc-100",
    barColor: "bg-tenant-primary shadow-[0_0_8px_#7000FF]",
    glowColor: "rgba(112,0,255,0.15)",
    colorName: "blue"
  },
  violet: {
    badgeBg: "bg-tenant-primary/10 dark:bg-tenant-primary/20 text-tenant-primary dark:text-zinc-200 border border-tenant-primary/15 dark:border-tenant-primary/10 font-bold text-[7.5px] tracking-wide rounded-none px-1.5 py-0.5 uppercase",
    themeClassOccupied: "bg-white dark:bg-[#0E0E18] border-l-[4px] border-l-tenant-primary border-y border-r border-[#E2E2ED]/85 dark:border-[#1F1F2E]/85 text-tenant-primary dark:text-zinc-100 shadow-sm rounded-none hover:scale-[1.01] hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:shadow-md transition-all duration-300 ease-out font-medium",
    themeClassFree: "bg-white dark:bg-[#0E0E18] border border-[#E2E2ED] dark:border-[#1F1F2E] text-slate-800 dark:text-slate-355 hover:border-tenant-primary/40 dark:hover:border-tenant-primary/30 hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:scale-[1.01] hover:shadow-md transition-all duration-300 ease-out shadow-sm rounded-none",
    textHex: "text-tenant-primary dark:text-zinc-100",
    barColor: "bg-tenant-primary shadow-[0_0_8px_#7000FF]",
    glowColor: "rgba(112,0,255,0.15)",
    colorName: "violet"
  },
  indigo: {
    badgeBg: "bg-tenant-primary/10 dark:bg-tenant-primary/20 text-tenant-primary dark:text-zinc-200 border border-tenant-primary/15 dark:border-tenant-primary/10 font-bold text-[7.5px] tracking-wide rounded-none px-1.5 py-0.5 uppercase",
    themeClassOccupied: "bg-white dark:bg-[#0E0E18] border-l-[4px] border-l-tenant-primary border-y border-r border-[#E2E2ED]/85 dark:border-[#1F1F2E]/85 text-tenant-primary dark:text-zinc-100 shadow-sm rounded-none hover:scale-[1.01] hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:shadow-md transition-all duration-300 ease-out font-medium",
    themeClassFree: "bg-white dark:bg-[#0E0E18] border border-[#E2E2ED] dark:border-[#1F1F2E] text-slate-800 dark:text-slate-355 hover:border-tenant-primary/40 dark:hover:border-tenant-primary/30 hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:scale-[1.01] hover:shadow-md transition-all duration-300 ease-out shadow-sm rounded-none",
    textHex: "text-tenant-primary dark:text-zinc-100",
    barColor: "bg-tenant-primary shadow-[0_0_8px_#7000FF]",
    glowColor: "rgba(112,0,255,0.15)",
    colorName: "indigo"
  },
  cyan: {
    badgeBg: "bg-tenant-primary/10 dark:bg-tenant-primary/20 text-tenant-primary dark:text-zinc-200 border border-tenant-primary/15 dark:border-tenant-primary/10 font-bold text-[7.5px] tracking-wide rounded-none px-1.5 py-0.5 uppercase",
    themeClassOccupied: "bg-white dark:bg-[#0E0E18] border-l-[4px] border-l-tenant-primary border-y border-r border-[#E2E2ED]/85 dark:border-[#1F1F2E]/85 text-tenant-primary dark:text-zinc-100 shadow-sm rounded-none hover:scale-[1.01] hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:shadow-md transition-all duration-300 ease-out font-medium",
    themeClassFree: "bg-white dark:bg-[#0E0E18] border border-[#E2E2ED] dark:border-[#1F1F2E] text-slate-800 dark:text-slate-355 hover:border-tenant-primary/40 dark:hover:border-tenant-primary/30 hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:scale-[1.01] hover:shadow-md transition-all duration-300 ease-out shadow-sm rounded-none",
    textHex: "text-tenant-primary dark:text-zinc-100",
    barColor: "bg-tenant-primary shadow-[0_0_8px_#7000FF]",
    glowColor: "rgba(112,0,255,0.15)",
    colorName: "cyan"
  }
};


interface SwitcherOption<T> {
  value: T;
  label: string;
}

interface UnifiedSwitcherProps<T> {
  options: SwitcherOption<T>[];
  activeValue: T;
  onChange: (value: T) => void;
}

function UnifiedSwitcher<T>({ options, activeValue, onChange }: UnifiedSwitcherProps<T>) {
  return (
    <div className="flex items-center bg-slate-200/50 dark:bg-black/60 border border-slate-300 dark:border-zinc-700 divide-x divide-slate-300 dark:divide-zinc-700 rounded-none w-fit max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden shadow-sm">
      {options.map((option) => {
        const isActive = activeValue === option.value;
        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className={`px-5 py-2 text-[10px] font-extrabold uppercase tracking-widest transition-all duration-200 cursor-pointer whitespace-nowrap rounded-none ${
              isActive
                ? "bg-tenant-primary/15 text-tenant-primary font-black shadow-[inset_0_-2px_0_0_var(--tenant-primary)]"
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200/5 dark:hover:bg-white/5"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default function CalendarView({ 
  tenantId, 
  initialEvents, 
  session, 
  resources,
  openTime = "08:00",
  closeTime = "18:00",
  activeDate,
  isAdmin = false,
  openingHours = defaultOpeningHours,
  partners = [],
  weekStart
}: CalendarViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rootResources = resources.filter(r => !r.parentId);

  // Helper to trace all ancestors of a resource (n-level nesting)
  const getAncestors = (id: string): string[] => {
    const res = resources.find(r => r.id === id);
    if (!res || !res.parentId) return [];
    return [res.parentId, ...getAncestors(res.parentId)];
  };

  // Slugify helper to make resource names URL-friendly
  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents/diacritics
      .replace(/\s+/g, "-")           // Replace spaces with -
      .replace(/[^\w\-]+/g, "")       // Remove all non-word chars
      .replace(/\-\-+/g, "-")         // Replace multiple - with single -
      .replace(/^-+/, "")             // Trim - from start
      .replace(/-+$/, "");            // Trim - from end
  };

  // Generates a clean slug e.g. "cela-plocha-6288f5f1"
  const getResourceSlug = (res: { id: string; name: string }) => {
    const cleanName = slugify(res.name);
    const shortId = res.id.slice(0, 8);
    return `${cleanName}-${shortId}`;
  };

  // Resolves a resource slug or raw ID back to a resource
  const findResourceBySlugOrId = (slugOrId: string | null) => {
    if (!slugOrId) return null;
    const exactMatch = resources.find(r => r.id === slugOrId);
    if (exactMatch) return exactMatch;

    // Match by first 8 characters suffix/prefix
    const parts = slugOrId.split("-");
    const suffix = parts[parts.length - 1];
    if (suffix && suffix.length === 8) {
      const match = resources.find(r => r.id.startsWith(suffix));
      if (match) return match;

      // Fallback: search by name without the stale ID suffix
      const namePart = parts.slice(0, -1).join("-");
      const matchByName = resources.find(r => slugify(r.name) === namePart);
      if (matchByName) return matchByName;
    }
    return resources.find(r => slugify(r.name) === slugOrId) || null;
  };
  
  const activeRootId = (() => {
    const rootFromUrl = searchParams.get("root") || searchParams.get("rootId");
    const matchedRes = findResourceBySlugOrId(rootFromUrl);
    if (matchedRes) {
      const ancestors = getAncestors(matchedRes.id);
      const rootAncestorId = ancestors.length > 0 ? ancestors[ancestors.length - 1] : matchedRes.id;
      if (rootResources.some(r => r.id === rootAncestorId)) {
        return rootAncestorId;
      }
    }
    return rootResources[0]?.id || "";
  })();

  const selectedResourceId = (() => {
    const resFromUrl = searchParams.get("resource") || searchParams.get("resourceId");
    const matchedRes = findResourceBySlugOrId(resFromUrl);
    if (matchedRes && resources.some(r => r.id === matchedRes.id)) {
      const isDescendantOfActiveRoot = matchedRes.id === activeRootId || getAncestors(matchedRes.id).includes(activeRootId);
      if (isDescendantOfActiveRoot) {
        return matchedRes.id;
      }
    }
    return activeRootId;
  })();

  const selectRoot = (rootId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const rootRes = resources.find(r => r.id === rootId);
    if (rootRes) {
      const slug = getResourceSlug(rootRes);
      params.set("root", slug);
      params.set("resource", slug);
    } else {
      params.set("root", rootId);
      params.set("resource", rootId);
    }
    // Clean up old UUID parameters
    params.delete("rootId");
    params.delete("resourceId");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const selectResource = (resId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const res = resources.find(r => r.id === resId);
    if (res) {
      const slug = getResourceSlug(res);
      params.set("resource", slug);
    } else {
      params.set("resource", resId);
    }
    // Clean up old UUID parameter
    params.delete("resourceId");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const [isBooked, setIsBooked] = useState(false);
  const [isPendingPayment, setIsPendingPayment] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");
  const [isHorizontal, setIsHorizontal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setViewMode("day");
    }
  }, []);

  const bookingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const closeBookingModalAndRefresh = () => {
    if (bookingTimeoutRef.current) {
      clearTimeout(bookingTimeoutRef.current);
      bookingTimeoutRef.current = null;
    }
    setBookingType(null);
    setSelectedEvent(null);
    setSelectedDayIndex(null);
    setIsBooked(false);
    setIsPendingPayment(false);
    setGuestName("");
    setGuestEmail("");
    setSelectedPartnerId("");
    setModalError(null);
    setIsPending(false);
    setRecurrencePattern("none");
    setRecurrenceCount(4);
    router.refresh();
  };

  const baseDate = activeDate 
    ? new Date(`${activeDate}T00:00:00`) 
    : (mounted ? new Date() : new Date("2026-06-22T00:00:00"));

  const activeDayDbIndex = React.useMemo(() => {
    const dayIndex = baseDate.getDay();
    return dayIndex === 0 ? 6 : dayIndex - 1;
  }, [baseDate]);

  const horizontalColumns = React.useMemo(() => {
    const activeRootRes = resources.find(r => r.id === activeRootId);
    if (!activeRootRes) return resources;

    const getDescendants = (id: string): any[] => {
      const children = resources.filter(r => r.parentId === id);
      return [
        resources.find(r => r.id === id),
        ...children.flatMap(child => getDescendants(child.id))
      ].filter(Boolean);
    };

    const descendants = getDescendants(activeRootId);
    if (descendants.length <= 1) {
      // If the selected root has no children, show all root resources
      return resources.filter(r => !r.parentId);
    }
    return descendants;
  }, [resources, activeRootId]);

  const toLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getMondayOfDate = (d: Date) => {
    const temp = new Date(d);
    const day = temp.getDay();
    const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(temp.setDate(diff));
    mon.setHours(0, 0, 0, 0);
    return mon;
  };

  const ALL_WEEK_DAYS = Array.from({ length: 7 }, (_, i) => {
    const monday = getMondayOfDate(baseDate);
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dayNamesAbbr = ["ne", "po", "út", "st", "čt", "pá", "so"];
    const dayIndex = d.getDay();
    const label = `${dayNamesAbbr[dayIndex]} ${d.getDate()}. ${d.getMonth() + 1}.`;
    const keys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const fullNames = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];
    return {
      label,
      key: keys[dayIndex],
      name: fullNames[dayIndex],
      date: d,
      dbDayIndex: i
    };
  });

  const DAYS = viewMode === "day"
    ? (() => {
        const dayIndex = baseDate.getDay();
        const dbDayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
        return [ALL_WEEK_DAYS[dbDayIndex]];
      })()
    : ALL_WEEK_DAYS;

  const handlePrevWeek = () => {
    const prev = new Date(baseDate);
    if (viewMode === "day") {
      prev.setDate(baseDate.getDate() - 1);
    } else if (viewMode === "month") {
      prev.setMonth(baseDate.getMonth() - 1);
    } else {
      prev.setDate(baseDate.getDate() - 7);
    }
    const dateStr = toLocalDateString(prev);
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", dateStr);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleNextWeek = () => {
    const next = new Date(baseDate);
    if (viewMode === "day") {
      next.setDate(baseDate.getDate() + 1);
    } else if (viewMode === "month") {
      next.setMonth(baseDate.getMonth() + 1);
    } else {
      next.setDate(baseDate.getDate() + 7);
    }
    const dateStr = toLocalDateString(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", dateStr);
    router.push(`${pathname}?${params.toString()}`);
  };

  const isCurrent = (() => {
    if (!currentTime) return true;
    const today = new Date(currentTime);
    if (viewMode === "day") {
      return today.getDate() === baseDate.getDate() &&
             today.getMonth() === baseDate.getMonth() &&
             today.getFullYear() === baseDate.getFullYear();
    } else if (viewMode === "month") {
      return today.getMonth() === baseDate.getMonth() &&
             today.getFullYear() === baseDate.getFullYear();
    } else {
      const todayMonday = getMondayOfDate(today);
      const baseMonday = getMondayOfDate(baseDate);
      return todayMonday.getTime() === baseMonday.getTime();
    }
  })();

  const handleToday = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("date");
    router.push(`${pathname}?${params.toString()}`);
  };

  const monthNamesCzech = [
    "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
    "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"
  ];

  let headerTitle = "";
  if (isHorizontal) {
    const dayNames = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];
    headerTitle = `${dayNames[baseDate.getDay()]} ${baseDate.getDate()}. ${baseDate.getMonth() + 1}. ${baseDate.getFullYear()}`;
  } else if (viewMode === "day") {
    headerTitle = `${baseDate.getDate()}. ${baseDate.getMonth() + 1}. ${baseDate.getFullYear()}`;
  } else if (viewMode === "month") {
    headerTitle = `${monthNamesCzech[baseDate.getMonth()]} ${baseDate.getFullYear()}`;
  } else {
    const monday = getMondayOfDate(baseDate);
    const startDay = monday.getDate();
    const startMonth = monday.getMonth() + 1;
    const startYear = monday.getFullYear();
    
    const endOfWeekDate = new Date(monday);
    endOfWeekDate.setDate(monday.getDate() + 6);
    const endDay = endOfWeekDate.getDate();
    const endMonth = endOfWeekDate.getMonth() + 1;
    const endYear = endOfWeekDate.getFullYear();

    if (startYear === endYear) {
      if (startMonth === endMonth) {
        headerTitle = `${startDay}. – ${endDay}. ${startMonth}. ${startYear}`;
      } else {
        headerTitle = `${startDay}. ${startMonth}. – ${endDay}. ${endMonth}. ${startYear}`;
      }
    } else {
      headerTitle = `${startDay}. ${startMonth}. ${startYear} – ${endDay}. ${endMonth}. ${endYear}`;
    }
  }

  useEffect(() => {
    setMounted(true);
    const startTimer = setTimeout(() => {
      setCurrentTime(new Date());
    }, 0);
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => {
      clearTimeout(startTimer);
      clearInterval(timer);
    };
  }, []);

  // Check for day/week rollover when the tab becomes active or gains focus
  useEffect(() => {
    if (!mounted) return;

    const handleFocusOrVisibility = () => {
      if (document.hidden) return;

      const clientTodayStr = toLocalDateString(new Date());
      const hasExplicitDate = searchParams.has("date");

      // If user is on the default view (showing today's week) and the date has rolled over
      if (!hasExplicitDate && activeDate && activeDate !== clientTodayStr) {
        console.log(`[CalendarView] Date rollover detected (Active: ${activeDate}, Current: ${clientTodayStr}). Auto-refreshing view...`);
        router.refresh();
      }
    };

    window.addEventListener("focus", handleFocusOrVisibility);
    document.addEventListener("visibilitychange", handleFocusOrVisibility);

    // Run once on mount to handle client/server timezone differences or cached pages
    handleFocusOrVisibility();

    return () => {
      window.removeEventListener("focus", handleFocusOrVisibility);
      document.removeEventListener("visibilitychange", handleFocusOrVisibility);
    };
  }, [mounted, activeDate, searchParams, router]);

  // Real-time synchronization (Pusher WebSockets + Native Server-Sent Events + Polling fallback)
  useEffect(() => {
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu";

    let pusherClient: Pusher | null = null;
    let channel: any = null;
    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    if (pusherKey) {
      // 1. Pusher WebSockets (configured staging/production)
      try {
        pusherClient = new Pusher(pusherKey, {
          cluster: pusherCluster,
        });

        channel = pusherClient.subscribe(`tenant-${tenantId}`);
        channel.bind("bookings-updated", () => {
          console.log("Real-time Pusher bookings update received. Refreshing calendar data...");
          router.refresh();
        });

        console.log(`Connected to real-time WebSockets (Pusher) for tenant-${tenantId}`);
      } catch (error) {
        console.error("Failed to initialize Pusher real-time client:", error);
      }
    } else if (typeof window !== "undefined" && window.EventSource) {
      // 2. Native Server-Sent Events (SSE) - Zero-Config, Instant Real-Time for Localhost
      try {
        eventSource = new EventSource(`/api/bookings/stream?tenantId=${tenantId}`);
        
        eventSource.addEventListener("bookings-updated", () => {
          console.log("Real-time SSE bookings update received. Refreshing calendar data...");
          router.refresh();
        });

        eventSource.onopen = () => {
          console.log(`Connected to real-time Server-Sent Events (SSE) stream for tenant-${tenantId}`);
        };

        eventSource.onerror = () => {
          // EventSource handles reconnection natively under the hood.
          console.warn("SSE connection error or connection closed. Browser will auto-reconnect...");
        };
      } catch (error) {
        console.error("Failed to initialize Server-Sent Events client:", error);
        startPolling();
      }
    } else {
      // 3. Fallback to smart polling
      startPolling();
    }

    function startPolling() {
      console.log("Real-time streaming unavailable. Falling back to smart polling (every 15s).");
      pollInterval = setInterval(() => {
        router.refresh();
      }, 15000);
    }

    return () => {
      if (channel && pusherClient) {
        channel.unbind_all();
        pusherClient.unsubscribe(`tenant-${tenantId}`);
        pusherClient.disconnect();
      }
      if (eventSource) {
        eventSource.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [tenantId, router]);

  const isSlotInPast = (dayIdx: number, timeStr: string) => {
    if (!currentTime) return false;
    const monday = getMondayOfDate(baseDate);
    const slotDate = new Date(monday);
    slotDate.setDate(monday.getDate() + dayIdx);
    const [sh, sm] = timeStr.split(":").map(Number);
    slotDate.setHours(sh, sm, 0, 0);
    return slotDate <= currentTime;
  };

  const isEventInPast = (dayIdx: number, startHour: number, durationHours: number) => {
    if (!currentTime) return false;
    const monday = getMondayOfDate(baseDate);
    const eventEndDate = new Date(monday);
    eventEndDate.setDate(monday.getDate() + dayIdx);
    const endHour = startHour + durationHours;
    const hh = Math.floor(endHour);
    const mm = Math.round((endHour % 1) * 60);
    eventEndDate.setHours(hh, mm, 0, 0);
    return eventEndDate <= currentTime;
  };

  // Helper functions for concurrent physical sector conflict checks using tree-traversal
  const getConflictingResourceIds = React.useCallback((resId: string) => {
    const getAncestors = (id: string): string[] => {
      const res = resources.find(r => r.id === id);
      if (!res || !res.parentId) return [];
      return [res.parentId, ...getAncestors(res.parentId)];
    };

    const getDescendants = (id: string): string[] => {
      const children = resources.filter(r => r.parentId === id);
      const childIds = children.map(c => c.id);
      const grandchildIds = childIds.flatMap(cid => getDescendants(cid));
      return [...childIds, ...grandchildIds];
    };

    return [
      resId,
      ...getAncestors(resId),
      ...getDescendants(resId)
    ];
  }, [resources]);

  const isResourceAvailable = React.useCallback((resId: string, dayIdx: number | null, startStr: string, duration: number) => {
    if (dayIdx === null) return true;
    const [sh, sm] = startStr.split(":").map(Number);
    const startHour = sh + sm / 60;
    const endHour = startHour + duration;
    
    const conflictingIds = getConflictingResourceIds(resId);
    
    const hasOverlap = initialEvents.some(event => {
      if (!event.isOccupied) return false;
      if (event.dayIndex !== dayIdx) return false;
      if (!conflictingIds.includes(event.resourceId)) return false;
      
      const eventStart = event.startHour;
      const eventEnd = event.startHour + event.durationHours;
      
      return startHour < eventEnd && endHour > eventStart;
    });
    
    return !hasOverlap;
  }, [initialEvents, getConflictingResourceIds]);

  // Dynamic style mapper based on resource name hashes for any N resources
  const getResourceStyles = (resourceName: string, isOccupied?: boolean, isAdminView: boolean = false, status?: string) => {
    const nameLower = (resourceName || "").toLowerCase();
    const cursorClass = isOccupied ? (isAdminView ? "cursor-pointer" : "cursor-not-allowed") : "cursor-pointer";

    if (status === "TECHNICAL_BREAK") {
      return {
        badgeBg: "bg-slate-550/10 dark:bg-slate-500/20 text-slate-500 dark:text-slate-400 border border-slate-500/15 font-bold text-[7.5px] tracking-wide rounded-none px-1.5 py-0.5 uppercase",
        themeClass: `bg-slate-100/50 dark:bg-slate-900/30 border-l-[4px] border-l-slate-400 border-y border-r border-slate-200/40 dark:border-slate-800/40 text-slate-500 dark:text-slate-400 shadow-sm rounded-none ${cursorClass} select-none opacity-80`,
        textHex: "text-slate-550 dark:text-slate-400",
        barColor: "bg-slate-400 dark:bg-slate-600",
        glowColor: "rgba(148,163,184,0.05)",
        colorName: "slate"
      };
    }

    if (status === "CLOSURE") {
      return {
        badgeBg: "bg-red-550/10 dark:bg-red-500/20 text-red-500 dark:text-red-400 border border-red-500/15 font-bold text-[7.5px] tracking-wide rounded-none px-1.5 py-0.5 uppercase",
        themeClass: `bg-red-100/50 dark:bg-red-950/20 border-l-[4px] border-l-red-500 border-y border-r border-red-200/40 dark:border-red-800/40 text-red-500 dark:text-red-400 shadow-sm rounded-none ${cursorClass} select-none opacity-90 bg-stripes-past`,
        textHex: "text-red-550 dark:text-red-400",
        barColor: "bg-red-500 dark:bg-red-600",
        glowColor: "rgba(239,68,68,0.05)",
        colorName: "red"
      };
    }

    // Detect if this resource represents a sector (vs full pitch)
    const isSector = (() => {
      if (nameLower.includes("sektor") || nameLower.includes("sector") || nameLower.includes("sektro") || nameLower.includes("1/2")) {
        return true;
      }
      const res = resources?.find(r => r.name.toLowerCase() === nameLower);
      if (res && res.parentId) {
        return true;
      }
      return false;
    })();

    const getSapphireV2Palette = (colorName: string) => {
      const colorsMap: Record<string, string> = {
        rose: "rose", amber: "amber", emerald: "emerald", orange: "orange",
        blue: "blue", violet: "violet", indigo: "indigo", cyan: "cyan"
      };
      const c = colorsMap[colorName] || "indigo";
      const config = sapphireV2StylesMap[c];

      return {
        badgeBg: config.badgeBg,
        themeClass: isOccupied
          ? `${config.themeClassOccupied} ${cursorClass}`
          : `${config.themeClassFree} ${cursorClass}`,
        textHex: config.textHex,
        barColor: config.barColor,
        glowColor: config.glowColor,
        colorName: config.colorName
      };
    };

    // Explicit mappings for common sectors to maintain layout colors
    if (nameLower.includes("sektor a") || nameLower.includes("sector a")) {
      return getSapphireV2Palette("rose");
    }
    if (nameLower.includes("sektor b") || nameLower.includes("sector b") || nameLower.includes("sektro beta") || nameLower.includes("sector beta")) {
      return getSapphireV2Palette("amber");
    }
    if (nameLower.includes("sektor c") || nameLower.includes("sector c") || nameLower.includes("sektor gamma") || nameLower.includes("sector gamma")) {
      return getSapphireV2Palette("emerald");
    }

    const hash = nameLower.split("").reduce((acc, char) => char.charCodeAt(0) + acc, 0);

    if (isSector) {
      const colors = ["rose", "amber", "emerald", "orange"];
      return getSapphireV2Palette(colors[hash % colors.length]);
    } else {
      const colors = ["blue", "violet", "indigo", "cyan"];
      return getSapphireV2Palette(colors[hash % colors.length]);
    }
  };

  interface VisualEvent extends CalendarEvent {
    left: string;
    width: string;
    lane?: number;
    totalLanes?: number;
  }

  // Google Calendar-style dynamic event overlap lane distribution algorithm
  const layoutDayEvents = (dayEvs: CalendarEvent[]): VisualEvent[] => {
    if (dayEvs.length === 0) return [];

    // Sort events by startHour, then duration descending
    const sorted = [...dayEvs].sort((a, b) => {
      if (a.startHour !== b.startHour) return a.startHour - b.startHour;
      return b.durationHours - a.durationHours;
    });

    const clusters: CalendarEvent[][] = [];
    let currentCluster: CalendarEvent[] = [];
    let clusterEnd = 0;

    // Group events into clusters of overlapping time spans
    sorted.forEach(event => {
      const eventEnd = event.startHour + event.durationHours;
      if (currentCluster.length === 0) {
        currentCluster.push(event);
        clusterEnd = eventEnd;
      } else if (event.startHour < clusterEnd) {
        currentCluster.push(event);
        clusterEnd = Math.max(clusterEnd, eventEnd);
      } else {
        clusters.push(currentCluster);
        currentCluster = [event];
        clusterEnd = eventEnd;
      }
    });
    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    // For each cluster, distribute into separate lanes
    clusters.forEach(cluster => {
      const lanes: CalendarEvent[][] = [];

      cluster.forEach(event => {
        let placed = false;
        for (let i = 0; i < lanes.length; i++) {
          const laneEvents = lanes[i];
          const lastInLane = laneEvents[laneEvents.length - 1];
          const lastEnd = lastInLane.startHour + lastInLane.durationHours;
          
          if (event.startHour >= lastEnd) {
            laneEvents.push(event);
            placed = true;
            event.lane = i;
            break;
          }
        }
        if (!placed) {
          lanes.push([event]);
          event.lane = lanes.length - 1;
        }
      });

      cluster.forEach(event => {
        event.totalLanes = lanes.length;
      });
    });

    return sorted.map(event => {
      const lane = event.lane ?? 0;
      const totalLanes = event.totalLanes ?? 1;
      
      const leftVal = lane * (100 / totalLanes);
      const widthVal = 100 / totalLanes;

      return {
        ...event,
        left: `calc(${leftVal}% + 2px)`,
        width: `calc(${widthVal}% - 4px)`,
        lane,
        totalLanes
      };
    });
  };

  // Booking states
  const [bookingType, setBookingType] = useState<"event" | "custom" | "admin_view" | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [selectedTimeStr, setSelectedTimeStr] = useState<string>("");
  const [customResourceId, setCustomResourceId] = useState<string>("");
  const [customDuration, setCustomDuration] = useState<number>(1.0); // 1 hour default
  const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);
  const [isDurationDropdownOpen, setIsDurationDropdownOpen] = useState(false);

  // Recurrence states
  const [recurrencePattern, setRecurrencePattern] = useState<"none" | "weekly" | "bi-weekly" | "monthly">("none");
  const [recurrenceCount, setRecurrenceCount] = useState<number>(4);

  const isSelectedEventMyBooking = !!(selectedEvent && session?.user?.email && selectedEvent.instructor === session.user.email);

  const [activeTicket, setActiveTicket] = useState<CalendarEvent | null>(null);

  // Dynamic QR Code states
  const [dynamicQrPayload, setDynamicQrPayload] = useState<string>("");
  const [qrState, setQrState] = useState<number>(0);
  const [qrTimeLeft, setQrTimeLeft] = useState<number>(60);

  useEffect(() => {
    if (!activeTicket) {
      setDynamicQrPayload("");
      return;
    }

    let baseTimestamp = Date.now();
    let currentState = 0;
    
    const updatePayload = async (ts: number, state: number) => {
      const bookingId = activeTicket.id;
      const secret = "resys-dynamic-qr-secret-key-2026";
      const dataStr = `${bookingId}:${ts}:${state}`;
      
      try {
        const msgBuffer = new TextEncoder().encode(`${dataStr}:${secret}`);
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
        
        setDynamicQrPayload(`${dataStr}:${hashHex}`);
      } catch (err) {
        console.error("Failed to generate secure QR signature:", err);
        // Fallback to static ID if subtle crypto fails
        setDynamicQrPayload(bookingId);
      }
    };

    // Initial update
    updatePayload(baseTimestamp, currentState);

    // Interval to toggle state (flashes every 1.5 seconds)
    const stateInterval = setInterval(() => {
      currentState = currentState === 0 ? 1 : 0;
      setQrState(currentState);
      updatePayload(baseTimestamp, currentState);
    }, 1500);

    // Interval to update base timestamp every 60 seconds
    const timestampInterval = setInterval(() => {
      baseTimestamp = Date.now();
      setQrTimeLeft(60);
      updatePayload(baseTimestamp, currentState);
    }, 60000);

    // Countdown timer for visualization
    const countdownInterval = setInterval(() => {
      setQrTimeLeft(prev => (prev > 1 ? prev - 1 : 60));
    }, 1000);

    return () => {
      clearInterval(stateInterval);
      clearInterval(timestampInterval);
      clearInterval(countdownInterval);
    };
  }, [activeTicket]);

  const getSelectedEventDateString = (dayIndex: number) => {
    if (!weekStart) return "";
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);
    return date.toLocaleDateString("cs-CZ");
  };

  const getSelectedEventTimeRange = (event: CalendarEvent) => {
    return `${formatHourString(event.startHour)} – ${formatHourString(event.startHour + event.durationHours)}`;
  };

  // Guest booking form states
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [modalError, setModalError] = useState<{ code: string; message: string } | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Custom alert and confirmation modal states
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    onThirdOption?: () => void | Promise<void>;
    thirdOptionLabel?: string;
    confirmLabel?: string;
    cancelLabel?: string;
  } | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; title: string; message: string; onClose?: () => void } | null>(null);

  // AI Assistant custom states
  const [highlightedSlot, setHighlightedSlot] = useState<{
    resourceId?: string;
    dayIndex: number;
    startHour: number;
    duration: number;
  } | null>(null);

  const [draftBooking, setDraftBooking] = useState<{
    resourceId: string;
    dayIndex: number;
    startHour: number;
    duration: number;
    userName: string;
    userEmail?: string;
  } | null>(null);

  // Drag selection states
  const [dragStartSlot, setDragStartSlot] = useState<{ dayIndex: number; timeIndex: number; resourceId?: string } | null>(null);
  const [dragCurrentSlot, setDragCurrentSlot] = useState<{ dayIndex: number; timeIndex: number; resourceId?: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleCellMouseDown = (e: React.MouseEvent, dayIdx: number, timeIdx: number, resourceId?: string) => {
    if (e.button !== 0) return; // Only left-click
    e.preventDefault();
    
    const timeStr = TIME_SLOTS[timeIdx];
    if (isSlotInPast(dayIdx, timeStr)) return;
    
    setIsDragging(true);
    setDragStartSlot({ dayIndex: dayIdx, timeIndex: timeIdx, resourceId });
    setDragCurrentSlot({ dayIndex: dayIdx, timeIndex: timeIdx, resourceId });
  };

  const handleCellMouseEnter = (dayIdx: number, timeIdx: number, resourceId?: string) => {
    if (!isDragging || !dragStartSlot) return;
    
    const timeStr = TIME_SLOTS[timeIdx];
    if (isSlotInPast(dayIdx, timeStr)) return;
    
    if (dayIdx === dragStartSlot.dayIndex && (!isHorizontal || resourceId === dragStartSlot.resourceId)) {
      setDragCurrentSlot({ dayIndex: dayIdx, timeIndex: timeIdx, resourceId });
    }
  };

  const commitDragSelection = () => {
    if (!isDragging || !dragStartSlot || !dragCurrentSlot) return;
    
    const dayIndex = dragStartSlot.dayIndex;
    const minIndex = Math.min(dragStartSlot.timeIndex, dragCurrentSlot.timeIndex);
    const maxIndex = Math.max(dragStartSlot.timeIndex, dragCurrentSlot.timeIndex);
    
    const startTime = TIME_SLOTS[minIndex];
    const durationHours = (maxIndex - minIndex + 1) * 0.5;
    
    handleBackgroundCellClick(dayIndex, startTime);
    setCustomDuration(durationHours);
    if (dragStartSlot.resourceId) {
      setCustomResourceId(dragStartSlot.resourceId);
    }
    
    setIsDragging(false);
    setDragStartSlot(null);
    setDragCurrentSlot(null);
  };

  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragStartSlot(null);
        setDragCurrentSlot(null);
      }
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging]);

  const { calculatedOpenTime, calculatedCloseTime } = React.useMemo(() => {
    const activeRes = resources.find(r => r.id === selectedResourceId);
    
    let currentRes = activeRes;
    let openTimeVal: string | undefined;
    let closeTimeVal: string | undefined;
    
    while (currentRes) {
      // 1. Check custom openTime/closeTime attributes
      if (currentRes.attributes?.openTime && currentRes.attributes?.closeTime) {
        openTimeVal = currentRes.attributes.openTime;
        closeTimeVal = currentRes.attributes.closeTime;
        break;
      }
      
      // 2. Check schedule rules
      const activeRules = currentRes.scheduleRules || [];
      if (activeRules.length > 0) {
        let minMinutes = 24 * 60;
        let maxMinutes = 0;
        activeRules.forEach(rule => {
          const [oh, om] = rule.startTime.split(":").map(Number);
          const [ch, cm] = rule.endTime.split(":").map(Number);
          const openVal = oh * 60 + om;
          const closeVal = ch * 60 + cm;
          if (openVal < minMinutes) minMinutes = openVal;
          if (closeVal > maxMinutes) maxMinutes = closeVal;
        });
        const minH = Math.floor(minMinutes / 60);
        const minM = minMinutes % 60;
        const maxH = Math.floor(maxMinutes / 60);
        const maxM = maxMinutes % 60;
        openTimeVal = `${String(minH).padStart(2, "0")}:${String(minM).padStart(2, "0")}`;
        closeTimeVal = `${String(maxH).padStart(2, "0")}:${String(maxM).padStart(2, "0")}`;
        break;
      }
      
      // 3. Move to parent
      const parentId = currentRes.parentId;
      currentRes = parentId ? resources.find(r => r.id === parentId) : undefined;
    }
    
    if (openTimeVal && closeTimeVal) {
      return { calculatedOpenTime: openTimeVal, calculatedCloseTime: closeTimeVal };
    }

    // Default fallback to global tenant opening hours
    if (!openingHours || openingHours.length === 0) {
      return { calculatedOpenTime: openTime, calculatedCloseTime: closeTime };
    }
    const openDays = openingHours.filter(d => !d.closed);
    if (openDays.length === 0) {
      return { calculatedOpenTime: openTime, calculatedCloseTime: closeTime };
    }
    
    let minMinutes = 24 * 60;
    let maxMinutes = 0;
    
    openDays.forEach(d => {
      const [oh, om] = d.openTime.split(":").map(Number);
      const [ch, cm] = d.closeTime.split(":").map(Number);
      const openVal = oh * 60 + om;
      const closeVal = ch * 60 + cm;
      if (openVal < minMinutes) minMinutes = openVal;
      if (closeVal > maxMinutes) maxMinutes = closeVal;
    });
    
    const minH = Math.floor(minMinutes / 60);
    const minM = minMinutes % 60;
    const maxH = Math.floor(maxMinutes / 60);
    const maxM = maxMinutes % 60;
    
    return {
      calculatedOpenTime: `${String(minH).padStart(2, "0")}:${String(minM).padStart(2, "0")}`,
      calculatedCloseTime: `${String(maxH).padStart(2, "0")}:${String(maxM).padStart(2, "0")}`
    };
  }, [openingHours, openTime, closeTime, selectedResourceId, resources]);

  const TIME_SLOTS = getOpeningSlots(calculatedOpenTime, calculatedCloseTime);
  const startHourOffset = parseInt(calculatedOpenTime.split(":")[0], 10);
  const totalSlotsCount = TIME_SLOTS.length;
  const totalHeightPx = totalSlotsCount * SLOT_HEIGHT;

  const isSlotClosed = React.useCallback((resId: string, dbDayIndex: number, timeStr: string) => {
    const activeRes = resources.find(r => r.id === resId);
    
    let currentRes = activeRes;
    let customOpeningHours: any[] | undefined;
    let customRules: any[] | undefined;
    
    while (currentRes) {
      // 1. Check openingHours attributes
      if (currentRes.attributes?.openingHours && currentRes.attributes?.openingHours.length > 0) {
        customOpeningHours = currentRes.attributes.openingHours;
        break;
      }
      
      // 2. Check scheduleRules
      const rules = currentRes.scheduleRules || [];
      if (rules.length > 0) {
        customRules = rules;
        break;
      }
      
      // 3. Move to parent
      const parentId = currentRes.parentId;
      currentRes = parentId ? resources.find(r => r.id === parentId) : undefined;
    }

    const targetDayOfWeek = dbDayIndex === 6 ? 0 : dbDayIndex + 1;

    if (customOpeningHours) {
      const dayConfig = customOpeningHours.find(d => d.dayOfWeek === targetDayOfWeek);
      if (!dayConfig) return false;
      if (dayConfig.closed) return true;
      
      const [h, m] = timeStr.split(":").map(Number);
      const [oh, om] = dayConfig.openTime.split(":").map(Number);
      const [ch, cm] = dayConfig.closeTime.split(":").map(Number);
      
      const timeVal = h * 60 + m;
      const openVal = oh * 60 + om;
      const closeVal = ch * 60 + cm;
      
      return timeVal < openVal || timeVal >= closeVal;
    }

    if (customRules) {
      const dayRules = customRules.filter(r => r.dayOfWeek === targetDayOfWeek);
      if (dayRules.length === 0) return true; // Closed on this day
      
      const [h, m] = timeStr.split(":").map(Number);
      const timeVal = h * 60 + m;
      
      const isWithinAnyRule = dayRules.some(rule => {
        const [oh, om] = rule.startTime.split(":").map(Number);
        const [ch, cm] = rule.endTime.split(":").map(Number);
        const openVal = oh * 60 + om;
        const closeVal = ch * 60 + cm;
        return timeVal >= openVal && timeVal < closeVal;
      });
      
      return !isWithinAnyRule;
    }

    // Default fallback to global tenant opening hours
    if (!openingHours || openingHours.length === 0) return false;
    const dayConfig = openingHours.find(d => d.dayOfWeek === targetDayOfWeek);
    if (!dayConfig) return false;
    if (dayConfig.closed) return true;
    
    const [h, m] = timeStr.split(":").map(Number);
    const [oh, om] = dayConfig.openTime.split(":").map(Number);
    const [ch, cm] = dayConfig.closeTime.split(":").map(Number);
    
    const timeVal = h * 60 + m;
    const openVal = oh * 60 + om;
    const closeVal = ch * 60 + cm;
    
    return timeVal < openVal || timeVal >= closeVal;
  }, [openingHours, resources]);

  const events = [
    ...selectedResourceId
      ? (initialEvents || []).filter((e) => {
          if (e.resourceId === selectedResourceId) return true;
          if (e.isOccupied) {
            const conflictingIds = getConflictingResourceIds(selectedResourceId);
            return conflictingIds.includes(e.resourceId);
          }
          return false;
        })
      : (initialEvents || []),
    ...(draftBooking && (!selectedResourceId || draftBooking.resourceId === selectedResourceId || getConflictingResourceIds(selectedResourceId).includes(draftBooking.resourceId))
      ? [{
          id: "draft-booking-id",
          name: draftBooking.userName || "Návrh rezervace",
          room: "",
          instructor: "Draft",
          dayIndex: draftBooking.dayIndex,
          startHour: draftBooking.startHour,
          durationHours: draftBooking.duration,
          resourceId: draftBooking.resourceId,
          isOccupied: true,
          resourceName: resources.find(r => r.id === draftBooking.resourceId)?.name || "Plocha",
          isDraft: true
        } as CalendarEvent]
      : [])
  ];

  const formatHourString = (hour: number) => {
    const hh = Math.floor(hour);
    const mm = Math.round((hour % 1) * 60);
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };

  const handleBackgroundCellClick = (dayIndex: number, timeStr: string) => {
    setSelectedDayIndex(dayIndex);
    setSelectedTimeStr(timeStr);
    setBookingType("custom");
    setModalError(null);
    
    // Initialize default resource selection
    if (selectedResourceId) {
      setCustomResourceId(selectedResourceId);
    } else if (resources && resources.length > 0) {
      setCustomResourceId(resources[0].id);
    }
    setCustomDuration(1.0);
    setSelectedEvent(null);
  };

  const handleBooking = async () => {
    if (isPending) return;
    setIsPending(true);
    const monday = getMondayOfDate(baseDate);
    const payload: Record<string, string | number | null | undefined> = {
      tenantId,
      weekStart: toLocalDateString(monday),
    };

    if (bookingType === "event" && selectedEvent) {
      payload.scheduleRuleId = selectedEvent.id;
      payload.dayIndex = selectedEvent.dayIndex;
      payload.recurrencePattern = recurrencePattern;
      payload.recurrenceCount = recurrenceCount;
    } else if (bookingType === "custom" && selectedDayIndex !== null) {
      // Calculate endTime based on custom duration selection
      const [sh, sm] = selectedTimeStr.split(":").map(Number);
      const totalMinutes = sh * 60 + sm + customDuration * 60;
      const eh = Math.floor(totalMinutes / 60);
      const em = totalMinutes % 60;
      const calculatedEndTime = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;

      // Validate closing bounds
      const [ch, cm] = closeTime.split(":").map(Number);
      const closeMinutes = ch * 60 + cm;
      if (totalMinutes > closeMinutes) {
        setModalError({
          code: "OPERATING_HOURS_EXCEEDED",
          message: `The selected duration exceeds portal operating hours (closes at ${closeTime}).`
        });
        setIsPending(false);
        return;
      }

      payload.resourceId = customResourceId;
      payload.dayIndex = selectedDayIndex;
      payload.startTime = selectedTimeStr;
      payload.endTime = calculatedEndTime;
      payload.recurrencePattern = recurrencePattern;
      payload.recurrenceCount = recurrenceCount;
    } else {
      setIsPending(false);
      return;
    }

    if (!session || !session.user || isAdmin) {
      if (!guestName.trim() || !guestEmail.trim()) {
        setModalError({
          code: "MISSING_PARAMETER",
          message: isAdmin 
            ? "Zadejte prosím jméno a e-mail zákazníka."
            : "Please enter your name and email to proceed with guest booking."
        });
        setIsPending(false);
        return;
      }
      payload.guestName = guestName.trim();
      payload.guestEmail = guestEmail.trim();
    }

    if (isAdmin && selectedPartnerId) {
      payload.partnerId = selectedPartnerId;
    }

    try {
      setModalError(null);
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        const errorMsg = err.message || "Failed to confirm reservation.";
        setModalError({
          code: err.code || "UNKNOWN_ERROR",
          message: errorMsg
        });
        setIsPending(false);
        window.dispatchEvent(new CustomEvent("assistant-booking-error", {
          detail: { message: errorMsg }
        }));
        return;
      }

      const data = await res.json();
      if (data.bookingStatus === "PENDING_PAYMENT") {
        setIsPendingPayment(true);
      }
      setIsBooked(true);
      window.dispatchEvent(new CustomEvent("assistant-booking-success"));
      
      if (data.bookingStatus === "PENDING_PAYMENT") {
        const timer = setTimeout(() => {
          window.location.href = `/tenants/${tenantId}/checkout?bookingId=${data.bookingId}`;
        }, 1500);
        bookingTimeoutRef.current = timer;
        return;
      }

      const timer = setTimeout(() => {
        closeBookingModalAndRefresh();
      }, 2000);
      bookingTimeoutRef.current = timer;
    } catch (e) {
      console.error(e);
      const errorMsg = "Error connecting to the server. Please check your network connection.";
      setModalError({
        code: "CONNECTION_FAILED",
        message: errorMsg
      });
      setIsPending(false);
      window.dispatchEvent(new CustomEvent("assistant-booking-error", {
        detail: { message: errorMsg }
      }));
    }
  };

  // AI Assistant Custom DOM event listeners
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ date: string }>;
      if (customEvent.detail && customEvent.detail.date) {
        const dateStr = customEvent.detail.date;
        const params = new URLSearchParams(window.location.search);
        params.set("date", dateStr);
        router.push(`${pathname}?${params.toString()}`);
      }
    };

    const handleSelectRes = (e: Event) => {
      const customEvent = e as CustomEvent<{ resourceId: string }>;
      if (customEvent.detail && customEvent.detail.resourceId) {
        const resId = customEvent.detail.resourceId;
        const res = resources.find(r => r.id === resId);
        if (res) {
          selectResource(resId);
          if (res.parentId) {
            selectRoot(res.parentId);
          } else {
            selectRoot(resId);
          }
        }
      }
    };

    const handleHighlight = (e: Event) => {
      const customEvent = e as CustomEvent<{
        resourceId?: string;
        dayIndex: number;
        startHour: number;
        duration: number;
      } | null>;
      setHighlightedSlot(customEvent.detail);
    };

    const handleSetDraft = (e: Event) => {
      const customEvent = e as CustomEvent<{
        resourceId: string;
        dayIndex: number;
        startHour: number;
        duration: number;
        userName: string;
        userEmail?: string;
        recurrencePattern?: "none" | "weekly" | "bi-weekly" | "monthly";
        recurrenceCount?: number;
      } | null>;
      setDraftBooking(customEvent.detail);
      if (customEvent.detail) {
        setBookingType("custom");
        setCustomResourceId(customEvent.detail.resourceId);
        setSelectedDayIndex(customEvent.detail.dayIndex);
        setSelectedTimeStr(formatHourString(customEvent.detail.startHour));
        setCustomDuration(customEvent.detail.duration);
        setGuestName(customEvent.detail.userName);
        setGuestEmail(customEvent.detail.userEmail || `${customEvent.detail.userName.toLowerCase().replace(/[^a-z0-9]/g, "") || "guest"}@example.com`);
        setRecurrencePattern(customEvent.detail.recurrencePattern || "none");
        setRecurrenceCount(customEvent.detail.recurrenceCount || 4);
      } else {
        setBookingType(null);
      }
    };

    const handleTriggerModal = (e: Event) => {
      const customEvent = e as CustomEvent<{ type: "custom" | "event" | null }>;
      setBookingType(customEvent.detail.type);
    };

    const handlePerformBooking = async () => {
      await handleBooking();
    };

    window.addEventListener("assistant-navigate-date", handleNavigate);
    window.addEventListener("assistant-select-resource", handleSelectRes);
    window.addEventListener("assistant-highlight-slot", handleHighlight);
    window.addEventListener("assistant-set-draft", handleSetDraft);
    window.addEventListener("assistant-trigger-modal", handleTriggerModal);
    window.addEventListener("assistant-perform-booking", handlePerformBooking);

    return () => {
      window.removeEventListener("assistant-navigate-date", handleNavigate);
      window.removeEventListener("assistant-select-resource", handleSelectRes);
      window.removeEventListener("assistant-highlight-slot", handleHighlight);
      window.removeEventListener("assistant-set-draft", handleSetDraft);
      window.removeEventListener("assistant-trigger-modal", handleTriggerModal);
      window.removeEventListener("assistant-perform-booking", handlePerformBooking);
    };
  }, [resources, pathname, router, formatHourString, handleBooking]);

  // Synchronize conflict status with AI assistant HUD
  useEffect(() => {
    if (bookingType === "custom" && selectedDayIndex !== null && selectedTimeStr && customResourceId) {
      const available = isResourceAvailable(customResourceId, selectedDayIndex, selectedTimeStr, customDuration);
      window.dispatchEvent(new CustomEvent("assistant-conflict-status", {
        detail: {
          hasConflict: !available,
          conflictMessage: !available 
            ? "Vybraná plocha/sektor není v tomto čase a délce trvání k dispozici kvůli překrývající se rezervaci." 
            : null
        }
      }));
    } else {
      window.dispatchEvent(new CustomEvent("assistant-conflict-status", {
        detail: {
          hasConflict: false,
          conflictMessage: null
        }
      }));
    }
  }, [bookingType, selectedDayIndex, selectedTimeStr, customResourceId, customDuration, isResourceAvailable]);

  return (
    <div className="p-6 bg-[#FAFAFD] dark:bg-[#060608] text-slate-800 dark:text-slate-100 border border-[#E2E2ED] dark:border-[#1F1F2E] rounded-none relative transition-all duration-300 font-sans shadow-2xl">
      {/* Calendar Header Control */}
      <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 mb-6 border-b border-[#E2E2ED]/60 dark:border-[#1F1F2E] pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <button 
              onClick={handlePrevWeek}
              className="p-2.5 rounded-none bg-slate-200/50 dark:bg-black/60 text-slate-500 dark:text-zinc-400 hover:bg-slate-200/80 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white border border-slate-300 dark:border-zinc-700 hover:scale-105 shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={handleNextWeek}
              className="p-2.5 rounded-none bg-slate-200/50 dark:bg-black/60 text-slate-500 dark:text-zinc-400 hover:bg-slate-200/80 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white border border-slate-300 dark:border-zinc-700 hover:scale-105 shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          
          {!isCurrent && (
            <button 
              onClick={handleToday}
              className="border border-tenant-primary/20 border-l-[3px] border-l-tenant-primary bg-tenant-primary/10 hover:bg-tenant-primary text-tenant-primary dark:text-white hover:text-white transition-all text-[10px] font-extrabold py-2 px-4 rounded-none cursor-pointer uppercase tracking-widest"
            >
              Dnes
            </button>
          )}
 
          {/* Day/Week/Month Switcher */}
          {!isHorizontal && (
            <UnifiedSwitcher<"day" | "week" | "month">
              options={[
                { value: "day", label: "Den" },
                { value: "week", label: "Týden" },
                { value: "month", label: "Měsíc" }
              ]}
              activeValue={viewMode}
              onChange={setViewMode}
            />
          )}
 
          {/* Simple Toggle Switch for Horizontal View */}
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-slate-200/50 dark:bg-black/60 border border-slate-300 dark:border-zinc-700 rounded-none shadow-sm select-none">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-550 dark:text-zinc-400">
              Horizontální rozvrh
            </span>
            <button
              type="button"
              onClick={() => {
                const nextIsHorizontal = !isHorizontal;
                setIsHorizontal(nextIsHorizontal);
                if (nextIsHorizontal && viewMode === "month") {
                  setViewMode("day");
                }
              }}
              className={`w-9 h-5 flex items-center rounded-none p-0.5 cursor-pointer transition-colors duration-200 focus:outline-none ${
                isHorizontal ? "bg-tenant-primary" : "bg-slate-300 dark:bg-zinc-700"
              }`}
              title="Zobrazit plochy/kurzy vedle sebe pro aktuální den"
            >
              <div
                className={`bg-white w-4 h-4 rounded-none shadow-md transform transition-transform duration-200 ${
                  isHorizontal ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
 
          <span className="text-[9px] px-2.5 py-2 border border-slate-300 dark:border-zinc-700 bg-slate-200/30 dark:bg-black/40 text-slate-600 dark:text-white/90 font-extrabold uppercase tracking-widest select-none rounded-none shrink-0 shadow-xs">
            {events.length} {events.length === 1 ? "rezervace" : events.length >= 2 && events.length <= 4 ? "rezervace" : "rezervací"}
          </span>
        </div>
        
        <h2 className="text-xl font-extrabold tracking-tight xl:text-right text-tenant-primary dark:text-zinc-100">
          {headerTitle}
        </h2>
      </div>

      {/* Root Resource Selector (if multiple roots exist) */}
      {rootResources.length > 1 && (
        <div className="mb-4">
          <UnifiedSwitcher<string>
            options={rootResources.map((root) => ({
              value: root.id,
              label: root.name
            }))}
            activeValue={activeRootId}
            onChange={selectRoot}
          />
        </div>
      )}

      {/* Chained Sub-resource Selectors (n-level nesting) */}
      {(() => {
        const getPathFromRoot = (currentId: string): string[] => {
          const res = resources.find(r => r.id === currentId);
          if (!res || !res.parentId) return [currentId];
          return [...getPathFromRoot(res.parentId), currentId];
        };
        const path = getPathFromRoot(selectedResourceId);
        const selectors: React.ReactNode[] = [];

        for (let i = 0; i < path.length; i++) {
          const parentId = path[i];
          const children = resources.filter(r => r.parentId === parentId);
          if (children.length === 0) continue;

          const parentRes = resources.find(r => r.id === parentId);
          const activeVal = path[i + 1] || parentId;

          selectors.push(
            <div key={parentId} className="mb-4">
              <UnifiedSwitcher<string>
                options={[
                  { value: parentId, label: `Celé (${parentRes?.name || "Celé"})` },
                  ...children.map((child) => ({
                    value: child.id,
                    label: child.name
                  }))
                ]}
                activeValue={activeVal}
                onChange={(val) => {
                  selectResource(val);
                }}
              />
            </div>
          );
        }
        return selectors;
      })()}

      {/* Main Grid View */}
      <div className="overflow-x-auto">
        {viewMode !== "month" ? (
          isHorizontal ? (
            <div className="min-w-[760px] border border-[#E2E2ED] dark:border-[#1F1F2E] rounded-none overflow-hidden bg-[#FAFAFD] dark:bg-[#07070C]">
                        {/* Header Row for Horizontal view (Resources as columns) */}
                        <div 
                          className="grid border-b bg-[#F5F5FA] dark:bg-[#151522] relative z-10 border-[#E2E2ED] dark:border-[#1F1F2E]"
                          style={{ gridTemplateColumns: `75px repeat(${horizontalColumns.length}, minmax(120px, 1fr))` }}
                        >
                          <div className="p-2.5 text-center font-mono text-[10px] text-muted-foreground border-r border-[#E2E2ED] dark:border-[#1F1F2E] flex items-center justify-center select-none">
                            Čas
                          </div>
                          {horizontalColumns.map((colRes) => (
                            <div
                              key={colRes.id}
                              className="p-2.5 text-center font-semibold text-xs border-r border-[#E2E2ED] dark:border-[#1F1F2E] flex flex-col items-center justify-center gap-0.5 text-slate-700 dark:text-slate-355"
                            >
                              <span className="font-extrabold uppercase tracking-wide truncate max-w-full">
                                {colRes.name}
                              </span>
                              <span className="text-[8px] opacity-75 font-mono">
                                {colRes.attributes?.surface || colRes.attributes?.room || "Plocha"}
                              </span>
                            </div>
                          ))}
                        </div>
            
                        {/* Body Columns Grid for Horizontal view */}
                        <div 
                          className={`grid relative z-20 ${isDragging ? "select-none" : ""}`}
                          style={{ gridTemplateColumns: `75px repeat(${horizontalColumns.length}, minmax(120px, 1fr))` }}
                          onMouseUp={commitDragSelection}
                        >
                          {/* Column 1: Time scale labels */}
                          <div className="flex flex-col border-r border-[#E2E2ED] dark:border-[#1F1F2E] bg-slate-100/25 dark:bg-[#07070C]/35 relative z-10">
                            {TIME_SLOTS.map((time) => (
                              <div
                                key={time}
                                className="h-[60px] border-b border-[#E2E2ED]/30 dark:border-[#1F1F2E]/30 flex items-center justify-center font-mono text-[10px] text-slate-500/70 dark:text-slate-400/60"
                              >
                                {time}
                              </div>
                            ))}
                          </div>
            
                          {/* Columns 2..N+1: Resource columns */}
                          {horizontalColumns.map((colRes, colIdx) => {
                            const colConflictingIds = getConflictingResourceIds(colRes.id);
                            
                            // Get all direct bookings or conflicting bookings for this resource on this day
                            const dayEvents = (events || []).filter((e) => 
                              e.dayIndex === activeDayDbIndex && 
                              colConflictingIds.includes(e.resourceId)
                            );
            
                            // Add draft bookings if applicable
                            if (draftBooking && draftBooking.dayIndex === activeDayDbIndex && colConflictingIds.includes(draftBooking.resourceId)) {
                              dayEvents.push({
                                id: "draft-booking-id",
                                name: draftBooking.userName || "Návrh rezervace",
                                room: "",
                                instructor: "Draft",
                                dayIndex: draftBooking.dayIndex,
                                startHour: draftBooking.startHour,
                                durationHours: draftBooking.duration,
                                resourceId: draftBooking.resourceId,
                                isOccupied: true,
                                resourceName: resources.find(r => r.id === draftBooking.resourceId)?.name || "Plocha",
                                isDraft: true
                              } as CalendarEvent);
                            }
            
                            // Now line calculation (applies if selected day is today)
                            const showNowLine = (() => {
                              if (!currentTime) return false;
                              const today = new Date(currentTime);
                              today.setHours(0, 0, 0, 0);
                              
                              const targetDayDate = baseDate;
                              const isSameDay = today.getFullYear() === targetDayDate.getFullYear() &&
                                                today.getMonth() === targetDayDate.getMonth() &&
                                                today.getDate() === targetDayDate.getDate();
                                                
                              if (!isSameDay) return false;
                              
                              const currentHourDec = currentTime.getHours() + currentTime.getMinutes() / 60;
                              return currentHourDec >= startHourOffset && currentHourDec <= (startHourOffset + totalSlotsCount * 0.5);
                            })();
            
                            const nowLineTop = (() => {
                              if (!currentTime) return 0;
                              const currentHourDec = currentTime.getHours() + currentTime.getMinutes() / 60;
                              return (currentHourDec - startHourOffset) * HOUR_HEIGHT;
                            })();
            
                            return (
                              <div
                                key={colRes.id}
                                className="relative border-r border-[#E2E2ED]/50 dark:border-[#1F1F2E]/50 flex flex-col z-20 hover:z-30"
                                style={{ height: `${totalHeightPx}px` }}
                              >
                                {/* Current Time Indicator Line (Now Line) */}
                                {showNowLine && (
                                  <div 
                                    className="absolute left-0 right-0 border-t-2 border-rose-500 z-30 pointer-events-none flex items-center"
                                    style={{ top: `${nowLineTop}px` }}
                                  >
                                    <div className="w-2.5 h-2.5 rounded-none bg-rose-500 shadow shadow-rose-500/50" style={{ marginLeft: "-5px" }} />
                                  </div>
                                )}
            
                                {/* Background slot cells */}
                                {TIME_SLOTS.map((time, timeIdx) => {
                                  const isPast = isSlotInPast(activeDayDbIndex, time);
                                  const isClosed = isSlotClosed(colRes.id, activeDayDbIndex, time);
                                  const isDisabled = isPast || isClosed;
                                  const isHighlighted = isDragging && dragStartSlot && dragCurrentSlot &&
                                    dragStartSlot.resourceId === colRes.id &&
                                    timeIdx >= Math.min(dragStartSlot.timeIndex, dragCurrentSlot.timeIndex) &&
                                    timeIdx <= Math.max(dragStartSlot.timeIndex, dragCurrentSlot.timeIndex);
            
                                  const [sh, sm] = time.split(":").map(Number);
                                  const slotDec = sh + sm / 60;
                                  const isHighlightedByAssistant = highlightedSlot &&
                                    highlightedSlot.dayIndex === activeDayDbIndex &&
                                    (highlightedSlot.resourceId === colRes.id) &&
                                    slotDec >= highlightedSlot.startHour &&
                                    slotDec < (highlightedSlot.startHour + highlightedSlot.duration);
            
                                  return (
                                    <div
                                      key={time}
                                      onMouseDown={(e) => !isDisabled && handleCellMouseDown(e, activeDayDbIndex, timeIdx, colRes.id)}
                                      onMouseEnter={() => !isDisabled && handleCellMouseEnter(activeDayDbIndex, timeIdx, colRes.id)}
                                      onMouseUp={!isDisabled ? commitDragSelection : undefined}
                                      className={`h-[60px] relative group transition-all duration-150 ${
                                        isDisabled 
                                          ? "bg-stripes-cosmic border-b border-[#E2E2ED] dark:border-[#1F1F2E] cursor-not-allowed"
                                          : isHighlighted 
                                            ? "bg-tenant-primary/15 dark:bg-tenant-primary/25 border border-tenant-primary shadow-[0_0_15px_rgba(112,0,255,0.3)] cursor-pointer z-10" 
                                            : isHighlightedByAssistant
                                              ? "bg-tenant-primary/20 dark:bg-tenant-primary/35 border-y-2 border-dashed border-tenant-primary shadow-[0_0_12px_rgba(112,0,255,0.4)] animate-pulse cursor-pointer z-10"
                                              : "border-b border-[#E2E2ED] dark:border-[#1F1F2E] hover:bg-tenant-primary/[0.02] dark:hover:bg-tenant-primary/[0.03] hover:shadow-[inset_0_0_12px_rgba(112,0,255,0.06)] dark:hover:shadow-[inset_0_0_20px_rgba(112,0,255,0.1)] transition-all duration-200 cursor-pointer"
                                      }`}
                                    >
                                      {/* Hover select block */}
                                      {!isDragging && !isDisabled && (
                                        <div className="absolute inset-0 flex items-center justify-center transition-all pointer-events-none">
                                          <span className="px-3 py-1.5 rounded-none text-[9px] font-extrabold text-tenant-primary dark:text-zinc-200 bg-white/80 dark:bg-[#131322]/60 border border-tenant-primary/25 dark:border-tenant-primary/30 backdrop-blur-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_2px_4px_rgba(112,0,255,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2)] opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-300 ease-out select-none">
                                            + Rezervovat
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
            
                                {/* Absolute Event Overlays container */}
                                <div className="absolute inset-0 pointer-events-none">
                                  {(() => {
                                    const visualEvents = layoutDayEvents(dayEvents);
                                    return visualEvents.map((event) => {
                                      const topOffset = (event.startHour - startHourOffset) * HOUR_HEIGHT;
                                      const heightVal = event.durationHours * HOUR_HEIGHT;
                                      const isMyBooking = !!(session?.user?.email && event.instructor === session.user.email);
                                      const styles = getResourceStyles(event.resourceName || "", event.isOccupied, isAdmin || isMyBooking, event.status);
                                      const isNarrow = event.totalLanes && event.totalLanes > 1;
                                      const isExtremelyNarrow = event.totalLanes && event.totalLanes >= 3;
                                      const isShort = event.durationHours <= 0.5;
                                      const isPastEvent = isEventInPast(event.dayIndex, event.startHour, event.durationHours);
                                      const isDraftEvent = (event as any).isDraft;
            
                                       const cardThemeClass = isDraftEvent
                                        ? "bg-tenant-primary/10 dark:bg-tenant-primary/20 border-2 border-dashed border-tenant-primary/85 text-tenant-primary dark:text-tenant-primary shadow-md shadow-tenant-primary/5 cursor-pointer rounded-none animate-pulse"
                                        : (event.status === "TECHNICAL_BREAK" || event.status === "CLOSURE")
                                          ? styles.themeClass
                                          : isPastEvent 
                                            ? "bg-[#F1F3F9] dark:bg-[#0E0E16] border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed rounded-none shadow-sm"
                                            : styles.themeClass;
            
                                      const badgeBgClass = isDraftEvent
                                        ? "bg-tenant-primary/20 text-tenant-primary dark:text-tenant-primary border border-tenant-primary/30 font-bold text-[7.5px] tracking-wide rounded-none px-1.5 py-0.5 uppercase"
                                        : (event.status === "TECHNICAL_BREAK" || event.status === "CLOSURE")
                                          ? styles.badgeBg
                                          : isPastEvent 
                                            ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-300/30 dark:border-zinc-700/30"
                                            : styles.badgeBg;
            
                                      return (
                                        <div
                                          key={event.id}
                                          style={{
                                            top: `${topOffset + (isShort ? 2 : 4)}px`,
                                            height: `${heightVal - (isShort ? 4 : 8)}px`,
                                            left: event.left,
                                            width: event.width,
                                            ...(!isPastEvent && !isDraftEvent ? { "--glow-color": (styles as any).glowColor || "rgba(139, 92, 246, 0.15)" } : {})
                                          }}
                                          onMouseMove={!isPastEvent && !isDraftEvent ? (e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const x = e.clientX - rect.left;
                                            const y = e.clientY - rect.top;
                                            e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
                                            e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
                                          } : undefined}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isPastEvent) return;
                                            if (isDraftEvent) {
                                              setBookingType("custom");
                                              return;
                                            }
                                            if (event.isOccupied) {
                                              if (isAdmin || isMyBooking) {
                                                setSelectedEvent(event);
                                                setBookingType("admin_view");
                                                return;
                                              }
                                              const timeStr = formatHourString(event.startHour);
                                              handleBackgroundCellClick(event.dayIndex, timeStr);
                                              setCustomDuration(event.durationHours);
                                              
                                              const availableRes = resources.find(r => 
                                                isResourceAvailable(r.id, event.dayIndex, timeStr, event.durationHours)
                                              );
                                              if (availableRes) {
                                                setCustomResourceId(availableRes.id);
                                              } else {
                                                setCustomResourceId(event.resourceId);
                                              }
                                              return;
                                            }
                                            setSelectedEvent(event);
                                            setBookingType("event");
                                          }}
                                          className={`absolute pointer-events-auto rounded-none border flex flex-col transition-all duration-250 backdrop-blur-sm group/card hover:z-40 ${cardThemeClass} ${
                                            isPastEvent || isDraftEvent ? "" : "hover:scale-[1.015] hover:shadow-neon-glow transition-all duration-300 ease-out"
                                          } ${
                                            isShort 
                                              ? "p-1.5 justify-start gap-0.5" 
                                              : isNarrow 
                                                ? "p-2 justify-between" 
                                                : "p-2.5 justify-between"
                                          }`}
                                        >
                                          {!isPastEvent && !isDraftEvent && (
                                            <div 
                                              className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none rounded-none z-0"
                                              style={{
                                                background: `radial-gradient(100px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), var(--glow-color), transparent 80%)`
                                              }}
                                            />
                                          )}
                                          {isExtremelyNarrow ? (
                                            <div className="flex flex-col items-center justify-between h-full w-full overflow-hidden text-center py-0.5 relative z-10">
                                              <span className="text-[7.5px] font-mono font-bold tracking-tighter opacity-90 block leading-none">
                                                {formatHourString(event.startHour).split(":")[0]}
                                              </span>
                                              {event.isOccupied ? (
                                                <Lock size={9} className="opacity-90 my-0.5 shrink-0" />
                                              ) : (
                                                <Calendar size={9} className="opacity-90 my-0.5 shrink-0" />
                                              )}
                                              {!isShort && (
                                                <span className="text-[7px] font-mono opacity-70 block leading-none">
                                                  {formatHourString(event.startHour + event.durationHours).split(":")[0]}
                                                </span>
                                              )}
                                            </div>
                                          ) : isShort ? (
                                            <div className="flex flex-col h-full justify-center overflow-hidden relative z-10">
                                              <div className="flex items-center justify-between gap-1 leading-none">
                                                <span className="text-[8px] font-mono opacity-90 block shrink-0">
                                                  {formatHourString(event.startHour)}
                                                </span>
                                                {event.isOccupied ? (
                                                  event.status === "TECHNICAL_BREAK" ? (
                                                    <AlertCircle size={9} className="opacity-70 shrink-0" />
                                                  ) : (
                                                    <Lock size={9} className="opacity-70 shrink-0" />
                                                  )
                                                ) : (
                                                  <Calendar size={9} className="opacity-70 shrink-0" />
                                                )}
                                              </div>
                                              <h4 className="font-bold text-[9px] uppercase tracking-wide truncate leading-tight mt-0.5">
                                                {event.isOccupied ? ((event.status === "TECHNICAL_BREAK" || event.status === "CLOSURE") ? event.name : isDraftEvent ? `${event.name}` : (isAdmin ? `${event.name}${event.status === "PENDING_PAYMENT" ? " [Platba]" : event.status === "ATTENDED" ? " [✓]" : ""}` : (isMyBooking ? `Moje rezervace${event.status === "PENDING_PAYMENT" ? " (neuhrazeno)" : event.status === "ATTENDED" ? " (odbaveno)" : ""}` : "Obsazeno"))) : event.name}
                                              </h4>
                                            </div>
                                          ) : (
                                            <div className="flex flex-col h-full justify-between w-full overflow-hidden relative z-10">
                                              <div className="overflow-hidden">
                                                <div className="flex items-center justify-between gap-1 mb-1">
                                                  <span className="text-[9px] font-mono opacity-80 block truncate">
                                                    {formatHourString(event.startHour)} – {formatHourString(event.startHour + event.durationHours)}
                                                  </span>
                                                  {event.resourceName && event.resourceName !== colRes.name && (
                                                    <span className={`text-[7px] font-bold px-1 py-0.5 rounded-none uppercase select-none shrink truncate min-w-0 max-w-[45%] whitespace-nowrap ${badgeBgClass}`}>
                                                      {formatResourceTag(event.resourceName)}
                                                    </span>
                                                  )}
                                                </div>
                                                <h4 className={`leading-tight uppercase truncate flex items-center gap-1.5 ${
                                                  isDraftEvent
                                                    ? "font-extrabold text-[10px] md:text-[11px] text-tenant-primary dark:text-tenant-primary"
                                                    : isPastEvent && event.status !== "TECHNICAL_BREAK" && event.status !== "CLOSURE"
                                                      ? "font-extrabold text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400"
                                                      : `font-extrabold text-[10px] md:text-[11px] ${styles.textHex}`
                                                }`}>
                                                  <span className={`w-1.5 h-1.5 rounded-none shrink-0 ${isDraftEvent ? "bg-tenant-primary shadow-[0_0_8px_var(--tenant-primary)]" : isPastEvent && event.status !== "TECHNICAL_BREAK" && event.status !== "CLOSURE" ? "bg-slate-400 dark:bg-slate-600" : styles.barColor}`} />
                                                  {event.isOccupied ? ((event.status === "TECHNICAL_BREAK" || event.status === "CLOSURE") ? event.name : isDraftEvent ? `${event.name}` : (isAdmin ? `${event.name}${event.status === "PENDING_PAYMENT" ? " [Platba]" : event.status === "ATTENDED" ? " [✓]" : ""}` : (isMyBooking ? `Moje rezervace${event.status === "PENDING_PAYMENT" ? " (neuhrazeno)" : event.status === "ATTENDED" ? " (odbaveno)" : ""}` : "Obsazeno"))) : event.name}
                                                </h4>
                                              </div>
                                              
                                              {!isNarrow && (!event.isOccupied || isAdmin || isDraftEvent || isMyBooking || event.status === "TECHNICAL_BREAK" || event.status === "CLOSURE") ? (
                                                <div className="text-[9px] opacity-80 leading-tight truncate">
                                                  <p className="font-semibold text-[9px] truncate">
                                                    {event.isOccupied ? (event.status === "TECHNICAL_BREAK" ? "Úklid / Příprava" : event.status === "CLOSURE" ? "Mimořádná uzavírka" : isDraftEvent ? "Koncept" : (isAdmin ? event.instructor : (isMyBooking ? event.name : "Obsazeno"))) : `Lektor: ${event.instructor}`}
                                                  </p>
                                                  <p className="text-[8px] opacity-75 truncate">
                                                    {event.isOccupied ? ((event.status === "TECHNICAL_BREAK" || event.status === "CLOSURE") ? "Nedostupné" : isDraftEvent ? "Klikněte pro potvrzení" : (isAdmin || isMyBooking ? (event.status === "PENDING_PAYMENT" ? "Čeká na platbu" : event.status === "ATTENDED" ? "Odbaveno" : "Potvrzeno") : "Rezervováno")) : `Místnost: ${event.room}`}
                                                  </p>
                                                </div>
                                              ) : (
                                                <div className="flex justify-end items-center opacity-70 mt-1">
                                                  {event.isOccupied ? (
                                                    event.status === "TECHNICAL_BREAK" ? (
                                                      <AlertCircle size={10} />
                                                    ) : isDraftEvent ? (
                                                      <span className="text-[8px] font-bold text-tenant-primary">?</span>
                                                    ) : (
                                                      <Lock size={10} />
                                                    )
                                                  ) : (
                                                    <Calendar size={10} />
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          )}
            
                                          {/* Tooltip on Hover */}
                                          {(() => {
                                            const isTopHalf = event.startHour < 12.0;
                                            const tooltipPositionClass = isTopHalf 
                                              ? "top-[107%] bottom-auto origin-top" 
                                              : "bottom-[107%] top-auto origin-bottom";
            
                                            const tooltipAlignmentClass = colIdx === 0 
                                              ? "left-0 translate-x-0" 
                                              : colIdx === horizontalColumns.length - 1 
                                                ? "right-0 left-auto translate-x-0" 
                                                : "left-1/2 -translate-x-1/2";
            
                                            const tooltipBorderClass = (() => {
                                              const color = (styles as any).colorName || "indigo";
                                              const borderClasses: Record<string, string> = {
                                                rose: "border-rose-500/25 dark:border-rose-500/20",
                                                amber: "border-amber-500/25 dark:border-amber-500/20",
                                                emerald: "border-emerald-500/25 dark:border-emerald-500/20",
                                                orange: "border-orange-500/25 dark:border-orange-500/20",
                                                blue: "border-blue-500/25 dark:border-blue-500/20",
                                                violet: "border-violet-500/25 dark:border-violet-500/20",
                                                indigo: "border-indigo-500/25 dark:border-indigo-500/20",
                                                cyan: "border-cyan-500/25 dark:border-cyan-500/20",
                                              };
                                              return borderClasses[color] || "border-indigo-500/25 dark:border-indigo-500/20";
                                            })();
            
                                            return (
                                              <div className={`absolute ${tooltipAlignmentClass} w-72 bg-white/90 dark:bg-[#07070C]/85 backdrop-blur-xl text-slate-800 dark:text-slate-200 text-xs p-5 rounded-none border ${tooltipBorderClass} shadow-neon-glow opacity-0 scale-95 pointer-events-none group-hover/card:opacity-100 group-hover/card:scale-100 transition-all duration-300 ease-out z-50 space-y-3.5 select-none font-sans ${tooltipPositionClass}`}>
                                                <div className="flex items-center justify-between border-b border-slate-200/40 dark:border-zinc-800/50 pb-2.5">
                                                  <span className={`font-bold text-[9px] uppercase tracking-wider flex items-center gap-1.5 ${styles.textHex}`}>
                                                    <span className={`w-2 h-2 rounded-none shrink-0 ${styles.barColor}`} />
                                                    {event.resourceName || "Sport field"}
                                                  </span>
                                                  <span className="text-[9px] font-mono text-zinc-500 dark:text-slate-400">
                                                    {formatHourString(event.startHour)} – {formatHourString(event.startHour + event.durationHours)}
                                                  </span>
                                                </div>
                                                <div>
                                                  <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-50 break-words leading-snug">
                                                    {event.isOccupied ? ((event.status === "TECHNICAL_BREAK" || event.status === "CLOSURE") ? event.name : isDraftEvent ? `${event.name} [Návrh]` : (isAdmin ? event.name : (isMyBooking ? `Moje rezervace (${event.name})` : "Obsazeno"))) : event.name}
                                                  </h4>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-200/40 dark:border-zinc-800/50 text-[10px]">
                                                  <div>
                                                    <span className="block text-[8px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-0.5">Místnost/Povrch</span>
                                                    <span className="text-zinc-800 dark:text-zinc-200 font-semibold break-words">{event.status === "TECHNICAL_BREAK" ? "Úklid / Příprava" : event.status === "CLOSURE" ? "Nedostupné" : isDraftEvent ? "Vybraná plocha" : event.room}</span>
                                                  </div>
                                                  <div>
                                                    <span className="block text-[8px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-0.5">Status/Kontakt</span>
                                                    <span className="text-zinc-800 dark:text-zinc-200 font-semibold break-words">
                                                      {event.isOccupied ? ((event.status === "TECHNICAL_BREAK" || event.status === "CLOSURE") ? "Nedostupné" : isDraftEvent ? "Předběžná rezervace" : (isAdmin ? `${event.name} (${event.instructor})` : (isMyBooking ? `Moje rezervace (${event.instructor})` : "Obsazeno"))) : event.instructor}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
          ) : (
          <div className="min-w-[760px] border border-[#E2E2ED] dark:border-[#1F1F2E] rounded-none overflow-hidden bg-[#FAFAFD] dark:bg-[#07070C]">
            
            {/* Header Row */}
            <div className={`grid ${viewMode === "day" ? "grid-cols-[75px_1fr]" : "grid-cols-[75px_repeat(7,_1fr)]"} border-b bg-[#F5F5FA] dark:bg-[#151522] relative z-10 border-[#E2E2ED] dark:border-[#1F1F2E]`}>
              <div className="p-2.5 text-center font-mono text-[10px] text-muted-foreground border-r border-[#E2E2ED] dark:border-[#1F1F2E] flex items-center justify-center select-none">
                Čas
              </div>
              {DAYS.map((day) => {
                const isPastDay = (() => {
                  if (!currentTime) return false;
                  const today = new Date(currentTime);
                  today.setHours(0, 0, 0, 0);
                  const targetDayDate = day.date;
                  return targetDayDate < today;
                })();

                const isToday = (() => {
                  if (!currentTime) return false;
                  const today = new Date(currentTime);
                  today.setHours(0, 0, 0, 0);
                  const targetDayDate = day.date;
                  return targetDayDate.getTime() === today.getTime();
                })();

                return (
                  <div
                    key={day.key}
                    className={`p-2.5 text-center font-semibold text-xs border-r border-[#E2E2ED] dark:border-[#1F1F2E] flex flex-col items-center justify-center gap-0.5 ${
                      isToday 
                        ? "text-tenant-primary dark:text-white bg-tenant-primary/5 dark:bg-tenant-primary/10 font-bold" 
                        : isPastDay 
                          ? "text-muted-foreground/50 opacity-60" 
                          : "text-slate-700 dark:text-slate-355"
                    }`}
                  >
                    <span>{day.label}</span>
                    {isToday && (
                      <span className="text-[8px] font-extrabold uppercase tracking-wide bg-rose-500/10 text-rose-600 px-1 py-0.2 rounded-none mt-0.5">
                        Dnes
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Body Columns Grid */}
            <div 
              className={`grid ${viewMode === "day" ? "grid-cols-[75px_1fr]" : "grid-cols-[75px_repeat(7,_1fr)]"} relative z-20 ${isDragging ? "select-none" : ""}`}
              onMouseUp={commitDragSelection}
            >
              
              {/* Column 1: Time scale labels */}
              <div className="flex flex-col border-r border-[#E2E2ED] dark:border-[#1F1F2E] bg-slate-100/25 dark:bg-[#07070C]/35 relative z-10">
                {TIME_SLOTS.map((time) => (
                  <div
                    key={time}
                    className="h-[60px] border-b border-[#E2E2ED]/30 dark:border-[#1F1F2E]/30 flex items-center justify-center font-mono text-[10px] text-slate-500/70 dark:text-slate-400/60"
                  >
                    {time}
                  </div>
                ))}
              </div>

              {/* Columns 2-8: Day columns */}
              {DAYS.map((day, dayIdx) => {
                const dayEvents = events.filter((e) => e.dayIndex === day.dbDayIndex);
                
                // Now line calculation
                const showNowLine = (() => {
                  if (!currentTime) return false;
                  const year = currentTime.getFullYear();
                  const month = currentTime.getMonth();
                  const date = currentTime.getDate();
                  
                  const targetDayDate = day.date;
                  const isSameDay = year === targetDayDate.getFullYear() &&
                                    month === targetDayDate.getMonth() &&
                                    date === targetDayDate.getDate();
                                    
                  if (!isSameDay) return false;
                  
                  const currentHourDec = currentTime.getHours() + currentTime.getMinutes() / 60;
                  return currentHourDec >= startHourOffset && currentHourDec <= (startHourOffset + totalSlotsCount * 0.5);
                })();

                const nowLineTop = (() => {
                  if (!currentTime) return 0;
                  const currentHourDec = currentTime.getHours() + currentTime.getMinutes() / 60;
                  return (currentHourDec - startHourOffset) * HOUR_HEIGHT;
                })();

                return (
                  <div
                    key={day.key}
                    className="relative border-r border-[#E2E2ED]/50 dark:border-[#1F1F2E]/50 flex flex-col z-20 hover:z-30"
                    style={{ height: `${totalHeightPx}px` }}
                  >
                    {/* Current Time Indicator Line (Now Line) */}
                    {showNowLine && (
                      <div 
                        className="absolute left-0 right-0 border-t-2 border-rose-500 z-30 pointer-events-none flex items-center"
                        style={{ top: `${nowLineTop}px` }}
                      >
                        <div className="w-2.5 h-2.5 rounded-none bg-rose-500 shadow shadow-rose-500/50" style={{ marginLeft: "-5px" }} />
                      </div>
                    )}

                    {/* Background slot cells */}
                    {TIME_SLOTS.map((time, timeIdx) => {
                      const isPast = isSlotInPast(day.dbDayIndex, time);
                      const isClosed = isSlotClosed(selectedResourceId, day.dbDayIndex, time);
                      const isDisabled = isPast || isClosed;
                      const isHighlighted = isDragging && dragStartSlot && dragCurrentSlot &&
                        dragStartSlot.dayIndex === day.dbDayIndex &&
                        timeIdx >= Math.min(dragStartSlot.timeIndex, dragCurrentSlot.timeIndex) &&
                        timeIdx <= Math.max(dragStartSlot.timeIndex, dragCurrentSlot.timeIndex);

                      const [sh, sm] = time.split(":").map(Number);
                      const slotDec = sh + sm / 60;
                      const isHighlightedByAssistant = highlightedSlot &&
                        highlightedSlot.dayIndex === day.dbDayIndex &&
                        (!highlightedSlot.resourceId || highlightedSlot.resourceId === selectedResourceId) &&
                        slotDec >= highlightedSlot.startHour &&
                        slotDec < (highlightedSlot.startHour + highlightedSlot.duration);

                      return (
                        <div
                          key={time}
                          onMouseDown={(e) => !isDisabled && handleCellMouseDown(e, day.dbDayIndex, timeIdx, selectedResourceId)}
                          onMouseEnter={() => !isDisabled && handleCellMouseEnter(day.dbDayIndex, timeIdx, selectedResourceId)}
                          onMouseUp={!isDisabled ? commitDragSelection : undefined}
                          className={`h-[60px] relative group transition-all duration-150 ${
                            isDisabled 
                              ? "bg-stripes-cosmic border-b border-[#E2E2ED] dark:border-[#1F1F2E] cursor-not-allowed"
                              : isHighlighted 
                                ? "bg-tenant-primary/15 dark:bg-tenant-primary/25 border border-tenant-primary shadow-[0_0_15px_rgba(112,0,255,0.3)] cursor-pointer z-10" 
                                : isHighlightedByAssistant
                                  ? "bg-tenant-primary/20 dark:bg-tenant-primary/35 border-y-2 border-dashed border-tenant-primary shadow-[0_0_12px_rgba(112,0,255,0.4)] animate-pulse cursor-pointer z-10"
                                  : "border-b border-[#E2E2ED] dark:border-[#1F1F2E] hover:bg-tenant-primary/[0.02] dark:hover:bg-tenant-primary/[0.03] hover:shadow-[inset_0_0_12px_rgba(112,0,255,0.06)] dark:hover:shadow-[inset_0_0_20px_rgba(112,0,255,0.1)] transition-all duration-200 cursor-pointer"
                          }`}
                        >
                          {/* Hover select block */}
                          {!isDragging && !isDisabled && (
                            <div className="absolute inset-0 flex items-center justify-center transition-all pointer-events-none">
                              <span className="px-3 py-1.5 rounded-none text-[9px] font-extrabold text-tenant-primary dark:text-zinc-200 bg-white/80 dark:bg-[#131322]/60 border border-tenant-primary/25 dark:border-tenant-primary/30 backdrop-blur-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_2px_4px_rgba(112,0,255,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2)] opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-300 ease-out select-none">
                                + Rezervovat
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
{/* Absolute Event Overlays container */}
                    <div className="absolute inset-0 pointer-events-none">
                      {(() => {
                        const visualEvents = layoutDayEvents(dayEvents);
                        return visualEvents.map((event) => {
                          const topOffset = (event.startHour - startHourOffset) * HOUR_HEIGHT;
                          const heightVal = event.durationHours * HOUR_HEIGHT;
                          const isMyBooking = !!(session?.user?.email && event.instructor === session.user.email);
                          const styles = getResourceStyles(event.resourceName || "", event.isOccupied, isAdmin || isMyBooking, event.status);
                          const isWeekView = viewMode === "week";
                          const isNarrow = isWeekView && event.totalLanes && event.totalLanes > 1;
                          const isExtremelyNarrow = isWeekView && event.totalLanes && event.totalLanes >= 3;
                          const isShort = event.durationHours <= 0.5;
                          const isPastEvent = isEventInPast(event.dayIndex, event.startHour, event.durationHours);
                          const isDraftEvent = (event as any).isDraft;

                          const cardThemeClass = isDraftEvent
                            ? "bg-tenant-primary/10 dark:bg-tenant-primary/20 border-2 border-dashed border-tenant-primary/85 text-tenant-primary dark:text-tenant-primary shadow-md shadow-tenant-primary/5 cursor-pointer rounded-none animate-pulse"
                            : (event.status === "TECHNICAL_BREAK" || event.status === "CLOSURE")
                              ? styles.themeClass
                              : isPastEvent 
                                ? "bg-[#F1F3F9] dark:bg-[#0E0E16] border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed rounded-none shadow-sm"
                                : styles.themeClass;

                          const badgeBgClass = isDraftEvent
                            ? "bg-tenant-primary/20 text-tenant-primary dark:text-tenant-primary border border-tenant-primary/30 font-bold text-[7.5px] tracking-wide rounded-none px-1.5 py-0.5 uppercase"
                            : (event.status === "TECHNICAL_BREAK" || event.status === "CLOSURE")
                              ? styles.badgeBg
                              : isPastEvent 
                                ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-300/30 dark:border-zinc-700/30"
                                : styles.badgeBg;

                          return (
                            <div
                              key={event.id}
                              style={{
                                top: `${topOffset + (isShort ? 2 : 4)}px`,
                                height: `${heightVal - (isShort ? 4 : 8)}px`,
                                left: event.left,
                                width: event.width,
                                ...(!isPastEvent && !isDraftEvent ? { "--glow-color": (styles as any).glowColor || "rgba(139, 92, 246, 0.15)" } : {})
                              }}
                              onMouseMove={!isPastEvent && !isDraftEvent ? (e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                const y = e.clientY - rect.top;
                                e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
                                e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
                              } : undefined}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isPastEvent) return;
                                if (isDraftEvent) {
                                  setBookingType("custom");
                                  return;
                                }
                                if (event.isOccupied) {
                                  if (isAdmin || isMyBooking) {
                                    setSelectedEvent(event);
                                    setBookingType("admin_view");
                                    return;
                                  }
                                  const timeStr = formatHourString(event.startHour);
                                  handleBackgroundCellClick(event.dayIndex, timeStr);
                                  setCustomDuration(event.durationHours);
                                  
                                  const availableRes = resources.find(r => 
                                    isResourceAvailable(r.id, event.dayIndex, timeStr, event.durationHours)
                                  );
                                  if (availableRes) {
                                    setCustomResourceId(availableRes.id);
                                  } else {
                                    setCustomResourceId(event.resourceId);
                                  }
                                  return;
                                }
                                setSelectedEvent(event);
                                setBookingType("event");
                              }}
                              className={`absolute pointer-events-auto rounded-none border flex flex-col transition-all duration-250 backdrop-blur-sm group/card hover:z-40 ${cardThemeClass} ${
                                isPastEvent || isDraftEvent ? "" : "hover:scale-[1.015] hover:shadow-neon-glow transition-all duration-300 ease-out"
                              } ${
                                isShort 
                                  ? "p-1.5 justify-start gap-0.5" 
                                  : isNarrow 
                                    ? "p-2 justify-between" 
                                    : "p-2.5 justify-between"
                              }`}
                            >
                              {!isPastEvent && !isDraftEvent && (
                                <div 
                                  className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none rounded-none z-0"
                                  style={{
                                    background: `radial-gradient(100px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), var(--glow-color), transparent 80%)`
                                  }}
                                />
                              )}
                              {isExtremelyNarrow ? (
                                <div className="flex flex-col items-center justify-between h-full w-full overflow-hidden text-center py-0.5 relative z-10">
                                  <span className="text-[7.5px] font-mono font-bold tracking-tighter opacity-90 block leading-none">
                                    {formatHourString(event.startHour).split(":")[0]}
                                  </span>
                                  {event.isOccupied ? (
                                    <Lock size={9} className="opacity-90 my-0.5 shrink-0" />
                                  ) : (
                                    <Calendar size={9} className="opacity-90 my-0.5 shrink-0" />
                                  )}
                                  {!isShort && (
                                    <span className="text-[7px] font-mono opacity-70 block leading-none">
                                      {formatHourString(event.startHour + event.durationHours).split(":")[0]}
                                    </span>
                                  )}
                                </div>
                              ) : isShort ? (
                                <div className="flex flex-col h-full justify-center overflow-hidden relative z-10">
                                  <div className="flex items-center justify-between gap-1 leading-none">
                                    <span className="text-[8px] font-mono opacity-90 block shrink-0">
                                      {formatHourString(event.startHour)}
                                    </span>
                                    {event.isOccupied ? (
                                      event.status === "TECHNICAL_BREAK" ? (
                                        <AlertCircle size={9} className="opacity-70 shrink-0" />
                                      ) : (
                                        <Lock size={9} className="opacity-70 shrink-0" />
                                      )
                                    ) : (
                                      <Calendar size={9} className="opacity-70 shrink-0" />
                                    )}
                                  </div>
                                  <h4 className="font-bold text-[9px] uppercase tracking-wide truncate leading-tight mt-0.5">
                                    {event.isOccupied ? ((event.status === "TECHNICAL_BREAK" || event.status === "CLOSURE") ? event.name : isDraftEvent ? `${event.name}` : (isAdmin ? `${event.name}${event.status === "PENDING_PAYMENT" ? " [Platba]" : event.status === "ATTENDED" ? " [✓]" : ""}` : (isMyBooking ? `Moje rezervace${event.status === "PENDING_PAYMENT" ? " (neuhrazeno)" : event.status === "ATTENDED" ? " (odbaveno)" : ""}` : "Obsazeno"))) : event.name}
                                  </h4>
                                </div>
                              ) : (
                                <div className="flex flex-col h-full justify-between w-full overflow-hidden relative z-10">
                                  <div className="overflow-hidden">
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      <span className="text-[9px] font-mono opacity-80 block truncate">
                                        {formatHourString(event.startHour)} – {formatHourString(event.startHour + event.durationHours)}
                                      </span>
                                      {!isNarrow && (selectedResourceId === "" || event.resourceId !== selectedResourceId) && event.resourceName && (
                                        <span className={`text-[7px] font-bold px-1 py-0.5 rounded-none uppercase select-none shrink truncate min-w-0 max-w-[45%] whitespace-nowrap ${badgeBgClass}`}>
                                          {formatResourceTag(event.resourceName)}
                                        </span>
                                      )}
                                    </div>
                                    <h4 className={`leading-tight uppercase truncate flex items-center gap-1.5 ${
                                      isDraftEvent
                                        ? "font-extrabold text-[10px] md:text-[11px] text-tenant-primary dark:text-tenant-primary"
                                        : isPastEvent && event.status !== "TECHNICAL_BREAK"
                                          ? "font-extrabold text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400"
                                          : `font-extrabold text-[10px] md:text-[11px] ${styles.textHex}`
                                    }`}>
                                      <span className={`w-1.5 h-1.5 rounded-none shrink-0 ${isDraftEvent ? "bg-tenant-primary shadow-[0_0_8px_var(--tenant-primary)]" : isPastEvent && event.status !== "TECHNICAL_BREAK" ? "bg-slate-400 dark:bg-slate-600" : styles.barColor}`} />
                                      {event.isOccupied ? ((event.status === "TECHNICAL_BREAK" || event.status === "CLOSURE") ? event.name : isDraftEvent ? `${event.name}` : (isAdmin ? `${event.name}${event.status === "PENDING_PAYMENT" ? " [Platba]" : event.status === "ATTENDED" ? " [✓]" : ""}` : (isMyBooking ? `Moje rezervace${event.status === "PENDING_PAYMENT" ? " (neuhrazeno)" : event.status === "ATTENDED" ? " (odbaveno)" : ""}` : "Obsazeno"))) : event.name}
                                    </h4>
                                  </div>
                                  
                                  {!isNarrow && (!event.isOccupied || isAdmin || isDraftEvent || isMyBooking || event.status === "TECHNICAL_BREAK" || event.status === "CLOSURE") ? (
                                    <div className="text-[9px] opacity-80 leading-tight truncate">
                                      <p className="font-semibold text-[9px] truncate">
                                        {event.isOccupied ? (event.status === "TECHNICAL_BREAK" ? "Úklid / Příprava" : event.status === "CLOSURE" ? "Mimořádná uzavírka" : isDraftEvent ? "Koncept" : (isAdmin ? event.instructor : (isMyBooking ? event.name : "Obsazeno"))) : `Lektor: ${event.instructor}`}
                                      </p>
                                      <p className="text-[8px] opacity-75 truncate">
                                        {event.isOccupied ? ((event.status === "TECHNICAL_BREAK" || event.status === "CLOSURE") ? "Nedostupné" : isDraftEvent ? "Klikněte pro potvrzení" : (isAdmin || isMyBooking ? (event.status === "PENDING_PAYMENT" ? "Čeká na platbu" : event.status === "ATTENDED" ? "Odbaveno" : "Potvrzeno") : "Rezervováno")) : `Místnost: ${event.room}`}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="flex justify-end items-center opacity-70 mt-1">
                                      {event.isOccupied ? (
                                        event.status === "TECHNICAL_BREAK" ? (
                                          <AlertCircle size={10} />
                                        ) : isDraftEvent ? (
                                          <span className="text-[8px] font-bold text-tenant-primary">?</span>
                                        ) : (
                                          <Lock size={10} />
                                        )
                                      ) : (
                                        <Calendar size={10} />
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Premium Floating Details Tooltip on Hover */}
                              {(() => {
                                const isTopHalf = event.startHour < 12.0;
                                const tooltipPositionClass = isTopHalf 
                                  ? "top-[107%] bottom-auto origin-top" 
                                  : "bottom-[107%] top-auto origin-bottom";
                                
                                const getResourceColor = (resourceName: string) => {
                                   return getResourceStyles(resourceName).barColor;
                                  };

                                const tooltipAlignmentClass = (() => {
                                  if (viewMode === "week") {
                                    if (dayIdx === 0) return "left-0 translate-x-0";
                                    if (dayIdx === 6) return "right-0 left-auto translate-x-0";
                                    if (dayIdx === 5) return "right-0 left-auto translate-x-0";
                                    if (dayIdx === 1 && event.totalLanes && event.totalLanes > 1 && event.lane === 0) {
                                      return "left-0 translate-x-0";
                                    }
                                    if (dayIdx === 4 && event.totalLanes && event.totalLanes > 1 && event.lane === event.totalLanes - 1) {
                                      return "right-0 left-auto translate-x-0";
                                    }
                                  } else if (viewMode === "day") {
                                    if (event.totalLanes && event.totalLanes > 1) {
                                      if (event.lane === 0) return "left-0 translate-x-0";
                                      if (event.lane === event.totalLanes - 1) return "right-0 left-auto translate-x-0";
                                    }
                                  }
                                  return "left-1/2 -translate-x-1/2";
                                })();

                                const tooltipBorderClass = (() => {
                                  const color = (styles as any).colorName || "indigo";
                                  const borderClasses: Record<string, string> = {
                                    rose: "border-rose-500/25 dark:border-rose-500/20",
                                    amber: "border-amber-500/25 dark:border-amber-500/20",
                                    emerald: "border-emerald-500/25 dark:border-emerald-500/20",
                                    orange: "border-orange-500/25 dark:border-orange-500/20",
                                    blue: "border-blue-500/25 dark:border-blue-500/20",
                                    violet: "border-violet-500/25 dark:border-violet-500/20",
                                    indigo: "border-indigo-500/25 dark:border-indigo-500/20",
                                    cyan: "border-cyan-500/25 dark:border-cyan-500/20",
                                  };
                                  return borderClasses[color] || "border-indigo-500/25 dark:border-indigo-500/20";
                                })();

                                const tooltipClass = `absolute ${tooltipAlignmentClass} w-72 bg-white/90 dark:bg-[#07070C]/85 backdrop-blur-xl text-slate-800 dark:text-slate-200 text-xs p-5 rounded-none border ${tooltipBorderClass} shadow-neon-glow opacity-0 scale-95 pointer-events-none group-hover/card:opacity-100 group-hover/card:scale-100 transition-all duration-300 ease-out z-50 space-y-3.5 select-none font-sans ${tooltipPositionClass}`;

                                return (
                                  <div className={tooltipClass}>
                                    <div className="flex items-center justify-between border-b border-slate-200/40 dark:border-zinc-800/50 pb-2.5">
                                      <span className={`font-bold text-[9px] uppercase tracking-wider flex items-center gap-1.5 ${styles.textHex}`}>
                                        <span className={`w-2 h-2 rounded-none shrink-0 ${styles.barColor}`} />
                                        {event.resourceName || "Sport field"}
                                      </span>
                                      <span className="text-[9px] font-mono text-zinc-500 dark:text-slate-400">
                                        {formatHourString(event.startHour)} – {formatHourString(event.startHour + event.durationHours)}
                                      </span>
                                    </div>
                                    <div>
                                      <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-50 break-words leading-snug">
                                        {event.isOccupied ? ((event.status === "TECHNICAL_BREAK" || event.status === "CLOSURE") ? event.name : isDraftEvent ? `${event.name} [Návrh]` : (isAdmin ? event.name : (isMyBooking ? `Moje rezervace (${event.name})` : "Obsazeno"))) : event.name}
                                      </h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-200/40 dark:border-zinc-800/50 text-[10px]">
                                      <div>
                                        <span className="block text-[8px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-0.5">Místnost/Povrch</span>
                                        <span className="text-zinc-800 dark:text-zinc-200 font-semibold break-words">{event.status === "TECHNICAL_BREAK" ? "Úklid / Příprava" : event.status === "CLOSURE" ? "Nedostupné" : isDraftEvent ? "Vybraná plocha" : event.room}</span>
                                      </div>
                                      <div>
                                        <span className="block text-[8px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-0.5">Status/Kontakt</span>
                                        <span className="text-zinc-800 dark:text-zinc-200 font-semibold break-words">
                                          {event.isOccupied ? ((event.status === "TECHNICAL_BREAK" || event.status === "CLOSURE") ? "Nedostupné" : isDraftEvent ? "Předběžná rezervace" : (isAdmin ? `${event.name} (${event.instructor})` : (isMyBooking ? `Moje rezervace (${event.instructor})` : "Obsazeno"))) : event.instructor}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        });
                      })()}
                    </div>

                  </div>
                );
              })}

            </div>
          </div>
          )
        ) : (
          /* Month View Grid */
          <div className="border border-[#ECECF3] dark:border-[#1F1F2E] rounded-none bg-[#FAFAFD] dark:bg-[#07070C] p-6 shadow-neon-glow">
            <div className="grid grid-cols-7 gap-2">
              {["Po", "Út", "St", "Čt", "Pá", "So", "Ne"].map((d) => (
                <div 
                  key={d} 
                  className="text-center py-1.5 uppercase font-bold text-[10px] font-sans font-extrabold tracking-widest text-tenant-primary dark:text-tenant-primary"
                >
                  {d}
                </div>
              ))}
              {(() => {
                const startOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
                const gridStart = getMondayOfDate(startOfMonth);
                return Array.from({ length: 42 }, (_, i) => {
                  const d = new Date(gridStart);
                  d.setDate(gridStart.getDate() + i);
                  
                  const isCurrentMonth = d.getMonth() === baseDate.getMonth();
                  const isToday = currentTime && 
                    d.getDate() === currentTime.getDate() && 
                    d.getMonth() === currentTime.getMonth() && 
                    d.getFullYear() === currentTime.getFullYear();
                  
                  const dayStr = toLocalDateString(d);
                  
                  // Count events on this day
                  const dayOfWeekIndex = d.getDay();
                  const dbDayIndex = dayOfWeekIndex === 0 ? 6 : dayOfWeekIndex - 1;
                  
                  // Check if this date falls within our current week range to show dots
                  const monday = getMondayOfDate(baseDate);
                  const sunday = new Date(monday);
                  sunday.setDate(monday.getDate() + 6);
                  const isInRange = d >= monday && d <= sunday;
                  
                  const dayEventsCount = isInRange 
                    ? events.filter(e => e.dayIndex === dbDayIndex).length 
                    : 0;

                  return (
                    <button
                      key={dayStr}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.set("date", dayStr);
                        router.push(`${pathname}?${params.toString()}`);
                        setViewMode("day");
                      }}
                      className={`h-16 rounded-none p-2 flex flex-col justify-between transition-all hover:scale-[1.03] text-left cursor-pointer ${(() => {
                        if (isToday) {
                          return "border border-tenant-primary dark:border-tenant-primary/60 bg-tenant-primary/15 dark:bg-tenant-primary/10 text-tenant-primary dark:text-white font-extrabold shadow-[inset_0_0_12px_rgba(112,0,255,0.15),0_0_15px_rgba(112,0,255,0.25)]";
                        }
                        if (isCurrentMonth) {
                          return "border border-[#ECECF3] dark:border-[#1F1F2E] bg-white dark:bg-[#0B0B0F]/45 hover:border-tenant-primary dark:hover:border-tenant-primary hover:shadow-[inset_0_0_12px_rgba(112,0,255,0.08),0_4px_12px_rgba(112,0,255,0.06)] hover:bg-tenant-primary/[0.01] dark:hover:bg-tenant-primary/[0.02] text-slate-800 dark:text-slate-350 shadow-sm transition-all duration-200";
                        } else {
                          return "border border-dashed border-[#ECECF3]/40 dark:border-[#1F1F2E]/40 bg-transparent opacity-25 cursor-not-allowed text-slate-500";
                        }
                      })()}`}
                    >
                      <span className="text-[10px]">{d.getDate()}</span>
                      {dayEventsCount > 0 && (
                        <div className="flex gap-1 items-center">
                          <span className="h-1 w-1 rounded-none bg-tenant-primary dark:bg-tenant-primary shadow-[0_0_4px_#7000FF]" />
                          <span className="text-[8px] font-bold text-tenant-primary dark:text-zinc-200">
                            {dayEventsCount} {dayEventsCount === 1 ? "rezervace" : dayEventsCount >= 2 && dayEventsCount <= 4 ? "rezervace" : "rezervací"}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Booking Modal */}
      {bookingType && (
        <div 
          onClick={() => {
            setIsAreaDropdownOpen(false);
            setIsDurationDropdownOpen(false);
          }}
          className="fixed inset-0 bg-[#07070C]/60 dark:bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => {
              e.stopPropagation();
              if (isAreaDropdownOpen) setIsAreaDropdownOpen(false);
              if (isDurationDropdownOpen) setIsDurationDropdownOpen(false);
            }}
            className="bg-white/95 dark:bg-[#0D0D15]/90 backdrop-blur-2xl border border-slate-200/60 dark:border-[#1F1F35] max-w-md w-full p-6 rounded-none shadow-[0_20px_50px_rgba(112,0,255,0.12)] relative transition-all duration-300"
          >
            {/* Elegant Corner Close Button */}
            <button
              onClick={() => {
                setBookingType(null);
                setSelectedEvent(null);
                setSelectedDayIndex(null);
                setGuestName("");
                setGuestEmail("");
                setSelectedPartnerId("");
                setModalError(null);
                window.dispatchEvent(new CustomEvent("assistant-booking-cancelled"));
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 transition-all p-1.5 rounded-none hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={16} />
            </button>

            <h3 className="text-xl font-bold text-tenant-primary mb-1 font-sans">
              {bookingType === "admin_view" 
                ? (isAdmin ? "Detaily rezervace" : "Detaily mé rezervace") 
                : "Nová rezervace"}
            </h3>
            {!isBooked && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                {bookingType === "admin_view" 
                  ? (isAdmin ? "Administrátorská správa této rezervace:" : "Správa vaší rezervace:") 
                  : "Potvrďte termín nebo upravte parametry níže:"}
              </p>
            )}

            {!isBooked && modalError && (
              <div className="mb-5 bg-rose-500/10 dark:bg-rose-500/5 border border-rose-500/20 dark:border-rose-500/15 p-4 rounded-none flex items-start gap-3 text-xs text-rose-600 dark:text-rose-450 shadow-[0_4px_12px_rgba(244,63,94,0.06)] animate-in fade-in slide-in-from-top-2 duration-200">
                <AlertCircle size={15} className="mt-0.5 text-rose-500 dark:text-rose-400 shrink-0" />
                <div className="flex-1 space-y-1">
                  <p className="font-extrabold uppercase tracking-widest text-[9px] text-rose-500 dark:text-rose-400 font-sans">
                    {modalError.code.replace(/_/g, " ")}
                  </p>
                  <p className="font-semibold leading-relaxed mt-0.5">
                    {modalError.message}
                  </p>
                </div>
                <button 
                  onClick={() => setModalError(null)}
                  className="text-rose-450 hover:text-rose-600 dark:text-rose-500 dark:hover:text-rose-350 transition-colors p-1 rounded-none hover:bg-rose-500/10"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {!isBooked && bookingType === "admin_view" && selectedEvent && (
              <div className="bg-slate-50/50 dark:bg-[#151522]/45 backdrop-blur-md p-5 rounded-none border border-slate-200/60 dark:border-[#2A2A40] mb-6 space-y-3.5">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold border-b border-slate-200/40 dark:border-zinc-800/50 pb-2 flex items-center gap-1.5 font-sans tracking-wider">
                  <ShieldCheck size={14} className="text-tenant-primary dark:text-white" />
                  Detaily rezervované lekce / plochy
                </p>
                <div className="text-xs space-y-2.5">
                  <div className="flex justify-between py-0.5 border-b border-slate-200/40 dark:border-zinc-800/40">
                    <span className="text-slate-400 dark:text-slate-500">Plocha / Lekce:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-semibold">{selectedEvent.resourceName}</span>
                  </div>
                  {selectedEvent.status && (
                    <div className="flex justify-between py-0.5 border-b border-slate-200/40 dark:border-zinc-800/40">
                      <span className="text-slate-400 dark:text-slate-500">Stav:</span>
                      <span className={`px-2 py-0.5 rounded-none text-[10px] font-bold ${
                        selectedEvent.status === "CONFIRMED"
                          ? "bg-tenant-primary/10 text-tenant-primary border border-tenant-primary/20"
                          : selectedEvent.status === "ATTENDED"
                            ? "bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20"
                            : selectedEvent.status === "PENDING_PAYMENT"
                              ? "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border border-zinc-500/20"
                              : "bg-slate-500/10 text-slate-550 border border-slate-500/20"
                      }`}>
                        {selectedEvent.status === "CONFIRMED" ? "Potvrzeno" : selectedEvent.status === "PENDING_PAYMENT" ? "Čeká na platbu" : selectedEvent.status === "ATTENDED" ? "Odbaveno" : selectedEvent.status}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-0.5 border-b border-slate-200/40 dark:border-zinc-800/40">
                    <span className="text-slate-400 dark:text-slate-500">Rezervoval:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-semibold">{selectedEvent.name}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-200/40 dark:border-zinc-800/40">
                    <span className="text-slate-400 dark:text-slate-500">E-mail uživatele:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-mono font-medium">{selectedEvent.instructor}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-200/40 dark:border-zinc-800/40">
                    <span className="text-slate-400 dark:text-slate-500">Rezervovaný čas:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-semibold text-right">
                      {ALL_WEEK_DAYS[selectedEvent.dayIndex]?.name || "Den"} ({formatHourString(selectedEvent.startHour)} – {formatHourString(selectedEvent.startHour + selectedEvent.durationHours)})
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-400 dark:text-slate-500">ID rezervace:</span>
                    <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px] select-all max-w-[180px] truncate" title={selectedEvent.id}>
                      {selectedEvent.id}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {!isBooked && bookingType === "event" && selectedEvent && (
              <div className="bg-slate-50/50 dark:bg-[#151522]/45 backdrop-blur-md p-5 rounded-none border border-slate-200/60 dark:border-[#2A2A40] mb-6 space-y-2.5">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold border-b border-slate-200/40 dark:border-zinc-800/50 pb-2 font-sans tracking-wider">Program lekce</p>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedEvent.name}</h4>
                
                <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-200/40 dark:border-zinc-800/50 text-xs">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-medium uppercase tracking-wider mb-0.5">Lektor / Trenér:</span>
                    <span className="text-slate-700 dark:text-slate-350 font-semibold">{selectedEvent.instructor}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-medium uppercase tracking-wider mb-0.5">Místnost:</span>
                    <span className="text-slate-700 dark:text-slate-350 font-semibold">{selectedEvent.room}</span>
                  </div>
                </div>
              </div>
            )}

            {!isBooked && bookingType === "custom" && selectedDayIndex !== null && (() => {
              const isCurrentSelectionAvailable = isResourceAvailable(customResourceId, selectedDayIndex, selectedTimeStr, customDuration);
              const activeResource = resources.find(r => r.id === customResourceId);
              const hourlyRate = Number((activeResource?.attributes as any)?.price) || 0;
              const estimatedPrice = hourlyRate * customDuration;
              return (
                <div className="space-y-4 mb-6 bg-slate-50/50 dark:bg-[#151522]/45 backdrop-blur-md p-5 rounded-none border border-slate-200/60 dark:border-[#2A2A40]">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold border-b border-slate-200/40 dark:border-zinc-800/50 pb-2 mb-2 flex items-center gap-1.5 font-sans tracking-wider">
                    <Calendar size={14} className="text-tenant-primary dark:text-white" />
                    Rezervace hrací plochy
                  </p>
   
                  {/* Resource Selector Dropdown if multiple exist */}
                  {resources && resources.length > 0 && (() => {
                    const dropdownResources = resources.filter(res => {
                      const getRoot = (id: string): string => {
                        const r = resources.find(item => item.id === id);
                        if (!r || !r.parentId) return id;
                        return getRoot(r.parentId);
                      };
                      return getRoot(res.id) === activeRootId;
                    });
                    
                    const activeResource = dropdownResources.find(res => res.id === customResourceId);

                    return (
                      <div>
                        <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Vyberte plochu/sektor</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsAreaDropdownOpen(!isAreaDropdownOpen);
                              setIsDurationDropdownOpen(false);
                            }}
                            className="w-full flex items-center justify-between text-xs py-2.5 px-3.5 bg-white/50 dark:bg-[#151522]/55 border border-slate-200/80 dark:border-[#2A2A40] rounded-none text-left text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary transition-all hover:bg-white/80 dark:hover:bg-[#1B1B2B]/75"
                          >
                            <span>
                              {activeResource ? activeResource.name : "Vyberte plochu/sektor"}
                            </span>
                            <ChevronDown size={14} className={`text-slate-450 dark:text-slate-500 transition-transform duration-200 ${isAreaDropdownOpen ? "rotate-180" : ""}`} />
                          </button>
                          
                          {isAreaDropdownOpen && (
                            <div className="absolute left-0 right-0 mt-1.5 bg-white/95 dark:bg-[#0D0D15]/95 backdrop-blur-xl border border-slate-200/60 dark:border-[#2A2A40] rounded-none shadow-xl z-55 overflow-hidden max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                              {dropdownResources.map((res) => {
                                const available = isResourceAvailable(res.id, selectedDayIndex, selectedTimeStr, customDuration);
                                const isSelected = res.id === customResourceId;
                                return (
                                  <button
                                    key={res.id}
                                    type="button"
                                    disabled={!available}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCustomResourceId(res.id);
                                      setIsAreaDropdownOpen(false);
                                      setModalError(null);
                                    }}
                                    className={`w-full text-left text-xs py-2.5 px-3.5 flex items-center justify-between transition-colors ${
                                      !available 
                                        ? "text-slate-400/40 dark:text-slate-650/40 line-through cursor-not-allowed bg-slate-50/20 dark:bg-slate-900/10" 
                                        : isSelected
                                          ? "bg-tenant-primary/15 text-tenant-primary dark:text-white font-semibold"
                                          : "text-slate-700 dark:text-slate-355 hover:bg-slate-100/60 dark:hover:bg-[#1A1A2E]/60"
                                    }`}
                                  >
                                    <span>{res.name}</span>
                                    {isSelected && <Check size={12} className="text-tenant-primary dark:text-white" />}
                                    {!available && <span className="text-[9px] opacity-75 font-normal italic">(Obsazeno)</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
   
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block font-bold uppercase tracking-wider mb-0.5 text-[10px]">Den:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">{ALL_WEEK_DAYS[selectedDayIndex]?.name || ""}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block font-bold uppercase tracking-wider mb-0.5 text-[10px]">Začátek:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-mono font-semibold">{selectedTimeStr}</span>
                    </div>
                  </div>
   
                  {/* Duration Picker */}
                  <div>
                    <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Doba trvání</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDurationDropdownOpen(!isDurationDropdownOpen);
                          setIsAreaDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between text-xs py-2.5 px-3.5 bg-white/50 dark:bg-[#151522]/55 border border-slate-200/80 dark:border-[#2A2A40] rounded-none text-left text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary transition-all hover:bg-white/80 dark:hover:bg-[#1B1B2B]/75"
                      >
                        <span>{formatDurationCzech(customDuration)}</span>
                        <ChevronDown size={14} className={`text-slate-450 dark:text-slate-500 transition-transform duration-200 ${isDurationDropdownOpen ? "rotate-180" : ""}`} />
                      </button>
                      
                      {isDurationDropdownOpen && (
                        <div className="absolute left-0 right-0 mt-1.5 bg-white/95 dark:bg-[#0D0D15]/95 backdrop-blur-xl border border-slate-200/60 dark:border-[#2A2A40] rounded-none shadow-xl z-55 overflow-hidden max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                          {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0, 8.0].map((val) => {
                            const isSelected = val === customDuration;
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCustomDuration(val);
                                  setIsDurationDropdownOpen(false);
                                  setModalError(null);
                                }}
                                className={`w-full text-left text-xs py-2.5 px-3.5 flex items-center justify-between transition-colors ${
                                  isSelected
                                    ? "bg-tenant-primary/15 text-tenant-primary dark:text-white font-semibold"
                                    : "text-slate-700 dark:text-slate-355 hover:bg-slate-100/60 dark:hover:bg-[#1A1A2E]/60"
                                }`}
                              >
                                <span>{formatDurationCzech(val)}</span>
                                {isSelected && <Check size={12} className="text-tenant-primary dark:text-white" />}
                              </button>
                            );
                          })}
                          {![0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0, 8.0].includes(customDuration) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsDurationDropdownOpen(false);
                                setModalError(null);
                              }}
                              className="w-full text-left text-xs py-2.5 px-3.5 flex items-center justify-between bg-tenant-primary/15 text-tenant-primary dark:text-white font-semibold"
                            >
                              <span>{formatDurationCzech(customDuration)}</span>
                              <Check size={12} className="text-tenant-primary dark:text-white" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price info if > 0 */}
                  {estimatedPrice > 0 && (
                    <div className="flex justify-between items-center py-2.5 px-4 bg-tenant-primary/10 dark:bg-tenant-primary/5 border border-tenant-primary/20 rounded-none text-xs font-semibold text-tenant-primary dark:text-zinc-200 select-none animate-in fade-in duration-200">
                      <span>Cena pronájmu:</span>
                      <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">{estimatedPrice.toLocaleString("cs-CZ")} Kč</span>
                    </div>
                  )}

                  {/* Recurrence Selection Toggle & Form */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-[#2A2A40]/40 mt-3 pt-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Opakovat rezervaci</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">Vytvořit sérii pravidelných termínů</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={recurrencePattern !== "none"}
                          onChange={(e) => {
                            setRecurrencePattern(e.target.checked ? "weekly" : "none");
                            if (e.target.checked && !recurrenceCount) {
                              setRecurrenceCount(4);
                            }
                            setModalError(null);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-none peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-none after:h-4 after:w-4 after:transition-all dark:after:border-slate-650 peer-checked:bg-[#7000FF]"></div>
                      </label>
                    </div>

                    {recurrencePattern !== "none" && (
                      <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-dashed border-slate-150 dark:border-[#2A2A40]/40 animate-in fade-in slide-in-from-top-2 duration-250">
                        <div>
                          <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Frekvence</label>
                          <div className="flex bg-slate-100/70 dark:bg-[#0D0D15]/60 p-1 rounded-none gap-1 border border-slate-200/40 dark:border-[#2A2A40]/30">
                            {[
                              { value: "weekly", label: "Týdně" },
                              { value: "bi-weekly", label: "14 dní" },
                              { value: "monthly", label: "Měsíc" }
                            ].map((opt) => {
                              const isSelected = recurrencePattern === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => {
                                    setRecurrencePattern(opt.value as any);
                                    setModalError(null);
                                  }}
                                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-none transition-all ${
                                    isSelected
                                      ? "bg-[#7000FF] text-white shadow-md shadow-[#7000FF]/15"
                                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Počet opakování</label>
                          <div className="flex items-center justify-between bg-slate-100/70 dark:bg-[#0D0D15]/60 p-1 rounded-none border border-slate-200/40 dark:border-[#2A2A40]/30 h-[34px]">
                            <button
                              type="button"
                              onClick={() => {
                                setRecurrenceCount(Math.max(2, recurrenceCount - 1));
                                setModalError(null);
                              }}
                              className="w-8 h-full flex items-center justify-center text-sm font-extrabold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-none hover:bg-slate-200/60 dark:hover:bg-[#1C1C2D]/60 transition-colors"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold text-slate-850 dark:text-slate-150">
                              {recurrenceCount}x
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setRecurrenceCount(Math.min(12, recurrenceCount + 1));
                                setModalError(null);
                              }}
                              className="w-8 h-full flex items-center justify-center text-sm font-extrabold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-none hover:bg-slate-200/60 dark:hover:bg-[#1C1C2D]/60 transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {!isCurrentSelectionAvailable && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-550 dark:text-red-400 text-[10px] p-3 rounded-none font-medium leading-normal flex items-start gap-1.5">
                      <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
                      <span>Vybraná plocha/sektor není v tomto čase a délce trvání k dispozici kvůli překrývající se rezervaci.</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Guest/Anonymous Booking Form fields */}
            {!isBooked && (!session || !session.user || isAdmin) && bookingType !== "admin_view" && (
              <div className="space-y-4 mb-6 p-5 bg-slate-50/50 dark:bg-[#151522]/45 backdrop-blur-md rounded-none border border-slate-200/60 dark:border-[#2A2A40] text-xs">
                <div className="font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200/40 dark:border-zinc-800/50 pb-2 mb-2 flex items-center justify-between flex-wrap gap-2">
                  <span>
                    {isAdmin 
                      ? "Údaje o zákazníkovi, pro kterého rezervujete" 
                      : "Údaje o rezervaci pro hosta (anonymní)"
                    }
                  </span>
                  {isAdmin && (
                    <span className="bg-tenant-primary/15 text-tenant-primary dark:bg-tenant-primary/10 dark:text-zinc-200 px-2 py-0.5 rounded-none text-[9px] uppercase font-bold tracking-wider border border-tenant-primary/20">
                      Admin vstup
                    </span>
                  )}
                </div>

                {isAdmin && partners && partners.length > 0 && (
                  <div className="mb-3">
                    <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1 font-bold uppercase tracking-wider">
                      Přiřadit partnerovi (volitelné)
                    </label>
                    <select
                      value={selectedPartnerId}
                      onChange={(e) => {
                        const pid = e.target.value;
                        setSelectedPartnerId(pid);
                        if (pid) {
                          const partner = partners.find(p => p.id === pid);
                          if (partner) {
                            setGuestName(partner.name);
                            setGuestEmail(partner.email);
                          }
                        } else {
                          setGuestName("");
                          setGuestEmail("");
                        }
                        setModalError(null);
                      }}
                      className="w-full text-xs py-2 px-3.5 bg-white/50 dark:bg-[#151522]/55 border border-slate-200/80 dark:border-[#2A2A40] rounded-none text-slate-800 dark:text-slate-250 focus:outline-none focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] transition-all font-medium"
                    >
                      <option value="">-- Vyberte partnera (žádný) --</option>
                      {partners.filter(p => p.active).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1 font-bold uppercase tracking-wider">
                    {isAdmin ? "Jméno a příjmení zákazníka" : "Vaše celé jméno"}
                  </label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => {
                      setGuestName(e.target.value);
                      setModalError(null);
                    }}
                    className="w-full text-xs py-2 px-3.5 bg-white/50 dark:bg-[#151522]/55 border border-slate-200/80 dark:border-[#2A2A40] rounded-none text-slate-800 dark:text-slate-250 placeholder-slate-400/60 focus:outline-none focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] transition-all"
                    placeholder={isAdmin ? "např. Jan Novák" : "např. Jan Novák"}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1 font-bold uppercase tracking-wider">
                    {isAdmin ? "E-mailová adresa zákazníka" : "E-mailová adresa"}
                  </label>
                  <input
                    type="email"
                    required
                    value={guestEmail}
                    onChange={(e) => {
                      setGuestEmail(e.target.value);
                      setModalError(null);
                    }}
                    className="w-full text-xs py-2 px-3.5 bg-white/50 dark:bg-[#151522]/55 border border-slate-200/80 dark:border-[#2A2A40] rounded-none text-slate-800 dark:text-slate-250 placeholder-slate-400/60 focus:outline-none focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] transition-all"
                    placeholder={isAdmin ? "např. jan.novak@email.cz" : "např. jan.novak@email.cz"}
                  />
                </div>
              </div>
            )}

            {isBooked ? (
              <div className="flex flex-col items-center justify-center py-4 text-tenant-primary dark:text-white gap-4">
                <div className="flex flex-col items-center gap-2">
                  {isPendingPayment ? (
                    <div className="h-12 w-12 rounded-none bg-tenant-primary/10 dark:bg-tenant-primary/10 flex items-center justify-center animate-pulse shadow-neon-glow">
                      <span className="w-5 h-5 border-3 border-tenant-primary dark:border-tenant-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-none bg-tenant-primary/10 dark:bg-tenant-primary/10 flex items-center justify-center animate-bounce shadow-neon-glow">
                      <Check size={24} className="text-tenant-primary dark:text-white" />
                    </div>
                  )}
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {isPendingPayment 
                      ? "Rezervace byla vytvořena! Přesměrováváme k platbě..." 
                      : "Rezervace byla úspěšně potvrzena!"}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isPendingPayment}
                  onClick={closeBookingModalAndRefresh}
                  className="w-full py-2.5 rounded-none text-xs text-white font-bold bg-[#7000FF] hover:bg-[#5B00D6] dark:bg-[#7000FF] dark:hover:bg-[#6000EE] shadow-[0_4px_14px_rgba(112,0,255,0.3)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPendingPayment ? "Připravuji platbu..." : "Zavřít"}
                </button>
              </div>
            ) : bookingType === "admin_view" && selectedEvent ? (
              <div className="flex items-center gap-3 w-full">
                {isSelectedEventMyBooking && (
                  <button
                    onClick={() => {
                      setActiveTicket(selectedEvent);
                      setBookingType(null);
                      setSelectedEvent(null);
                    }}
                    className="flex-1 py-2.5 rounded-none text-xs font-bold text-white transition-all duration-200 bg-tenant-primary hover:opacity-95 active:scale-98 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer animate-in fade-in zoom-in-95 duration-200"
                  >
                    <Ticket size={14} />
                    Vstupenka
                  </button>
                )}
                <button
                  onClick={() => {
                    setBookingType(null);
                    setSelectedEvent(null);
                  }}
                  className="flex-1 py-2.5 rounded-none text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-350 border border-slate-200/40 dark:border-slate-700/40 transition-colors cursor-pointer"
                >
                  Zavřít
                </button>
                <button
                  onClick={() => {
                    const hasSeries = !!selectedEvent.recurrenceGroup;
                    const executeCancellation = async (cancelSeries: boolean) => {
                      try {
                        const res = await fetch(`/api/bookings?bookingId=${selectedEvent.id}&cancelSeries=${cancelSeries}`, {
                          method: "DELETE"
                        });
                        if (res.ok) {
                          setNotification({
                            type: "success",
                            title: "Rezervace zrušena",
                            message: cancelSeries ? "Celá série rezervací byla úspěšně zrušena!" : "Rezervace byla úspěšně zrušena!",
                            onClose: () => {
                              setBookingType(null);
                              setSelectedEvent(null);
                              window.location.reload();
                            }
                          });
                        } else {
                          const data = await res.json();
                          setNotification({
                            type: "error",
                            title: "Zrušení selhalo",
                            message: "Chyba při rušení rezervace: " + (data.error || "Neznámá chyba")
                          });
                        }
                      } catch (err) {
                        console.error(err);
                        setNotification({
                          type: "error",
                          title: "Chyba",
                          message: "Nepodařilo se připojit k serveru."
                        });
                      }
                    };

                    if (hasSeries) {
                      setConfirmModal({
                        title: "Zrušit rezervaci",
                        message: "Tato rezervace je součástí opakující se série. Chcete zrušit pouze tento termín, nebo celou sérii?",
                        confirmLabel: "Zrušit celou sérii",
                        cancelLabel: "Zpět",
                        thirdOptionLabel: "Pouze tento termín",
                        onConfirm: () => executeCancellation(true),
                        onThirdOption: () => executeCancellation(false)
                      });
                    } else {
                      setConfirmModal({
                        title: "Zrušit rezervaci",
                        message: "Opravdu chcete zrušit tuto rezervaci?",
                        confirmLabel: "Zrušit",
                        cancelLabel: "Zpět",
                        onConfirm: () => executeCancellation(false)
                      });
                    }
                  }}
                  className="btn-danger-filled flex-1 py-2.5 rounded-none text-xs font-bold"
                >
                  Zrušit rezervaci
                </button>
              </div>
            ) : (() => {
              const isCurrentSelectionAvailable = bookingType === "custom" && selectedDayIndex !== null 
                ? isResourceAvailable(customResourceId, selectedDayIndex, selectedTimeStr, customDuration)
                : true;
               return (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setBookingType(null);
                      setSelectedEvent(null);
                      setSelectedDayIndex(null);
                      setGuestName("");
                      setGuestEmail("");
                      setSelectedPartnerId("");
                      setModalError(null);
                      window.dispatchEvent(new CustomEvent("assistant-booking-cancelled"));
                    }}
                    disabled={isPending}
                    className="flex-1 py-2.5 rounded-none text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-[#151522]/55 dark:hover:bg-[#1C1C30]/55 text-slate-700 dark:text-slate-300 border border-slate-200/40 dark:border-[#2A2A40] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Zrušit
                  </button>
                  <button
                    onClick={handleBooking}
                    disabled={!isCurrentSelectionAvailable || isPending}
                    className="flex-1 py-2.5 rounded-none text-xs text-white font-bold bg-[#7000FF] hover:bg-[#5B00D6] dark:bg-[#7000FF] dark:hover:bg-[#6000EE] shadow-[0_4px_14px_rgba(112,0,255,0.3)] transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {isPending ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Rezervuje se...
                      </>
                    ) : (
                      "Potvrdit rezervaci"
                    )}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      {/* 4. Reusable Confirm Modal */}
      <ConfirmDialog
        isOpen={confirmModal !== null}
        title={confirmModal?.title || ""}
        message={confirmModal?.message || ""}
        confirmLabel={confirmModal?.confirmLabel || "Potvrdit"}
        cancelLabel={confirmModal?.cancelLabel || "Zrušit"}
        onCancel={() => setConfirmModal(null)}
        onConfirm={async () => {
          if (confirmModal) {
            const onConf = confirmModal.onConfirm;
            setConfirmModal(null);
            await onConf();
          }
        }}
        onThirdOption={confirmModal?.onThirdOption}
        thirdOptionLabel={confirmModal?.thirdOptionLabel}
      />

      {/* 5. Reusable Alert/Notification Modal */}
      <AlertDialog
        isOpen={notification !== null}
        type={notification?.type || "info"}
        title={notification?.title || ""}
        message={notification?.message || ""}
        onClose={() => {
          if (notification) {
            const onCl = notification.onClose;
            setNotification(null);
            if (onCl) onCl();
          }
        }}
      />

      {/* Ticket boarding pass modal overlay */}
      {activeTicket && (
        <div 
          onClick={() => setActiveTicket(null)}
          className="fixed inset-0 bg-[#07070C]/75 backdrop-blur-md flex items-center justify-center p-6 z-55 animate-in fade-in duration-200"
        >
          {/* Boarding Pass Ticket representation */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm relative flex flex-col filter drop-shadow-[0_25px_50px_rgba(0,0,0,0.5)] z-10"
          >
            {/* Ticket Top Part */}
            <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-[#1E1E2F] dark:via-[#0D0D15] dark:to-[#0D0D15] rounded-none rounded-none border-t border-x border-slate-200/60 dark:border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] p-6 pb-4 text-xs space-y-4 text-slate-800 dark:text-slate-200 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
              {/* Metallic Sheen Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] dark:via-white/[0.02] to-transparent pointer-events-none z-10 rotate-12 scale-150" />
              
              {/* Glow badge */}
              <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-tr from-tenant-primary to-tenant-primary opacity-[0.12] dark:opacity-20 blur-2xl rounded-full pointer-events-none" />
              
              <div className="flex items-center justify-between relative z-20">
                <span className="font-extrabold text-[10px] uppercase tracking-widest text-tenant-primary dark:text-white">
                  Rezervační portál
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-none bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold uppercase tracking-wider">
                  Aktivní vstup
                </span>
              </div>

              <div className="relative z-20">
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Sportoviště / Plocha</span>
                <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 leading-tight mt-0.5">{activeTicket.resourceName || activeTicket.name}</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dashed border-slate-200 dark:border-white/10 mt-2 relative z-20">
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Datum vstupu</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{getSelectedEventDateString(activeTicket.dayIndex)}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Časový úsek</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{getSelectedEventTimeRange(activeTicket)}</p>
                </div>
              </div>
            </div>

            {/* Ticket Divider */}
            <div className="relative h-[1px] z-20">
              <div className="absolute left-6 right-6 border-t border-dashed border-slate-300 dark:border-white/10 -translate-y-1/2" />
            </div>

            {/* Ticket Bottom Part (QR Code) */}
            <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-[#0D0D15] dark:via-[#0D0D15] dark:to-[#0B0B12] rounded-none-b-[2.5rem] rounded-none-t-2xl border-b border-x border-slate-200/60 dark:border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-6 pt-4 flex flex-col items-center text-center gap-4 relative overflow-hidden">
              {/* Metallic Sheen Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] dark:via-white/[0.02] to-transparent pointer-events-none z-10 rotate-12 scale-150" />
              
              <div className="flex items-center gap-2 select-none bg-emerald-500/10 dark:bg-emerald-500/25 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 py-1 px-3 rounded-none text-[9px] font-extrabold uppercase tracking-wider relative z-20">
                Aktivní zabezpečený kód
              </div>
              
              {/* Premium looking QR Code visual representation */}
              <div className="relative p-4 bg-white rounded-none border border-slate-200 flex items-center justify-center shadow-md select-none overflow-hidden group z-20">
                <div className="h-40 w-40 flex flex-col items-center justify-center bg-white rounded-none relative overflow-hidden text-slate-800">
                  {dynamicQrPayload ? (
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(dynamicQrPayload)}`}
                      alt={`QR Code pro rezervaci ${activeTicket.id}`}
                      className="h-36 w-36 object-contain transition-all duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="animate-spin text-tenant-primary" size={24} />
                      <span className="text-[10px] text-slate-400 font-bold">Šifrování...</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 relative z-20 w-full">
                <code className="text-[9px] font-mono text-slate-550 dark:text-slate-400 uppercase tracking-widest bg-white/70 dark:bg-slate-900/40 py-1 px-3.5 rounded-none border border-slate-200 dark:border-white/[0.05]">
                  {activeTicket.id.substring(0, 8)}...{activeTicket.id.substring(activeTicket.id.length - 8)}
                </code>
                
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 dark:text-zinc-500 font-semibold select-none">
                  <span className="w-16 h-1 bg-slate-200 dark:bg-zinc-800 rounded-none overflow-hidden relative">
                    <span 
                      className="absolute inset-y-0 left-0 bg-tenant-primary transition-all duration-1000"
                      style={{ width: `${(qrTimeLeft / 60) * 100}%` }}
                    />
                  </span>
                  <span>Obnova za {qrTimeLeft}s</span>
                </div>
              </div>

              <p className="text-[9px] text-slate-400 dark:text-zinc-500 leading-normal max-w-[220px] relative z-20">
                Kód se z bezpečnostních důvodů každou minutu generuje znovu a bliká. Snímky obrazovky ani videozáznamy nebudou čtečkou přijaty.
              </p>

              <button
                onClick={() => setActiveTicket(null)}
                className="w-full py-2.5 bg-tenant-gradient hover:opacity-95 text-white text-xs font-bold rounded-none transition-all cursor-pointer mt-2 relative z-20 shadow-md shadow-tenant-primary/15 active:scale-[0.98]"
              >
                Zavřít vstupenku
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

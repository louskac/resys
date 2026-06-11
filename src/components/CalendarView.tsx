"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Check, Calendar, AlertCircle, ShieldCheck, Lock, ChevronDown, X } from "lucide-react";
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
}

interface CalendarViewProps {
  tenantId: string;
  initialEvents: CalendarEvent[];
  session: { user?: { name?: string | null; email?: string | null } } | null;
  resources: { id: string; name: string; parentId?: string | null }[];
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
    badgeBg: "bg-rose-500/10 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/15 dark:border-rose-500/10 font-bold text-[7.5px] tracking-wide rounded-md px-1.5 py-0.5 uppercase",
    themeClassOccupied: "bg-white dark:bg-[#0E0E18] border-l-[4px] border-l-rose-500 border-y border-r border-[#E2E2ED]/85 dark:border-[#1F1F2E]/85 text-rose-950 dark:text-rose-200 shadow-sm rounded-2xl hover:scale-[1.01] hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:shadow-md transition-all duration-300 ease-out font-medium",
    themeClassFree: "bg-white dark:bg-[#0E0E18] border border-[#E2E2ED] dark:border-[#1F1F2E] text-slate-800 dark:text-slate-355 hover:border-rose-500/40 dark:hover:border-rose-450/30 hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:scale-[1.01] hover:shadow-md transition-all duration-300 ease-out shadow-sm rounded-2xl",
    textHex: "text-rose-950 dark:text-rose-200",
    barColor: "bg-rose-500 shadow-[0_0_8px_#f43f5e]",
    glowColor: "rgba(244,63,94,0.15)",
    colorName: "rose"
  },
  amber: {
    badgeBg: "bg-amber-500/10 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/15 dark:border-amber-500/10 font-bold text-[7.5px] tracking-wide rounded-md px-1.5 py-0.5 uppercase",
    themeClassOccupied: "bg-white dark:bg-[#0E0E18] border-l-[4px] border-l-amber-500 border-y border-r border-[#E2E2ED]/85 dark:border-[#1F1F2E]/85 text-amber-950 dark:text-amber-200 shadow-sm rounded-2xl hover:scale-[1.01] hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:shadow-md transition-all duration-300 ease-out font-medium",
    themeClassFree: "bg-white dark:bg-[#0E0E18] border border-[#E2E2ED] dark:border-[#1F1F2E] text-slate-800 dark:text-slate-355 hover:border-amber-500/40 dark:hover:border-amber-450/30 hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:scale-[1.01] hover:shadow-md transition-all duration-300 ease-out shadow-sm rounded-2xl",
    textHex: "text-amber-955 dark:text-amber-200",
    barColor: "bg-amber-500 shadow-[0_0_8px_#f59e0b]",
    glowColor: "rgba(245,158,11,0.15)",
    colorName: "amber"
  },
  emerald: {
    badgeBg: "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/15 dark:border-emerald-500/10 font-bold text-[7.5px] tracking-wide rounded-md px-1.5 py-0.5 uppercase",
    themeClassOccupied: "bg-white dark:bg-[#0E0E18] border-l-[4px] border-l-emerald-500 border-y border-r border-[#E2E2ED]/85 dark:border-[#1F1F2E]/85 text-emerald-950 dark:text-emerald-200 shadow-sm rounded-2xl hover:scale-[1.01] hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:shadow-md transition-all duration-300 ease-out font-medium",
    themeClassFree: "bg-white dark:bg-[#0E0E18] border border-[#E2E2ED] dark:border-[#1F1F2E] text-slate-800 dark:text-slate-355 hover:border-emerald-500/40 dark:hover:border-emerald-450/30 hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:scale-[1.01] hover:shadow-md transition-all duration-300 ease-out shadow-sm rounded-2xl",
    textHex: "text-emerald-955 dark:text-emerald-200",
    barColor: "bg-emerald-500 shadow-[0_0_8px_#10b981]",
    glowColor: "rgba(16,185,129,0.15)",
    colorName: "emerald"
  },
  orange: {
    badgeBg: "bg-orange-500/10 dark:bg-orange-500/20 text-orange-850 dark:text-orange-300 border border-orange-500/15 dark:border-orange-500/10 font-bold text-[7.5px] tracking-wide rounded-md px-1.5 py-0.5 uppercase",
    themeClassOccupied: "bg-white dark:bg-[#0E0E18] border-l-[4px] border-l-orange-500 border-y border-r border-[#E2E2ED]/85 dark:border-[#1F1F2E]/85 text-orange-955 dark:text-orange-200 shadow-sm rounded-2xl hover:scale-[1.01] hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:shadow-md transition-all duration-300 ease-out font-medium",
    themeClassFree: "bg-white dark:bg-[#0E0E18] border border-[#E2E2ED] dark:border-[#1F1F2E] text-slate-800 dark:text-slate-355 hover:border-orange-500/40 dark:hover:border-orange-450/30 hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:scale-[1.01] hover:shadow-md transition-all duration-300 ease-out shadow-sm rounded-2xl",
    textHex: "text-orange-955 dark:text-orange-200",
    barColor: "bg-orange-500 shadow-[0_0_8px_#f97316]",
    glowColor: "rgba(249,115,22,0.15)",
    colorName: "orange"
  },
  blue: {
    badgeBg: "bg-blue-500/10 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-500/15 dark:border-blue-500/10 font-bold text-[7.5px] tracking-wide rounded-md px-1.5 py-0.5 uppercase",
    themeClassOccupied: "bg-white dark:bg-[#0E0E18] border-l-[4px] border-l-blue-500 border-y border-r border-[#E2E2ED]/85 dark:border-[#1F1F2E]/85 text-blue-955 dark:text-blue-200 shadow-sm rounded-2xl hover:scale-[1.01] hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:shadow-md transition-all duration-300 ease-out font-medium",
    themeClassFree: "bg-white dark:bg-[#0E0E18] border border-[#E2E2ED] dark:border-[#1F1F2E] text-slate-800 dark:text-slate-355 hover:border-blue-500/40 dark:hover:border-blue-450/30 hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:scale-[1.01] hover:shadow-md transition-all duration-300 ease-out shadow-sm rounded-2xl",
    textHex: "text-blue-955 dark:text-blue-200",
    barColor: "bg-blue-500 shadow-[0_0_8px_#3b82f6]",
    glowColor: "rgba(59,130,246,0.15)",
    colorName: "blue"
  },
  violet: {
    badgeBg: "bg-violet-500/10 dark:bg-violet-500/20 text-violet-800 dark:text-violet-300 border border-violet-500/15 dark:border-violet-500/10 font-bold text-[7.5px] tracking-wide rounded-md px-1.5 py-0.5 uppercase",
    themeClassOccupied: "bg-white dark:bg-[#0E0E18] border-l-[4px] border-l-violet-500 border-y border-r border-[#E2E2ED]/85 dark:border-[#1F1F2E]/85 text-violet-955 dark:text-[#A78BFA] shadow-sm rounded-2xl hover:scale-[1.01] hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:shadow-md transition-all duration-300 ease-out font-medium",
    themeClassFree: "bg-white dark:bg-[#0E0E18] border border-[#E2E2ED] dark:border-[#1F1F2E] text-slate-800 dark:text-slate-355 hover:border-violet-500/40 dark:hover:border-violet-450/30 hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:scale-[1.01] hover:shadow-md transition-all duration-300 ease-out shadow-sm rounded-2xl",
    textHex: "text-violet-955 dark:text-[#A78BFA]",
    barColor: "bg-violet-500 shadow-[0_0_8px_#8b5cf6]",
    glowColor: "rgba(139,92,246,0.15)",
    colorName: "violet"
  },
  indigo: {
    badgeBg: "bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-500/15 dark:border-indigo-500/10 font-bold text-[7.5px] tracking-wide rounded-md px-1.5 py-0.5 uppercase",
    themeClassOccupied: "bg-white dark:bg-[#0E0E18] border-l-[4px] border-l-indigo-500 border-y border-r border-[#E2E2ED]/85 dark:border-[#1F1F2E]/85 text-indigo-955 dark:text-[#A78BFA] shadow-sm rounded-2xl hover:scale-[1.01] hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:shadow-md transition-all duration-300 ease-out font-medium",
    themeClassFree: "bg-white dark:bg-[#0E0E18] border border-[#E2E2ED] dark:border-[#1F1F2E] text-slate-800 dark:text-slate-355 hover:border-indigo-500/40 dark:hover:border-indigo-400/30 hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:scale-[1.01] hover:shadow-md transition-all duration-300 ease-out shadow-sm rounded-2xl",
    textHex: "text-indigo-955 dark:text-[#A78BFA]",
    barColor: "bg-indigo-500 shadow-[0_0_8px_#6366f1]",
    glowColor: "rgba(99,102,241,0.15)",
    colorName: "indigo"
  },
  cyan: {
    badgeBg: "bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-500/15 dark:border-cyan-500/10 font-bold text-[7.5px] tracking-wide rounded-md px-1.5 py-0.5 uppercase",
    themeClassOccupied: "bg-white dark:bg-[#0E0E18] border-l-[4px] border-l-cyan-500 border-y border-r border-[#E2E2ED]/85 dark:border-[#1F1F2E]/85 text-cyan-955 dark:text-cyan-200 shadow-sm rounded-2xl hover:scale-[1.01] hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:shadow-md transition-all duration-300 ease-out font-medium",
    themeClassFree: "bg-white dark:bg-[#0E0E18] border border-[#E2E2ED] dark:border-[#1F1F2E] text-slate-800 dark:text-slate-355 hover:border-cyan-500/40 dark:hover:border-cyan-450/30 hover:bg-slate-50/50 dark:hover:bg-[#131322]/50 hover:scale-[1.01] hover:shadow-md transition-all duration-300 ease-out shadow-sm rounded-2xl",
    textHex: "text-cyan-955 dark:text-cyan-200",
    barColor: "bg-cyan-500 shadow-[0_0_8px_#06b6d4]",
    glowColor: "rgba(6,182,212,0.15)",
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
    <div className="flex flex-wrap gap-2 p-1 bg-slate-200/40 dark:bg-[#0F0F1A]/60 backdrop-blur-md rounded-2xl border border-[#CBD5E1]/20 dark:border-[#1F1F2E] w-fit shadow-inner">
      {options.map((option) => {
        const isActive = activeValue === option.value;
        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              isActive
                ? "bg-white dark:bg-[#1B1B2E] border border-[#E2E2ED] dark:border-[#2A2A3E]/60 text-[#7000FF] dark:text-[#A78BFA] shadow-sm scale-[1.02]"
                : "border border-transparent bg-white/40 dark:bg-[#131322]/40 text-slate-500 dark:text-zinc-450 hover:text-[#7000FF] dark:hover:text-[#A78BFA]"
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
  openingHours = defaultOpeningHours
}: CalendarViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rootResources = resources.filter(r => !r.parentId);

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
    }
    return resources.find(r => slugify(r.name) === slugOrId) || null;
  };
  
  const activeRootId = (() => {
    const rootFromUrl = searchParams.get("root") || searchParams.get("rootId");
    const matchedRes = findResourceBySlugOrId(rootFromUrl);
    if (matchedRes && rootResources.some(r => r.id === matchedRes.id)) {
      return matchedRes.id;
    }
    return rootResources[0]?.id || "";
  })();

  const selectedResourceId = (() => {
    const resFromUrl = searchParams.get("resource") || searchParams.get("resourceId");
    const matchedRes = findResourceBySlugOrId(resFromUrl);
    if (matchedRes && resources.some(r => r.id === matchedRes.id)) {
      const isChildOfActiveRoot = matchedRes.id === activeRootId || matchedRes.parentId === activeRootId;
      if (isChildOfActiveRoot) {
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
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");

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
    setGuestName("");
    setGuestEmail("");
    setModalError(null);
    setIsPending(false);
    setIsAreaDropdownOpen(false);
    setIsDurationDropdownOpen(false);
    router.refresh();
  };

  const baseDate = activeDate ? new Date(`${activeDate}T00:00:00`) : new Date("2026-06-08T00:00:00");

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
  if (viewMode === "day") {
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
  const getConflictingResourceIds = (resId: string) => {
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
  };

  const isResourceAvailable = (resId: string, dayIdx: number | null, startStr: string, duration: number) => {
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
  };

  // Dynamic style mapper based on resource name hashes for any N resources
  const getResourceStyles = (resourceName: string, isOccupied?: boolean, isAdminView: boolean = false) => {
    const nameLower = (resourceName || "").toLowerCase();
    const cursorClass = isOccupied ? (isAdminView ? "cursor-pointer" : "cursor-not-allowed") : "cursor-pointer";

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

  // Guest booking form states
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [modalError, setModalError] = useState<{ code: string; message: string } | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Custom alert and confirmation modal states
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void | Promise<void> } | null>(null);
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
  const [dragStartSlot, setDragStartSlot] = useState<{ dayIndex: number; timeIndex: number } | null>(null);
  const [dragCurrentSlot, setDragCurrentSlot] = useState<{ dayIndex: number; timeIndex: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleCellMouseDown = (e: React.MouseEvent, dayIdx: number, timeIdx: number) => {
    if (e.button !== 0) return; // Only left-click
    e.preventDefault();
    
    const timeStr = TIME_SLOTS[timeIdx];
    if (isSlotInPast(dayIdx, timeStr)) return;
    
    setIsDragging(true);
    setDragStartSlot({ dayIndex: dayIdx, timeIndex: timeIdx });
    setDragCurrentSlot({ dayIndex: dayIdx, timeIndex: timeIdx });
  };

  const handleCellMouseEnter = (dayIdx: number, timeIdx: number) => {
    if (!isDragging || !dragStartSlot) return;
    
    const timeStr = TIME_SLOTS[timeIdx];
    if (isSlotInPast(dayIdx, timeStr)) return;
    
    if (dayIdx === dragStartSlot.dayIndex) {
      setDragCurrentSlot({ dayIndex: dayIdx, timeIndex: timeIdx });
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
  }, [openingHours, openTime, closeTime]);

  const TIME_SLOTS = getOpeningSlots(calculatedOpenTime, calculatedCloseTime);
  const startHourOffset = parseInt(calculatedOpenTime.split(":")[0], 10);
  const totalSlotsCount = TIME_SLOTS.length;
  const totalHeightPx = totalSlotsCount * SLOT_HEIGHT;

  const isSlotClosed = React.useCallback((dbDayIndex: number, timeStr: string) => {
    if (!openingHours || openingHours.length === 0) return false;
    const dayConfig = openingHours[dbDayIndex];
    if (!dayConfig) return false;
    if (dayConfig.closed) return true;
    
    const [h, m] = timeStr.split(":").map(Number);
    const [oh, om] = dayConfig.openTime.split(":").map(Number);
    const [ch, cm] = dayConfig.closeTime.split(":").map(Number);
    
    const timeVal = h * 60 + m;
    const openVal = oh * 60 + om;
    const closeVal = ch * 60 + cm;
    
    return timeVal < openVal || timeVal >= closeVal;
  }, [openingHours]);

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

    try {
      setModalError(null);
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        setModalError({
          code: err.code || "UNKNOWN_ERROR",
          message: err.message || "Failed to confirm reservation."
        });
        setIsPending(false);
        return;
      }

      setIsBooked(true);
      const timer = setTimeout(() => {
        closeBookingModalAndRefresh();
      }, 2000);
      bookingTimeoutRef.current = timer;
    } catch (e) {
      console.error(e);
      setModalError({
        code: "CONNECTION_FAILED",
        message: "Error connecting to the server. Please check your network connection."
      });
      setIsPending(false);
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
      } | null>;
      setDraftBooking(customEvent.detail);
      if (customEvent.detail) {
        setCustomResourceId(customEvent.detail.resourceId);
        setSelectedDayIndex(customEvent.detail.dayIndex);
        setSelectedTimeStr(formatHourString(customEvent.detail.startHour));
        setCustomDuration(customEvent.detail.duration);
        setGuestName(customEvent.detail.userName);
        if (customEvent.detail.userEmail) {
          setGuestEmail(customEvent.detail.userEmail);
        }
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

  return (
    <div className="p-6 bg-[#FAFAFD] dark:bg-[#060608] text-slate-800 dark:text-slate-100 border border-[#E2E2ED] dark:border-[#1F1F2E] rounded-2xl relative transition-all duration-300 font-sans shadow-2xl">
      {/* Calendar Header Control */}
      <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 mb-6 border-b border-[#E2E2ED]/60 dark:border-[#1F1F2E] pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <button 
              onClick={handlePrevWeek}
              className="p-2 rounded-xl bg-white/60 dark:bg-[#131322]/40 backdrop-blur-md hover:bg-white dark:hover:bg-[#1A1A2E]/60 text-slate-700 dark:text-slate-355 hover:text-[#7000FF] dark:hover:text-[#A78BFA] border border-[#E2E2ED] dark:border-[#1F1F2E] hover:border-[#7000FF]/30 dark:hover:border-[#A78BFA]/30 hover:scale-105 shadow-sm shadow-[#7000FF]/5 transition-all flex items-center justify-center cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={handleNextWeek}
              className="p-2 rounded-xl bg-white/60 dark:bg-[#131322]/40 backdrop-blur-md hover:bg-white dark:hover:bg-[#1A1A2E]/60 text-slate-700 dark:text-slate-355 hover:text-[#7000FF] dark:hover:text-[#A78BFA] border border-[#E2E2ED] dark:border-[#1F1F2E] hover:border-[#7000FF]/30 dark:hover:border-[#A78BFA]/30 hover:scale-105 shadow-sm shadow-[#7000FF]/5 transition-all flex items-center justify-center cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          
          {!isCurrent && (
            <button 
              onClick={handleToday}
              className="px-4 py-1.5 rounded-xl bg-[#7000FF]/10 dark:bg-[#7000FF]/15 text-[#7000FF] dark:text-[#A78BFA] border border-[#7000FF]/30 dark:border-[#7000FF]/40 hover:bg-[#7000FF]/20 dark:hover:bg-[#7000FF]/25 hover:scale-105 shadow-sm transition-all text-xs font-bold cursor-pointer backdrop-blur-sm"
            >
              Dnes
            </button>
          )}

          {/* Day/Week/Month Switcher */}
          <UnifiedSwitcher<"day" | "week" | "month">
            options={[
              { value: "day", label: "Den" },
              { value: "week", label: "Týden" },
              { value: "month", label: "Měsíc" }
            ]}
            activeValue={viewMode}
            onChange={setViewMode}
          />

          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#7000FF]/8 dark:bg-[#7000FF]/15 text-[#7000FF] dark:text-[#C084FC] border border-[#7000FF]/25 dark:border-[#8B5CF6]/30 backdrop-blur-sm select-none shadow-[inset_0_0.5px_0.5px_rgba(255,255,255,0.4)]">
            {events.length} {events.length === 1 ? "rezervace" : events.length >= 2 && events.length <= 4 ? "rezervace" : "rezervací"}
          </span>
        </div>
        
        <h2 className="text-xl font-extrabold tracking-tight xl:text-right bg-clip-text text-transparent bg-gradient-to-r from-[#7000FF] via-[#8B5CF6] to-indigo-500 dark:from-[#A78BFA] dark:via-[#C084FC] dark:to-indigo-400">
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

      {/* Sub-resource Selector (if children exist for the active root) */}
      {(() => {
        const children = resources.filter(r => r.parentId === activeRootId);
        if (children.length === 0) return null;
        
        const activeRoot = resources.find(r => r.id === activeRootId);
        return (
          <div className="mb-6">
            <UnifiedSwitcher<string>
              options={[
                { value: activeRootId, label: `Vše (${activeRoot?.name || "Vše"})` },
                ...children.map((child) => ({
                  value: child.id,
                  label: child.name
                }))
              ]}
              activeValue={selectedResourceId}
              onChange={selectResource}
            />
          </div>
        );
      })()}

      {/* Main Grid View */}
      <div className="overflow-x-auto">
        {viewMode !== "month" ? (
          <div className="min-w-[760px] border border-[#E2E2ED] dark:border-[#1F1F2E] rounded-2xl overflow-hidden bg-[#FAFAFD] dark:bg-[#07070C]">
            
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
                        ? "text-[#7000FF] dark:text-[#A78BFA] bg-[#7000FF]/5 dark:bg-[#A78BFA]/5 font-bold" 
                        : isPastDay 
                          ? "text-muted-foreground/50 opacity-60" 
                          : "text-slate-700 dark:text-slate-355"
                    }`}
                  >
                    <span>{day.label}</span>
                    {isToday && (
                      <span className="text-[8px] font-extrabold uppercase tracking-wide bg-rose-500/10 text-rose-600 px-1 py-0.2 rounded mt-0.5">
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
              {DAYS.map((day) => {
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
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow shadow-rose-500/50" style={{ marginLeft: "-5px" }} />
                      </div>
                    )}

                    {/* Background slot cells */}
                    {TIME_SLOTS.map((time, timeIdx) => {
                      const isPast = isSlotInPast(day.dbDayIndex, time);
                      const isClosed = isSlotClosed(day.dbDayIndex, time);
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
                          onMouseDown={(e) => !isDisabled && handleCellMouseDown(e, day.dbDayIndex, timeIdx)}
                          onMouseEnter={() => !isDisabled && handleCellMouseEnter(day.dbDayIndex, timeIdx)}
                          onMouseUp={!isDisabled ? commitDragSelection : undefined}
                          className={`h-[60px] relative group transition-all duration-150 ${
                            isDisabled 
                              ? "bg-stripes-cosmic border-b border-[#E2E2ED] dark:border-[#1F1F2E] cursor-not-allowed"
                              : isHighlighted 
                                ? "bg-[#7000FF]/15 dark:bg-[#7000FF]/25 border border-[#7000FF] shadow-[0_0_15px_rgba(112,0,255,0.3)] cursor-pointer z-10" 
                                : isHighlightedByAssistant
                                  ? "bg-purple-500/20 dark:bg-purple-500/35 border-y-2 border-dashed border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.4)] animate-pulse cursor-pointer z-10"
                                  : "border-b border-[#E2E2ED] dark:border-[#1F1F2E] hover:bg-[#7000FF]/[0.02] dark:hover:bg-[#7000FF]/[0.03] hover:shadow-[inset_0_0_12px_rgba(112,0,255,0.06)] dark:hover:shadow-[inset_0_0_20px_rgba(112,0,255,0.1)] transition-all duration-200 cursor-pointer"
                          }`}
                        >
                          {/* Hover select block */}
                          {!isDragging && !isDisabled && (
                            <div className="absolute inset-0 flex items-center justify-center transition-all pointer-events-none">
                              <span className="px-3 py-1.5 rounded-xl text-[9px] font-extrabold text-[#7000FF] dark:text-[#C084FC] bg-white/80 dark:bg-[#131322]/60 border border-[#7000FF]/25 dark:border-[#8B5CF6]/30 backdrop-blur-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_2px_4px_rgba(112,0,255,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2)] opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-300 ease-out select-none">
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
                          const styles = getResourceStyles(event.resourceName || "", event.isOccupied, isAdmin);
                          const isWeekView = viewMode === "week";
                          const isNarrow = isWeekView && event.totalLanes && event.totalLanes > 1;
                          const isExtremelyNarrow = isWeekView && event.totalLanes && event.totalLanes >= 3;
                          const isShort = event.durationHours <= 0.5;
                          const isPastEvent = isEventInPast(event.dayIndex, event.startHour, event.durationHours);
                          const isDraftEvent = (event as any).isDraft;

                          const cardThemeClass = isDraftEvent
                            ? "bg-purple-500/10 dark:bg-purple-500/20 border-2 border-dashed border-purple-500/85 text-purple-950 dark:text-purple-200 shadow-md shadow-purple-500/5 cursor-pointer rounded-2xl animate-pulse"
                            : isPastEvent 
                              ? "bg-[#F1F3F9] dark:bg-[#0E0E16] border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed rounded-2xl shadow-sm"
                              : styles.themeClass;

                          const badgeBgClass = isDraftEvent
                            ? "bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-bold text-[7.5px] tracking-wide rounded-md px-1.5 py-0.5 uppercase"
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
                                  if (isAdmin) {
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
                              className={`absolute pointer-events-auto rounded-2xl border flex flex-col transition-all duration-250 backdrop-blur-sm group/card hover:z-40 ${cardThemeClass} ${
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
                                  className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none rounded-[inherit] z-0"
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
                                      <Lock size={9} className="opacity-70 shrink-0" />
                                    ) : (
                                      <Calendar size={9} className="opacity-70 shrink-0" />
                                    )}
                                  </div>
                                  <h4 className="font-bold text-[9px] uppercase tracking-wide truncate leading-tight mt-0.5">
                                    {event.isOccupied ? (isDraftEvent ? `${event.name}` : (isAdmin ? event.name : "Obsazeno")) : event.name}
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
                                        <span className={`text-[7px] font-bold px-1 py-0.5 rounded uppercase select-none shrink truncate min-w-0 max-w-[45%] whitespace-nowrap ${badgeBgClass}`}>
                                          {formatResourceTag(event.resourceName)}
                                        </span>
                                      )}
                                    </div>
                                    <h4 className={`leading-tight uppercase truncate flex items-center gap-1.5 ${
                                      isDraftEvent
                                        ? "font-extrabold text-[10px] md:text-[11px] text-purple-800 dark:text-purple-300"
                                        : isPastEvent
                                          ? "font-extrabold text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400"
                                          : `font-extrabold text-[10px] md:text-[11px] ${styles.textHex}`
                                    }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isDraftEvent ? "bg-purple-500 shadow-[0_0_8px_#a855f7]" : isPastEvent ? "bg-slate-400 dark:bg-slate-600" : styles.barColor}`} />
                                      {event.isOccupied ? (isDraftEvent ? `${event.name}` : (isAdmin ? event.name : "Obsazeno")) : event.name}
                                    </h4>
                                  </div>
                                  
                                  {!isNarrow && (!event.isOccupied || isAdmin || isDraftEvent) ? (
                                    <div className="text-[9px] opacity-80 leading-tight truncate">
                                      <p className="font-semibold text-[9px] truncate">
                                        {event.isOccupied ? (isDraftEvent ? "Koncept" : (isAdmin ? event.instructor : "Obsazeno")) : `Lektor: ${event.instructor}`}
                                      </p>
                                      <p className="text-[8px] opacity-75 truncate">
                                        {event.isOccupied ? (isDraftEvent ? "Klikněte pro potvrzení" : "Rezervováno") : `Místnost: ${event.room}`}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="flex justify-end items-center opacity-70 mt-1">
                                      {event.isOccupied ? (
                                        isDraftEvent ? (
                                          <span className="text-[8px] font-bold text-purple-500">?</span>
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

                                const tooltipClass = `absolute left-1/2 -translate-x-1/2 w-72 bg-white/90 dark:bg-[#07070C]/85 backdrop-blur-xl text-slate-800 dark:text-slate-200 text-xs p-5 rounded-2xl border ${tooltipBorderClass} shadow-neon-glow opacity-0 scale-95 pointer-events-none group-hover/card:opacity-100 group-hover/card:scale-100 transition-all duration-300 ease-out z-50 space-y-3.5 select-none font-sans ${tooltipPositionClass}`;

                                return (
                                  <div className={tooltipClass}>
                                    <div className="flex items-center justify-between border-b border-slate-200/40 dark:border-zinc-800/50 pb-2.5">
                                      <span className={`font-bold text-[9px] uppercase tracking-wider flex items-center gap-1.5 ${styles.textHex}`}>
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${styles.barColor}`} />
                                        {event.resourceName || "Sport field"}
                                      </span>
                                      <span className="text-[9px] font-mono text-zinc-500 dark:text-slate-400">
                                        {formatHourString(event.startHour)} – {formatHourString(event.startHour + event.durationHours)}
                                      </span>
                                    </div>
                                    <div>
                                      <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-50 break-words leading-snug">
                                        {event.isOccupied ? (isDraftEvent ? `${event.name} [Návrh]` : (isAdmin ? event.name : "Obsazeno")) : event.name}
                                      </h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-200/40 dark:border-zinc-800/50 text-[10px]">
                                      <div>
                                        <span className="block text-[8px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-0.5">Místnost/Povrch</span>
                                        <span className="text-zinc-800 dark:text-zinc-200 font-semibold break-words">{isDraftEvent ? "Vybraná plocha" : event.room}</span>
                                      </div>
                                      <div>
                                        <span className="block text-[8px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-0.5">Status/Kontakt</span>
                                        <span className="text-zinc-800 dark:text-zinc-200 font-semibold break-words">
                                          {event.isOccupied ? (isDraftEvent ? "Předběžná rezervace" : (isAdmin ? `${event.name} (${event.instructor})` : "Obsazeno")) : event.instructor}
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
          /* Month View Grid */
          <div className="border border-[#ECECF3] dark:border-[#1F1F2E] rounded-3xl bg-[#FAFAFD] dark:bg-[#07070C] p-6 shadow-neon-glow">
            <div className="grid grid-cols-7 gap-2">
              {["Po", "Út", "St", "Čt", "Pá", "So", "Ne"].map((d) => (
                <div 
                  key={d} 
                  className="text-center py-1.5 uppercase font-bold text-[10px] font-sans font-extrabold tracking-widest text-[#7000FF] dark:text-[#A78BFA]"
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
                      className={`h-16 rounded-2xl p-2 flex flex-col justify-between transition-all hover:scale-[1.03] text-left cursor-pointer ${(() => {
                        if (isToday) {
                          return "border border-[#7000FF] dark:border-[#A78BFA] bg-[#7000FF]/15 dark:bg-[#7000FF]/10 text-[#7000FF] dark:text-[#A78BFA] font-extrabold shadow-[inset_0_0_12px_rgba(112,0,255,0.15),0_0_15px_rgba(112,0,255,0.25)]";
                        }
                        if (isCurrentMonth) {
                          return "border border-[#ECECF3] dark:border-[#1F1F2E] bg-white dark:bg-[#0B0B0F]/45 hover:border-[#7000FF] dark:hover:border-[#A78BFA] hover:shadow-[inset_0_0_12px_rgba(112,0,255,0.08),0_4px_12px_rgba(112,0,255,0.06)] hover:bg-[#7000FF]/[0.01] dark:hover:bg-[#7000FF]/[0.02] text-slate-800 dark:text-slate-350 shadow-sm transition-all duration-200";
                        } else {
                          return "border border-dashed border-[#ECECF3]/40 dark:border-[#1F1F2E]/40 bg-transparent opacity-25 cursor-not-allowed text-slate-500";
                        }
                      })()}`}
                    >
                      <span className="text-[10px]">{d.getDate()}</span>
                      {dayEventsCount > 0 && (
                        <div className="flex gap-1 items-center">
                          <span className="h-1 w-1 rounded-full bg-[#7000FF] dark:bg-[#A78BFA] shadow-[0_0_4px_#7000FF]" />
                          <span className="text-[8px] font-bold text-[#7000FF] dark:text-[#C084FC]">
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
            className="bg-white/95 dark:bg-[#0D0D15]/90 backdrop-blur-2xl border border-slate-200/60 dark:border-[#1F1F35] max-w-md w-full p-6 rounded-3xl shadow-[0_20px_50px_rgba(112,0,255,0.12)] relative transition-all duration-300"
          >
            {/* Elegant Corner Close Button */}
            <button
              onClick={() => {
                setBookingType(null);
                setSelectedEvent(null);
                setSelectedDayIndex(null);
                setGuestName("");
                setGuestEmail("");
                setModalError(null);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 transition-all p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={16} />
            </button>

            <h3 className="text-xl font-bold bg-gradient-to-r from-[#7000FF] via-[#8B5CF6] to-[#3B82F6] bg-clip-text text-transparent mb-1 font-sans">
              {bookingType === "admin_view" ? "Detaily rezervace" : "Nová rezervace"}
            </h3>
            {!isBooked && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                {bookingType === "admin_view" ? "Administrátorská správa této rezervace:" : "Potvrďte termín nebo upravte parametry níže:"}
              </p>
            )}

            {!isBooked && modalError && (
              <div className="mb-5 bg-rose-500/10 dark:bg-rose-500/5 border border-rose-500/20 dark:border-rose-500/15 p-4 rounded-2xl flex items-start gap-3 text-xs text-rose-600 dark:text-rose-450 shadow-[0_4px_12px_rgba(244,63,94,0.06)] animate-in fade-in slide-in-from-top-2 duration-200">
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
                  className="text-rose-450 hover:text-rose-600 dark:text-rose-500 dark:hover:text-rose-350 transition-colors p-1 rounded-full hover:bg-rose-500/10"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {!isBooked && bookingType === "admin_view" && selectedEvent && (
              <div className="bg-slate-50/50 dark:bg-[#151522]/45 backdrop-blur-md p-5 rounded-2xl border border-slate-200/60 dark:border-[#2A2A40] mb-6 space-y-3.5">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold border-b border-slate-200/40 dark:border-zinc-800/50 pb-2 flex items-center gap-1.5 font-sans tracking-wider">
                  <ShieldCheck size={14} className="text-[#7000FF] dark:text-[#A78BFA]" />
                  Detaily rezervované lekce / plochy
                </p>
                <div className="text-xs space-y-2.5">
                  <div className="flex justify-between py-0.5 border-b border-slate-200/40 dark:border-zinc-800/40">
                    <span className="text-slate-400 dark:text-slate-500">Plocha / Lekce:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-semibold">{selectedEvent.resourceName}</span>
                  </div>
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
              <div className="bg-slate-50/50 dark:bg-[#151522]/45 backdrop-blur-md p-5 rounded-2xl border border-slate-200/60 dark:border-[#2A2A40] mb-6 space-y-2.5">
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
              return (
                <div className="space-y-4 mb-6 bg-slate-50/50 dark:bg-[#151522]/45 backdrop-blur-md p-5 rounded-2xl border border-slate-200/60 dark:border-[#2A2A40]">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold border-b border-slate-200/40 dark:border-zinc-800/50 pb-2 mb-2 flex items-center gap-1.5 font-sans tracking-wider">
                    <Calendar size={14} className="text-[#7000FF] dark:text-[#A78BFA]" />
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
                            className="w-full flex items-center justify-between text-xs py-2.5 px-3.5 bg-white/50 dark:bg-[#151522]/55 border border-slate-200/80 dark:border-[#2A2A40] rounded-xl text-left text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] transition-all hover:bg-white/80 dark:hover:bg-[#1B1B2B]/75"
                          >
                            <span>
                              {activeResource ? activeResource.name : "Vyberte plochu/sektor"}
                            </span>
                            <ChevronDown size={14} className={`text-slate-450 dark:text-slate-500 transition-transform duration-200 ${isAreaDropdownOpen ? "rotate-180" : ""}`} />
                          </button>
                          
                          {isAreaDropdownOpen && (
                            <div className="absolute left-0 right-0 mt-1.5 bg-white/95 dark:bg-[#0D0D15]/95 backdrop-blur-xl border border-slate-200/60 dark:border-[#2A2A40] rounded-xl shadow-xl z-55 overflow-hidden max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
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
                                          ? "bg-[#7000FF]/15 text-[#7000FF] dark:text-[#A78BFA] font-semibold"
                                          : "text-slate-700 dark:text-slate-350 hover:bg-slate-100/60 dark:hover:bg-[#1A1A2E]/60"
                                    }`}
                                  >
                                    <span>{res.name}</span>
                                    {isSelected && <Check size={12} className="text-[#7000FF] dark:text-[#A78BFA]" />}
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
                        className="w-full flex items-center justify-between text-xs py-2.5 px-3.5 bg-white/50 dark:bg-[#151522]/55 border border-slate-200/80 dark:border-[#2A2A40] rounded-xl text-left text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] transition-all hover:bg-white/80 dark:hover:bg-[#1B1B2B]/75"
                      >
                        <span>{formatDurationCzech(customDuration)}</span>
                        <ChevronDown size={14} className={`text-slate-450 dark:text-slate-500 transition-transform duration-200 ${isDurationDropdownOpen ? "rotate-180" : ""}`} />
                      </button>
                      
                      {isDurationDropdownOpen && (
                        <div className="absolute left-0 right-0 mt-1.5 bg-white/95 dark:bg-[#0D0D15]/95 backdrop-blur-xl border border-slate-200/60 dark:border-[#2A2A40] rounded-xl shadow-xl z-55 overflow-hidden max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
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
                                    ? "bg-[#7000FF]/15 text-[#7000FF] dark:text-[#A78BFA] font-semibold"
                                    : "text-slate-700 dark:text-slate-350 hover:bg-slate-100/60 dark:hover:bg-[#1A1A2E]/60"
                                }`}
                              >
                                <span>{formatDurationCzech(val)}</span>
                                {isSelected && <Check size={12} className="text-[#7000FF] dark:text-[#A78BFA]" />}
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
                              className="w-full text-left text-xs py-2.5 px-3.5 flex items-center justify-between bg-[#7000FF]/15 text-[#7000FF] dark:text-[#A78BFA] font-semibold"
                            >
                              <span>{formatDurationCzech(customDuration)}</span>
                              <Check size={12} className="text-[#7000FF] dark:text-[#A78BFA]" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {!isCurrentSelectionAvailable && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-550 dark:text-red-400 text-[10px] p-3 rounded-xl font-medium leading-normal flex items-start gap-1.5">
                      <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
                      <span>Vybraná plocha/sektor není v tomto čase a délce trvání k dispozici kvůli překrývající se rezervaci.</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Guest/Anonymous Booking Form fields */}
            {!isBooked && (!session || !session.user || isAdmin) && bookingType !== "admin_view" && (
              <div className="space-y-4 mb-6 p-5 bg-slate-50/50 dark:bg-[#151522]/45 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-[#2A2A40] text-xs">
                <div className="font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200/40 dark:border-zinc-800/50 pb-2 mb-2 flex items-center justify-between flex-wrap gap-2">
                  <span>
                    {isAdmin 
                      ? "Údaje o zákazníkovi, pro kterého rezervujete" 
                      : "Údaje o rezervaci pro hosta (anonymní)"
                    }
                  </span>
                  {isAdmin && (
                    <span className="bg-[#7000FF]/15 text-[#7000FF] dark:bg-[#A78BFA]/15 dark:text-[#A78BFA] px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider border border-[#7000FF]/25">
                      Admin vstup
                    </span>
                  )}
                </div>
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
                    className="w-full text-xs py-2 px-3.5 bg-white/50 dark:bg-[#151522]/55 border border-slate-200/80 dark:border-[#2A2A40] rounded-xl text-slate-800 dark:text-slate-250 placeholder-slate-400/60 focus:outline-none focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] transition-all"
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
                    className="w-full text-xs py-2 px-3.5 bg-white/50 dark:bg-[#151522]/55 border border-slate-200/80 dark:border-[#2A2A40] rounded-xl text-slate-800 dark:text-slate-250 placeholder-slate-400/60 focus:outline-none focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] transition-all"
                    placeholder={isAdmin ? "např. jan.novak@email.cz" : "např. jan.novak@email.cz"}
                  />
                </div>
              </div>
            )}

            {isBooked ? (
              <div className="flex flex-col items-center justify-center py-4 text-[#7000FF] dark:text-[#A78BFA] gap-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-12 w-12 rounded-full bg-[#7000FF]/10 dark:bg-[#A78BFA]/10 flex items-center justify-center animate-bounce shadow-neon-glow">
                    <Check size={24} className="text-[#7000FF] dark:text-[#A78BFA]" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Rezervace byla úspěšně potvrzena!</span>
                </div>
                <button
                  type="button"
                  onClick={closeBookingModalAndRefresh}
                  className="w-full py-2.5 rounded-xl text-xs text-white font-bold bg-[#7000FF] hover:bg-[#5B00D6] dark:bg-[#7000FF] dark:hover:bg-[#6000EE] shadow-[0_4px_14px_rgba(112,0,255,0.3)] transition-all duration-200"
                >
                  Zavřít
                </button>
              </div>
            ) : bookingType === "admin_view" && selectedEvent ? (
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => {
                    setBookingType(null);
                    setSelectedEvent(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-350 border border-slate-200/40 dark:border-slate-700/40 transition-colors"
                >
                  Zavřít
                </button>
                <button
                  onClick={() => {
                    setConfirmModal({
                      title: "Zrušit rezervaci",
                      message: "Opravdu chcete zrušit tuto rezervaci?",
                      onConfirm: async () => {
                        try {
                          const res = await fetch(`/api/bookings?bookingId=${selectedEvent.id}`, {
                            method: "DELETE"
                          });
                          if (res.ok) {
                            setNotification({
                              type: "success",
                              title: "Rezervace zrušena",
                              message: "Rezervace byla úspěšně zrušena!",
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
                      }
                    });
                  }}
                  className="btn-danger-filled flex-1 py-2.5 rounded-xl text-xs font-bold"
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
                      setModalError(null);
                    }}
                    disabled={isPending}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-[#151522]/55 dark:hover:bg-[#1C1C30]/55 text-slate-700 dark:text-slate-300 border border-slate-200/40 dark:border-[#2A2A40] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Zrušit
                  </button>
                  <button
                    onClick={handleBooking}
                    disabled={!isCurrentSelectionAvailable || isPending}
                    className="flex-1 py-2.5 rounded-xl text-xs text-white font-bold bg-[#7000FF] hover:bg-[#5B00D6] dark:bg-[#7000FF] dark:hover:bg-[#6000EE] shadow-[0_4px_14px_rgba(112,0,255,0.3)] transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none"
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
        confirmLabel="Potvrdit"
        cancelLabel="Zrušit"
        onCancel={() => setConfirmModal(null)}
        onConfirm={async () => {
          if (confirmModal) {
            const onConf = confirmModal.onConfirm;
            setConfirmModal(null);
            await onConf();
          }
        }}
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

    </div>
  );
}

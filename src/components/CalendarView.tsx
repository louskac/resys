"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Check, Calendar, AlertCircle, ShieldCheck, Lock } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import ConfirmDialog from "./ConfirmDialog";
import AlertDialog from "./AlertDialog";

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
  
  const activeRootId = (() => {
    const rootFromUrl = searchParams.get("rootId");
    if (rootFromUrl && rootResources.some(r => r.id === rootFromUrl)) {
      return rootFromUrl;
    }
    return rootResources[0]?.id || "";
  })();

  const selectedResourceId = (() => {
    const resFromUrl = searchParams.get("resourceId");
    if (resFromUrl && resources.some(r => r.id === resFromUrl)) {
      const res = resources.find(r => r.id === resFromUrl);
      const isChildOfActiveRoot = res?.id === activeRootId || res?.parentId === activeRootId;
      if (isChildOfActiveRoot) {
        return resFromUrl;
      }
    }
    return activeRootId;
  })();

  const selectRoot = (rootId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("rootId", rootId);
    params.set("resourceId", rootId);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const selectResource = (resId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("resourceId", resId);
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

  const DAYS = viewMode === "day"
    ? [(() => {
        const d = new Date(baseDate);
        const dayNamesAbbr = ["ne", "po", "út", "st", "čt", "pá", "so"];
        const dayIndex = d.getDay();
        const label = `${dayNamesAbbr[dayIndex]} ${d.getDate()}. ${d.getMonth() + 1}.`;
        const keys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
        const fullNames = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];
        const monday = getMondayOfDate(d);
        const diffDays = Math.round((d.getTime() - monday.getTime()) / (24 * 60 * 60 * 1000));
        return {
          label,
          key: keys[dayIndex],
          name: fullNames[dayIndex],
          date: d,
          dbDayIndex: diffDays
        };
      })()]
    : Array.from({ length: 7 }, (_, i) => {
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
    const startDay = baseDate.getDate();
    const startMonth = baseDate.getMonth() + 1;
    const startYear = baseDate.getFullYear();
    
    const endOfWeekDate = new Date(baseDate);
    endOfWeekDate.setDate(baseDate.getDate() + 6);
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

  const isSlotInPast = (dayIdx: number, timeStr: string) => {
    if (!currentTime) return false;
    const slotDate = new Date(baseDate);
    slotDate.setDate(baseDate.getDate() + dayIdx);
    const [sh, sm] = timeStr.split(":").map(Number);
    slotDate.setHours(sh, sm, 0, 0);
    return slotDate <= currentTime;
  };

  const isEventInPast = (dayIdx: number, startHour: number, durationHours: number) => {
    if (!currentTime) return false;
    const eventEndDate = new Date(baseDate);
    eventEndDate.setDate(baseDate.getDate() + dayIdx);
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
    const name = (resourceName || "").toLowerCase();
    const cursorClass = isOccupied ? (isAdminView ? "cursor-pointer" : "cursor-not-allowed") : "cursor-pointer";
    
    if (name.includes("sektor a") || name.includes("sector a")) {
      return {
        badgeBg: "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300",
        themeClass: isOccupied
          ? `bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 border-l-4 border-l-rose-600 text-rose-800 dark:text-rose-400 ${cursorClass}`
          : `bg-card border border-border border-l-4 border-l-rose-500 text-foreground hover:border-rose-500/40 hover:scale-[1.005] transition-all shadow-sm ${cursorClass}`,
        textHex: "text-rose-700 dark:text-rose-300"
      };
    }
    if (name.includes("sektor b") || name.includes("sector b")) {
      return {
        badgeBg: "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300",
        themeClass: isOccupied
          ? `bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 border-l-4 border-l-amber-600 text-amber-800 dark:text-amber-400 ${cursorClass}`
          : `bg-card border border-border border-l-4 border-l-amber-500 text-foreground hover:border-amber-500/40 hover:scale-[1.005] transition-all shadow-sm ${cursorClass}`,
        textHex: "text-amber-700 dark:text-amber-300"
      };
    }
    if (name.includes("sektor c") || name.includes("sector c")) {
      return {
        badgeBg: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300",
        themeClass: isOccupied
          ? `bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 border-l-4 border-l-emerald-600 text-emerald-800 dark:text-emerald-400 ${cursorClass}`
          : `bg-card border border-border border-l-4 border-l-emerald-500 text-foreground hover:border-emerald-500/40 hover:scale-[1.005] transition-all shadow-sm ${cursorClass}`,
        textHex: "text-emerald-700 dark:text-emerald-300"
      };
    }

    const hash = name.split("").reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const palettes = [
      {
        badgeBg: "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300",
        themeClass: isOccupied
          ? `bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 border-l-4 border-l-blue-600 text-blue-800 dark:text-blue-400 ${cursorClass}`
          : `bg-card border border-border border-l-4 border-l-blue-500 text-foreground hover:border-blue-500/40 hover:scale-[1.005] transition-all shadow-sm ${cursorClass}`,
        textHex: "text-blue-700 dark:text-blue-300"
      },
      {
        badgeBg: "bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300",
        themeClass: isOccupied
          ? `bg-violet-50/90 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900/50 border-l-4 border-l-violet-600 text-violet-800 dark:text-violet-400 ${cursorClass}`
          : `bg-card border border-border border-l-4 border-l-violet-500 text-foreground hover:border-violet-500/40 hover:scale-[1.005] transition-all shadow-sm ${cursorClass}`,
        textHex: "text-violet-700 dark:text-violet-300"
      },
      {
        badgeBg: "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300",
        themeClass: isOccupied
          ? `bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 border-l-4 border-l-indigo-600 text-indigo-800 dark:text-indigo-400 ${cursorClass}`
          : `bg-card border border-border border-l-4 border-l-indigo-500 text-foreground hover:border-indigo-500/40 hover:scale-[1.005] transition-all shadow-sm ${cursorClass}`,
        textHex: "text-indigo-700 dark:text-indigo-300"
      },
      {
        badgeBg: "bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300",
        themeClass: isOccupied
          ? `bg-cyan-50/90 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-900/50 border-l-4 border-l-cyan-600 text-cyan-800 dark:text-cyan-400 ${cursorClass}`
          : `bg-card border border-border border-l-4 border-l-cyan-500 text-foreground hover:border-cyan-500/40 hover:scale-[1.005] transition-all shadow-sm ${cursorClass}`,
        textHex: "text-cyan-700 dark:text-cyan-300"
      }
    ];

    return palettes[hash % palettes.length];
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

  // Guest booking form states
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [modalError, setModalError] = useState<{ code: string; message: string } | null>(null);

  // Custom alert and confirmation modal states
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void | Promise<void> } | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; title: string; message: string; onClose?: () => void } | null>(null);

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

  const events = selectedResourceId
    ? (initialEvents || []).filter((e) => {
        if (e.resourceId === selectedResourceId) return true;
        if (e.isOccupied) {
          const conflictingIds = getConflictingResourceIds(selectedResourceId);
          return conflictingIds.includes(e.resourceId);
        }
        return false;
      })
    : (initialEvents || []);

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
    const payload: Record<string, string | number | null | undefined> = {
      tenantId,
      weekStart: toLocalDateString(baseDate),
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
        return;
      }

      payload.resourceId = customResourceId;
      payload.dayIndex = selectedDayIndex;
      payload.startTime = selectedTimeStr;
      payload.endTime = calculatedEndTime;
    } else {
      return;
    }

    if (!session || !session.user) {
      if (!guestName.trim() || !guestEmail.trim()) {
        setModalError({
          code: "MISSING_PARAMETER",
          message: "Please enter your name and email to proceed with guest booking."
        });
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
    }
  };

  return (
    <div className="card p-6 shadow-sm relative transition-colors">
      {/* Calendar Header Control */}
      <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 mb-6 border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <button 
              onClick={handlePrevWeek}
              className="p-2 rounded-lg bg-secondary hover:bg-muted text-foreground border border-border transition-all flex items-center justify-center cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={handleNextWeek}
              className="p-2 rounded-lg bg-secondary hover:bg-muted text-foreground border border-border transition-all flex items-center justify-center cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          
          {!isCurrent && (
            <button 
              onClick={handleToday}
              className="px-3 py-1.5 rounded-lg bg-tenant-primary/10 border border-tenant-primary/20 hover:bg-tenant-primary/15 text-tenant-primary transition-all text-xs font-bold cursor-pointer"
            >
              Dnes
            </button>
          )}

          {/* Day/Week/Month Switcher */}
          <div className="flex bg-secondary p-1 rounded-xl border border-border">
            {(["day", "week", "month"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  viewMode === mode
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode === "day" ? "Den" : mode === "week" ? "Týden" : "Měsíc"}
              </button>
            ))}
          </div>

          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-tenant-primary/10 text-tenant-primary border border-tenant-primary/20">
            {events.length} schedule slots
          </span>
        </div>
        
        <h2 className="text-xl font-extrabold text-foreground tracking-tight xl:text-right">
          {headerTitle}
        </h2>
      </div>

      {/* Root Resource Selector (if multiple roots exist) */}
      {rootResources.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4 p-1 bg-secondary/60 rounded-xl border border-border/50 w-fit">
          {rootResources.map((root) => {
            const isActive = activeRootId === root.id;
            return (
              <button
                key={root.id}
                type="button"
                onClick={() => selectRoot(root.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-card border border-border/40 shadow-sm text-tenant-primary"
                    : "border border-transparent hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {root.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Sub-resource Selector (if children exist for the active root) */}
      {(() => {
        const children = resources.filter(r => r.parentId === activeRootId);
        if (children.length === 0) return null;
        
        const activeRoot = resources.find(r => r.id === activeRootId);
        return (
          <div className="flex flex-wrap gap-2 mb-6 border-b border-border/50 pb-4">
            <button
              type="button"
              onClick={() => selectResource(activeRootId)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                selectedResourceId === activeRootId
                  ? "bg-tenant-primary/10 border-tenant-primary/25 text-tenant-primary"
                  : "bg-secondary border-border hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Vše ({activeRoot?.name || "Vše"})
            </button>
            {children.map((child) => (
              <button
                key={child.id}
                type="button"
                onClick={() => selectResource(child.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  selectedResourceId === child.id
                    ? "bg-tenant-primary/10 border-tenant-primary/25 text-tenant-primary"
                    : "bg-secondary border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {child.name}
              </button>
            ))}
          </div>
        );
      })()}

      {/* Main Grid View */}
      <div className="overflow-x-auto">
        {viewMode !== "month" ? (
          <div className="min-w-[760px] border border-border rounded-xl overflow-hidden bg-card">
            
            {/* Header Row */}
            <div className={`grid ${viewMode === "day" ? "grid-cols-[75px_1fr]" : "grid-cols-[75px_repeat(7,_1fr)]"} border-b border-border bg-secondary relative z-10`}>
              <div className="p-2.5 text-center font-mono text-[10px] text-muted-foreground border-r border-border/80 flex items-center justify-center">
                Time
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
                    className={`p-2.5 text-center font-semibold text-xs border-r border-border/80 flex flex-col items-center justify-center gap-0.5 ${
                      isToday 
                        ? "text-tenant-primary bg-tenant-primary/5 font-bold" 
                        : isPastDay 
                          ? "text-muted-foreground/50 opacity-60" 
                          : "text-foreground"
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
              <div className="flex flex-col border-r border-border/80 bg-secondary/35 relative z-10">
                {TIME_SLOTS.map((time) => (
                  <div
                    key={time}
                    className="h-[60px] border-b border-border/30 flex items-center justify-center font-mono text-[10px] text-muted-foreground"
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
                    className="relative border-r border-border/50 flex flex-col z-20 hover:z-30"
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

                      return (
                        <div
                          key={time}
                          onMouseDown={(e) => !isDisabled && handleCellMouseDown(e, day.dbDayIndex, timeIdx)}
                          onMouseEnter={() => !isDisabled && handleCellMouseEnter(day.dbDayIndex, timeIdx)}
                          onMouseUp={!isDisabled ? commitDragSelection : undefined}
                          className={`h-[60px] border-b border-border/30 relative group transition-all duration-150 ${
                            isDisabled 
                              ? "bg-stripes-past opacity-70 cursor-not-allowed"
                              : isHighlighted 
                                ? "bg-tenant-primary/20 border-x border-tenant-primary/45 cursor-pointer" 
                                : "hover:bg-secondary/70 cursor-pointer"
                          }`}
                        >
                          {/* Hover select block */}
                          {!isDragging && !isDisabled && (
                            <div className="absolute inset-0 flex items-center justify-center transition-all">
                              <span className="text-[9px] font-bold text-tenant-primary opacity-0 group-hover:opacity-100 transition-all">
                                + Reserve
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

                          const cardThemeClass = isPastEvent 
                            ? "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed hover:scale-100 hover:z-10 border-l-4 border-l-zinc-300 dark:border-l-zinc-700"
                            : styles.themeClass;

                          const badgeBgClass = isPastEvent 
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
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isPastEvent) return;
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
                              className={`absolute pointer-events-auto rounded-xl border shadow-sm flex flex-col transition-all duration-200 backdrop-blur-sm group/card hover:z-40 ${cardThemeClass} ${
                                isPastEvent ? "" : "hover:scale-[1.015]"
                              } ${
                                isShort 
                                  ? "p-1.5 justify-start gap-0.5" 
                                  : isNarrow 
                                    ? "p-2 justify-between" 
                                    : "p-2.5 justify-between"
                              }`}
                            >
                              {isExtremelyNarrow ? (
                                <div className="flex flex-col items-center justify-between h-full w-full overflow-hidden text-center py-0.5">
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
                                <div className="flex flex-col h-full justify-center overflow-hidden">
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
                                    {event.isOccupied ? (isAdmin ? event.name : "Obsazeno") : event.name}
                                  </h4>
                                </div>
                              ) : (
                                <>
                                  <div className="overflow-hidden">
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      <span className="text-[9px] font-mono opacity-80 block truncate">
                                        {formatHourString(event.startHour)} – {formatHourString(event.startHour + event.durationHours)}
                                      </span>
                                      {!isNarrow && (selectedResourceId === "" || event.resourceId !== selectedResourceId) && event.resourceName && (
                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase select-none ${badgeBgClass}`}>
                                          {event.resourceName.split(" (")[0]}
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="font-bold text-[10px] md:text-[11px] leading-tight uppercase tracking-wide truncate">
                                      {event.isOccupied ? (isAdmin ? event.name : "Obsazeno") : event.name}
                                    </h4>
                                  </div>
                                  
                                  {!isNarrow && (!event.isOccupied || isAdmin) ? (
                                    <div className="text-[9px] opacity-80 leading-tight truncate">
                                      <p className="font-semibold text-[9px] truncate">
                                        {event.isOccupied ? (isAdmin ? event.instructor : "Obsazeno") : `Lektor: ${event.instructor}`}
                                      </p>
                                      <p className="text-[8px] opacity-75 truncate">
                                        {event.isOccupied ? "Rezervováno" : `Místnost: ${event.room}`}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="flex justify-end items-center opacity-70 mt-1">
                                      {event.isOccupied ? (
                                        <Lock size={10} />
                                      ) : (
                                        <Calendar size={10} />
                                      )}
                                    </div>
                                  )}
                                </>
                              )}

                              {/* Premium Floating Details Tooltip on Hover */}
                              {(() => {
                                const isTopHalf = event.startHour < 12.0;
                                const tooltipPositionClass = isTopHalf 
                                  ? "top-[107%] bottom-auto origin-top" 
                                  : "bottom-[107%] top-auto origin-bottom";
                                
                                const getResourceColor = (resourceName: string) => {
                                  const name = (resourceName || "").toLowerCase();
                                  if (name.includes("sektor a") || name.includes("sector a")) return "bg-rose-500";
                                  if (name.includes("sektor b") || name.includes("sector b")) return "bg-amber-500";
                                  if (name.includes("sektor c") || name.includes("sector c")) return "bg-emerald-500";
                                  return "bg-tenant-primary";
                                };

                                return (
                                  <div className={`absolute left-1/2 -translate-x-1/2 w-72 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md text-zinc-900 dark:text-zinc-50 text-xs p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/85 shadow-2xl opacity-0 scale-95 pointer-events-none group-hover/card:opacity-100 group-hover/card:scale-100 transition-all duration-200 ease-out z-50 space-y-3.5 select-none pl-6 ${tooltipPositionClass}`}>
                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${getResourceColor(event.resourceName || "")}`} />
                                    
                                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-2.5">
                                      <span className={`font-bold text-[9px] uppercase tracking-wider ${styles.textHex}`}>
                                        {event.resourceName || "Sport field"}
                                      </span>
                                      <span className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400">
                                        {formatHourString(event.startHour)} – {formatHourString(event.startHour + event.durationHours)}
                                      </span>
                                    </div>
                                    <div>
                                      <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-50 break-words leading-snug">
                                        {event.isOccupied ? (isAdmin ? event.name : "Obsazeno") : event.name}
                                      </h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/50 text-[10px]">
                                      <div>
                                        <span className="block text-[8px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-0.5">Místnost/Povrch</span>
                                        <span className="text-zinc-800 dark:text-zinc-200 font-semibold break-words">{event.room}</span>
                                      </div>
                                      <div>
                                        <span className="block text-[8px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-0.5">Status/Kontakt</span>
                                        <span className="text-zinc-800 dark:text-zinc-200 font-semibold break-words">
                                          {event.isOccupied ? (isAdmin ? `${event.name} (${event.instructor})` : "Obsazeno") : event.instructor}
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
          <div className="border border-border rounded-xl overflow-hidden bg-card p-4">
            <div className="grid grid-cols-7 gap-2">
              {["Po", "Út", "St", "Čt", "Pá", "So", "Ne"].map((d) => (
                <div key={d} className="text-center font-bold text-[10px] text-muted-foreground uppercase py-1.5">
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
                    ? initialEvents.filter(e => e.dayIndex === dbDayIndex).length 
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
                      className={`h-16 rounded-xl border p-2 flex flex-col justify-between transition-all hover:scale-[1.03] text-left cursor-pointer ${
                        isToday
                          ? "border-tenant-primary bg-tenant-primary/5 font-bold"
                          : isCurrentMonth
                            ? "border-border bg-secondary/25 hover:bg-secondary/60 text-foreground"
                            : "border-border/40 bg-secondary/10 opacity-40 hover:bg-secondary/30 text-muted-foreground"
                      }`}
                    >
                      <span className="text-[10px]">{d.getDate()}</span>
                      {dayEventsCount > 0 && (
                        <div className="flex gap-1 items-center">
                          <span className="h-1.5 w-1.5 rounded-full bg-tenant-primary" />
                          <span className="text-[8px] text-tenant-primary font-bold">{dayEventsCount} slots</span>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-card border border-border max-w-md w-full p-6 rounded-2xl shadow-2xl relative transition-colors duration-200">
            <h3 className="text-base font-bold text-foreground mb-2">
              {bookingType === "admin_view" ? "Reservation details" : "Configure Reservation"}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {bookingType === "admin_view" ? "Administrative management of this booking:" : "Confirm your slot or customize parameters below:"}
            </p>

            {modalError && (
              <div className="mb-4 bg-red-500/10 border border-red-500/25 p-3 rounded-xl flex items-start gap-2.5 text-xs text-red-500 dark:text-red-400 animate-in fade-in slide-in-from-top-2 duration-150">
                <AlertCircle size={14} className="mt-0.5 text-red-500 shrink-0" />
                <div className="flex-1 space-y-0.5">
                  <p className="font-bold uppercase tracking-wide text-[9px] opacity-75">
                    {modalError.code.replace(/_/g, " ")}
                  </p>
                  <p className="font-medium leading-relaxed">
                    {modalError.message}
                  </p>
                </div>
                <button 
                  onClick={() => setModalError(null)}
                  className="text-red-500 hover:text-red-700 dark:hover:text-red-300 font-bold ml-1 transition-colors"
                >
                  ×
                </button>
              </div>
            )}

            {bookingType === "admin_view" && selectedEvent && (
              <div className="bg-secondary p-4 rounded-xl border border-border mb-6 space-y-3">
                <p className="text-[10px] text-muted-foreground uppercase font-bold border-b border-border pb-1.5 flex items-center gap-1.5 font-sans">
                  <ShieldCheck size={14} className="text-tenant-primary" />
                  Reserved Area / Class Details
                </p>
                <div className="text-xs space-y-2">
                  <div className="flex justify-between py-0.5 border-b border-border/40">
                    <span className="text-muted-foreground">Resource Name:</span>
                    <span className="text-foreground font-semibold">{selectedEvent.resourceName}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-border/40">
                    <span className="text-muted-foreground">Reserved By:</span>
                    <span className="text-foreground font-semibold">{selectedEvent.name}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-border/40">
                    <span className="text-muted-foreground">User Email:</span>
                    <span className="text-foreground font-mono">{selectedEvent.instructor}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-border/40">
                    <span className="text-muted-foreground">Time Slot:</span>
                    <span className="text-foreground font-semibold">
                      {DAYS[selectedEvent.dayIndex]?.name || "Day"} ({formatHourString(selectedEvent.startHour)} – {formatHourString(selectedEvent.startHour + selectedEvent.durationHours)})
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground">Booking ID:</span>
                    <span className="text-muted-foreground font-mono text-[10px] select-all max-w-[180px] truncate" title={selectedEvent.id}>
                      {selectedEvent.id}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {bookingType === "event" && selectedEvent && (
              <div className="bg-secondary p-4 rounded-xl border border-border mb-6 space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Class Program</p>
                <h4 className="text-sm font-bold text-foreground">{selectedEvent.name}</h4>
                
                <div className="grid grid-cols-2 gap-2 mt-4 pt-2 border-t border-border text-xs">
                  <div>
                    <span className="text-muted-foreground block">Instructor:</span>
                    <span className="text-foreground font-medium">{selectedEvent.instructor}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Room:</span>
                    <span className="text-foreground font-medium">{selectedEvent.room}</span>
                  </div>
                </div>
              </div>
            )}

            {bookingType === "custom" && selectedDayIndex !== null && (() => {
              const isCurrentSelectionAvailable = isResourceAvailable(customResourceId, selectedDayIndex, selectedTimeStr, customDuration);
              return (
                <div className="space-y-4 mb-6 bg-secondary p-4 rounded-xl border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold border-b border-border pb-1.5 mb-2 flex items-center gap-1.5">
                    <Calendar size={14} className="text-tenant-primary" />
                    Custom Field Reservation
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
                    
                    return (
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1 font-semibold uppercase">Select Area/Field</label>
                        <select
                          value={customResourceId}
                          onChange={(e) => {
                            setCustomResourceId(e.target.value);
                            setModalError(null);
                          }}
                          className="select-field text-xs py-1.5"
                        >
                          {dropdownResources.map((res) => {
                            const available = isResourceAvailable(res.id, selectedDayIndex, selectedTimeStr, customDuration);
                            return (
                              <option 
                                key={res.id} 
                                value={res.id}
                                disabled={!available}
                                className={!available ? "text-muted-foreground/60 line-through bg-muted" : ""}
                              >
                                {res.name} {!available ? "(Occupied / Obsazeno)" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    );
                  })()}
   
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block font-semibold">Day:</span>
                      <span className="text-foreground font-semibold">{DAYS[selectedDayIndex].name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block font-semibold">Starts At:</span>
                      <span className="text-foreground font-mono font-semibold">{selectedTimeStr}</span>
                    </div>
                  </div>
   
                  {/* Duration Picker */}
                  <div>
                    <label className="block text-[10px] text-muted-foreground mb-1 font-semibold uppercase">Duration</label>
                    <select
                      value={customDuration}
                      onChange={(e) => {
                        setCustomDuration(parseFloat(e.target.value));
                        setModalError(null);
                      }}
                      className="select-field text-xs py-1.5"
                    >
                      {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0, 8.0].map((val) => (
                        <option key={val} value={val}>
                          {val === 0.5 ? "30 minutes" : `${val} hour${val > 1 ? "s" : ""}`}
                        </option>
                      ))}
                      {![0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0, 8.0].includes(customDuration) && (
                        <option value={customDuration}>
                          {customDuration} hours
                        </option>
                      )}
                    </select>
                  </div>

                  {!isCurrentSelectionAvailable && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] p-2.5 rounded-lg font-medium leading-normal flex items-start gap-1.5">
                      <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
                      <span>Selected area/field is not available for this time and duration due to an overlapping reservation.</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Guest/Anonymous Booking Form fields */}
            {/* Guest/Anonymous Booking Form fields */}
            {(!session || !session.user) && bookingType !== "admin_view" && (
              <div className="space-y-3 mb-6 p-4 bg-secondary rounded-xl border border-border text-xs">
                <p className="font-semibold text-foreground border-b border-border pb-1.5 mb-2">
                  Guest Reservation Details (Anonymous)
                </p>
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1 font-semibold uppercase">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => {
                      setGuestName(e.target.value);
                      setModalError(null);
                    }}
                    className="input-field text-xs py-1.5"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1 font-semibold uppercase">Email Address</label>
                  <input
                    type="email"
                    required
                    value={guestEmail}
                    onChange={(e) => {
                      setGuestEmail(e.target.value);
                      setModalError(null);
                    }}
                    className="input-field text-xs py-1.5"
                    placeholder="e.g. john@example.com"
                  />
                </div>
              </div>
            )}

            {isBooked ? (
              <div className="flex flex-col items-center justify-center py-4 text-tenant-primary gap-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-tenant-primary/10 flex items-center justify-center animate-bounce">
                    <Check size={20} />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Reservation Confirmed!</span>
                </div>
                <button
                  type="button"
                  onClick={closeBookingModalAndRefresh}
                  className="btn-tenant w-full py-2 text-xs text-white font-semibold shadow-sm"
                >
                  Zavřít / Close
                </button>
              </div>
            ) : bookingType === "admin_view" && selectedEvent ? (
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => {
                    setBookingType(null);
                    setSelectedEvent(null);
                  }}
                  className="btn-secondary flex-1 py-2 text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setConfirmModal({
                      title: "Cancel Reservation",
                      message: "Are you sure you want to cancel this reservation?",
                      onConfirm: async () => {
                        try {
                          const res = await fetch(`/api/bookings?bookingId=${selectedEvent.id}`, {
                            method: "DELETE"
                          });
                          if (res.ok) {
                            setNotification({
                              type: "success",
                              title: "Reservation Cancelled",
                              message: "Reservation cancelled successfully!",
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
                              title: "Cancellation Failed",
                              message: "Error cancelling booking: " + (data.error || "Unknown error")
                            });
                          }
                        } catch (err) {
                          console.error(err);
                          setNotification({
                            type: "error",
                            title: "Error",
                            message: "Failed to connect to the server."
                          });
                        }
                      }
                    });
                  }}
                  className="btn-danger-filled flex-1 py-2 text-xs font-bold"
                >
                  Cancel Booking
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
                    className="btn-secondary flex-1 py-2 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBooking}
                    disabled={!isCurrentSelectionAvailable}
                    className={`btn-tenant flex-1 py-2 text-xs text-white ${
                      !isCurrentSelectionAvailable ? "opacity-45 cursor-not-allowed" : ""
                    }`}
                  >
                    Confirm Reservation
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
        confirmLabel="Confirm"
        cancelLabel="Cancel"
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

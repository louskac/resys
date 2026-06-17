"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Building, Calendar, Clock, QrCode, ClipboardList, 
  Plus, Edit, Trash, Settings, ChevronDown,
  ArrowLeft, Smartphone, Activity,
  Upload, Eye, List, Move,
  Users, Layers, Wrench, CreditCard, MapPin, User,
  Type, Mail, Save, X
} from "lucide-react";
import { getTenantTheme } from "@/lib/tenantThemes";
import ThemeToggle from "@/components/ThemeToggle";
import CalendarView, { CalendarEvent } from "@/components/CalendarView";
import ConfirmDialog from "@/components/ConfirmDialog";
import AlertDialog from "@/components/AlertDialog";
import TenantBanner from "@/components/TenantBanner";
import ResourceCard from "@/components/ResourceCard";
import { useSession } from "next-auth/react";
import LogoutButton from "@/components/LogoutButton";
import AdminAIAssistant from "@/components/AdminAIAssistant";

// UTC Date/Time format helpers to avoid client-side timezone shifts
const formatUTCDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const day = d.getUTCDate();
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  return `${day}. ${month}. ${year}`;
};

const formatUTCTimeRange = (fromStr: string, toStr: string) => {
  const from = new Date(fromStr);
  const to = new Date(toStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(from.getUTCHours())}:${pad(from.getUTCMinutes())} – ${pad(to.getUTCHours())}:${pad(to.getUTCMinutes())}`;
};

const formatUTCTime = (dateStr: string) => {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
};

interface ResourceRule {
  id: string;
  name: string;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  price: string;
  maxCapacity: number;
}

interface Resource {
  id: string;
  name: string;
  type: string;
  maxCapacity: number;
  attributes: {
    instructor?: string;
    room?: string;
    surface?: string;
    equipment?: string;
    parentId?: string;
    price?: string;
  };
  scheduleRules: ResourceRule[];
}

interface Booking {
  id: string;
  resourceId: string;
  resourceName: string;
  userName: string;
  userEmail: string;
  reservedFrom: string;
  reservedTo: string;
  status: string;
  createdAt: string;
}

interface Device {
  id: string;
  name: string;
  active: boolean;
  logsCount: number;
}

interface CheckinLog {
  id: string;
  deviceName: string;
  userName: string;
  userEmail: string;
  resourceName: string;
  scannedAt: string;
  result: string;
}

interface OpeningHoursDay {
  dayOfWeek: number;
  name: string;
  openTime: string;
  closeTime: string;
  closed: boolean;
}

interface AdminDashboardClientProps {
  tenant: {
    id: string;
    name: string;
    vertical: string;
    attributes?: {
      tagline?: string;
      openTime?: string;
      closeTime?: string;
      adminEmails?: string[];
      bannerImage?: string;
      bannerPosition?: string;
      openingHours?: OpeningHoursDay[];
    };
  };
  resources: Resource[];
  bookings: Booking[];
  devices: Device[];
  checkinLogs: CheckinLog[];
  activeDate?: string;
  weekStart?: string;
}

const timeOptions = [
  ...Array.from({ length: 96 }, (_, i) => {
    const h = Math.floor(i / 4).toString().padStart(2, "0");
    const m = ((i % 4) * 15).toString().padStart(2, "0");
    return `${h}:${m}`;
  }),
  "24:00"
];

const getTimeOptions = (currentValue?: string) => {
  if (currentValue && !timeOptions.includes(currentValue)) {
    const combined = [...timeOptions, currentValue];
    combined.sort();
    return combined;
  }
  return timeOptions;
};

interface TimePickerState {
  id: string;
  rect: DOMRect;
  value: string;
  onChange: (val: string) => void;
}

function TimePickerDropdown({
  picker,
  onClose
}: {
  picker: TimePickerState;
  onClose: () => void;
}) {
  const activeRef = React.useRef<HTMLButtonElement>(null);
  
  React.useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: "center", behavior: "instant" as any });
    }
  }, [picker.id]);

  return (
    <>
      <div 
        className="fixed inset-0 z-50 cursor-default" 
        onClick={onClose} 
      />
      <div
        style={{
          position: "absolute",
          top: `${picker.rect.bottom + window.scrollY}px`,
          left: `${picker.rect.left + window.scrollX}px`,
          width: `${picker.rect.width}px`,
        }}
        className="z-55 mt-1 bg-white/95 dark:bg-[#0D0D15]/95 backdrop-blur-xl border border-slate-200/60 dark:border-[#2A2A40] rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150 font-mono text-xs"
      >
        {getTimeOptions(picker.value).map((t) => {
          const isSelected = t === picker.value;
          return (
            <button
              key={t}
              ref={isSelected ? activeRef : undefined}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                picker.onChange(t);
                onClose();
              }}
              className={`w-full text-center py-2 transition-colors border-b border-slate-100/30 dark:border-[#1F1F35]/20 last:border-0 cursor-pointer ${
                isSelected
                  ? "bg-tenant-primary/10 text-tenant-primary dark:text-[#A78BFA] font-bold"
                  : "text-slate-700 dark:text-slate-350 hover:bg-slate-100/60 dark:hover:bg-[#1A1A2E]/60 font-medium"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>
    </>
  );
}

const defaultOpeningHours: OpeningHoursDay[] = [
  { dayOfWeek: 1, name: "Pondělí", openTime: "08:00", closeTime: "22:00", closed: false },
  { dayOfWeek: 2, name: "Úterý", openTime: "08:00", closeTime: "22:00", closed: false },
  { dayOfWeek: 3, name: "Středa", openTime: "08:00", closeTime: "22:00", closed: false },
  { dayOfWeek: 4, name: "Čtvrtek", openTime: "08:00", closeTime: "22:00", closed: false },
  { dayOfWeek: 5, name: "Pátek", openTime: "08:00", closeTime: "22:00", closed: false },
  { dayOfWeek: 6, name: "Sobota", openTime: "09:00", closeTime: "17:00", closed: false },
  { dayOfWeek: 0, name: "Neděle", openTime: "09:00", closeTime: "17:00", closed: false }
];

export default function AdminDashboardClient({
  tenant,
  resources,
  bookings,
  devices,
  checkinLogs,
  activeDate,
  weekStart
}: AdminDashboardClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const theme = getTenantTheme(tenant.id, tenant.vertical, tenant.name);

  const [activeTab, setActiveTab] = useState<"overview" | "resources" | "rules" | "bookings" | "devices" | "settings" | "operating">("overview");
  const [bookingsSubTab, setBookingsSubTab] = useState<"calendar" | "list">("calendar");

  // Portal settings states
  const initialAttributes = tenant.attributes || {};
  const [settingsTagline, setSettingsTagline] = useState(initialAttributes.tagline || "");
  const [settingsOpenTime, setSettingsOpenTime] = useState(initialAttributes.openTime || "08:00");
  const [settingsCloseTime, setSettingsCloseTime] = useState(initialAttributes.closeTime || "22:00");
  const [settingsBannerImage, setSettingsBannerImage] = useState(initialAttributes.bannerImage || "");
  const [settingsBannerPosition, setSettingsBannerPosition] = useState(initialAttributes.bannerPosition || "center");
  const [settingsOpeningHours, setSettingsOpeningHours] = useState<OpeningHoursDay[]>(
    initialAttributes.openingHours || defaultOpeningHours
  );
  
  // Preset helpers for opening hours
  const [presetOpenTime, setPresetOpenTime] = useState("08:00");
  const [presetCloseTime, setPresetCloseTime] = useState("22:00");
  const [presetClosed, setPresetClosed] = useState(false);
  const [activeTimePicker, setActiveTimePicker] = useState<TimePickerState | null>(null);

  const initialAdminEmails = Array.isArray(initialAttributes.adminEmails)
    ? initialAttributes.adminEmails.join(", ")
    : (initialAttributes.adminEmails || "josef.novak@deepvision.cz");
  const [settingsAdminEmails, setSettingsAdminEmails] = useState(initialAdminEmails);
  const [settingsAiInstructions, setSettingsAiInstructions] = useState((initialAttributes as any).aiInstructions || "");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // Drag-to-reposition states & handlers
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [positionStart, setPositionStart] = useState({ x: 50, y: 50 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  const parsePosition = (pos: string) => {
    if (!pos) return { x: 50, y: 50 };
    if (pos === "center") return { x: 50, y: 50 };
    if (pos === "top") return { x: 50, y: 0 };
    if (pos === "bottom") return { x: 50, y: 100 };
    if (pos === "left") return { x: 0, y: 50 };
    if (pos === "right") return { x: 100, y: 50 };
    const parts = pos.split(" ");
    if (parts.length === 2) {
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      return {
        x: isNaN(x) ? 50 : x,
        y: isNaN(y) ? 50 : y
      };
    }
    return { x: 50, y: 50 };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!settingsBannerImage) return;
    if ((e.target as HTMLElement).closest("label")) return;

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPositionStart(parsePosition(settingsBannerPosition));
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const containerWidth = rect.width || 1;
    const containerHeight = rect.height || 1;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    const newX = Math.max(0, Math.min(100, positionStart.x - (deltaX / containerWidth) * 100));
    const newY = Math.max(0, Math.min(100, positionStart.y - (deltaY / containerHeight) * 100));

    setSettingsBannerPosition(`${Math.round(newX)}% ${Math.round(newY)}%`);
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!settingsBannerImage) return;
    if ((e.target as HTMLElement).closest("label")) return;

    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX, y: touch.clientY });
    setPositionStart(parsePosition(settingsBannerPosition));
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const containerWidth = rect.width || 1;
    const containerHeight = rect.height || 1;

    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStart.x;
    const deltaY = touch.clientY - dragStart.y;

    const newX = Math.max(0, Math.min(100, positionStart.x - (deltaX / containerWidth) * 100));
    const newY = Math.max(0, Math.min(100, positionStart.y - (deltaY / containerHeight) * 100));

    setSettingsBannerPosition(`${Math.round(newX)}% ${Math.round(newY)}%`);
  };

  // Custom alert and confirmation modal states
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void | Promise<void> } | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; title: string; message: string; onClose?: () => void } | null>(null);

  // Modals / forms states
  const [resourceModal, setResourceModal] = useState<{ open: boolean; mode: "add" | "edit"; data: { id: string; name: string; type: string; maxCapacity: number; instructor: string; room: string; parentId: string; surface: string; equipment: string; price: string; } }>({
    open: false,
    mode: "add",
    data: { id: "", name: "", type: "SPACE", maxCapacity: 10, instructor: "", room: "", parentId: "", surface: "", equipment: "", price: "" }
  });

  const [deviceModal, setDeviceModal] = useState<{ open: boolean; mode: "add" | "edit"; data: { id: string; name: string; token: string; active: boolean; } }>({
    open: false,
    mode: "add",
    data: { id: "", name: "", token: "", active: true }
  });

  const czechFormattedDate = React.useMemo(() => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    const formatted = new Date().toLocaleDateString("cs-CZ", options);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, []);

  const isOpenNow = React.useMemo(() => {
    try {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const [openH, openM] = settingsOpenTime.split(":").map(Number);
      const [closeH, closeM] = settingsCloseTime.split(":").map(Number);
      const startMin = openH * 60 + openM;
      const endMin = closeH * 60 + closeM;
      return currentMin >= startMin && currentMin < endMin;
    } catch {
      return true;
    }
  }, [settingsOpenTime, settingsCloseTime]);

  // Synchronize custom events from Admin AI Assistant HUD
  useEffect(() => {
    const handleNavigateTab = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab: any }>;
      if (customEvent.detail?.tab) {
        setActiveTab(customEvent.detail.tab);
      }
    };

    const handleDraftResource = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const data = customEvent.detail;
      if (data) {
        setActiveTab("resources");
        
        let targetId = data.id || "";
        let targetName = data.name || "";
        let targetType = data.type || "SPACE";
        let targetMaxCapacity = data.maxCapacity !== undefined ? data.maxCapacity : 10;
        let targetInstructor = data.instructor || "";
        let targetRoom = data.room || "";
        let targetParentId = data.parentId || "";
        let targetSurface = data.surface || "";
        let targetEquipment = data.equipment || "";
        let targetPrice = data.price || "";

        // Fallback matching by ID or name in existing resources to preserve other attributes
        const existing = resources.find(r => 
          (targetId && r.id === targetId) || 
          (targetName && r.name.toLowerCase() === targetName.toLowerCase())
        );

        if (existing) {
          targetId = existing.id;
          targetName = existing.name;
          if (!data.type) targetType = existing.type;
          if (data.maxCapacity === undefined) targetMaxCapacity = existing.maxCapacity;
          if (data.instructor === undefined) targetInstructor = existing.attributes?.instructor || "";
          if (data.room === undefined) targetRoom = existing.attributes?.room || "";
          if (data.parentId === undefined) targetParentId = existing.attributes?.parentId || "";
          if (data.surface === undefined) targetSurface = existing.attributes?.surface || "";
          if (data.equipment === undefined) targetEquipment = existing.attributes?.equipment || "";
          if (data.price === undefined) targetPrice = existing.attributes?.price || "";
        }

        setResourceModal({
          open: true,
          mode: data.mode || (existing ? "edit" : "add"),
          data: {
            id: targetId,
            name: targetName,
            type: targetType,
            maxCapacity: targetMaxCapacity,
            instructor: targetInstructor,
            room: targetRoom,
            parentId: targetParentId,
            surface: targetSurface,
            equipment: targetEquipment,
            price: targetPrice
          }
        });
      }
    };

    const handleDraftDevice = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const data = customEvent.detail;
      if (data) {
        setActiveTab("devices");
        
        let targetId = data.id || "";
        let targetName = data.name || "";
        let targetActive = data.active !== undefined ? data.active : true;
        let targetToken = data.token || "";

        const existing = devices.find(d => 
          (targetId && d.id === targetId) || 
          (targetName && d.name.toLowerCase() === targetName.toLowerCase())
        );

        if (existing) {
          targetId = existing.id;
          targetName = existing.name;
          if (data.active === undefined) targetActive = existing.active;
        }

        setDeviceModal({
          open: true,
          mode: data.mode || (existing ? "edit" : "add"),
          data: {
            id: targetId,
            name: targetName,
            token: targetToken,
            active: targetActive
          }
        });
      }
    };

    const handleDraftSettings = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const data = customEvent.detail;
      if (data) {
        setActiveTab("settings");
        if (data.tagline !== undefined) setSettingsTagline(data.tagline);
        if (data.openTime !== undefined) setSettingsOpenTime(data.openTime);
        if (data.closeTime !== undefined) setSettingsCloseTime(data.closeTime);
        if (Array.isArray(data.adminEmails)) setSettingsAdminEmails(data.adminEmails.join(", "));
        if (data.aiInstructions !== undefined) setSettingsAiInstructions(data.aiInstructions);
      }
    };

    window.addEventListener("admin-assistant-navigate-tab", handleNavigateTab);
    window.addEventListener("admin-assistant-draft-resource", handleDraftResource);
    window.addEventListener("admin-assistant-draft-device", handleDraftDevice);
    window.addEventListener("admin-assistant-draft-settings", handleDraftSettings);

    return () => {
      window.removeEventListener("admin-assistant-navigate-tab", handleNavigateTab);
      window.removeEventListener("admin-assistant-draft-resource", handleDraftResource);
      window.removeEventListener("admin-assistant-draft-device", handleDraftDevice);
      window.removeEventListener("admin-assistant-draft-settings", handleDraftSettings);
    };
  }, []);

  // --- Image Upload Handler ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      try {
        const res = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "image_upload",
            data: {
              tenantId: tenant.id,
              base64Data
            }
          })
        });

        if (res.ok) {
          const data = await res.json();
          setSettingsBannerImage(data.imageUrl);
          setNotification({
            type: "success",
            title: "Nahrání úspěšné",
            message: "Obrázek banneru byl úspěšně nahrán!",
            onClose: () => router.refresh()
          });
        } else {
          setNotification({
            type: "error",
            title: "Nahrání selhalo",
            message: "Při nahrávání obrázku došlo k chybě."
          });
        }
      } catch (err) {
        console.error(err);
        setNotification({
          type: "error",
          title: "Nahrání selhalo",
          message: "Nepodařilo se nahrát obrázek."
        });
      } finally {
        setImageUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Preset application functions
  const applyPresetToDays = (daysToApply: number[]) => {
    setSettingsOpeningHours(prev => 
      prev.map(day => {
        if (daysToApply.includes(day.dayOfWeek)) {
          return {
            ...day,
            openTime: presetOpenTime,
            closeTime: presetCloseTime,
            closed: presetClosed
          };
        }
        return day;
      })
    );
  };

  // --- CRUD API Triggers ---
  const handleResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSend = {
      id: resourceModal.data.id || undefined,
      tenantId: tenant.id,
      name: resourceModal.data.name,
      type: resourceModal.data.type,
      maxCapacity: typeof resourceModal.data.maxCapacity === "string" ? parseInt(resourceModal.data.maxCapacity, 10) : resourceModal.data.maxCapacity,
      attributes: {
        instructor: resourceModal.data.instructor,
        room: resourceModal.data.room,
        parentId: resourceModal.data.parentId || undefined,
        surface: resourceModal.data.surface,
        equipment: resourceModal.data.equipment,
        price: resourceModal.data.price
      }
    };

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resource_upsert", data: dataToSend })
      });
      if (res.ok) {
        setResourceModal({ ...resourceModal, open: false });
        window.dispatchEvent(new CustomEvent("admin-assistant-action-completed", { detail: { action: "uložení zdroje", success: true } }));
        setNotification({
          type: "success",
          title: "Zdroj uložen",
          message: "Detaily zdroje byly úspěšně uloženy!",
          onClose: () => router.refresh()
        });
      } else {
        setNotification({
          type: "error",
          title: "Uložení selhalo",
          message: "Při ukládání zdroje došlo k chybě."
        });
      }
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        title: "Chyba",
        message: "Došlo k neočekávané chybě."
      });
    }
  };

  const handleResourceDelete = (id: string) => {
    setConfirmModal({
      title: "Smazat zdroj",
      message: "Opravdu chcete smazat tento zdroj a všechna jeho časová pravidla?",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "resource_delete", data: { id, tenantId: tenant.id } })
          });
          if (res.ok) {
            setNotification({
              type: "success",
              title: "Zdroj smazán",
              message: "Zdroj a jeho pravidla byla úspěšně smazána!",
              onClose: () => router.refresh()
            });
          } else {
            setNotification({
              type: "error",
              title: "Smazání selhalo",
              message: "Při mazání zdroje došlo k chybě."
            });
          }
        } catch (err) {
          console.error(err);
          setNotification({
            type: "error",
            title: "Chyba",
            message: "Došlo k neočekávané chybě."
          });
        }
      }
    });
  };


  const handleDeviceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "device_upsert", 
          data: {
            ...deviceModal.data,
            tenantId: tenant.id
          } 
        })
      });
      if (res.ok) {
        await res.json();
        const createdToken = deviceModal.data.token;
        setDeviceModal({ ...deviceModal, open: false });
        window.dispatchEvent(new CustomEvent("admin-assistant-action-completed", { detail: { action: "uložení IoT zařízení", success: true } }));

        if (deviceModal.mode === "add" && createdToken) {
          setNotification({
            type: "success",
            title: "Zařízení nakonfigurováno",
            message: `Přístupové IoT zařízení bylo úspěšně nakonfigurováno!\n\nUložte si následující token pro konfiguraci turniketu/čtečky:\nToken: ${createdToken}`,
            onClose: () => router.refresh()
          });
        } else {
          setNotification({
            type: "success",
            title: "Úspěch",
            message: "Nastavení zařízení byla úspěšně uložena!",
            onClose: () => router.refresh()
          });
        }
      } else {
        setNotification({
          type: "error",
          title: "Uložení selhalo",
          message: "Při ukládání konfigurace zařízení došlo k chybě."
        });
      }
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        title: "Chyba",
        message: "Došlo k neočekávané chybě."
      });
    }
  };

  const handleDeviceDelete = (id: string) => {
    setConfirmModal({
      title: "Smazat IoT zařízení",
      message: "Opravdu chcete smazat toto odbavovací zařízení?",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "device_delete", data: { id, tenantId: tenant.id } })
          });
          if (res.ok) {
            setNotification({
              type: "success",
              title: "Zařízení smazáno",
              message: "Registrace odbavovacího zařízení byla úspěšně odebrána!",
              onClose: () => router.refresh()
            });
          } else {
            setNotification({
              type: "error",
              title: "Smazání selhalo",
              message: "Při mazání odbavovacího zařízení došlo k chybě."
            });
          }
        } catch (err) {
          console.error(err);
          setNotification({
            type: "error",
            title: "Chyba",
            message: "Došlo k neočekávané chybě."
          });
        }
      }
    });
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    
    // Parse admin emails back into an array
    const emailsArray = settingsAdminEmails
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    const dataToSend = {
      id: tenant.id,
      attributes: {
        ...(tenant.attributes || {}),
        tagline: settingsTagline,
        openTime: settingsOpenTime,
        closeTime: settingsCloseTime,
        bannerImage: settingsBannerImage,
        bannerPosition: settingsBannerPosition,
        openingHours: settingsOpeningHours,
        adminEmails: emailsArray,
        aiInstructions: settingsAiInstructions,
      }
    };

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tenant_settings_update", data: dataToSend })
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("admin-assistant-action-completed", { detail: { action: "uložení nastavení portálu", success: true } }));
        setNotification({
          type: "success",
          title: "Nastavení aktualizována",
          message: "Nastavení portálu byla úspěšně aktualizována!",
          onClose: () => router.refresh()
        });
      } else {
        setNotification({
          type: "error",
          title: "Uložení selhalo",
          message: "Při ukládání nastavení došlo k chybě."
        });
      }
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        title: "Uložení selhalo",
        message: "Nepodařilo se uložit nastavení."
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Find Monday of the week containing activeDate or default
  const monday = React.useMemo(() => {
    if (weekStart) return new Date(`${weekStart}T00:00:00.000Z`);
    // Fallback: calculate from URL or default date
    const d = activeDate ? new Date(`${activeDate}T00:00:00.000Z`) : new Date("2026-06-08T00:00:00.000Z");
    const temp = new Date(d);
    const day = temp.getUTCDay();
    const diff = temp.getUTCDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(temp);
    mon.setUTCDate(diff);
    mon.setUTCHours(0, 0, 0, 0);
    return mon;
  }, [weekStart, activeDate]);

  const nextMonday = React.useMemo(() => {
    const next = new Date(monday);
    next.setUTCDate(monday.getUTCDate() + 7);
    return next;
  }, [monday]);

  // Generate calendar events from bookings and rules client-side
  const calendarEvents = React.useMemo(() => {
    const events: CalendarEvent[] = [];
    
    // A. Add confirmed bookings as occupied calendar overlays
    bookings.forEach((booking) => {
      if (booking.status !== "CONFIRMED") return;
      const from = new Date(booking.reservedFrom);
      const to = new Date(booking.reservedTo);

      // Filter bookings to only include those in the current navigated week
      if (from < monday || from >= nextMonday) return;

      const startHour = from.getUTCHours() + from.getUTCMinutes() / 60;
      const endHour = to.getUTCHours() + to.getUTCMinutes() / 60;
      const durationHours = endHour - startHour;
      
      const dayOfWeek = from.getUTCDay();
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      
      const resource = resources.find(r => r.id === booking.resourceId);
      const room = resource?.attributes?.room || resource?.attributes?.surface || "Hřiště";

      events.push({
        id: booking.id,
        name: booking.userName || booking.resourceName,
        room: room,
        instructor: booking.userEmail,
        dayIndex,
        startHour,
        durationHours,
        resourceId: booking.resourceId,
        isOccupied: true,
        resourceName: booking.resourceName,
      });
    });

    // B. Add schedule rules (for classes/regular programs)
    if (tenant.vertical !== "SPORTS_GROUND") {
      resources.forEach((resource) => {
        const instructor = resource.attributes.instructor || "Staff";
        const room = resource.attributes.room || "Room";

        resource.scheduleRules.forEach((rule) => {
          const [sh, sm] = rule.startTime.split(":").map(Number);
          const startHour = sh + sm / 60;
          const [eh, em] = rule.endTime.split(":").map(Number);
          const endHour = eh + em / 60;
          const durationHours = endHour - startHour;
          const dayIndex = rule.dayOfWeek !== null ? (rule.dayOfWeek === 0 ? 6 : rule.dayOfWeek - 1) : 0;

          events.push({
            id: rule.id,
            name: rule.name,
            room: room,
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

    return events;
  }, [bookings, resources, tenant.vertical, monday, nextMonday]);

  // Helper translations
  const getDayName = (dayOfWeek: number | null) => {
    if (dayOfWeek === null) return "Jednorázově";
    const days = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];
    return days[dayOfWeek] || "Specifický";
  };

  const getResourceTypeName = (type: string, vertical: string, name: string, parentId: string | null, siblingsCount: number) => {
    if (vertical === "SPORTS_GROUND") {
      switch (type) {
        case "SPACE": 
          const nameLower = name.toLowerCase();
          if (parentId !== null || nameLower.includes("sektor") || nameLower.includes("sector") || nameLower.includes("sektro") || nameLower.includes("1/2")) {
            if (siblingsCount === 3) return "Třetina hřiště";
            if (siblingsCount === 2) return "Polovina hřiště";
            return "Polovina hřiště";
          }
          return "Celé hřiště";
        case "SEAT": return "Místo k sezení";
        case "COURSE_PROGRAM": return "Trénink / Lekce";
        default: return type;
      }
    }
    switch (type) {
      case "SPACE": return "Kapacitní lekce";
      case "SEAT": return "Sedadlo";
      case "COURSE_PROGRAM": return "Pravidelný program";
      default: return type;
    }
  };

  // Redirect 'rules' tab to 'resources' to support unified slots view and preserve backward compatibility with AI draft commands
  useEffect(() => {
    if (activeTab === "rules") {
      setActiveTab("resources");
    }
  }, [activeTab]);

  // Recursive React component to render hierarchical resource tree
  const RenderResourceNode = ({ res, level = 0 }: { res: any; level: number }) => {
    const children = resources.filter(r => r.attributes?.parentId === res.id);
    const resAttrs = res.attributes || {};
    
    const priceText = resAttrs.price 
      ? `${resAttrs.price} Kč` 
      : "Dle dohody";
    
    const timeText = `${settingsOpenTime} - ${settingsCloseTime}`;

    const siblingsCount = resAttrs.parentId
      ? resources.filter(r => r.attributes?.parentId === resAttrs.parentId).length
      : 0;

    const typeLabel = getResourceTypeName(res.type, tenant.vertical, res.name, resAttrs.parentId || null, siblingsCount);

    return (
      <div 
        className="relative space-y-4"
        style={{ paddingLeft: level > 0 ? "24px" : "0" }}
      >
        {/* Visual guide lines for children hierarchy */}
        {level > 0 && (
          <>
            <div 
              className="absolute left-[8px] top-0 bottom-6 border-l-2 border-dashed border-slate-200 dark:border-[#1F1F35]" 
              style={{ height: "calc(100% - 24px)" }}
            />
            <div className="absolute left-[8px] top-8 w-4 border-t-2 border-dashed border-slate-200 dark:border-[#1F1F35]" />
          </>
        )}

        <div className="flex gap-4">
          <div className="flex-1 bg-white/45 dark:bg-[#0D0D15]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] border-l-[4px] border-l-tenant-primary rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-tenant-primary/10 border border-tenant-primary/20 text-tenant-primary uppercase tracking-widest select-none shadow-[inset_0_0.5px_0.5px_rgba(255,255,255,0.4)]">
                    {typeLabel}
                  </span>
                  {level > 0 && (
                    <span className="text-[9.5px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider select-none">
                      • Podřízený výběr
                    </span>
                  )}
                </div>
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 mt-2.5 mb-1.5 tracking-tight">
                  {res.name}
                </h4>
                <div className="text-[11px] text-muted-foreground flex gap-3 flex-wrap">
                  {resAttrs.surface && <span>Povrch: <strong>{resAttrs.surface}</strong></span>}
                  <span>Kapacita: <strong>{res.maxCapacity} {tenant.vertical === "SPORTS_GROUND" ? "skupina/y" : "místo/a"}</strong></span>
                  <span>Cena: <strong>{resAttrs.price ? `${resAttrs.price} Kč/hod` : "Dle dohody"}</strong></span>
                  {resAttrs.equipment && <span className="truncate max-w-[200px]" title={resAttrs.equipment}>Vybavení: {resAttrs.equipment}</span>}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right mr-1 select-none hidden sm:block">
                  <span className="block text-[9px] uppercase font-extrabold text-slate-400 dark:text-zinc-500 tracking-wider">Cena pronájmu</span>
                  <span className="text-xs font-extrabold text-tenant-primary bg-tenant-primary/5 border border-tenant-primary/15 px-2.5 py-1 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
                    {resAttrs.price ? `${resAttrs.price} Kč/hod` : "Dle dohody"}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setResourceModal({
                      open: true,
                      mode: "edit",
                      data: {
                        id: res.id,
                        name: res.name,
                        type: res.type,
                        maxCapacity: res.maxCapacity,
                        instructor: resAttrs.instructor || "",
                        room: resAttrs.room || "",
                        parentId: resAttrs.parentId || "",
                        surface: resAttrs.surface || "",
                        equipment: resAttrs.equipment || "",
                        price: resAttrs.price || ""
                      }
                    })}
                    className="p-1.5 rounded-xl bg-white/50 hover:bg-white/85 dark:bg-[#131322]/40 dark:hover:bg-[#1F1F35]/50 text-tenant-primary border border-slate-200/50 dark:border-[#1F1F35] hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer"
                    title="Upravit zdroj"
                  >
                    <Edit size={13} />
                  </button>
                  <button
                    onClick={() => handleResourceDelete(res.id)}
                    className="p-1.5 rounded-xl bg-white/50 hover:bg-white/85 dark:bg-[#131322]/40 dark:hover:bg-[#1F1F35]/50 text-red-500 border border-slate-200/50 dark:border-[#1F1F35] hover:bg-red-500/10 dark:hover:bg-red-500/15 hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer"
                    title="Smazat zdroj"
                  >
                    <Trash size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {children.length > 0 && (
          <div className="space-y-4">
            {children.map(child => (
              <RenderResourceNode key={child.id} res={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const getResultBadgeColor = (result: string) => {
    switch (result) {
      case "SUCCESS": return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
      case "ALREADY_ATTENDED": return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
      default: return "bg-red-500/10 text-red-500 border border-red-500/20";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "ATTENDED": return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
      case "CONFIRMED": return "bg-tenant-primary/10 text-tenant-primary border border-tenant-primary/20";
      case "PENDING_PAYMENT": return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
      default: return "bg-red-500/10 text-red-500 border border-red-500/20";
    }
  };

  // Categorized resources
  const facilities = resources.filter(r => r.type === "SPACE" || r.type === "SEAT");
  const classesAndPrograms = resources.filter(r => r.type === "COURSE_PROGRAM");

  return (
    <div className="flex-1 bg-background text-foreground flex flex-col font-sans transition-colors duration-200 relative overflow-hidden">
      {/* Premium Ambient Glow Blobs */}
      <div className="absolute top-[-25%] left-[-15%] w-[60%] h-[60%] rounded-full bg-tenant-primary/5 dark:bg-tenant-primary/10 blur-[130px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '10s' }} />
      <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] rounded-full bg-tenant-primary/4 dark:bg-tenant-primary/8 blur-[160px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '15s' }} />
      <header className="border-b border-slate-200/50 dark:border-[#1F1F35]/30 bg-white/45 dark:bg-[#07070C]/35 backdrop-blur-xl sticky top-0 z-40 transition-all shadow-md shadow-slate-100/5 dark:shadow-black/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-white/40 dark:bg-[#0F0F1A]/60 backdrop-blur-md text-slate-500 dark:text-zinc-400 hover:text-tenant-primary dark:hover:text-purple-400 border border-[#E2E2ED]/60 dark:border-[#1F1F2E] transition-all flex items-center justify-center cursor-pointer hover:scale-105 shadow-sm"
              title="Zpět na portál"
            >
              <ArrowLeft size={14} />
            </Link>
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
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-sm leading-tight">{theme.name}</span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-tenant-primary/10 border border-tenant-primary/20 text-tenant-primary uppercase tracking-wide leading-none">
                  Administrace
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-semibold tracking-wide mt-0.5">{theme.verticalName}</span>
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
                <div className="hidden sm:flex flex-col text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-tenant-primary/10 border border-tenant-primary/20 text-tenant-primary uppercase tracking-wide leading-none">
                      Správce
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none">{session.user?.name}</span>
                  </div>
                  <span className="text-[9px] text-slate-500 dark:text-zinc-400 mt-1 leading-none">{session.user?.email}</span>
                </div>
                
                {/* Avatar with gradient matching brand colors */}
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-tenant-primary/25 to-tenant-primary/5 dark:from-tenant-primary/30 dark:to-tenant-primary/10 border border-tenant-primary/20 dark:border-tenant-primary/30 text-tenant-primary dark:text-purple-400 flex items-center justify-center font-extrabold text-xs select-none shadow-sm shadow-tenant-primary/5">
                  {session.user?.name ? session.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "A"}
                </div>
                
                <LogoutButton />
              </div>
            ) : (
              <div className="pl-1 pr-0.5 py-0.5 flex items-center">
                <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 px-3 select-none">Nepřihlášen</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Admin Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Navigation Sidebar */}
        <aside className="md:w-64 space-y-1.5 h-fit bg-white/45 dark:bg-[#0A0A10]/35 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] p-3 rounded-2xl shadow-sm shadow-slate-100/5 dark:shadow-black/5">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-semibold transition-all cursor-pointer border border-transparent ${
              activeTab === "overview" 
                ? "bg-tenant-gradient text-white shadow-md shadow-tenant-primary/20 scale-[1.02] font-bold" 
                : "text-slate-500 dark:text-zinc-400 hover:text-tenant-primary dark:hover:text-purple-400 hover:bg-white/50 dark:hover:bg-[#131322]/40 hover:border-slate-200/30 dark:hover:border-[#1F1F35]/20 hover:scale-[1.01]"
            }`}
          >
            <Building size={16} />
            Přehled a logy
          </button>
          
          <button
            onClick={() => setActiveTab("resources")}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-semibold transition-all cursor-pointer border border-transparent ${
              activeTab === "resources" 
                ? "bg-tenant-gradient text-white shadow-md shadow-tenant-primary/20 scale-[1.02] font-bold" 
                : "text-slate-500 dark:text-zinc-400 hover:text-tenant-primary dark:hover:text-purple-400 hover:bg-white/50 dark:hover:bg-[#131322]/40 hover:border-slate-200/30 dark:hover:border-[#1F1F35]/20 hover:scale-[1.01]"
            }`}
          >
            <ClipboardList size={16} />
            Správa zdrojů
          </button>

          <button
            onClick={() => setActiveTab("operating")}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-semibold transition-all cursor-pointer border border-transparent ${
              activeTab === "operating" 
                ? "bg-tenant-gradient text-white shadow-md shadow-tenant-primary/20 scale-[1.02] font-bold" 
                : "text-slate-500 dark:text-zinc-400 hover:text-tenant-primary dark:hover:text-purple-400 hover:bg-white/50 dark:hover:bg-[#131322]/40 hover:border-slate-200/30 dark:hover:border-[#1F1F35]/20 hover:scale-[1.01]"
            }`}
          >
            <Clock size={16} />
            Provozní doba
          </button>

          <button
            onClick={() => setActiveTab("bookings")}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-semibold transition-all cursor-pointer border border-transparent ${
              activeTab === "bookings" 
                ? "bg-tenant-gradient text-white shadow-md shadow-tenant-primary/20 scale-[1.02] font-bold" 
                : "text-slate-500 dark:text-zinc-400 hover:text-tenant-primary dark:hover:text-purple-400 hover:bg-white/50 dark:hover:bg-[#131322]/40 hover:border-slate-200/30 dark:hover:border-[#1F1F35]/20 hover:scale-[1.01]"
            }`}
          >
            <Calendar size={16} />
            Rezervace
          </button>

          <button
            onClick={() => setActiveTab("devices")}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-semibold transition-all cursor-pointer border border-transparent ${
              activeTab === "devices" 
                ? "bg-tenant-gradient text-white shadow-md shadow-tenant-primary/20 scale-[1.02] font-bold" 
                : "text-slate-500 dark:text-zinc-400 hover:text-tenant-primary dark:hover:text-purple-400 hover:bg-white/50 dark:hover:bg-[#131322]/40 hover:border-slate-200/30 dark:hover:border-[#1F1F35]/20 hover:scale-[1.01]"
            }`}
          >
            <QrCode size={16} />
            IoT zařízení
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-semibold transition-all cursor-pointer border border-transparent ${
              activeTab === "settings" 
                ? "bg-tenant-gradient text-white shadow-md shadow-tenant-primary/20 scale-[1.02] font-bold" 
                : "text-slate-500 dark:text-zinc-400 hover:text-tenant-primary dark:hover:text-purple-400 hover:bg-white/50 dark:hover:bg-[#131322]/40 hover:border-slate-200/30 dark:hover:border-[#1F1F35]/20 hover:scale-[1.01]"
            }`}
          >
            <Settings size={16} />
            Nastavení portálu
          </button>
        </aside>

        {/* Tab Workspaces */}
        <section className="flex-1 space-y-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Analytics Header Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {/* Resources Metric */}
                <div className="p-5 bg-white/45 dark:bg-[#0D0D15]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-3xl shadow-sm hover:border-tenant-primary/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:shadow-tenant-primary/5 flex items-center justify-between group relative overflow-hidden cursor-default">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-tenant-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-extrabold uppercase tracking-wider block group-hover:text-tenant-primary transition-colors duration-300">Zdroje</span>
                    <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-200 tracking-tight block">{resources.length}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-tenant-primary/10 dark:bg-tenant-primary/15 text-tenant-primary transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 flex items-center justify-center shrink-0">
                    <Building size={20} />
                  </div>
                </div>

                {/* Total Bookings Metric */}
                <div className="p-5 bg-white/45 dark:bg-[#0D0D15]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-3xl shadow-sm hover:border-tenant-primary/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:shadow-tenant-primary/5 flex items-center justify-between group relative overflow-hidden cursor-default">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-tenant-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-extrabold uppercase tracking-wider block group-hover:text-tenant-primary transition-colors duration-300">Rezervace celkem</span>
                    <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-200 tracking-tight block">{bookings.length}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-tenant-primary/10 dark:bg-tenant-primary/15 text-tenant-primary transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 flex items-center justify-center shrink-0">
                    <Calendar size={20} />
                  </div>
                </div>

                {/* IoT Gates Metric */}
                <div className="p-5 bg-white/45 dark:bg-[#0D0D15]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-3xl shadow-sm hover:border-tenant-primary/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:shadow-tenant-primary/5 flex items-center justify-between group relative overflow-hidden cursor-default">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-tenant-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-extrabold uppercase tracking-wider block group-hover:text-tenant-primary transition-colors duration-300">IoT brány</span>
                    <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-200 tracking-tight block">{devices.length}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-tenant-primary/10 dark:bg-tenant-primary/15 text-tenant-primary transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 flex items-center justify-center shrink-0">
                    <Smartphone size={20} />
                  </div>
                </div>

                {/* Turnstile Logs Metric */}
                <div className="p-5 bg-white/45 dark:bg-[#0D0D15]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-3xl shadow-sm hover:border-tenant-primary/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:shadow-tenant-primary/5 flex items-center justify-between group relative overflow-hidden cursor-default">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-tenant-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-extrabold uppercase tracking-wider block group-hover:text-tenant-primary transition-colors duration-300">Průchody turniketem</span>
                    <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-200 tracking-tight block">{checkinLogs.length}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-tenant-primary/10 dark:bg-tenant-primary/15 text-tenant-primary transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 flex items-center justify-center shrink-0">
                    <Activity size={20} />
                  </div>
                </div>
              </div>

              {/* Turnstile Access Logs Stream */}
              <div className="p-6 bg-white/45 dark:bg-[#0D0D15]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-3xl shadow-sm hover:border-tenant-primary/20 transition-all duration-300">
                <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-tenant-accent" />
                  Živé logy průchodů turniketem (Historie skenování)
                </h3>

                {checkinLogs.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground font-mono">
                    Zatím nebyly zaznamenány žádné průchody. K simulaci průchodu použijte POST /api/device/checkin.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/50 dark:border-[#1F1F35]/30 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 font-semibold">Čas</th>
                          <th className="py-2.5 font-semibold">Uživatel</th>
                          <th className="py-2.5 font-semibold">Brána/Zařízení</th>
                          <th className="py-2.5 font-semibold">Zdroj</th>
                          <th className="py-2.5 font-semibold text-right">Výsledek</th>
                        </tr>
                      </thead>
                      <tbody>
                        {checkinLogs.map((log) => (
                          <tr key={log.id} className="border-b border-slate-100/50 dark:border-[#1F1F35]/10 hover:bg-tenant-primary/5 dark:hover:bg-tenant-primary/10 transition-colors">
                            <td className="py-3 font-mono text-muted-foreground">
                              {formatUTCTime(log.scannedAt)}
                            </td>
                            <td className="py-3 font-medium text-foreground">
                              <div>{log.userName}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{log.userEmail}</div>
                            </td>
                            <td className="py-3 text-foreground">{log.deviceName}</td>
                            <td className="py-3 text-muted-foreground">{log.resourceName}</td>
                            <td className="py-3 text-right">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getResultBadgeColor(log.result)}`}>
                                {log.result === "SUCCESS" ? "ÚSPĚCH" : log.result === "ALREADY_ATTENDED" ? "JIŽ POUŽITO" : "NEÚSPĚCH"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: RESOURCES MANAGER */}
          {activeTab === "resources" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Správa zdrojů a rozvrhů</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Konfigurace sportovních ploch, sektorů, lekcí a jejich časových slotů.</p>
                </div>
                <button
                  onClick={() => setResourceModal({
                    open: true, mode: "add",
                    data: { id: "", name: "", type: "SPACE", maxCapacity: 10, instructor: "", room: "", parentId: "", surface: "", equipment: "", price: "" }
                  })}
                  className="bg-tenant-gradient hover:opacity-95 active:scale-95 transition-all text-white text-xs py-2 px-3.5 flex items-center gap-1.5 rounded-xl font-bold shadow-sm shadow-tenant-primary/15 cursor-pointer"
                >
                  <Plus size={14} />
                  Přidat zdroj
                </button>
              </div>

              {/* Categorization display as trees */}
              <div className="space-y-8">
                {/* A. Facilities tree */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-4 select-none flex items-center gap-2 pl-1">
                    <Building size={14} className="text-tenant-primary" />
                    Plochy a pronajímatelné prostory (Hřiště, Sektory, Místnosti)
                  </h4>
                  {facilities.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic mb-4">Zatím nebyly vytvořeny žádné plochy.</p>
                  ) : (
                    <div className="space-y-6">
                      {facilities.filter(r => !r.attributes?.parentId).map((res) => (
                        <RenderResourceNode
                          key={res.id}
                          res={res}
                          level={0}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* B. Classes/Programs tree */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-4 select-none flex items-center gap-2 pl-1 pt-6 border-t border-slate-200/40 dark:border-[#1F1F35]/40">
                    <Clock size={14} className="text-tenant-primary" />
                    Dostupné lekce, kurzy a programy
                  </h4>
                  {classesAndPrograms.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Zatím nebyly vytvořeny žádné lekce ani programy.</p>
                  ) : (
                    <div className="space-y-6">
                      {classesAndPrograms.filter(r => !r.attributes?.parentId).map((res) => (
                        <RenderResourceNode
                          key={res.id}
                          res={res}
                          level={0}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BOOKINGS */}
          {activeTab === "bookings" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Rezervace a objednávky zákazníků</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Zobrazte rezervace v rozvrhu nebo procházejte seznam podrobností.</p>
                </div>
                
                {/* Sub-tab Toggle */}
                <div className="flex bg-white/40 dark:bg-[#0F0F1A]/60 border border-[#E2E2ED]/60 dark:border-[#1F1F2E] p-1 rounded-xl text-xs select-none shadow-sm">
                  <button
                    onClick={() => setBookingsSubTab("calendar")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      bookingsSubTab === "calendar"
                        ? "bg-white dark:bg-[#1D1D2C] text-tenant-primary dark:text-purple-400 shadow-sm font-bold scale-105"
                        : "text-slate-500 dark:text-zinc-400 hover:text-tenant-primary dark:hover:text-purple-400"
                    }`}
                  >
                    <Eye size={14} />
                    Mřížka rozvrhu
                  </button>
                  <button
                    onClick={() => setBookingsSubTab("list")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      bookingsSubTab === "list"
                        ? "bg-white dark:bg-[#1D1D2C] text-tenant-primary dark:text-purple-400 shadow-sm font-bold scale-105"
                        : "text-slate-500 dark:text-zinc-400 hover:text-tenant-primary dark:hover:text-purple-400"
                    }`}
                  >
                    <List size={14} />
                    Seznam detailů
                  </button>
                </div>
              </div>

              {bookingsSubTab === "calendar" ? (
                /* Admin Calendar View */
                <CalendarView
                  tenantId={tenant.id}
                  initialEvents={calendarEvents}
                  session={{ user: { name: "Admin", email: "admin@deepvision.cz" } }}
                  resources={resources.map(r => ({
                    id: r.id,
                    name: r.name,
                    parentId: r.attributes.parentId || null
                  }))}
                  openTime={settingsOpenTime}
                  closeTime={settingsCloseTime}
                  openingHours={settingsOpeningHours}
                  isAdmin={true}
                  activeDate={activeDate}
                  weekStart={weekStart}
                />
              ) : (
                /* List/Table View */
                <div className="p-6 bg-white/45 dark:bg-[#0D0D15]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-3xl shadow-sm hover:border-tenant-primary/10 transition-all duration-300">
                  {bookings.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground font-mono">
                      Zatím nebyly provedeny žádné rezervace.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200/50 dark:border-[#1F1F35]/30 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-2.5 font-semibold">Uživatel</th>
                            <th className="py-2.5 font-semibold">Zdroj</th>
                            <th className="py-2.5 font-semibold">Rezervovaný slot</th>
                            <th className="py-2.5 font-semibold">Stav</th>
                            <th className="py-2.5 font-semibold text-right">Akce</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookings.map((booking) => (
                            <tr key={booking.id} className="border-b border-slate-100/50 dark:border-[#1F1F35]/10 hover:bg-tenant-primary/5 dark:hover:bg-tenant-primary/10 transition-colors">
                              <td className="py-3 font-medium text-foreground">
                                <div>{booking.userName}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">{booking.userEmail}</div>
                              </td>
                              <td className="py-3 text-foreground">{booking.resourceName}</td>
                              <td className="py-3 text-foreground font-mono">
                                {formatUTCDate(booking.reservedFrom)}
                                <span className="text-muted-foreground text-[10px] ml-1.5">
                                  {formatUTCTimeRange(booking.reservedFrom, booking.reservedTo)}
                                </span>
                              </td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getStatusBadgeColor(booking.status)}`}>
                                  {booking.status === "CONFIRMED" ? "Potvrzeno" : booking.status === "PENDING_PAYMENT" ? "Čeká na platbu" : booking.status === "ATTENDED" ? "Odbaveno" : "Zrušeno"}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => {
                                    setConfirmModal({
                                      title: "Zrušit rezervaci",
                                      message: "Opravdu chcete stornovat tuto rezervaci?",
                                      onConfirm: async () => {
                                        try {
                                          const res = await fetch(`/api/bookings?bookingId=${booking.id}`, {
                                            method: "DELETE"
                                          });
                                          if (res.ok) {
                                            setNotification({
                                              type: "success",
                                              title: "Rezervace zrušena",
                                              message: "Rezervace byla úspěšně stornována!",
                                              onClose: () => router.refresh()
                                            });
                                          } else {
                                            setNotification({
                                              type: "error",
                                              title: "Storno se nezdařilo",
                                              message: "Při rušení rezervace došlo k chybě."
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
                                  className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/15 text-red-500 border border-red-500/20 hover:scale-105 active:scale-95 transition-all text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  Zrušit
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: IoT DEVICES */}
          {activeTab === "devices" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-foreground">Přístupové čtečky a zařízení ({devices.length})</h3>
                <button
                  onClick={() => setDeviceModal({
                    open: true, mode: "add",
                    data: { id: "", name: "", token: "sec_tok_" + Math.random().toString(36).substring(3, 9), active: true }
                  })}
                  className="bg-tenant-gradient hover:opacity-95 active:scale-95 transition-all text-white text-xs py-2 px-3.5 flex items-center gap-1.5 rounded-xl font-bold shadow-sm shadow-tenant-primary/15 cursor-pointer"
                >
                  <Plus size={14} />
                  Registrovat čtečku
                </button>
              </div>

              {devices.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground font-mono bg-white/45 dark:bg-[#0D0D15]/40 border border-slate-200/50 dark:border-[#1F1F35] rounded-2xl">
                  Zatím nejsou registrovány žádné čtečky. Spusťte nové zařízení s hlavičkou tenanta.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {devices.map((dev) => (
                    <div key={dev.id} className="p-5 bg-white/45 dark:bg-[#0D0D15]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] border-l-[4px] border-l-tenant-primary hover:border-tenant-primary/30 dark:hover:border-tenant-primary/25 hover:shadow-md hover:shadow-tenant-primary/5 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 rounded-2xl flex flex-col justify-between group shadow-sm shadow-slate-100/5 dark:shadow-black/5 relative">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            dev.active 
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-500 border border-red-500/20"
                          }`}>
                            {dev.active ? "Aktivní" : "Deaktivováno"}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono uppercase">ID: {dev.id}</span>
                        </div>
                        <h4 className="font-bold text-base text-foreground flex items-center gap-2 group-hover:text-tenant-primary transition-colors">
                          <Smartphone size={16} className="text-slate-400 dark:text-zinc-500" />
                          {dev.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-zinc-400">
                          Počet zaznamenaných průchodů: <strong className="text-foreground">{dev.logsCount}</strong>
                        </p>
                      </div>

                      <div className="flex justify-end gap-2 border-t border-slate-200/40 dark:border-[#1F1F35]/45 pt-4 mt-4 select-none">
                        <button
                          onClick={() => setDeviceModal({
                            open: true,
                            mode: "edit",
                            data: { id: dev.id, name: dev.name, token: "", active: dev.active }
                          })}
                          className="p-2 rounded-xl bg-white/50 hover:bg-white/85 dark:bg-[#131322]/40 dark:hover:bg-[#1F1F35]/50 text-tenant-primary border border-slate-200/50 dark:border-[#1F1F35] hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer"
                          title="Upravit nastavení zařízení"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => handleDeviceDelete(dev.id)}
                          className="p-2 rounded-xl bg-white/50 hover:bg-white/85 dark:bg-[#131322]/40 dark:hover:bg-[#1F1F35]/50 text-red-500 border border-slate-200/50 dark:border-[#1F1F35] hover:bg-red-500/10 dark:hover:bg-red-500/15 hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer"
                          title="Odebrat zařízení"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              {/* Tab Header - Outside Card */}
              <div>
                <h3 className="text-sm font-bold text-foreground">Vzhled a nastavení portálu</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Konfigurujte přizpůsobené vizuální parametry, přístupy a slogan pro tuto instanci portálu.</p>
              </div>

              <form onSubmit={handleSettingsSubmit} className="space-y-6 text-xs">
                
                {/* CARD 1: Vizuální styl, branding a přístupy */}
                <div className="p-6 bg-white/45 dark:bg-[#0D0D15]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-3xl shadow-sm hover:border-tenant-primary/10 transition-all duration-300 space-y-5">
                  <h4 className="text-xs font-bold text-tenant-primary uppercase tracking-wider flex items-center gap-1.5 select-none">
                    <Building size={14} />
                    Vizuální styl, branding a přístupy
                  </h4>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Left Column: Slogan & Admin Emails */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-slate-500 dark:text-zinc-400 mb-1.5 font-bold uppercase tracking-wider text-[9px]">Vlastní slogan (tagline)</label>
                        <div className="relative flex items-center">
                          <Type size={14} className="absolute left-3 text-slate-400 dark:text-zinc-500" />
                          <input
                            type="text"
                            value={settingsTagline}
                            onChange={(e) => setSettingsTagline(e.target.value)}
                            className="w-full bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all rounded-xl pl-9 pr-3 py-2 text-xs outline-none shadow-sm"
                            placeholder="např. Volnočasové výtvarné a kreativní ateliéry"
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1.5 block font-medium">
                          Nahradí výchozí slogan na hlavním uvítacím banneru.
                        </span>
                      </div>

                      <div>
                        <label className="block text-slate-500 dark:text-zinc-400 mb-1.5 font-bold uppercase tracking-wider text-[9px]">Emaily administrátorů</label>
                        <div className="relative">
                          <Mail size={14} className="absolute left-3 top-3 text-slate-400 dark:text-zinc-500" />
                          <textarea
                            rows={3}
                            value={settingsAdminEmails}
                            onChange={(e) => setSettingsAdminEmails(e.target.value)}
                            className="w-full bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono outline-none shadow-sm resize-none"
                            placeholder="josef.novak@deepvision.cz, admin@sferapardubice.cz"
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1.5 block font-medium">
                          Seznam emailů oddělených čárkou. Přihlášené administrátorské účty se musí shodovat.
                        </span>
                      </div>

                      <div>
                        <label className="block text-slate-500 dark:text-zinc-400 mb-1.5 font-bold uppercase tracking-wider text-[9px]">Instrukce pro AI (ReKeepera)</label>
                        <div className="relative">
                          <textarea
                            rows={3}
                            value={settingsAiInstructions}
                            onChange={(e) => setSettingsAiInstructions(e.target.value)}
                            className="w-full bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all rounded-xl px-3 py-2.5 text-xs outline-none shadow-sm resize-none"
                            placeholder="Upřesněte kontext, tón a specifická pravidla pro ReKeepera. Např. 'Jsme fotbalový areál s umělou trávou. Máme Celou plochu a dva sektory (Sektor A, Sektor B). Zaměřujeme se na fotbalové pronájmy.'"
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1.5 block font-medium">
                          Pomáhá AI asistentovi přizpůsobit slovní zásobu a chování (např. zda se jedná o fotbal, tenis, masáže atd.).
                        </span>
                      </div>
                    </div>

                    {/* Right Column: Banner Drag Widget */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[9px]">Obrázek banneru portálu</label>
                        {settingsBannerImage && (
                          <span className="text-[9px] bg-tenant-primary/10 border border-tenant-primary/25 text-tenant-primary px-2.5 py-0.5 rounded-full font-bold select-none animate-pulse">
                            Aktivní pozice: {settingsBannerPosition}
                          </span>
                        )}
                      </div>
                      
                      <div 
                        ref={containerRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUpOrLeave}
                        onMouseLeave={handleMouseUpOrLeave}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleMouseUpOrLeave}
                        className={`relative group rounded-2xl overflow-hidden border border-slate-200/50 dark:border-[#1F1F35] h-[166px] select-none ${
                          settingsBannerImage 
                            ? isDragging 
                              ? "cursor-grabbing border-tenant-primary/50" 
                              : "cursor-grab hover:border-slate-350 dark:hover:border-zinc-750" 
                            : ""
                        }`}
                      >
                        <TenantBanner 
                          src={settingsBannerImage} 
                          alt="Banner Preview" 
                          heightClass="h-full"
                          fallbackText={tenant.name || "Tenant Banner"}
                          objectPosition={settingsBannerPosition}
                        />

                        {/* Hover drag overlay helper for discovery */}
                        {settingsBannerImage && !isDragging && (
                          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/10 text-white py-1 px-2.5 rounded-xl text-[9px] font-bold flex items-center gap-1.5 opacity-75 pointer-events-none group-hover:opacity-100 transition-opacity">
                            <Move size={11} />
                            Tažením posunete výřez
                          </div>
                        )}

                        <div className="absolute right-3 bottom-3 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                          <label className="p-2 bg-white/90 dark:bg-[#0D0D15]/90 text-zinc-950 dark:text-zinc-50 backdrop-blur-md border border-white/20 dark:border-[#1F1F35] rounded-xl cursor-pointer shadow-md text-[11px] font-bold flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all">
                            <Upload size={14} />
                            {imageUploading ? "Nahrávání..." : settingsBannerImage ? "Změnit banner" : "Nahrát obrázek"}
                            <input 
                              type="file" 
                              accept="image/*" 
                              disabled={imageUploading}
                              onChange={handleImageUpload} 
                              className="hidden" 
                            />
                          </label>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground block font-medium">
                        Nahrajte obrázek banneru (PNG/JPG). Kliknutím a tažením přímo na obrázku výše nastavíte jeho pozici.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Save button - Outside Card at bottom */}
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="bg-tenant-gradient hover:opacity-95 active:scale-95 transition-all text-white text-xs py-2.5 px-5 rounded-xl font-bold shadow-md shadow-tenant-primary/15 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Save size={14} />
                    {isSavingSettings ? "Ukládání..." : "Uložit nastavení portálu"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 7: OPERATING HOURS */}
          {activeTab === "operating" && (
            <div className="space-y-6">
              {/* Tab Header - Outside Card */}
              <div>
                <h3 className="text-sm font-bold text-foreground">Provozní doba a kalendářní omezení</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Konfigurujte provozní dobu a časové rozmezí kalendáře pro zákazníky.</p>
              </div>

              <form onSubmit={handleSettingsSubmit} className="space-y-6 text-xs">
                {/* CARD 2: Provozní doba */}
                <div className="p-6 bg-white/45 dark:bg-[#0D0D15]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-3xl shadow-sm hover:border-tenant-primary/10 transition-all duration-300 space-y-5">
                  <h4 className="text-xs font-bold text-tenant-primary uppercase tracking-wider flex items-center gap-1.5 select-none">
                    <Clock size={14} />
                    Provozní doba a kalendářní omezení
                  </h4>
                  
                  {/* Top operational row: Display range next to presets bar */}
                  <div className="grid lg:grid-cols-3 gap-6">
                    {/* Left Column (1/3): Calendar View Range */}
                    <div className="p-5 bg-white/60 dark:bg-[#0D0D15]/20 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-3xl space-y-4 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar size={13} className="text-tenant-primary" />
                          <span className="text-[10px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Rozsah kalendáře</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-slate-500 dark:text-zinc-400 mb-1.5 font-bold uppercase tracking-wider text-[9px]">Čas zahájení</label>
                            <div className="relative flex items-center">
                              <Clock size={11} className="absolute left-2.5 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setActiveTimePicker({
                                    id: "settingsOpenTime",
                                    rect,
                                    value: settingsOpenTime,
                                    onChange: (val) => setSettingsOpenTime(val)
                                  });
                                }}
                                className="w-full bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] transition-all rounded-xl pl-7 pr-6 py-1.5 text-center font-mono text-xs outline-none shadow-sm cursor-pointer flex items-center justify-center text-slate-800 dark:text-slate-200 font-medium hover:bg-white/80 dark:hover:bg-[#1B1B2B]/75"
                              >
                                {settingsOpenTime}
                                <ChevronDown size={10} className="absolute right-2 text-slate-405 dark:text-zinc-500 pointer-events-none" />
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-slate-500 dark:text-zinc-400 mb-1.5 font-bold uppercase tracking-wider text-[9px]">Čas ukončení</label>
                            <div className="relative flex items-center">
                              <Clock size={11} className="absolute left-2.5 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setActiveTimePicker({
                                    id: "settingsCloseTime",
                                    rect,
                                    value: settingsCloseTime,
                                    onChange: (val) => setSettingsCloseTime(val)
                                  });
                                }}
                                className="w-full bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] transition-all rounded-xl pl-7 pr-6 py-1.5 text-center font-mono text-xs outline-none shadow-sm cursor-pointer flex items-center justify-center text-slate-800 dark:text-slate-200 font-medium hover:bg-white/80 dark:hover:bg-[#1B1B2B]/75"
                              >
                                {settingsCloseTime}
                                <ChevronDown size={10} className="absolute right-2 text-slate-405 dark:text-zinc-500 pointer-events-none" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground block font-medium leading-relaxed mt-2">
                        Určuje výchozí zobrazené rozmezí v klientském kalendáři.
                      </span>
                    </div>

                    {/* Right Columns (2/3): Presets Bar */}
                    <div className="lg:col-span-2 p-5 bg-white/60 dark:bg-[#0D0D15]/20 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-3xl space-y-4 shadow-sm hover:border-tenant-primary/10 transition-all duration-300">
                      <div className="flex items-center gap-2">
                        <Settings size={13} className="text-tenant-primary" />
                        <span className="text-[10px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Hromadné nastavení provozní doby</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-5 text-xs">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-350">
                          <span className="font-semibold text-[11px]">Otevřít od:</span>
                          <div className="relative flex items-center w-24">
                            <Clock size={11} className="absolute left-2.5 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActiveTimePicker({
                                  id: "presetOpenTime",
                                  rect,
                                  value: presetOpenTime,
                                  onChange: (val) => setPresetOpenTime(val)
                                });
                              }}
                              className="w-full bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] transition-all rounded-xl pl-7 pr-6 py-1.5 text-center font-mono text-foreground outline-none shadow-sm cursor-pointer flex items-center justify-center font-medium hover:bg-white/80 dark:hover:bg-[#1B1B2B]/75 text-xs text-slate-800 dark:text-slate-200"
                            >
                              {presetOpenTime}
                              <ChevronDown size={10} className="absolute right-2 text-slate-405 dark:text-zinc-500 pointer-events-none" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-350">
                          <span className="font-semibold text-[11px]">Zavřít do:</span>
                          <div className="relative flex items-center w-24">
                            <Clock size={11} className="absolute left-2.5 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActiveTimePicker({
                                  id: "presetCloseTime",
                                  rect,
                                  value: presetCloseTime,
                                  onChange: (val) => setPresetCloseTime(val)
                                });
                              }}
                              className="w-full bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] transition-all rounded-xl pl-7 pr-6 py-1.5 text-center font-mono text-foreground outline-none shadow-sm cursor-pointer flex items-center justify-center font-medium hover:bg-white/80 dark:hover:bg-[#1B1B2B]/75 text-xs text-slate-800 dark:text-slate-200"
                            >
                              {presetCloseTime}
                              <ChevronDown size={10} className="absolute right-2 text-slate-405 dark:text-zinc-500 pointer-events-none" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center select-none">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              id="preset-closed" 
                              checked={presetClosed}
                              onChange={(e) => setPresetClosed(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 dark:bg-[#1f1f35] rounded-full peer peer-checked:bg-red-500/10 peer-checked:border-red-500/20 border border-slate-300/40 dark:border-[#2A2A40] after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-slate-400 dark:after:bg-zinc-400 peer-checked:after:bg-red-500 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:after:translate-x-4"></div>
                            <span className={`ml-2 text-[10px] font-bold tracking-wide transition-colors ${presetClosed ? "text-red-500" : "text-slate-500 dark:text-zinc-400"}`}>
                              {presetClosed ? "HROMADNĚ ZAVŘENO" : "HROMADNĚ OTEVŘENO"}
                            </span>
                          </label>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => applyPresetToDays([1, 2, 3, 4, 5, 6, 0])}
                          className="px-3 py-1.5 text-[10px] font-bold rounded-xl bg-white/65 dark:bg-[#131322]/65 hover:bg-tenant-primary hover:text-white dark:hover:bg-tenant-primary border border-slate-200/50 dark:border-[#1F1F35] text-slate-700 dark:text-zinc-300 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                        >
                          <Calendar size={12} />
                          Použít pro každý den
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPresetToDays([1, 2, 3, 4, 5])}
                          className="px-3 py-1.5 text-[10px] font-bold rounded-xl bg-white/65 dark:bg-[#131322]/65 hover:bg-tenant-primary hover:text-white dark:hover:bg-tenant-primary border border-slate-200/50 dark:border-[#1F1F35] text-slate-700 dark:text-zinc-300 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                        >
                          <List size={12} />
                          Použít pro všední dny
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPresetToDays([6, 0])}
                          className="px-3 py-1.5 text-[10px] font-bold rounded-xl bg-white/65 dark:bg-[#131322]/65 hover:bg-tenant-primary hover:text-white dark:hover:bg-tenant-primary border border-slate-200/50 dark:border-[#1F1F35] text-slate-700 dark:text-zinc-300 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                        >
                          <Users size={12} />
                          Použít pro víkendy
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Opening hours table */}
                  <div className="overflow-hidden border border-slate-200/50 dark:border-[#1F1F35] rounded-3xl bg-white/45 dark:bg-[#0D0D15]/40 backdrop-blur-xl shadow-sm">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-white/40 dark:bg-[#0D0D15]/40 text-slate-500 dark:text-zinc-400 font-bold border-b border-slate-200/40 dark:border-[#1F1F35]/40 uppercase tracking-wider text-[9px]">
                          <th className="py-4 px-5 font-bold">Den</th>
                          <th className="py-4 px-5 font-bold">Čas otevření (HH:MM)</th>
                          <th className="py-4 px-5 font-bold">Čas zavření (HH:MM)</th>
                          <th className="py-4 px-5 font-bold text-right">Zavřeno</th>
                        </tr>
                      </thead>
                      <tbody>
                        {settingsOpeningHours.map((day, idx) => (
                          <tr key={day.dayOfWeek} className={`border-b border-slate-100/50 dark:border-[#1F1F35]/10 transition-all ${day.closed ? "opacity-45 bg-slate-50/5 dark:bg-black/5" : "hover:bg-tenant-primary/5 dark:hover:bg-tenant-primary/10"}`}>
                            <td className="py-4 px-5 font-bold text-foreground">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-bold bg-slate-100 dark:bg-[#131322]/80 border border-slate-200/40 dark:border-[#1F1F35] text-slate-700 dark:text-zinc-300 select-none">
                                <span className={`h-1.5 w-1.5 rounded-full ${day.closed ? "bg-red-500" : "bg-emerald-500 animate-pulse"}`} />
                                {day.name}
                              </span>
                            </td>
                            <td className="py-4 px-5">
                              <div className="relative flex items-center w-24">
                                <Clock size={11} className={`absolute left-2.5 transition-colors ${day.closed ? "text-slate-300 dark:text-zinc-700" : "text-slate-400 dark:text-zinc-500"}`} />
                                <button
                                  type="button"
                                  disabled={day.closed}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setActiveTimePicker({
                                      id: `day-${idx}-openTime`,
                                      rect,
                                      value: day.openTime,
                                      onChange: (val) => {
                                        const updated = [...settingsOpeningHours];
                                        updated[idx].openTime = val;
                                        setSettingsOpeningHours(updated);
                                      }
                                    });
                                  }}
                                  className="w-full bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] rounded-xl pl-7 pr-6 py-1.5 text-center font-mono disabled:opacity-30 text-foreground outline-none transition-all shadow-sm cursor-pointer flex items-center justify-center font-medium hover:bg-white/80 dark:hover:bg-[#1B1B2B]/75 text-xs disabled:pointer-events-none text-slate-800 dark:text-slate-200"
                                >
                                  {day.openTime}
                                  <ChevronDown size={10} className="absolute right-2 text-slate-405 dark:text-zinc-500 pointer-events-none" />
                                </button>
                              </div>
                            </td>
                            <td className="py-4 px-5">
                              <div className="relative flex items-center w-24">
                                <Clock size={11} className={`absolute left-2.5 transition-colors pointer-events-none ${day.closed ? "text-slate-300 dark:text-zinc-700" : "text-slate-400 dark:text-zinc-500"}`} />
                                <button
                                  type="button"
                                  disabled={day.closed}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setActiveTimePicker({
                                      id: `day-${idx}-closeTime`,
                                      rect,
                                      value: day.closeTime,
                                      onChange: (val) => {
                                        const updated = [...settingsOpeningHours];
                                        updated[idx].closeTime = val;
                                        setSettingsOpeningHours(updated);
                                      }
                                    });
                                  }}
                                  className="w-full bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] rounded-xl pl-7 pr-6 py-1.5 text-center font-mono disabled:opacity-30 text-foreground outline-none transition-all shadow-sm cursor-pointer flex items-center justify-center font-medium hover:bg-white/80 dark:hover:bg-[#1B1B2B]/75 text-xs disabled:pointer-events-none text-slate-800 dark:text-slate-200"
                                >
                                  {day.closeTime}
                                  <ChevronDown size={10} className="absolute right-2 text-slate-405 dark:text-zinc-500 pointer-events-none" />
                                </button>
                              </div>
                            </td>
                            <td className="py-4 px-5 text-right">
                              <div className="flex items-center justify-end select-none">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={day.closed}
                                    onChange={(e) => {
                                      const updated = [...settingsOpeningHours];
                                      updated[idx].closed = e.target.checked;
                                      setSettingsOpeningHours(updated);
                                    }}
                                    className="sr-only peer"
                                  />
                                  <div className="w-9 h-5 bg-slate-200 dark:bg-[#1f1f35] rounded-full peer peer-checked:bg-red-500/10 peer-checked:border-red-500/20 border border-slate-300/40 dark:border-[#2A2A40] after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-slate-400 dark:after:bg-zinc-400 peer-checked:after:bg-red-500 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:after:translate-x-4"></div>
                                  <span className={`ml-2 text-[10px] font-bold tracking-wide transition-colors ${day.closed ? "text-red-500" : "text-emerald-500"}`}>
                                    {day.closed ? "ZAVŘENO" : "OTEVŘENO"}
                                  </span>
                                </label>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Save button - Outside Card at bottom */}
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="bg-tenant-gradient hover:opacity-95 active:scale-95 transition-all text-white text-xs py-2.5 px-5 rounded-xl font-bold shadow-md shadow-tenant-primary/15 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Save size={14} />
                    {isSavingSettings ? "Ukládání..." : "Uložit provozní dobu"}
                  </button>
                </div>
              </form>
            </div>
          )}

        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/40 dark:border-[#1F1F35]/40 py-12 text-slate-500 dark:text-zinc-400 text-xs bg-white/10 dark:bg-[#07070C]/20 transition-colors backdrop-blur-md mt-12 w-full select-none">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center justify-center text-center gap-5">
          {/* Brand/logo badge */}
          <div className="flex items-center gap-2">
            <span className="font-extrabold tracking-tight text-slate-800 dark:text-slate-200 text-sm">
              Re<span className="text-tenant-primary">Sys</span>
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981] animate-pulse" title="Všechny systémy funkční" />
            <span className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest pl-1">Administrace</span>
          </div>
          
          <div className="flex flex-col items-center gap-1.5 text-slate-500 dark:text-zinc-400">
            <p className="max-w-md leading-relaxed">
              Tento administrační portál využívá systém <span className="font-medium text-slate-700 dark:text-zinc-350">ReSys</span> pro správu ploch, lekcí a rezervací.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500">
              Všechna administrativní data jsou chráněna a šifrována. Zabezpečené přihlášení přes SSO.
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
          
          <p className="text-[10px] text-slate-400 dark:text-zinc-650 mt-2">
            © {new Date().getFullYear()} ReSys. Všechna práva vyhrazena.
          </p>
        </div>
      </footer>

      {/* --- MODAL DIALOGS --- */}

      {/* 1. Resource CRUD Modal */}
      {resourceModal.open && (
        <div className="fixed inset-0 bg-[#07070C]/60 dark:bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in duration-200">
          <div className="bg-white/95 dark:bg-[#0D0D15]/90 backdrop-blur-2xl border border-slate-200/60 dark:border-[#1F1F35] max-w-xl w-full max-h-[90vh] overflow-y-auto p-7 rounded-[2rem] shadow-[0_20px_50px_rgba(112,0,255,0.12)] relative transition-all duration-300 text-left text-xs">
            <button
              type="button"
              onClick={() => setResourceModal({ ...resourceModal, open: false })}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 transition-all p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X size={16} />
            </button>
            <h3 className="text-xl font-bold bg-gradient-to-r from-tenant-primary via-indigo-500 to-[#3B82F6] bg-clip-text text-transparent mb-1 font-sans select-none">
              {resourceModal.mode === "add" ? "Vytvořit zdroj" : "Upravit detaily zdroje"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              {resourceModal.mode === "add" ? "Nakonfigurujte vlastnosti nového zdroje níže:" : "Upravte parametry zdroje níže:"}
            </p>
            <form onSubmit={handleResourceSubmit} className="space-y-6 text-xs">
              <div className="bg-slate-50/50 dark:bg-[#151522]/45 backdrop-blur-md p-5 rounded-3xl border border-slate-200/60 dark:border-[#2A2A40] space-y-4 mb-2">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold border-b border-slate-200/40 dark:border-zinc-800/50 pb-2 mb-2 flex items-center gap-1.5 font-sans tracking-wider">
                  <Building size={14} className="text-tenant-primary dark:text-[#A78BFA]" />
                  Parametry rezervovatelného zdroje
                </p>

                <div>
                  <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Název zdroje</label>
                  <input
                    type="text"
                    required
                    value={resourceModal.data.name}
                    onChange={(e) => setResourceModal({
                      ...resourceModal,
                      data: { ...resourceModal.data, name: e.target.value }
                    })}
                    className="w-full text-xs py-2.5 px-3.5 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-xl outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-medium"
                    placeholder="např. Laboratoř biologie"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Typ zdroje</label>
                  <select
                    value={resourceModal.data.type}
                    onChange={(e) => setResourceModal({
                      ...resourceModal,
                      data: { ...resourceModal.data, type: e.target.value }
                    })}
                    className="w-full text-xs py-2.5 px-3.5 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-xl outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-medium"
                  >
                    <option value="SPACE">PROSTOR (Sportoviště / Hřiště / Místnost)</option>
                    <option value="SEAT">MÍSTO (Sedadlo / Konkrétní místo)</option>
                    <option value="COURSE_PROGRAM">PROGRAM (Pravidelná lekce / Kurz)</option>
                  </select>
                  <details className="group mt-2">
                    <summary className="cursor-pointer text-[10px] text-tenant-primary font-semibold select-none flex items-center gap-1 group-open:mb-2 hover:underline">
                      <span>Zobrazit nápovědu k typům plochy</span>
                    </summary>
                    <div className="p-3 bg-white/20 dark:bg-[#151522]/30 rounded-xl border border-slate-200/45 dark:border-[#1F1F35]/45 text-[11px] leading-relaxed text-slate-500 dark:text-zinc-400 space-y-2 select-none">
                      <span className="font-bold text-foreground block">Jak se typ SPACE zobrazuje na veřejném webu?</span>
                      <span>
                        V areálu typu <strong>Sports Ground</strong> se typ <strong>SPACE</strong> na veřejných kartách zobrazuje jako štítek určující typ plochy.
                      </span>
                      <div className="space-y-1 pt-1">
                        <span className="font-semibold text-foreground block">Výchozí nastavení (Možnost 1 - Velikost plochy):</span>
                        <ul className="list-disc list-inside space-y-0.5 pl-1">
                          <li><strong>Celé hřiště</strong> (pokud nemá nadřazené hřiště).</li>
                          <li><strong>Polovina hřiště</strong> (pokud má nastavený nadřazený prvek nebo obsahuje v názvu &bdquo;1/2&ldquo; či &bdquo;sektor&ldquo;).</li>
                        </ul>
                      </div>
                      <div className="space-y-1.5 pt-1">
                        <span className="font-semibold text-foreground block">Další možnosti přizpůsobení (úpravou ve funkci <code className="bg-white/30 dark:bg-[#151522]/50 px-1 rounded text-tenant-primary font-mono text-[10px]">getResourceTypeName</code> v souboru <code className="bg-white/30 dark:bg-[#151522]/50 px-1 rounded text-foreground font-mono text-[10px]">page.tsx</code>):</span>
                        <ol className="list-decimal list-inside space-y-1 pl-1">
                          <li>
                            <strong>Možnost 2 (Formát hry):</strong> Např. <em>&bdquo;Fotbal 11v11&ldquo;</em> pro celou plochu a <em>&bdquo;Malý fotbal (5v5 / 7v7)&ldquo;</em> pro sektory. Vhodné pro rychlé pochopení velikosti týmu.
                          </li>
                          <li>
                            <strong>Možnost 3 (Typ pronájmu/použití):</strong> Např. <em>&bdquo;Jednorázový pronájem&ldquo;</em>, <em>&bdquo;Dlouhodobý trénink&ldquo;</em> nebo <em>&bdquo;Turnajový slot&ldquo;</em>. Vhodné, pokud nabízíte různé obchodní modely.
                          </li>
                          <li>
                            <strong>Možnost 4 (Konkrétní typ sportoviště):</strong> Např. <em>&bdquo;Fotbalové hřiště&ldquo;</em>, <em>&bdquo;Tenisový kurt&ldquo;</em>, <em>&bdquo;Beachvolejbal&ldquo;</em> nebo <em>&bdquo;Dráha&ldquo;</em>. Užitečné pro multi-sportovní areály.
                          </li>
                          <li>
                            <strong>Možnost 5 (Účel plochy):</strong> Např. <em>&bdquo;Zápasová plocha&ldquo;</em> (s osvětlením a pevnými brankami) vs. <em>&bdquo;Tréninková plocha&ldquo;</em> (s přenosnými brankami).
                          </li>
                          <li>
                            <strong>Možnost 6 (Úplné skrytí):</strong> Štítek typu lze v souboru <code className="bg-white/30 dark:bg-[#151522]/50 px-1 rounded text-foreground font-mono text-[10px]">page.tsx</code> zcela smazat, pokud jsou názvy ploch samy o sobě dostatečně popisné.
                          </li>
                        </ol>
                      </div>
                    </div>
                  </details>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Maximální kapacita</label>
                  <input
                    type="number"
                    required
                    value={resourceModal.data.maxCapacity}
                    onChange={(e) => setResourceModal({
                      ...resourceModal,
                      data: { ...resourceModal.data, maxCapacity: parseInt(e.target.value, 10) || 0 }
                    })}
                    className="w-full text-xs py-2.5 px-3.5 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-xl outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Cena (Kč / hodina nebo za lekci)</label>
                  <input
                    type="text"
                    value={resourceModal.data.price}
                    onChange={(e) => setResourceModal({
                      ...resourceModal,
                      data: { ...resourceModal.data, price: e.target.value }
                    })}
                    className="w-full text-xs py-2.5 px-3.5 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-xl outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-medium"
                    placeholder="např. 500 nebo Dle dohody"
                  />
                </div>

                {/* Conditionally display attributes depending on SPACE vs COURSE_PROGRAM */}
                {(resourceModal.data.type === "SPACE" || resourceModal.data.type === "SEAT") ? (
                  <>
                    <div>
                      <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Povrch</label>
                      <input
                        type="text"
                        value={resourceModal.data.surface}
                        onChange={(e) => setResourceModal({
                          ...resourceModal,
                          data: { ...resourceModal.data, surface: e.target.value }
                        })}
                        className="w-full text-xs py-2.5 px-3.5 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-xl outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-medium"
                        placeholder="např. Umělá tráva 3. generace"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Vybavení</label>
                      <input
                        type="text"
                        value={resourceModal.data.equipment}
                        onChange={(e) => setResourceModal({
                          ...resourceModal,
                          data: { ...resourceModal.data, equipment: e.target.value }
                        })}
                        className="w-full text-xs py-2.5 px-3.5 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-xl outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-medium"
                        placeholder="např. Přenosné branky"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Lektor / Instruktor</label>
                      <input
                        type="text"
                        value={resourceModal.data.instructor}
                        onChange={(e) => setResourceModal({
                          ...resourceModal,
                          data: { ...resourceModal.data, instructor: e.target.value }
                        })}
                        className="w-full text-xs py-2.5 px-3.5 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-xl outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-medium"
                        placeholder="např. RNDr. Pavel Černý"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Místnost</label>
                      <input
                        type="text"
                        value={resourceModal.data.room}
                        onChange={(e) => setResourceModal({
                          ...resourceModal,
                          data: { ...resourceModal.data, room: e.target.value }
                        })}
                        className="w-full text-xs py-2.5 px-3.5 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-xl outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-medium"
                        placeholder="např. Učebna C"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Nadřazená oblast / Hřiště (Nadřazený prvek)</label>
                  <select
                    value={resourceModal.data.parentId}
                    onChange={(e) => setResourceModal({
                      ...resourceModal,
                      data: { ...resourceModal.data, parentId: e.target.value }
                    })}
                    className="w-full text-xs py-2.5 px-3.5 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-xl outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-medium"
                  >
                    <option value="">Žádný (Nadřazený prvek)</option>
                    {resources
                      .filter((r) => r.id !== resourceModal.data.id)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResourceModal({ ...resourceModal, open: false })}
                  className="py-3 px-4 rounded-2xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-[#151522]/55 dark:hover:bg-[#1C1C30]/55 text-slate-700 dark:text-slate-350 border border-slate-200/40 dark:border-[#2A2A40] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex-1 text-center cursor-pointer"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="py-3 px-4 rounded-2xl bg-tenant-gradient hover:opacity-95 active:scale-[0.98] transition-all text-white text-xs font-bold flex-1 text-center cursor-pointer shadow-md shadow-tenant-primary/15"
                >
                  Uložit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* 3. IoT Device Register Modal */}
      {deviceModal.open && (
        <div className="fixed inset-0 bg-[#07070C]/60 dark:bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in duration-200">
          <div className="bg-white/95 dark:bg-[#0D0D15]/90 backdrop-blur-2xl border border-slate-200/60 dark:border-[#1F1F35] max-w-xl w-full max-h-[90vh] overflow-y-auto p-7 rounded-[2rem] shadow-[0_20px_50px_rgba(112,0,255,0.12)] relative transition-all duration-300 text-left text-xs">
            <button
              type="button"
              onClick={() => setDeviceModal({ ...deviceModal, open: false })}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 transition-all p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X size={16} />
            </button>
            <h3 className="text-xl font-bold bg-gradient-to-r from-tenant-primary via-indigo-500 to-[#3B82F6] bg-clip-text text-transparent mb-1 font-sans select-none">
              {deviceModal.mode === "add" ? "Registrovat zařízení" : "Upravit parametry zařízení"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              {deviceModal.mode === "add" ? "Zadejte parametry nového přístupového IoT terminálu:" : "Upravte konfiguraci zařízení níže:"}
            </p>
            <form onSubmit={handleDeviceSubmit} className="space-y-6 text-xs">
              <div className="bg-slate-50/50 dark:bg-[#151522]/45 backdrop-blur-md p-5 rounded-3xl border border-slate-200/60 dark:border-[#2A2A40] space-y-4 mb-2">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold border-b border-slate-200/40 dark:border-zinc-800/50 pb-2 mb-2 flex items-center gap-1.5 font-sans tracking-wider">
                  <Smartphone size={14} className="text-tenant-primary dark:text-[#A78BFA]" />
                  Parametry přístupového zařízení
                </p>

                {deviceModal.mode === "add" && (
                  <div>
                    <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Unikátní ID čtečky (hardwarový klíč)</label>
                    <input
                      type="text"
                      required
                      value={deviceModal.data.id}
                      onChange={(e) => setDeviceModal({
                        ...deviceModal,
                        data: { ...deviceModal.data, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }
                      })}
                      className="w-full text-xs py-2.5 px-3.5 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-xl outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-mono font-semibold"
                      placeholder="např. brana_zapad_01"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Název čtečky (umístění)</label>
                  <input
                    type="text"
                    required
                    value={deviceModal.data.name}
                    onChange={(e) => setDeviceModal({
                      ...deviceModal,
                      data: { ...deviceModal.data, name: e.target.value }
                    })}
                    className="w-full text-xs py-2.5 px-3.5 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-xl outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-medium"
                    placeholder="např. Hlavní vstupní turniket"
                  />
                </div>

                {deviceModal.mode === "add" && (
                  <div>
                    <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Tajný API přístupový token (prostý text)</label>
                    <input
                      type="text"
                      required
                      value={deviceModal.data.token}
                      onChange={(e) => setDeviceModal({
                        ...deviceModal,
                        data: { ...deviceModal.data, token: e.target.value }
                      })}
                      className="w-full text-xs py-2.5 px-3.5 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-xl outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-mono font-semibold"
                      placeholder="Zadejte tajný token pro ověřování zařízení"
                    />
                    <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1.5 font-medium leading-relaxed">
                      Tento token se v databázi ukládá jako hash (SHA-256) a nelze jej zpětně obnovit ani zobrazit.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between py-1 border-t border-slate-200/40 dark:border-[#2A2A40]/30 mt-3 pt-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Aktivní stav zařízení</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Povolit skenování a ověřování vstupenek</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="dev-active"
                      checked={deviceModal.data.active}
                      onChange={(e) => setDeviceModal({
                        ...deviceModal,
                        data: { ...deviceModal.data, active: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:border-slate-650 peer-checked:bg-tenant-primary"></div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeviceModal({ ...deviceModal, open: false })}
                  className="py-3 px-4 rounded-2xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-[#151522]/55 dark:hover:bg-[#1C1C30]/55 text-slate-700 dark:text-slate-350 border border-slate-200/40 dark:border-[#2A2A40] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex-1 text-center cursor-pointer"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="py-3 px-4 rounded-2xl bg-tenant-gradient hover:opacity-95 active:scale-[0.98] transition-all text-white text-xs font-bold flex-1 text-center cursor-pointer shadow-md shadow-tenant-primary/15"
                >
                  Uložit zařízení
                </button>
              </div>
            </form>
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

      <AdminAIAssistant
        tenantId={tenant.id}
        resources={resources}
        bookings={bookings}
        devices={devices}
        checkinLogs={checkinLogs}
        activeTab={activeTab}
        activeDate={activeDate}
        weekStart={weekStart}
        tenantName={tenant.name}
        tenantVertical={tenant.vertical}
        tenantTagline={tenant.attributes?.tagline || ""}
        tenantAiInstructions={settingsAiInstructions}
        settingsForm={{
          tagline: settingsTagline,
          openTime: settingsOpenTime,
          closeTime: settingsCloseTime,
          openingHours: settingsOpeningHours,
          adminEmails: settingsAdminEmails
        }}
      />

      {activeTimePicker && (
        <TimePickerDropdown 
          picker={activeTimePicker} 
          onClose={() => setActiveTimePicker(null)} 
        />
      )}

    </div>
  );
}

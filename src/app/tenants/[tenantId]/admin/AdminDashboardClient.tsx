"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Building, Calendar, Clock, QrCode, ClipboardList, 
  Plus, Edit, Trash, Settings, ChevronDown,
  ArrowLeft, Smartphone, Activity,
  Upload, Eye, List, Move,
  Users, Layers, Wrench, CreditCard, MapPin, User,
  Type, Mail, Save, X, Sparkles, Coins, Camera, ShieldAlert, Menu,
  Check, Loader2, Terminal, HelpCircle
} from "lucide-react";
import jsQR from "jsqr";
import { getTenantTheme } from "@/lib/tenantThemes";
import ThemeToggle from "@/components/ThemeToggle";
import CalendarView, { CalendarEvent, UnifiedSwitcher } from "@/components/CalendarView";
import ConfirmDialog from "@/components/ConfirmDialog";
import AlertDialog from "@/components/AlertDialog";
import SystemUpdatesList from "@/components/SystemUpdatesList";
import TenantBanner from "@/components/TenantBanner";
import ResourceCard from "@/components/ResourceCard";
import { useSession } from "next-auth/react";
import LogoutButton from "@/components/LogoutButton";
import AdminAIAssistant from "@/components/AdminAIAssistant";
import AdminOnboardingWizard from "@/components/AdminOnboardingWizard";
import BillingTab from "./BillingTab";
import MobileCheckinScanner from "./MobileCheckinScanner";
import DatePicker from "@/components/DatePicker";


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

interface EquipmentConfig {
  id: string;
  name: string;
  category: "default" | "extra";
  price?: number;
  cooldownMinutes?: number;
  quantity: number;
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
    equipmentList?: EquipmentConfig[];
    parentId?: string;
    price?: string;
    openTime?: string;
    closeTime?: string;
    openingHours?: OpeningHoursDay[];
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
  price: string;
  partnerId: string | null;
  partnerName: string | null;
  invoiceId: string | null;
  createdAt: string;
  recurrenceGroup?: string | null;
  rentedEquipment?: any;
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

interface Partner {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  companyId: string | null;
  vatId: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressZip: string | null;
  addressCountry: string | null;
  discount: number;
  active: boolean;
}

interface Invoice {
  id: string;
  number: string;
  status: string;
  issueDate: string;
  dueDate: string;
  amount: string;
  partnerName: string;
  partnerEmail?: string;
  partnerId: string;
  bookingsCount: number;
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
      onboardingCompleted?: boolean;
      location?: string;
      dynamicQrEnabled?: boolean;
    };
    subscriptionPlan?: string;
    subscriptionStatus?: string;
    maxResourcesLimit?: number;
    maxDevicesLimit?: number;
    trialEndsAt?: string | null;
  };
  resources: Resource[];
  bookings: Booking[];
  devices: Device[];
  checkinLogs: CheckinLog[];
  partners?: Partner[];
  invoices?: Invoice[];
  users?: any[];
  exceptions?: any[];
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
  minTime?: string;
  maxTime?: string;
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
          position: "fixed",
          top: `${picker.rect.bottom}px`,
          left: `${picker.rect.left}px`,
          width: `${picker.rect.width}px`,
        }}
        className="z-55 mt-1 bg-white/95 dark:bg-[#0D0D15]/95 backdrop-blur-xl border border-slate-200/60 dark:border-[#2A2A40] rounded-none shadow-xl overflow-hidden max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150 font-mono text-xs"
      >
        {getTimeOptions(picker.value)
          .filter((t) => {
            if (picker.minTime && t <= picker.minTime) return false;
            if (picker.maxTime && t >= picker.maxTime) return false;
            return true;
          })
          .map((t) => {
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
                    ? "bg-tenant-primary/10 text-tenant-primary dark:text-[#A78BFA] font-semibold"
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
  partners = [],
  invoices = [],
  users = [],
  exceptions = [],
  activeDate,
  weekStart
}: AdminDashboardClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const theme = getTenantTheme(tenant.id, tenant.vertical, tenant.name);

  // Schedule exceptions states
  const [exceptionsList, setExceptionsList] = useState<any[]>(exceptions);
  const [newExceptionName, setNewExceptionName] = useState("");
  const [newExceptionResourceId, setNewExceptionResourceId] = useState("global");
  const [newExceptionDateFrom, setNewExceptionDateFrom] = useState("");
  const [newExceptionTimeFrom, setNewExceptionTimeFrom] = useState("00:00");
  const [newExceptionDateTo, setNewExceptionDateTo] = useState("");
  const [newExceptionTimeTo, setNewExceptionTimeTo] = useState("23:59");
  const [isSavingException, setIsSavingException] = useState(false);
  const [isExceptionResourceDropdownOpen, setIsExceptionResourceDropdownOpen] = useState(false);
  const exceptionResourceDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exceptionResourceDropdownRef.current && !exceptionResourceDropdownRef.current.contains(event.target as Node)) {
        setIsExceptionResourceDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExceptionUpsert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExceptionName.trim() || !newExceptionDateFrom || !newExceptionDateTo) {
      setNotification({
        type: "error",
        title: "Chyba",
        message: "Vyplňte prosím název a termín výjimky.",
      });
      return;
    }
    setIsSavingException(true);
    try {
      const dateFromVal = new Date(`${newExceptionDateFrom}T${newExceptionTimeFrom}:00.000Z`).toISOString();
      const dateToVal = new Date(`${newExceptionDateTo}T${newExceptionTimeTo}:00.000Z`).toISOString();

      const dataToSend = {
        tenantId: tenant.id,
        resourceId: newExceptionResourceId === "global" ? null : newExceptionResourceId,
        name: newExceptionName,
        dateFrom: dateFromVal,
        dateTo: dateToVal,
      };

      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "exception_upsert", data: dataToSend })
      });
      if (!res.ok) throw new Error("Chyba při ukládání výjimky.");

      const data = await res.json();
      const newExc = {
        id: data.exception.id,
        name: data.exception.name,
        resourceId: data.exception.resourceId,
        resourceName: resources.find(r => r.id === data.exception.resourceId)?.name || "Celý areál",
        dateFrom: data.exception.dateFrom,
        dateTo: data.exception.dateTo,
      };

      setExceptionsList(prev => [...prev, newExc]);
      setNewExceptionName("");
      setNewExceptionResourceId("global");
      setNewExceptionDateFrom("");
      setNewExceptionTimeFrom("00:00");
      setNewExceptionDateTo("");
      setNewExceptionTimeTo("23:59");

      setNotification({
        type: "success",
        title: "Výjimka uložena",
        message: "Mimořádná uzavírka byla úspěšně uložena!",
      });
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: "error",
        title: "Chyba",
        message: err.message || "Nepodařilo se uložit výjimku.",
      });
    } finally {
      setIsSavingException(false);
    }
  };

  const handleExceptionDelete = async (id: string) => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "exception_delete", data: { id } })
      });
      if (!res.ok) throw new Error("Chyba při mazání výjimky.");

      setExceptionsList(prev => prev.filter(exc => exc.id !== id));
      setNotification({
        type: "success",
        title: "Výjimka smazána",
        message: "Mimořádná uzavírka byla úspěšně odstraněna.",
      });
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: "error",
        title: "Chyba",
        message: err.message || "Nepodařilo se smazat výjimku.",
      });
    }
  };

  const [activeTab, setActiveTab] = useState<"overview" | "resources" | "rules" | "bookings" | "devices" | "settings" | "operating" | "billing" | "subscription" | "updates">("overview");
  const [bookingsSubTab, setBookingsSubTab] = useState<"calendar" | "list">("calendar");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const czechTabNames = {
    overview: "Přehled a logy",
    resources: "Správa zdrojů",
    operating: "Provozní doba",
    bookings: "Rezervace",
    devices: "Čtečky a brány",
    billing: "Lidé a fakturace",
    subscription: "Předplatné",
    settings: "Nastavení portálu",
    rules: "Pravidla",
    updates: "Systémové aktualizace"
  } as const;

  const navItems = [
    { value: "overview", label: "Přehled a logy", icon: Building },
    { value: "resources", label: "Správa zdrojů", icon: ClipboardList },
    { value: "operating", label: "Provozní doba", icon: Clock },
    { value: "bookings", label: "Rezervace", icon: Calendar },
    { value: "devices", label: "Čtečky a brány", icon: QrCode },
    { value: "billing", label: "Lidé a fakturace", icon: Users },
    { value: "subscription", label: "Předplatné", icon: CreditCard },
    { value: "updates", label: "Systémové aktualizace", icon: Terminal },
    { value: "settings", label: "Nastavení portálu", icon: Settings },
  ] as const;

  // RBAC receptionist check
  const isReceptionist = (session?.user as any)?.role === "RECEPTIONIST";

  // IoT Gate Pairing state
  const [newDevicePairName, setNewDevicePairName] = useState("");
  const [pairingState, setPairingState] = useState<{ code: string; name: string } | null>(null);

  // Local tenant copy for live reactive updates
  const [localTenant, setLocalTenant] = useState(tenant);

  useEffect(() => {
    setLocalTenant(tenant);
  }, [tenant]);

  // Listen to Server-Sent Events (SSE) stream for real-time subscription/limit updates
  useEffect(() => {
    if (typeof window === "undefined" || !window.EventSource) return;

    const eventSource = new EventSource(`/api/bookings/stream?tenantId=${localTenant.id}`);
    
    const handleUpdate = () => {
      console.log("Real-time bookings-updated event received. Refreshing route to fetch new tenant info...");
      router.refresh();
    };

    eventSource.addEventListener("bookings-updated", handleUpdate);

    return () => {
      eventSource.close();
    };
  }, [localTenant.id, router]);

  // Subscription Upgrade States
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<"FREE_TRIAL" | "STARTER" | "PRO" | "ENTERPRISE" | null>(null);
  const [checkoutStage, setCheckoutStage] = useState<"" | "verifying" | "processing" | "updating" | "success">("");
  const [checkoutCardName, setCheckoutCardName] = useState("");
  const [checkoutCardNumber, setCheckoutCardNumber] = useState("");
  const [checkoutExpiry, setCheckoutExpiry] = useState("");
  const [checkoutCvv, setCheckoutCvv] = useState("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleUpgradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForUpgrade) return;
    
    if (!checkoutCardName.trim() || !checkoutCardNumber || !checkoutExpiry || !checkoutCvv) {
      setCheckoutError("Vyplňte prosím všechny platební údaje.");
      return;
    }
    
    if (checkoutCardNumber.replace(/\s/g, "").length < 15) {
      setCheckoutError("Číslo platební karty musí mít alespoň 15 nebo 16 číslic.");
      return;
    }

    setCheckoutError(null);
    setCheckoutStage("verifying");
    await new Promise(resolve => setTimeout(resolve, 850));
    
    setCheckoutStage("processing");
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setCheckoutStage("updating");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "tenant_subscription_update",
          data: {
            tenantId: localTenant.id,
            plan: selectedPlanForUpgrade,
            status: "ACTIVE"
          }
        })
      });
      
      if (res.ok) {
        const responseData = await res.json();
        const updatedTenant = responseData.tenant;
        
        setCheckoutStage("success");
        await new Promise(resolve => setTimeout(resolve, 600));
        
        setLocalTenant(prev => ({
          ...prev,
          subscriptionPlan: updatedTenant.subscriptionPlan,
          subscriptionStatus: updatedTenant.subscriptionStatus,
          maxResourcesLimit: updatedTenant.maxResourcesLimit,
          maxDevicesLimit: updatedTenant.maxDevicesLimit
        }));
        
        setIsUpgradeModalOpen(false);
        setCheckoutStage("");
        setCheckoutCardName("");
        setCheckoutCardNumber("");
        setCheckoutExpiry("");
        setCheckoutCvv("");
        
        setNotification({
          type: "success",
          title: "Předplatné aktivováno",
          message: `Váš plán byl úspěšně aktualizován na ${selectedPlanForUpgrade}!`,
          onClose: () => router.refresh()
        });
      } else {
        const errData = await res.json().catch(() => ({}));
        setCheckoutStage("");
        setCheckoutError(errData.error || "Aktualizace plánu selhala.");
      }
    } catch (err) {
      console.error(err);
      setCheckoutStage("");
      setCheckoutError("Došlo k neočekávané chybě.");
    }
  };

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);

  const fetchAuditLogs = async () => {
    setAuditLogsLoading(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "audit_logs_list",
          data: { tenantId: tenant.id }
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Failed to fetch audit logs", e);
    } finally {
      setAuditLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "overview") {
      fetchAuditLogs();
    }
  }, [activeTab, tenant.id]);

  // Check-in simulator states
  const [simSelectedDeviceId, setSimSelectedDeviceId] = useState("");
  const [simDeviceToken, setSimDeviceToken] = useState("");
  const [simQrPayload, setSimQrPayload] = useState("");
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<{ status: "granted" | "denied" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (devices.length > 0 && !simSelectedDeviceId) {
      setSimSelectedDeviceId(devices[0].id);
    }
  }, [devices]);

  useEffect(() => {
    if (simSelectedDeviceId) {
      if (simSelectedDeviceId === "gate_zskomenskeho_001") {
        setSimDeviceToken("sec_tok_zskomenskeho_xyz123");
      } else if (simSelectedDeviceId === "gate_umelka_001") {
        setSimDeviceToken("sec_tok_umelka_active");
      } else if (simSelectedDeviceId === "gate_north_001") {
        setSimDeviceToken("sec_tok_sfera_active");
      }
    }
  }, [simSelectedDeviceId]);

  // Camera check-in scanner states & refs
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const executeCheckin = async (payload: string) => {
    if (!simSelectedDeviceId || !simDeviceToken || !payload.trim()) {
      setNotification({
        type: "error",
        title: "Chyba simulace",
        message: "Vyplňte prosím všechny údaje pro simulaci."
      });
      return;
    }

    setSimLoading(true);
    setSimResult(null);

    try {
      const res = await fetch("/api/device/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: simSelectedDeviceId,
          deviceToken: simDeviceToken,
          qrPayload: payload.trim(),
        }),
      });

      const data = await res.json();
      if (data.status === "granted") {
        setSimResult({
          status: "granted",
          message: `Vstup povolen! Uživatel: ${data.userName}, Místo: ${data.resourceName} (příkaz čtečce: ${data.command})`
        });
        setSimQrPayload("");
        router.refresh();
      } else {
        const reasonMsg = data.reason === "invalid_time"
          ? "Rezervace je mimo povolený časový úsek (vstup povolen max 15 minut před/po)."
          : data.reason === "already_attended"
          ? "Tento lístek již byl naskenován (duplicate check-in)."
          : data.reason === "invalid_status"
          ? `Lístek nemá platný stav (stav: ${data.bookingStatus || "neznámý"}). Musí být zaplacen.`
          : data.reason === "unknown_ticket"
          ? "Neznámý kód lístku (UUID neexistuje)."
          : `Přístup odepřen: ${data.reason || "neznámá chyba"}`;
        
        setSimResult({
          status: "denied",
          message: reasonMsg
        });
      }
    } catch (err) {
      console.error(err);
      setSimResult({
        status: "error",
        message: "Chyba připojení k čtečce."
      });
    } finally {
      setSimLoading(false);
    }
  };

  const startScanning = async () => {
    setIsScanning(true);
    setCameraError(null);
    
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.play();
          animationFrameRef.current = requestAnimationFrame(scanTick);
        }
      } catch (err: any) {
        console.error("Camera access error:", err);
        setCameraError(
          err.name === "NotAllowedError"
            ? "Přístup k fotoaparátu byl odepřen. Povolte prosím oprávnění v prohlížeči."
            : "Nelze přistupovat k fotoaparátu. Ujistěte se, že není používán jinou aplikací."
        );
      }
    }, 100);
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleQrFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          if (code && code.data) {
            setSimQrPayload(code.data);
            stopScanning();
            executeCheckin(code.data);
          } else {
            setNotification({
              type: "error",
              title: "Čtení QR kódu selhalo",
              message: "V nahraném obrázku nebyl nalezen žádný platný QR kód."
            });
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const scanTick = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        
        if (code && code.data) {
          setSimQrPayload(code.data);
          stopScanning();
          executeCheckin(code.data);
          return;
        }
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(scanTick);
  };

  const handleSimulateCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeCheckin(simQrPayload);
  };

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rootParam = searchParams.get("root") || searchParams.get("rootId");

  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");
  };

  const resolvedResourceIdFromUrl = (() => {
    const firstLevelResources = resources.filter(r => !r.attributes?.parentId);
    if (!rootParam) {
      if (firstLevelResources.length > 0) {
        return firstLevelResources[0].id;
      }
      return "global";
    }
    const exactMatch = resources.find(r => r.id === rootParam);
    if (exactMatch) return exactMatch.id;

    const parts = rootParam.split("-");
    const suffix = parts[parts.length - 1];
    if (suffix && suffix.length === 8) {
      const match = resources.find(r => r.id.startsWith(suffix));
      if (match) return match.id;

      // Fallback: search by name without the stale ID suffix
      const namePart = parts.slice(0, -1).join("-");
      const matchByNamePrefix = resources.find(r => slugify(r.name) === namePart);
      if (matchByNamePrefix) return matchByNamePrefix.id;
    }
    const matchByName = resources.find(r => slugify(r.name) === rootParam);
    if (matchByName) return matchByName.id;

    if (firstLevelResources.length > 0) {
      return firstLevelResources[0].id;
    }
    return "global";
  })();

  const [selectedOperatingResourceId, setSelectedOperatingResourceId] = useState<string>(resolvedResourceIdFromUrl);

  useEffect(() => {
    setSelectedOperatingResourceId(resolvedResourceIdFromUrl);
  }, [resolvedResourceIdFromUrl]);

  // Portal settings states
  const initialAttributes = tenant.attributes || {};
  const [settingsTagline, setSettingsTagline] = useState(initialAttributes.tagline || "");
  const [settingsLocation, setSettingsLocation] = useState(initialAttributes.location || "");
  const [settingsOpenTime, setSettingsOpenTime] = useState(initialAttributes.openTime || "08:00");
  const [settingsCloseTime, setSettingsCloseTime] = useState(initialAttributes.closeTime || "22:00");
  const [settingsBannerImage, setSettingsBannerImage] = useState(initialAttributes.bannerImage || "");
  const [settingsBannerPosition, setSettingsBannerPosition] = useState(initialAttributes.bannerPosition || "center");
  const [settingsOpeningHours, setSettingsOpeningHours] = useState<OpeningHoursDay[]>(
    initialAttributes.openingHours || defaultOpeningHours
  );
  const [settingsDynamicQr, setSettingsDynamicQr] = useState<boolean>(!!initialAttributes.dynamicQrEnabled);

  useEffect(() => {
    if (selectedOperatingResourceId === "global") {
      setSettingsOpenTime(initialAttributes.openTime || "08:00");
      setSettingsCloseTime(initialAttributes.closeTime || "22:00");
      setSettingsOpeningHours(initialAttributes.openingHours || defaultOpeningHours);
    } else {
      const res = resources.find(r => r.id === selectedOperatingResourceId);
      const attrs = res?.attributes || {};
      setSettingsOpenTime(attrs.openTime || initialAttributes.openTime || "08:00");
      setSettingsCloseTime(attrs.closeTime || initialAttributes.closeTime || "22:00");
      setSettingsOpeningHours(attrs.openingHours || initialAttributes.openingHours || defaultOpeningHours);
    }
  }, [selectedOperatingResourceId, tenant.attributes, resources]);

  // Auto-widen calendar view range to cover all configured opening hours
  useEffect(() => {
    const openDays = settingsOpeningHours.filter(d => !d.closed);
    if (openDays.length === 0) return;

    let earliestOpen = settingsOpenTime;
    let latestClose = settingsCloseTime;
    let changed = false;

    openDays.forEach(day => {
      if (day.openTime && day.openTime < earliestOpen) {
        earliestOpen = day.openTime;
        changed = true;
      }
      if (day.closeTime && day.closeTime > latestClose) {
        latestClose = day.closeTime;
        changed = true;
      }
    });

    if (changed) {
      setSettingsOpenTime(earliestOpen);
      setSettingsCloseTime(latestClose);
    }
  }, [settingsOpeningHours, settingsOpenTime, settingsCloseTime]);

  const earliestOpeningHour = React.useMemo(() => {
    const openDays = settingsOpeningHours.filter(d => !d.closed);
    if (openDays.length === 0) return "24:00";
    let earliest = "24:00";
    openDays.forEach(d => {
      if (d.openTime && d.openTime < earliest) earliest = d.openTime;
    });
    return earliest;
  }, [settingsOpeningHours]);

  const latestClosingHour = React.useMemo(() => {
    const openDays = settingsOpeningHours.filter(d => !d.closed);
    if (openDays.length === 0) return "00:00";
    let latest = "00:00";
    openDays.forEach(d => {
      if (d.closeTime && d.closeTime > latest) latest = d.closeTime;
    });
    return latest;
  }, [settingsOpeningHours]);
  
  // Preset helpers for opening hours
  const [presetOpenTime, setPresetOpenTime] = useState("08:00");
  const [presetCloseTime, setPresetCloseTime] = useState("22:00");
  const [presetClosed, setPresetClosed] = useState(false);
  const [activeTimePicker, setActiveTimePicker] = useState<TimePickerState | null>(null);

  const initialAdminEmails = Array.isArray(initialAttributes.adminEmails)
    ? initialAttributes.adminEmails.join(", ")
    : (initialAttributes.adminEmails || "");
  const [settingsAdminEmails, setSettingsAdminEmails] = useState(initialAdminEmails);
  const [settingsAiInstructions, setSettingsAiInstructions] = useState((initialAttributes as any).aiInstructions || "");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // Onboarding Wizard state
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Mobile check-in scanner overlay state
  const [isMobileScannerOpen, setIsMobileScannerOpen] = useState(false);

  useEffect(() => {
    const onboardingCompleted = tenant.attributes?.onboardingCompleted === true;
    if (resources.length === 0 && !onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [resources.length, tenant.attributes]);

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
  const [resourceModal, setResourceModal] = useState<{
    open: boolean;
    mode: "add" | "edit";
    data: {
      id: string;
      name: string;
      type: string;
      maxCapacity: number;
      instructor: string;
      room: string;
      parentId: string;
      surface: string;
      equipment: string;
      equipmentList?: EquipmentConfig[];
      price: string;
      technicalBreak: boolean;
      technicalBreakMinutes: number;
      autoLightingPricingEnabled?: boolean;
      autoLightingFlatRate?: string | number;
      autoLightingOffsetMinutes?: number;
      autoHeatingPricingEnabled?: boolean;
      autoHeatingFlatRate?: string | number;
      autoHeatingTempThreshold?: number;
    }
  }>({
    open: false,
    mode: "add",
    data: {
      id: "",
      name: "",
      type: "SPACE",
      maxCapacity: 10,
      instructor: "",
      room: "",
      parentId: "",
      surface: "",
      equipment: "",
      equipmentList: [],
      price: "",
      technicalBreak: false,
      technicalBreakMinutes: 15,
      autoLightingPricingEnabled: false,
      autoLightingFlatRate: "",
      autoLightingOffsetMinutes: 60,
      autoHeatingPricingEnabled: false,
      autoHeatingFlatRate: "",
      autoHeatingTempThreshold: 15
    }
  });

  // Equipment creator states
  const [newEqName, setNewEqName] = useState("");
  const [newEqCategory, setNewEqCategory] = useState<"default" | "extra">("default");
  const [newEqPrice, setNewEqPrice] = useState(0);
  const [newEqQuantity, setNewEqQuantity] = useState(1);
  const [newEqCooldown, setNewEqCooldown] = useState(0); // Bez pauzy by default


  const [deviceModal, setDeviceModal] = useState<{ open: boolean; mode: "add" | "edit"; data: { id: string; name: string; token: string; active: boolean; } }>({
    open: false,
    mode: "add",
    data: { id: "", name: "", token: "", active: true }
  });

  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);

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
        let targetEquipmentList = data.equipmentList || [];
        let targetPrice = data.price || "";
        let targetTechnicalBreak = data.technicalBreak !== undefined ? data.technicalBreak : false;
        let targetTechnicalBreakMinutes = data.technicalBreakMinutes !== undefined ? parseInt(data.technicalBreakMinutes, 10) : 15;
        let targetAutoLightingPricingEnabled = data.autoLightingPricingEnabled !== undefined ? data.autoLightingPricingEnabled : false;
        let targetAutoLightingFlatRate = data.autoLightingFlatRate !== undefined ? data.autoLightingFlatRate : "";
        let targetAutoLightingOffsetMinutes = data.autoLightingOffsetMinutes !== undefined ? parseInt(data.autoLightingOffsetMinutes, 10) : 60;
        let targetAutoHeatingPricingEnabled = data.autoHeatingPricingEnabled !== undefined ? data.autoHeatingPricingEnabled : false;
        let targetAutoHeatingFlatRate = data.autoHeatingFlatRate !== undefined ? data.autoHeatingFlatRate : "";
        let targetAutoHeatingTempThreshold = data.autoHeatingTempThreshold !== undefined ? parseInt(data.autoHeatingTempThreshold, 10) : 15;

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
          if (data.instructor === undefined) targetInstructor = (existing.attributes as any)?.instructor || "";
          if (data.room === undefined) targetRoom = (existing.attributes as any)?.room || "";
          if (data.parentId === undefined) targetParentId = (existing.attributes as any)?.parentId || "";
          if (data.surface === undefined) targetSurface = (existing.attributes as any)?.surface || "";
          if (data.equipment === undefined) targetEquipment = (existing.attributes as any)?.equipment || "";
          if (data.equipmentList === undefined) targetEquipmentList = (existing.attributes as any)?.equipmentList || [];
          if (data.price === undefined) targetPrice = (existing.attributes as any)?.price || "";
          if (data.technicalBreak === undefined) targetTechnicalBreak = (existing.attributes as any)?.technicalBreak || false;
          if (data.technicalBreakMinutes === undefined) targetTechnicalBreakMinutes = (existing.attributes as any)?.technicalBreakMinutes || 15;
          if (data.autoLightingPricingEnabled === undefined) targetAutoLightingPricingEnabled = (existing.attributes as any)?.autoLightingPricingEnabled || false;
          if (data.autoLightingFlatRate === undefined) targetAutoLightingFlatRate = (existing.attributes as any)?.autoLightingFlatRate || "";
          if (data.autoLightingOffsetMinutes === undefined) targetAutoLightingOffsetMinutes = (existing.attributes as any)?.autoLightingOffsetMinutes || 60;
          if (data.autoHeatingPricingEnabled === undefined) targetAutoHeatingPricingEnabled = (existing.attributes as any)?.autoHeatingPricingEnabled || false;
          if (data.autoHeatingFlatRate === undefined) targetAutoHeatingFlatRate = (existing.attributes as any)?.autoHeatingFlatRate || "";
          if (data.autoHeatingTempThreshold === undefined) targetAutoHeatingTempThreshold = (existing.attributes as any)?.autoHeatingTempThreshold || 15;
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
            equipmentList: targetEquipmentList,
            price: targetPrice,
            technicalBreak: targetTechnicalBreak,
            technicalBreakMinutes: targetTechnicalBreakMinutes,
            autoLightingPricingEnabled: targetAutoLightingPricingEnabled,
            autoLightingFlatRate: targetAutoLightingFlatRate,
            autoLightingOffsetMinutes: targetAutoLightingOffsetMinutes,
            autoHeatingPricingEnabled: targetAutoHeatingPricingEnabled,
            autoHeatingFlatRate: targetAutoHeatingFlatRate,
            autoHeatingTempThreshold: targetAutoHeatingTempThreshold
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
        if (data.location !== undefined) setSettingsLocation(data.location);
        if (data.dynamicQrEnabled !== undefined) setSettingsDynamicQr(!!data.dynamicQrEnabled);
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

    // Validate that location is present if auto-pricing rules are enabled
    if ((resourceModal.data.autoLightingPricingEnabled || resourceModal.data.autoHeatingPricingEnabled) && !settingsLocation.trim()) {
      setNotification({
        type: "error",
        title: "Lokalita areálu chybí",
        message: "Pro uložení zdroje s aktivním automatickým osvětlením nebo vytápěním musíte nejdříve v záložce Nastavení vyplnit 'Lokalitu / Město areálu' pro určení západu slunce a počasí."
      });
      return;
    }

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
        equipment: resourceModal.data.equipmentList 
          ? resourceModal.data.equipmentList.map(eq => eq.name).join(", ") 
          : resourceModal.data.equipment,
        equipmentList: resourceModal.data.equipmentList,
        price: resourceModal.data.price,
        technicalBreak: resourceModal.data.technicalBreak,
        technicalBreakMinutes: resourceModal.data.technicalBreakMinutes,
        autoLightingPricingEnabled: resourceModal.data.autoLightingPricingEnabled,
        autoLightingFlatRate: resourceModal.data.autoLightingFlatRate,
        autoLightingOffsetMinutes: resourceModal.data.autoLightingOffsetMinutes,
        autoHeatingPricingEnabled: resourceModal.data.autoHeatingPricingEnabled,
        autoHeatingFlatRate: resourceModal.data.autoHeatingFlatRate,
        autoHeatingTempThreshold: resourceModal.data.autoHeatingTempThreshold
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
        const errData = await res.json().catch(() => ({}));
        setNotification({
          type: "error",
          title: "Uložení selhalo",
          message: errData.error || "Při ukládání zdroje došlo k chybě."
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
            tenantId: tenant.id,
            isNew: deviceModal.mode === "add"
          } 
        })
      });
      if (res.ok) {
        await res.json();
        const createdToken = deviceModal.data.token;
        setDeviceModal({ ...deviceModal, open: false });
        window.dispatchEvent(new CustomEvent("admin-assistant-action-completed", { detail: { action: "uložení přístupového zařízení", success: true } }));

        if (deviceModal.mode === "add" && createdToken) {
          setNotification({
            type: "success",
            title: "Zařízení nakonfigurováno",
            message: `Přístupové zařízení bylo úspěšně nakonfigurováno!\n\nUložte si následující token pro konfiguraci turniketu/čtečky:\nToken: ${createdToken}`,
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
        const errData = await res.json().catch(() => ({}));
        setNotification({
          type: "error",
          title: "Uložení selhalo",
          message: errData.error || "Při ukládání konfigurace zařízení došlo k chybě."
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
      title: "Smazat přístupové zařízení",
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

    try {
      if (activeTab === "settings") {
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
            bannerImage: settingsBannerImage,
            bannerPosition: settingsBannerPosition,
            adminEmails: emailsArray,
            aiInstructions: settingsAiInstructions,
            location: settingsLocation,
            dynamicQrEnabled: settingsDynamicQr,
          }
        };

        const res = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "tenant_settings_update", data: dataToSend })
        });
        if (!res.ok) throw new Error("Nepodařilo se uložit nastavení portálu.");
      } else {
        // Validate calendar range bounds
        const openDays = settingsOpeningHours.filter(d => !d.closed);
        if (openDays.length > 0) {
          let earliest = "24:00";
          let latest = "00:00";
          openDays.forEach(d => {
            if (d.openTime && d.openTime < earliest) earliest = d.openTime;
            if (d.closeTime && d.closeTime > latest) latest = d.closeTime;
          });

          if (settingsOpenTime > earliest) {
            setNotification({
              type: "error",
              title: "Neplatný rozsah kalendáře",
              message: `Čas zahájení kalendáře (${settingsOpenTime}) nemůže být později než nejranější čas otevření (${earliest}).`
            });
            setIsSavingSettings(false);
            return;
          }

          if (settingsCloseTime < latest) {
            setNotification({
              type: "error",
              title: "Neplatný rozsah kalendáře",
              message: `Čas ukončení kalendáře (${settingsCloseTime}) nemůže být dříve než nejpozdější čas zavření (${latest}).`
            });
            setIsSavingSettings(false);
            return;
          }
        }

        if (selectedOperatingResourceId === "global") {
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
              location: settingsLocation,
              dynamicQrEnabled: settingsDynamicQr,
            }
          };

          const res = await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "tenant_settings_update", data: dataToSend })
          });
          if (!res.ok) throw new Error("Nepodařilo se uložit nastavení portálu.");
        } else {
          // Save as specific resource attributes and recreate schedule rules
          const targetRes = resources.find(r => r.id === selectedOperatingResourceId);
          if (!targetRes) throw new Error("Zdroj nebyl nalezen.");

          // 1. Update resource attributes in DB
          const resourceData = {
            id: targetRes.id,
            tenantId: tenant.id,
            name: targetRes.name,
            type: targetRes.type,
            maxCapacity: targetRes.maxCapacity,
            attributes: {
              ...(targetRes.attributes || {}),
              openTime: settingsOpenTime,
              closeTime: settingsCloseTime,
              openingHours: settingsOpeningHours,
            }
          };

          const resourceRes = await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "resource_upsert", data: resourceData })
          });
          if (!resourceRes.ok) throw new Error("Nepodařilo se uložit nastavení zdroje.");

          // 2. Delete existing "Standardní provoz" rules for this resource
          const standardRules = targetRes.scheduleRules.filter(r => r.name === "Standardní provoz");
          for (const rule of standardRules) {
            await fetch("/api/admin", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "rule_delete", data: { id: rule.id, tenantId: tenant.id } })
            });
          }

          // 3. Create new standard rules based on updated hours
          const hourGroups: Record<string, { days: number[]; open: string; close: string }> = {};
          settingsOpeningHours.forEach(day => {
            if (day.closed) return;
            const key = `${day.openTime}-${day.closeTime}`;
            if (!hourGroups[key]) {
              hourGroups[key] = { days: [], open: day.openTime, close: day.closeTime };
            }
            hourGroups[key].days.push(day.dayOfWeek);
          });

          for (const key of Object.keys(hourGroups)) {
            const group = hourGroups[key];
            const ruleData = {
              tenantId: tenant.id,
              resourceId: targetRes.id,
              name: "Standardní provoz",
              startTime: group.open,
              endTime: group.close,
              price: parseFloat(targetRes.attributes?.price || "0"),
              maxCapacity: targetRes.maxCapacity || 10,
              daysOfWeek: group.days
            };
            await fetch("/api/admin", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "rule_upsert", data: ruleData })
            });
          }
        }
      }

      window.dispatchEvent(new CustomEvent("admin-assistant-action-completed", { detail: { action: "uložení nastavení provozu", success: true } }));
      setNotification({
        type: "success",
        title: activeTab === "settings" ? "Nastavení portálu uloženo" : "Provozní doba uložena",
        message: activeTab === "settings" ? "Nastavení portálu bylo úspěšně uloženo!" : "Provozní doba byla úspěšně uložena!",
        onClose: () => router.refresh()
      });
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: "error",
        title: "Uložení selhalo",
        message: err.message || "Při ukládání provozní doby došlo k chybě."
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
      if (booking.status !== "CONFIRMED" && booking.status !== "ATTENDED" && booking.status !== "PENDING_PAYMENT") return;
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
        status: booking.status,
        rentedEquipment: booking.rentedEquipment,
      });

      const resAttrs = (resource?.attributes as any) || {};
      if (resAttrs.technicalBreak && resAttrs.technicalBreakMinutes) {
        const breakDuration = resAttrs.technicalBreakMinutes / 60;
        
        const year = from.getUTCFullYear();
        const month = String(from.getUTCMonth() + 1).padStart(2, "0");
        const day = String(from.getUTCDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;

        events.push({
          id: `${booking.id}-break`,
          name: `Technická pauza`,
          room: "Úklid / Příprava",
          instructor: "Systém",
          dayIndex,
          startHour: endHour,
          durationHours: breakDuration,
          resourceId: booking.resourceId,
          isOccupied: true,
          resourceName: booking.resourceName || (resource?.name || "Rezervace"),
          status: "TECHNICAL_BREAK",
          dateStr,
        });
      }
    });

    // B. Add schedule rules (for classes/regular programs)
    resources.forEach((resource) => {
      if (resource.type === "COURSE_PROGRAM") {
        const instructor = resource.attributes?.instructor || "Staff";
        const room = resource.attributes?.room || "Room";

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
      }
    });

    return events;
  }, [bookings, resources, tenant.vertical, monday, nextMonday]);

  // Helper translations
  const getDayName = (dayOfWeek: number | null) => {
    if (dayOfWeek === null) return "Jednorázově";
    const days = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];
    return days[dayOfWeek] || "Specifický";
  };

  const getResourceTypeName = (type: string, vertical: string, name: string, parentId: string | null, siblingsCount: number) => {
    switch (type) {
      case "SPACE": 
        const nameLower = name.toLowerCase();
        if (parentId !== null || nameLower.includes("sektor") || nameLower.includes("sector") || nameLower.includes("sektro") || nameLower.includes("1/2")) {
          if (siblingsCount === 3) return "Třetina plochy";
          if (siblingsCount === 2) return "Polovina plochy";
          return "Část plochy";
        }
        return "Celý prostor";
      case "SEAT": return "Místo k sezení";
      case "COURSE_PROGRAM": return "Trénink / Lekce / Program";
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
        className={`relative space-y-4 ${level > 0 ? "pl-3 sm:pl-6" : "pl-0"}`}
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
          <div className="flex-1 bg-white/45 dark:bg-[#0D0D15]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] border-l-[4px] border-l-tenant-primary rounded-none p-3.5 sm:p-5 shadow-sm">
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-[9px] font-extrabold bg-tenant-primary/10 border border-tenant-primary/20 text-tenant-primary uppercase tracking-widest select-none shadow-[inset_0_0.5px_0.5px_rgba(255,255,255,0.4)]">
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
                  <span>Kapacita: <strong>{res.maxCapacity} {res.maxCapacity === 1 ? "místo" : res.maxCapacity < 5 ? "místa" : "míst"}</strong></span>
                  <span>Cena: <strong>{resAttrs.price ? `${resAttrs.price} Kč/hod` : "Dle dohody"}</strong></span>
                  {resAttrs.equipment && <span className="truncate max-w-[200px]" title={resAttrs.equipment}>Vybavení: {resAttrs.equipment}</span>}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right mr-1 select-none hidden sm:block">
                  <span className="block text-[9px] uppercase font-extrabold text-slate-400 dark:text-zinc-500 tracking-wider">Cena pronájmu</span>
                  <span className="text-xs font-extrabold text-tenant-primary bg-tenant-primary/5 border border-tenant-primary/15 px-2.5 py-1 rounded-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
                    {resAttrs.price ? `${resAttrs.price} Kč/hod` : "Dle dohody"}
                  </span>
                </div>

                <div className="flex gap-2">
                  {!isReceptionist && (
                    <>
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
                            equipmentList: resAttrs.equipmentList || [],
                            price: resAttrs.price || "",
                            technicalBreak: resAttrs.technicalBreak || false,
                            technicalBreakMinutes: resAttrs.technicalBreakMinutes || 15,
                            autoLightingPricingEnabled: resAttrs.autoLightingPricingEnabled || false,
                            autoLightingFlatRate: resAttrs.autoLightingFlatRate || "",
                            autoLightingOffsetMinutes: resAttrs.autoLightingOffsetMinutes !== undefined ? resAttrs.autoLightingOffsetMinutes : 60,
                            autoHeatingPricingEnabled: resAttrs.autoHeatingPricingEnabled || false,
                            autoHeatingFlatRate: resAttrs.autoHeatingFlatRate || "",
                            autoHeatingTempThreshold: resAttrs.autoHeatingTempThreshold !== undefined ? resAttrs.autoHeatingTempThreshold : 15
                          }
                        })}
                        className="p-3 sm:p-1.5 rounded-none bg-slate-200/50 hover:bg-slate-200/80 dark:bg-black/60 dark:hover:bg-zinc-800/80 text-tenant-primary border border-slate-300 dark:border-zinc-700 hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer"
                        title="Upravit zdroj"
                      >
                        <Edit className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                      </button>
                      <button
                        onClick={() => handleResourceDelete(res.id)}
                        className="p-3 sm:p-1.5 rounded-none bg-slate-200/50 hover:bg-slate-200/80 dark:bg-black/60 dark:hover:bg-zinc-800/80 text-red-500 border border-slate-300 dark:border-zinc-700 hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer"
                        title="Smazat zdroj"
                      >
                        <Trash className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                      </button>
                    </>
                  )}
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

  const adminThemeStyles = {
    "--tenant-primary": "oklch(0.52 0.22 292)", // A rich, vibrant purple/violet
    "--tenant-primary-hover": "oklch(0.44 0.22 292)",
    "--tenant-primary-foreground": "#ffffff",
    "--tenant-accent": "oklch(0.60 0.18 292)",
    "--tenant-gradient": "linear-gradient(135deg, oklch(0.52 0.22 292), oklch(0.38 0.18 310))",
  } as React.CSSProperties;

  return (
    <div style={adminThemeStyles} className="flex-1 bg-background text-foreground flex flex-col font-sans transition-colors duration-200 relative overflow-hidden">
      {/* Premium Ambient Glow Blobs */}
      <div className="absolute top-[-25%] left-[-15%] w-[60%] h-[60%] rounded-full bg-tenant-primary/5 dark:bg-tenant-primary/10 blur-[130px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '10s' }} />
      <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] rounded-full bg-tenant-primary/4 dark:bg-tenant-primary/8 blur-[160px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '15s' }} />
      <header className="border-b border-slate-200/50 dark:border-[#1F1F35]/30 bg-white/45 dark:bg-[#07070C]/35 backdrop-blur-xl sticky top-0 z-40 transition-all shadow-md shadow-slate-100/5 dark:shadow-black/5">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/"
              className="p-2 rounded-none bg-white/40 dark:bg-[#0F0F1A]/60 backdrop-blur-md text-slate-500 dark:text-zinc-400 hover:text-tenant-primary dark:hover:text-purple-400 border border-[#E2E2ED]/60 dark:border-[#1F1F2E] transition-all flex items-center justify-center cursor-pointer hover:scale-105 shadow-sm"
              title="Zpět na portál"
            >
              <ArrowLeft size={14} />
            </Link>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 500 500"
              className="h-9 w-9 transition-transform hover:scale-105 select-none shrink-0 hidden sm:block"
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
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-slate-805 dark:text-slate-100 text-xs sm:text-sm leading-tight">{theme.name}</span>
                <span className="px-1 py-0.5 rounded-none text-[7px] sm:text-[8px] font-extrabold bg-tenant-primary/10 border border-tenant-primary/20 text-tenant-primary uppercase tracking-wide leading-none select-none">
                  Administrace
                </span>
              </div>
            </div>
          </div>

          {/* Middle Header Widgets */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Czech Formatted Date */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white/35 dark:bg-[#0E0E1B]/35 backdrop-blur-xl border border-slate-200/40 dark:border-[#1F1F35]/40 rounded-none text-slate-500 dark:text-zinc-400 text-[10.5px] font-semibold select-none shadow-sm shadow-slate-100/5 dark:shadow-black/5 hover:border-slate-300 dark:hover:border-zinc-800 transition-colors">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-zinc-500 shrink-0" />
              <span>{czechFormattedDate}</span>
            </div>

            {/* Status Pill (Open/Closed) */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white/35 dark:bg-[#0E0E1B]/35 backdrop-blur-xl border border-slate-200/40 dark:border-[#1F1F35]/40 rounded-none text-[10.5px] font-semibold select-none shadow-sm shadow-slate-100/5 dark:shadow-black/5 hover:border-slate-300 dark:hover:border-zinc-800 transition-colors">
              <span className={isOpenNow ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                {isOpenNow ? "Nyní otevřeno" : "Zavřeno"}
              </span>
            </div>
          </div>

          {/* Integrated Glass Control Dock */}
          <div className="flex items-center bg-white/45 dark:bg-[#0E0E1B]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-none p-1 shadow-md shadow-slate-100/5 dark:shadow-black/5 transition-all">
            <ThemeToggle />
            
            <span className="h-6 w-px bg-slate-200/50 dark:bg-[#1F1F35] mx-1 shrink-0" />
            
            {session ? (
              <div className="flex items-center gap-3 pl-2 pr-1 py-0.5">
                <div className="hidden sm:flex flex-col text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="px-1.5 py-0.5 rounded-none text-[8px] font-extrabold bg-tenant-primary/10 border border-tenant-primary/20 text-tenant-primary uppercase tracking-wide leading-none">
                      Správce
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none">{session.user?.name}</span>
                  </div>
                  <span className="text-[9px] text-slate-500 dark:text-zinc-400 mt-1 leading-none">{session.user?.email}</span>
                </div>
                
                {/* Avatar with gradient matching brand colors */}
                <div className="h-8 w-8 rounded-none bg-gradient-to-tr from-tenant-primary/25 to-tenant-primary/5 dark:from-tenant-primary/30 dark:to-tenant-primary/10 border border-tenant-primary/20 dark:border-tenant-primary/30 text-tenant-primary dark:text-purple-400 flex items-center justify-center font-extrabold text-xs select-none shadow-sm shadow-tenant-primary/5 overflow-hidden">
                  {session.user?.avatarUrl ? (
                    <img
                      src={session.user.avatarUrl}
                      alt={session.user.name || "Avatar"}
                      className="h-full w-full object-cover rounded-none"
                    />
                  ) : (
                    session.user?.name ? session.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "A"
                  )}
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
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-6 md:py-8 flex flex-col md:flex-row gap-6 md:gap-8">
        
        {/* Navigation Sidebar */}
        <aside className="hidden md:flex w-full md:w-64 flex-col gap-1.5 p-3 bg-white/45 dark:bg-[#0A0A10]/35 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-none shadow-sm shadow-slate-100/5 dark:shadow-black/5 shrink-0 select-none">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-auto md:w-full inline-flex md:flex px-4 py-2.5 md:py-3 rounded-none items-center gap-2 sm:gap-3 text-xs font-semibold transition-all cursor-pointer border border-transparent shrink-0 ${
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
            className={`w-auto md:w-full inline-flex md:flex px-4 py-2.5 md:py-3 rounded-none items-center gap-2 sm:gap-3 text-xs font-semibold transition-all cursor-pointer border border-transparent shrink-0 ${
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
            className={`w-auto md:w-full inline-flex md:flex px-4 py-2.5 md:py-3 rounded-none items-center gap-2 sm:gap-3 text-xs font-semibold transition-all cursor-pointer border border-transparent shrink-0 ${
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
            className={`w-auto md:w-full inline-flex md:flex px-4 py-2.5 md:py-3 rounded-none items-center gap-2 sm:gap-3 text-xs font-semibold transition-all cursor-pointer border border-transparent shrink-0 ${
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
            className={`w-auto md:w-full inline-flex md:flex px-4 py-2.5 md:py-3 rounded-none items-center gap-2 sm:gap-3 text-xs font-semibold transition-all cursor-pointer border border-transparent shrink-0 ${
              activeTab === "devices" 
                ? "bg-tenant-gradient text-white shadow-md shadow-tenant-primary/20 scale-[1.02] font-bold" 
                : "text-slate-500 dark:text-zinc-400 hover:text-tenant-primary dark:hover:text-purple-400 hover:bg-white/50 dark:hover:bg-[#131322]/40 hover:border-slate-200/30 dark:hover:border-[#1F1F35]/20 hover:scale-[1.01]"
            }`}
          >
            <QrCode size={16} />
            Čtečky a brány
          </button>

          <button
            onClick={() => setActiveTab("billing")}
            className={`w-auto md:w-full inline-flex md:flex px-4 py-2.5 md:py-3 rounded-none items-center gap-2 sm:gap-3 text-xs font-semibold transition-all cursor-pointer border border-transparent shrink-0 ${
              activeTab === "billing" 
                ? "bg-tenant-gradient text-white shadow-md shadow-tenant-primary/20 scale-[1.02] font-bold" 
                : "text-slate-500 dark:text-zinc-400 hover:text-tenant-primary dark:hover:text-purple-400 hover:bg-white/50 dark:hover:bg-[#131322]/40 hover:border-slate-200/30 dark:hover:border-[#1F1F35]/20 hover:scale-[1.01]"
            }`}
          >
            <Users size={16} />
            Lidé a fakturace
          </button>

          <button
            onClick={() => setActiveTab("subscription")}
            className={`w-auto md:w-full inline-flex md:flex px-4 py-2.5 md:py-3 rounded-none items-center gap-2 sm:gap-3 text-xs font-semibold transition-all cursor-pointer border border-transparent shrink-0 ${
              activeTab === "subscription" 
                ? "bg-tenant-gradient text-white shadow-md shadow-tenant-primary/20 scale-[1.02] font-bold" 
                : "text-slate-500 dark:text-zinc-400 hover:text-tenant-primary dark:hover:text-purple-400 hover:bg-white/50 dark:hover:bg-[#131322]/40 hover:border-slate-200/30 dark:hover:border-[#1F1F35]/20 hover:scale-[1.01]"
            }`}
          >
            <CreditCard size={16} />
            Předplatné
          </button>

          <button
            onClick={() => setActiveTab("updates")}
            className={`w-auto md:w-full inline-flex md:flex px-4 py-2.5 md:py-3 rounded-none items-center gap-2 sm:gap-3 text-xs font-semibold transition-all cursor-pointer border border-transparent shrink-0 ${
              activeTab === "updates" 
                ? "bg-tenant-gradient text-white shadow-md shadow-tenant-primary/20 scale-[1.02] font-bold" 
                : "text-slate-500 dark:text-zinc-400 hover:text-tenant-primary dark:hover:text-purple-400 hover:bg-white/50 dark:hover:bg-[#131322]/40 hover:border-slate-200/30 dark:hover:border-[#1F1F35]/20 hover:scale-[1.01]"
            }`}
          >
            <Terminal size={16} />
            Systémové aktualizace
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`w-auto md:w-full inline-flex md:flex px-4 py-2.5 md:py-3 rounded-none items-center gap-2 sm:gap-3 text-xs font-semibold transition-all cursor-pointer border border-transparent shrink-0 ${
              activeTab === "settings" 
                ? "bg-tenant-gradient text-white shadow-md shadow-tenant-primary/20 scale-[1.02] font-bold" 
                : "text-slate-500 dark:text-zinc-400 hover:text-tenant-primary dark:hover:text-purple-400 hover:bg-white/50 dark:hover:bg-[#131322]/40 hover:border-slate-200/30 dark:hover:border-[#1F1F35]/20 hover:scale-[1.01]"
            }`}
          >
            <Settings size={16} />
            Nastavení portálu
          </button>
        </aside>

        {/* Mobile Navigation Dropdown */}
        <div className="md:hidden w-full relative z-30 mb-2 select-none">
          <style>{`
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
            .animate-slide-up {
              animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>

          <div className="w-full relative z-30 mb-4 select-none">
            <div className="flex items-center justify-between gap-2 bg-white/60 dark:bg-[#080810]/50 backdrop-blur-xl border border-slate-200/40 dark:border-white/5 rounded-none p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
              <div className="flex-1 overflow-x-auto scrollbar-none flex items-center gap-1.5 py-0.5 px-1 scroll-smooth">
                {navItems.map((item) => {
                  const isActive = activeTab === item.value;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.value}
                      onClick={() => setActiveTab(item.value)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-none text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? "bg-tenant-gradient text-white shadow-sm font-extrabold"
                          : "text-slate-500 dark:text-zinc-400 hover:text-tenant-primary hover:bg-slate-100/30 dark:hover:bg-white/[0.02]"
                      }`}
                    >
                      <Icon size={13} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <div className="h-6 w-[1px] bg-slate-200 dark:bg-white/10 shrink-0" />
              <button
                onClick={() => setIsMobileScannerOpen(true)}
                className="p-2.5 rounded-none bg-tenant-gradient text-white shrink-0 active:scale-90 transition-all flex items-center justify-center shadow-md shadow-tenant-primary/15 md:hidden"
                title="Bleskové odbavení lístků"
              >
                <Camera size={14} />
              </button>
              <button
                onClick={() => setIsMobileNavOpen(true)}
                className="p-2 rounded-none text-slate-500 hover:text-slate-800 dark:hover:text-white shrink-0 active:scale-90 transition-all flex items-center justify-center bg-slate-50 dark:bg-white/[0.02] border border-slate-200/40 dark:border-white/5"
                title="Zobrazit navigaci"
              >
                <Menu size={14} />
              </button>
            </div>
          </div>

          {isMobileNavOpen && (
            <>
              {/* Backdrop */}
              <div
                onClick={() => setIsMobileNavOpen(false)}
                className="fixed inset-0 z-40 bg-black/60 dark:bg-black/85 backdrop-blur-[3px] transition-opacity duration-300 md:hidden"
              />
              {/* Bottom Sheet Drawer */}
              <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#07070F]/95 backdrop-blur-3xl border-t border-slate-200/60 dark:border-white/10 rounded-none p-6 pb-8 space-y-5 animate-slide-up md:hidden select-none max-h-[85vh] overflow-y-auto scrollbar-none shadow-[0_-10px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                {/* Visual Handle */}
                <div className="w-12 h-1 bg-slate-300 dark:bg-white/20 rounded-none mx-auto mb-2" />
                
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/[0.06] pb-3">
                  <div className="flex flex-col">
                    <span className="text-[9px] tracking-[0.25em] uppercase font-bold text-slate-400 dark:text-zinc-500">ADMINISTRACE</span>
                    <span className="text-xs font-black text-slate-800 dark:text-white tracking-wider uppercase mt-0.5">Navigace portálu</span>
                  </div>
                  <button
                    onClick={() => setIsMobileNavOpen(false)}
                    className="p-1.5 rounded-none border border-slate-200 dark:border-white/10 bg-slate-50/55 dark:bg-white/[0.02] text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Mobile Ticket Scanner Quick Launch CTA */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileScannerOpen(true);
                    setIsMobileNavOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2.5 py-4 px-4 bg-tenant-gradient text-white rounded-none font-bold shadow-lg shadow-tenant-primary/20 active:scale-98 transition-all cursor-pointer select-none mb-3"
                >
                  <Camera size={16} className="animate-pulse" />
                  <span className="text-[10px] uppercase tracking-widest font-black">Bleskové Odbavení Lístků</span>
                </button>

                <div className="flex flex-col gap-1.5">
                  {navItems.map((item) => {
                    const isActive = activeTab === item.value;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.value}
                        onClick={() => {
                          setActiveTab(item.value);
                          setIsMobileNavOpen(false);
                        }}
                        className={`w-full relative flex items-center gap-3.5 py-3.5 px-4 rounded-none transition-all duration-200 cursor-pointer ${
                          isActive
                            ? "bg-slate-100/70 dark:bg-white/[0.04] text-slate-900 dark:text-white font-bold"
                            : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50/50 dark:hover:bg-white/[0.02]"
                        }`}
                      >
                        {/* Glowing Active Indicator - Vertical Neon Bar on the left */}
                        {isActive && (
                          <div 
                            className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-none bg-tenant-gradient" 
                            style={{
                              boxShadow: "0 0 10px var(--tenant-primary), 0 0 5px var(--tenant-primary)"
                            }}
                          />
                        )}
                        
                        <Icon 
                          size={15} 
                          className={`transition-colors duration-200 ${
                            isActive ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-zinc-500"
                          }`} 
                        />
                        
                        <span className="text-[10px] uppercase tracking-wider font-semibold">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-slate-100 dark:border-white/[0.06] pt-4 mt-2">
                  <div className="flex items-center gap-2 text-[9px] text-slate-400 dark:text-zinc-500 font-mono tracking-[0.2em] uppercase">
                    <span>System active</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Tab Workspaces */}
        <section className="flex-1 min-w-0 space-y-6 pb-10 md:pb-0">
          
          {/* Subscription Warning Banner */}
          {(localTenant.subscriptionStatus === "PAST_DUE" || localTenant.subscriptionStatus === "CANCELED") && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-none p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm select-none">
              <div className="flex gap-3">
                <ShieldAlert size={20} className="text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider">Upozornění k předplatnému</h4>
                  <p className="text-[10px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                    Vaše předplatné systému ReSys vypršelo nebo je po splatnosti (Stav: <span className="font-mono font-bold text-rose-500">{localTenant.subscriptionStatus}</span>). 
                    Vytváření nových rezervací je zablokováno. Prosím, vyřešte platbu pro odblokování.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("subscription")}
                className="w-full sm:w-auto px-4 py-2 bg-rose-500 text-white rounded-none text-[10px] font-bold uppercase tracking-wider hover:bg-rose-600 active:scale-95 transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-rose-500/15"
              >
                <CreditCard size={12} />
                Vyřešit platbu
              </button>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Mobile Ticket Scanner Quick Launch Banner */}
              <div className="p-5 bg-gradient-to-r from-tenant-primary/10 via-tenant-accent/5 to-transparent border border-tenant-primary/20 rounded-none relative overflow-hidden group">
                <div className="flex flex-row justify-between items-center gap-4 relative z-10">
                  <div className="space-y-1 flex-1">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2 select-none uppercase tracking-wider">
                      <Camera className="text-tenant-primary animate-pulse" size={14} />
                      Bleskové odbavení lístků (Mobilní skener)
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 max-w-xl leading-relaxed">
                      Otevřete profesionální celoobrazovkové rozhraní pro nepřetržité skenování QR kódů fotoaparátem s okamžitým zvukovým chrastěním, vibrací a automatickým pokračováním.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobileScannerOpen(true)}
                    className="h-16 w-16 shrink-0 bg-tenant-gradient hover:opacity-95 text-white rounded-none shadow-lg shadow-tenant-primary/25 transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center gap-1 border border-white/10"
                  >
                    <Camera size={20} className="animate-pulse" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Spustit</span>
                  </button>
                </div>
                {/* Glowing light effect */}
                <div className="absolute right-0 top-0 w-32 h-32 bg-tenant-primary/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
              </div>

              {/* Analytics Header Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {/* Resources Metric */}
                <div className="p-5 bg-white/45 dark:bg-[#0D0D15]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-none shadow-sm hover:border-tenant-primary/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:shadow-tenant-primary/5 flex items-center justify-between group relative overflow-hidden cursor-default">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-tenant-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-extrabold uppercase tracking-wider block group-hover:text-tenant-primary transition-colors duration-300">Zdroje</span>
                    <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-200 tracking-tight block">{resources.length}</span>
                  </div>
                  <div className="p-3.5 rounded-none bg-tenant-primary/10 dark:bg-tenant-primary/15 text-tenant-primary transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 flex items-center justify-center shrink-0">
                    <Building size={20} />
                  </div>
                </div>

                {/* Total Bookings Metric */}
                <div className="p-5 bg-white/45 dark:bg-[#0D0D15]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-none shadow-sm hover:border-tenant-primary/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:shadow-tenant-primary/5 flex items-center justify-between group relative overflow-hidden cursor-default">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-tenant-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-extrabold uppercase tracking-wider block group-hover:text-tenant-primary transition-colors duration-300">Rezervace celkem</span>
                    <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-200 tracking-tight block">{bookings.length}</span>
                  </div>
                  <div className="p-3.5 rounded-none bg-tenant-primary/10 dark:bg-tenant-primary/15 text-tenant-primary transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 flex items-center justify-center shrink-0">
                    <Calendar size={20} />
                  </div>
                </div>

                {/* IoT Gates Metric */}
                <div className="p-5 bg-white/45 dark:bg-[#0D0D15]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-none shadow-sm hover:border-tenant-primary/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:shadow-tenant-primary/5 flex items-center justify-between group relative overflow-hidden cursor-default">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-tenant-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-extrabold uppercase tracking-wider block group-hover:text-tenant-primary transition-colors duration-300">Vstupní brány</span>
                    <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-200 tracking-tight block">{devices.length}</span>
                  </div>
                  <div className="p-3.5 rounded-none bg-tenant-primary/10 dark:bg-tenant-primary/15 text-tenant-primary transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 flex items-center justify-center shrink-0">
                    <Smartphone size={20} />
                  </div>
                </div>

                {/* Turnstile Logs Metric */}
                <div className="p-5 bg-white/45 dark:bg-[#0D0D15]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-none shadow-sm hover:border-tenant-primary/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:shadow-tenant-primary/5 flex items-center justify-between group relative overflow-hidden cursor-default">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-tenant-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-extrabold uppercase tracking-wider block group-hover:text-tenant-primary transition-colors duration-300">Průchody turniketem</span>
                    <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-200 tracking-tight block">{checkinLogs.length}</span>
                  </div>
                  <div className="p-3.5 rounded-none bg-tenant-primary/10 dark:bg-tenant-primary/15 text-tenant-primary transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 flex items-center justify-center shrink-0">
                    <Activity size={20} />
                  </div>
                </div>
              </div>

              {/* Turnstile Access Logs Stream */}
              <div className="p-6 bg-white/35 dark:bg-[#09090F]/30 backdrop-blur-xl border border-slate-200/40 dark:border-[#1A1A2E]/50 border-l-[3px] border-l-tenant-primary rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1A1A2E]/60 pb-3">
                  <h4 className="text-xs font-black text-tenant-primary uppercase tracking-widest flex items-center gap-2 select-none">
                    <Activity size={14} />
                    Živé logy průchodů turniketem (Historie skenování)
                  </h4>
                  <span className="text-[9px] bg-slate-100 dark:bg-[#1A1A2E]/50 text-slate-500 dark:text-zinc-400 px-2 py-0.5 font-bold uppercase tracking-wider select-none border border-slate-200/30 dark:border-white/5">
                    Skenování a IoT
                  </span>
                </div>

                {checkinLogs.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground font-mono">
                    Zatím nebyly zaznamenány žádné průchody. K simulaci průchodu použijte POST /api/device/checkin.
                  </div>
                ) : (
                  <div>
                    {/* Desktop View Table */}
                    <div className="hidden md:block overflow-x-auto scrollbar-none">
                      <table className="w-full text-xs text-left border-collapse min-w-[600px]">
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
                                <span className={`px-2 py-0.5 rounded-none text-[9px] font-bold ${getResultBadgeColor(log.result)}`}>
                                  {log.result === "SUCCESS" ? "ÚSPĚCH" : log.result === "ALREADY_ATTENDED" ? "JIŽ POUŽITO" : "NEÚSPĚCH"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View List */}
                    <div className="block md:hidden space-y-3">
                      {checkinLogs.map((log) => (
                        <div key={log.id} className="p-4 bg-slate-50/50 dark:bg-[#131322]/20 border border-slate-200/50 dark:border-white/5 rounded-none space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">{formatUTCTime(log.scannedAt)}</span>
                            <span className={`px-2 py-0.5 rounded-none text-[9px] font-bold ${getResultBadgeColor(log.result)}`}>
                              {log.result === "SUCCESS" ? "ÚSPĚCH" : log.result === "ALREADY_ATTENDED" ? "JIŽ POUŽITO" : "NEÚSPĚCH"}
                            </span>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{log.userName}</div>
                            <div className="text-[10px] text-muted-foreground font-mono truncate">{log.userEmail}</div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-slate-100 dark:border-white/[0.04] pt-2 mt-1">
                            <div>
                              <span className="text-[8px] uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-extrabold block">Brána / Zařízení</span>
                              <span className="text-slate-700 dark:text-zinc-300 font-semibold">{log.deviceName}</span>
                            </div>
                            <div>
                              <span className="text-[8px] uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-extrabold block">Zdroj</span>
                              <span className="text-slate-700 dark:text-zinc-300 font-semibold">{log.resourceName}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Záznamy auditů (Audit Logs Trail) */}
              <div className="p-6 bg-white/35 dark:bg-[#09090F]/30 backdrop-blur-xl border border-slate-200/40 dark:border-[#1A1A2E]/50 border-l-[3px] border-l-tenant-primary rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1A1A2E]/60 pb-3">
                  <h4 className="text-xs font-black text-tenant-primary uppercase tracking-widest flex items-center gap-2 select-none">
                    <ClipboardList size={14} />
                    Záznamy auditů (Audit logs)
                  </h4>
                  <span className="text-[9px] bg-slate-100 dark:bg-[#1A1A2E]/50 text-slate-500 dark:text-zinc-400 px-2 py-0.5 font-bold uppercase tracking-wider select-none border border-slate-200/30 dark:border-white/5">
                    Systémový audit
                  </span>
                </div>

                {auditLogsLoading ? (
                  <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
                    Načítám auditní záznamy...
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground font-mono">
                    Žádné administrativní akce nebyly zatím zaznamenány.
                  </div>
                ) : (
                  <div className="overflow-x-auto scrollbar-none max-h-96 overflow-y-auto">
                    <table className="w-full text-xs text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b border-slate-200/50 dark:border-[#1F1F35]/30 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 font-semibold">Čas</th>
                          <th className="py-2.5 font-semibold">Uživatel</th>
                          <th className="py-2.5 font-semibold">Akce</th>
                          <th className="py-2.5 font-semibold">Objekt</th>
                          <th className="py-2.5 font-semibold">Podrobnosti</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="border-b border-slate-100/50 dark:border-[#1F1F35]/10 hover:bg-slate-55/50 dark:hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 font-mono text-muted-foreground">
                              {new Date(log.createdAt).toLocaleString("cs-CZ")}
                            </td>
                            <td className="py-3 font-semibold text-foreground">
                              {log.userName || "System"}
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded-none text-[9px] font-bold ${
                                log.action.includes("CREATE") 
                                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/25"
                                  : log.action.includes("DELETE") || log.action.includes("CANCEL")
                                    ? "bg-rose-500/10 text-rose-500 border border-rose-500/25"
                                    : "bg-blue-500/10 text-blue-500 border border-blue-500/25"
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="py-3 text-slate-700 dark:text-slate-350">
                              {log.entity} <code className="font-mono text-[9px] bg-secondary px-1 rounded-none">{log.entityId?.slice(0, 8)}</code>
                            </td>
                            <td className="py-3 text-muted-foreground font-mono text-[10px] max-w-xs truncate" title={JSON.stringify(log.payload)}>
                              {JSON.stringify(log.payload)}
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
                 {!isReceptionist ? (
                   <>
                     <button
                       onClick={() => setResourceModal({
                         open: true, mode: "add",
                         data: { id: "", name: "", type: "SPACE", maxCapacity: 10, instructor: "", room: "", parentId: "", surface: "", equipment: "", equipmentList: [], price: "", technicalBreak: false, technicalBreakMinutes: 15, autoLightingPricingEnabled: false, autoLightingFlatRate: "", autoLightingOffsetMinutes: 60, autoHeatingPricingEnabled: false, autoHeatingFlatRate: "", autoHeatingTempThreshold: 15 }
                       })}
                       className="hidden md:flex border border-tenant-primary/20 border-l-[3px] border-l-tenant-primary bg-tenant-primary/10 hover:bg-tenant-primary text-tenant-primary hover:text-white dark:hover:text-white text-[10px] py-2.5 px-4 rounded-none font-black uppercase tracking-widest transition-all duration-300 items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-tenant-primary/5 hover:scale-[1.02] active:scale-[0.98]"
                     >
                       <Plus size={14} />
                       Přidat zdroj
                     </button>
                     <button
                       onClick={() => setResourceModal({
                         open: true, mode: "add",
                         data: { id: "", name: "", type: "SPACE", maxCapacity: 10, instructor: "", room: "", parentId: "", surface: "", equipment: "", equipmentList: [], price: "", technicalBreak: false, technicalBreakMinutes: 15, autoLightingPricingEnabled: false, autoLightingFlatRate: "", autoLightingOffsetMinutes: 60, autoHeatingPricingEnabled: false, autoHeatingFlatRate: "", autoHeatingTempThreshold: 15 }
                       })}
                       className="flex md:hidden p-2.5 bg-tenant-primary/10 text-tenant-primary hover:bg-tenant-primary hover:text-white border border-tenant-primary/20 border-l-[3px] border-l-tenant-primary rounded-none active:scale-[0.95] transition-all cursor-pointer items-center justify-center shadow-sm"
                       title="Přidat zdroj"
                     >
                       <Plus size={16} />
                     </button>
                   </>
                 ) : (
                   <span className="text-rose-500 font-semibold text-[10px] uppercase tracking-wider">
                     Nemáte oprávnění přidávat zdroje.
                   </span>
                 )}
              </div>

              {/* Categorization display as trees */}
              <div className="space-y-8">
                {/* A. Facilities tree */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200/40 dark:border-[#1F1F35]/40 pb-3">
                    <h4 className="text-xs font-black text-tenant-primary uppercase tracking-widest flex items-center gap-2 select-none">
                      <Building size={14} />
                      Plochy a pronajímatelné prostory (Hřiště, Sektory, Místnosti)
                    </h4>
                    <span className="text-[9px] bg-slate-100 dark:bg-[#1A1A2E]/50 text-slate-500 dark:text-zinc-400 px-2 py-0.5 font-bold uppercase tracking-wider select-none border border-slate-200/30 dark:border-white/5">
                      PROSTORY
                    </span>
                  </div>
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
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between border-b border-slate-200/40 dark:border-[#1F1F35]/40 pb-3">
                    <h4 className="text-xs font-black text-tenant-primary uppercase tracking-widest flex items-center gap-2 select-none">
                      <Clock size={14} />
                      Dostupné lekce, kurzy a programy
                    </h4>
                    <span className="text-[9px] bg-slate-100 dark:bg-[#1A1A2E]/50 text-slate-500 dark:text-zinc-400 px-2 py-0.5 font-bold uppercase tracking-wider select-none border border-slate-200/30 dark:border-white/5">
                      LEKCE & KURZY
                    </span>
                  </div>
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
                <UnifiedSwitcher<"calendar" | "list">
                  options={[
                    { value: "calendar", label: "Mřížka rozvrhu" },
                    { value: "list", label: "Seznam detailů" }
                  ]}
                  activeValue={bookingsSubTab}
                  onChange={(val) => setBookingsSubTab(val)}
                />
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
                    parentId: r.attributes.parentId || null,
                    attributes: r.attributes,
                    scheduleRules: r.scheduleRules
                  }))}
                  openTime={tenant.attributes?.openTime || "08:00"}
                  closeTime={tenant.attributes?.closeTime || "22:00"}
                  openingHours={tenant.attributes?.openingHours || defaultOpeningHours}
                  isAdmin={true}
                  activeDate={activeDate}
                  weekStart={weekStart}
                  partners={partners}
                  dynamicQrEnabled={!!tenant.attributes?.dynamicQrEnabled}
                />
              ) : (
                /* List/Table View */
                <div className="p-6 bg-white/35 dark:bg-[#09090F]/30 backdrop-blur-xl border border-slate-200/40 dark:border-[#1A1A2E]/50 border-l-[3px] border-l-tenant-primary rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1A1A2E]/60 pb-3 mb-5">
                    <h4 className="text-xs font-black text-tenant-primary uppercase tracking-widest flex items-center gap-2 select-none">
                      <ClipboardList size={14} />
                      Seznam detailů všech rezervací
                    </h4>
                    <span className="text-[9px] bg-slate-100 dark:bg-[#1A1A2E]/50 text-slate-500 dark:text-zinc-400 px-2 py-0.5 font-bold uppercase tracking-wider select-none border border-slate-200/30 dark:border-white/5">
                      Rezervace
                    </span>
                  </div>
                  {bookings.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground font-mono">
                      Zatím nebyly provedeny žádné rezervace.
                    </div>
                  ) : (
                    <div>
                      {/* Desktop View Table */}
                      <div className="hidden md:block overflow-x-auto scrollbar-none">
                        <table className="w-full text-xs text-left border-collapse min-w-[650px]">
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
                                  <span className={`px-2 py-0.5 rounded-none text-[9px] font-bold ${getStatusBadgeColor(booking.status)}`}>
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
                                    className="px-2.5 py-1.5 rounded-none bg-red-500/10 hover:bg-red-500/15 text-red-500 border border-red-500/20 hover:scale-105 active:scale-95 transition-all text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    Zrušit
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile View List */}
                      <div className="block md:hidden space-y-3">
                        {bookings.map((booking) => (
                          <div key={booking.id} className="p-4 bg-slate-50/50 dark:bg-[#131322]/20 border border-slate-200/50 dark:border-white/5 rounded-none space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[8px] uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-extrabold block">Uživatel</span>
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{booking.userName}</div>
                                <div className="text-[10px] text-muted-foreground font-mono truncate">{booking.userEmail}</div>
                              </div>
                              <span className={`px-2 py-0.5 rounded-none text-[9px] font-bold ${getStatusBadgeColor(booking.status)}`}>
                                {booking.status === "CONFIRMED" ? "Potvrzeno" : booking.status === "PENDING_PAYMENT" ? "Čeká na platbu" : booking.status === "ATTENDED" ? "Odbaveno" : "Zrušeno"}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 dark:border-white/[0.04] pt-3">
                              <div>
                                <span className="text-[8px] uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-extrabold block">Zdroj</span>
                                <div className="font-semibold text-slate-700 dark:text-zinc-300 mt-0.5">{booking.resourceName}</div>
                              </div>
                              <div>
                                <span className="text-[8px] uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-extrabold block">Rezervace</span>
                                <div className="font-semibold text-slate-700 dark:text-zinc-300 mt-0.5 font-mono">
                                  {formatUTCDate(booking.reservedFrom)}
                                  <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">{formatUTCTimeRange(booking.reservedFrom, booking.reservedTo)}</div>
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-white/[0.04]">
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
                                className="w-full text-center py-3.5 rounded-none bg-red-500/10 hover:bg-red-500/15 text-red-500 border border-red-500/20 active:scale-95 transition-all text-xs font-bold"
                              >
                                Zrušit rezervaci
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: IoT DEVICES */}
          {activeTab === "devices" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-foreground">Přístupové čtečky a zařízení ({devices.length})</h3>
                {!isReceptionist && (
                  <>
                    <button
                      onClick={() => setDeviceModal({
                        open: true, mode: "add",
                        data: { id: "", name: "", token: "sec_tok_" + Math.random().toString(36).substring(3, 9), active: true }
                      })}
                      className="hidden md:flex bg-tenant-gradient hover:opacity-95 active:scale-95 transition-all text-white text-xs py-2 px-3.5 items-center justify-center gap-1.5 rounded-none font-bold shadow-sm shadow-tenant-primary/15 cursor-pointer"
                    >
                      <Plus size={14} />
                      Registrovat čtečku
                    </button>
                    <button
                      onClick={() => setDeviceModal({
                        open: true, mode: "add",
                        data: { id: "", name: "", token: "sec_tok_" + Math.random().toString(36).substring(3, 9), active: true }
                      })}
                      className="flex md:hidden p-2.5 bg-tenant-primary/10 text-tenant-primary border border-tenant-primary/20 rounded-none active:scale-95 transition-all cursor-pointer items-center justify-center shadow-sm"
                      title="Registrovat čtečku"
                    >
                      <Plus size={16} />
                    </button>
                  </>
                )}
              </div>

              {/* IoT Gate Pairing Panel */}
              <div className="p-6 bg-white/35 dark:bg-[#09090F]/30 backdrop-blur-xl border border-slate-200/40 dark:border-[#1A1A2E]/50 border-l-[3px] border-l-tenant-primary rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1A1A2E]/60 pb-3">
                  <h4 className="text-xs font-black text-tenant-primary uppercase tracking-widest flex items-center gap-2 select-none">
                    <QrCode size={14} />
                    Párování nové čtečky nebo brány
                  </h4>
                  <span className="text-[9px] bg-slate-100 dark:bg-[#1A1A2E]/50 text-slate-500 dark:text-zinc-400 px-2 py-0.5 font-bold uppercase tracking-wider select-none border border-slate-200/30 dark:border-white/5">
                    IoT Brány
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Pokud instalujete fyzickou čtečku, turniket nebo tablet u vstupu, vygenerujte párovací kód a zadejte jej do zařízení. Kód je platný po dobu 10 minut.
                </p>
                
                {isReceptionist ? (
                  <div className="text-rose-500 font-semibold text-[10px] uppercase tracking-wider">
                    Nemáte oprávnění generovat párovací kódy pro brány.
                  </div>
                ) : pairingState?.code ? (
                  <div className="flex items-center gap-4 bg-white/50 dark:bg-black/35 p-4 rounded-none border border-tenant-primary/30 w-fit">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">Párovací kód</span>
                      <strong className="text-xl font-mono tracking-widest text-tenant-primary">{pairingState.code}</strong>
                    </div>
                    <div className="h-8 w-px bg-slate-200 dark:bg-[#1F1F35]" />
                    <div className="text-[10px] text-slate-500 dark:text-zinc-450">
                      Název zařízení: <strong className="text-foreground">{pairingState.name}</strong>
                      <span className="block text-rose-500 font-semibold mt-0.5 animate-pulse">Platnost vyprší za 10 minut</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 items-end max-w-sm">
                    <div className="space-y-1 flex-1">
                      <label className="block text-[9px] text-slate-500 uppercase font-bold">Název nového zařízení</label>
                      <input
                        type="text"
                        placeholder="např. Hlavní vstupní brána"
                        value={newDevicePairName}
                        onChange={(e) => setNewDevicePairName(e.target.value)}
                        className="w-full text-xs py-2 px-3 bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all rounded-none outline-none shadow-sm text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newDevicePairName.trim()) {
                          alert("Zadejte prosím název zařízení.");
                          return;
                        }
                        try {
                          const res = await fetch("/api/admin", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "device_generate_pairing_code",
                              data: {
                                tenantId: tenant.id,
                                name: newDevicePairName
                              }
                            })
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setPairingState({ code: data.pairingCode, name: newDevicePairName });
                            setNewDevicePairName("");
                            router.refresh();
                          } else {
                            alert("Nepodařilo se vygenerovat párovací kód.");
                          }
                        } catch (err) {
                          console.error(err);
                          alert("Došlo k chybě při komunikaci se serverem.");
                        }
                      }}
                      className="border border-tenant-primary/20 border-l-[3px] border-l-tenant-primary bg-tenant-primary/10 hover:bg-tenant-primary text-tenant-primary hover:text-white dark:hover:text-white text-[10px] py-2.5 px-5 rounded-none font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] shrink-0"
                    >
                      Generovat kód
                    </button>
                  </div>
                )}
              </div>

              {devices.length === 0 ? (
                <div className="p-6 bg-white/35 dark:bg-[#09090F]/30 backdrop-blur-xl border border-slate-200/40 dark:border-[#1A1A2E]/50 border-l-[3px] border-l-tenant-primary rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1A1A2E]/60 pb-3">
                    <h4 className="text-xs font-black text-tenant-primary uppercase tracking-widest flex items-center gap-2 select-none">
                      <Smartphone size={14} />
                      Registrované přístupové čtečky (0)
                    </h4>
                    <span className="text-[9px] bg-slate-100 dark:bg-[#1A1A2E]/50 text-slate-500 dark:text-zinc-400 px-2 py-0.5 font-bold uppercase tracking-wider select-none border border-slate-200/30 dark:border-white/5">
                      Zařízení
                    </span>
                  </div>
                  <div className="py-8 text-center text-xs text-muted-foreground font-mono bg-white/10 dark:bg-black/10 border border-slate-200/20 dark:border-[#1A1A2E]/20 rounded-none">
                    Zatím nejsou registrovány žádné čtečky. Spusťte nové zařízení s hlavičkou tenanta.
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-white/35 dark:bg-[#09090F]/30 backdrop-blur-xl border border-slate-200/40 dark:border-[#1A1A2E]/50 border-l-[3px] border-l-tenant-primary rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1A1A2E]/60 pb-3 mb-4">
                    <h4 className="text-xs font-black text-tenant-primary uppercase tracking-widest flex items-center gap-2 select-none">
                      <Smartphone size={14} />
                      Registrované přístupové čtečky ({devices.length})
                    </h4>
                    <span className="text-[9px] bg-slate-100 dark:bg-[#1A1A2E]/50 text-slate-500 dark:text-zinc-400 px-2 py-0.5 font-bold uppercase tracking-wider select-none border border-slate-200/30 dark:border-white/5">
                      Zařízení
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                  {devices.map((dev) => (
                    <div key={dev.id} className="p-4 bg-white/45 dark:bg-[#0D0D15]/40 border border-slate-200/50 dark:border-[#1F1F35] rounded-none shadow-sm hover:scale-[1.01] hover:border-tenant-primary/20 hover:shadow-md transition-all duration-300 flex items-center justify-between gap-3 group">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Device Icon in a Glass Circle */}
                        <div className="p-3 rounded-none bg-slate-100/60 dark:bg-white/[0.03] text-slate-500 dark:text-zinc-400 group-hover:text-tenant-primary group-hover:bg-tenant-primary/5 dark:group-hover:bg-tenant-primary/10 transition-colors shrink-0">
                          <Smartphone size={18} />
                        </div>
                        
                        {/* Device Details */}
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-snug group-hover:text-tenant-primary transition-colors truncate">
                              {dev.name}
                            </h4>
                            <span className={`px-1.5 py-0.5 rounded-none text-[8px] font-extrabold tracking-wide uppercase leading-none ${
                              dev.active 
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                                : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/25"
                            }`}>
                              {dev.active ? "Aktivní" : "Vypnuto"}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400 dark:text-zinc-500">
                            <span>ID: <span className="font-mono uppercase">{dev.id}</span></span>
                            <span>•</span>
                            <span>Průchody: <strong className="text-slate-700 dark:text-zinc-300 font-mono">{dev.logsCount}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {!isReceptionist && (
                        <div className="flex items-center gap-1.5 shrink-0 select-none">
                          <button
                            onClick={() => setDeviceModal({
                              open: true,
                              mode: "edit",
                              data: { id: dev.id, name: dev.name, token: "", active: dev.active }
                            })}
                            className="p-3 md:p-2 rounded-none bg-slate-50 dark:bg-[#131322]/40 text-slate-500 dark:text-zinc-400 hover:text-tenant-primary hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-slate-200/50 dark:border-white/5 active:scale-95 transition-all shadow-sm cursor-pointer flex items-center justify-center"
                            title="Upravit nastavení"
                          >
                            <Edit className="h-4 w-4 md:h-3.5 md:w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeviceDelete(dev.id)}
                            className="p-3 md:p-2 rounded-none bg-slate-50 dark:bg-[#131322]/40 text-slate-500 dark:text-zinc-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 border border-slate-200/50 dark:border-white/5 active:scale-95 transition-all shadow-sm cursor-pointer flex items-center justify-center"
                            title="Odebrat"
                          >
                            <Trash className="h-4 w-4 md:h-3.5 md:w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

          {/* TAB: SYSTEM UPDATES */}
          {activeTab === "updates" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-foreground">Systémové aktualizace</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Historie a přehled jednotlivých verzí aplikace a jejich změn.</p>
              </div>
              <SystemUpdatesList variant="tenant" />
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
                <div className="p-6 bg-white/35 dark:bg-[#09090F]/30 backdrop-blur-xl border border-slate-200/40 dark:border-[#1A1A2E]/50 border-l-[3px] border-l-tenant-primary rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1A1A2E]/60 pb-3">
                    <h4 className="text-xs font-black text-tenant-primary uppercase tracking-widest flex items-center gap-2 select-none">
                      <Building size={14} />
                      Vizuální styl, branding a přístupy
                    </h4>
                    <span className="text-[9px] bg-slate-100 dark:bg-[#1A1A2E]/50 text-slate-500 dark:text-zinc-400 px-2 py-0.5 font-bold uppercase tracking-wider select-none border border-slate-200/30 dark:border-white/5">
                      Vzhled a AI
                    </span>
                  </div>
                  
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
                            className="w-full bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all rounded-none pl-9 pr-3 py-2 text-xs outline-none shadow-sm"
                            placeholder="např. Volnočasové výtvarné a kreativní ateliéry"
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1.5 block font-medium">
                          Nahradí výchozí slogan na hlavním uvítacím banneru.
                        </span>
                      </div>

                      <div>
                        <label className="block text-slate-500 dark:text-zinc-400 mb-1.5 font-bold uppercase tracking-wider text-[9px]">Lokalita / Město areálu</label>
                        <div className="relative flex items-center">
                          <MapPin size={14} className="absolute left-3 text-slate-400 dark:text-zinc-500" />
                          <input
                            type="text"
                            value={settingsLocation}
                            onChange={(e) => setSettingsLocation(e.target.value)}
                            className="w-full bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all rounded-none pl-9 pr-3 py-2 text-xs outline-none shadow-sm"
                            placeholder="např. Pardubice"
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1.5 block font-medium">
                          Slouží pro automatický výpočet západu slunce a předpověď počasí pro dynamic pricing.
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
                            className="w-full bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all rounded-none pl-9 pr-3 py-2.5 text-xs font-mono outline-none shadow-sm resize-none"
                            placeholder="josef.novak@deepvision.cz, admin@sferapardubice.cz"
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1.5 block font-medium">
                          Seznam emailů oddělených čárkou. Přihlášené administrátorské účty se musí shodovat.
                        </span>
                      </div>

                      {/* Instrukce pro AI (ReKeepera) */}
                      <div className="border border-slate-200/50 dark:border-[#2A2A40] p-4 space-y-3 rounded-none bg-slate-50/30 dark:bg-black/10">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1A1A2E]/60 pb-2">
                          <h5 className="text-[10px] font-black text-tenant-primary uppercase tracking-wider flex items-center gap-1.5 select-none">
                            <Sparkles size={12} className="text-tenant-primary animate-pulse" />
                            Instrukce pro AI (ReKeepera)
                          </h5>
                          <span className="text-[8px] bg-tenant-primary/10 border border-tenant-primary/20 text-tenant-primary px-1.5 py-0.5 font-bold uppercase tracking-wider select-none">
                            ReKeeper Assistant
                          </span>
                        </div>
                        <div className="relative">
                          <textarea
                            rows={3}
                            value={settingsAiInstructions}
                            onChange={(e) => setSettingsAiInstructions(e.target.value)}
                            className="w-full bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all rounded-none px-3 py-2.5 text-xs outline-none shadow-sm resize-none"
                            placeholder="Upřesněte kontext, tón a specifická pravidla pro ReKeepera. Např. 'Jsme fotbalový areál s umělou trávou. Máme Celou plochu a dva sektory (Sektor A, Sektor B). Zaměřujeme se na fotbalové pronájmy.'"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-550 leading-normal block">
                          Pomáhá AI asistentovi přizpůsobit slovní zásobu a chování (např. zda se jedná o fotbal, tenis, masáže atd.).
                        </span>
                      </div>

                      {/* Dynamické QR kódy */}
                      <div className="border border-slate-200/50 dark:border-[#2A2A40] p-4 space-y-3 rounded-none bg-slate-50/30 dark:bg-black/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <label className="block text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[9px] cursor-pointer" htmlFor="dynamic-qr-switch">
                              Zabezpečení dynamickými QR kódy
                            </label>
                            {/* Hover Help Info Tooltip */}
                            <div className="relative group/tooltip inline-block">
                              <HelpCircle size={13} className="text-slate-400 hover:text-tenant-primary transition-colors cursor-help" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 dark:bg-zinc-900 border border-slate-700/50 dark:border-zinc-800 text-white text-[10px] rounded-none shadow-xl leading-relaxed opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50">
                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-zinc-900"></div>
                                <span className="font-bold text-tenant-primary block mb-1">Co přináší dynamické QR kódy?</span>
                                Dynamický QR kód se v mobilu zákazníka každých 15 sekund kryptograficky obměňuje. Tím se zabrání tomu, aby zákazníci sdíleli statické snímky obrazovky (screenshoty) s cizími osobami a obcházeli zabezpečení areálu.
                              </div>
                            </div>
                          </div>
                          
                          {/* Toggle Switch */}
                          <button
                            type="button"
                            id="dynamic-qr-switch"
                            onClick={() => setSettingsDynamicQr(!settingsDynamicQr)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-tenant-primary/20 ${
                              settingsDynamicQr ? "bg-tenant-primary" : "bg-slate-200 dark:bg-zinc-800"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                settingsDynamicQr ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 leading-normal block">
                          Pokud je aktivní, čtečky u vstupů povolí přístup pouze s platným a čerstvě vygenerovaným QR kódem. Statické QR kódy/obrázky budou odmítnuty.
                        </span>
                      </div>
                    </div>

                    {/* Right Column: Banner Drag Widget */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[9px]">Obrázek banneru portálu</label>
                        {settingsBannerImage && (
                          <span className="text-[9px] bg-tenant-primary/10 border border-tenant-primary/25 text-tenant-primary px-2.5 py-0.5 rounded-none font-bold select-none animate-pulse">
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
                        className={`relative group rounded-none overflow-hidden border border-slate-200/50 dark:border-[#1F1F35] h-[166px] select-none ${
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
                          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/10 text-white py-1 px-2.5 rounded-none text-[9px] font-bold flex items-center gap-1.5 opacity-75 pointer-events-none group-hover:opacity-100 transition-opacity">
                            <Move size={11} />
                            Tažením posunete výřez
                          </div>
                        )}

                        <div className="absolute right-3 bottom-3 bg-black/40 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20">
                          <label className="p-2 bg-white/90 dark:bg-[#0D0D15]/90 text-zinc-950 dark:text-zinc-50 backdrop-blur-md border border-white/20 dark:border-[#1F1F35] rounded-none cursor-pointer shadow-md text-[11px] font-bold flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all">
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
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1.5 block font-medium">
                        Nahrajte obrázek banneru (PNG/JPG). Kliknutím a tažením přímo na obrázku výše nastavíte jeho pozici.
                      </span>

                      {/* Suggested Banners Presets Grid */}
                      <div className="space-y-2.5 mt-5">
                        <label className="block text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[9px] select-none">
                          Rychlé motivy banneru
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { url: "/images/hero-vibe-1.png", label: "Tenis" },
                            { url: "/images/hero-vibe-2.png", label: "Běh" },
                            { url: "/images/hero-vibe-3.png", label: "Hala" },
                            { url: "/images/hero-vibe-4.png", label: "Wellness" },
                            { url: "/images/hero-vibe-5.png", label: "Studio" },
                            { url: "/images/hero-vibe-6.png", label: "Kultura" }
                          ].map((p, idx) => {
                            const getVibeNumber = (src: string | null | undefined) => {
                              if (!src) return null;
                              const match = src.match(/hero-vibe-(\d+)/);
                              return match ? match[1] : null;
                            };
                            const isSelected = getVibeNumber(settingsBannerImage) === getVibeNumber(p.url);
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setSettingsBannerImage(p.url);
                                  setSettingsBannerPosition("50% 50%"); // Reset to default center position
                                }}
                                className="group flex flex-col items-center focus:outline-none cursor-pointer"
                              >
                                <div className={`relative w-full aspect-[16/10] rounded-none overflow-hidden border transition-all duration-200 ${
                                  isSelected 
                                    ? "border-tenant-primary ring-2 ring-tenant-primary/20 shadow-md scale-[1.02]" 
                                    : "border-slate-200 dark:border-[#2A2A40] hover:border-slate-350 dark:hover:border-zinc-700 hover:scale-[1.01]"
                                }`}>
                                  <img 
                                    src={p.url} 
                                    alt={p.label} 
                                    className="w-full h-full object-cover pointer-events-none transition-transform duration-500 group-hover:scale-105" 
                                  />
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md py-1 px-1.5 flex items-center justify-center">
                                    <span className={`text-[8.5px] font-extrabold uppercase tracking-widest transition-colors ${
                                      isSelected ? "text-tenant-primary font-black" : "text-white"
                                    }`}>
                                      {p.label}
                                    </span>
                                  </div>
                                  {isSelected && (
                                    <div className="absolute top-1 right-1 bg-tenant-primary text-white p-0.5 rounded-none flex items-center justify-center shadow-sm z-10">
                                      <Check size={8} className="stroke-[3]" />
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>


                {/* Save button - Outside Card at bottom */}
                <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3 pt-4">
                  {!isReceptionist ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowOnboarding(true)}
                        className="w-full sm:w-auto border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 text-purple-400 text-xs py-2.5 px-5 rounded-none font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles size={14} />
                        Spustit průvodce nastavením
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingSettings}
                        className="w-full sm:w-auto bg-tenant-gradient hover:opacity-95 active:scale-95 transition-all text-white text-xs py-2.5 px-5 rounded-none font-bold shadow-md shadow-tenant-primary/15 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <Save size={14} />
                        {isSavingSettings ? "Ukládání..." : "Uložit nastavení portálu"}
                      </button>
                    </>
                  ) : (
                    <div className="text-rose-500 font-semibold text-[10px] uppercase tracking-wider">
                      Nemáte oprávnění ukládat nastavení portálu ani spouštět průvodce.
                    </div>
                  )}
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

              {/* Branch/Location Selection Tabs */}
              {(() => {
                const firstLevelResources = resources.filter(r => !r.attributes?.parentId);
                if (firstLevelResources.length === 0) return null;
                const options = firstLevelResources.map(res => ({
                  value: res.id,
                  label: res.name
                }));
                return (
                  <UnifiedSwitcher<string>
                    options={options}
                    activeValue={selectedOperatingResourceId}
                    onChange={(val) => {
                      setSelectedOperatingResourceId(val);
                      const res = firstLevelResources.find(r => r.id === val);
                      if (res) {
                        const params = new URLSearchParams(window.location.search);
                        const slug = `${slugify(res.name)}-${res.id.slice(0, 8)}`;
                        params.set("root", slug);
                        params.delete("rootId");
                        router.push(`${pathname}?${params.toString()}`, { scroll: false });
                      }
                    }}
                  />
                );
              })()}

              <form onSubmit={handleSettingsSubmit} className="space-y-6 text-xs">
                {/* CARD 2: Provozní doba */}
                <div className="p-6 bg-white/35 dark:bg-[#09090F]/30 backdrop-blur-xl border border-slate-200/40 dark:border-[#1A1A2E]/50 border-l-[3px] border-l-tenant-primary rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1A1A2E]/60 pb-3">
                    <h4 className="text-xs font-black text-tenant-primary uppercase tracking-widest flex items-center gap-2 select-none">
                      <Clock size={14} />
                      Provozní doba a kalendářní omezení
                    </h4>
                    <span className="text-[9px] bg-slate-100 dark:bg-[#1A1A2E]/50 text-slate-500 dark:text-zinc-400 px-2 py-0.5 font-bold uppercase tracking-wider select-none border border-slate-200/30 dark:border-white/5">
                      Rozvrh a kalendář
                    </span>
                  </div>
                  
                  {/* Top operational row: Display range next to presets bar */}
                  <div className="grid lg:grid-cols-3 gap-6">
                    {/* Left Column (1/3): Calendar View Range */}
                    <div className="p-5 bg-white/60 dark:bg-[#0D0D15]/20 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-none space-y-4 shadow-sm flex flex-col justify-between">
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
                                    onChange: (val) => setSettingsOpenTime(val),
                                    maxTime: settingsCloseTime < earliestOpeningHour ? settingsCloseTime : earliestOpeningHour
                                  });
                                }}
                                className="w-full bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] transition-all rounded-none pl-7 pr-6 py-1.5 text-center font-mono text-xs outline-none shadow-sm cursor-pointer flex items-center justify-center text-slate-800 dark:text-slate-200 font-medium hover:bg-white/80 dark:hover:bg-[#1B1B2B]/75"
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
                                    onChange: (val) => setSettingsCloseTime(val),
                                    minTime: settingsOpenTime > latestClosingHour ? settingsOpenTime : latestClosingHour
                                  });
                                }}
                                className="w-full bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] transition-all rounded-none pl-7 pr-6 py-1.5 text-center font-mono text-xs outline-none shadow-sm cursor-pointer flex items-center justify-center text-slate-800 dark:text-slate-200 font-medium hover:bg-white/80 dark:hover:bg-[#1B1B2B]/75"
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
                    <div className="lg:col-span-2 p-5 bg-white/60 dark:bg-[#0D0D15]/20 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-none space-y-4 shadow-sm hover:border-tenant-primary/10 transition-all duration-300">
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
                                  onChange: (val) => setPresetOpenTime(val),
                                  maxTime: presetCloseTime
                                });
                              }}
                              className="w-full bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] transition-all rounded-none pl-7 pr-6 py-1.5 text-center font-mono text-foreground outline-none shadow-sm cursor-pointer flex items-center justify-center font-medium hover:bg-white/80 dark:hover:bg-[#1B1B2B]/75 text-xs text-slate-800 dark:text-slate-200"
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
                                  onChange: (val) => setPresetCloseTime(val),
                                  minTime: presetOpenTime
                                });
                              }}
                              className="w-full bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] transition-all rounded-none pl-7 pr-6 py-1.5 text-center font-mono text-foreground outline-none shadow-sm cursor-pointer flex items-center justify-center font-medium hover:bg-white/80 dark:hover:bg-[#1B1B2B]/75 text-xs text-slate-800 dark:text-slate-200"
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
                            <div className="w-9 h-5 bg-slate-200/50 dark:bg-black/60 rounded-none peer peer-checked:bg-red-500/10 peer-checked:border-red-500/20 border border-slate-300 dark:border-zinc-700 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 dark:after:bg-zinc-500 peer-checked:after:bg-red-500 after:rounded-none after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
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
                          className="px-3 py-1.5 text-[10px] font-bold rounded-none bg-white/65 dark:bg-[#131322]/65 hover:bg-tenant-primary hover:text-white dark:hover:bg-tenant-primary border border-slate-200/50 dark:border-[#1F1F35] text-slate-700 dark:text-zinc-300 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                        >
                          <Calendar size={12} />
                          Použít pro každý den
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPresetToDays([1, 2, 3, 4, 5])}
                          className="px-3 py-1.5 text-[10px] font-bold rounded-none bg-white/65 dark:bg-[#131322]/65 hover:bg-tenant-primary hover:text-white dark:hover:bg-tenant-primary border border-slate-200/50 dark:border-[#1F1F35] text-slate-700 dark:text-zinc-300 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                        >
                          <List size={12} />
                          Použít pro všední dny
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPresetToDays([6, 0])}
                          className="px-3 py-1.5 text-[10px] font-bold rounded-none bg-white/65 dark:bg-[#131322]/65 hover:bg-tenant-primary hover:text-white dark:hover:bg-tenant-primary border border-slate-200/50 dark:border-[#1F1F35] text-slate-700 dark:text-zinc-300 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                        >
                          <Users size={12} />
                          Použít pro víkendy
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Opening hours list / table */}
                  <div>
                    {/* Desktop View Table */}
                    <div className="hidden md:block overflow-x-auto scrollbar-none border border-slate-200/50 dark:border-[#1F1F35] rounded-none bg-white/45 dark:bg-[#0D0D15]/40 backdrop-blur-xl shadow-sm">
                      <table className="w-full text-left border-collapse text-xs min-w-[550px]">
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
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none text-[10px] font-bold bg-slate-100 dark:bg-[#131322]/80 border border-slate-200/40 dark:border-[#1F1F35] text-slate-700 dark:text-zinc-300 select-none">
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
                                          const updated = settingsOpeningHours.map((day, i) =>
                                            i === idx ? { ...day, openTime: val } : day
                                          );
                                          setSettingsOpeningHours(updated);
                                        },
                                        maxTime: day.closeTime
                                      });
                                    }}
                                    className="w-full bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] rounded-none pl-7 pr-6 py-1.5 text-center font-mono disabled:opacity-30 text-foreground outline-none transition-all shadow-sm cursor-pointer flex items-center justify-center font-medium hover:bg-white/80 dark:hover:bg-[#1B1B2B]/75 text-xs disabled:pointer-events-none text-slate-800 dark:text-slate-200"
                                  >
                                    {day.openTime}
                                    <ChevronDown size={10} className="absolute right-2 text-slate-405 dark:text-zinc-500 pointer-events-none" />
                                  </button>
                                </div>
                              </td>
                              <td className="py-4 px-5">
                                <div className="relative flex items-center w-24">
                                  <Clock size={11} className={`absolute left-2.5 transition-colors pointer-events-none ${day.closed ? "text-slate-300 dark:text-zinc-700" : "text-slate-405 dark:text-zinc-500"}`} />
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
                                          const updated = settingsOpeningHours.map((day, i) =>
                                            i === idx ? { ...day, closeTime: val } : day
                                          );
                                          setSettingsOpeningHours(updated);
                                        },
                                        minTime: day.openTime
                                      });
                                    }}
                                    className="w-full bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] rounded-none pl-7 pr-6 py-1.5 text-center font-mono disabled:opacity-30 text-foreground outline-none transition-all shadow-sm cursor-pointer flex items-center justify-center font-medium hover:bg-white/80 dark:hover:bg-[#1B1B2B]/75 text-xs disabled:pointer-events-none text-slate-800 dark:text-slate-200"
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
                                        const updated = settingsOpeningHours.map((day, i) =>
                                          i === idx ? { ...day, closed: e.target.checked } : day
                                        );
                                        setSettingsOpeningHours(updated);
                                      }}
                                      className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-200/50 dark:bg-black/60 rounded-none peer peer-checked:bg-red-500/10 peer-checked:border-red-500/20 border border-slate-300 dark:border-zinc-700 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 dark:after:bg-zinc-500 peer-checked:after:bg-red-500 after:rounded-none after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
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

                    {/* Mobile View List */}
                    <div className="block md:hidden space-y-3">
                      {settingsOpeningHours.map((day, idx) => (
                        <div key={day.dayOfWeek} className={`p-4 bg-white/45 dark:bg-[#0D0D15]/40 border border-slate-200/50 dark:border-[#1F1F35] rounded-none space-y-3.5 transition-all ${day.closed ? "opacity-55" : ""}`}>
                          <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/[0.04] pb-2">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                              {day.name}
                            </span>
                            
                            <div className="select-none">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={day.closed}
                                  onChange={(e) => {
                                    const updated = settingsOpeningHours.map((day, i) =>
                                      i === idx ? { ...day, closed: e.target.checked } : day
                                    );
                                    setSettingsOpeningHours(updated);
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-200/50 dark:bg-black/60 rounded-none peer peer-checked:bg-red-500/10 peer-checked:border-red-500/20 border border-slate-300 dark:border-zinc-700 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 dark:after:bg-zinc-500 peer-checked:after:bg-red-500 after:rounded-none after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                                <span className={`ml-2 text-[9px] font-bold tracking-wide transition-colors ${day.closed ? "text-red-500" : "text-emerald-500"}`}>
                                  {day.closed ? "Zavřeno" : "Otevřeno"}
                                </span>
                              </label>
                            </div>
                          </div>

                          {!day.closed && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-slate-500 dark:text-zinc-500 mb-1 font-bold uppercase tracking-wider text-[8px]">Otevírá</label>
                                <div className="relative flex items-center">
                                  <Clock size={11} className="absolute left-2.5 text-slate-405 dark:text-zinc-500 pointer-events-none" />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setActiveTimePicker({
                                        id: `day-${idx}-openTime`,
                                        rect,
                                        value: day.openTime,
                                        onChange: (val) => {
                                          const updated = settingsOpeningHours.map((day, i) =>
                                            i === idx ? { ...day, openTime: val } : day
                                          );
                                          setSettingsOpeningHours(updated);
                                        },
                                        maxTime: day.closeTime
                                      });
                                    }}
                                    className="w-full bg-white/50 dark:bg-black/35 border border-slate-200/50 dark:border-[#2A2A40] focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] rounded-none pl-7 pr-3 py-2 text-left font-mono text-xs outline-none transition-all cursor-pointer flex items-center justify-between text-slate-800 dark:text-slate-200"
                                  >
                                    {day.openTime}
                                    <ChevronDown size={10} className="text-slate-400 dark:text-zinc-500 pointer-events-none" />
                                  </button>
                                </div>
                              </div>
                              
                              <div>
                                <label className="block text-slate-500 dark:text-zinc-500 mb-1 font-bold uppercase tracking-wider text-[8px]">Zavírá</label>
                                <div className="relative flex items-center">
                                  <Clock size={11} className="absolute left-2.5 text-slate-405 dark:text-zinc-500 pointer-events-none" />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setActiveTimePicker({
                                        id: `day-${idx}-closeTime`,
                                        rect,
                                        value: day.closeTime,
                                        onChange: (val) => {
                                          const updated = settingsOpeningHours.map((day, i) =>
                                            i === idx ? { ...day, closeTime: val } : day
                                          );
                                          setSettingsOpeningHours(updated);
                                        },
                                        minTime: day.openTime
                                      });
                                    }}
                                    className="w-full bg-white/50 dark:bg-black/35 border border-slate-200/50 dark:border-[#2A2A40] focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] rounded-none pl-7 pr-3 py-2 text-left font-mono text-xs outline-none transition-all cursor-pointer flex items-center justify-between text-slate-800 dark:text-slate-200"
                                  >
                                    {day.closeTime}
                                    <ChevronDown size={10} className="text-slate-400 dark:text-zinc-500 pointer-events-none" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Save button - Outside Card at bottom */}
                <div className="flex justify-end pt-4">
                  {!isReceptionist ? (
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="bg-tenant-gradient hover:opacity-95 active:scale-95 transition-all text-white text-xs py-2.5 px-5 rounded-none font-bold shadow-md shadow-tenant-primary/15 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Save size={14} />
                      {isSavingSettings ? "Ukládání..." : "Uložit provozní dobu"}
                    </button>
                  ) : (
                    <div className="text-rose-500 font-semibold text-[10px] uppercase tracking-wider">
                      Nemáte oprávnění ukládat provozní dobu.
                    </div>
                  )}
                </div>
              </form>

              {/* CARD 3: Mimořádné uzavírky */}
              <div className="mt-8 p-6 bg-white/35 dark:bg-[#09090F]/30 backdrop-blur-xl border border-slate-200/40 dark:border-[#1A1A2E]/50 border-l-[3px] border-l-tenant-primary rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1A1A2E]/60 pb-3">
                  <h4 className="text-xs font-black text-tenant-primary uppercase tracking-widest flex items-center gap-2 select-none">
                    <ShieldAlert size={14} />
                    Mimořádné uzavírky a svátky
                  </h4>
                  <span className="text-[9px] bg-slate-100 dark:bg-[#1A1A2E]/50 text-slate-500 dark:text-zinc-400 px-2 py-0.5 font-bold uppercase tracking-wider select-none border border-slate-200/30 dark:border-white/5">
                    Uzavírky
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">Definujte jednorázové uzavírky, údržbu nebo svátky, kdy bude rezervační systém zablokován.</p>

                {/* Form to Create Exception */}
                {!isReceptionist && (
                  <form onSubmit={handleExceptionUpsert} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50/50 dark:bg-black/10 p-4 border border-slate-100 dark:border-slate-800/40">
                    {/* Row 1: Name & Resource */}
                    <div className="md:col-span-6 space-y-1">
                      <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">Název uzavírky</label>
                      <input
                        type="text"
                        required
                        value={newExceptionName}
                        onChange={(e) => setNewExceptionName(e.target.value)}
                        placeholder="Např. Státní svátek, Sanitární den"
                        className="w-full bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] rounded-none py-1.5 px-3 font-medium text-foreground focus:outline-none focus:border-tenant-primary text-xs h-[28px] outline-none transition-all shadow-sm"
                      />
                    </div>
                    
                    <div className="md:col-span-6 space-y-1">
                      <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">Rozsah (Zdroj)</label>
                      <div className="relative" ref={exceptionResourceDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsExceptionResourceDropdownOpen(!isExceptionResourceDropdownOpen)}
                          className="w-full bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] rounded-none py-1.5 px-3 text-left text-xs outline-none transition-all shadow-sm cursor-pointer flex items-center justify-between text-slate-800 dark:text-slate-200 font-medium h-[28px]"
                        >
                          <span>
                            {newExceptionResourceId === "global"
                              ? "Celý areál (Všechny zdroje)"
                              : resources.find((r) => r.id === newExceptionResourceId)?.name || "Celý areál (Všechny zdroje)"}
                          </span>
                          <ChevronDown size={10} className="text-slate-400 dark:text-zinc-500 pointer-events-none" />
                        </button>
                        
                        {isExceptionResourceDropdownOpen && (
                          <div className="absolute left-0 right-0 mt-1 bg-white/95 dark:bg-[#0D0D15]/95 backdrop-blur-xl border border-slate-200/60 dark:border-[#2A2A40] shadow-xl z-[100] rounded-none overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150 py-1">
                            <button
                              type="button"
                              onClick={() => {
                                setNewExceptionResourceId("global");
                                setIsExceptionResourceDropdownOpen(false);
                              }}
                              className={`w-full text-left py-2 px-3 transition-colors text-xs cursor-pointer border-b border-slate-100/30 dark:border-[#1F1F35]/20 last:border-0 ${
                                newExceptionResourceId === "global"
                                  ? "bg-tenant-primary/10 text-tenant-primary dark:text-[#A78BFA] font-medium"
                                  : "text-slate-700 dark:text-slate-350 hover:bg-slate-100/60 dark:hover:bg-[#1A1A2E]/60 font-medium"
                              }`}
                            >
                              Celý areál (Všechny zdroje)
                            </button>
                            {resources.map((res) => {
                              const isSelected = newExceptionResourceId === res.id;
                              return (
                                <button
                                  key={res.id}
                                  type="button"
                                  onClick={() => {
                                    setNewExceptionResourceId(res.id);
                                    setIsExceptionResourceDropdownOpen(false);
                                  }}
                                  className={`w-full text-left py-2 px-3 transition-colors text-xs cursor-pointer border-b border-slate-100/30 dark:border-[#1F1F35]/20 last:border-0 ${
                                    isSelected
                                      ? "bg-tenant-primary/10 text-tenant-primary dark:text-[#A78BFA] font-medium"
                                      : "text-slate-700 dark:text-slate-350 hover:bg-slate-100/60 dark:hover:bg-[#1A1A2E]/60 font-medium"
                                  }`}
                                >
                                  {res.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Starting Date/Time, Ending Date/Time, Submit Button */}
                    <div className="md:col-span-4 space-y-1">
                      <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">Od (Datum & Čas)</label>
                      <div className="flex gap-1.5 items-center">
                        <DatePicker
                          value={newExceptionDateFrom}
                          onChange={setNewExceptionDateFrom}
                        />
                        <div className="relative flex items-center w-24">
                          <Clock size={11} className="absolute left-2.5 text-slate-405 dark:text-zinc-500 pointer-events-none" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setActiveTimePicker({
                                id: "exception-time-from",
                                rect,
                                value: newExceptionTimeFrom,
                                onChange: setNewExceptionTimeFrom,
                                maxTime: (newExceptionDateFrom === newExceptionDateTo) ? newExceptionTimeTo : undefined
                              });
                            }}
                            className="w-full bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] rounded-none pl-7 pr-6 py-1.5 text-center font-mono text-foreground outline-none transition-all shadow-sm cursor-pointer flex items-center justify-center font-medium hover:bg-white/80 dark:hover:bg-[#1B1B2B]/75 text-xs text-slate-800 dark:text-slate-200 h-[28px]"
                          >
                            {newExceptionTimeFrom}
                            <ChevronDown size={10} className="absolute right-2 text-slate-405 dark:text-zinc-500 pointer-events-none" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-4 space-y-1">
                      <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">Do (Datum & Čas)</label>
                      <div className="flex gap-1.5 items-center">
                        <DatePicker
                          value={newExceptionDateTo}
                          onChange={setNewExceptionDateTo}
                          min={newExceptionDateFrom}
                        />
                        <div className="relative flex items-center w-24">
                          <Clock size={11} className="absolute left-2.5 text-slate-405 dark:text-zinc-500 pointer-events-none" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setActiveTimePicker({
                                id: "exception-time-to",
                                rect,
                                value: newExceptionTimeTo,
                                onChange: setNewExceptionTimeTo,
                                minTime: (newExceptionDateFrom === newExceptionDateTo) ? newExceptionTimeFrom : undefined
                              });
                            }}
                            className="w-full bg-white/50 dark:bg-black/30 border border-slate-200/50 dark:border-[#2A2A40] focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] rounded-none pl-7 pr-6 py-1.5 text-center font-mono text-foreground outline-none transition-all shadow-sm cursor-pointer flex items-center justify-center font-medium hover:bg-white/80 dark:hover:bg-[#1B1B2B]/75 text-xs text-slate-800 dark:text-slate-200 h-[28px]"
                          >
                            {newExceptionTimeTo}
                            <ChevronDown size={10} className="absolute right-2 text-slate-405 dark:text-zinc-500 pointer-events-none" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-4">
                      <button
                        type="submit"
                        disabled={isSavingException}
                        className="w-full border border-tenant-primary/25 border-l-[3px] border-l-tenant-primary bg-tenant-primary/10 hover:bg-tenant-primary hover:text-white text-tenant-primary dark:text-purple-300 font-bold text-xs h-[28px] rounded-none shadow-sm active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Plus size={13} />
                        Přidat výjimku
                      </button>
                    </div>
                  </form>
                )}

                {/* List of Exceptions */}
                <div className="space-y-3.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Naplánované uzavírky</span>
                  {exceptionsList.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-slate-200 dark:border-slate-800">
                      Nebyly naplánovány žádné mimořádné uzavírky.
                    </div>
                  ) : (
                    <div className="border border-slate-200/50 dark:border-[#1F1F35] bg-white/30 dark:bg-black/10 overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100/50 dark:bg-slate-900/50 text-slate-500 dark:text-zinc-400 font-bold border-b border-slate-200/40 dark:border-[#1F1F35]/40 uppercase tracking-wider text-[9px]">
                            <th className="py-2.5 px-4 font-bold">Název</th>
                            <th className="py-2.5 px-4 font-bold">Rozsah</th>
                            <th className="py-2.5 px-4 font-bold">Časové období (UTC)</th>
                            <th className="py-2.5 px-4 font-bold text-right">Akce</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exceptionsList.map((exc) => (
                            <tr key={exc.id} className="border-b border-slate-150/40 dark:border-white/[0.02] hover:bg-slate-50/5 dark:hover:bg-white/[0.02]">
                              <td className="py-3 px-4 font-bold text-foreground">{exc.name}</td>
                              <td className="py-3 px-4 font-medium text-slate-650 dark:text-slate-350">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold ${exc.resourceId ? "bg-purple-500/10 text-purple-400 border border-purple-500/15" : "bg-blue-500/10 text-blue-400 border border-blue-500/15"}`}>
                                  {exc.resourceName}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-650 dark:text-slate-350">
                                {formatUTCDate(exc.dateFrom)} {new Date(exc.dateFrom).getUTCHours().toString().padStart(2, '0')}:{new Date(exc.dateFrom).getUTCMinutes().toString().padStart(2, '0')}
                                {" – "}
                                {formatUTCDate(exc.dateTo)} {new Date(exc.dateTo).getUTCHours().toString().padStart(2, '0')}:{new Date(exc.dateTo).getUTCMinutes().toString().padStart(2, '0')}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {!isReceptionist ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmModal({
                                        title: "Odstranit výjimku?",
                                        message: `Opravdu chcete smazat mimořádnou uzavírku "${exc.name}"?`,
                                        onConfirm: () => handleExceptionDelete(exc.id)
                                      });
                                    }}
                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                                    title="Odstranit"
                                  >
                                    <Trash size={14} />
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-rose-500 font-semibold uppercase tracking-wider">Bez oprávnění</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "billing" && (
            <BillingTab
              tenant={tenant}
              partners={partners}
              invoices={invoices}
              bookings={bookings}
              users={users}
              router={router}
              theme={theme}
              onModalToggle={setIsBillingModalOpen}
            />
          )}

          {activeTab === "subscription" && (
            <div className="space-y-6 animate-fade-in select-none">
              {/* Premium Plan Info Header - Unified Card Wrapper */}
              <div className="p-6 bg-white/35 dark:bg-[#09090F]/30 backdrop-blur-xl border border-slate-200/40 dark:border-[#1A1A2E]/50 border-l-[3px] border-l-tenant-primary rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1A1A2E]/60 pb-3">
                  <h4 className="text-xs font-black text-tenant-primary uppercase tracking-widest flex items-center gap-2 select-none">
                    <CreditCard size={14} />
                    Předplatné a limity systému
                  </h4>
                  <span className="text-[9px] bg-slate-100 dark:bg-[#1A1A2E]/50 text-slate-500 dark:text-zinc-400 px-2 py-0.5 font-bold uppercase tracking-wider select-none border border-slate-200/30 dark:border-white/5">
                    Tarifní plán
                  </span>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-bold text-tenant-primary uppercase tracking-widest bg-tenant-primary/10 dark:bg-tenant-primary/20 px-2.5 py-1 rounded-none">
                      Předplatné systému
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    Aktuální plán: <span className="text-tenant-primary underline decoration-2 decoration-tenant-primary/45">{localTenant.subscriptionPlan === "FREE_TRIAL" ? "Free Trial" : localTenant.subscriptionPlan === "STARTER" ? "Starter" : localTenant.subscriptionPlan === "PRO" ? "Pro" : "Enterprise"}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5">
                    Stav předplatného: 
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-none font-bold text-[10px] ${
                      localTenant.subscriptionStatus === "ACTIVE" 
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                        : localTenant.subscriptionStatus === "TRIALING"
                        ? "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 animate-pulse"
                        : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                    }`}>
                      {localTenant.subscriptionStatus}
                    </span>
                  </p>
                </div>
                
                {/* Resource Usage Limits Progress Bars */}
                <div className="w-full md:w-80 bg-white/45 dark:bg-black/25 border border-slate-200/50 dark:border-[#2A2A40]/30 rounded-none p-4 space-y-3.5">
                  {/* Resources count meter */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-medium tracking-wide text-slate-400 dark:text-zinc-450">
                      <span className="flex items-center gap-1 font-semibold"><ClipboardList size={11} className="text-slate-405" /> Plochy & Zdroje</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-slate-700 dark:text-slate-200 font-bold">{resources.length}</span>
                        <span className="text-slate-400 dark:text-zinc-550">/</span>
                        <span className="text-slate-400 dark:text-zinc-550">{localTenant.maxResourcesLimit || 2}</span>
                        <span className="text-slate-400 dark:text-zinc-550 ml-1">({Math.min(100, Math.round((resources.length / (localTenant.maxResourcesLimit || 2)) * 100))}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200/50 dark:bg-black/40 rounded-none h-1.5 overflow-hidden border border-slate-300/10 dark:border-white/5">
                      <div 
                        className="h-full rounded-none bg-tenant-gradient transition-all duration-505"
                        style={{ width: `${Math.min(100, Math.round((resources.length / (localTenant.maxResourcesLimit || 2)) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* Devices count meter */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-medium tracking-wide text-slate-400 dark:text-zinc-455">
                      <span className="flex items-center gap-1 font-semibold"><QrCode size={11} className="text-slate-405" /> Čtečky a brány</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-slate-700 dark:text-slate-200 font-bold">{devices.length}</span>
                        <span className="text-slate-400 dark:text-zinc-555">/</span>
                        <span className="text-slate-400 dark:text-zinc-555">{localTenant.maxDevicesLimit || 1}</span>
                        <span className="text-slate-400 dark:text-zinc-555 ml-1">({Math.min(100, Math.round((devices.length / (localTenant.maxDevicesLimit || 1)) * 100))}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200/50 dark:bg-black/40 rounded-none h-1.5 overflow-hidden border border-slate-300/10 dark:border-white/5">
                      <div 
                        className="h-full rounded-none bg-tenant-gradient transition-all duration-505"
                        style={{ width: `${Math.min(100, Math.round((devices.length / (localTenant.maxDevicesLimit || 1)) * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

              {/* Pricing Cards Grid */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-705 dark:text-slate-200">Dostupné plány a navýšení limitů</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Tier 1: Free Trial */}
                  <div className={`relative flex flex-col justify-between p-5 rounded-none border transition-all ${
                    localTenant.subscriptionPlan === "FREE_TRIAL" 
                      ? "border-tenant-primary bg-tenant-primary/[0.02] dark:bg-tenant-primary/[0.04] shadow-md shadow-tenant-primary/5" 
                      : "border-slate-200/60 dark:border-[#2A2A40]/40 bg-white/40 dark:bg-[#0A0A10]/25 hover:border-slate-350 dark:hover:border-purple-900/35"
                  }`}>
                    {localTenant.subscriptionPlan === "FREE_TRIAL" && (
                      <div className="absolute -top-3 right-4 bg-tenant-gradient text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-none shadow-sm shadow-tenant-primary/15 uppercase tracking-wide">Aktivní</div>
                    )}
                    <div>
                      <h5 className="font-bold text-slate-800 dark:text-white text-sm">Free Trial</h5>
                      <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">Základní testovací verze</p>
                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-2xl font-extrabold text-slate-800 dark:text-white">0 Kč</span>
                        <span className="text-slate-400 dark:text-zinc-500 text-[10px]">/ měsíc</span>
                      </div>
                      
                      <ul className="mt-5 space-y-2.5 text-[11px] text-slate-600 dark:text-zinc-350 border-t border-slate-200/50 dark:border-[#1F1F35]/40 pt-4">
                        <li className="flex items-center gap-1.5"><Check size={11} className="text-emerald-500 shrink-0" /> Max <strong>2</strong> plochy / zdroje</li>
                        <li className="flex items-center gap-1.5"><Check size={11} className="text-emerald-500 shrink-0" /> Max <strong>1</strong> čtečka nebo brána</li>
                        <li className="flex items-center gap-1.5"><Check size={11} className="text-emerald-500 shrink-0" /> Základní pravidla kalendáře</li>
                        <li className="flex items-center gap-1.5 text-slate-405 dark:text-zinc-505"><X size={11} className="text-slate-300 dark:text-zinc-650 shrink-0" /> Bez partnerů a fakturace</li>
                      </ul>
                    </div>
                    
                    <button
                      disabled={localTenant.subscriptionPlan === "FREE_TRIAL"}
                      onClick={() => {
                        setSelectedPlanForUpgrade("FREE_TRIAL");
                        setIsUpgradeModalOpen(true);
                      }}
                      className={`mt-6 w-full text-center text-xs py-2.5 px-4 rounded-none font-bold transition-all cursor-pointer ${
                        localTenant.subscriptionPlan === "FREE_TRIAL"
                          ? "bg-slate-100 dark:bg-zinc-800/40 text-slate-400 dark:text-zinc-500 cursor-not-allowed border border-transparent"
                          : "bg-white dark:bg-black/35 hover:bg-slate-50 border border-slate-250 dark:border-[#2A2A40] text-slate-700 dark:text-zinc-305"
                      }`}
                    >
                      {localTenant.subscriptionPlan === "FREE_TRIAL" ? "Váš aktuální plán" : "Aktivovat Free Trial"}
                    </button>
                  </div>

                  {/* Tier 2: Starter */}
                  <div className={`relative flex flex-col justify-between p-5 rounded-none border transition-all ${
                    localTenant.subscriptionPlan === "STARTER" 
                      ? "border-tenant-primary bg-tenant-primary/[0.02] dark:bg-tenant-primary/[0.04] shadow-md shadow-tenant-primary/5" 
                      : "border-slate-200/60 dark:border-[#2A2A40]/40 bg-white/40 dark:bg-[#0A0A10]/25 hover:border-slate-350 dark:hover:border-purple-900/35"
                  }`}>
                    {localTenant.subscriptionPlan === "STARTER" && (
                      <div className="absolute -top-3 right-4 bg-tenant-gradient text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-none shadow-sm shadow-tenant-primary/15 uppercase tracking-wide">Aktivní</div>
                    )}
                    <div>
                      <h5 className="font-bold text-slate-800 dark:text-white text-sm">Starter</h5>
                      <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">Pro menší a začínající kluby</p>
                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-2xl font-extrabold text-slate-800 dark:text-white">490 Kč</span>
                        <span className="text-slate-400 dark:text-zinc-500 text-[10px]">/ měsíc</span>
                      </div>
                      
                      <ul className="mt-5 space-y-2.5 text-[11px] text-slate-600 dark:text-zinc-350 border-t border-slate-200/50 dark:border-[#1F1F35]/40 pt-4">
                        <li className="flex items-center gap-1.5"><Check size={11} className="text-emerald-500 shrink-0" /> Max <strong>5</strong> ploch / zdrojů</li>
                        <li className="flex items-center gap-1.5"><Check size={11} className="text-emerald-500 shrink-0" /> Max <strong>3</strong> čtečky nebo brány</li>
                        <li className="flex items-center gap-1.5"><Check size={11} className="text-emerald-500 shrink-0" /> Pokročilá pravidla kalendáře</li>
                        <li className="flex items-center gap-1.5"><Check size={11} className="text-emerald-500 shrink-0" /> Lidé, slevy a fakturace</li>
                      </ul>
                    </div>
                    
                    <button
                      disabled={localTenant.subscriptionPlan === "STARTER"}
                      onClick={() => {
                        setSelectedPlanForUpgrade("STARTER");
                        setIsUpgradeModalOpen(true);
                      }}
                      className={`mt-6 w-full text-center text-xs py-2.5 px-4 rounded-none font-bold transition-all cursor-pointer ${
                        localTenant.subscriptionPlan === "STARTER"
                          ? "bg-slate-100 dark:bg-zinc-800/40 text-slate-400 dark:text-zinc-500 cursor-not-allowed border border-transparent"
                          : "bg-white dark:bg-black/35 hover:bg-slate-50 border border-slate-250 dark:border-[#2A2A40] text-slate-700 dark:text-zinc-305"
                      }`}
                    >
                      {localTenant.subscriptionPlan === "STARTER" ? "Váš aktuální plán" : "Aktivovat Starter"}
                    </button>
                  </div>

                  {/* Tier 3: Pro */}
                  <div className={`relative flex flex-col justify-between p-5 rounded-none border transition-all ${
                    localTenant.subscriptionPlan === "PRO" 
                      ? "border-tenant-primary bg-tenant-primary/[0.02] dark:bg-tenant-primary/[0.04] shadow-md shadow-tenant-primary/5" 
                      : "border-slate-200/60 dark:border-[#2A2A40]/40 bg-white/40 dark:bg-[#0A0A10]/25 hover:border-slate-355 dark:hover:border-purple-900/35"
                  }`}>
                    {localTenant.subscriptionPlan === "PRO" && (
                      <div className="absolute -top-3 right-4 bg-tenant-gradient text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-none shadow-sm shadow-tenant-primary/15 uppercase tracking-wide">Aktivní</div>
                    )}
                    <div className="absolute -top-3 left-4 bg-amber-500 text-white text-[8px] font-extrabold px-2.5 py-0.5 rounded-none shadow-sm uppercase tracking-wide">Nejpopulárnější</div>
                    <div>
                      <h5 className="font-bold text-slate-800 dark:text-white text-sm">Pro</h5>
                      <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">Pro aktivní sportovní centra</p>
                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-2xl font-extrabold text-slate-800 dark:text-white">990 Kč</span>
                        <span className="text-slate-400 dark:text-zinc-500 text-[10px]">/ měsíc</span>
                      </div>
                      
                      <ul className="mt-5 space-y-2.5 text-[11px] text-slate-600 dark:text-zinc-350 border-t border-slate-200/50 dark:border-[#1F1F35]/40 pt-4">
                        <li className="flex items-center gap-1.5"><Check size={11} className="text-emerald-500 shrink-0" /> Max <strong>15</strong> ploch / zdrojů</li>
                        <li className="flex items-center gap-1.5"><Check size={11} className="text-emerald-500 shrink-0" /> Max <strong>10</strong> čteček nebo bran</li>
                        <li className="flex items-center gap-1.5"><Check size={11} className="text-emerald-500 shrink-0" /> Prioritní e-mailová podpora</li>
                        <li className="flex items-center gap-1.5"><Check size={11} className="text-emerald-500 shrink-0" /> Plný přístup k logům a auditům</li>
                      </ul>
                    </div>
                    
                    <button
                      disabled={localTenant.subscriptionPlan === "PRO"}
                      onClick={() => {
                        setSelectedPlanForUpgrade("PRO");
                        setIsUpgradeModalOpen(true);
                      }}
                      className={`mt-6 w-full text-center text-xs py-2.5 px-4 rounded-none font-bold transition-all cursor-pointer ${
                        localTenant.subscriptionPlan === "PRO"
                          ? "bg-slate-100 dark:bg-zinc-800/40 text-slate-400 dark:text-zinc-500 cursor-not-allowed border border-transparent"
                          : "bg-white dark:bg-black/35 hover:bg-slate-50 border border-slate-250 dark:border-[#2A2A40] text-slate-700 dark:text-zinc-305"
                      }`}
                    >
                      {localTenant.subscriptionPlan === "PRO" ? "Váš aktuální plán" : "Aktivovat Pro"}
                    </button>
                  </div>

                  {/* Tier 4: Enterprise */}
                  <div className={`relative flex flex-col justify-between p-5 rounded-none border transition-all ${
                    localTenant.subscriptionPlan === "ENTERPRISE" 
                      ? "border-tenant-primary bg-tenant-primary/[0.02] dark:bg-tenant-primary/[0.04] shadow-md shadow-tenant-primary/5" 
                      : "border-slate-200/60 dark:border-[#2A2A40]/40 bg-white/40 dark:bg-[#0A0A10]/25 hover:border-slate-350 dark:hover:border-purple-900/35"
                  }`}>
                    {localTenant.subscriptionPlan === "ENTERPRISE" && (
                      <div className="absolute -top-3 right-4 bg-tenant-gradient text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-none shadow-sm shadow-tenant-primary/15 uppercase tracking-wide">Aktivní</div>
                    )}
                    <div>
                      <h5 className="font-bold text-slate-800 dark:text-white text-sm">Enterprise</h5>
                      <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">Neomezená firemní řešení</p>
                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-2xl font-extrabold text-slate-800 dark:text-white">4 990 Kč</span>
                        <span className="text-slate-400 dark:text-zinc-500 text-[10px]">/ měsíc</span>
                      </div>
                      
                      <ul className="mt-5 space-y-2.5 text-[11px] text-slate-600 dark:text-zinc-350 border-t border-slate-200/50 dark:border-[#1F1F35]/40 pt-4">
                        <li className="flex items-center gap-1.5"><Check size={11} className="text-emerald-500 shrink-0" /> Max <strong>99</strong> ploch / zdrojů</li>
                        <li className="flex items-center gap-1.5"><Check size={11} className="text-emerald-500 shrink-0" /> Max <strong>99</strong> čteček nebo bran</li>
                        <li className="flex items-center gap-1.5"><Check size={11} className="text-emerald-500 shrink-0" /> SLA & telefonická podpora</li>
                        <li className="flex items-center gap-1.5"><Check size={11} className="text-emerald-500 shrink-0" /> Dedikovaný správce účtu</li>
                      </ul>
                    </div>
                    
                    <button
                      disabled={localTenant.subscriptionPlan === "ENTERPRISE"}
                      onClick={() => {
                        setSelectedPlanForUpgrade("ENTERPRISE");
                        setIsUpgradeModalOpen(true);
                      }}
                      className={`mt-6 w-full text-center text-xs py-2.5 px-4 rounded-none font-bold transition-all cursor-pointer ${
                        localTenant.subscriptionPlan === "ENTERPRISE"
                          ? "bg-slate-100 dark:bg-zinc-800/40 text-slate-400 dark:text-zinc-500 cursor-not-allowed border border-transparent"
                          : "bg-white dark:bg-black/35 hover:bg-slate-50 border border-slate-250 dark:border-[#2A2A40] text-slate-700 dark:text-zinc-305"
                      }`}
                    >
                      {localTenant.subscriptionPlan === "ENTERPRISE" ? "Váš aktuální plán" : "Aktivovat Enterprise"}
                    </button>
                  </div>
                </div>
              </div>
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
          
          <div className="flex items-center gap-2.5 bg-slate-100/60 dark:bg-[#131322]/50 border border-slate-200/50 dark:border-[#2A2A40]/50 rounded-none py-1.5 px-4 text-[10px] font-semibold tracking-wide shadow-sm hover:border-slate-300 dark:hover:border-[#383857] transition-all">
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
        <div className="fixed inset-0 bg-[#07070C]/60 dark:bg-black/75 backdrop-blur-md flex md:items-center md:justify-center z-50 p-0 md:p-6 animate-in fade-in duration-200">
          <div className="bg-white/95 dark:bg-[#0D0D15]/90 backdrop-blur-2xl border-0 md:border border-slate-200/60 dark:border-[#1F1F35] max-w-xl w-full h-full md:h-auto max-h-full md:max-h-[90vh] overflow-y-auto p-5 sm:p-7 rounded-none md:rounded-none shadow-[0_20px_50px_rgba(112,0,255,0.12)] relative transition-all duration-300 text-left text-xs">
            <button
              type="button"
              onClick={() => setResourceModal({ ...resourceModal, open: false })}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 transition-all p-1.5 rounded-none hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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
              <div className="bg-slate-50/50 dark:bg-[#151522]/45 backdrop-blur-md p-5 rounded-none border border-slate-200/60 dark:border-[#2A2A40] space-y-4 mb-2">
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
                    className="w-full text-xs py-3.5 md:py-2.5 px-4 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-none outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-medium"
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
                    className="w-full text-xs py-3.5 md:py-2.5 px-4 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-none outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-medium"
                  >
                    <option value="SPACE">PROSTOR (Sportoviště / Hřiště / Místnost)</option>
                    <option value="SEAT">MÍSTO (Sedadlo / Konkrétní místo)</option>
                    <option value="COURSE_PROGRAM">PROGRAM (Pravidelná lekce / Kurz)</option>
                  </select>
                  <details className="group mt-2">
                    <summary className="cursor-pointer text-[10px] text-tenant-primary font-semibold select-none flex items-center gap-1 group-open:mb-2 hover:underline">
                      <span>Zobrazit nápovědu k typům plochy</span>
                    </summary>
                    <div className="p-3 bg-white/20 dark:bg-[#151522]/30 rounded-none border border-slate-200/45 dark:border-[#1F1F35]/45 text-[11px] leading-relaxed text-slate-500 dark:text-zinc-400 space-y-2 select-none">
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
                        <span className="font-semibold text-foreground block">Další možnosti přizpůsobení (úpravou ve funkci <code className="bg-white/30 dark:bg-[#151522]/50 px-1 rounded-none text-tenant-primary font-mono text-[10px]">getResourceTypeName</code> v souboru <code className="bg-white/30 dark:bg-[#151522]/50 px-1 rounded-none text-foreground font-mono text-[10px]">page.tsx</code>):</span>
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
                            <strong>Možnost 6 (Úplné skrytí):</strong> Štítek typu lze v souboru <code className="bg-white/30 dark:bg-[#151522]/50 px-1 rounded-none text-foreground font-mono text-[10px]">page.tsx</code> zcela smazat, pokud jsou názvy ploch samy o sobě dostatečně popisné.
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
                    className="w-full text-xs py-3.5 md:py-2.5 px-4 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-none outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-semibold"
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
                    className="w-full text-xs py-3.5 md:py-2.5 px-4 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-none outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-medium"
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
                        className="w-full text-xs py-3.5 md:py-2.5 px-4 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-none outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-medium"
                        placeholder="např. Umělá tráva 3. generace"
                      />
                    </div>
                    <div className="border border-slate-200/60 dark:border-[#2A2A40] rounded-none p-4 bg-slate-50/50 dark:bg-slate-900/10 space-y-4">
                      <label className="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Správa dostupného vybavení</label>
                      
                      {/* Current equipment list */}
                      {resourceModal.data.equipmentList && resourceModal.data.equipmentList.length > 0 ? (
                        <div className="space-y-2">
                          {resourceModal.data.equipmentList.map((eq) => (
                            <div key={eq.id} className="flex justify-between items-center p-2.5 rounded-none bg-white/60 dark:bg-[#131322]/30 border border-slate-100 dark:border-[#2A2A40] text-xs">
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-800 dark:text-slate-200">{eq.name}</span>
                                <div className="flex gap-2 text-[10px] text-slate-400">
                                  <span>Množství: {eq.quantity}x</span>
                                  <span>•</span>
                                  <span>{eq.category === "default" ? "V ceně (Default)" : `Extra placené (+${eq.price} Kč)`}</span>
                                  {eq.category === "extra" && eq.cooldownMinutes !== undefined && eq.cooldownMinutes !== 0 && (
                                    <>
                                      <span>•</span>
                                      <span>
                                        Pauza: {eq.cooldownMinutes === -1 
                                          ? "Do příštího dne" 
                                          : eq.cooldownMinutes >= 60 
                                            ? `${eq.cooldownMinutes / 60}h` 
                                            : `${eq.cooldownMinutes} min`}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setResourceModal({
                                    ...resourceModal,
                                    data: {
                                      ...resourceModal.data,
                                      equipmentList: (resourceModal.data.equipmentList || []).filter(item => item.id !== eq.id)
                                    }
                                  });
                                }}
                                className="p-1 rounded-none text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                              >
                                <Trash size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">Žádné nakonfigurované vybavení.</p>
                      )}

                      {/* Add new equipment form */}
                      <div className="border-t border-slate-200/50 dark:border-[#2A2A40]/50 pt-3 space-y-3">
                        <span className="block text-[9.5px] text-slate-400 font-bold uppercase">Přidat nové vybavení</span>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={newEqName}
                              onChange={(e) => setNewEqName(e.target.value)}
                              className="w-full text-xs py-2 px-3 bg-white/70 dark:bg-[#131322]/60 border border-slate-200/60 dark:border-[#2A2A40] rounded-none outline-none text-slate-800 dark:text-slate-200 font-medium"
                              placeholder="Název (např. Brusle, Hokejky, Branky)"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-400 mb-1">Kategorie</label>
                            <select
                              value={newEqCategory}
                              onChange={(e) => setNewEqCategory(e.target.value as any)}
                              className="w-full text-xs py-2 px-3 bg-white/70 dark:bg-[#131322]/60 border border-slate-200/60 dark:border-[#2A2A40] rounded-none text-slate-800 dark:text-slate-200 font-medium"
                            >
                              <option value="default">V ceně (Default)</option>
                              <option value="extra">Extra placené (Půjčovna)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-400 mb-1">Množství (ks)</label>
                            <input
                              type="number"
                              min={1}
                              value={newEqQuantity}
                              onChange={(e) => setNewEqQuantity(parseInt(e.target.value, 10) || 1)}
                              className="w-full text-xs py-2 px-3 bg-white/70 dark:bg-[#131322]/60 border border-slate-200/60 dark:border-[#2A2A40] rounded-none text-slate-800 dark:text-slate-200 font-medium"
                            />
                          </div>

                          {newEqCategory === "extra" && (
                            <>
                              <div>
                                <label className="block text-[9px] text-slate-400 mb-1">Cena (Kč)</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={newEqPrice}
                                  onChange={(e) => setNewEqPrice(parseInt(e.target.value, 10) || 0)}
                                  className="w-full text-xs py-2 px-3 bg-white/70 dark:bg-[#131322]/60 border border-slate-200/60 dark:border-[#2A2A40] rounded-none text-slate-800 dark:text-slate-200 font-medium"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-slate-400 mb-1">Čas na přípravu / údržbu</label>
                                <select
                                  value={newEqCooldown}
                                  onChange={(e) => setNewEqCooldown(parseInt(e.target.value, 10))}
                                  className="w-full text-xs py-2 px-3 bg-white/70 dark:bg-[#131322]/60 border border-slate-200/60 dark:border-[#2A2A40] rounded-none text-slate-800 dark:text-slate-200 font-medium outline-none"
                                >
                                  <option value={0}>Bez pauzy</option>
                                  <option value={30}>30 minut</option>
                                  <option value={60}>1 hodina</option>
                                  <option value={120}>2 hodiny</option>
                                  <option value={-1}>Do příštího dne</option>
                                </select>
                              </div>
                            </>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!newEqName.trim()) return;
                            const newEquip: EquipmentConfig = {
                              id: "eq_" + Math.random().toString(36).substring(3, 9),
                              name: newEqName.trim(),
                              category: newEqCategory,
                              quantity: newEqQuantity,
                              price: newEqCategory === "extra" ? newEqPrice : undefined,
                              cooldownMinutes: newEqCategory === "extra" ? newEqCooldown : undefined
                            };
                            setResourceModal({
                              ...resourceModal,
                              data: {
                                ...resourceModal.data,
                                equipmentList: [...(resourceModal.data.equipmentList || []), newEquip]
                              }
                            });
                            // Reset inputs
                            setNewEqName("");
                            setNewEqQuantity(1);
                            setNewEqPrice(0);
                            setNewEqCooldown(0); // Bez pauzy by default
                          }}
                          disabled={!newEqName.trim()}
                          className="w-full py-2 bg-tenant-gradient hover:opacity-95 text-white text-xs font-bold rounded-none transition-all disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer"
                        >
                          + Přidat vybavení
                        </button>
                      </div>
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
                        className="w-full text-xs py-3.5 md:py-2.5 px-4 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-none outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-medium"
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
                        className="w-full text-xs py-3.5 md:py-2.5 px-4 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-none outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-medium"
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
                    className="w-full text-xs py-3.5 md:py-2.5 px-4 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-none outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-medium"
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

                <div className="border-t border-slate-200/40 dark:border-zinc-800/50 pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">Technická přestávka po rezervaci</label>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Automaticky blokovat čas po každé rezervaci (např. pro úklid nebo přípravu).</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={resourceModal.data.technicalBreak}
                        onChange={(e) => setResourceModal({
                          ...resourceModal,
                          data: { ...resourceModal.data, technicalBreak: e.target.checked }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200/50 dark:bg-black/60 rounded-none peer border border-slate-300 dark:border-zinc-700 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 dark:after:bg-zinc-500 after:rounded-none after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full peer-checked:bg-tenant-primary/25 dark:peer-checked:bg-tenant-primary/30 peer-checked:border-tenant-primary peer-checked:after:bg-tenant-primary"></div>
                    </label>
                  </div>

                  {resourceModal.data.technicalBreak && (
                    <div className="animate-in slide-in-from-top-1 duration-200">
                      <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Doba trvání přestávky (minuty)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={resourceModal.data.technicalBreakMinutes}
                        onChange={(e) => setResourceModal({
                          ...resourceModal,
                          data: { ...resourceModal.data, technicalBreakMinutes: parseInt(e.target.value, 10) || 0 }
                        })}
                        className="w-full text-xs py-3.5 md:py-2.5 px-4 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-none outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-semibold"
                        placeholder="např. 15"
                      />
                    </div>
                  )}

                  {/* Dynamic Technical Surcharges (Lighting, Heating) */}
                  <div className="border-t border-slate-200/20 dark:border-zinc-800/30 pt-3 space-y-4">
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Technické příplatky</h4>
                    </div>

                    {/* Automatic Lighting Surcharge */}
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">Automatický příplatek za osvětlení</label>
                        <p className="text-[9.5px] text-slate-400 dark:text-slate-500 mt-0.5">Připočítat příplatek před/po západu slunce.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={resourceModal.data.autoLightingPricingEnabled || false}
                          onChange={(e) => {
                            if (e.target.checked && !settingsLocation.trim()) {
                              setNotification({
                                type: "error",
                                title: "Lokalita areálu chybí",
                                message: "Pro zapnutí automatických příplatků za osvětlení musíte nejdříve v záložce Nastavení (Nastavení portálu) vyplnit 'Lokalitu / Město areálu', aby bylo možné určit čas západu slunce."
                              });
                              return;
                            }
                            setResourceModal({
                              ...resourceModal,
                              data: { ...resourceModal.data, autoLightingPricingEnabled: e.target.checked }
                            });
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200/50 dark:bg-black/60 rounded-none peer border border-slate-300 dark:border-zinc-700 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 dark:after:bg-zinc-500 after:rounded-none after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full peer-checked:bg-tenant-primary/25 dark:peer-checked:bg-tenant-primary/30 peer-checked:border-tenant-primary peer-checked:after:bg-tenant-primary"></div>
                      </label>
                    </div>

                    {resourceModal.data.autoLightingPricingEnabled && (
                      <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-1 duration-200">
                        <div>
                          <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Sazba (Kč/hod)</label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={resourceModal.data.autoLightingFlatRate || ""}
                            onChange={(e) => setResourceModal({
                              ...resourceModal,
                              data: { ...resourceModal.data, autoLightingFlatRate: parseFloat(e.target.value) || 0 }
                            })}
                            className="w-full text-xs py-3.5 md:py-2.5 px-4 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-none outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-semibold"
                            placeholder="např. 100"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Spustit před západem (minut)</label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={resourceModal.data.autoLightingOffsetMinutes !== undefined ? resourceModal.data.autoLightingOffsetMinutes : 60}
                            onChange={(e) => setResourceModal({
                              ...resourceModal,
                              data: { ...resourceModal.data, autoLightingOffsetMinutes: parseInt(e.target.value, 10) || 0 }
                            })}
                            className="w-full text-xs py-3.5 md:py-2.5 px-4 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-none outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-semibold"
                            placeholder="např. 60"
                          />
                        </div>
                      </div>
                    )}

                    {/* Automatic Heating Surcharge */}
                    <div className="flex items-center justify-between border-t border-slate-200/20 dark:border-zinc-800/30 pt-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">Automatický příplatek za vytápění</label>
                        <p className="text-[9.5px] text-slate-400 dark:text-slate-500 mt-0.5">Připočítat příplatek, pokud venkovní teplota klesne pod limit.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={resourceModal.data.autoHeatingPricingEnabled || false}
                          onChange={(e) => {
                            if (e.target.checked && !settingsLocation.trim()) {
                              setNotification({
                                type: "error",
                                title: "Lokalita areálu chybí",
                                message: "Pro zapnutí automatických příplatků za vytápění musíte nejdříve v záložce Nastavení (Nastavení portálu) vyplnit 'Lokalitu / Město areálu', aby bylo možné načíst správnou předpověď počasí."
                              });
                              return;
                            }
                            setResourceModal({
                              ...resourceModal,
                              data: { ...resourceModal.data, autoHeatingPricingEnabled: e.target.checked }
                            });
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200/50 dark:bg-black/60 rounded-none peer border border-slate-300 dark:border-zinc-700 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 dark:after:bg-zinc-500 after:rounded-none after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full peer-checked:bg-tenant-primary/25 dark:peer-checked:bg-tenant-primary/30 peer-checked:border-tenant-primary peer-checked:after:bg-tenant-primary"></div>
                      </label>
                    </div>

                    {resourceModal.data.autoHeatingPricingEnabled && (
                      <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-1 duration-200">
                        <div>
                          <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Sazba (Kč/hod)</label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={resourceModal.data.autoHeatingFlatRate || ""}
                            onChange={(e) => setResourceModal({
                              ...resourceModal,
                              data: { ...resourceModal.data, autoHeatingFlatRate: parseFloat(e.target.value) || 0 }
                            })}
                            className="w-full text-xs py-3.5 md:py-2.5 px-4 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-none outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-semibold"
                            placeholder="např. 150"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Teplotní limit (°C)</label>
                          <input
                            type="number"
                            required
                            value={resourceModal.data.autoHeatingTempThreshold !== undefined ? resourceModal.data.autoHeatingTempThreshold : 15}
                            onChange={(e) => setResourceModal({
                              ...resourceModal,
                              data: { ...resourceModal.data, autoHeatingTempThreshold: parseFloat(e.target.value) || 0 }
                            })}
                            className="w-full text-xs py-3.5 md:py-2.5 px-4 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-none outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-semibold"
                            placeholder="např. 15"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResourceModal({ ...resourceModal, open: false })}
                  className="py-3 px-4 rounded-none text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-[#151522]/55 dark:hover:bg-[#1C1C30]/55 text-slate-700 dark:text-slate-350 border border-slate-200/40 dark:border-[#2A2A40] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex-1 text-center cursor-pointer"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="py-3 px-4 rounded-none bg-tenant-gradient hover:opacity-95 active:scale-[0.98] transition-all text-white text-xs font-bold flex-1 text-center cursor-pointer shadow-md shadow-tenant-primary/15"
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
        <div className="fixed inset-0 bg-[#07070C]/60 dark:bg-black/75 backdrop-blur-md flex md:items-center md:justify-center z-50 p-0 md:p-6 animate-in fade-in duration-200">
          <div className="bg-white/95 dark:bg-[#0D0D15]/90 backdrop-blur-2xl border-0 md:border border-slate-200/60 dark:border-[#1F1F35] max-w-xl w-full h-full md:h-auto max-h-full md:max-h-[90vh] overflow-y-auto p-5 sm:p-7 rounded-none md:rounded-none shadow-[0_20px_50px_rgba(112,0,255,0.12)] relative transition-all duration-300 text-left text-xs">
            <button
              type="button"
              onClick={() => setDeviceModal({ ...deviceModal, open: false })}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 transition-all p-1.5 rounded-none hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X size={16} />
            </button>
            <h3 className="text-xl font-bold bg-gradient-to-r from-tenant-primary via-indigo-500 to-[#3B82F6] bg-clip-text text-transparent mb-1 font-sans select-none">
              {deviceModal.mode === "add" ? "Registrovat zařízení" : "Upravit parametry zařízení"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              {deviceModal.mode === "add" ? "Zadejte parametry nového přístupového terminálu:" : "Upravte konfiguraci zařízení níže:"}
            </p>
            <form onSubmit={handleDeviceSubmit} className="space-y-6 text-xs">
              <div className="bg-slate-50/50 dark:bg-[#151522]/45 backdrop-blur-md p-5 rounded-none border border-slate-200/60 dark:border-[#2A2A40] space-y-4 mb-2">
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
                      className="w-full text-xs py-3.5 md:py-2.5 px-4 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-none outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-mono font-semibold"
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
                    className="w-full text-xs py-3.5 md:py-2.5 px-4 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-none outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-medium"
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
                      className="w-full text-xs py-3.5 md:py-2.5 px-4 bg-white/50 dark:bg-[#131322]/45 border border-slate-200/60 dark:border-[#2A2A40] rounded-none outline-none focus:border-tenant-primary/50 focus:ring-1 focus:ring-tenant-primary/20 transition-all text-slate-800 dark:text-slate-200 font-mono font-semibold"
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
                    <div className="w-9 h-5 bg-slate-200/50 dark:bg-black/60 rounded-none peer border border-slate-300 dark:border-zinc-700 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 dark:after:bg-zinc-500 after:rounded-none after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full peer-checked:bg-tenant-primary/25 dark:peer-checked:bg-tenant-primary/30 peer-checked:border-tenant-primary peer-checked:after:bg-tenant-primary"></div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeviceModal({ ...deviceModal, open: false })}
                  className="py-3 px-4 rounded-none text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-[#151522]/55 dark:hover:bg-[#1C1C30]/55 text-slate-700 dark:text-slate-350 border border-slate-200/40 dark:border-[#2A2A40] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex-1 text-center cursor-pointer"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="py-3 px-4 rounded-none bg-tenant-gradient hover:opacity-95 active:scale-[0.98] transition-all text-white text-xs font-bold flex-1 text-center cursor-pointer shadow-md shadow-tenant-primary/15"
                >
                  Uložit zařízení
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 3.5. Subscription Upgrade Checkout Modal */}
      {isUpgradeModalOpen && selectedPlanForUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md transition-all animate-fade-in select-none">
          <div className="bg-white dark:bg-[#0C0C14] border border-slate-200/50 dark:border-[#1F1F35] rounded-none w-full max-w-md shadow-2xl p-6 relative overflow-hidden transition-all duration-300 transform scale-100 flex flex-col gap-4">
            
            {/* Animated checkout stages view */}
            {checkoutStage ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                {checkoutStage === "verifying" && (
                  <>
                    <Loader2 className="w-12 h-12 text-tenant-primary animate-spin" />
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white mt-2">Ověřování platební karty...</h4>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500">Navazování zabezpečeného spojení se serverem</p>
                  </>
                )}
                {checkoutStage === "processing" && (
                  <>
                    <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white mt-2">Zpracování platby...</h4>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500">Provádění autorizační transakce banky</p>
                  </>
                )}
                {checkoutStage === "updating" && (
                  <>
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white mt-2">Aktualizace limitů v databázi...</h4>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500">Navyšování systémových kapacit vašeho účtu</p>
                  </>
                )}
                {checkoutStage === "success" && (
                  <>
                    <div className="w-12 h-12 rounded-none bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center animate-bounce">
                      <Check className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-emerald-500 mt-2">Platba úspěšně potvrzena!</h4>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500">Předplatné bylo úspěšně nastaveno</p>
                  </>
                )}
              </div>
            ) : (
              /* Regular credit card form */
              <form onSubmit={handleUpgradeSubmit} className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-[#1F1F35]/40">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">Objednávka předplatného</h4>
                    <p className="text-[10px] text-slate-550 dark:text-zinc-500">Plán: <span className="font-semibold text-tenant-primary">{selectedPlanForUpgrade}</span></p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-slate-800 dark:text-white">
                      {selectedPlanForUpgrade === "FREE_TRIAL" ? "0 Kč" : selectedPlanForUpgrade === "STARTER" ? "490 Kč" : selectedPlanForUpgrade === "PRO" ? "990 Kč" : "4 990 Kč"}
                    </span>
                    <span className="text-[8px] text-slate-400 dark:text-zinc-550 block">/ měsíčně</span>
                  </div>
                </div>

                {checkoutError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-semibold p-2.5 rounded-none flex items-center gap-1.5 leading-snug">
                    <ShieldAlert size={12} className="shrink-0" />
                    {checkoutError}
                  </div>
                )}

                <div className="space-y-3.5">
                  {/* Cardholder Name */}
                  <div>
                    <label className="block text-slate-500 dark:text-zinc-500 mb-1 font-bold uppercase tracking-wider text-[8px]">Jméno držitele karty</label>
                    <div className="relative flex items-center">
                      <User size={12} className="absolute left-3 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={checkoutCardName}
                        onChange={(e) => setCheckoutCardName(e.target.value)}
                        placeholder="Jan Novák"
                        className="w-full text-xs font-semibold pl-8.5 pr-4 py-2.5 bg-slate-55 dark:bg-black/30 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-[#2A2A40]/55 rounded-none outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Card Number */}
                  <div>
                    <label className="block text-slate-500 dark:text-zinc-500 mb-1 font-bold uppercase tracking-wider text-[8px]">Číslo karty</label>
                    <div className="relative flex items-center">
                      <CreditCard size={12} className="absolute left-3 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={checkoutCardNumber}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, "").substring(0, 16);
                          const matches = val.match(/\d{1,4}/g);
                          setCheckoutCardNumber(matches ? matches.join(" ") : val);
                        }}
                        placeholder="4242 4242 4242 4242"
                        className="w-full text-xs font-mono font-medium pl-8.5 pr-4 py-2.5 bg-slate-55 dark:bg-black/30 text-slate-700 dark:text-zinc-305 border border-slate-200 dark:border-[#2A2A40]/55 rounded-none outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Expiry & CVV */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-500 dark:text-zinc-500 mb-1 font-bold uppercase tracking-wider text-[8px]">Platnost</label>
                      <input
                        type="text"
                        required
                        value={checkoutExpiry}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, "").substring(0, 4);
                          if (val.length > 2) {
                            val = val.substring(0, 2) + "/" + val.substring(2);
                          }
                          setCheckoutExpiry(val);
                        }}
                        placeholder="MM/YY"
                        className="w-full text-xs font-mono font-medium px-4 py-2.5 bg-slate-55 dark:bg-black/30 text-slate-700 dark:text-zinc-305 border border-slate-200 dark:border-[#2A2A40]/55 rounded-none outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all shadow-sm text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 dark:text-zinc-500 mb-1 font-bold uppercase tracking-wider text-[8px]">CVC/CVV</label>
                      <input
                        type="password"
                        required
                        value={checkoutCvv}
                        onChange={(e) => setCheckoutCvv(e.target.value.replace(/\D/g, "").substring(0, 3))}
                        placeholder="•••"
                        className="w-full text-xs font-mono font-medium px-4 py-2.5 bg-slate-55 dark:bg-black/30 text-slate-700 dark:text-zinc-305 border border-slate-200 dark:border-[#2A2A40]/55 rounded-none outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all shadow-sm text-center"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUpgradeModalOpen(false);
                      setCheckoutError(null);
                    }}
                    className="py-3 px-4 rounded-none text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-[#151522]/55 dark:hover:bg-[#1C1C30]/55 text-slate-700 dark:text-slate-350 border border-slate-200/40 dark:border-[#2A2A40] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex-1 text-center cursor-pointer"
                  >
                    Zrušit
                  </button>
                  <button
                    type="submit"
                    className="py-3 px-4 rounded-none bg-tenant-gradient hover:opacity-95 active:scale-[0.98] transition-all text-white text-xs font-bold flex-1 text-center cursor-pointer shadow-md shadow-tenant-primary/15"
                  >
                    Zaplatit a aktivovat
                  </button>
                </div>
              </form>
            )}
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
            const msg = notification.message || "";
            setNotification(null);
            if (onCl) onCl();
            if (msg.includes("Plan limit exceeded")) {
              setResourceModal(prev => ({ ...prev, open: false }));
              setDeviceModal(prev => ({ ...prev, open: false }));
              setActiveTab("subscription");
            }
          }
        }}
      />

      <div className={(resourceModal.open || deviceModal.open || confirmModal !== null || notification !== null || isBillingModalOpen || isUpgradeModalOpen) ? "hidden md:block" : ""}>
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
      </div>

      {activeTimePicker && (
        <TimePickerDropdown 
          picker={activeTimePicker} 
          onClose={() => setActiveTimePicker(null)} 
        />
      )}

      <AdminOnboardingWizard
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        tenantId={tenant.id}
        tenantName={tenant.name}
        tenantVertical={tenant.vertical}
        initialTagline={settingsTagline}
        onCompleted={() => {
          setShowOnboarding(false);
          setNotification({
            type: "success",
            title: "Průvodce dokončen",
            message: "Váš rezervační portál byl úspěšně spuštěn!",
            onClose: () => window.location.reload()
          });
        }}
      />

      {isScanning && (
        <div className="fixed inset-0 bg-[#05050A]/90 backdrop-blur-md flex flex-col items-center justify-center p-4 z-50 animate-fade-in select-none">
          <style>{`
            @keyframes laserScan {
              0% { top: 0%; }
              50% { top: 100%; }
              100% { top: 0%; }
            }
          `}</style>
          <div className="bg-[#0D0D15] border border-white/10 p-6 rounded-none w-full max-w-md shadow-2xl space-y-5 relative flex flex-col items-center">
            <button
              type="button"
              onClick={stopScanning}
              className="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
            <div className="text-center">
              <h3 className="text-sm font-bold text-white">Naskenovat QR kód lístku</h3>
              <p className="text-slate-400 text-[11px] mt-0.5">Namiřte fotoaparát na obrazovku mobilu s QR kódem.</p>
            </div>

            <div className="relative w-full aspect-square max-w-[280px] bg-black/60 rounded-none overflow-hidden border border-white/10 flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Target Scan Frame */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[70%] h-[70%] border-2 border-dashed border-tenant-primary/30 rounded-none relative">
                  {/* Corners */}
                  <div className="absolute top-[-2px] left-[-2px] w-5 h-5 border-t-4 border-l-4 border-tenant-primary rounded-none-tl-lg" />
                  <div className="absolute top-[-2px] right-[-2px] w-5 h-5 border-t-4 border-r-4 border-tenant-primary rounded-none-tr-lg" />
                  <div className="absolute bottom-[-2px] left-[-2px] w-5 h-5 border-b-4 border-l-4 border-tenant-primary rounded-none-bl-lg" />
                  <div className="absolute bottom-[-2px] right-[-2px] w-5 h-5 border-b-4 border-r-4 border-tenant-primary rounded-none-br-lg" />
                  {/* Scanning Laser Line */}
                  <div 
                    className="absolute left-0 right-0 h-0.5 bg-tenant-primary shadow-[0_0_8px_var(--tenant-primary)]" 
                    style={{ animation: 'laserScan 2.5s linear infinite' }}
                  />
                </div>
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-[#0D0D15]/95 flex flex-col items-center justify-center text-center p-5 space-y-2">
                  <ShieldAlert className="text-amber-500 shrink-0" size={32} />
                  <p className="text-xs text-white font-bold">Chyba kamery</p>
                  <p className="text-[10px] text-slate-400 leading-normal">{cameraError}</p>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="w-full flex flex-col gap-2 pt-2">
              <label className="w-full py-2.5 bg-tenant-primary/10 hover:bg-tenant-primary/20 text-tenant-primary border border-tenant-primary/25 rounded-none font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none text-xs">
                <Upload size={14} />
                Nahrát obrázek QR kódu
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={stopScanning}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-none text-xs transition-all border border-white/5 cursor-pointer"
              >
                Zrušit
              </button>
            </div>
          </div>
        </div>
      )}



      {isMobileScannerOpen && (
        <MobileCheckinScanner
          devices={devices}
          bookings={bookings}
          onClose={() => setIsMobileScannerOpen(false)}
          tenantName={tenant.name}
        />
      )}

    </div>
  );
}

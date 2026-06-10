"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Building, Calendar, Clock, QrCode, ClipboardList, 
  Plus, Edit, Trash, Settings, 
  ArrowLeft, Smartphone, Activity,
  Upload, Image, ShieldCheck, Check, AlertCircle, Eye, List
} from "lucide-react";
import { getTenantTheme } from "@/lib/tenantThemes";
import ThemeToggle from "@/components/ThemeToggle";
import CalendarView, { CalendarEvent } from "@/components/CalendarView";
import ConfirmDialog from "@/components/ConfirmDialog";
import AlertDialog from "@/components/AlertDialog";
import TenantBanner from "@/components/TenantBanner";

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
      openingHours?: OpeningHoursDay[];
    };
  };
  resources: Resource[];
  bookings: Booking[];
  devices: Device[];
  checkinLogs: CheckinLog[];
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
  checkinLogs
}: AdminDashboardClientProps) {
  const router = useRouter();
  const theme = getTenantTheme(tenant.id, tenant.vertical, tenant.name);

  const [activeTab, setActiveTab] = useState<"overview" | "resources" | "rules" | "bookings" | "devices" | "settings">("overview");
  const [bookingsSubTab, setBookingsSubTab] = useState<"calendar" | "list">("calendar");

  // Portal settings states
  const initialAttributes = tenant.attributes || {};
  const [settingsTagline, setSettingsTagline] = useState(initialAttributes.tagline || "");
  const [settingsOpenTime, setSettingsOpenTime] = useState(initialAttributes.openTime || "08:00");
  const [settingsCloseTime, setSettingsCloseTime] = useState(initialAttributes.closeTime || "22:00");
  const [settingsBannerImage, setSettingsBannerImage] = useState(initialAttributes.bannerImage || "");
  const [settingsOpeningHours, setSettingsOpeningHours] = useState<OpeningHoursDay[]>(
    initialAttributes.openingHours || defaultOpeningHours
  );
  
  // Preset helpers for opening hours
  const [presetOpenTime, setPresetOpenTime] = useState("08:00");
  const [presetCloseTime, setPresetCloseTime] = useState("22:00");
  const [presetClosed, setPresetClosed] = useState(false);

  const initialAdminEmails = Array.isArray(initialAttributes.adminEmails)
    ? initialAttributes.adminEmails.join(", ")
    : (initialAttributes.adminEmails || "josef.novak@deepvision.cz");
  const [settingsAdminEmails, setSettingsAdminEmails] = useState(initialAdminEmails);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // Custom alert and confirmation modal states
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void | Promise<void> } | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; title: string; message: string; onClose?: () => void } | null>(null);

  // Modals / forms states
  const [resourceModal, setResourceModal] = useState<{ open: boolean; mode: "add" | "edit"; data: { id: string; name: string; type: string; maxCapacity: number; instructor: string; room: string; parentId: string; surface: string; equipment: string; price: string; } }>({
    open: false,
    mode: "add",
    data: { id: "", name: "", type: "SPACE", maxCapacity: 10, instructor: "", room: "", parentId: "", surface: "", equipment: "", price: "" }
  });

  const [ruleModal, setRuleModal] = useState<{ open: boolean; mode: "add" | "edit"; data: { id: string; resourceId: string; name: string; dayOfWeek: number; startTime: string; endTime: string; price: number; maxCapacity: number; daysOfWeek: number[]; } }>({
    open: false,
    mode: "add",
    data: { id: "", resourceId: "", name: "", dayOfWeek: 1, startTime: "12:00", endTime: "13:30", price: 100, maxCapacity: 10, daysOfWeek: [1] }
  });

  const [deviceModal, setDeviceModal] = useState<{ open: boolean; mode: "add" | "edit"; data: { id: string; name: string; token: string; active: boolean; } }>({
    open: false,
    mode: "add",
    data: { id: "", name: "", token: "", active: true }
  });

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
            title: "Upload Successful",
            message: "Banner image uploaded successfully!",
            onClose: () => router.refresh()
          });
        } else {
          setNotification({
            type: "error",
            title: "Upload Failed",
            message: "Error uploading image."
          });
        }
      } catch (err) {
        console.error(err);
        setNotification({
          type: "error",
          title: "Upload Failed",
          message: "Failed to upload image."
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
        setNotification({
          type: "success",
          title: "Resource Saved",
          message: "Resource details saved successfully!",
          onClose: () => router.refresh()
        });
      } else {
        setNotification({
          type: "error",
          title: "Save Failed",
          message: "Error saving resource."
        });
      }
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        title: "Error",
        message: "An unexpected error occurred."
      });
    }
  };

  const handleResourceDelete = (id: string) => {
    setConfirmModal({
      title: "Delete Resource",
      message: "Are you sure you want to delete this resource and all its schedule rules?",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "resource_delete", data: { id } })
          });
          if (res.ok) {
            setNotification({
              type: "success",
              title: "Resource Deleted",
              message: "Resource and its rules deleted successfully!",
              onClose: () => router.refresh()
            });
          } else {
            setNotification({
              type: "error",
              title: "Delete Failed",
              message: "Error deleting resource."
            });
          }
        } catch (err) {
          console.error(err);
          setNotification({
            type: "error",
            title: "Error",
            message: "An unexpected error occurred."
          });
        }
      }
    });
  };

  const handleRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For bulk creation, if adding we send daysOfWeek array
    const dataToSend = {
      id: ruleModal.data.id || undefined,
      resourceId: ruleModal.data.resourceId,
      name: ruleModal.data.name,
      dayOfWeek: ruleModal.mode === "edit" ? ruleModal.data.dayOfWeek : undefined,
      daysOfWeek: ruleModal.mode === "add" ? ruleModal.data.daysOfWeek : undefined,
      startTime: ruleModal.data.startTime,
      endTime: ruleModal.data.endTime,
      price: typeof ruleModal.data.price === "string" ? parseFloat(ruleModal.data.price) : ruleModal.data.price,
      maxCapacity: typeof ruleModal.data.maxCapacity === "string" ? parseInt(ruleModal.data.maxCapacity, 10) : ruleModal.data.maxCapacity,
    };

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rule_upsert", data: dataToSend })
      });
      if (res.ok) {
        setRuleModal({ ...ruleModal, open: false });
        setNotification({
          type: "success",
          title: "Schedule Slot Saved",
          message: "Schedule slot configuration saved successfully!",
          onClose: () => router.refresh()
        });
      } else {
        setNotification({
          type: "error",
          title: "Save Failed",
          message: "Error saving schedule slot."
        });
      }
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        title: "Error",
        message: "An unexpected error occurred."
      });
    }
  };

  const handleRuleDelete = (id: string) => {
    setConfirmModal({
      title: "Delete Schedule Slot",
      message: "Are you sure you want to delete this schedule slot?",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "rule_delete", data: { id } })
          });
          if (res.ok) {
            setNotification({
              type: "success",
              title: "Slot Deleted",
              message: "Schedule slot deleted successfully!",
              onClose: () => router.refresh()
            });
          } else {
            setNotification({
              type: "error",
              title: "Delete Failed",
              message: "Error deleting schedule slot."
            });
          }
        } catch (err) {
          console.error(err);
          setNotification({
            type: "error",
            title: "Error",
            message: "An unexpected error occurred."
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

        if (deviceModal.mode === "add" && createdToken) {
          setNotification({
            type: "success",
            title: "Device Configured",
            message: `IoT Device configured successfully!\n\nSave the Token for turnstile device config:\nToken: ${createdToken}`,
            onClose: () => router.refresh()
          });
        } else {
          setNotification({
            type: "success",
            title: "Success",
            message: "Device settings saved successfully!",
            onClose: () => router.refresh()
          });
        }
      } else {
        setNotification({
          type: "error",
          title: "Save Failed",
          message: "Error saving device configuration."
        });
      }
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        title: "Error",
        message: "An unexpected error occurred."
      });
    }
  };

  const handleDeviceDelete = (id: string) => {
    setConfirmModal({
      title: "Delete IoT Device",
      message: "Are you sure you want to delete this check-in device?",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "device_delete", data: { id } })
          });
          if (res.ok) {
            setNotification({
              type: "success",
              title: "Device Deleted",
              message: "Check-in device registration removed successfully!",
              onClose: () => router.refresh()
            });
          } else {
            setNotification({
              type: "error",
              title: "Delete Failed",
              message: "Error deleting check-in device."
            });
          }
        } catch (err) {
          console.error(err);
          setNotification({
            type: "error",
            title: "Error",
            message: "An unexpected error occurred."
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
        openingHours: settingsOpeningHours,
        adminEmails: emailsArray,
      }
    };

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tenant_settings_update", data: dataToSend })
      });
      if (res.ok) {
        setNotification({
          type: "success",
          title: "Settings Updated",
          message: "Portal settings updated successfully!",
          onClose: () => router.refresh()
        });
      } else {
        setNotification({
          type: "error",
          title: "Save Failed",
          message: "Error saving settings."
        });
      }
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        title: "Save Failed",
        message: "Failed to save settings."
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Generate calendar events from bookings and rules client-side
  const calendarEvents = React.useMemo(() => {
    const events: CalendarEvent[] = [];
    
    // A. Add confirmed bookings as occupied calendar overlays
    bookings.forEach((booking) => {
      if (booking.status !== "CONFIRMED") return;
      const from = new Date(booking.reservedFrom);
      const to = new Date(booking.reservedTo);
      const startHour = from.getHours() + from.getMinutes() / 60;
      const endHour = to.getHours() + to.getMinutes() / 60;
      const durationHours = endHour - startHour;
      
      const dayOfWeek = from.getDay();
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      
      const resource = resources.find(r => r.name === booking.resourceName);
      const room = resource?.attributes?.room || resource?.attributes?.surface || "Hřiště";

      events.push({
        id: booking.id,
        name: booking.userName || booking.resourceName,
        room: room,
        instructor: booking.userEmail,
        dayIndex,
        startHour,
        durationHours,
        resourceId: resource?.id || "",
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
  }, [bookings, resources, tenant.vertical]);

  // Helper translations
  const getDayName = (dayOfWeek: number | null) => {
    if (dayOfWeek === null) return "Jednorázově";
    const days = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];
    return days[dayOfWeek] || "Specifický";
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
      case "CONFIRMED": return "bg-primary/10 text-primary border border-primary/20";
      case "PENDING_PAYMENT": return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
      default: return "bg-red-500/10 text-red-500 border border-red-500/20";
    }
  };

  // Categorized resources
  const facilities = resources.filter(r => r.type === "SPACE" || r.type === "SEAT");
  const classesAndPrograms = resources.filter(r => r.type === "COURSE_PROGRAM");

  return (
    <div className="flex-1 bg-background text-foreground flex flex-col font-sans transition-colors duration-200">
      <header className="border-b border-border bg-card sticky top-0 z-40 transition-colors shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-lg bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-all flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft size={14} />
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded bg-tenant-primary text-white font-bold select-none">
                Portal Admin
              </span>
              <h1 className="font-bold text-foreground text-sm md:text-md select-none">{theme.name}</h1>
            </div>
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-3 select-none">
            <ThemeToggle />
            <span className="flex items-center gap-1 font-semibold">
              <Settings size={14} />
              SaaS Admin Console
            </span>
          </div>
        </div>
      </header>

      {/* Main Admin Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Navigation Sidebar */}
        <aside className="md:w-64 space-y-1 h-fit bg-secondary/20 border border-border p-3 rounded-2xl">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "overview" 
                ? "bg-tenant-gradient text-white shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Building size={16} />
            Overview & Logs
          </button>
          
          <button
            onClick={() => setActiveTab("resources")}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "resources" 
                ? "bg-tenant-gradient text-white shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <ClipboardList size={16} />
            Manage Resources
          </button>

          <button
            onClick={() => setActiveTab("rules")}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "rules" 
                ? "bg-tenant-gradient text-white shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Clock size={16} />
            Manage Schedule Slots
          </button>

          <button
            onClick={() => setActiveTab("bookings")}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "bookings" 
                ? "bg-tenant-gradient text-white shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Calendar size={16} />
            View Bookings
          </button>

          <button
            onClick={() => setActiveTab("devices")}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "devices" 
                ? "bg-tenant-gradient text-white shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <QrCode size={16} />
            IoT Access & Devices
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "settings" 
                ? "bg-tenant-gradient text-white shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Settings size={16} />
            Portal Settings
          </button>
        </aside>

        {/* Tab Workspaces */}
        <section className="flex-1 space-y-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Analytics Header Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-5">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Resources</span>
                  <span className="text-2xl font-bold text-foreground">{resources.length}</span>
                </div>
                <div className="card p-5">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Total Bookings</span>
                  <span className="text-2xl font-bold text-foreground">{bookings.length}</span>
                </div>
                <div className="card p-5">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">IoT Gates</span>
                  <span className="text-2xl font-bold text-foreground">{devices.length}</span>
                </div>
                <div className="card p-5">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Turnstile Logs</span>
                  <span className="text-2xl font-bold text-foreground">{checkinLogs.length}</span>
                </div>
              </div>

              {/* Turnstile Access Logs Stream */}
              <div className="card p-6 shadow-sm">
                <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-tenant-accent" />
                  Live Turnstile Check-in Logs (Scan Event Logs)
                </h3>

                {checkinLogs.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground font-mono">
                    No turnstile scans logged yet. Use POST /api/device/checkin to trigger offline turnstile gates.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground font-medium">
                          <th className="py-2.5 font-semibold">Time</th>
                          <th className="py-2.5 font-semibold">User</th>
                          <th className="py-2.5 font-semibold">Gate/Device</th>
                          <th className="py-2.5 font-semibold">Resource</th>
                          <th className="py-2.5 font-semibold text-right">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {checkinLogs.map((log) => (
                          <tr key={log.id} className="border-b border-border/40 hover:bg-secondary/40 transition-colors">
                            <td className="py-3 font-mono text-muted-foreground">
                              {new Date(log.scannedAt).toLocaleTimeString()}
                            </td>
                            <td className="py-3 font-medium text-foreground">
                              <div>{log.userName}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{log.userEmail}</div>
                            </td>
                            <td className="py-3 text-foreground">{log.deviceName}</td>
                            <td className="py-3 text-muted-foreground">{log.resourceName}</td>
                            <td className="py-3 text-right">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getResultBadgeColor(log.result)}`}>
                                {log.result}
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
                <h3 className="text-sm font-bold text-foreground">Configured Resources ({resources.length})</h3>
                <button
                  onClick={() => setResourceModal({
                    open: true, mode: "add",
                    data: { id: "", name: "", type: "SPACE", maxCapacity: 10, instructor: "", room: "", parentId: "", surface: "", equipment: "", price: "" }
                  })}
                  className="btn-tenant text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                >
                  <Plus size={14} />
                  Add Resource
                </button>
              </div>

              {/* Categorization display */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 select-none flex items-center gap-1.5">
                    <Building size={14} className="text-tenant-primary" />
                    Facilities & Bookable Spaces (Fields, Sectors, Rooms)
                  </h4>
                  {facilities.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic mb-4">No facilities created yet.</p>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {facilities.map((res) => (
                        <div key={res.id} className="card p-5 flex flex-col justify-between hover:border-tenant-primary/30 transition-all">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground font-bold uppercase font-mono">
                                {res.type}
                              </span>
                              <span className="text-xs text-muted-foreground font-medium">Max Cap: {res.maxCapacity}</span>
                            </div>
                            <h4 className="font-bold text-base text-foreground">{res.name}</h4>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <p>Povrch: <strong className="text-foreground">{res.attributes.surface || "Nenastaven"}</strong></p>
                              <p>Vybavení: <strong className="text-foreground">{res.attributes.equipment || "Nenastaveno"}</strong></p>
                              <p>Cena: <strong className="text-foreground">{res.attributes.price ? `${res.attributes.price} Kč` : "Nenastavena (Dle dohody)"}</strong></p>
                              {res.attributes.parentId && (
                                <p>Nadřazená plocha: <strong className="text-foreground">{resources.find(r => r.id === res.attributes.parentId)?.name || "Neznámá"}</strong></p>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 border-t border-border pt-4 mt-4">
                            <button
                              onClick={() => setResourceModal({
                                open: true,
                                mode: "edit",
                                data: {
                                  id: res.id,
                                  name: res.name,
                                  type: res.type,
                                  maxCapacity: res.maxCapacity,
                                  instructor: "",
                                  room: "",
                                  parentId: res.attributes.parentId || "",
                                  surface: res.attributes.surface || "",
                                  equipment: res.attributes.equipment || "",
                                  price: res.attributes.price || ""
                                }
                              })}
                              className="btn-outline py-1 px-2 text-tenant-primary text-xs"
                              title="Edit resource"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              onClick={() => handleResourceDelete(res.id)}
                              className="btn-outline py-1 px-2 text-destructive text-xs"
                              style={{ color: "oklch(0.60 0.18 15)" }}
                              title="Delete resource"
                            >
                              <Trash size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 select-none flex items-center gap-1.5 pt-4 border-t border-border">
                    <Clock size={14} className="text-tenant-primary" />
                    Available Classes, Courses & Programs
                  </h4>
                  {classesAndPrograms.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No classes or programs created yet.</p>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {classesAndPrograms.map((res) => (
                        <div key={res.id} className="card p-5 flex flex-col justify-between hover:border-tenant-primary/30 transition-all">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground font-bold uppercase font-mono">
                                {res.type}
                              </span>
                              <span className="text-xs text-muted-foreground font-medium">Max Cap: {res.maxCapacity}</span>
                            </div>
                            <h4 className="font-bold text-base text-foreground">{res.name}</h4>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <p>Lektor: <strong className="text-foreground">{res.attributes.instructor || "Nenastaven"}</strong></p>
                              <p>Místnost: <strong className="text-foreground">{res.attributes.room || "Nenastavena"}</strong></p>
                              <p>Cena: <strong className="text-foreground">{res.attributes.price ? `${res.attributes.price} Kč` : "Nenastavena (Dle dohody)"}</strong></p>
                              {res.attributes.parentId && (
                                <p>Nadřazené hřiště: <strong className="text-foreground">{resources.find(r => r.id === res.attributes.parentId)?.name || "Neznámé"}</strong></p>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 border-t border-border pt-4 mt-4">
                            <button
                              onClick={() => setResourceModal({
                                open: true,
                                mode: "edit",
                                data: {
                                  id: res.id,
                                  name: res.name,
                                  type: res.type,
                                  maxCapacity: res.maxCapacity,
                                  instructor: res.attributes.instructor || "",
                                  room: res.attributes.room || "",
                                  parentId: res.attributes.parentId || "",
                                  surface: "",
                                  equipment: "",
                                  price: res.attributes.price || ""
                                }
                              })}
                              className="btn-outline py-1 px-2 text-tenant-primary text-xs"
                              title="Edit resource"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              onClick={() => handleResourceDelete(res.id)}
                              className="btn-outline py-1 px-2 text-destructive text-xs"
                              style={{ color: "oklch(0.60 0.18 15)" }}
                              title="Delete resource"
                            >
                              <Trash size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SCHEDULE RULES MANAGER */}
          {activeTab === "rules" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-foreground">Active Program Schedule Slots</h3>
                <button
                  disabled={resources.length === 0}
                  onClick={() => setRuleModal({
                    open: true, mode: "add",
                    data: { id: "", resourceId: resources[0]?.id || "", name: "", dayOfWeek: 1, startTime: "12:30", endTime: "14:00", price: 100, maxCapacity: 10, daysOfWeek: [1] }
                  })}
                  className="btn-tenant text-white text-xs font-bold flex items-center gap-1 shadow-sm disabled:opacity-50"
                >
                  <Plus size={14} />
                  Add Time Slot
                </button>
              </div>

              {resources.length === 0 ? (
                <div className="card p-8 text-center text-xs text-muted-foreground">
                  You must create at least one resource before configuring schedule rules.
                </div>
              ) : (
                <div className="card p-6 shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground font-medium">
                          <th className="py-2.5 font-semibold">Resource</th>
                          <th className="py-2.5 font-semibold">Slot Name</th>
                          <th className="py-2.5 font-semibold">Day</th>
                          <th className="py-2.5 font-semibold">Hours</th>
                          <th className="py-2.5 font-semibold">Price</th>
                          <th className="py-2.5 font-semibold">Max Capacity</th>
                          <th className="py-2.5 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resources.flatMap(res => res.scheduleRules.map((rule) => (
                          <tr key={rule.id} className="border-b border-border/40 hover:bg-secondary/40 transition-colors">
                            <td className="py-3 font-semibold text-foreground">{res.name}</td>
                            <td className="py-3 text-foreground font-medium">{rule.name}</td>
                            <td className="py-3 text-muted-foreground">{getDayName(rule.dayOfWeek)}</td>
                            <td className="py-3 text-foreground font-mono">{rule.startTime} – {rule.endTime}</td>
                            <td className="py-3 text-foreground">{rule.price} Kč</td>
                            <td className="py-3 text-foreground">{rule.maxCapacity}</td>
                            <td className="py-3 text-right space-x-1.5">
                              <button
                                onClick={() => setRuleModal({
                                  open: true,
                                  mode: "edit",
                                  data: {
                                    id: rule.id,
                                    resourceId: res.id,
                                    name: rule.name,
                                    dayOfWeek: rule.dayOfWeek ?? 1,
                                    startTime: rule.startTime,
                                    endTime: rule.endTime,
                                    price: parseFloat(rule.price),
                                    maxCapacity: rule.maxCapacity,
                                    daysOfWeek: rule.dayOfWeek !== null ? [rule.dayOfWeek] : []
                                  }
                                })}
                                className="btn-outline py-1 px-1.5 text-tenant-primary text-[10px]"
                              >
                                <Edit size={11} />
                              </button>
                              <button
                                onClick={() => handleRuleDelete(rule.id)}
                                className="btn-outline py-1 px-1.5 text-destructive text-[10px]"
                                style={{ color: "oklch(0.60 0.18 15)" }}
                              >
                                <Trash size={11} />
                              </button>
                            </td>
                          </tr>
                        )))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BOOKINGS */}
          {activeTab === "bookings" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Customer Reservations & Bookings</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Visualize reservations on the schedule or browse the details list.</p>
                </div>
                
                {/* Sub-tab Toggle */}
                <div className="flex bg-secondary p-1 rounded-xl border border-border text-xs select-none">
                  <button
                    onClick={() => setBookingsSubTab("calendar")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      bookingsSubTab === "calendar"
                        ? "bg-card text-foreground shadow-sm font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Eye size={14} />
                    Schedule Grid
                  </button>
                  <button
                    onClick={() => setBookingsSubTab("list")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      bookingsSubTab === "list"
                        ? "bg-card text-foreground shadow-sm font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <List size={14} />
                    Details List
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
                />
              ) : (
                /* List/Table View */
                <div className="card p-6 shadow-sm">
                  {bookings.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground font-mono">
                      No reservations booked by users yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground font-medium">
                            <th className="py-2.5 font-semibold">User</th>
                            <th className="py-2.5 font-semibold">Resource</th>
                            <th className="py-2.5 font-semibold">Reserved Slot</th>
                            <th className="py-2.5 font-semibold">Status</th>
                            <th className="py-2.5 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookings.map((booking) => (
                            <tr key={booking.id} className="border-b border-border/40 hover:bg-secondary/40 transition-colors">
                              <td className="py-3 font-medium text-foreground">
                                <div>{booking.userName}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">{booking.userEmail}</div>
                              </td>
                              <td className="py-3 text-foreground">{booking.resourceName}</td>
                              <td className="py-3 text-foreground font-mono">
                                {new Date(booking.reservedFrom).toLocaleDateString()}
                                <span className="text-muted-foreground text-[10px] ml-1.5">
                                  {new Date(booking.reservedFrom).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(booking.reservedTo).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getStatusBadgeColor(booking.status)}`}>
                                  {booking.status}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => {
                                    setConfirmModal({
                                      title: "Cancel Reservation",
                                      message: "Are you sure you want to cancel this reservation?",
                                      onConfirm: async () => {
                                        try {
                                          const res = await fetch(`/api/bookings?bookingId=${booking.id}`, {
                                            method: "DELETE"
                                          });
                                          if (res.ok) {
                                            setNotification({
                                              type: "success",
                                              title: "Reservation Cancelled",
                                              message: "Booking cancelled successfully!",
                                              onClose: () => router.refresh()
                                            });
                                          } else {
                                            setNotification({
                                              type: "error",
                                              title: "Cancellation Failed",
                                              message: "Error cancelling booking."
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
                                  className="text-red-500 font-bold hover:underline cursor-pointer"
                                >
                                  Cancel
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
                <h3 className="text-sm font-bold text-foreground">Access Scanners & Devices ({devices.length})</h3>
                <button
                  onClick={() => setDeviceModal({
                    open: true, mode: "add",
                    data: { id: "", name: "", token: "sec_tok_" + Math.random().toString(36).substring(3, 9), active: true }
                  })}
                  className="btn-tenant text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                >
                  <Plus size={14} />
                  Register Scanner
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {devices.map((dev) => (
                  <div key={dev.id} className="card p-5 flex flex-col justify-between hover:border-tenant-primary/30 transition-all relative">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          dev.active 
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-500 border border-red-500/20"
                        }`}>
                          {dev.active ? "Active" : "Disabled"}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono uppercase">ID: {dev.id}</span>
                      </div>
                      <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                        <Smartphone size={16} className="text-muted-foreground" />
                        {dev.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Scan event counts: <strong className="text-foreground">{dev.logsCount}</strong>
                      </p>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-border pt-4 mt-4">
                      <button
                        onClick={() => setDeviceModal({
                          open: true,
                          mode: "edit",
                          data: { id: dev.id, name: dev.name, token: "", active: dev.active }
                        })}
                        className="btn-outline py-1 px-2 text-tenant-primary text-xs"
                        title="Edit Device settings"
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        onClick={() => handleDeviceDelete(dev.id)}
                        className="btn-outline py-1 px-2 text-destructive text-xs"
                        style={{ color: "oklch(0.60 0.18 15)" }}
                        title="Remove Device"
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              {/* Branding and configuration */}
              <div className="card p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1">Branding & Settings</h3>
                  <p className="text-xs text-muted-foreground">Configure customized parameters for this portal instance.</p>
                </div>

                <form onSubmit={handleSettingsSubmit} className="space-y-6 text-xs">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-muted-foreground mb-1 font-semibold">Custom Tagline</label>
                        <input
                          type="text"
                          value={settingsTagline}
                          onChange={(e) => setSettingsTagline(e.target.value)}
                          className="input-field"
                          placeholder="e.g. Volnočasové výtvarné a kreativní ateliéry"
                        />
                        <span className="text-[10px] text-muted-foreground mt-1 block">
                          Will replace the default brand tagline on the main welcome banner.
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-muted-foreground mb-1 font-semibold">Grid Start Hour (HH:MM)</label>
                          <input
                            type="text"
                            required
                            pattern="^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$"
                            value={settingsOpenTime}
                            onChange={(e) => setSettingsOpenTime(e.target.value)}
                            className="input-field font-mono"
                            placeholder="08:00"
                          />
                        </div>
                        <div>
                          <label className="block text-muted-foreground mb-1 font-semibold">Grid End Hour (HH:MM)</label>
                          <input
                            type="text"
                            required
                            pattern="^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$"
                            value={settingsCloseTime}
                            onChange={(e) => setSettingsCloseTime(e.target.value)}
                            className="input-field font-mono"
                            placeholder="22:00"
                          />
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground block">
                        Defines the default scale boundaries of the public calendar view.
                      </span>

                      {/* Banner Image Upload widget */}
                      <div className="space-y-2.5 border-t border-border pt-4 mt-4">
                        <label className="block text-muted-foreground font-semibold">Portal Banner Image</label>
                        
                        <div className="relative group rounded-2xl overflow-hidden border border-border h-36">
                          <TenantBanner 
                            src={settingsBannerImage} 
                            alt="Banner Preview" 
                            heightClass="h-full"
                            fallbackText={tenant.name || "Tenant Banner"}
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            <label className="p-2 bg-white text-zinc-950 rounded-xl cursor-pointer shadow-md text-[11px] font-bold flex items-center gap-1.5">
                              <Upload size={14} />
                              {imageUploading ? "Uploading..." : settingsBannerImage ? "Change Banner" : "Upload Picture"}
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
                        <span className="text-[10px] text-muted-foreground block">
                          Upload a banner picture (PNG/JPG). It will display beautifully on the public portal banner page.
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-muted-foreground mb-1 font-semibold">Administrator Emails</label>
                        <textarea
                          rows={3}
                          value={settingsAdminEmails}
                          onChange={(e) => setSettingsAdminEmails(e.target.value)}
                          className="input-field font-mono resize-none"
                          placeholder="josef.novak@deepvision.cz, admin@sferapardubice.cz"
                        />
                        <span className="text-[10px] text-muted-foreground mt-1 block">
                          Comma-separated email list. Logged-in admin accounts must match these.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CUSTOM OPENING HOURS SECTION WITH PRESETS */}
                  <div className="border-t border-border pt-6 mt-6 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-foreground mb-1 flex items-center gap-1">
                        <Clock size={14} className="text-tenant-primary" />
                        Custom Day-of-Week Opening Hours
                      </h4>
                      <p className="text-[10px] text-muted-foreground">Define specific opening and closing hours for each weekday. Closed days won{"'"}t allow bookings.</p>
                    </div>

                    {/* Master Preset Bar */}
                    <div className="bg-secondary/40 border border-border/80 p-4 rounded-2xl space-y-3">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">Bulk Apply Presets</span>
                      <div className="flex flex-wrap items-center gap-4 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span>Open:</span>
                          <input 
                            type="text" 
                            value={presetOpenTime}
                            onChange={(e) => setPresetOpenTime(e.target.value)}
                            placeholder="08:00" 
                            className="bg-card border border-border rounded px-2 py-1 w-14 text-center font-mono text-foreground"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span>Close:</span>
                          <input 
                            type="text" 
                            value={presetCloseTime}
                            onChange={(e) => setPresetCloseTime(e.target.value)}
                            placeholder="22:00" 
                            className="bg-card border border-border rounded px-2 py-1 w-14 text-center font-mono text-foreground"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="checkbox" 
                            id="preset-closed" 
                            checked={presetClosed}
                            onChange={(e) => setPresetClosed(e.target.checked)}
                            className="rounded"
                          />
                          <label htmlFor="preset-closed" className="cursor-pointer font-semibold">Closed</label>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 pt-1 sm:pt-0">
                          <button
                            type="button"
                            onClick={() => applyPresetToDays([1, 2, 3, 4, 5, 6, 0])}
                            className="btn-outline px-2.5 py-1 text-[10px] font-bold hover:bg-tenant-primary hover:text-white"
                          >
                            Apply Everyday
                          </button>
                          <button
                            type="button"
                            onClick={() => applyPresetToDays([1, 2, 3, 4, 5])}
                            className="btn-outline px-2.5 py-1 text-[10px] font-bold hover:bg-tenant-primary hover:text-white"
                          >
                            Apply Weekdays
                          </button>
                          <button
                            type="button"
                            onClick={() => applyPresetToDays([6, 0])}
                            className="btn-outline px-2.5 py-1 text-[10px] font-bold hover:bg-tenant-primary hover:text-white"
                          >
                            Apply Weekend
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Opening hours table */}
                    <div className="overflow-hidden border border-border rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-secondary/45 text-muted-foreground font-semibold border-b border-border">
                            <th className="p-3">Day</th>
                            <th className="p-3">Opening Time (HH:MM)</th>
                            <th className="p-3">Closing Time (HH:MM)</th>
                            <th className="p-3 text-right">Closed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {settingsOpeningHours.map((day, idx) => (
                            <tr key={day.dayOfWeek} className="border-b border-border/40 hover:bg-secondary/15 transition-colors">
                              <td className="p-3 font-semibold text-foreground">{day.name}</td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  pattern="^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$"
                                  disabled={day.closed}
                                  value={day.openTime}
                                  onChange={(e) => {
                                    const updated = [...settingsOpeningHours];
                                    updated[idx].openTime = e.target.value;
                                    setSettingsOpeningHours(updated);
                                  }}
                                  className="bg-card border border-border rounded-lg px-3 py-1.5 w-20 text-center font-mono disabled:opacity-40 text-foreground"
                                  placeholder="08:00"
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  pattern="^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$"
                                  disabled={day.closed}
                                  value={day.closeTime}
                                  onChange={(e) => {
                                    const updated = [...settingsOpeningHours];
                                    updated[idx].closeTime = e.target.value;
                                    setSettingsOpeningHours(updated);
                                  }}
                                  className="bg-card border border-border rounded-lg px-3 py-1.5 w-20 text-center font-mono disabled:opacity-40 text-foreground"
                                  placeholder="22:00"
                                />
                              </td>
                              <td className="p-3 text-right">
                                <input
                                  type="checkbox"
                                  checked={day.closed}
                                  onChange={(e) => {
                                    const updated = [...settingsOpeningHours];
                                    updated[idx].closed = e.target.checked;
                                    setSettingsOpeningHours(updated);
                                  }}
                                  className="h-4 w-4 rounded bg-input border-border text-primary"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-border">
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="btn-tenant text-white font-bold disabled:opacity-50 shadow-md"
                    >
                      {isSavingSettings ? "Saving Settings..." : "Save Portal Settings"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </section>
      </main>

      {/* --- MODAL DIALOGS --- */}

      {/* 1. Resource CRUD Modal */}
      {resourceModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-card border border-border max-w-md w-full p-6 rounded-2xl shadow-2xl relative transition-colors duration-200">
            <h3 className="text-base font-bold text-foreground mb-4">
              {resourceModal.mode === "add" ? "Create Bookable Resource" : "Modify Resource Details"}
            </h3>
            <form onSubmit={handleResourceSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1 font-semibold">Resource Name</label>
                <input
                  type="text"
                  required
                  value={resourceModal.data.name}
                  onChange={(e) => setResourceModal({
                    ...resourceModal,
                    data: { ...resourceModal.data, name: e.target.value }
                  })}
                  className="input-field"
                  placeholder="e.g. Laboratoř biologie"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-semibold">Resource Type</label>
                <select
                  value={resourceModal.data.type}
                  onChange={(e) => setResourceModal({
                    ...resourceModal,
                    data: { ...resourceModal.data, type: e.target.value }
                  })}
                  className="select-field"
                >
                  <option value="SPACE">SPACE (Facility / Pitch / Space)</option>
                  <option value="SEAT">SEAT (Seat / Spot)</option>
                  <option value="COURSE_PROGRAM">COURSE_PROGRAM (Regular Class / Program)</option>
                </select>
                <div className="mt-2 p-3 bg-secondary/50 rounded-xl border border-border text-[11px] leading-relaxed text-muted-foreground space-y-2 select-none">
                  <span className="font-bold text-foreground block">💡 Jak se typ SPACE zobrazuje na veřejném webu?</span>
                  <span>
                    V areálu typu <strong>Sports Ground</strong> se typ <strong>SPACE</strong> na veřejných kartách zobrazuje jako štítek určující typ plochy.
                  </span>
                  <div className="space-y-1 pt-1">
                    <span className="font-semibold text-foreground block">Výchozí nastavení (Možnost 1 - Velikost plochy):</span>
                    <ul className="list-disc list-inside space-y-0.5 pl-1">
                      <li><strong>Celé hřiště</strong> (pokud nemá nadřazené hřiště).</li>
                      <li><strong>Polovina hřiště</strong> (pokud má nastavený nadřazený prvek nebo obsahuje v názvu "1/2" či "sektor").</li>
                    </ul>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <span className="font-semibold text-foreground block">Další možnosti přizpůsobení (úpravou ve funkci <code className="bg-secondary px-1 rounded text-tenant-primary font-mono text-[10px]">getResourceTypeName</code> v souboru <code className="bg-secondary px-1 rounded text-foreground font-mono text-[10px]">page.tsx</code>):</span>
                    <ol className="list-decimal list-inside space-y-1 pl-1">
                      <li>
                        <strong>Možnost 2 (Formát hry):</strong> Např. <em>"Fotbal 11v11"</em> pro celou plochu a <em>"Malý fotbal (5v5 / 7v7)"</em> pro sektory. Vhodné pro rychlé pochopení velikosti týmu.
                      </li>
                      <li>
                        <strong>Možnost 3 (Typ pronájmu/použití):</strong> Např. <em>"Jednorázový pronájem"</em>, <em>"Dlouhodobý trénink"</em> nebo <em>"Turnajový slot"</em>. Vhodné, pokud nabízíte různé obchodní modely.
                      </li>
                      <li>
                        <strong>Možnost 4 (Konkrétní typ sportoviště):</strong> Např. <em>"Fotbalové hřiště"</em>, <em>"Tenisový kurt"</em>, <em>"Beachvolejbal"</em> nebo <em>"Dráha"</em>. Užitečné pro multi-sportovní areály.
                      </li>
                      <li>
                        <strong>Možnost 5 (Účel plochy):</strong> Např. <em>"Zápasová plocha"</em> (s osvětlením a pevnými brankami) vs. <em>"Tréninková plocha"</em> (s přenosnými brankami).
                      </li>
                      <li>
                        <strong>Možnost 6 (Úplné skrytí):</strong> Štítek typu lze v souboru <code className="bg-secondary px-1 rounded text-foreground font-mono text-[10px]">page.tsx</code> zcela smazat, pokud jsou názvy ploch samy o sobě dostatečně popisné.
                      </li>
                    </ol>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-semibold">Maximum Capacity</label>
                <input
                  type="number"
                  required
                  value={resourceModal.data.maxCapacity}
                  onChange={(e) => setResourceModal({
                    ...resourceModal,
                    data: { ...resourceModal.data, maxCapacity: parseInt(e.target.value, 10) || 0 }
                  })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-semibold">Cena / Price (Kč / hod or per session)</label>
                <input
                  type="text"
                  value={resourceModal.data.price}
                  onChange={(e) => setResourceModal({
                    ...resourceModal,
                    data: { ...resourceModal.data, price: e.target.value }
                  })}
                  className="input-field"
                  placeholder="e.g. 500 or Dle dohody"
                />
              </div>

              {/* Conditionally display attributes depending on SPACE vs COURSE_PROGRAM */}
              {(resourceModal.data.type === "SPACE" || resourceModal.data.type === "SEAT") ? (
                <>
                  <div>
                    <label className="block text-muted-foreground mb-1 font-semibold">Povrch / Surface</label>
                    <input
                      type="text"
                      value={resourceModal.data.surface}
                      onChange={(e) => setResourceModal({
                        ...resourceModal,
                        data: { ...resourceModal.data, surface: e.target.value }
                      })}
                      className="input-field"
                      placeholder="e.g. Umělá tráva 3. generace"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground mb-1 font-semibold">Vybavení / Equipment</label>
                    <input
                      type="text"
                      value={resourceModal.data.equipment}
                      onChange={(e) => setResourceModal({
                        ...resourceModal,
                        data: { ...resourceModal.data, equipment: e.target.value }
                      })}
                      className="input-field"
                      placeholder="e.g. Přenosné branky"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-muted-foreground mb-1 font-semibold">Lektor / Instructor</label>
                    <input
                      type="text"
                      value={resourceModal.data.instructor}
                      onChange={(e) => setResourceModal({
                        ...resourceModal,
                        data: { ...resourceModal.data, instructor: e.target.value }
                      })}
                      className="input-field"
                      placeholder="e.g. RNDr. Pavel Černý"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground mb-1 font-semibold">Místnost / Room</label>
                    <input
                      type="text"
                      value={resourceModal.data.room}
                      onChange={(e) => setResourceModal({
                        ...resourceModal,
                        data: { ...resourceModal.data, room: e.target.value }
                      })}
                      className="input-field"
                      placeholder="e.g. Učebna C"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-muted-foreground mb-1 font-semibold">Parent Area / Field (Nadřazený prvek)</label>
                <select
                  value={resourceModal.data.parentId}
                  onChange={(e) => setResourceModal({
                    ...resourceModal,
                    data: { ...resourceModal.data, parentId: e.target.value }
                  })}
                  className="select-field"
                >
                  <option value="">None (Žádný)</option>
                  {resources
                    .filter((r) => r.id !== resourceModal.data.id)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResourceModal({ ...resourceModal, open: false })}
                  className="btn-secondary flex-1 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-tenant text-white flex-1 py-2 font-bold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Schedule Rule CRUD Modal */}
      {ruleModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-card border border-border max-w-md w-full p-6 rounded-2xl shadow-2xl relative transition-colors duration-200">
            <h3 className="text-base font-bold text-foreground mb-4">
              {ruleModal.mode === "add" ? "Add Program Schedule Slot" : "Modify Slot details"}
            </h3>
            <form onSubmit={handleRuleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1 font-semibold">Resource Link</label>
                <select
                  disabled={ruleModal.mode === "edit"}
                  value={ruleModal.data.resourceId}
                  onChange={(e) => setRuleModal({
                    ...ruleModal,
                    data: { ...ruleModal.data, resourceId: e.target.value }
                  })}
                  className="select-field disabled:opacity-50"
                >
                  {resources.map(res => (
                    <option key={res.id} value={res.id}>{res.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-semibold">Program Slot Name</label>
                <input
                  type="text"
                  required
                  value={ruleModal.data.name}
                  onChange={(e) => setRuleModal({
                    ...ruleModal,
                    data: { ...ruleModal.data, name: e.target.value }
                  })}
                  className="input-field"
                  placeholder="e.g. Učebna: Přírodopis"
                />
              </div>

              {/* Day Selection - Select for edit, checkboxes for add */}
              {ruleModal.mode === "edit" ? (
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Day of Week</label>
                  <select
                    value={ruleModal.data.dayOfWeek}
                    onChange={(e) => setRuleModal({
                      ...ruleModal,
                      data: { ...ruleModal.data, dayOfWeek: parseInt(e.target.value, 10) }
                    })}
                    className="select-field"
                  >
                    <option value={1}>Pondělí</option>
                    <option value={2}>Úterý</option>
                    <option value={3}>Středa</option>
                    <option value={4}>Čtvrtek</option>
                    <option value={5}>Pátek</option>
                    <option value={6}>Sobota</option>
                    <option value={0}>Neděle</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-muted-foreground font-semibold">Repeating Days</label>
                  <div className="grid grid-cols-3 gap-2 border border-border p-3 rounded-xl bg-secondary/25">
                    {[
                      { val: 1, label: "Po" },
                      { val: 2, label: "Út" },
                      { val: 3, label: "St" },
                      { val: 4, label: "Čt" },
                      { val: 5, label: "Pá" },
                      { val: 6, label: "So" },
                      { val: 0, label: "Ne" }
                    ].map(day => (
                      <div key={day.val} className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          id={`chk-day-${day.val}`}
                          checked={ruleModal.data.daysOfWeek.includes(day.val)}
                          onChange={(e) => {
                            const current = [...ruleModal.data.daysOfWeek];
                            if (e.target.checked) {
                              current.push(day.val);
                            } else {
                              const idx = current.indexOf(day.val);
                              if (idx > -1) current.splice(idx, 1);
                            }
                            setRuleModal({
                              ...ruleModal,
                              data: { ...ruleModal.data, daysOfWeek: current }
                            });
                          }}
                          className="h-3.5 w-3.5 rounded"
                        />
                        <label htmlFor={`chk-day-${day.val}`} className="cursor-pointer font-medium">{day.label}</label>
                      </div>
                    ))}
                  </div>

                  {/* Bulk Select Helper Buttons */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRuleModal({
                        ...ruleModal,
                        data: { ...ruleModal.data, daysOfWeek: [1, 2, 3, 4, 5, 6, 0] }
                      })}
                      className="px-2 py-1 border border-border hover:bg-secondary rounded text-[10px] font-semibold"
                    >
                      All Everyday
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuleModal({
                        ...ruleModal,
                        data: { ...ruleModal.data, daysOfWeek: [1, 2, 3, 4, 5] }
                      })}
                      className="px-2 py-1 border border-border hover:bg-secondary rounded text-[10px] font-semibold"
                    >
                      Weekdays (Po-Pá)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuleModal({
                        ...ruleModal,
                        data: { ...ruleModal.data, daysOfWeek: [6, 0] }
                      })}
                      className="px-2 py-1 border border-border hover:bg-secondary rounded text-[10px] font-semibold"
                    >
                      Weekend (So-Ne)
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Start Time (HH:MM)</label>
                  <input
                    type="text"
                    required
                    value={ruleModal.data.startTime}
                    onChange={(e) => setRuleModal({
                      ...ruleModal,
                      data: { ...ruleModal.data, startTime: e.target.value }
                    })}
                    className="input-field font-mono"
                    placeholder="e.g. 12:30"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">End Time (HH:MM)</label>
                  <input
                    type="text"
                    required
                    value={ruleModal.data.endTime}
                    onChange={(e) => setRuleModal({
                      ...ruleModal,
                      data: { ...ruleModal.data, endTime: e.target.value }
                    })}
                    className="input-field font-mono"
                    placeholder="e.g. 14:00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Price (Kč)</label>
                  <input
                    type="number"
                    required
                    value={ruleModal.data.price}
                    onChange={(e) => setRuleModal({
                      ...ruleModal,
                      data: { ...ruleModal.data, price: parseFloat(e.target.value) || 0 }
                    })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Max Capacity</label>
                  <input
                    type="number"
                    required
                    value={ruleModal.data.maxCapacity}
                    onChange={(e) => setRuleModal({
                      ...ruleModal,
                      data: { ...ruleModal.data, maxCapacity: parseInt(e.target.value, 10) || 0 }
                    })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRuleModal({ ...ruleModal, open: false })}
                  className="btn-secondary flex-1 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-tenant text-white flex-1 py-2 font-bold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. IoT Device Register Modal */}
      {deviceModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-card border border-border max-w-md w-full p-6 rounded-2xl shadow-2xl relative transition-colors duration-200">
            <h3 className="text-base font-bold text-foreground mb-4">
              {deviceModal.mode === "add" ? "Register Physical Access Device" : "Modify Device Parameters"}
            </h3>
            <form onSubmit={handleDeviceSubmit} className="space-y-4 text-xs">
              {deviceModal.mode === "add" && (
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Unique Device ID (Hardware Key)</label>
                  <input
                    type="text"
                    required
                    value={deviceModal.data.id}
                    onChange={(e) => setDeviceModal({
                      ...deviceModal,
                      data: { ...deviceModal.data, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }
                    })}
                    className="input-field font-mono"
                    placeholder="e.g. gate_west_01"
                  />
                </div>
              )}

              <div>
                <label className="block text-muted-foreground mb-1 font-semibold">Device Name (Location Tag)</label>
                <input
                  type="text"
                  required
                  value={deviceModal.data.name}
                  onChange={(e) => setDeviceModal({
                    ...deviceModal,
                    data: { ...deviceModal.data, name: e.target.value }
                  })}
                  className="input-field"
                  placeholder="e.g. Hlavní vstupní turniket"
                />
              </div>

              {deviceModal.mode === "add" && (
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Secret API Access Token (Plain text)</label>
                  <input
                    type="text"
                    required
                    value={deviceModal.data.token}
                    onChange={(e) => setDeviceModal({
                      ...deviceModal,
                      data: { ...deviceModal.data, token: e.target.value }
                    })}
                    className="input-field font-mono"
                    placeholder="Enter secret token for scanner auth"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    This token is hashed (SHA-256) inside the database. It cannot be recovered later.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="dev-active"
                  checked={deviceModal.data.active}
                  onChange={(e) => setDeviceModal({
                    ...deviceModal,
                    data: { ...deviceModal.data, active: e.target.checked }
                  })}
                  className="h-4 w-4 bg-input border-border text-primary rounded focus:ring-ring"
                />
                <label htmlFor="dev-active" className="text-foreground font-medium cursor-pointer select-none">
                  Device is active and allowing entry scans
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeviceModal({ ...deviceModal, open: false })}
                  className="btn-secondary flex-1 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-tenant text-white flex-1 py-2 font-bold"
                >
                  Save Device
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

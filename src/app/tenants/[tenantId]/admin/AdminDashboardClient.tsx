"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Building, Calendar, Clock, QrCode, ClipboardList, 
  Plus, Edit, Trash, Settings, 
  ArrowLeft, Smartphone, Activity
} from "lucide-react";
import { getTenantTheme } from "@/lib/tenantThemes";
import ThemeToggle from "@/components/ThemeToggle";

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
    };
  };
  resources: Resource[];
  bookings: Booking[];
  devices: Device[];
  checkinLogs: CheckinLog[];
}

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

  // Portal settings states
  const initialAttributes = tenant.attributes || {};
  const [settingsTagline, setSettingsTagline] = useState(initialAttributes.tagline || "");
  const [settingsOpenTime, setSettingsOpenTime] = useState(initialAttributes.openTime || "08:00");
  const [settingsCloseTime, setSettingsCloseTime] = useState(initialAttributes.closeTime || "18:00");
  const initialAdminEmails = Array.isArray(initialAttributes.adminEmails)
    ? initialAttributes.adminEmails.join(", ")
    : (initialAttributes.adminEmails || "josef.novak@deepvision.cz");
  const [settingsAdminEmails, setSettingsAdminEmails] = useState(initialAdminEmails);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Modals / forms states
  const [resourceModal, setResourceModal] = useState<{ open: boolean; mode: "add" | "edit"; data: { id: string; name: string; type: string; maxCapacity: number; instructor: string; room: string; parentId: string; surface: string; equipment: string; } }>({
    open: false,
    mode: "add",
    data: { id: "", name: "", type: "SPACE", maxCapacity: 10, instructor: "", room: "", parentId: "", surface: "", equipment: "" }
  });

  const [ruleModal, setRuleModal] = useState<{ open: boolean; mode: "add" | "edit"; data: { id: string; resourceId: string; name: string; dayOfWeek: number; startTime: string; endTime: string; price: number; maxCapacity: number; } }>({
    open: false,
    mode: "add",
    data: { id: "", resourceId: "", name: "", dayOfWeek: 1, startTime: "12:00", endTime: "13:30", price: 100, maxCapacity: 10 }
  });

  const [deviceModal, setDeviceModal] = useState<{ open: boolean; mode: "add" | "edit"; data: { id: string; name: string; token: string; active: boolean; } }>({
    open: false,
    mode: "add",
    data: { id: "", name: "", token: "", active: true }
  });

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
        equipment: resourceModal.data.equipment
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
        router.refresh();
      } else {
        alert("Error saving resource");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResourceDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resource and all its schedule rules?")) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resource_delete", data: { id } })
      });
      if (res.ok) router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSend = {
      ...ruleModal.data,
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
        router.refresh();
      } else {
        alert("Error saving schedule slot");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRuleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this schedule slot?")) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rule_delete", data: { id } })
      });
      if (res.ok) router.refresh();
    } catch (err) {
      console.error(err);
    }
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
        if (deviceModal.mode === "add" && deviceModal.data.token) {
          alert(`IoT Device configured successfully!\nSave the Token for turnstile device config:\nToken: ${deviceModal.data.token}`);
        }
        setDeviceModal({ ...deviceModal, open: false });
        router.refresh();
      } else {
        alert("Error saving device configuration");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeviceDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this check-in device?")) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "device_delete", data: { id } })
      });
      if (res.ok) router.refresh();
    } catch (err) {
      console.error(err);
    }
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
        alert("Portal settings updated successfully!");
        router.refresh();
      } else {
        alert("Error saving settings");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

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
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-foreground">Configured Resources ({resources.length})</h3>
                <button
                  onClick={() => setResourceModal({
                    open: true, mode: "add",
                    data: { id: "", name: "", type: "SPACE", maxCapacity: 10, instructor: "", room: "", parentId: "", surface: "", equipment: "" }
                  })}
                  className="btn-tenant text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                >
                  <Plus size={14} />
                  Add Resource
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {resources.map((res) => (
                  <div key={res.id} className="card p-5 flex flex-col justify-between hover:border-tenant-primary/30 transition-all">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground font-bold uppercase font-mono">
                          {res.type}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">Cap: {res.maxCapacity}</span>
                      </div>
                      <h4 className="font-bold text-base text-foreground">{res.name}</h4>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {tenant.vertical === "SPORTS_GROUND" ? (
                          <>
                            <p>Povrch: <strong className="text-foreground">{res.attributes.surface || "Nenastaven"}</strong></p>
                            <p>Vybavení: <strong className="text-foreground">{res.attributes.equipment || "Nenastaveno"}</strong></p>
                            {res.attributes.parentId && (
                              <p>Nadřazená plocha: <strong className="text-foreground">{resources.find(r => r.id === res.attributes.parentId)?.name || "Neznámá"}</strong></p>
                            )}
                          </>
                        ) : (
                          <>
                            <p>Lektor: <strong className="text-foreground">{res.attributes.instructor || "Nenastaven"}</strong></p>
                            <p>Místnost: <strong className="text-foreground">{res.attributes.room || "Nenastavena"}</strong></p>
                            {res.attributes.parentId && (
                              <p>Nadřazený prvek: <strong className="text-foreground">{resources.find(r => r.id === res.attributes.parentId)?.name || "Neznámý"}</strong></p>
                            )}
                          </>
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
                            surface: res.attributes.surface || "",
                            equipment: res.attributes.equipment || ""
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
                    data: { id: "", resourceId: resources[0]?.id || "", name: "", dayOfWeek: 1, startTime: "12:30", endTime: "14:00", price: 100, maxCapacity: 10 }
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
                                    maxCapacity: rule.maxCapacity
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
            <div className="card p-6 shadow-sm">
              <h3 className="text-sm font-bold text-foreground mb-4">Customer Reservations</h3>

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
                        <th className="py-2.5 font-semibold text-right">Booking Token</th>
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
                          <td className="py-3 text-right font-mono text-[10px] text-muted-foreground">
                            {booking.id}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

          {activeTab === "settings" && (
            <div className="card p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-foreground mb-1">Branding & Settings</h3>
                <p className="text-xs text-muted-foreground">Configure customized parameters for this portal instance.</p>
              </div>

              <form onSubmit={handleSettingsSubmit} className="space-y-4 text-xs">
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
                        <label className="block text-muted-foreground mb-1 font-semibold">Opening Time (HH:MM)</label>
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
                        <label className="block text-muted-foreground mb-1 font-semibold">Closing Time (HH:MM)</label>
                        <input
                          type="text"
                          required
                          pattern="^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$"
                          value={settingsCloseTime}
                          onChange={(e) => setSettingsCloseTime(e.target.value)}
                          className="input-field font-mono"
                          placeholder="18:00"
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Defines the hour scale boundaries shown on the front calendar view.
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-muted-foreground mb-1 font-semibold">Administrator Emails</label>
                      <textarea
                        rows={4}
                        value={settingsAdminEmails}
                        onChange={(e) => setSettingsAdminEmails(e.target.value)}
                        className="input-field font-mono resize-none"
                        placeholder="josef.novak@deepvision.cz, admin@sferapardubice.cz"
                      />
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        Comma-separated email list. Only users logging in via OneiD matching these emails can access this admin console.
                      </span>
                    </div>
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
                  <option value="SPACE">SPACE (Kapacitní prostor)</option>
                  <option value="SEAT">SEAT (Místo / Sedadlo)</option>
                  <option value="COURSE_PROGRAM">COURSE_PROGRAM (Výukový program)</option>
                </select>
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
                <label className="block text-muted-foreground mb-1 font-semibold">
                  {tenant.vertical === "SPORTS_GROUND" ? "Povrch / Surface" : "Lektor / Instructor"}
                </label>
                <input
                  type="text"
                  value={tenant.vertical === "SPORTS_GROUND" ? resourceModal.data.surface : resourceModal.data.instructor}
                  onChange={(e) => setResourceModal({
                    ...resourceModal,
                    data: tenant.vertical === "SPORTS_GROUND" 
                      ? { ...resourceModal.data, surface: e.target.value }
                      : { ...resourceModal.data, instructor: e.target.value }
                  })}
                  className="input-field"
                  placeholder={tenant.vertical === "SPORTS_GROUND" ? "e.g. Umělá tráva 3. generace" : "e.g. RNDr. Pavel Černý"}
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-semibold">
                  {tenant.vertical === "SPORTS_GROUND" ? "Vybavení / Equipment" : "Místnost / Room"}
                </label>
                <input
                  type="text"
                  value={tenant.vertical === "SPORTS_GROUND" ? resourceModal.data.equipment : resourceModal.data.room}
                  onChange={(e) => setResourceModal({
                    ...resourceModal,
                    data: tenant.vertical === "SPORTS_GROUND" 
                      ? { ...resourceModal.data, equipment: e.target.value }
                      : { ...resourceModal.data, room: e.target.value }
                  })}
                  className="input-field"
                  placeholder={tenant.vertical === "SPORTS_GROUND" ? "e.g. Přenosné branky" : "e.g. Učebna C"}
                />
              </div>

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

    </div>
  );
}

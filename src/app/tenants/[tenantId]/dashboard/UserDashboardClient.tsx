"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { 
  Calendar, Clock, User as UserIcon, CheckCircle, AlertTriangle, 
  MapPin, Shield, Phone, Mail, FileText, ArrowLeft, Loader2, 
  KeyRound, CreditCard, LogOut, Check, Building, QrCode, Ticket
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import AlertDialog from "@/components/AlertDialog";

interface UserDashboardClientProps {
  tenant: {
    id: string;
    name: string;
    vertical: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    phone: string | null;
    avatarUrl: string | null;
    addressStreet: string | null;
    addressCity: string | null;
    addressZip: string | null;
    addressCountry: string | null;
    organization: string | null;
  };
  bookings: {
    id: string;
    tenantId: string;
    tenantName: string;
    resourceId: string;
    resourceName: string;
    reservedFrom: string;
    reservedTo: string;
    status: string;
    price: string;
    createdAt: string;
    rentedEquipment?: any[] | null;
  }[];
  checkinLogs: {
    id: string;
    scannedAt: string;
    result: string;
    deviceName: string;
    bookingId: string;
    resourceName: string;
    tenantName: string;
  }[];
  theme: {
    primary: string;
    primaryHover: string;
    accent: string;
    gradientStart: string;
    gradientEnd: string;
  };
}

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&h=128&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=128&h=128&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=128&h=128&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=128&h=128&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=128&h=128&q=80",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=128&h=128&q=80",
];

export default function UserDashboardClient({
  tenant,
  user: initialUser,
  bookings: initialBookings,
  checkinLogs,
  theme,
}: UserDashboardClientProps) {
  const { update: updateSession } = useSession();
  const [activeTab, setActiveTab] = useState<"bookings" | "history" | "profile">("bookings");
  const [bookings, setBookings] = useState(initialBookings);
  const [user, setUser] = useState(initialUser);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Profile Form states
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");
  const [addressStreet, setAddressStreet] = useState(user.addressStreet || "");
  const [addressCity, setAddressCity] = useState(user.addressCity || "");
  const [addressZip, setAddressZip] = useState(user.addressZip || "");
  const [addressCountry, setAddressCountry] = useState(user.addressCountry || "");
  const [organization, setOrganization] = useState(user.organization || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // General Alert states
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<"success" | "error" | "info" | "confirm">("success");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertOnConfirm, setAlertOnConfirm] = useState<(() => void) | undefined>(undefined);
  const [alertOkLabel, setAlertOkLabel] = useState("Rozumím");
  const [alertCancelLabel, setAlertCancelLabel] = useState("Zrušit");

  const showModalAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "info" | "confirm" = "info",
    onConfirm?: () => void,
    okLabel = "Rozumím",
    cancelLabel = "Zrušit"
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertOnConfirm(() => onConfirm);
    setAlertOkLabel(okLabel);
    setAlertCancelLabel(cancelLabel);
    setAlertOpen(true);
  };

  // Ticket Modal state
  const [activeTicket, setActiveTicket] = useState<typeof bookings[0] | null>(null);

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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("cs-CZ", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTimeRange = (fromStr: string, toStr: string) => {
    const from = new Date(fromStr);
    const to = new Date(toStr);
    const format = (date: Date) => {
      const h = String(date.getUTCHours()).padStart(2, "0");
      const m = String(date.getUTCMinutes()).padStart(2, "0");
      return `${h}:${m}`;
    };
    return `${format(from)} - ${format(to)} (UTC)`;
  };

  const handleCancelBooking = (bookingId: string) => {
    showModalAlert(
      "Zrušit rezervaci?",
      "Opravdu chcete zrušit tuto rezervaci?",
      "confirm",
      async () => {
        setCancellingId(bookingId);
        try {
          const res = await fetch(`/api/bookings?bookingId=${bookingId}`, {
            method: "DELETE",
          });

          if (res.ok) {
            setBookings(bookings.filter((b) => b.id !== bookingId));
            showModalAlert("Rezervace zrušena", "Rezervace byla úspěšně zrušena.", "success");
          } else {
            showModalAlert("Chyba při rušení", "Rezervaci se nepodařilo zrušit. Kontaktujte prosím podporu.", "error");
          }
        } catch (err) {
          console.error(err);
          showModalAlert("Neočekávaná chyba", "Došlo k chybě při rušení rezervace.", "error");
        } finally {
          setCancellingId(null);
        }
      },
      "Zrušit rezervaci",
      "Zpět"
    );
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);

    if (password && password !== confirmPassword) {
      setProfileMessage({ type: "error", text: "Zadaná hesla se neshodují." });
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          password,
          avatarUrl,
          addressStreet,
          addressCity,
          addressZip,
          addressCountry,
          organization,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser({
          ...user,
          name: data.user.name,
          phone: data.user.phone,
          avatarUrl: data.user.avatarUrl,
          addressStreet: data.user.addressStreet,
          addressCity: data.user.addressCity,
          addressZip: data.user.addressZip,
          addressCountry: data.user.addressCountry,
          organization: data.user.organization,
        });

        // Update NextAuth session cookie
        await updateSession({
          name: data.user.name,
          phone: data.user.phone,
          avatarUrl: data.user.avatarUrl,
        });

        setProfileMessage({ type: "success", text: "Profil byl úspěšně aktualizován." });
        setPassword("");
        setConfirmPassword("");
      } else {
        const err = await res.json();
        setProfileMessage({ type: "error", text: err.error || "Uložení profilu se nezdařilo." });
      }
    } catch (err) {
      console.error(err);
      setProfileMessage({ type: "error", text: "Nastala neočekávaná chyba při ukládání." });
    } finally {
      setSavingProfile(false);
    }
  };

  const upcomingBookings = bookings
    .filter((b) => new Date(b.reservedTo) > new Date())
    .sort((a, b) => new Date(a.reservedFrom).getTime() - new Date(b.reservedFrom).getTime());
  const pastBookings = bookings
    .filter((b) => new Date(b.reservedTo) <= new Date())
    .sort((a, b) => new Date(b.reservedFrom).getTime() - new Date(a.reservedFrom).getTime());

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-150 relative overflow-hidden">
      
      {/* Background ambient glow blobs */}
      <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] pointer-events-none select-none -z-10 bg-parallax-blob-1">
        <div className="w-full h-full rounded-full bg-tenant-primary/10 dark:bg-tenant-primary/5 blur-[100px]" />
      </div>
      <div className="absolute bottom-[15%] right-[-5%] w-[55%] h-[55%] pointer-events-none select-none -z-10 bg-parallax-blob-2">
        <div className="w-full h-full rounded-full bg-[#7000FF]/10 dark:bg-[#7000FF]/5 blur-[120px]" />
      </div>
      <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] pointer-events-none select-none -z-10 bg-parallax-blob-3">
        <div className="w-full h-full rounded-full bg-[#7000FF]/8 dark:bg-[#7000FF]/4 blur-[110px]" />
      </div>

      {/* Header */}
      <header className="border-b border-slate-200/50 dark:border-[#1F1F35]/30 bg-white/45 dark:bg-[#07070C]/35 backdrop-blur-xl sticky top-0 z-40 transition-all shadow-md shadow-slate-100/5 dark:shadow-black/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/tenants/${tenant.id}`}
              className="py-1.5 px-3 rounded-none text-[11px] font-bold border border-tenant-primary/20 border-l-[3px] border-l-tenant-primary bg-tenant-primary/10 hover:bg-tenant-primary text-tenant-primary hover:text-white transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-sm uppercase tracking-widest"
            >
              <ArrowLeft size={13} />
              Zpět na rezervace
            </Link>
            <span className="h-4 w-px bg-slate-200 dark:bg-white/10 hidden sm:inline" />
            <span className="text-[9px] px-2 py-0.5 border border-slate-200/40 dark:border-white/10 bg-slate-100/50 dark:bg-white/5 text-slate-700 dark:text-zinc-300 font-extrabold uppercase tracking-widest select-none rounded-none shrink-0">
              Můj Profil / Dashboard
            </span>
          </div>

          <ThemeToggle className="p-2.5 rounded-none bg-white/10 dark:bg-white/5 text-slate-750 dark:text-zinc-400 hover:bg-white/20 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white border border-slate-200/40 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 hover:scale-105 shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center" />
        </div>
      </header>

      {/* Main Dashboard Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-8">
        
        {/* User profile banner header card */}
        <div className="relative overflow-hidden bg-white/45 dark:bg-[#0D0D15]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-none p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
          {/* Glowing back-glow */}
          <div className="absolute top-0 right-0 h-40 w-40 bg-tenant-gradient opacity-10 blur-3xl rounded-full" />
          
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left z-10">
            {/* Avatar */}
            <div className="relative h-20 w-20 rounded-none overflow-hidden bg-tenant-primary/10 border-2 border-tenant-primary/30 flex items-center justify-center font-extrabold text-2xl text-tenant-primary">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <h1 className="text-xl font-extrabold text-foreground tracking-tight">{user.name}</h1>
                <span className="px-2 py-0.5 rounded-none text-[9px] font-extrabold bg-tenant-primary/10 border border-tenant-primary/20 text-tenant-primary uppercase tracking-wide">
                  {user.role === "USER" ? "Zákazník" : user.role === "ADMIN" ? "Správce" : "Superadmin"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 justify-center sm:justify-start">
                <Mail size={12} className="text-muted-foreground" />
                {user.email}
                {user.phone && (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-border" />
                    <Phone size={12} className="text-muted-foreground" />
                    {user.phone}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Quick Stats Strip */}
          <div className="flex gap-4 w-full md:w-auto border-t md:border-t-0 border-border pt-4 md:pt-0 justify-center z-10 text-center">
            <div className="px-4 py-2 bg-secondary/20 rounded-none border border-border min-w-[90px]">
              <span className="block text-xl font-extrabold text-tenant-primary">{upcomingBookings.length}</span>
              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Aktivní</span>
            </div>
            <div className="px-4 py-2 bg-secondary/20 rounded-none border border-border min-w-[90px]">
              <span className="block text-xl font-extrabold text-foreground">{checkinLogs.length}</span>
              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Vstupy</span>
            </div>
            <div className="px-4 py-2 bg-secondary/20 rounded-none border border-border min-w-[90px]">
              <span className="block text-xl font-extrabold text-foreground">{bookings.length}</span>
              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Celkem</span>
            </div>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex border-b border-border gap-2 pb-px overflow-x-auto">
          <button
            onClick={() => setActiveTab("bookings")}
            className={`px-4 py-3 border-b-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "bookings"
                ? "border-tenant-primary text-tenant-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            style={{ "--tenant-primary": theme.primary } as React.CSSProperties}
          >
            <Calendar size={14} />
            Moje rezervace ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-3 border-b-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "history"
                ? "border-tenant-primary text-tenant-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            style={{ "--tenant-primary": theme.primary } as React.CSSProperties}
          >
            <Clock size={14} />
            Historie vstupů ({checkinLogs.length})
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-3 border-b-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "profile"
                ? "border-tenant-primary text-tenant-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            style={{ "--tenant-primary": theme.primary } as React.CSSProperties}
          >
            <UserIcon size={14} />
            Nastavení profilu
          </button>
        </div>

        {/* Tab content area */}
        <div className="space-y-6">
          {/* TAB 1: BOOKINGS */}
          {activeTab === "bookings" && (
            <div className="space-y-6">
              {/* Upcoming Reservations */}
              <div className="space-y-3">
                <h2 className="text-sm font-extrabold uppercase tracking-widest text-tenant-primary flex items-center gap-2">
                  Nadcházející rezervace
                </h2>
                
                {upcomingBookings.length === 0 ? (
                  <div className="bg-secondary/10 border border-border p-8 text-center rounded-none text-muted-foreground text-xs font-medium leading-relaxed">
                    Nemáte žádné nadcházející rezervace. Klikněte na tlačítko výše pro vytvoření nové rezervace.
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {upcomingBookings.map((b) => (
                      <div 
                        key={b.id} 
                        className="card p-5 relative overflow-hidden flex flex-col justify-between gap-4 border-slate-200 dark:border-[#1F1F35]"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] border-l-2 border-tenant-primary text-tenant-primary pl-1.5 font-extrabold uppercase tracking-wider select-none">
                              {b.tenantName}
                            </span>
                            {b.status === "PENDING_PAYMENT" ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-none bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                                <AlertTriangle size={10} className="stroke-[3]" />
                                Čeká na platbu
                              </span>
                            ) : new Date(b.reservedFrom) <= new Date() && new Date(b.reservedTo) > new Date() ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-none bg-indigo-550/10 dark:bg-indigo-500/20 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                                Právě probíhá
                              </span>
                            ) : b.status === "ATTENDED" ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-none bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle size={10} className="stroke-[3]" />
                                Odbaveno
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-none bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                                <Check size={10} className="stroke-[3]" />
                                Potvrzeno
                              </span>
                            )}
                          </div>

                          <h3 className="font-extrabold text-base text-foreground leading-tight">{b.resourceName}</h3>
                          
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <p className="flex items-center gap-1.5">
                              <Calendar size={13} className="text-muted-foreground" />
                              {formatDate(b.reservedFrom)}
                            </p>
                            <p className="flex items-center gap-1.5">
                              <Clock size={13} className="text-muted-foreground" />
                              {formatTimeRange(b.reservedFrom, b.reservedTo)}
                            </p>
                            {b.rentedEquipment && Array.isArray(b.rentedEquipment) && b.rentedEquipment.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-dashed border-border/60 text-[11px] text-muted-foreground space-y-1">
                                <span className="block font-bold text-[9px] uppercase tracking-wider text-slate-400">Půjčené vybavení:</span>
                                <div className="space-y-0.5 pl-1.5">
                                  {b.rentedEquipment.map((eq: any) => (
                                    <div key={eq.id} className="flex justify-between items-center">
                                      <span>• {eq.name} ({eq.quantity} ks)</span>
                                      <span className="font-semibold text-slate-700 dark:text-zinc-300">
                                        {eq.category === "default" ? "V ceně" : `${eq.price * eq.quantity} Kč`}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-border mt-1">
                          {b.status === "PENDING_PAYMENT" ? (
                            <Link
                              href={`/tenants/${tenant.id}/checkout?bookingId=${b.id}`}
                              className="btn-tenant flex-1 py-2 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-center"
                              style={{ 
                                background: `linear-gradient(135deg, oklch(0.65 0.18 55), oklch(0.55 0.18 45))`, // Amber/Orange gradient
                                boxShadow: `0 4px 12px rgba(245,158,11,0.15)`
                              }}
                            >
                              <CreditCard size={14} />
                              Zaplatit nyní ({parseFloat(b.price || "0").toLocaleString("cs-CZ")} Kč)
                            </Link>
                          ) : (
                            <button
                              onClick={() => setActiveTicket(b)}
                              className="btn-tenant flex-1 py-2 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                              style={{ 
                                background: theme.gradientStart ? `linear-gradient(135deg, ${theme.gradientStart}, ${theme.gradientEnd})` : theme.primary,
                                boxShadow: `0 4px 12px rgba(112,0,255,0.15)`
                              }}
                            >
                              <Ticket size={14} />
                              Vstupenka
                            </button>
                          )}
                          <button
                            onClick={() => handleCancelBooking(b.id)}
                            disabled={cancellingId === b.id}
                            className="btn-outline text-rose-500 hover:bg-rose-500/10 border-border py-2 px-3 shrink-0 cursor-pointer"
                            style={{ color: "oklch(0.60 0.18 15)" }}
                          >
                            {cancellingId === b.id ? "Rušení..." : "Zrušit"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Past Reservations */}
              {pastBookings.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-border">
                  <h2 className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    Proběhlé rezervace
                  </h2>

                  <div className="bg-card border border-border rounded-none overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-secondary/35 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                            <th className="p-4">Tenant / Property</th>
                            <th className="p-4">Rezervace</th>
                            <th className="p-4">Datum a čas</th>
                            <th className="p-4 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-foreground">
                          {pastBookings.map((b) => (
                            <tr key={b.id} className="hover:bg-secondary/5 transition-colors text-muted-foreground">
                              <td className="p-4 font-bold text-foreground">{b.tenantName}</td>
                              <td className="p-4 font-medium text-foreground">{b.resourceName}</td>
                              <td className="p-4 space-y-0.5">
                                <p className="font-semibold text-foreground">{new Date(b.reservedFrom).toLocaleDateString("cs-CZ")}</p>
                                <p className="text-[11px]">{formatTimeRange(b.reservedFrom, b.reservedTo)}</p>
                              </td>
                              <td className="p-4 text-right">
                                {b.status === "ATTENDED" ? (
                                  <span className="px-2 py-0.5 rounded-none bg-slate-100 dark:bg-[#131322]/40 text-slate-500 dark:text-zinc-400 border border-slate-200/50 dark:border-[#1F1F35] font-extrabold uppercase tracking-wider text-[9px] inline-flex items-center gap-1">
                                    <CheckCircle size={9} className="stroke-[2.5]" />
                                    Odbaveno
                                  </span>
                                ) : b.status === "PENDING_PAYMENT" ? (
                                  <span className="px-2 py-0.5 rounded-none bg-rose-500/5 dark:bg-rose-500/10 text-rose-550 dark:text-rose-450 border border-rose-500/15 font-extrabold uppercase tracking-wider text-[9px] inline-flex items-center gap-1">
                                    <AlertTriangle size={9} className="stroke-[2.5]" />
                                    Propadlo (Neuhrazeno)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-none bg-slate-50 dark:bg-slate-950/20 text-slate-400 dark:text-zinc-550 border border-slate-100 dark:border-zinc-800/40 font-extrabold uppercase tracking-wider text-[9px] inline-flex items-center gap-1">
                                    <Clock size={9} className="stroke-[2.5]" />
                                    Proběhlo
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CHECKIN HISTORY */}
          {activeTab === "history" && (
            <div className="space-y-3">
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-tenant-primary flex items-center gap-2">
                Historie fyzických příchodů a skenů
              </h2>

              {checkinLogs.length === 0 ? (
                <div className="bg-secondary/10 border border-border p-8 text-center rounded-none text-muted-foreground text-xs font-medium leading-relaxed">
                  Zatím jste neprovedli žádné fyzické check-iny u terminálů. Vaše QR kódy budou naskenovány na check-in zařízení při vstupu.
                </div>
              ) : (
                <div className="bg-card border border-border rounded-none overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-secondary/35 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                          <th className="p-4">Čas skenu</th>
                          <th className="p-4">Zařízení</th>
                          <th className="p-4">Rezervace</th>
                          <th className="p-4">Tenant</th>
                          <th className="p-4 text-right">Výsledek</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-foreground">
                        {checkinLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-secondary/10 transition-colors">
                            <td className="p-4 font-semibold">
                              {new Date(log.scannedAt).toLocaleString("cs-CZ")}
                            </td>
                            <td className="p-4 text-muted-foreground">{log.deviceName}</td>
                            <td className="p-4 font-bold">{log.resourceName}</td>
                            <td className="p-4 text-muted-foreground font-medium">{log.tenantName}</td>
                            <td className="p-4 text-right">
                              <span className={`px-2 py-0.5 rounded-none text-[9px] font-extrabold uppercase tracking-wider border ${
                                log.result === "SUCCESS"
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                  : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                              }`}>
                                {log.result === "SUCCESS" ? "Úspěch" : log.result.replace("_", " ")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROFILE SETTINGS */}
          {activeTab === "profile" && (
            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Left Col: Avatar Selection */}
              <div className="card p-6 h-fit flex flex-col items-center text-center gap-6 border-slate-200 dark:border-[#1F1F35]">
                <h3 className="font-extrabold text-sm text-foreground uppercase tracking-wider mb-2 self-start border-b border-border pb-2 w-full text-left">
                  Profilový Obrázek
                </h3>
                
                {/* Visual Avatar */}
                <div className="h-24 w-24 rounded-none overflow-hidden bg-tenant-primary/10 border-2 border-tenant-primary/30 flex items-center justify-center font-extrabold text-3xl text-tenant-primary shadow-inner">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Zvolený avatar" className="h-full w-full object-cover" />
                  ) : (
                    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
                  )}
                </div>

                <div className="space-y-3 w-full">
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-left">
                    Vyberte přednastavený avatar:
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {PRESET_AVATARS.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setAvatarUrl(url)}
                        className={`h-8 w-8 rounded-none overflow-hidden border-2 cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                          avatarUrl === url ? "border-tenant-primary scale-105 shadow-md" : "border-transparent"
                        }`}
                      >
                        <img src={url} alt={`Preset ${i}`} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>

                  <div className="pt-2">
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-left mb-1">
                      Nebo vložte URL obrázku:
                    </label>
                    <input
                      type="text"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="input-field py-1.5 text-[11px] font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Middle & Right Cols: Profile Data Form */}
              <div className="md:col-span-2 card p-6 border-slate-200 dark:border-[#1F1F35]">
                <h3 className="font-extrabold text-sm text-foreground uppercase tracking-wider mb-6 border-b border-border pb-3">
                  Osobní a Fakturační údaje
                </h3>



                <form onSubmit={handleProfileSubmit} className="space-y-6 text-xs">
                  
                  {/* Basic Data Grid */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="profile-name" className="block text-muted-foreground font-semibold">Celé jméno</label>
                      <div className="relative flex items-center">
                        <UserIcon size={14} className="absolute left-3.5 text-slate-400" />
                        <input
                          id="profile-name"
                          name="name"
                          type="text"
                          required
                          autoComplete="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="input-field pl-10"
                          style={{ paddingLeft: "2.5rem" }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="profile-phone" className="block text-muted-foreground font-semibold">Telefonní číslo</label>
                      <div className="relative flex items-center">
                        <Phone size={14} className="absolute left-3.5 text-slate-400" />
                        <input
                          id="profile-phone"
                          name="phone"
                          type="text"
                          autoComplete="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="input-field pl-10 font-mono"
                          style={{ paddingLeft: "2.5rem" }}
                          placeholder="+420777123456"
                        />
                      </div>
                    </div>
                  </div>

                  {/* B2B / Billing Details Grid */}
                  <div className="space-y-3 pt-2 border-t border-border">
                    <h4 className="text-[10px] font-bold text-tenant-primary uppercase tracking-wider">
                      Fakturační Adresa & Společnost (B2B SaaS)
                    </h4>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1 sm:col-span-2">
                        <label htmlFor="profile-organization" className="block text-muted-foreground font-semibold">Firma / Název organizace</label>
                        <div className="relative flex items-center">
                          <Building size={14} className="absolute left-3.5 text-slate-400" />
                          <input
                            id="profile-organization"
                            name="organization"
                            type="text"
                            autoComplete="organization"
                            value={organization}
                            onChange={(e) => setOrganization(e.target.value)}
                            placeholder="Např. DeepVision s.r.o."
                            className="input-field pl-10"
                            style={{ paddingLeft: "2.5rem" }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="profile-street" className="block text-muted-foreground font-semibold">Ulice a číslo popisné</label>
                        <div className="relative flex items-center">
                          <MapPin size={14} className="absolute left-3.5 text-slate-400" />
                          <input
                            id="profile-street"
                            name="street"
                            type="text"
                            autoComplete="street-address"
                            value={addressStreet}
                            onChange={(e) => setAddressStreet(e.target.value)}
                            placeholder="Např. 17. listopadu 237"
                            className="input-field pl-10"
                            style={{ paddingLeft: "2.5rem" }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="profile-city" className="block text-muted-foreground font-semibold">Město</label>
                        <input
                          id="profile-city"
                          name="city"
                          type="text"
                          autoComplete="address-level2"
                          value={addressCity}
                          onChange={(e) => setAddressCity(e.target.value)}
                          placeholder="Např. Pardubice"
                          className="input-field"
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="profile-zip" className="block text-muted-foreground font-semibold">PSČ</label>
                        <input
                          id="profile-zip"
                          name="zip"
                          type="text"
                          autoComplete="postal-code"
                          value={addressZip}
                          onChange={(e) => setAddressZip(e.target.value)}
                          placeholder="Např. 530 02"
                          className="input-field font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="profile-country" className="block text-muted-foreground font-semibold">Země</label>
                        <input
                          id="profile-country"
                          name="country"
                          type="text"
                          autoComplete="country-name"
                          value={addressCountry}
                          onChange={(e) => setAddressCountry(e.target.value)}
                          placeholder="Např. Česká republika"
                          className="input-field"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Change Password Block */}
                  <div className="space-y-3 pt-2 border-t border-border">
                    <h4 className="text-[10px] font-bold text-tenant-primary uppercase tracking-wider">
                      Změna hesla (ponechte prázdné, pokud nechcete měnit)
                    </h4>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label htmlFor="profile-password" className="block text-muted-foreground font-semibold">Nové heslo</label>
                        <div className="relative flex items-center">
                          <KeyRound size={14} className="absolute left-3.5 text-slate-400" />
                          <input
                            id="profile-password"
                            name="new-password"
                            type="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="input-field pl-10 font-mono"
                            style={{ paddingLeft: "2.5rem" }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="profile-confirm-password" className="block text-muted-foreground font-semibold">Potvrzení nového hesla</label>
                        <div className="relative flex items-center">
                          <KeyRound size={14} className="absolute left-3.5 text-slate-400" />
                          <input
                            id="profile-confirm-password"
                            name="confirm-password"
                            type="password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="input-field pl-10 font-mono"
                            style={{ paddingLeft: "2.5rem" }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit button */}
                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="border border-white/10 border-l-[3px] border-l-white/30 py-3 px-6 text-white text-[11px] font-extrabold uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-75 rounded-none"
                      style={{ 
                        background: theme.gradientStart ? `linear-gradient(135deg, ${theme.gradientStart}, ${theme.gradientEnd})` : theme.primary,
                        boxShadow: `0 4px 12px rgba(112,0,255,0.15)`
                      }}
                    >
                      {savingProfile && <Loader2 size={14} className="animate-spin" />}
                      {savingProfile ? "Ukládání..." : "Uložit nastavení profilu"}
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}
        </div>

      </main>

      {/* Ticket boarding pass modal overlay */}
      {activeTicket && (
        <div 
          onClick={() => setActiveTicket(null)}
          className="fixed inset-0 bg-[#07070C]/75 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in duration-200"
        >
          {/* Boarding Pass Ticket representation */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-[#0D0D15] rounded-none shadow-[0_25px_60px_rgba(0,0,0,0.4)] overflow-hidden border border-slate-200/50 dark:border-[#1F1F35] relative flex flex-col"
          >
            {/* Ticket Top Part */}
            <div className="p-6 text-xs space-y-4 text-slate-800 dark:text-slate-200 relative">
              {/* Glow badge */}
              <div className="absolute top-0 right-0 h-32 w-32 bg-tenant-gradient opacity-15 blur-2xl rounded-full" />
              
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[10px] uppercase tracking-widest text-tenant-primary">{activeTicket.tenantName}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-none bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold uppercase tracking-wider">
                  Aktivní vstup
                </span>
              </div>

              <div>
                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Sportoviště / Plocha</span>
                <h3 className="text-xl font-extrabold text-foreground leading-tight mt-0.5">{activeTicket.resourceName}</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dashed border-border mt-2">
                <div>
                  <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Datum vstupu</span>
                  <p className="font-bold text-foreground mt-0.5">{new Date(activeTicket.reservedFrom).toLocaleDateString("cs-CZ")}</p>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Časový úsek</span>
                  <p className="font-bold text-foreground mt-0.5">{formatTimeRange(activeTicket.reservedFrom, activeTicket.reservedTo).split(" (")[0]}</p>
                </div>
              </div>
            </div>

            {/* Ticket Divider with Semi-circle notches on edges */}
            <div className="relative h-6 flex items-center justify-center">
              <div className="absolute -left-3 h-6 w-6 rounded-none bg-[#07070C] border-r border-slate-200/50 dark:border-[#1F1F35]" />
              <div className="absolute -right-3 h-6 w-6 rounded-none bg-[#07070C] border-l border-slate-200/50 dark:border-[#1F1F35]" />
              <div className="w-full border-t border-dashed border-slate-300 dark:border-[#2A2A45] mx-5" />
            </div>

            {/* Ticket Bottom Part (QR Code) */}
            <div className="p-6 flex flex-col items-center bg-slate-50/50 dark:bg-slate-900/20 text-center gap-4">
              <div className="flex items-center gap-2 select-none bg-emerald-500/10 dark:bg-emerald-500/25 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 py-1 px-3 rounded-none text-[9px] font-extrabold uppercase tracking-wider">
                Aktivní zabezpečený kód
              </div>
              
              {/* Premium looking QR Code visual representation */}
              <div className="relative p-4 bg-white rounded-none border border-slate-200 flex items-center justify-center shadow-md select-none overflow-hidden group">
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

              <div className="space-y-1.5">
                <code className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest bg-secondary/50 py-1 px-3.5 rounded-none border border-border">
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

              <p className="text-[9px] text-slate-400 dark:text-zinc-500 leading-normal max-w-[220px]">
                Kód se z bezpečnostních důvodů každou minutu generuje znovu a bliká. Snímky obrazovky ani videozáznamy nebudou čtečkou přijaty.
              </p>

              <button
                onClick={() => setActiveTicket(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground text-xs font-semibold rounded-none transition-all cursor-pointer mt-2"
              >
                Zavřít lístek
              </button>
            </div>

          </div>
        </div>
      )}

      <AlertDialog
        isOpen={profileMessage !== null}
        type={profileMessage?.type || "success"}
        title={profileMessage?.type === "success" ? "Profil aktualizován" : "Uložení selhalo"}
        message={profileMessage?.text || ""}
        onClose={() => setProfileMessage(null)}
      />

      <AlertDialog
        isOpen={alertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertOpen(false)}
        onConfirm={alertOnConfirm}
        okLabel={alertOkLabel}
        cancelLabel={alertCancelLabel}
      />

    </div>
  );
}

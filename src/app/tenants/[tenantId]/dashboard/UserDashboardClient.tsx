"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { 
  Calendar, Clock, User as UserIcon, CheckCircle, AlertTriangle, 
  MapPin, Shield, Phone, Mail, FileText, ArrowLeft, Loader2, 
  KeyRound, CreditCard, LogOut, Check, Building, QrCode, Ticket,
  Users, Percent, TrendingUp, UserMinus, UserPlus, Receipt, DollarSign
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import AlertDialog from "@/components/AlertDialog";
import { formatCurrency } from "@/lib/translations";

interface UserDashboardClientProps {
  tenant: {
    id: string;
    name: string;
    vertical: string;
    locale?: string;
    timezone?: string;
    currency?: string;
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
  partner?: {
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
    creditBalance: string;
    creditLimit: string;
    billingCycle: string;
    paymentTermsDays: number;
    autoBillingEnabled: boolean;
    users: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      role: string;
      createdAt: string;
    }[];
    bookings: {
      id: string;
      resourceName: string;
      userName: string;
      userEmail: string;
      reservedFrom: string;
      reservedTo: string;
      status: string;
      price: string;
    }[];
    invoices: {
      id: string;
      number: string;
      status: string;
      issueDate: string;
      dueDate: string;
      amount: string;
      bookingsCount: number;
    }[];
  } | null;
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
  partner: initialPartner,
  theme,
}: UserDashboardClientProps) {
  const { update: updateSession } = useSession();
  const [activeTab, setActiveTab] = useState<"bookings" | "history" | "profile" | "partner">("bookings");
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

  // Handle Stripe redirect parameter verification
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const stripeSuccess = params.get("stripe_success");
    const bookingId = params.get("bookingId");
    const paymentIntentId = params.get("payment_intent");

    if (stripeSuccess === "true" && bookingId && paymentIntentId) {
      // Clear query parameters from URL to avoid re-triggering on refresh
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);

      const verifyPayment = async () => {
        showModalAlert("Ověřování platby", "Ověřujeme vaši platbu u brány Stripe...", "info");
        try {
          const res = await fetch("/api/bookings/pay/stripe-intent/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId, paymentIntentId }),
          });
          const data = await res.json();

          if (res.ok && data.status === "success") {
            setBookings(prevBookings =>
              prevBookings.map(b =>
                b.id === bookingId ? { ...b, status: "CONFIRMED" } : b
              )
            );
            showModalAlert("Platba ověřena", "Vaše rezervace byla úspěšně uhrazena a potvrzena.", "success");
          } else {
            showModalAlert(
              "Platba nepotvrzena",
              data.message || "Nepodařilo se automaticky ověřit platbu. Zkontrolujte stav za chvíli nebo kontaktujte podporu.",
              "error"
            );
          }
        } catch (err) {
          console.error("Verification error:", err);
          showModalAlert(
            "Chyba při ověřování",
            "Došlo k chybě při spojení se serverem při ověřování platby.",
            "error"
          );
        }
      };
      verifyPayment();
    }
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(tenant.locale || "cs-CZ", {
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

  const [partner, setPartner] = useState(initialPartner);
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [removingEmployeeEmail, setRemovingEmployeeEmail] = useState<string | null>(null);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeEmail) return;
    setAddingEmployee(true);
    try {
      const res = await fetch("/api/partner/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: employeeEmail, action: "add" }),
      });

      const data = await res.json();
      if (res.ok) {
        showModalAlert("Uživatel přidán", data.message || "Uživatel byl úspěšně přidán.", "success");
        setEmployeeEmail("");
        if (partner && data.user) {
          setPartner({
            ...partner,
            users: [
              ...partner.users,
              {
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                phone: null,
                role: data.user.role,
                createdAt: new Date().toISOString()
              }
            ]
          });
        }
      } else {
        showModalAlert("Chyba", data.error || "Uživatele se nepodařilo přidat.", "error");
      }
    } catch (err) {
      console.error(err);
      showModalAlert("Chyba", "Došlo k neočekávané chybě.", "error");
    } finally {
      setAddingEmployee(false);
    }
  };

  const handleRemoveEmployee = (email: string) => {
    showModalAlert(
      "Odebrat uživatele?",
      `Opravdu chcete odebrat uživatele ${email} z vaší firmy?`,
      "confirm",
      async () => {
        setRemovingEmployeeEmail(email);
        try {
          const res = await fetch("/api/partner/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, action: "remove" }),
          });

          const data = await res.json();
          if (res.ok) {
            showModalAlert("Uživatel odebrán", data.message || "Uživatel byl úspěšně odebrán.", "success");
            if (partner) {
              setPartner({
                ...partner,
                users: partner.users.filter(u => u.email !== email)
              });
            }
          } else {
            showModalAlert("Chyba", data.error || "Uživatele se nepodařilo odebrat.", "error");
          }
        } catch (err) {
          console.error(err);
          showModalAlert("Chyba", "Došlo k neočekávané chybě.", "error");
        } finally {
          setRemovingEmployeeEmail(null);
        }
      },
      "Odebrat",
      "Zpět"
    );
  };

  const formatPartnerDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(tenant.locale || "cs-CZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatPartnerTimeRange = (fromStr: string, toStr: string) => {
    const from = new Date(fromStr);
    const to = new Date(toStr);
    const format = (date: Date) => {
      const h = String(date.getUTCHours()).padStart(2, "0");
      const m = String(date.getUTCMinutes()).padStart(2, "0");
      return `${h}:${m}`;
    };
    return `${format(from)} - ${format(to)}`;
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
          {partner && (
            <button
              onClick={() => setActiveTab("partner")}
              className={`px-4 py-3 border-b-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeTab === "partner"
                  ? "border-tenant-primary text-tenant-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              style={{ "--tenant-primary": theme.primary } as React.CSSProperties}
            >
              <Building size={14} />
              Firemní portál ({partner.name})
            </button>
          )}
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
                              Zaplatit nyní ({formatCurrency(b.price || "0", tenant.currency || "CZK", tenant.locale || "cs-CZ")})
                            </Link>
                          ) : (
                            <button
                              onClick={() => setActiveTicket(b)}
                              className="btn-tenant flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Ticket size={14} />
                              Vstupenka
                            </button>
                          )}
                          <button
                            onClick={() => handleCancelBooking(b.id)}
                            disabled={cancellingId === b.id}
                            className="btn-danger py-2 px-3 shrink-0 cursor-pointer"
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
                                <p className="font-semibold text-foreground">{new Date(b.reservedFrom).toLocaleDateString(tenant.locale || "cs-CZ")}</p>
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
                              {new Date(log.scannedAt).toLocaleString(tenant.locale || "cs-CZ")}
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

          {/* TAB 4: PARTNER PORTAL */}
          {activeTab === "partner" && partner && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Summary Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Credit Overview */}
                <div className="card p-6 border-slate-200 dark:border-[#1F1F35] relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 h-24 w-24 bg-tenant-gradient opacity-10 blur-2xl rounded-full" />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Kredit a limit</span>
                      <DollarSign size={16} className="text-tenant-primary" />
                    </div>
                    <div>
                      <span className="text-2xl font-extrabold text-foreground">
                        {formatCurrency(partner.creditBalance, tenant.currency || "CZK", tenant.locale || "cs-CZ")}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Zůstatek kreditu k vyúčtování
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Limit:</span>
                    <span className="font-semibold">
                      {formatCurrency(partner.creditLimit, tenant.currency || "CZK", tenant.locale || "cs-CZ")}
                    </span>
                  </div>
                </div>

                {/* Partnership Details */}
                <div className="card p-6 border-slate-200 dark:border-[#1F1F35] relative overflow-hidden flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Partnerské údaje</span>
                      <Percent size={16} className="text-tenant-primary" />
                    </div>
                    <div>
                      <span className="text-2xl font-extrabold text-foreground">
                        {partner.discount}%
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Exkluzivní sleva na rezervace
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">IČO / DIČ:</span>
                    <span className="font-semibold font-mono">
                      {partner.companyId || "-"} / {partner.vatId || "-"}
                    </span>
                  </div>
                </div>

                {/* Invoicing Settings */}
                <div className="card p-6 border-slate-200 dark:border-[#1F1F35] relative overflow-hidden flex flex-col justify-between sm:col-span-2 lg:col-span-1">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Fakturační cyklus</span>
                      <TrendingUp size={16} className="text-tenant-primary" />
                    </div>
                    <div>
                      <span className="text-xl font-extrabold text-foreground uppercase tracking-wide">
                        {partner.billingCycle === "MONTHLY" ? "Měsíční" : partner.billingCycle === "WEEKLY" ? "Týdenní" : partner.billingCycle}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Automatické generování faktur
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Splatnost:</span>
                    <span className="font-semibold">{partner.paymentTermsDays} dní</span>
                  </div>
                </div>
              </div>

              {/* Roster & Add employee */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Add Employee Form */}
                <div className="card p-6 border-slate-200 dark:border-[#1F1F35] h-fit">
                  <h3 className="font-extrabold text-xs text-foreground uppercase tracking-wider mb-4 pb-2 border-b border-border flex items-center gap-1.5">
                    <UserPlus size={14} className="text-tenant-primary" />
                    Přidat zaměstnance
                  </h3>
                  <form onSubmit={handleAddEmployee} className="space-y-4">
                    <div className="space-y-1">
                      <label htmlFor="employee-email" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        E-mailová adresa
                      </label>
                      <input
                        id="employee-email"
                        type="email"
                        required
                        placeholder="zamestnanec@firma.cz"
                        value={employeeEmail}
                        onChange={(e) => setEmployeeEmail(e.target.value)}
                        className="input-field py-2 text-xs"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={addingEmployee}
                      className="w-full py-2.5 text-[11px] font-extrabold uppercase tracking-widest text-white border border-white/10 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 rounded-none"
                      style={{ 
                        background: theme.gradientStart ? `linear-gradient(135deg, ${theme.gradientStart}, ${theme.gradientEnd})` : theme.primary,
                        boxShadow: `0 4px 12px rgba(112,0,255,0.1)`
                      }}
                    >
                      {addingEmployee ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                      {addingEmployee ? "Přidávání..." : "Přiřadit k firmě"}
                    </button>
                  </form>
                  <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
                    Uživatel se musí nejprve zaregistrovat v platformě se svým e-mailem, aby ho bylo možné přidat pod vaši firmu.
                  </p>
                </div>

                {/* Employees List */}
                <div className="lg:col-span-2 card p-6 border-slate-200 dark:border-[#1F1F35]">
                  <h3 className="font-extrabold text-xs text-foreground uppercase tracking-wider mb-4 pb-2 border-b border-border flex items-center gap-1.5">
                    <Users size={14} className="text-tenant-primary" />
                    Seznam zaměstnanců ({partner.users.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[9px] pb-2">
                          <th className="pb-2">Jméno</th>
                          <th className="pb-2">E-mail</th>
                          <th className="pb-2">Přiřazen dne</th>
                          <th className="pb-2 text-right">Akce</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-foreground">
                        {partner.users.map((emp) => (
                          <tr key={emp.id} className="hover:bg-secondary/5 transition-colors">
                            <td className="py-2.5 font-bold flex items-center gap-2">
                              <div className="h-6 w-6 rounded-none bg-tenant-primary/10 border border-tenant-primary/20 flex items-center justify-center font-extrabold text-[10px] text-tenant-primary">
                                {emp.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                              </div>
                              {emp.name}
                            </td>
                            <td className="py-2.5 text-muted-foreground font-mono">{emp.email}</td>
                            <td className="py-2.5 text-muted-foreground">{formatPartnerDate(emp.createdAt)}</td>
                            <td className="py-2.5 text-right">
                              {emp.email === user.email ? (
                                <span className="text-[10px] text-muted-foreground font-semibold italic bg-secondary/35 py-0.5 px-2">
                                  Vy (Správce)
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleRemoveEmployee(emp.email)}
                                  disabled={removingEmployeeEmail === emp.email}
                                  className="text-rose-500 hover:text-rose-600 disabled:opacity-50 transition cursor-pointer font-bold uppercase tracking-wider text-[9px] flex items-center gap-0.5 ml-auto border border-rose-500/20 hover:border-rose-500 bg-rose-500/5 hover:bg-rose-500/10 px-2 py-1"
                                >
                                  {removingEmployeeEmail === emp.email ? "Odebírání..." : "Odebrat"}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Corporate Bookings overview */}
              <div className="card p-6 border-slate-200 dark:border-[#1F1F35]">
                <h3 className="font-extrabold text-xs text-foreground uppercase tracking-wider mb-4 pb-2 border-b border-border flex items-center gap-1.5">
                  <Calendar size={14} className="text-tenant-primary" />
                  Rezervace zaměstnanců
                </h3>
                {partner.bookings.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Žádné firemní rezervace nebyly nalezeny.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[9px] pb-2">
                          <th className="pb-2">Datum a čas</th>
                          <th className="pb-2">Zaměstnanec</th>
                          <th className="pb-2">Rezervovaný zdroj</th>
                          <th className="pb-2">Cena</th>
                          <th className="pb-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-foreground">
                        {partner.bookings.map((bk) => (
                          <tr key={bk.id} className="hover:bg-secondary/5 transition-colors">
                            <td className="py-2.5 font-semibold">
                              <p>{formatPartnerDate(bk.reservedFrom)}</p>
                              <p className="text-[10px] text-muted-foreground font-normal">{formatPartnerTimeRange(bk.reservedFrom, bk.reservedTo)}</p>
                            </td>
                            <td className="py-2.5 space-y-0.5">
                              <p className="font-semibold text-foreground">{bk.userName}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{bk.userEmail}</p>
                            </td>
                            <td className="py-2.5 font-medium">{bk.resourceName}</td>
                            <td className="py-2.5 font-mono">{formatCurrency(bk.price, tenant.currency || "CZK", tenant.locale || "cs-CZ")}</td>
                            <td className="py-2.5 text-right">
                              <span className={`px-2 py-0.5 rounded-none text-[9px] font-extrabold uppercase tracking-wider border ${
                                bk.status === "ATTENDED"
                                  ? "bg-slate-100 dark:bg-[#131322]/40 text-slate-500 dark:text-zinc-400 border border-slate-200/50 dark:border-[#1F1F35]"
                                  : bk.status === "CONFIRMED"
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-650 dark:text-emerald-400"
                                  : bk.status === "PENDING_PAYMENT"
                                  ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                                  : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                              }`}>
                                {bk.status === "ATTENDED" ? "Odbaveno" : bk.status === "CONFIRMED" ? "Potvrzeno" : bk.status === "PENDING_PAYMENT" ? "Čeká na platbu" : "Zrušeno"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Corporate Invoices list */}
              <div className="card p-6 border-slate-200 dark:border-[#1F1F35]">
                <h3 className="font-extrabold text-xs text-foreground uppercase tracking-wider mb-4 pb-2 border-b border-border flex items-center gap-1.5">
                  <Receipt size={14} className="text-tenant-primary" />
                  Přehled firemních faktur
                </h3>
                {partner.invoices.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Žádné faktury nebyly nalezeny.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[9px] pb-2">
                          <th className="pb-2">Číslo faktury</th>
                          <th className="pb-2">Datum vystavení</th>
                          <th className="pb-2">Splatnost</th>
                          <th className="pb-2">Počet rezervací</th>
                          <th className="pb-2 font-mono">Částka celkem</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2 text-right">Akce</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-foreground">
                        {partner.invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-secondary/5 transition-colors">
                            <td className="py-2.5 font-bold font-mono text-tenant-primary">{inv.number}</td>
                            <td className="py-2.5 text-muted-foreground">{formatPartnerDate(inv.issueDate)}</td>
                            <td className="py-2.5 text-muted-foreground">{formatPartnerDate(inv.dueDate)}</td>
                            <td className="py-2.5 text-muted-foreground">{inv.bookingsCount} x</td>
                            <td className="py-2.5 font-bold font-mono">{formatCurrency(inv.amount, tenant.currency || "CZK", tenant.locale || "cs-CZ")}</td>
                            <td className="py-2.5">
                              <span className={`px-2 py-0.5 rounded-none text-[9px] font-extrabold uppercase tracking-wider border ${
                                inv.status === "PAID"
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                  : inv.status === "SENT"
                                  ? "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                                  : inv.status === "CANCELLED"
                                  ? "bg-red-500/10 border-red-500/20 text-red-500"
                                  : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                              }`}>
                                {inv.status === "PAID" ? "Zaplaceno" : inv.status === "SENT" ? "Odesláno" : inv.status === "CANCELLED" ? "Stornováno" : "Návrh"}
                              </span>
                            </td>
                            <td className="py-2.5 text-right">
                              <Link
                                href={`/tenants/${tenant.id}/admin/invoices/${inv.id}`}
                                target="_blank"
                                className="text-tenant-primary hover:underline font-bold uppercase tracking-wider text-[9px] border border-tenant-primary/20 hover:border-tenant-primary bg-tenant-primary/5 hover:bg-tenant-primary/10 px-2.5 py-1.5 inline-flex items-center gap-1 cursor-pointer"
                              >
                                <FileText size={10} />
                                Zobrazit / Tisk
                              </Link>
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
                  <p className="font-bold text-foreground mt-0.5">{new Date(activeTicket.reservedFrom).toLocaleDateString(tenant.locale || "cs-CZ")}</p>
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

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { 
  Plus, Edit, Trash, RotateCcw, Server, Globe, Shield, 
  Activity, ExternalLink, Users, LogOut, KeyRound, Mail, 
  User as UserIcon, ShieldAlert, Loader2, Phone, Briefcase,
  ArrowLeft, Database, Cpu, Terminal, Building, Lock, Layers,
  Percent, ChevronDown, CreditCard
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import AlertDialog from "@/components/AlertDialog";
import SystemUpdatesList from "@/components/SystemUpdatesList";

interface TenantResource {
  id: string;
}

interface TenantDevice {
  id: string;
}

interface Tenant {
  id: string;
  name: string;
  domain: string;
  vertical: string;
  ssoClientId: string;
  ssoClientSec: string;
  resources: TenantResource[];
  devices: TenantDevice[];
  paymentCut?: number;
  bookings?: { price: string; paymentCutAmount: string }[];
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  maxResourcesLimit?: number;
  maxDevicesLimit?: number;
}

interface DBUser {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  tenantId: string | null;
  tenant?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

const getVerticalBadgeStyles = (vertical: string) => {
  return "border-slate-300 dark:border-zinc-750 text-slate-500 dark:text-zinc-400";
};

const getVerticalSolidColor = (vertical: string) => {
  switch (vertical) {
    case "SPORTS_GROUND":
      return "bg-emerald-500 dark:bg-emerald-400";
    case "CAPACITY_CLASS":
      return "bg-fuchsia-500 dark:bg-fuchsia-400";
    case "EDUCATIONAL_COURSE":
      return "bg-cyan-500 dark:bg-cyan-400";
    case "EVENT_TICKETING":
      return "bg-amber-500 dark:bg-amber-400";
    default:
      return "bg-primary";
  }
};

const getSubscriptionBadgeStyles = (status: string) => {
  const isActive = status === "ACTIVE" || status === "TRIALING";
  if (isActive) {
    return "bg-emerald-500/5 border-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  }
  return "bg-rose-500/5 border-rose-500/15 text-rose-600 dark:text-rose-400 animate-pulse";
};

const getVerticalGradient = (vertical: string) => {
  switch (vertical) {
    case "SPORTS_GROUND":
      return "from-emerald-500 to-emerald-400";
    case "CAPACITY_CLASS":
      return "from-fuchsia-500 to-fuchsia-400";
    case "EDUCATIONAL_COURSE":
      return "from-cyan-500 to-cyan-400";
    case "EVENT_TICKETING":
      return "from-amber-500 to-amber-400";
    default:
      return "from-primary to-[#8B5CF6]";
  }
};

export default function HostConsole() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<"tenants" | "users" | "updates">("tenants");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<DBUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Partial<Tenant> | null>(null);
  const liveEditingTenant = editingTenant ? tenants.find(t => t.id === editingTenant.id) || editingTenant : null;
  const [editingUser, setEditingUser] = useState<Partial<DBUser> | null>(null);

  // Alert popup states
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<"success" | "error" | "info" | "confirm">("success");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertCopyText, setAlertCopyText] = useState<string | undefined>(undefined);
  const [alertOnConfirm, setAlertOnConfirm] = useState<(() => void) | undefined>(undefined);
  const [alertOkLabel, setAlertOkLabel] = useState("Rozumím");
  const [alertCancelLabel, setAlertCancelLabel] = useState("Zrušit");

  const showModalAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "info" | "confirm" = "info",
    copyText?: string,
    onConfirm?: () => void,
    okLabel = "Rozumím",
    cancelLabel = "Zrušit"
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertCopyText(copyText);
    setAlertOnConfirm(() => onConfirm);
    setAlertOkLabel(okLabel);
    setAlertCancelLabel(cancelLabel);
    setAlertOpen(true);
  };

  // Superadmin Login Form states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Tenant Form states
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    domain: "",
    vertical: "SPORTS_GROUND",
    ssoClientId: "oneid-client-id",
    ssoClientSec: "oneid-client-secret",
    paymentCut: 3,
  });

  // User Form states
  const [userFormData, setUserFormData] = useState({
    id: "",
    name: "",
    email: "",
    password: "",
    role: "ADMIN",
    tenantId: "",
    phone: "",
  });

  const getTenantUrl = (tenantId: string) => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      const port = window.location.port;
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return `http://${tenantId}.localhost${port ? `:${port}` : ""}`;
      }
    }
    return `/tenants/${tenantId}`;
  };

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin");
      if (res.ok) {
        const data = await res.json();
        setTenants(data);
      }
    } catch (err) {
      console.error("Failed to load tenants", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "user_list" }),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "SUPERADMIN") {
      fetchTenants();
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [status, session]);

  const handleSuperadminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const result = await signIn("admin-credentials", {
        username: loginEmail,
        password: loginPassword,
        redirect: false,
      });

      if (result?.error) {
        setLoginError("Neplatné heslo nebo e-mail superadministrátora.");
        setLoginLoading(false);
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error("Superadmin login error:", err);
      setLoginError("Během přihlašování došlo k neočekávané chybě.");
      setLoginLoading(false);
    }
  };

  const handleResetDb = () => {
    showModalAlert(
      "Reset Database?",
      "Are you sure you want to reset and re-seed the database? This deletes all current custom bookings, custom users, and tenant alterations!",
      "confirm",
      undefined,
      async () => {
        setIsResetting(true);
        try {
          const res = await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "seed_reset" }),
          });
          if (res.ok) {
            showModalAlert("Database Re-seeded Successfully!", "All test data has been restored, and customized accounts/bookings have been reset.", "success");
            fetchTenants();
            fetchUsers();
          } else {
            showModalAlert("Database Reset Failed", "Failed to seed database with initial records.", "error");
          }
        } catch (e) {
          console.error(e);
          showModalAlert("Unexpected Error", "An error occurred while re-seeding database.", "error");
        } finally {
          setIsResetting(false);
        }
      },
      "Confirm",
      "Cancel"
    );
  };

  // --- Tenant Handlers ---
  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      id: tenant.id,
      name: tenant.name,
      domain: tenant.domain.includes(".") ? tenant.domain : `${tenant.domain}.localhost:3000`,
      vertical: tenant.vertical,
      ssoClientId: tenant.ssoClientId,
      ssoClientSec: tenant.ssoClientSec,
      paymentCut: tenant.paymentCut !== undefined && tenant.paymentCut !== null ? tenant.paymentCut : 3,
    });
  };

  const handleCancelEdit = () => {
    setEditingTenant(null);
    setFormData({
      id: "",
      name: "",
      domain: "",
      vertical: "SPORTS_GROUND",
      ssoClientId: "oneid-client-id",
      ssoClientSec: "oneid-client-secret",
      paymentCut: 3,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Normalize domain: if no dot is present, append .localhost:3000
    let normalizedDomain = formData.domain.trim();
    if (normalizedDomain && !normalizedDomain.includes(".")) {
      normalizedDomain = `${normalizedDomain}.localhost:3000`;
    }

    const submissionData = {
      ...formData,
      domain: normalizedDomain
    };

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "tenant_upsert",
          data: submissionData,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.adminCreated) {
          showModalAlert(
            "Tenant Created Successfully!",
            "Default Admin Credentials have been automatically generated for this tenant scope. You can copy and share them below:",
            "success",
            `Email: ${result.adminEmail}\nPassword: ${result.adminPassword}`
          );
        } else {
          showModalAlert(
            "Tenant Saved Successfully!",
            "The tenant profile and theme settings have been updated.",
            "success"
          );
        }
        handleCancelEdit();
        fetchTenants();
        fetchUsers();
      } else {
        const err = await res.json();
        showModalAlert("Error Saving Tenant", err.error || "Failed to save tenant profile.", "error");
      }
    } catch (err) {
      console.error(err);
      showModalAlert("Unexpected Error", "An unexpected error occurred while saving the tenant.", "error");
    }
  };

  const handleDelete = (id: string) => {
    showModalAlert(
      "Delete Tenant?",
      `Are you sure you want to delete tenant '${id}'? This will delete all its resources, rules, and bookings!`,
      "confirm",
      undefined,
      async () => {
        try {
          const res = await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "tenant_delete",
              data: { id },
            }),
          });

          if (res.ok) {
            showModalAlert("Tenant Deleted", "The tenant and all its associated data have been permanently removed.", "success");
            fetchTenants();
            fetchUsers();
          } else {
            showModalAlert("Deletion Failed", "Failed to delete tenant from registry.", "error");
          }
        } catch (err) {
          console.error(err);
          showModalAlert("Unexpected Error", "An error occurred while deleting the tenant.", "error");
        }
      },
      "Delete",
      "Cancel"
    );
  };

  // --- User Handlers ---
  const handleEditUser = (user: DBUser) => {
    setEditingUser(user);
    setUserFormData({
      id: user.id,
      name: user.name,
      email: user.email,
      password: "", // blank by default on edit
      role: user.role,
      tenantId: user.tenantId || "",
      phone: user.phone || "",
    });
  };

  const handleCancelUserEdit = () => {
    setEditingUser(null);
    setUserFormData({
      id: "",
      name: "",
      email: "",
      password: "",
      role: "ADMIN",
      tenantId: "",
      phone: "",
    });
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "user_upsert",
          data: userFormData,
        }),
      });

      if (res.ok) {
        showModalAlert("User Account Saved", "The system account has been successfully created or updated.", "success");
        handleCancelUserEdit();
        fetchTenants();
        fetchUsers();
      } else {
        const err = await res.json();
        showModalAlert("Error Saving Account", err.error || "Failed to save account details.", "error");
      }
    } catch (err) {
      console.error(err);
      showModalAlert("Unexpected Error", "An error occurred while saving the account.", "error");
    }
  };

  const handleDeleteUser = (id: string, name: string) => {
    if (id === session?.user?.id) {
      showModalAlert("Action Restricted", "You cannot delete your own logged-in superadmin profile!", "error");
      return;
    }
    showModalAlert(
      "Delete Account?",
      `Are you sure you want to delete user '${name}'?`,
      "confirm",
      undefined,
      async () => {
        try {
          const res = await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "user_delete",
              data: { id },
            }),
          });

          if (res.ok) {
            showModalAlert("Account Deleted", `System account '${name}' has been successfully deleted.`, "success");
            fetchTenants();
            fetchUsers();
          } else {
            showModalAlert("Deletion Failed", "Failed to delete user account.", "error");
          }
        } catch (err) {
          console.error(err);
          showModalAlert("Unexpected Error", "An error occurred while deleting the user account.", "error");
        }
      },
      "Delete",
      "Cancel"
    );
  };

  // 1. Loading state for session verification
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
        <Loader2 size={36} className="animate-spin text-primary" />
        <span className="text-xs font-semibold mt-4 text-muted-foreground">Ověřování oprávnění...</span>
      </div>
    );
  }

  // 2. Unauthenticated superadmin layout (Login form)
  if (status === "unauthenticated" || session?.user?.role !== "SUPERADMIN") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 relative font-sans overflow-hidden">
        {/* Background ambient glow blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#7000FF]/6 dark:bg-[#7000FF]/4 blur-[120px] pointer-events-none animate-blob-orbit-1" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#3B82F6]/6 dark:bg-[#3B82F6]/4 blur-[120px] pointer-events-none animate-blob-orbit-2" />

        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>

        <div className="max-w-md w-full bg-white/70 dark:bg-[#0E0E1B]/75 backdrop-blur-xl border border-slate-200/50 dark:border-[#2A2A40]/45 rounded-none p-8 shadow-xl shadow-slate-100/10 dark:shadow-black/20 hover:shadow-neon-glow hover:border-[#7000FF]/30 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 bg-[#7000FF]/10 blur-3xl rounded-full" />
          
          <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-none bg-[#7000FF]/10 border border-[#7000FF]/20 flex items-center justify-center text-[#7000FF] dark:text-[#A78BFA] mb-6 shadow-lg shadow-[#7000FF]/5">
              <Shield size={28} />
            </div>

            <span className="text-[10px] px-2.5 py-0.5 rounded-none bg-[#7000FF]/10 border border-[#7000FF]/20 text-[#7000FF] dark:text-[#A78BFA] font-bold uppercase tracking-wider mb-2">
              Superadmin Vstup
            </span>

            <h2 className="text-xl font-bold text-foreground mb-1">
              ReSys Platform Console
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mb-6">
              Přihlaste se svými vývojářskými / platformovými údaji
            </p>

            {loginError && (
              <div className="w-full bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs p-3 rounded-none mb-4 flex items-start gap-2 text-left animate-pulse">
                <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleSuperadminLogin} className="w-full space-y-4 text-xs text-left">
              <div className="space-y-1">
                <label className="block text-slate-500 dark:text-zinc-400 font-semibold">E-mail administrátora</label>
                <div className="relative flex items-center">
                  <Mail size={14} className="absolute left-3.5 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="input-field pl-10 py-2.5 text-xs bg-secondary/35"
                    style={{ paddingLeft: "2.5rem" }}
                    placeholder="superadmin@resys.cz"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-500 dark:text-zinc-400 font-semibold">Heslo</label>
                <div className="relative flex items-center">
                  <KeyRound size={14} className="absolute left-3.5 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="input-field pl-10 py-2.5 text-xs bg-secondary/35"
                    style={{ paddingLeft: "2.5rem" }}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 bg-gradient-to-r from-[#7000FF] to-[#3B82F6] hover:scale-[1.015] hover:shadow-neon-glow active:scale-[0.98] text-white text-xs font-bold rounded-none transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                {loginLoading ? <Loader2 size={14} className="animate-spin" /> : "Vstoupit do administrace"}
              </button>
            </form>

            <Link
              href="/"
              className="text-[11px] text-muted-foreground hover:text-foreground mt-6 transition-colors font-medium underline"
            >
              Zpět na veřejný portál
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Fully authenticated Superadmin dashboard
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-200 relative overflow-hidden">
      {/* Background ambient glow blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-[45vw] h-[45vw] rounded-full bg-[#7000FF]/6 dark:bg-[#7000FF]/4 blur-[130px] pointer-events-none -z-10 animate-blob-orbit-1" />
      <div className="absolute bottom-[10%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-[#3B82F6]/6 dark:bg-[#3B82F6]/4 blur-[140px] pointer-events-none -z-10 animate-blob-orbit-2" />
      <div className="absolute top-[30%] right-[15%] w-[35vw] h-[35vw] rounded-full bg-[#8B5CF6]/4 dark:bg-[#8B5CF6]/3 blur-[120px] pointer-events-none -z-10 animate-blob-orbit-3" />

      <header className="border-b border-slate-200/50 dark:border-[#1F1F35]/30 bg-white/45 dark:bg-[#07070C]/35 backdrop-blur-xl sticky top-0 z-40 transition-all shadow-md shadow-slate-100/5 dark:shadow-black/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-none bg-white/40 dark:bg-[#0F0F1A]/60 backdrop-blur-md text-slate-500 dark:text-zinc-400 hover:text-[#7000FF] dark:hover:text-[#A78BFA] border border-[#E2E2ED]/60 dark:border-[#1F1F2E] transition-all flex items-center justify-center cursor-pointer hover:scale-105 shadow-sm"
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
                <linearGradient id="resysGradientInlineHost" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7000FF" />
                  <stop offset="50%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
                <linearGradient id="slotGradientInlineHost" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00F5FF" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
                <filter id="subtleGlowInlineHost" x="-15%" y="-15%" width="130%" height="130%">
                  <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#7000FF" floodOpacity="0.35" />
                </filter>
              </defs>
              <g filter="url(#subtleGlowInlineHost)">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M 110 150 L 155 105 H 315 C 385 105 405 145 405 205 C 405 255 380 285 325 295 L 385 395 H 320 L 265 305 H 175 V 395 H 120 V 170 L 110 150 Z M 175 160 V 255 H 275 C 325 255 345 235 345 205 C 345 175 325 160 275 160 H 175 Z"
                  fill="url(#resysGradientInlineHost)"
                />
                <g>
                  <rect x="290" y="325" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                  <rect x="312" y="325" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                  <rect x="334" y="325" width="10" height="10" rx="2.5" fill="url(#slotGradientInlineHost)" />
                  <rect x="356" y="325" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                  <rect x="301" y="345" width="10" height="10" rx="2.5" fill="url(#slotGradientInlineHost)" />
                  <rect x="323" y="345" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                  <rect x="345" y="345" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                  <rect x="367" y="345" width="10" height="10" rx="2.5" fill="url(#slotGradientInlineHost)" />
                  <rect x="312" y="365" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                  <rect x="334" y="365" width="10" height="10" rx="2.5" fill="url(#slotGradientInlineHost)" />
                  <rect x="356" y="365" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                  <rect x="378" y="365" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                </g>
              </g>
            </svg>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#7000FF] to-[#3B82F6]">
                  ReSys
                </span>
                <span className="px-2 py-0.5 rounded-none text-[9px] font-semibold bg-[#7000FF]/10 border border-[#7000FF]/25 text-[#7000FF] dark:text-[#A78BFA] uppercase tracking-widest leading-none select-none">
                  Host Console
                </span>
              </div>
              <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-semibold uppercase tracking-wider mt-0.5 select-none">Platform Administration</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDb}
              disabled={isResetting}
              className="border border-rose-500/20 dark:border-rose-500/20 bg-rose-500/5 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 flex items-center gap-1.5 disabled:opacity-50 text-[11px] font-medium py-1.5 px-3 rounded-none transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm cursor-pointer"
            >
              <RotateCcw size={12} className={isResetting ? "animate-spin" : ""} />
              {isResetting ? "Resetting..." : "Reset & Seed DB"}
            </button>
            
            <div className="flex items-center bg-white/45 dark:bg-[#0E0E1B]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-none p-1 shadow-md shadow-slate-100/5 dark:shadow-black/5 transition-all">
              <ThemeToggle />
              
              <span className="h-6 w-px bg-slate-200/50 dark:bg-[#1F1F35] mx-1 shrink-0" />
              
              {session ? (
                <div className="flex items-center gap-3 pl-2 pr-1 py-0.5">
                  <div className="hidden sm:flex flex-col text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="px-1.5 py-0.5 rounded-none text-[8px] font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 uppercase tracking-wide leading-none">
                        Superadmin
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-none">{session.user?.name}</span>
                    </div>
                    <span className="text-[9px] text-slate-500 dark:text-zinc-400 mt-1 leading-none">{session.user?.email}</span>
                  </div>
                  
                  {/* Avatar with gradient matching brand colors */}
                  <div className="h-8 w-8 rounded-none bg-gradient-to-tr from-[#7000FF]/20 to-[#7000FF]/5 dark:from-[#7000FF]/30 dark:to-[#7000FF]/10 border border-[#7000FF]/20 dark:border-[#7000FF]/30 text-[#7000FF] dark:text-[#A78BFA] flex items-center justify-center font-semibold text-xs select-none shadow-sm shadow-[#7000FF]/5 overflow-hidden">
                    {session.user?.avatarUrl ? (
                      <img
                        src={session.user.avatarUrl}
                        alt={session.user.name || "Avatar"}
                        className="h-full w-full object-cover rounded-none"
                      />
                    ) : (
                      session.user?.name ? session.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "SA"
                    )}
                  </div>
                  
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="p-2 text-muted-foreground hover:text-rose-500 rounded-none hover:bg-rose-500/10 transition-all cursor-pointer flex items-center justify-center"
                    title="Odhlásit se"
                  >
                    <LogOut size={15} />
                  </button>
                </div>
              ) : (
                <div className="pl-1 pr-0.5 py-0.5 flex items-center">
                  <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 px-3 select-none">Nepřihlášen</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace with sidebar layout */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col md:flex-row gap-8 relative z-10">
        
        {/* Left Navigation Sidebar */}
        <aside className="md:w-64 w-full space-y-2 h-fit bg-white/60 dark:bg-[#0E0E1B]/55 backdrop-blur-xl border border-slate-200/50 dark:border-[#2A2A40]/45 p-4 rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] shrink-0 transition-all duration-300 hover:border-primary/15">
          <button
            onClick={() => setActiveTab("tenants")}
            className={`w-full px-4 py-2.5 rounded-none flex items-center gap-3 text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer border ${
              activeTab === "tenants" 
                ? "bg-gradient-to-r from-[#7000FF] to-[#3B82F6] text-white border-transparent shadow-md shadow-[#7000FF]/20 scale-[1.02]" 
                : "text-slate-500 dark:text-zinc-400 border-transparent hover:text-[#7000FF] dark:hover:text-[#A78BFA] hover:bg-slate-100/50 dark:hover:bg-white/[0.02] hover:scale-[1.01]"
            }`}
          >
            <Server size={14} className={activeTab === "tenants" ? "animate-pulse" : ""} />
            Tenant Registry
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`w-full px-4 py-2.5 rounded-none flex items-center gap-3 text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer border ${
              activeTab === "users" 
                ? "bg-gradient-to-r from-[#7000FF] to-[#3B82F6] text-white border-transparent shadow-md shadow-[#7000FF]/20 scale-[1.02]" 
                : "text-slate-500 dark:text-zinc-400 border-transparent hover:text-[#7000FF] dark:hover:text-[#A78BFA] hover:bg-slate-100/50 dark:hover:bg-white/[0.02] hover:scale-[1.01]"
            }`}
          >
            <Users size={14} className={activeTab === "users" ? "animate-pulse" : ""} />
            User Accounts ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("updates")}
            className={`w-full px-4 py-2.5 rounded-none flex items-center gap-3 text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer border ${
              activeTab === "updates" 
                ? "bg-gradient-to-r from-[#7000FF] to-[#3B82F6] text-white border-transparent shadow-md shadow-[#7000FF]/20 scale-[1.02]" 
                : "text-slate-500 dark:text-zinc-400 border-transparent hover:text-[#7000FF] dark:hover:text-[#A78BFA] hover:bg-slate-100/50 dark:hover:bg-white/[0.02] hover:scale-[1.01]"
            }`}
          >
            <Terminal size={14} className={activeTab === "updates" ? "animate-pulse" : ""} />
            System Updates
          </button>
        </aside>

        {activeTab === "updates" ? (
          <div className="flex-1 min-w-0 bg-white/60 dark:bg-[#0E0E1B]/55 backdrop-blur-xl border border-slate-200/50 dark:border-[#2A2A40]/45 p-6 rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:border-[#7000FF]/15 transition-all duration-300">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-400 mb-6 flex items-center gap-2 border-b border-slate-200/40 dark:border-[#2A2A40]/45 pb-3 select-none">
              <Terminal size={14} className="text-primary animate-pulse" />
              System Release History
            </h2>
            <SystemUpdatesList variant="host" />
          </div>
        ) : (
          <div className="flex-1 min-w-0 grid xl:grid-cols-3 gap-8 items-start">
          
          {/* Left/Middle Content Columns */}
          <div className="xl:col-span-2 space-y-6 min-w-0">
            {activeTab === "tenants" ? (
              <>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-400 flex items-center gap-2 select-none">
                    <Server size={13} className="text-[#7000FF] animate-pulse" />
                    Active SaaS Tenants ({tenants.length})
                  </h2>
                  <span className="text-[9px] font-semibold uppercase tracking-widest bg-slate-100 dark:bg-black/35 text-slate-500 dark:text-zinc-400 px-2.5 py-1 rounded-none border border-slate-200/50 dark:border-[#2A2A40]/40 select-none">
                    Multi-Tenant Active Engine
                  </span>
                </div>

                {loading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="h-32 rounded-none bg-slate-100 dark:bg-white/[0.02] border border-slate-200/50 dark:border-[#2A2A40]/40 animate-pulse" />
                    ))}
                  </div>
                ) : tenants.length === 0 ? (
                  <div className="bg-white/60 dark:bg-[#0E0E1B]/55 border border-slate-200/50 dark:border-[#2A2A40]/45 p-12 text-center rounded-none text-muted-foreground text-sm font-medium shadow-inner">
                    No tenants found. Use the panel on the right to create one.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tenants.map((tenant) => (
                      <div
                        key={tenant.id}
                        className={`relative overflow-hidden p-6 bg-white/60 dark:bg-[#0E0E1B]/55 backdrop-blur-xl border rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] transition-all duration-300 hover:scale-[1.01] hover:shadow-neon-glow hover:border-[#7000FF]/30 group flex flex-col gap-4 ${
                          editingTenant?.id === tenant.id
                            ? "border-violet-500/80 dark:border-violet-400/80 shadow-neon-glow bg-violet-50/10 dark:bg-[#7000FF]/5"
                            : "border-slate-200/50 dark:border-[#2A2A40]/45"
                        }`}
                      >
                        {/* Brand colored vertical bar */}
                        <div className={`absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b ${getVerticalGradient(tenant.vertical)} opacity-85 group-hover:opacity-100 transition-opacity duration-300`} />
                        
                        {/* Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-3">
                          {/* Title + Badges */}
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h3 className="font-semibold text-base text-slate-800 dark:text-slate-100 tracking-tight leading-tight break-all group-hover:text-[#7000FF] dark:group-hover:text-[#A78BFA] transition-colors duration-300">
                              {tenant.name}
                            </h3>
                            {editingTenant?.id === tenant.id && (
                              <span className="text-[9.5px] px-2 py-0.5 rounded-none border border-violet-500/30 bg-violet-500/10 text-violet-650 dark:text-violet-400 font-semibold animate-pulse tracking-wide uppercase shrink-0">
                                Editing
                              </span>
                            )}
                            <span className={`text-[9.5px] border-l-2 font-medium tracking-wide shrink-0 pl-1.5 select-none ${getVerticalBadgeStyles(tenant.vertical)}`}>
                              {tenant.vertical.replace("_", " ")}
                            </span>
                            <span className={`text-[9.5px] border-l-2 font-medium tracking-wide shrink-0 flex items-center gap-1.5 pl-1.5 select-none ${getSubscriptionBadgeStyles(tenant.subscriptionStatus || "TRIALING")}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                tenant.subscriptionStatus === "ACTIVE" || tenant.subscriptionStatus === "TRIALING" ? "bg-emerald-500" : "bg-rose-500"
                              }`} />
                              {tenant.subscriptionPlan || "FREE_TRIAL"} • {tenant.subscriptionStatus || "TRIALING"}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 shrink-0 select-none">
                            <a
                              href={getTenantUrl(tenant.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-white/40 dark:bg-[#131322]/30 hover:bg-[#7000FF] hover:text-white dark:hover:bg-[#7000FF] text-[#7000FF] dark:text-[#A78BFA] dark:hover:text-white border border-slate-200 dark:border-[#2A2A40] text-[11px] font-medium py-1.5 px-3 rounded-none hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            >
                              <ExternalLink size={12} />
                              Open Portal
                            </a>
                            <button
                              onClick={() => handleEdit(tenant)}
                              className="p-1.5 rounded-none bg-white/40 dark:bg-[#131322]/30 hover:bg-indigo-500/15 dark:hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-[#2A2A40] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm cursor-pointer"
                              title="Edit Tenant"
                            >
                              <Edit size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(tenant.id)}
                              className="p-1.5 rounded-none bg-white/40 dark:bg-[#131322]/30 hover:bg-rose-500/15 dark:hover:bg-rose-500/25 text-rose-500 dark:text-rose-400 border border-slate-200 dark:border-[#2A2A40] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm cursor-pointer"
                              title="Delete Tenant"
                            >
                              <Trash size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Content Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 pl-3 text-xs text-slate-500 dark:text-zinc-400">
                          {/* System Integration Column (Domain / SSO Client ID) */}
                          <div className="col-span-1 xl:col-span-4 space-y-1.5 min-w-0">
                            <div className="flex items-center gap-1.5 font-normal min-w-0">
                              <Globe size={13} className="text-slate-400 dark:text-zinc-500 shrink-0" />
                              <span className="text-slate-400 dark:text-zinc-500 shrink-0 whitespace-nowrap">Domain:</span>
                              <span className="text-slate-700 dark:text-slate-200 font-mono font-medium truncate flex-1 min-w-0" title={tenant.domain.includes(".") ? tenant.domain : `${tenant.domain}.localhost:3000`}>
                                {tenant.domain.includes(".") ? tenant.domain : `${tenant.domain}.localhost:3000`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 font-normal min-w-0">
                              <KeyRound size={13} className="text-slate-400 dark:text-zinc-500 shrink-0" />
                              <span className="text-slate-400 dark:text-zinc-500 shrink-0 whitespace-nowrap">SSO ID:</span>
                              <span className="text-slate-700 dark:text-slate-200 font-mono font-medium truncate flex-1 min-w-0" title={tenant.ssoClientId}>
                                {tenant.ssoClientId}
                              </span>
                            </div>
                          </div>

                          {/* Resource & Device Limits Meters */}
                          <div className="col-span-1 xl:col-span-5 grid grid-cols-1 gap-2.5 bg-slate-50/40 dark:bg-black/15 border border-slate-200/40 dark:border-[#2A2A40]/30 rounded-none p-3">
                            {(() => {
                              const resCount = tenant.resources?.length || 0;
                              const resMax = tenant.maxResourcesLimit || 2;
                              const pct = Math.min(100, Math.round((resCount / resMax) * 100));
                              return (
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-[10px] font-medium tracking-wide text-slate-400 dark:text-zinc-400 select-none">
                                    <span className="flex items-center gap-1 whitespace-nowrap"><Database size={11} className="text-slate-400 dark:text-zinc-500" /> Resources</span>
                                    <div className="flex items-center gap-2 font-mono text-[10px] font-medium">
                                      <span className="text-slate-650 dark:text-slate-350 w-12 text-right">{resCount} / {resMax}</span>
                                      <span className="text-slate-400 dark:text-zinc-500 w-12 text-right">({pct}%)</span>
                                    </div>
                                  </div>
                                  <div className="w-full bg-slate-200/50 dark:bg-black/40 rounded-none h-1 overflow-hidden border border-slate-300/10 dark:border-white/5 relative">
                                    <div 
                                      className={`h-full rounded-none ${getVerticalSolidColor(tenant.vertical)} relative transition-all duration-500`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })()}
                            {(() => {
                              const devCount = tenant.devices?.length || 0;
                              const devMax = tenant.maxDevicesLimit || 1;
                              const pct = Math.min(100, Math.round((devCount / devMax) * 100));
                              return (
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-[10px] font-medium tracking-wide text-slate-400 dark:text-zinc-400 select-none">
                                    <span className="flex items-center gap-1 whitespace-nowrap"><Cpu size={11} className="text-slate-400 dark:text-zinc-500" /> Gates & Readers</span>
                                    <div className="flex items-center gap-2 font-mono text-[10px] font-medium">
                                      <span className="text-slate-650 dark:text-slate-350 w-12 text-right">{devCount} / {devMax}</span>
                                      <span className="text-slate-400 dark:text-zinc-500 w-12 text-right">({pct}%)</span>
                                    </div>
                                  </div>
                                  <div className="w-full bg-slate-200/50 dark:bg-black/40 rounded-none h-1 overflow-hidden border border-slate-300/10 dark:border-white/5 relative">
                                    <div 
                                      className={`h-full rounded-none ${getVerticalSolidColor(tenant.vertical)} relative transition-all duration-500`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Revenue & Cut Details */}
                          {(() => {
                            const totalRevenue = (tenant.bookings || []).reduce((sum, b) => sum + Number(b.price || 0), 0);
                            const totalCut = (tenant.bookings || []).reduce((sum, b) => sum + Number(b.paymentCutAmount || 0), 0);
                            return (
                              <div className="col-span-1 md:col-span-2 xl:col-span-3 flex flex-col justify-center gap-2 pl-0 xl:pl-6 select-none border-t xl:border-t-0 border-slate-200/40 dark:border-zinc-800/40 pt-2.5 xl:pt-0 text-[10.5px]">
                                <div className="flex items-center justify-between md:justify-start gap-2">
                                  <span className="text-slate-400 dark:text-zinc-500 w-16">Fee Cut:</span>
                                  <span className="text-slate-700 dark:text-slate-200 font-semibold">{tenant.paymentCut !== undefined && tenant.paymentCut !== null ? tenant.paymentCut : 3}%</span>
                                </div>
                                <div className="flex items-center justify-between md:justify-start gap-2">
                                  <span className="text-slate-400 dark:text-zinc-500 w-16">Obrat:</span>
                                  <span className="text-slate-750 dark:text-slate-200 font-semibold">{totalRevenue.toLocaleString()} Kč</span>
                                </div>
                                <div className="flex items-center justify-between md:justify-start gap-2">
                                  <span className="text-slate-400 dark:text-zinc-500 w-16">Poplatek:</span>
                                  <span className="text-slate-750 dark:text-slate-200 font-semibold">{totalCut.toLocaleString()} Kč</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Stripe Simulation Webhooks (Bottom Bar) */}
                        <div className="bg-slate-50/50 dark:bg-black/20 px-4 py-2.5 -mx-6 -mb-6 mt-2 border-t border-slate-200/40 dark:border-[#2A2A40]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-semibold tracking-wider flex items-center gap-1.5 select-none">
                            <CreditCard size={11} className="text-slate-400 dark:text-zinc-500" /> Stripe Webhook Simulator
                          </span>
                          <div className="flex flex-wrap gap-2 select-none">
                            <div className="relative flex items-center group/select">
                              <select
                                value={tenant.subscriptionPlan || "FREE_TRIAL"}
                                onChange={async (e) => {
                                  const selectedPlan = e.target.value;
                                  try {
                                    const res = await fetch("/api/admin", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        action: "simulate_stripe_webhook",
                                        data: {
                                          id: tenant.id,
                                          plan: selectedPlan,
                                          status: tenant.subscriptionStatus || "ACTIVE"
                                        }
                                      })
                                    });
                                    if (res.ok) {
                                      showModalAlert("Billing Simulation Event Dispatched", `Subscription plan update request for ${selectedPlan} has been sent successfully. Limits have been updated.`, "success");
                                      fetchTenants();
                                    } else {
                                      showModalAlert("Simulation Failed", "Failed to update subscription via mock webhook.", "error");
                                    }
                                  } catch (err) {
                                    console.error(err);
                                    showModalAlert("Simulation Error", "Error simulating webhook request.", "error");
                                  }
                                }}
                                className="appearance-none bg-white dark:bg-black/30 text-slate-700 dark:text-zinc-300 text-[10px] font-semibold pl-2.5 pr-7 py-1 border border-slate-200 dark:border-[#2A2A40]/55 rounded-none outline-none focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF]/20 transition-all cursor-pointer shadow-sm hover:bg-slate-50 dark:hover:bg-black/50"
                              >
                                <option value="FREE_TRIAL">Free Trial (2 Res, 1 Dev)</option>
                                <option value="STARTER">Starter (5 Res, 3 Dev)</option>
                                <option value="PRO">Pro (15 Res, 10 Dev)</option>
                                <option value="ENTERPRISE">Enterprise (99 Res, 99 Dev)</option>
                              </select>
                              <ChevronDown size={10} className="absolute right-2 text-slate-400 dark:text-zinc-500 pointer-events-none group-hover/select:text-[#7000FF] transition-colors" />
                            </div>
                            
                            <div className="relative flex items-center group/select">
                              <select
                                value={tenant.subscriptionStatus || "TRIALING"}
                                onChange={async (e) => {
                                  const selectedStatus = e.target.value;
                                  try {
                                    const res = await fetch("/api/admin", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        action: "simulate_stripe_webhook",
                                        data: {
                                          id: tenant.id,
                                          plan: tenant.subscriptionPlan || "FREE_TRIAL",
                                          status: selectedStatus
                                        }
                                      })
                                    });
                                    if (res.ok) {
                                      showModalAlert("Billing Simulation Event Dispatched", `Subscription status update request to ${selectedStatus} has been sent successfully.`, "success");
                                      fetchTenants();
                                    } else {
                                      showModalAlert("Simulation Failed", "Failed to update status via mock webhook.", "error");
                                    }
                                  } catch (err) {
                                    console.error(err);
                                    showModalAlert("Simulation Error", "Error simulating webhook request.", "error");
                                  }
                                }}
                                className="appearance-none bg-white dark:bg-black/30 text-slate-700 dark:text-zinc-300 text-[10px] font-semibold pl-2.5 pr-7 py-1 border border-slate-200 dark:border-[#2A2A40]/55 rounded-none outline-none focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF]/20 transition-all cursor-pointer shadow-sm hover:bg-slate-50 dark:hover:bg-black/50"
                              >
                                <option value="TRIALING">TRIALING</option>
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="PAST_DUE">PAST_DUE (Block bookings)</option>
                                <option value="CANCELED">CANCELED (Block bookings)</option>
                              </select>
                              <ChevronDown size={10} className="absolute right-2 text-slate-400 dark:text-zinc-500 pointer-events-none group-hover/select:text-[#7000FF] transition-colors" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-400 flex items-center gap-2 select-none">
                    <Users size={13} className="text-[#7000FF] animate-pulse" />
                    System Accounts ({users.length})
                  </h2>
                  <span className="text-[9px] font-semibold uppercase tracking-widest bg-slate-100 dark:bg-black/35 text-slate-500 dark:text-zinc-400 px-2.5 py-1 rounded-none border border-slate-200/50 dark:border-[#2A2A40]/40 select-none">
                    Granular Access Control
                  </span>
                </div>

                {usersLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-16 rounded-none bg-slate-100 dark:bg-white/[0.02] border border-slate-200/50 dark:border-[#2A2A40]/40 animate-pulse" />
                    ))}
                  </div>
                ) : users.length === 0 ? (
                  <div className="bg-white/60 dark:bg-[#0E0E1B]/55 border border-slate-200/50 dark:border-[#2A2A40]/45 p-12 text-center rounded-none text-muted-foreground text-sm font-medium shadow-inner">
                    No accounts found. Create one using the manager panel on the right.
                  </div>
                ) : (
                  <div className="bg-white/60 dark:bg-[#0E0E1B]/55 backdrop-blur-xl border border-slate-200/50 dark:border-[#2A2A40]/45 rounded-none overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:border-[#7000FF]/15 transition-all">
                    <div className="overflow-x-auto scrollbar-none">
                      <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                        <thead>
                          <tr className="border-b border-slate-200/50 dark:border-[#2A2A40]/40 text-slate-400 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                            <th className="p-4 px-5">Name / Contact</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Tenant Scope</th>
                            <th className="p-4 text-right px-5">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/40 dark:divide-[#2A2A40]/25 text-slate-700 dark:text-slate-300">
                          {users.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50/40 dark:hover:bg-white/[0.01] transition-colors duration-150">
                              <td className="p-4 px-5 space-y-1">
                                <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{u.name}</p>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400 dark:text-zinc-500 text-[10.5px]">
                                  <span className="flex items-center gap-1"><Mail size={11} className="text-slate-400 dark:text-zinc-400" /> {u.email}</span>
                                  {u.phone && <span className="flex items-center gap-1"><Phone size={11} className="text-slate-400 dark:text-zinc-400" /> {u.phone}</span>}
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={`pl-1.5 border-l-2 text-[9px] font-bold uppercase tracking-wider select-none ${
                                  u.role === "SUPERADMIN" 
                                    ? "border-rose-500 text-rose-500" 
                                    : u.role === "ADMIN" 
                                      ? "border-indigo-500 text-indigo-500" 
                                      : u.role === "RECEPTIONIST"
                                        ? "border-amber-500 text-amber-600 dark:text-amber-400"
                                        : "border-emerald-500 text-emerald-500"
                                }`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="p-4 text-slate-600 dark:text-slate-400 font-semibold">
                                {u.tenant ? (
                                  <span className="text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-1.5">
                                    <Building size={11} className="text-slate-400 dark:text-zinc-400" />
                                    {u.tenant.name} 
                                    <code className="font-mono font-normal text-[9px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-black/35 px-1.5 py-0.5 rounded-none border border-slate-200/50 dark:border-[#2A2A40]/30">({u.tenantId})</code>
                                  </span>
                                ) : (
                                  <span className="italic text-slate-400 dark:text-zinc-400 flex items-center gap-1.5 font-medium text-[11px] uppercase tracking-wider">
                                    <Globe size={11} className="text-slate-400 dark:text-zinc-400" />
                                    All Tenants (Global)
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-right px-5">
                                <div className="flex items-center justify-end gap-1.5 select-none">
                                  <button
                                    onClick={() => handleEditUser(u)}
                                    className="p-2 rounded-none bg-slate-50 dark:bg-[#131322]/30 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-[#2A2A40] hover:scale-[1.03] active:scale-[0.97] transition-all shadow-sm cursor-pointer"
                                    title="Edit User"
                                  >
                                    <Edit size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(u.id, u.name)}
                                    className="p-2 rounded-none bg-slate-50 dark:bg-[#131322]/30 text-rose-500 border border-slate-200 dark:border-[#2A2A40] hover:scale-[1.03] active:scale-[0.97] transition-all shadow-sm cursor-pointer disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
                                    disabled={u.id === session?.user?.id}
                                    title="Delete User"
                                  >
                                    <Trash size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Col: Configure Form */}
          <aside className="xl:col-span-1 xl:sticky xl:top-24 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-none pb-4 min-w-0">
            <div className="bg-white/60 dark:bg-[#0E0E1B]/55 backdrop-blur-xl border border-slate-200/50 dark:border-[#2A2A40]/45 p-6 rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:shadow-neon-glow hover:border-[#7000FF]/25 transition-all duration-300">
            {activeTab === "tenants" ? (
              <>
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-6 flex items-center gap-2 border-b border-slate-200/40 dark:border-[#2A2A40]/45 pb-3 select-none">
                  <Activity size={14} className="text-[#7000FF] animate-pulse" />
                  {editingTenant ? "Edit SaaS Tenant" : "Create SaaS Tenant"}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider select-none">Tenant Unique ID</label>
                    <div className="relative flex items-center">
                      <Terminal size={13} className="absolute left-3.5 text-slate-400 dark:text-zinc-500" />
                      <input
                        type="text"
                        required
                        disabled={!!editingTenant}
                        value={formData.id}
                        onChange={(e) => {
                          const newId = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                          const previousId = formData.id;
                          const previousDomain = formData.domain;
                          const isDefaultOrEmpty = 
                            !previousDomain || 
                            previousDomain === ".localhost:3000" || 
                            previousDomain === `${previousId}.localhost:3000`;
                          
                          setFormData({
                            ...formData,
                            id: newId,
                            domain: isDefaultOrEmpty
                              ? (newId ? `${newId}.localhost:3000` : "")
                              : previousDomain
                          });
                        }}
                        placeholder="e.g. motogp, sfera"
                        className="w-full bg-slate-100/40 dark:bg-black/25 text-slate-800 dark:text-zinc-200 border border-slate-200/70 dark:border-[#2A2A40]/60 rounded-none py-2 pl-10 pr-4 text-xs font-mono font-medium outline-none transition-all focus:border-[#7000FF] focus:bg-white dark:focus:bg-black/60 focus:ring-2 focus:ring-[#7000FF]/10 disabled:opacity-40"
                        style={{ paddingLeft: "2.35rem" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider select-none">Tenant Name</label>
                    <div className="relative flex items-center">
                      <Building size={13} className="absolute left-3.5 text-slate-400 dark:text-zinc-500" />
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Sféra Pardubice"
                        className="w-full bg-slate-100/40 dark:bg-black/25 text-slate-800 dark:text-zinc-200 border border-slate-200/70 dark:border-[#2A2A40]/60 rounded-none py-2 pl-10 pr-4 text-xs font-medium outline-none transition-all focus:border-[#7000FF] focus:bg-white dark:focus:bg-black/60 focus:ring-2 focus:ring-[#7000FF]/10"
                        style={{ paddingLeft: "2.35rem" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider select-none">Local Subdomain / Domain</label>
                    <div className="relative flex items-center">
                      <Globe size={13} className="absolute left-3.5 text-slate-400 dark:text-zinc-500" />
                      <input
                        type="text"
                        required
                        value={formData.domain}
                        onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                        placeholder="e.g. sfera.localhost:3000"
                        className="w-full bg-slate-100/40 dark:bg-black/25 text-slate-800 dark:text-zinc-200 border border-slate-200/70 dark:border-[#2A2A40]/60 rounded-none py-2 pl-10 pr-4 text-xs font-mono font-medium outline-none transition-all focus:border-[#7000FF] focus:bg-white dark:focus:bg-black/60 focus:ring-2 focus:ring-[#7000FF]/10"
                        style={{ paddingLeft: "2.35rem" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider select-none">SaaS Vertical Template</label>
                    <div className="relative flex items-center group">
                      <Layers size={13} className="absolute left-3.5 text-slate-400 dark:text-zinc-500 pointer-events-none group-hover:text-[#7000FF] transition-colors" />
                      <select
                        value={formData.vertical}
                        onChange={(e) => setFormData({ ...formData, vertical: e.target.value })}
                        className="w-full appearance-none bg-slate-100/40 dark:bg-black/25 text-slate-800 dark:text-zinc-200 border border-slate-200/70 dark:border-[#2A2A40]/60 rounded-none py-2 pl-10 pr-10 text-xs font-medium outline-none transition-all focus:border-[#7000FF] focus:bg-white dark:focus:bg-black/60 focus:ring-2 focus:ring-[#7000FF]/10 cursor-pointer"
                        style={{ paddingLeft: "2.35rem" }}
                      >
                        <option value="SPORTS_GROUND">Sports Ground (Emerald)</option>
                        <option value="CAPACITY_CLASS">Capacity Class (Fuchsia)</option>
                        <option value="EDUCATIONAL_COURSE">Educational Course (Cyan)</option>
                        <option value="EVENT_TICKETING">Event Ticketing (Amber)</option>
                      </select>
                      <ChevronDown size={12} className="absolute right-3.5 text-slate-400 dark:text-zinc-500 pointer-events-none group-hover:text-[#7000FF] transition-colors" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider select-none">Payment Processing Cut (Fee %)</label>
                    <div className="relative flex items-center group">
                      <Percent size={13} className="absolute left-3.5 text-slate-400 dark:text-zinc-500 pointer-events-none group-hover:text-[#7000FF] transition-colors" />
                      <select
                        value={formData.paymentCut}
                        onChange={(e) => setFormData({ ...formData, paymentCut: Number(e.target.value) })}
                        className="w-full appearance-none bg-slate-100/40 dark:bg-black/25 text-slate-800 dark:text-zinc-200 border border-slate-200/70 dark:border-[#2A2A40]/60 rounded-none py-2 pl-10 pr-10 text-xs font-medium outline-none transition-all focus:border-[#7000FF] focus:bg-white dark:focus:bg-black/60 focus:ring-2 focus:ring-[#7000FF]/10 cursor-pointer"
                        style={{ paddingLeft: "2.35rem" }}
                      >
                        <option value={0}>0% - Bez poplatku (Platform Free)</option>
                        <option value={1}>1% Fee Cut</option>
                        <option value={2}>2% Fee Cut</option>
                        <option value={3}>3% Fee Cut</option>
                      </select>
                      <ChevronDown size={12} className="absolute right-3.5 text-slate-400 dark:text-zinc-500 pointer-events-none group-hover:text-[#7000FF] transition-colors" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider select-none">OneiD SSO Client ID</label>
                    <div className="relative flex items-center">
                      <KeyRound size={13} className="absolute left-3.5 text-slate-400 dark:text-zinc-500" />
                      <input
                        type="text"
                        required
                        value={formData.ssoClientId}
                        onChange={(e) => setFormData({ ...formData, ssoClientId: e.target.value })}
                        className="w-full bg-slate-100/40 dark:bg-black/25 text-slate-800 dark:text-zinc-200 border border-slate-200/70 dark:border-[#2A2A40]/60 rounded-none py-2 pl-10 pr-4 text-xs font-mono font-medium outline-none transition-all focus:border-[#7000FF] focus:bg-white dark:focus:bg-black/60 focus:ring-2 focus:ring-[#7000FF]/10"
                        style={{ paddingLeft: "2.35rem" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider select-none">OneiD SSO Client Secret</label>
                    <div className="relative flex items-center">
                      <Lock size={13} className="absolute left-3.5 text-slate-400 dark:text-zinc-500" />
                      <input
                        type="password"
                        required
                        value={formData.ssoClientSec}
                        onChange={(e) => setFormData({ ...formData, ssoClientSec: e.target.value })}
                        className="w-full bg-slate-100/40 dark:bg-black/25 text-slate-800 dark:text-zinc-200 border border-slate-200/70 dark:border-[#2A2A40]/60 rounded-none py-2 pl-10 pr-4 text-xs font-mono font-medium outline-none transition-all focus:border-[#7000FF] focus:bg-white dark:focus:bg-black/60 focus:ring-2 focus:ring-[#7000FF]/10"
                        style={{ paddingLeft: "2.35rem" }}
                      />
                    </div>
                  </div>

                  {editingTenant && (
                    <div className="bg-slate-50/50 dark:bg-black/15 border border-slate-200/40 dark:border-[#2A2A40]/30 rounded-none p-3 space-y-2 select-none">
                      <span className="block text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><CreditCard size={11} className="text-[#7000FF]" /> Billing & Subscription Details</span>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-2.5 text-[10.5px]">
                        <div>
                          <span className="text-slate-400 dark:text-zinc-550 block text-[9px] mb-0.5">Subscription Plan:</span>
                          <span className="text-slate-700 dark:text-slate-200 font-semibold">{liveEditingTenant?.subscriptionPlan || "FREE_TRIAL"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 dark:text-zinc-555 block text-[9px] mb-0.5">Payment Status:</span>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none font-bold text-[8.5px] ${
                            liveEditingTenant?.subscriptionStatus === "ACTIVE" 
                              ? "bg-emerald-500/10 text-emerald-500" 
                              : liveEditingTenant?.subscriptionStatus === "TRIALING"
                              ? "bg-indigo-500/10 text-indigo-500"
                              : "bg-rose-500/10 text-rose-500 animate-pulse"
                          }`}>
                            {liveEditingTenant?.subscriptionStatus || "TRIALING"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 dark:text-zinc-555 block text-[9px] mb-0.5">Max Resources:</span>
                          <span className="text-slate-750 dark:text-slate-200 font-mono font-semibold">{liveEditingTenant?.maxResourcesLimit || 2}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 dark:text-zinc-555 block text-[9px] mb-0.5">Max Gates & Readers:</span>
                          <span className="text-slate-750 dark:text-slate-200 font-mono font-semibold">{liveEditingTenant?.maxDevicesLimit || 1}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 select-none">
                    {editingTenant ? (
                      <>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="btn-secondary flex-1 py-2 cursor-pointer transition-all rounded-none hover:scale-[1.02] active:scale-[0.98]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn-primary flex-1 py-2 cursor-pointer transition-all rounded-none bg-gradient-to-r from-[#7000FF] to-[#3B82F6] hover:scale-[1.02] active:scale-[0.98]"
                        >
                          Save
                        </button>
                      </>
                    ) : (
                      <button
                        type="submit"
                        className="btn-primary w-full py-2.5 flex items-center justify-center gap-1 cursor-pointer transition-all rounded-none bg-gradient-to-r from-[#7000FF] to-[#3B82F6] hover:scale-[1.02] active:scale-[0.98] font-semibold text-xs shadow-md shadow-[#7000FF]/15"
                      >
                        <Plus size={14} />
                        Add Tenant
                      </button>
                    )}
                  </div>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-6 flex items-center gap-2 border-b border-slate-200/40 dark:border-[#2A2A40]/45 pb-3 select-none">
                  <Briefcase size={14} className="text-[#7000FF] animate-pulse" />
                  {editingUser ? "Edit User Profile" : "Create SaaS Account"}
                </h2>

                <form onSubmit={handleUserSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider select-none">Full Name</label>
                    <div className="relative flex items-center">
                      <UserIcon size={13} className="absolute left-3.5 text-slate-400 dark:text-zinc-500" />
                      <input
                        type="text"
                        required
                        value={userFormData.name}
                        onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                        placeholder="e.g. Marie Kovářová"
                        className="w-full bg-slate-100/40 dark:bg-black/25 text-slate-800 dark:text-zinc-200 border border-slate-200/70 dark:border-[#2A2A40]/60 rounded-none py-2 pl-10 pr-4 text-xs font-medium outline-none transition-all focus:border-[#7000FF] focus:bg-white dark:focus:bg-black/60 focus:ring-2 focus:ring-[#7000FF]/10"
                        style={{ paddingLeft: "2.35rem" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider select-none">E-mail Address</label>
                    <div className="relative flex items-center">
                      <Mail size={13} className="absolute left-3.5 text-slate-400 dark:text-zinc-500" />
                      <input
                        type="email"
                        required
                        value={userFormData.email}
                        onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                        placeholder="e.g. marie@gmail.com"
                        className="w-full bg-slate-100/40 dark:bg-black/25 text-slate-800 dark:text-zinc-200 border border-slate-200/70 dark:border-[#2A2A40]/60 rounded-none py-2 pl-10 pr-4 text-xs font-mono font-medium outline-none transition-all focus:border-[#7000FF] focus:bg-white dark:focus:bg-black/60 focus:ring-2 focus:ring-[#7000FF]/10"
                        style={{ paddingLeft: "2.35rem" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider select-none">
                      Password {editingUser && "(leave blank to keep unchanged)"}
                    </label>
                    <div className="relative flex items-center">
                      <KeyRound size={13} className="absolute left-3.5 text-slate-400 dark:text-zinc-500" />
                      <input
                        type="password"
                        required={!editingUser}
                        value={userFormData.password}
                        onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full bg-slate-100/40 dark:bg-black/25 text-slate-800 dark:text-zinc-200 border border-slate-200/70 dark:border-[#2A2A40]/60 rounded-none py-2 pl-10 pr-4 text-xs font-mono font-medium outline-none transition-all focus:border-[#7000FF] focus:bg-white dark:focus:bg-black/60 focus:ring-2 focus:ring-[#7000FF]/10"
                        style={{ paddingLeft: "2.35rem" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider select-none">Phone (Optional)</label>
                    <div className="relative flex items-center">
                      <Phone size={13} className="absolute left-3.5 text-slate-400 dark:text-zinc-500" />
                      <input
                        type="text"
                        value={userFormData.phone}
                        onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                        placeholder="e.g. +420777123456"
                        className="w-full bg-slate-100/40 dark:bg-black/25 text-slate-800 dark:text-zinc-200 border border-slate-200/70 dark:border-[#2A2A40]/60 rounded-none py-2 pl-10 pr-4 text-xs font-mono font-medium outline-none transition-all focus:border-[#7000FF] focus:bg-white dark:focus:bg-black/60 focus:ring-2 focus:ring-[#7000FF]/10"
                        style={{ paddingLeft: "2.35rem" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 dark:text-[#52525B] mb-1.5 uppercase tracking-wider select-none">User Account Role</label>
                    <div className="relative flex items-center group">
                      <Layers size={13} className="absolute left-3.5 text-slate-400 dark:text-zinc-500 pointer-events-none group-hover:text-[#7000FF] transition-colors" />
                      <select
                        value={userFormData.role}
                        onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value, tenantId: e.target.value === "SUPERADMIN" ? "" : userFormData.tenantId })}
                        className="w-full appearance-none bg-slate-100/40 dark:bg-black/25 text-slate-800 dark:text-zinc-200 border border-slate-200/70 dark:border-[#2A2A40]/60 rounded-none py-2 pl-10 pr-10 text-xs font-medium outline-none transition-all focus:border-[#7000FF] focus:bg-white dark:focus:bg-black/60 focus:ring-2 focus:ring-[#7000FF]/10 cursor-pointer"
                        style={{ paddingLeft: "2.35rem" }}
                      >
                         <option value="SUPERADMIN">Platform Superadmin</option>
                         <option value="ADMIN">Tenant Admin (B2B Tenant)</option>
                         <option value="RECEPTIONIST">Receptionist / Staff</option>
                         <option value="USER">Customer User (General)</option>
                      </select>
                      <ChevronDown size={12} className="absolute right-3.5 text-slate-400 dark:text-zinc-500 pointer-events-none group-hover:text-[#7000FF] transition-colors" />
                    </div>
                  </div>

                  {userFormData.role !== "SUPERADMIN" && (
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 dark:text-[#52525B] mb-1.5 uppercase tracking-wider select-none">Associated Tenant (Property)</label>
                      <div className="relative flex items-center group">
                        <Building size={13} className="absolute left-3.5 text-slate-400 dark:text-zinc-500 pointer-events-none group-hover:text-[#7000FF] transition-colors" />
                        <select
                          value={userFormData.tenantId}
                          onChange={(e) => setUserFormData({ ...userFormData, tenantId: e.target.value })}
                          required={userFormData.role === "ADMIN"}
                          className="w-full appearance-none bg-slate-100/40 dark:bg-black/25 text-slate-800 dark:text-zinc-200 border border-slate-200/70 dark:border-[#2A2A40]/60 rounded-none py-2 pl-10 pr-10 text-xs font-medium outline-none transition-all focus:border-[#7000FF] focus:bg-white dark:focus:bg-black/60 focus:ring-2 focus:ring-[#7000FF]/10 cursor-pointer"
                          style={{ paddingLeft: "2.35rem" }}
                        >
                          <option value="">-- No Tenant Associated --</option>
                          {tenants.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                          ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-3.5 text-slate-400 dark:text-zinc-500 pointer-events-none group-hover:text-[#7000FF] transition-colors" />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 select-none">
                    {editingUser ? (
                      <>
                        <button
                          type="button"
                          onClick={handleCancelUserEdit}
                          className="btn-secondary flex-1 py-2 cursor-pointer transition-all rounded-none hover:scale-[1.02] active:scale-[0.98]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn-primary flex-1 py-2 cursor-pointer transition-all rounded-none bg-gradient-to-r from-[#7000FF] to-[#3B82F6] hover:scale-[1.02] active:scale-[0.98]"
                        >
                          Save
                        </button>
                      </>
                    ) : (
                      <button
                        type="submit"
                        className="btn-primary w-full py-2.5 flex items-center justify-center gap-1 cursor-pointer transition-all rounded-none bg-gradient-to-r from-[#7000FF] to-[#3B82F6] hover:scale-[1.02] active:scale-[0.98] font-semibold text-xs shadow-md shadow-[#7000FF]/15"
                      >
                        <Plus size={14} />
                        Create Account
                      </button>
                    )}
                  </div>
                </form>
              </>
            )}
            </div>
          </aside>

        </div>
        )}
      </main>

      <AlertDialog
        isOpen={alertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        copyText={alertCopyText}
        onClose={() => setAlertOpen(false)}
        onConfirm={alertOnConfirm}
        okLabel={alertOkLabel}
        cancelLabel={alertCancelLabel}
      />
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { 
  Plus, Edit, Trash, RotateCcw, Server, Globe, Shield, 
  Activity, ExternalLink, Users, LogOut, KeyRound, Mail, 
  User as UserIcon, ShieldAlert, Loader2, Phone, Briefcase,
  ArrowLeft, Database, Cpu, Terminal, Building, Lock, Layers
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import AlertDialog from "@/components/AlertDialog";

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
  switch (vertical) {
    case "SPORTS_GROUND":
      return "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400";
    case "CAPACITY_CLASS":
      return "bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400";
    case "EDUCATIONAL_COURSE":
      return "bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400";
    case "EVENT_TICKETING":
      return "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400";
    default:
      return "bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400";
  }
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
  const [activeTab, setActiveTab] = useState<"tenants" | "users">("tenants");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<DBUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Partial<Tenant> | null>(null);
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
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#3B82F6]/5 blur-[120px] pointer-events-none" />

        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>

        <div className="max-w-md w-full bg-card/70 backdrop-blur-md border border-border rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 bg-primary/10 blur-3xl rounded-full" />
          
          <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-6 shadow-lg">
              <Shield size={28} />
            </div>

            <span className="text-[10px] px-2.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-bold uppercase tracking-wider mb-2">
              Superadmin Vstup
            </span>

            <h2 className="text-xl font-bold text-foreground mb-1">
              ReSys Platform Console
            </h2>
            <p className="text-xs text-muted-foreground mb-6">
              Přihlaste se svými vývojářskými / platformovými údaji
            </p>

            {loginError && (
              <div className="w-full bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs p-3 rounded-2xl mb-4 flex items-start gap-2 text-left">
                <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleSuperadminLogin} className="w-full space-y-4 text-xs text-left">
              <div className="space-y-1">
                <label className="block text-muted-foreground font-semibold">E-mail administrátora</label>
                <div className="relative flex items-center">
                  <Mail size={14} className="absolute left-3.5 text-muted-foreground" />
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
                <label className="block text-muted-foreground font-semibold">Heslo</label>
                <div className="relative flex items-center">
                  <KeyRound size={14} className="absolute left-3.5 text-muted-foreground" />
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
                className="w-full py-3 bg-gradient-to-r from-primary to-[#8B5CF6] hover:opacity-95 text-white text-xs font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
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
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '12s' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#3B82F6]/5 blur-[120px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '18s' }} />

      <header className="border-b border-slate-200/50 dark:border-[#1F1F35]/30 bg-white/45 dark:bg-[#07070C]/35 backdrop-blur-xl sticky top-0 z-40 transition-all shadow-md shadow-slate-100/5 dark:shadow-black/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-white/40 dark:bg-[#0F0F1A]/60 backdrop-blur-md text-slate-500 dark:text-zinc-400 hover:text-primary dark:hover:text-purple-400 border border-[#E2E2ED]/60 dark:border-[#1F1F2E] transition-all flex items-center justify-center cursor-pointer hover:scale-105 shadow-sm"
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
                <span className="font-bold text-foreground text-sm leading-tight">ReSys SaaS</span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-primary/10 border border-primary/20 text-primary uppercase tracking-wide leading-none">
                  Host Console
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-semibold tracking-wide mt-0.5">Platform Administration</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDb}
              disabled={isResetting}
              className="border border-rose-500/25 dark:border-rose-500/20 bg-rose-500/8 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 flex items-center gap-1.5 disabled:opacity-50 text-xs font-semibold py-1.5 px-3.5 rounded-xl transition-all duration-200 hover:scale-[1.03] active:scale-95 shadow-sm shadow-rose-500/5 cursor-pointer"
            >
              <RotateCcw size={12} className={isResetting ? "animate-spin" : ""} />
              {isResetting ? "Resetting..." : "Reset & Seed DB"}
            </button>
            
            <div className="flex items-center bg-white/45 dark:bg-[#0E0E1B]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-2xl p-1 shadow-md shadow-slate-100/5 dark:shadow-black/5 transition-all">
              <ThemeToggle />
              
              <span className="h-6 w-px bg-slate-200/50 dark:bg-[#1F1F35] mx-1 shrink-0" />
              
              {session ? (
                <div className="flex items-center gap-3 pl-2 pr-1 py-0.5">
                  <div className="hidden sm:flex flex-col text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-rose-500/10 border border-rose-500/20 text-rose-500 uppercase tracking-wide leading-none">
                        Superadmin
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none">{session.user?.name}</span>
                    </div>
                    <span className="text-[9px] text-slate-500 dark:text-zinc-400 mt-1 leading-none">{session.user?.email}</span>
                  </div>
                  
                  {/* Avatar with gradient matching brand colors */}
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-primary/25 to-primary/5 dark:from-primary/30 dark:to-primary/10 border border-primary/20 dark:border-primary/30 text-primary dark:text-purple-400 flex items-center justify-center font-extrabold text-xs select-none shadow-sm shadow-primary/5">
                    {session.user?.name ? session.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "SA"}
                  </div>
                  
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="p-2 text-muted-foreground hover:text-rose-500 rounded-xl hover:bg-rose-500/10 transition-all cursor-pointer flex items-center justify-center"
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
        <aside className="md:w-64 w-full space-y-1.5 h-fit bg-white/45 dark:bg-[#0A0A10]/35 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] p-3 rounded-2xl shadow-sm shadow-slate-100/5 dark:shadow-black/5 shrink-0">
          <button
            onClick={() => setActiveTab("tenants")}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-bold transition-all cursor-pointer border border-transparent ${
              activeTab === "tenants" 
                ? "bg-gradient-to-r from-primary to-[#8B5CF6] text-white shadow-md shadow-primary/25 scale-[1.02]" 
                : "text-slate-500 dark:text-zinc-400 hover:text-primary dark:hover:text-purple-400 hover:bg-white/50 dark:hover:bg-[#131322]/40 hover:border-slate-200/30 dark:hover:border-[#1F1F35]/20 hover:scale-[1.01]"
            }`}
          >
            <Server size={15} />
            Tenant Registry
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-bold transition-all cursor-pointer border border-transparent ${
              activeTab === "users" 
                ? "bg-gradient-to-r from-primary to-[#8B5CF6] text-white shadow-md shadow-primary/25 scale-[1.02]" 
                : "text-slate-500 dark:text-zinc-400 hover:text-primary dark:hover:text-purple-400 hover:bg-white/50 dark:hover:bg-[#131322]/40 hover:border-slate-200/30 dark:hover:border-[#1F1F35]/20 hover:scale-[1.01]"
            }`}
          >
            <Users size={15} />
            User Accounts ({users.length})
          </button>
        </aside>

        {/* Content columns */}
        <div className="flex-1 grid lg:grid-cols-3 gap-8 items-start">
          
          {/* Left/Middle Content Columns */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === "tenants" ? (
              <>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Server size={18} className="text-primary" />
                  Active SaaS Tenants ({tenants.length})
                </h2>

                {loading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="h-32 rounded-2xl bg-secondary/50 border border-border animate-pulse" />
                    ))}
                  </div>
                ) : tenants.length === 0 ? (
                  <div className="bg-secondary/20 border border-border p-12 text-center rounded-2xl text-muted-foreground text-sm font-medium">
                    No tenants found. Use the panel on the right to create one.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tenants.map((tenant) => (
                      <div
                        key={tenant.id}
                        className="card p-6 relative overflow-hidden group hover:border-primary/50 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/70 dark:bg-card/45 backdrop-blur-md"
                      >
                        <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${getVerticalGradient(tenant.vertical)}`} />
                        
                        <div className="space-y-2.5 pl-2 flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-bold text-lg text-foreground leading-tight break-words">{tenant.name}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider shrink-0 ${getVerticalBadgeStyles(tenant.vertical)}`}>
                              {tenant.vertical.replace("_", " ")}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs text-muted-foreground">
                            <p className="flex items-center gap-2">
                              <Globe size={12} className="text-slate-400 dark:text-zinc-500" />
                              Domain/Host: <span className="text-foreground font-mono font-medium">{tenant.domain.includes(".") ? tenant.domain : `${tenant.domain}.localhost:3000`}</span>
                            </p>
                            <p className="flex items-center gap-2">
                              <KeyRound size={12} className="text-slate-400 dark:text-zinc-500" />
                              SSO ID: <span className="text-foreground font-mono font-medium">{tenant.ssoClientId}</span>
                            </p>
                            <div className="flex gap-4 mt-2 text-muted-foreground pt-2 border-t border-border/60">
                              <span className="flex items-center gap-1">
                                <Database size={11} className="text-slate-400 dark:text-zinc-500" />
                                Resources: <strong className="text-foreground font-semibold">{tenant.resources?.length || 0}</strong>
                              </span>
                              <span className="flex items-center gap-1">
                                <Cpu size={11} className="text-slate-400 dark:text-zinc-500" />
                                IoT Devices: <strong className="text-foreground font-semibold">{tenant.devices?.length || 0}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 border-border/60 pt-3 sm:pt-0 pl-2 shrink-0">
                          <a
                            href={getTenantUrl(tenant.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-outline flex items-center gap-1 text-xs font-semibold py-1.5 px-3 cursor-pointer hover:bg-primary/5 hover:text-primary transition-all rounded-xl whitespace-nowrap"
                          >
                            <ExternalLink size={13} />
                            Open Portal
                          </a>
                          <button
                            onClick={() => handleEdit(tenant)}
                            className="btn-outline text-primary hover:bg-primary/10 border-border py-1.5 px-2.5 cursor-pointer transition-all rounded-xl"
                            title="Edit Tenant"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(tenant.id)}
                            className="btn-danger hover:bg-rose-500/10 border-rose-500/20 py-1.5 px-2.5 cursor-pointer transition-all rounded-xl"
                            title="Delete Tenant"
                          >
                            <Trash size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Users size={18} className="text-primary" />
                  System Accounts ({users.length})
                </h2>

                {usersLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-16 rounded-2xl bg-secondary/50 border border-border animate-pulse" />
                    ))}
                  </div>
                ) : users.length === 0 ? (
                  <div className="bg-secondary/20 border border-border p-12 text-center rounded-2xl text-muted-foreground text-sm font-medium">
                    No accounts found. Create one using the manager panel on the right.
                  </div>
                ) : (
                  <div className="bg-card/75 dark:bg-card/45 backdrop-blur-md border border-border/80 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-secondary/40 dark:bg-[#121220]/50 border-b border-border text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10.5px]">
                            <th className="p-4">Name / Contact</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Tenant Scope</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 text-foreground">
                          {users.map((u) => (
                            <tr key={u.id} className="hover:bg-secondary/10 dark:hover:bg-[#1A1A2E]/25 transition-colors">
                              <td className="p-4 space-y-1">
                                <p className="font-bold text-sm text-foreground">{u.name}</p>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-[11px]">
                                  <span className="flex items-center gap-1.5"><Mail size={11} className="text-slate-400 dark:text-zinc-500" /> {u.email}</span>
                                  {u.phone && <span className="flex items-center gap-1.5"><Phone size={11} className="text-slate-400 dark:text-zinc-500" /> {u.phone}</span>}
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${
                                  u.role === "SUPERADMIN" 
                                    ? "bg-rose-500/10 border-rose-500/20 text-rose-500" 
                                    : u.role === "ADMIN" 
                                      ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-500" 
                                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                }`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="p-4 text-muted-foreground font-medium">
                                {u.tenant ? (
                                  <span className="text-foreground font-bold flex items-center gap-1.5">
                                    <Building size={12} className="text-slate-400 dark:text-zinc-500" />
                                    {u.tenant.name} 
                                    <code className="font-mono font-medium text-[10px] text-muted-foreground bg-secondary/80 px-1 py-0.5 rounded">({u.tenantId})</code>
                                  </span>
                                ) : (
                                  <span className="italic text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
                                    <Globe size={12} className="text-slate-400 dark:text-zinc-500" />
                                    All Tenants (Global)
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleEditUser(u)}
                                    className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors cursor-pointer"
                                    title="Edit User"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(u.id, u.name)}
                                    className="p-2 text-destructive hover:bg-destructive/10 rounded-xl transition-colors cursor-pointer"
                                    disabled={u.id === session?.user?.id}
                                    title="Delete User"
                                  >
                                    <Trash size={14} />
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
          <div className="card p-6 h-fit bg-card/65 backdrop-blur-md lg:col-span-1 border-border/80 shadow-md">
            {activeTab === "tenants" ? (
              <>
                <h2 className="text-md font-bold text-foreground mb-6 flex items-center gap-2 border-b border-border pb-3">
                  <Activity size={16} className="text-primary" />
                  {editingTenant ? "Edit Tenant Profile" : "Create New Tenant"}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Tenant Unique ID</label>
                    <div className="relative flex items-center">
                      <Terminal size={13} className="absolute left-3.5 text-muted-foreground" />
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
                        className="input-field pl-10 font-mono"
                        style={{ paddingLeft: "2.35rem" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Tenant Name</label>
                    <div className="relative flex items-center">
                      <Building size={13} className="absolute left-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Sféra Pardubice"
                        className="input-field pl-10"
                        style={{ paddingLeft: "2.35rem" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Local Subdomain / Domain</label>
                    <div className="relative flex items-center">
                      <Globe size={13} className="absolute left-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        value={formData.domain}
                        onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                        placeholder="e.g. sfera.localhost:3000"
                        className="input-field pl-10 font-mono"
                        style={{ paddingLeft: "2.35rem" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">SaaS Vertical Template</label>
                    <div className="relative flex items-center">
                      <Layers size={13} className="absolute left-3.5 text-muted-foreground pointer-events-none" />
                      <select
                        value={formData.vertical}
                        onChange={(e) => setFormData({ ...formData, vertical: e.target.value })}
                        className="select-field pl-10 cursor-pointer"
                        style={{ paddingLeft: "2.35rem" }}
                      >
                        <option value="SPORTS_GROUND">Sports Ground (Emerald)</option>
                        <option value="CAPACITY_CLASS">Capacity Class (Fuchsia)</option>
                        <option value="EDUCATIONAL_COURSE">Educational Course (Cyan)</option>
                        <option value="EVENT_TICKETING">Event Ticketing (Amber)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">OneiD SSO Client ID</label>
                    <div className="relative flex items-center">
                      <KeyRound size={13} className="absolute left-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        value={formData.ssoClientId}
                        onChange={(e) => setFormData({ ...formData, ssoClientId: e.target.value })}
                        className="input-field pl-10 font-mono"
                        style={{ paddingLeft: "2.35rem" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">OneiD SSO Client Secret</label>
                    <div className="relative flex items-center">
                      <Lock size={13} className="absolute left-3.5 text-muted-foreground" />
                      <input
                        type="password"
                        required
                        value={formData.ssoClientSec}
                        onChange={(e) => setFormData({ ...formData, ssoClientSec: e.target.value })}
                        className="input-field pl-10 font-mono"
                        style={{ paddingLeft: "2.35rem" }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {editingTenant ? (
                      <>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="btn-secondary flex-1 py-2 cursor-pointer transition-all rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn-primary flex-1 py-2 cursor-pointer transition-all rounded-xl bg-gradient-to-r from-primary to-[#8B5CF6]"
                        >
                          Save Changes
                        </button>
                      </>
                    ) : (
                      <button
                        type="submit"
                        className="btn-primary w-full py-2 flex items-center justify-center gap-1 cursor-pointer transition-all rounded-xl bg-gradient-to-r from-primary to-[#8B5CF6]"
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
                <h2 className="text-md font-bold text-foreground mb-6 flex items-center gap-2 border-b border-border pb-3">
                  <Briefcase size={16} className="text-primary" />
                  {editingUser ? "Edit User Profile" : "Create SaaS Account"}
                </h2>

                <form onSubmit={handleUserSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Full Name</label>
                    <div className="relative flex items-center">
                      <UserIcon size={13} className="absolute left-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        value={userFormData.name}
                        onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                        placeholder="e.g. Marie Kovářová"
                        className="input-field pl-10"
                        style={{ paddingLeft: "2.35rem" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">E-mail Address</label>
                    <div className="relative flex items-center">
                      <Mail size={13} className="absolute left-3.5 text-muted-foreground" />
                      <input
                        type="email"
                        required
                        value={userFormData.email}
                        onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                        placeholder="e.g. marie@gmail.com"
                        className="input-field pl-10 font-mono"
                        style={{ paddingLeft: "2.35rem" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                      Password {editingUser && "(leave blank to keep unchanged)"}
                    </label>
                    <div className="relative flex items-center">
                      <KeyRound size={13} className="absolute left-3.5 text-muted-foreground" />
                      <input
                        type="password"
                        required={!editingUser}
                        value={userFormData.password}
                        onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                        placeholder="••••••••"
                        className="input-field pl-10 font-mono"
                        style={{ paddingLeft: "2.35rem" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Phone (Optional)</label>
                    <div className="relative flex items-center">
                      <Phone size={13} className="absolute left-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={userFormData.phone}
                        onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                        placeholder="e.g. +420777123456"
                        className="input-field pl-10 font-mono"
                        style={{ paddingLeft: "2.35rem" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">User Account Role</label>
                    <div className="relative flex items-center">
                      <Layers size={13} className="absolute left-3.5 text-muted-foreground pointer-events-none" />
                      <select
                        value={userFormData.role}
                        onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value, tenantId: e.target.value === "SUPERADMIN" ? "" : userFormData.tenantId })}
                        className="select-field pl-10 cursor-pointer"
                        style={{ paddingLeft: "2.35rem" }}
                      >
                        <option value="SUPERADMIN">Platform Superadmin</option>
                        <option value="ADMIN">Tenant Admin (B2B Tenant)</option>
                        <option value="USER">Customer User (General)</option>
                      </select>
                    </div>
                  </div>

                  {userFormData.role !== "SUPERADMIN" && (
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Associated Tenant (Property)</label>
                      <div className="relative flex items-center">
                        <Building size={13} className="absolute left-3.5 text-muted-foreground pointer-events-none" />
                        <select
                          value={userFormData.tenantId}
                          onChange={(e) => setUserFormData({ ...userFormData, tenantId: e.target.value })}
                          required={userFormData.role === "ADMIN"}
                          className="select-field pl-10 font-semibold cursor-pointer"
                          style={{ paddingLeft: "2.35rem" }}
                        >
                          <option value="">-- No Tenant Associated --</option>
                          {tenants.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    {editingUser ? (
                      <>
                        <button
                          type="button"
                          onClick={handleCancelUserEdit}
                          className="btn-secondary flex-1 py-2 cursor-pointer transition-all rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn-primary flex-1 py-2 cursor-pointer transition-all rounded-xl bg-gradient-to-r from-primary to-[#8B5CF6]"
                        >
                          Save Account
                        </button>
                      </>
                    ) : (
                      <button
                        type="submit"
                        className="btn-primary w-full py-2 flex items-center justify-center gap-1 cursor-pointer transition-all rounded-xl bg-gradient-to-r from-primary to-[#8B5CF6]"
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

        </div>
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

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { 
  Plus, Edit, Trash, RotateCcw, Server, Globe, Shield, 
  Activity, ExternalLink, Users, LogOut, KeyRound, Mail, 
  User as UserIcon, ShieldAlert, Loader2, Phone, Briefcase
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

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

  const handleResetDb = async () => {
    if (!confirm("Are you sure you want to reset and re-seed the database? This deletes all current custom bookings, custom users and tenant alterations!")) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed_reset" }),
      });
      if (res.ok) {
        alert("Database re-seeded successfully!");
        fetchTenants();
        fetchUsers();
      } else {
        alert("Failed to seed database.");
      }
    } catch (e) {
      console.error(e);
      alert("Error re-seeding database.");
    } finally {
      setIsResetting(false);
    }
  };

  // --- Tenant Handlers ---
  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      id: tenant.id,
      name: tenant.name,
      domain: tenant.domain,
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
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "tenant_upsert",
          data: formData,
        }),
      });

      if (res.ok) {
        handleCancelEdit();
        fetchTenants();
      } else {
        const err = await res.json();
        alert("Error: " + err.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving tenant.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to delete tenant '${id}'? This will delete all its resources, rules, and bookings!`)) {
      return;
    }
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
        fetchTenants();
      } else {
        alert("Failed to delete tenant.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting tenant.");
    }
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
        handleCancelUserEdit();
        fetchUsers();
      } else {
        const err = await res.json();
        alert("Error: " + err.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving user.");
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (id === session?.user?.id) {
      alert("You cannot delete your own logged-in superadmin profile!");
      return;
    }
    if (!confirm(`Are you sure you want to delete user '${name}'?`)) {
      return;
    }
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
        fetchUsers();
      } else {
        alert("Failed to delete user.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting user.");
    }
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
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 relative font-sans">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>

        <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 bg-[#7000FF]/10 blur-3xl rounded-full" />
          
          <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-2xl bg-[#7000FF]/10 border border-[#7000FF]/20 flex items-center justify-center text-[#7000FF] mb-6 shadow-lg">
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
                className="w-full py-3 bg-gradient-to-r from-[#7000FF] to-[#3B82F6] hover:opacity-95 text-white text-xs font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-200">
      <header className="border-b border-slate-200/50 dark:border-[#1F1F35]/30 bg-white/45 dark:bg-[#07070C]/35 backdrop-blur-xl sticky top-0 z-50 transition-all shadow-md shadow-slate-100/5 dark:shadow-black/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 500 500"
              className="h-9 w-9 transition-transform hover:scale-105"
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
            <span className="font-bold text-lg tracking-tight text-foreground select-none bg-clip-text text-transparent bg-gradient-to-r from-[#7000FF] via-[#8B5CF6] to-[#3B82F6]">
              ReSys SaaS Host Console
            </span>
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
            
            <ThemeToggle />

            <div className="h-6 w-px bg-border mx-1" />

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-xs font-bold text-foreground">{session?.user?.name}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="p-2 text-muted-foreground hover:text-rose-500 rounded-xl hover:bg-rose-500/10 transition-all cursor-pointer"
                title="Odhlásit se"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs Switcher */}
      <div className="bg-secondary/15 border-b border-border py-3">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-4">
          <button
            onClick={() => setActiveTab("tenants")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "tenants" 
                ? "bg-primary text-white shadow-md shadow-primary/15" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <Server size={14} />
            Tenant Registry
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "users" 
                ? "bg-primary text-white shadow-md shadow-primary/15" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <Users size={14} />
            User Accounts ({users.length})
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 grid md:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Data List */}
        <div className="md:col-span-2 space-y-6">
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
                      className="card p-6 relative overflow-hidden group hover:border-primary/50 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                    >
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-primary to-accent" />
                      
                      <div className="space-y-2.5 pl-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-lg text-foreground">{tenant.name}</h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold uppercase tracking-wider">
                            {tenant.vertical.replace("_", " ")}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p className="flex items-center gap-1.5">
                            <Globe size={12} className="text-muted-foreground" />
                            Domain/Host: <span className="text-foreground font-mono font-medium">{tenant.domain}</span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <Shield size={12} className="text-muted-foreground" />
                            SSO ID: <span className="text-foreground font-mono font-medium">{tenant.ssoClientId}</span>
                          </p>
                          <div className="flex gap-4 mt-2 text-muted-foreground pt-1 border-t border-border">
                            <span>Resources: <strong className="text-foreground font-semibold">{tenant.resources?.length || 0}</strong></span>
                            <span>IoT Devices: <strong className="text-foreground font-semibold">{tenant.devices?.length || 0}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 border-border pt-3 sm:pt-0 pl-2">
                        <a
                          href={getTenantUrl(tenant.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-outline flex items-center gap-1 text-xs font-semibold py-1.5 px-3 cursor-pointer"
                        >
                          <ExternalLink size={13} />
                          Open Portal
                        </a>
                        <button
                          onClick={() => handleEdit(tenant)}
                          className="btn-outline text-primary hover:bg-primary/10 border-border py-1.5 px-2.5 cursor-pointer"
                          title="Edit Tenant"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(tenant.id)}
                          className="btn-outline text-destructive hover:bg-destructive/10 border-border py-1.5 px-2.5 cursor-pointer"
                          style={{ color: "oklch(0.60 0.18 15)" }}
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
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-secondary/35 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                          <th className="p-4">Name / Contact</th>
                          <th className="p-4">Role</th>
                          <th className="p-4">Tenant Scope</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-foreground">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-secondary/10 transition-colors">
                            <td className="p-4 space-y-1">
                              <p className="font-bold text-sm text-foreground">{u.name}</p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-[11px]">
                                <span className="flex items-center gap-1"><Mail size={11} /> {u.email}</span>
                                {u.phone && <span className="flex items-center gap-1"><Phone size={11} /> {u.phone}</span>}
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
                                <span className="text-foreground font-bold">{u.tenant.name} <code className="font-mono font-medium text-[10px] text-muted-foreground">({u.tenantId})</code></span>
                              ) : (
                                <span className="italic">All Tenants (Global)</span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleEditUser(u)}
                                  className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                                  title="Edit User"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.name)}
                                  className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                                  style={{ color: "oklch(0.60 0.18 15)" }}
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
        <div className="card p-6 h-fit bg-card/65 backdrop-blur-md">
          {activeTab === "tenants" ? (
            <>
              <h2 className="text-md font-bold text-foreground mb-6 flex items-center gap-2 border-b border-border pb-3">
                <Activity size={16} className="text-primary" />
                {editingTenant ? "Edit Tenant Profile" : "Create New Tenant"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Tenant Unique ID</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingTenant}
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                    placeholder="e.g. motogp, sfera"
                    className="input-field font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Tenant Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Sféra Pardubice"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Local Subdomain / Domain</label>
                  <input
                    type="text"
                    required
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    placeholder="e.g. sfera.localhost:3000"
                    className="input-field font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">SaaS Vertical Template</label>
                  <select
                    value={formData.vertical}
                    onChange={(e) => setFormData({ ...formData, vertical: e.target.value })}
                    className="select-field"
                  >
                    <option value="SPORTS_GROUND">Sports Ground (Emerald)</option>
                    <option value="CAPACITY_CLASS">Capacity Class (Fuchsia)</option>
                    <option value="EDUCATIONAL_COURSE">Educational Course (Cyan)</option>
                    <option value="EVENT_TICKETING">Event Ticketing (Amber)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">OneiD SSO Client ID</label>
                  <input
                    type="text"
                    required
                    value={formData.ssoClientId}
                    onChange={(e) => setFormData({ ...formData, ssoClientId: e.target.value })}
                    className="input-field font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">OneiD SSO Client Secret</label>
                  <input
                    type="password"
                    required
                    value={formData.ssoClientSec}
                    onChange={(e) => setFormData({ ...formData, ssoClientSec: e.target.value })}
                    className="input-field font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  {editingTenant ? (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="btn-secondary flex-1 py-2 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-primary flex-1 py-2 cursor-pointer"
                      >
                        Save Changes
                      </button>
                    </>
                  ) : (
                    <button
                      type="submit"
                      className="btn-primary w-full py-2 flex items-center justify-center gap-1 cursor-pointer"
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
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value, tenantId: e.target.value === "SUPERADMIN" ? "" : userFormData.tenantId })}
                    className="select-field"
                  >
                    <option value="SUPERADMIN">Platform Superadmin</option>
                    <option value="ADMIN">Tenant Admin (B2B Tenant)</option>
                    <option value="USER">Customer User (General)</option>
                  </select>
                </div>

                {userFormData.role !== "SUPERADMIN" && (
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Associated Tenant (Property)</label>
                    <select
                      value={userFormData.tenantId}
                      onChange={(e) => setUserFormData({ ...userFormData, tenantId: e.target.value })}
                      required={userFormData.role === "ADMIN"}
                      className="select-field font-semibold"
                    >
                      <option value="">-- No Tenant Associated --</option>
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  {editingUser ? (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelUserEdit}
                        className="btn-secondary flex-1 py-2 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-primary flex-1 py-2 cursor-pointer"
                      >
                        Save Account
                      </button>
                    </>
                  ) : (
                    <button
                      type="submit"
                      className="btn-primary w-full py-2 flex items-center justify-center gap-1 cursor-pointer"
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

      </main>
    </div>
  );
}

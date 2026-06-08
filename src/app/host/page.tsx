"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Edit, Trash, RotateCcw, Server, Globe, Shield, Activity, ExternalLink } from "lucide-react";
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

export default function HostConsole() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Partial<Tenant> | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    domain: "",
    vertical: "SPORTS_GROUND",
    ssoClientId: "oneid-client-id",
    ssoClientSec: "oneid-client-secret",
  });

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

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/admin");
        if (res.ok && active) {
          const data = await res.json();
          setTenants(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const handleResetDb = async () => {
    if (!confirm("Are you sure you want to reset and re-seed the database? This deletes all current custom bookings and tenant alterations!")) {
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

  return (
    <div className="flex-1 bg-background text-foreground flex flex-col font-sans transition-colors duration-200">
      <header className="border-b border-border bg-card sticky top-0 z-50 transition-colors shadow-sm">
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
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="50%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#14B8A6" />
                </linearGradient>
                <filter id="subtleGlowInlineHost" x="-15%" y="-15%" width="130%" height="130%">
                  <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#6366F1" floodOpacity="0.3" />
                </filter>
              </defs>
              <g filter="url(#subtleGlowInlineHost)">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M 110 150 L 155 105 H 315 C 385 105 405 145 405 205 C 405 255 380 285 325 295 L 385 395 H 320 L 265 305 H 175 V 395 H 120 V 170 L 110 150 Z M 175 160 V 255 H 275 C 325 255 345 235 345 205 C 345 175 325 160 275 160 H 175 Z"
                  fill="url(#resysGradientInlineHost)"
                />
                <g fill="#FFFFFF" opacity="0.85">
                  <rect x="290" y="325" width="10" height="10" rx="2.5" />
                  <rect x="312" y="325" width="10" height="10" rx="2.5" />
                  <rect x="334" y="325" width="10" height="10" rx="2.5" />
                  <rect x="356" y="325" width="10" height="10" rx="2.5" />
                  <rect x="301" y="345" width="10" height="10" rx="2.5" />
                  <rect x="323" y="345" width="10" height="10" rx="2.5" />
                  <rect x="345" y="345" width="10" height="10" rx="2.5" />
                  <rect x="367" y="345" width="10" height="10" rx="2.5" />
                  <rect x="312" y="365" width="10" height="10" rx="2.5" />
                  <rect x="334" y="365" width="10" height="10" rx="2.5" />
                  <rect x="356" y="365" width="10" height="10" rx="2.5" />
                  <rect x="378" y="365" width="10" height="10" rx="2.5" />
                </g>
              </g>
            </svg>
            <span className="font-bold text-lg tracking-tight text-foreground select-none">
              ReSys SaaS Host Console
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDb}
              disabled={isResetting}
              className="btn-danger flex items-center gap-1.5 disabled:opacity-50 text-xs py-1.5 px-3.5 rounded-lg"
            >
              <RotateCcw size={12} className={isResetting ? "animate-spin" : ""} />
              {isResetting ? "Resetting..." : "Reset & Seed DB"}
            </button>
            <ThemeToggle />
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-secondary border border-border text-muted-foreground font-semibold tracking-wide select-none">
              Superadmin Mode
            </span>
          </div>
        </div>
      </header>

      {/* Main Console Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 grid md:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Tenants List */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Server size={18} className="text-primary" />
              Active SaaS Tenants ({tenants.length})
            </h2>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-32 rounded-2xl bg-secondary/50 border border-border animate-pulse" />
              ))}
            </div>
          ) : tenants.length === 0 ? (
            <div className="bg-secondary/20 border border-border p-12 text-center rounded-2xl text-muted-foreground text-sm font-medium">
              No tenants found in the database. Use the manager panel to create one.
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
                    <Link
                      href={`http://${tenant.id}.localhost:3000`}
                      target="_blank"
                      className="btn-outline flex items-center gap-1 text-xs font-semibold py-1.5 px-3"
                    >
                      <ExternalLink size={13} />
                      Open Portal
                    </Link>
                    <button
                      onClick={() => handleEdit(tenant)}
                      className="btn-outline text-primary hover:bg-primary/10 border-border py-1.5 px-2.5"
                      title="Edit Tenant"
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(tenant.id)}
                      className="btn-outline text-destructive hover:bg-destructive/10 border-border py-1.5 px-2.5"
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
        </div>

        {/* Right Col: Configure Form */}
        <div className="card p-6 h-fit">
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
                    className="btn-secondary flex-1 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1 py-2"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <button
                  type="submit"
                  className="btn-primary w-full py-2 flex items-center justify-center gap-1"
                >
                  <Plus size={14} />
                  Add Tenant
                </button>
              )}
            </div>
          </form>
        </div>

      </main>
    </div>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ShieldCheck, LogOut } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { signOut } from "next-auth/react";

interface AdminLoginClientProps {
  tenantId: string;
  tenantName: string;
  theme: {
    primary: string;
    primaryHover: string;
    accent: string;
    gradientStart: string;
    gradientEnd: string;
  };
  isUnauthorized?: boolean;
  loggedInEmail?: string;
}

export default function AdminLoginClient({
  tenantId,
  tenantName,
  isUnauthorized = false,
  loggedInEmail
}: AdminLoginClientProps) {

  const handleLogin = () => {
    // Save current path to localStorage so we redirect back after OneiD login
    localStorage.setItem("post_login_redirect", window.location.pathname);
    window.location.href = `/api/auth/oneid/initiate?tenantId=${tenantId}`;
  };

  if (isUnauthorized) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 font-sans relative transition-colors duration-200">
        {/* Top-Right Theme Toggle */}
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>

        <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 bg-red-500/10 blur-3xl rounded-full" />
          
          <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6 shadow-lg shadow-red-500/5">
              <ShieldAlert size={28} />
            </div>

            <span className="text-[10px] px-2.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 font-bold uppercase tracking-wider mb-2">
              Access Denied
            </span>

            <h2 className="text-xl font-bold text-foreground mb-3">
              Unauthorized Administrator
            </h2>

            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              You are signed in as <span className="text-foreground font-semibold font-mono">{loggedInEmail}</span>. 
              However, this account does not have administrator privileges for <span className="text-foreground font-semibold">{tenantName}</span>.
            </p>

            <div className="w-full bg-secondary border border-border p-4 rounded-2xl mb-6 text-left text-[11px] text-muted-foreground space-y-2">
              <p>💡 <strong>Note to Developers</strong>:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground/80">
                <li>Configure this email address in the tenant{"'"}s admin settings.</li>
                <li>Or use a mock account ending with <code className="text-primary font-semibold">@deepvision.cz</code> to bypass checks locally.</li>
              </ul>
            </div>

            <div className="flex w-full gap-3">
              <button
                onClick={handleLogin}
                className="btn-secondary flex-1 py-2.5 text-xs font-semibold"
              >
                Switch Account
              </button>
              <button
                onClick={() => signOut({ callbackUrl: window.location.origin })}
                className="btn-danger flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer select-none"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 font-sans relative transition-colors duration-200">
      {/* Top-Right Theme Toggle */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 shadow-xl relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 h-48 w-48 bg-tenant-gradient opacity-10 blur-3xl rounded-full" />

        <div className="flex flex-col items-center text-center">
          {/* Tenant Logo Mark */}
          <div className="h-14 w-14 rounded-2xl bg-tenant-gradient flex items-center justify-center font-extrabold text-white text-lg shadow-lg">
            {tenantId[0].toUpperCase()}
          </div>

          <h2 className="text-xl font-bold text-foreground mt-6 mb-2">
            {tenantName}
          </h2>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-6">
            Administrative Console
          </span>

          <div className="w-full bg-secondary border border-border p-4 rounded-2xl mb-6 text-left text-xs space-y-2.5">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="text-emerald-500 mt-0.5 flex-shrink-0" size={16} />
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                This management console is restricted to authorized representatives only. Connection is secured using OneiD SSO.
              </p>
            </div>
          </div>

          <button
            onClick={handleLogin}
            className="btn-tenant w-full py-3 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
          >
            Sign In with OneiD
          </button>

          <Link
            href="/"
            className="text-[11px] text-muted-foreground hover:text-foreground mt-6 transition-colors font-medium underline"
          >
            Back to Public Portal
          </Link>
        </div>
      </div>
    </div>
  );
}

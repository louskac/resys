"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShieldAlert, ShieldCheck, LogOut, KeyRound, User, AlertCircle } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { signOut, signIn } from "next-auth/react";

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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn("admin-credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid admin username or password.");
        setIsLoading(false);
      } else {
        // Save current path to localStorage so we redirect back after login
        localStorage.setItem("post_login_redirect", window.location.pathname);
        window.location.reload();
      }
    } catch (err) {
      console.error("Credentials login error:", err);
      setError("An unexpected error occurred during login.");
      setIsLoading(false);
    }
  };

  const handleOneidLogin = () => {
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
                onClick={handleOneidLogin}
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

        <div className="flex flex-col items-center">
          {/* Tenant Logo Mark */}
          <div className="h-14 w-14 rounded-2xl bg-tenant-gradient flex items-center justify-center font-extrabold text-white text-lg shadow-lg">
            {tenantId[0].toUpperCase()}
          </div>

          <h2 className="text-xl font-bold text-foreground mt-6 mb-1 text-center">
            {tenantName}
          </h2>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-6 text-center">
            Administrative Console
          </span>

          {error && (
            <div className="w-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-2xl mb-4 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Credentials Login Form */}
          <form onSubmit={handleCredentialsLogin} className="w-full space-y-4 text-xs mb-6">
            <div className="space-y-1">
              <label className="block text-muted-foreground font-semibold">Admin Profile Login</label>
              <div className="relative flex items-center">
                <User size={14} className="absolute left-3.5 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field pl-10 py-2.5 text-xs bg-secondary/30"
                  placeholder="admin-profile"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-muted-foreground font-semibold">Password</label>
              <div className="relative flex items-center">
                <KeyRound size={14} className="absolute left-3.5 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 py-2.5 text-xs bg-secondary/30"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-tenant w-full py-3 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          {/* Separator */}
          <div className="w-full flex items-center gap-3 mb-6">
            <div className="h-px bg-border flex-1" />
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">or</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <button
            onClick={handleOneidLogin}
            className="w-full py-2.5 border border-border hover:bg-secondary/40 text-foreground text-xs font-semibold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck size={14} className="text-muted-foreground" />
            Sign In with OneiD SSO
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

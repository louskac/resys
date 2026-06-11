"use client";

import React, { useState, Suspense, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { X, ShieldCheck, User, KeyRound, AlertCircle, Loader2 } from "lucide-react";

interface LoginModalProps {
  tenantId: string;
}

function LoginModalContent({ tenantId }: LoginModalProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const isOpen = searchParams.get("login") === "true";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("login");
    const query = params.toString();
    router.push(pathname + (query ? `?${query}` : ""));
    setError(null);
    setUsername("");
    setPassword("");
    setShowAdminLogin(false);
  };

  useEffect(() => {
    if (session && isOpen) {
      handleClose();
    }
  }, [session, isOpen]);

  if (!isOpen) return null;

  const getCleanRedirectPath = () => {
    if (typeof window === "undefined") return pathname;
    const params = new URLSearchParams(window.location.search);
    params.delete("login");
    const query = params.toString();
    return window.location.pathname + (query ? `?${query}` : "");
  };

  const handleOneidLogin = async () => {
    setIsLoading(true);
    setError(null);
    localStorage.setItem("post_login_redirect", getCleanRedirectPath());
    window.location.href = `/api/auth/oneid/initiate?tenantId=${tenantId}`;
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
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
        setError("Neplatné uživatelské jméno nebo heslo.");
        setIsLoading(false);
      } else {
        localStorage.setItem("post_login_redirect", getCleanRedirectPath());
        window.location.href = getCleanRedirectPath();
      }
    } catch (err) {
      console.error("Admin credentials login error:", err);
      setError("Nastala neočekávaná chyba při přihlašování.");
      setIsLoading(false);
    }
  };

  return (
    <div 
      onClick={handleClose}
      className="fixed inset-0 bg-[#07070C]/60 dark:bg-black/75 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white/95 dark:bg-[#0D0D15]/90 backdrop-blur-2xl border border-slate-200/60 dark:border-[#1F1F35] max-w-sm w-full p-7 rounded-3xl shadow-[0_20px_50px_rgba(112,0,255,0.12)] relative transition-all duration-300 text-xs text-left"
      >
        {/* Elegant Corner Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 transition-all p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Branding Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-12 w-12 bg-slate-100 dark:bg-[#131322]/50 border border-slate-200 dark:border-[#2A2A40] rounded-2xl flex items-center justify-center p-2 shadow-sm mb-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 500 500"
              className="h-8 w-8"
              fill="none"
            >
              <defs>
                <linearGradient id="modalLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7000FF" />
                  <stop offset="50%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
                <linearGradient id="modalSlotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00F5FF" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M 110 150 L 155 105 H 315 C 385 105 405 145 405 205 C 405 255 380 285 325 295 L 385 395 H 320 L 265 305 H 175 V 395 H 120 V 170 L 110 150 Z M 175 160 V 255 H 275 C 325 255 345 235 345 205 C 345 175 325 160 275 160 H 175 Z"
                fill="url(#modalLogoGrad)"
              />
              <g>
                <rect x="290" y="325" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                <rect x="312" y="325" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                <rect x="334" y="325" width="10" height="10" rx="2.5" fill="url(#modalSlotGrad)" />
                <rect x="356" y="325" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                <rect x="301" y="345" width="10" height="10" rx="2.5" fill="url(#modalSlotGrad)" />
                <rect x="323" y="345" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                <rect x="345" y="345" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                <rect x="367" y="345" width="10" height="10" rx="2.5" fill="url(#modalSlotGrad)" />
                <rect x="312" y="365" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                <rect x="334" y="365" width="10" height="10" rx="2.5" fill="url(#modalSlotGrad)" />
                <rect x="356" y="365" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                <rect x="378" y="365" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
              </g>
            </svg>
          </div>
          <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200">
            Přihlášení do portálu
          </h3>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            Zvolte metodu pro zabezpečené přihlášení
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 dark:bg-rose-500/5 border border-rose-500/20 text-rose-600 dark:text-rose-450 p-3 rounded-2xl mb-4 flex items-start gap-2 text-xs font-semibold leading-relaxed">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* OneiD SSO Button */}
          {!showAdminLogin && (
            <button
              onClick={handleOneidLogin}
              disabled={isLoading}
              className="w-full py-3 bg-tenant-gradient hover:opacity-95 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-md shadow-tenant-primary/15 cursor-pointer disabled:opacity-75"
            >
              {isLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <ShieldCheck size={16} />
              )}
              {isLoading ? "Přihlašování..." : "Přihlásit se přes OneiD SSO"}
            </button>
          )}

          {/* Admin Credentials Login Toggle & Form */}
          {showAdminLogin ? (
            <form onSubmit={handleAdminLogin} className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="block text-muted-foreground font-semibold">Administrátor</label>
                <div className="relative flex items-center">
                  <User size={13} className="absolute left-3 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input-field pl-9 py-2 bg-slate-100/40 dark:bg-[#131322]/40 border border-slate-200/50 dark:border-[#2A2A40]"
                    style={{ paddingLeft: "2.25rem" }}
                    placeholder="admin-profile"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-muted-foreground font-semibold">Heslo</label>
                <div className="relative flex items-center">
                  <KeyRound size={13} className="absolute left-3 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-9 py-2 bg-slate-100/40 dark:bg-[#131322]/40 border border-slate-200/50 dark:border-[#2A2A40]"
                    style={{ paddingLeft: "2.25rem" }}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-slate-800 dark:bg-white text-white dark:text-black hover:bg-slate-900 dark:hover:bg-slate-100 font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 mt-2"
              >
                {isLoading && <Loader2 size={13} className="animate-spin" />}
                {isLoading ? "Ověřování..." : "Přihlásit se"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAdminLogin(false);
                  setError(null);
                }}
                className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground font-semibold mt-2 underline"
              >
                Zpět na přihlášení přes OneiD
              </button>
            </form>
          ) : (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setShowAdminLogin(true)}
                className="text-[10px] text-slate-400 dark:text-zinc-500 hover:text-foreground font-semibold underline cursor-pointer"
              >
                Přihlásit se jako správce
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginModal(props: LoginModalProps) {
  return (
    <Suspense fallback={null}>
      <LoginModalContent {...props} />
    </Suspense>
  );
}

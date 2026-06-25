"use client";

import React from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    signOut({ callbackUrl: window.location.origin });
  };

  return (
    <button
      onClick={handleLogout}
      className="p-1.5 sm:px-3 sm:py-1.5 rounded-none text-[10.5px] font-extrabold bg-slate-105/50 hover:bg-red-500/10 dark:bg-zinc-800/30 dark:hover:bg-red-500/10 text-slate-600 hover:text-red-600 dark:text-zinc-350 dark:hover:text-red-400 border border-slate-200/50 hover:border-red-500/20 dark:border-zinc-700/40 dark:hover:border-red-500/20 active:scale-95 transition-all duration-200 cursor-pointer select-none shadow-sm flex items-center justify-center gap-1.5"
      title="Odhlásit se"
    >
      <LogOut size={13} className="shrink-0" />
      <span className="hidden sm:inline">Odhlásit se</span>
    </button>
  );
}

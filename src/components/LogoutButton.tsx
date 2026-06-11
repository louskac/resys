"use client";

import React from "react";
import { signOut } from "next-auth/react";

export default function LogoutButton() {
  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    signOut({ callbackUrl: window.location.origin });
  };

  return (
    <button
      onClick={handleLogout}
      className="px-3 py-1.5 rounded-xl text-[10.5px] font-extrabold bg-slate-105/50 hover:bg-red-500/10 dark:bg-zinc-800/30 dark:hover:bg-red-500/10 text-slate-600 hover:text-red-600 dark:text-zinc-350 dark:hover:text-red-400 border border-slate-200/50 hover:border-red-500/20 dark:border-zinc-700/40 dark:hover:border-red-500/20 active:scale-95 transition-all duration-200 cursor-pointer select-none shadow-sm"
    >
      Odhlásit se
    </button>
  );
}

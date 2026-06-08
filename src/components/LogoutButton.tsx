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
      className="btn-secondary py-1.5 px-3 text-xs cursor-pointer select-none"
    >
      Logout
    </button>
  );
}

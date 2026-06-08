"use client";

import React, { useState, useEffect } from "react";
import { Image as ImageIcon } from "lucide-react";

interface TenantBannerProps {
  src?: string;
  alt?: string;
  className?: string;
  heightClass?: string;
  fallbackText?: string;
}

export default function TenantBanner({
  src,
  alt = "Tenant Banner",
  className = "",
  heightClass = "h-44",
  fallbackText = "Welcome"
}: TenantBannerProps) {
  const [imageError, setImageError] = useState(false);

  // Reset error state when src changes
  useEffect(() => {
    setImageError(false);
  }, [src]);

  const showFallback = !src || imageError;

  return (
    <div className={`relative w-full overflow-hidden ${heightClass} ${className} bg-secondary flex items-center justify-center`}>
      {showFallback ? (
        // Beautiful fallback themed gradient with decorative grid pattern
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center select-none"
          style={{ background: "var(--tenant-gradient, linear-gradient(135deg, #6366f1, #14b8a6))" }}
        >
          {/* Subtle grid pattern overlay inside fallback */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:1.5rem_1.5rem]" />
          
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg animate-pulse">
              <ImageIcon size={24} />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-white/80 mt-1">
              {fallbackText}
            </span>
          </div>
        </div>
      ) : (
        <>
          <img
            src={src}
            alt={alt}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-50" />
        </>
      )}
    </div>
  );
}

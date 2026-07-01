"use client";

import React, { useState, useEffect } from "react";
import { Calendar, Clock, X, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    resourceName: string;
    reservedFrom: string;
    reservedTo: string;
    userName?: string;
    userEmail?: string;
    rentedEquipment?: any;
    status?: string;
    tenantName?: string;
  } | null;
  tenantLocale?: string;
  onCancelBooking?: (bookingId: string) => void;
  isCancelling?: boolean;
  dynamicQrEnabled?: boolean;
}

export default function TicketModal({
  isOpen,
  onClose,
  booking,
  tenantLocale = "cs-CZ",
  onCancelBooking,
  isCancelling = false,
  dynamicQrEnabled = false,
}: TicketModalProps) {
  const [dynamicQrPayload, setDynamicQrPayload] = useState<string>("");
  const [qrState, setQrState] = useState<number>(0);
  const [qrTimeLeft, setQrTimeLeft] = useState<number>(60);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  useEffect(() => {
    if (!booking || !isOpen) {
      setDynamicQrPayload("");
      return;
    }

    if (!dynamicQrEnabled) {
      setDynamicQrPayload(booking.id);
      return;
    }

    let baseTimestamp = Date.now();
    let currentState = 0;
    
    const updatePayload = async (ts: number, state: number) => {
      const bookingId = booking.id;
      const secret = "resys-dynamic-qr-secret-key-2026";
      const dataStr = `${bookingId}:${ts}:${state}`;
      
      try {
        const msgBuffer = new TextEncoder().encode(`${dataStr}:${secret}`);
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
        
        setDynamicQrPayload(`${dataStr}:${hashHex}`);
      } catch (err) {
        console.error("Failed to generate secure QR signature:", err);
        setDynamicQrPayload(bookingId);
      }
    };

    updatePayload(baseTimestamp, currentState);

    const stateInterval = setInterval(() => {
      currentState = currentState === 0 ? 1 : 0;
      setQrState(currentState);
      updatePayload(baseTimestamp, currentState);
    }, 1500);

    const timestampInterval = setInterval(() => {
      baseTimestamp = Date.now();
      setQrTimeLeft(60);
      updatePayload(baseTimestamp, currentState);
    }, 60000);

    const countdownInterval = setInterval(() => {
      setQrTimeLeft(prev => (prev > 1 ? prev - 1 : 60));
    }, 1000);

    return () => {
      clearInterval(stateInterval);
      clearInterval(timestampInterval);
      clearInterval(countdownInterval);
    };
  }, [booking, isOpen, dynamicQrEnabled]);

  if (!isOpen || !booking) return null;

  // Format dates and times
  const fromDate = new Date(booking.reservedFrom);
  const toDate = new Date(booking.reservedTo);

  // Translate days to Czech
  const ALL_WEEK_DAYS = [
    { name: "Neděle" },
    { name: "Pondělí" },
    { name: "Úterý" },
    { name: "Středa" },
    { name: "Čtvrtek" },
    { name: "Pátek" },
    { name: "Sobota" }
  ];

  const getEventFormattedDate = (d: Date) => {
    const dayName = ALL_WEEK_DAYS[d.getUTCDay()]?.name || "";
    return `${dayName} ${d.getUTCDate()}. ${d.getUTCMonth() + 1}. ${d.getUTCFullYear()}`;
  };

  const formattedDate = getEventFormattedDate(fromDate);

  const formatTime = (d: Date) => {
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  };
  const formattedTime = `${formatTime(fromDate)} – ${formatTime(toDate)}`;

  // Parse equipment
  const parsedEquip = (() => {
    if (!booking.rentedEquipment) return [];
    if (typeof booking.rentedEquipment === "string") {
      try {
        return JSON.parse(booking.rentedEquipment);
      } catch (e) {
        return [];
      }
    }
    return Array.isArray(booking.rentedEquipment) ? booking.rentedEquipment : [];
  })();

  const bookingStatus = booking.status || "CONFIRMED";

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 bg-[#07070C]/65 backdrop-blur-sm flex items-center justify-center z-[100] p-6 animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white/95 dark:bg-[#0D0D15]/90 backdrop-blur-2xl border border-slate-200/60 dark:border-[#1F1F35] max-w-md w-full p-6 rounded-none shadow-[0_20px_50px_rgba(112,0,255,0.12)] relative transition-all duration-300 animate-in zoom-in-95 duration-200"
      >
        {/* Elegant Corner Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-350 transition-all p-1.5 rounded-none hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
        >
          <X size={16} />
        </button>

        <h3 className="text-xl font-bold text-tenant-primary mb-1 font-sans">
          Detaily mé rezervace
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          Správa vaší rezervace:
        </p>

        {/* The Ticket (Inner Card) */}
        <div className="bg-gradient-to-br from-slate-50/60 via-white to-slate-50/60 dark:from-[#131322]/80 dark:via-[#0D0D15]/95 dark:to-[#0D0D15]/95 rounded-none relative overflow-hidden shadow-md p-0 mb-6 flex flex-col border border-slate-200/50 dark:border-[#1F1F35]">
          {/* Metallic Sheen Overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] dark:via-white/[0.01] to-transparent pointer-events-none z-10 rotate-12 scale-150" />
          {/* Glow badge */}
          <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-tr from-tenant-primary to-tenant-primary opacity-[0.08] dark:opacity-12 blur-2xl rounded-full pointer-events-none z-0" />
          
          {/* Top Ticket Section */}
          <div className="p-5 pb-3 relative z-10">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-extrabold tracking-widest font-sans block">Sportoviště / Plocha</span>
                <h4 className="text-base font-extrabold text-slate-805 dark:text-white leading-tight">
                  {booking.resourceName}
                </h4>
              </div>
              <span className={`px-2 py-0.5 rounded-none text-[9px] font-black uppercase tracking-widest ${
                bookingStatus === "CONFIRMED" || bookingStatus === "PAID"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : bookingStatus === "ATTENDED"
                    ? "bg-slate-500/10 text-slate-700 dark:text-slate-300"
                    : bookingStatus === "PENDING_PAYMENT"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-slate-500/10 text-slate-500"
              }`}>
                {bookingStatus === "CONFIRMED" || bookingStatus === "PAID" ? "Potvrzeno" : bookingStatus === "PENDING_PAYMENT" ? "Čeká na platbu" : bookingStatus === "ATTENDED" ? "Odbaveno" : bookingStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 py-3 bg-slate-100/10 dark:bg-white/[0.01] -mx-5 px-5 mt-4 select-none">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-tenant-primary/10 text-tenant-primary shrink-0">
                  <Calendar size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-extrabold tracking-wider">Datum</span>
                  <span className="text-xs font-bold text-slate-750 dark:text-slate-200">{formattedDate}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-tenant-primary/10 text-tenant-primary shrink-0">
                  <Clock size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-extrabold tracking-wider">Čas</span>
                  <span className="text-xs font-bold text-slate-750 dark:text-slate-200">{formattedTime} (UTC)</span>
                </div>
              </div>
            </div>

            {/* Rented Equipment Info */}
            {parsedEquip.length > 0 && (
              <div className="mt-4 pt-3.5 border-t border-dashed border-slate-200/50 dark:border-white/[0.04] select-none">
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest block mb-2">
                  Vypůjčené vybavení
                </span>
                <div className="space-y-1.5">
                  {parsedEquip.map((eq: any, index: number) => (
                    <div 
                      key={index} 
                      className="flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.01] px-3 py-2 border border-slate-200/60 dark:border-white/[0.02] hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-tenant-primary shrink-0 animate-pulse" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {eq.name}
                        </span>
                      </div>
                      <span className="text-xs font-black text-tenant-primary dark:text-tenant-primary-light bg-tenant-primary/10 dark:bg-tenant-primary/20 px-2.5 py-0.5 rounded-none">
                        {eq.quantity} ks
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ticket Divider with Side Cut-out Punches */}
          <div className="relative h-[1px] my-1 z-20 select-none">
            <div className="absolute left-5 right-5 border-t border-dashed border-slate-200/30 dark:border-white/[0.04] -translate-y-1/2" />
            {/* Left Punch */}
            <div className="absolute left-0 -translate-x-1/2 w-4 h-4 bg-white/95 dark:bg-[#0D0D15]/90 backdrop-blur-2xl rounded-full -translate-y-1/2" />
            {/* Right Punch */}
            <div className="absolute right-0 translate-x-1/2 w-4 h-4 bg-white/95 dark:bg-[#0D0D15]/90 backdrop-blur-2xl rounded-full -translate-y-1/2" />
          </div>

          {/* Bottom Ticket Section */}
          <div className="p-5 pt-2 space-y-4 relative z-10">
            <div className="flex flex-col items-center text-center gap-4 py-1 pb-2">
              <div className={`text-[10px] font-black uppercase tracking-widest text-tenant-primary mb-1 select-none flex items-center justify-center gap-1.5 ${
                dynamicQrEnabled ? "animate-pulse" : ""
              }`}>
                {dynamicQrEnabled && <span className="h-1.5 w-1.5 bg-tenant-primary rounded-full" />}
                {dynamicQrEnabled ? "Aktivní zabezpečený kód pro vstup" : "Kód pro vstup"}
              </div>
              
              {/* QR Code */}
              <div className="relative p-3 bg-white rounded-none flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.06)] select-none overflow-hidden hover:scale-[1.01] transition-transform duration-350">
                <div className="h-44 w-44 flex flex-col items-center justify-center bg-white rounded-none relative overflow-hidden text-slate-800">
                  {dynamicQrPayload ? (
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(dynamicQrPayload)}`}
                      alt={`QR Code pro rezervaci ${booking.id}`}
                      className="h-40 w-40 object-contain transition-all duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="animate-spin text-tenant-primary" size={24} />
                      <span className="text-[10px] text-slate-400 font-bold">Generování...</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 relative w-full flex flex-col items-center">
                <code className="text-[9px] font-mono text-slate-550 dark:text-slate-400 uppercase tracking-widest bg-slate-100/50 dark:bg-slate-900/30 py-0.5 px-2.5 rounded-none border-none">
                  {booking.id.substring(0, 8)}...{booking.id.substring(booking.id.length - 8)}
                </code>
                
                {dynamicQrEnabled && (
                  <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-400 dark:text-zinc-500 font-bold select-none">
                    <span className="w-16 h-1 bg-slate-200 dark:bg-zinc-800 rounded-none overflow-hidden relative">
                      <span 
                        className="absolute inset-y-0 left-0 bg-tenant-primary transition-all duration-1000"
                        style={{ width: `${(qrTimeLeft / 60) * 100}%` }}
                      />
                    </span>
                    <span>Obnova za {qrTimeLeft}s</span>
                  </div>
                )}
              </div>
            </div>

            {/* Collapsible Technical Details */}
            {(booking.userName || booking.userEmail) && (
              <div className="pt-1.5">
                <button
                  type="button"
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  className="w-full flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-650 transition-colors py-1 focus:outline-none"
                >
                  <span>Technické podrobnosti</span>
                  {showTechnicalDetails ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
                
                {showTechnicalDetails && (
                  <div className="text-[10px] space-y-2 pt-2.5 pb-1 border-t border-slate-100/50 dark:border-white/5 mt-1.5 text-slate-600 dark:text-slate-400 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex justify-between py-0.5 border-b border-slate-100/40 dark:border-white/5">
                      <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[8px]">Rezervoval:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">{booking.userName}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-100/40 dark:border-white/5">
                      <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[8px]">E-mail uživatele:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-semibold font-mono">{booking.userEmail}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[8px]">ID Rezervace:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-semibold font-mono text-[8.5px]">{booking.id}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={onClose}
            className="btn-tenant flex-1 py-2.5 text-xs font-bold rounded-none"
          >
            Zavřít
          </button>
          {onCancelBooking && (
            <button
              onClick={() => onCancelBooking(booking.id)}
              disabled={isCancelling}
              className="btn-danger flex-1 py-2.5 text-xs font-bold rounded-none"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="animate-spin" size={12} />
                  Rušení...
                </>
              ) : (
                "Zrušit rezervaci"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

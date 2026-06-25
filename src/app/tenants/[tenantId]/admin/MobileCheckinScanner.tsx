"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Camera, X, Check, AlertTriangle, 
  Loader2, Volume2, VolumeX, Keyboard, Upload, Smartphone, ArrowRight
} from "lucide-react";
import jsQR from "jsqr";

interface Device {
  id: string;
  name: string;
  active: boolean;
}

interface Booking {
  id: string;
  userName: string;
  resourceName: string;
  status: string;
}

interface MobileCheckinScannerProps {
  devices: Device[];
  bookings: Booking[];
  onClose: () => void;
  tenantName: string;
}

export default function MobileCheckinScanner({
  devices,
  bookings,
  onClose,
  tenantName
}: MobileCheckinScannerProps) {
  // Configuration states (preset automatically, no setup step)
  const [deviceId, setDeviceId] = useState("");
  const [deviceToken, setDeviceToken] = useState("");
  const [isSoundMuted, setIsSoundMuted] = useState(false);

  // Scanning loop states
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [manualInputOpen, setManualInputOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");

  // Scan result state
  const [scanResult, setScanResult] = useState<{
    status: "granted" | "denied" | "error";
    message: string;
    userName?: string;
    resourceName?: string;
  } | null>(null);
  
  // Timer for auto-resume
  // Refs for media and scan loops
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Synchronous status refs to prevent scanning race conditions
  const isCheckingInRef = useRef(false);
  const hasResultRef = useRef(false);

  // 1. Initialize device and token automatically on mount
  useEffect(() => {
    const savedMuted = localStorage.getItem("resys_scanner_sound_muted") === "true";
    setIsSoundMuted(savedMuted);

    // Default to the first device in the list or standard preset
    const activeDev = devices.find(d => d.active) || devices[0] || { id: "gate_zskomenskeho_001", name: "Turniket Hlavní Vstup ZŠ" };
    setDeviceId(activeDev.id);
    
    // Autofill matching token for simulator presets
    if (activeDev.id === "gate_zskomenskeho_001") {
      setDeviceToken("sec_tok_zskomenskeho_xyz123");
    } else if (activeDev.id === "gate_umelka_001") {
      setDeviceToken("sec_tok_umelka_active");
    } else if (activeDev.id === "gate_north_001") {
      setDeviceToken("sec_tok_sfera_active");
    } else {
      setDeviceToken("sec_tok_zskomenskeho_xyz123");
    }
  }, [devices]);

  // Start camera on mount
  useEffect(() => {
    if (deviceId) {
      startCamera();
    }
    return () => stopCamera();
  }, [deviceId]);

  // Play audio feedbacks via Web Audio API synthesizer
  const playBeep = (type: "success" | "error") => {
    if (isSoundMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (type === "success") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      } else {
        const playBuzz = (delay: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(160, ctx.currentTime + delay);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.22);
        };
        playBuzz(0);
        playBuzz(0.25);
      }
    } catch (e) {
      console.warn("Web Audio blocked or not supported:", e);
    }
  };

  // Trigger haptic vibration using browser API
  const triggerHaptic = (type: "success" | "error") => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      if (type === "success") {
        navigator.vibrate(80);
      } else {
        navigator.vibrate([100, 60, 100]);
      }
    }
  };

  // Start the video stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      
      streamRef.current = stream;
      setIsScanning(true);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError(
        err.name === "NotAllowedError"
          ? "Přístup k fotoaparátu byl odepřen. Povolte prosím oprávnění v prohlížeči."
          : "Nelze přistupovat k fotoaparátu. Ujistěte se, že není používán jinou aplikací."
      );
      setIsScanning(false);
    }
  };

  // Stop video stream and clear frame loops
  const stopCamera = () => {
    setIsScanning(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Scan tick executed frame-by-frame
  const scanTick = () => {
    if (!videoRef.current || !canvasRef.current || isCheckingInRef.current || hasResultRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Guard against uninitialized dimensions or loading state (HAVE_CURRENT_DATA = 2)
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        try {
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data && code.data.trim()) {
            handleScannedCode(code.data.trim());
            return;
          }
        } catch (e) {
          console.error("QR decoding exception:", e);
        }
      }
    }

    if (isScanning && !hasResultRef.current && !isCheckingInRef.current) {
      animationFrameRef.current = requestAnimationFrame(() => scanTickRef.current());
    }
  };

  // Latest scanTick ref to bypass stale React closures inside requestAnimationFrame
  const scanTickRef = useRef(scanTick);
  scanTickRef.current = scanTick;

  // Start the scan loop when camera is active and video element is ready
  useEffect(() => {
    if (isScanning && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current;
        video.setAttribute("playsinline", "true");
        video.play().catch(e => console.log("Play interrupted:", e));
      }
      
      // Cancel any existing loop first
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Start loop
      animationFrameRef.current = requestAnimationFrame(() => scanTickRef.current());
    }
  }, [isScanning, streamRef.current]);

  // Verify the booking UUID via check-in API
  const handleScannedCode = async (uuid: string) => {
    if (isCheckingInRef.current || hasResultRef.current) return;
    isCheckingInRef.current = true;
    setIsCheckingIn(true);
    setScanResult(null);

    try {
      const res = await fetch("/api/device/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          deviceToken,
          qrPayload: uuid,
        }),
      });

      const data = await res.json();
      
      // Mark hasResultRef synchronously before updating state
      hasResultRef.current = true;

      if (data.status === "granted") {
        playBeep("success");
        triggerHaptic("success");
        setScanResult({
          status: "granted",
          message: "Přístup povolen!",
          userName: data.userName,
          resourceName: data.resourceName,
        });
      } else {
        playBeep("error");
        triggerHaptic("error");
        
        const reasonMsg = data.reason === "invalid_time"
          ? "Rezervace je mimo povolený časový úsek (vstup povolen max 15 min před/po)."
          : data.reason === "already_attended"
          ? "Tento lístek již byl naskenován (duplicate check-in)."
          : data.reason === "invalid_status"
          ? `Lístek nemá platný stav (${data.bookingStatus || "neznámý"}). Musí být ve stavu CONFIRMED.`
          : data.reason === "unknown_ticket"
          ? "Neznámý kód lístku (UUID neexistuje)."
          : data.reason === "expired_qr"
          ? "QR kód vypršel (expiroval). Požádejte uživatele o zobrazení aktuálního kódu na displeji."
          : data.reason === "static_qr_forbidden"
          ? "Použití statického snímku obrazovky je zakázáno. Kód musí být načten živě z aplikace."
          : data.reason === "invalid_signature"
          ? "Neplatný podpis QR kódu (detekován pokus o padělání nebo stará verze aplikace)."
          : `Přístup odepřen: ${data.reason || "neznámá chyba"}`;

        setScanResult({
          status: "denied",
          message: reasonMsg,
        });
      }
    } catch (err) {
      console.error(err);
      playBeep("error");
      triggerHaptic("error");
      
      hasResultRef.current = true;
      setScanResult({
        status: "error",
        message: "Chyba připojení k serveru.",
      });
    } finally {
      setIsCheckingIn(false);
      isCheckingInRef.current = false;
    }
  };

  const resumeScanning = () => {
    // Clear refs synchronously BEFORE state update and loop start
    hasResultRef.current = false;
    isCheckingInRef.current = false;

    setScanResult(null);
    setManualCode("");
    
    if (isScanning) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(() => scanTickRef.current());
    }
  };

  // Toggle sound muting and save to localStorage
  const toggleSound = () => {
    const nextState = !isSoundMuted;
    setIsSoundMuted(nextState);
    localStorage.setItem("resys_scanner_sound_muted", String(nextState));
  };

  // Handle uploaded image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCheckingIn(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          try {
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "attemptBoth",
            });
            if (code && code.data) {
              handleScannedCode(code.data.trim());
            } else {
              throw new Error("No QR code found in image.");
            }
          } catch (err) {
            setIsCheckingIn(false);
            playBeep("error");
            triggerHaptic("error");
            setScanResult({
              status: "error",
              message: "Chyba čtení: V obrázku nebyl nalezen QR kód."
            });
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Helper to retrieve active device details
  const activeDevice = devices.find(d => d.id === deviceId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col select-none overflow-hidden safe-area-insets bg-slate-50 dark:bg-[#07070F] text-slate-800 dark:text-slate-100">
      
      {/* Header Action Bar */}
      <header className="p-4 bg-white dark:bg-[#0D0D18] border-b border-slate-200 dark:border-white/[0.05] flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="text-left">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white truncate max-w-[180px]">
              {activeDevice?.name || "Odbavování"}
            </div>
            <div className="text-[8px] font-mono text-slate-400 dark:text-slate-500">{tenantName}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleSound}
            className="p-2.5 rounded-none bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.02] dark:hover:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all active:scale-90 cursor-pointer"
            title={isSoundMuted ? "Zapnout zvuk" : "Vypnout zvuk"}
          >
            {isSoundMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-none bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.02] dark:hover:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all active:scale-90 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      </header>

      {/* Camera Scan Window */}
      <main className="flex-1 relative flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-[#07070F]">
        
        {/* Hidden elements for capturing frames */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Video Feed Wrapper */}
        <div className="relative w-full max-w-sm aspect-square bg-slate-200 dark:bg-[#05050A] rounded-none overflow-hidden border border-slate-200 dark:border-white/10 shadow-xl flex items-center justify-center">
          
          {/* Camera Video tag */}
          {isScanning && (
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Loader during camera activation */}
          {!isScanning && !cameraError && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="text-tenant-primary animate-spin" size={28} />
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono tracking-widest uppercase">Spouštění kamery...</p>
            </div>
          )}

          {/* Camera access error */}
          {cameraError && (
            <div className="absolute inset-0 bg-white dark:bg-[#0D0D15] flex flex-col items-center justify-center text-center p-6 space-y-3 z-10">
               <AlertTriangle className="text-amber-500" size={32} />
              <h3 className="text-xs font-bold text-slate-950 dark:text-white uppercase">Chyba kamery</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-[220px]">{cameraError}</p>
              <button
                onClick={startCamera}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 border border-slate-200 dark:border-white/15 rounded-none text-[10px] font-bold uppercase active:scale-95 transition-all cursor-pointer text-slate-800 dark:text-white"
              >
                Zkusit znovu
              </button>
            </div>
          )}

          {/* Scanning Target Frame Finder (Overlayed) */}
          {isScanning && !scanResult && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="w-[70%] h-[70%] border-2 border-dashed border-tenant-primary/45 rounded-none relative">
                {/* Glowing corners */}
                <div className="absolute top-[-2px] left-[-2px] w-5 h-5 border-t-4 border-l-4 border-tenant-primary rounded-none" />
                <div className="absolute top-[-2px] right-[-2px] w-5 h-5 border-t-4 border-r-4 border-tenant-primary rounded-none" />
                <div className="absolute bottom-[-2px] left-[-2px] w-5 h-5 border-b-4 border-l-4 border-tenant-primary rounded-none" />
                <div className="absolute bottom-[-2px] right-[-2px] w-5 h-5 border-b-4 border-r-4 border-tenant-primary rounded-none" />
              </div>
            </div>
          )}

          {/* Loading check-in request indicator */}
          {isCheckingIn && (
            <div className="absolute inset-0 bg-white/75 dark:bg-[#05050A]/75 backdrop-blur-sm flex flex-col items-center justify-center z-20 space-y-2">
              <Loader2 className="text-tenant-primary animate-spin" size={28} />
              <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Ověřování lístku...</p>
            </div>
          )}
        </div>

        {/* Instruction subtitle */}
        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-6 tracking-wide max-w-[240px] leading-normal font-medium">
          {!scanResult ? "Namiřte fotoaparát na QR kód zákazníka." : "Zpracování skenu..."}
        </p>
      </main>

      {/* Fallback Utilities (Manual input / Upload image) */}
      <footer className="p-4 bg-white dark:bg-[#0D0D18] border-t border-slate-200 dark:border-white/[0.05] backdrop-blur-md flex flex-col gap-3">
        
        {/* Manual input drawer */}
        {manualInputOpen && (
          <div className="space-y-2 p-3.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-none animate-fade-in">
            <label className="block text-[8px] font-extrabold tracking-widest uppercase text-slate-400 dark:text-slate-500">Ruční zadání UUID lístku</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Např. e8b5c928-8687-4482-a0dc..."
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-none px-3 py-2 text-xs font-mono text-slate-800 dark:text-white outline-none focus:border-tenant-primary/50"
              />
              <button
                type="button"
                onClick={() => manualCode.trim() && handleScannedCode(manualCode.trim())}
                disabled={!manualCode.trim() || isCheckingIn}
                className="px-4 bg-tenant-gradient hover:opacity-90 active:scale-95 text-white font-bold rounded-none text-[10px] uppercase tracking-wider disabled:opacity-40 cursor-pointer"
              >
                Ověřit
              </button>
            </div>
            {bookings.length > 0 && (
              <div className="pt-1">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      setManualCode(e.target.value);
                      handleScannedCode(e.target.value);
                    }
                  }}
                  className="w-full text-[10px] py-2 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-none text-slate-500 dark:text-slate-400"
                  defaultValue=""
                >
                  <option value="" disabled>--- Rychlý výběr z existujících rezervací ---</option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id} className="bg-white dark:bg-slate-950">
                      {b.userName} - {b.resourceName} ({b.status === "CONFIRMED" ? "Potvrzeno" : "Odbaveno"})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Quick action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setManualInputOpen(!manualInputOpen)}
            className={`py-3 rounded-none border font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer ${
              manualInputOpen 
                ? "bg-slate-200 dark:bg-white/10 border-slate-300 dark:border-white/20 text-slate-800 dark:text-white" 
                : "bg-slate-50 dark:bg-white/[0.01] border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <Keyboard size={13} />
            Zadat ručně
          </button>

          <label className="py-3 bg-slate-50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-none font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer select-none">
            <Upload size={13} />
            Nahrát kód
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </footer>

      {/* Fullscreen Result Sheet Overlays */}
      {scanResult && (
        <div className="absolute inset-0 z-30 flex flex-col justify-end">
          <div 
            className="absolute inset-0 transition-opacity duration-300" 
            style={{
              backgroundColor: "rgba(3, 3, 7, 0.88)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)"
            }}
          />
          
          <div 
            className="relative w-full max-h-[70vh] border-t rounded-none p-8 pb-10 space-y-6 flex flex-col items-center text-center shadow-2xl transform translate-y-0 transition-transform duration-300"
            style={{
              backgroundColor: scanResult.status === "granted" ? "#047857" : "#be123c",
              borderColor: scanResult.status === "granted" ? "#10b981" : "#f43f5e",
              color: "#ffffff"
            }}
          >
            <div className="w-12 h-1 bg-white/30 rounded-none mb-1" />

            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                 {scanResult.status === "granted" ? (
                  <>
                    <div className="absolute inset-0 bg-white/20 rounded-none blur-xl animate-pulse" />
                    <Check className="text-white relative z-10 animate-[scaleIn_0.35s_cubic-bezier(0.16,1,0.3,1)]" size={56} />
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-white/20 rounded-none blur-xl animate-pulse" />
                    <X className="text-white relative z-10 animate-[scaleIn_0.35s_cubic-bezier(0.16,1,0.3,1)]" size={56} />
                  </>
                )}
              </div>

              <h2 className="text-2xl font-black uppercase tracking-widest text-white">
                {scanResult.status === "granted" ? "Vstup povolen" : "Vstup odepřen"}
              </h2>
            </div>

            <div className="space-y-4 w-full">
              {scanResult.status === "granted" ? (
                <div 
                  className="rounded-none p-5 space-y-3 shadow-sm w-full border text-center"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    borderColor: "rgba(255, 255, 255, 0.25)"
                  }}
                >
                  <div>
                    <span className="block text-[8px] uppercase tracking-widest font-extrabold opacity-90" style={{ color: "rgba(255, 255, 255, 0.85)" }}>Zákazník</span>
                    <span className="text-lg font-black text-white">{scanResult.userName}</span>
                  </div>
                  <div className="h-[1px] w-full" style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }} />
                  <div>
                    <span className="block text-[8px] uppercase tracking-widest font-extrabold opacity-90" style={{ color: "rgba(255, 255, 255, 0.85)" }}>Místo / Zdroj</span>
                    <span className="text-sm font-bold text-white">{scanResult.resourceName}</span>
                  </div>
                </div>
              ) : (
                <div 
                  className="rounded-none p-5 shadow-sm w-full border text-center"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    borderColor: "rgba(255, 255, 255, 0.25)"
                  }}
                >
                  <span className="block text-[8px] uppercase tracking-widest font-extrabold opacity-90 mb-1" style={{ color: "rgba(255, 255, 255, 0.85)" }}>Důvod zamítnutí</span>
                  <p className="text-xs font-bold leading-relaxed text-white">{scanResult.message}</p>
                </div>
              )}
            </div>

            <div className="w-full space-y-3 pt-2">
              <button
                type="button"
                onClick={resumeScanning}
                className="w-full py-4 rounded-none text-xs font-black uppercase tracking-widest cursor-pointer active:scale-98 transition-all hover:bg-slate-100 flex items-center justify-center bg-white shadow-lg shadow-black/10"
                style={{
                  color: scanResult.status === "granted" ? "#047857" : "#be123c",
                }}
              >
                <span className="flex items-center gap-2">
                  Skenovat další kód
                  <ArrowRight size={13} className="stroke-[2.5]" />
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(0.6); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

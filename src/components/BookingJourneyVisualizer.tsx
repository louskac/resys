"use client";

import React, { useState } from "react";
import { 
  Calendar, ShieldCheck, CreditCard, ArrowRight, 
  Check, Lock, Unlock, Loader2, RefreshCw, Smartphone
} from "lucide-react";

interface Step {
  title: string;
  shortLabel: string;
  icon: React.ReactNode;
}

export default function BookingJourneyVisualizer() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [ssoProcessing, setSsoProcessing] = useState(false);
  const [ssoCompleted, setSsoCompleted] = useState(false);
  const [checkoutProcessing, setCheckoutProcessing] = useState(false);
  const [checkoutCompleted, setCheckoutCompleted] = useState(false);
  const [iotProcessing, setIotProcessing] = useState(false);
  const [iotResult, setIotResult] = useState<"granted" | null>(null);

  const steps: Step[] = [
    { title: "Výběr termínu v kalendáři", shortLabel: "Kalendář", icon: <Calendar size={15} /> },
    { title: "Přihlášení na jedno kliknutí", shortLabel: "Přihlášení", icon: <ShieldCheck size={15} /> },
    { title: "Platba kartou a QR kód", shortLabel: "Platba & Kód", icon: <CreditCard size={15} /> },
    { title: "Automatické odemknutí vstupu", shortLabel: "Otevření dveří", icon: <Unlock size={15} /> }
  ];

  const resetSimulator = () => {
    setCurrentStep(1);
    setSelectedSlot(null);
    setSsoProcessing(false);
    setSsoCompleted(false);
    setCheckoutProcessing(false);
    setCheckoutCompleted(false);
    setIotProcessing(false);
    setIotResult(null);
  };

  const handleSelectSlot = (slot: string) => {
    setSelectedSlot(slot);
    setTimeout(() => {
      setCurrentStep(2);
    }, 600);
  };

  const handleSsoLogin = () => {
    setSsoProcessing(true);
    setTimeout(() => {
      setSsoProcessing(false);
      setSsoCompleted(true);
      setTimeout(() => {
        setCurrentStep(3);
      }, 800);
    }, 1200);
  };

  const handleCheckout = () => {
    setCheckoutProcessing(true);
    setTimeout(() => {
      setCheckoutProcessing(false);
      setCheckoutCompleted(true);
      setTimeout(() => {
        setCurrentStep(4);
      }, 850);
    }, 1500);
  };

  const handleScanGate = () => {
    setIotProcessing(true);
    setTimeout(() => {
      setIotProcessing(false);
      setIotResult("granted");
    }, 1400);
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-white/45 dark:bg-[#07070C]/35 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35]/30 p-6 md:p-8 rounded-none shadow-xl relative overflow-hidden text-left select-none">
      {/* Background radial highlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-tenant-primary/5 blur-[90px] pointer-events-none" />

      {/* Progress steps bar */}
      <div className="relative mb-10">
        <div className="absolute top-4.5 left-6 right-6 h-[2px] bg-slate-200 dark:bg-[#1F1F35] -z-10" />
        <div 
          className="absolute top-4.5 left-6 h-[2px] bg-tenant-gradient transition-all duration-500 -z-10"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 90}%` }}
        />
        
        <div className="grid grid-cols-4 gap-2">
          {steps.map((s, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < currentStep;
            const isActive = stepNum === currentStep;

            return (
              <button
                key={idx}
                disabled={stepNum > currentStep && !iotResult}
                onClick={() => setCurrentStep(stepNum)}
                className="flex flex-col items-center text-center gap-2 group cursor-pointer focus:outline-none"
              >
                <div 
                  className={`h-9 w-9 rounded-none flex items-center justify-center border-2 font-bold text-xs transition-all ${
                    isCompleted 
                      ? "bg-tenant-gradient border-transparent text-white shadow-md shadow-tenant-primary/10" 
                      : isActive 
                      ? "bg-white dark:bg-[#131322] border-tenant-primary text-tenant-primary shadow-sm"
                      : "bg-slate-50 dark:bg-[#07070C] border-slate-200 dark:border-[#1F1F35] text-slate-400"
                  }`}
                >
                  {isCompleted ? <Check size={16} /> : s.icon}
                </div>
                <span 
                  className={`text-[9.5px] font-bold uppercase tracking-wider hidden sm:block ${
                    isActive 
                      ? "text-tenant-primary font-black" 
                      : isCompleted || stepNum <= currentStep
                      ? "text-slate-700 dark:text-zinc-300"
                      : "text-slate-400 dark:text-zinc-550"
                  }`}
                >
                  {s.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main panel layout */}
      <div className="grid md:grid-cols-12 gap-8 items-center min-h-[320px]">
        {/* Left side: narrative */}
        <div className="md:col-span-5 space-y-5">
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <span className="inline-flex items-center pl-2 border-l-2 border-tenant-primary text-tenant-primary text-[10px] font-black uppercase tracking-wider select-none">Krok 1: Kalendář</span>
              <h3 className="text-xl font-extrabold text-foreground leading-tight">Zákazník si vybere čas v kalendáři</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                Zákazník si na vašem webu vybere volný termín (kurt, saunu nebo učebnu) na přehledné časové ose. Systém okamžitě spočítá cenu a zkontroluje volnou kapacitu.
              </p>
              <div className="p-3.5 bg-tenant-primary/5 rounded-none border border-tenant-primary/10">
                <span className="text-[9.5px] uppercase tracking-wider font-black text-tenant-primary block mb-1">Přínos pro provozovatele</span>
                <p className="text-[10.5px] text-slate-500 dark:text-zinc-450 leading-relaxed font-sans font-medium">
                  Rezervace probíhá plně digitálně na webu, bez nutnosti telefonování či e-mailové výměny.
                </p>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <span className="inline-flex items-center pl-2 border-l-2 border-tenant-primary text-tenant-primary text-[10px] font-black uppercase tracking-wider select-none">Krok 2: Ověření</span>
              <h3 className="text-xl font-extrabold text-foreground leading-tight">Bezpečné přihlášení na jedno kliknutí</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                Zákazník se přihlásí přes ověřeného partnera na jedno kliknutí. Nemusí si pamatovat žádné nové heslo a jeho identita je okamžitě bezpečně ověřena.
              </p>
              <div className="p-3.5 bg-tenant-primary/5 rounded-none border border-tenant-primary/10">
                <span className="text-[9.5px] uppercase tracking-wider font-black text-tenant-primary block mb-1">Bezpečný provoz</span>
                <p className="text-[10.5px] text-slate-500 dark:text-zinc-450 leading-relaxed font-sans font-medium">
                  Odpadají starosti s ukládáním hesel a osobních údajů zákazníků, vše je v plném souladu s GDPR.
                </p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <span className="inline-flex items-center pl-2 border-l-2 border-tenant-primary text-tenant-primary text-[10px] font-black uppercase tracking-wider select-none">Krok 3: Platba</span>
              <h3 className="text-xl font-extrabold text-foreground leading-tight">Online platba a vygenerování kódu</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                Platba probíhá bezpečně online platební kartou. Ihned po zaplacení zákazník obdrží do mobilu QR kód, který slouží jako elektronická vstupenka.
              </p>
              <div className="p-3.5 bg-tenant-primary/5 rounded-none border border-tenant-primary/10">
                <span className="text-[9.5px] uppercase tracking-wider font-black text-tenant-primary block mb-1">Automatizace plateb</span>
                <p className="text-[10.5px] text-slate-500 dark:text-zinc-450 leading-relaxed font-sans font-medium">
                  Platba je ihned připsána a spárována s rezervací. Neriskujete neobsazené sloty a nezaplacené rezervace.
                </p>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <span className="inline-flex items-center pl-2 border-l-2 border-tenant-primary text-tenant-primary text-[10px] font-black uppercase tracking-wider select-none">Krok 4: Vstup</span>
              <h3 className="text-xl font-extrabold text-foreground leading-tight">Odemknutí dveří či turniketu mobilem</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                U vstupu do areálu zákazník přiloží QR kód ze svého telefonu k čtečce. Systém bleskově ověří platnost jeho rezervace a automaticky mu odemkne dveře nebo uvolní turniket.
              </p>
              <div className="p-3.5 bg-tenant-primary/5 rounded-none border border-tenant-primary/10">
                <span className="text-[9.5px] uppercase tracking-wider font-black text-tenant-primary block mb-1">Úspora na provozu</span>
                <p className="text-[10.5px] text-slate-500 dark:text-zinc-450 leading-relaxed font-sans font-medium">
                  Váš areál může fungovat zcela bez recepce a personálu na místě. Náklady na provoz klesnou až o 75 %.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right side: interactive mockup sandbox */}
        <div className="md:col-span-7 flex justify-center w-full">
          <div className="w-full max-w-[340px] bg-slate-100/70 dark:bg-black/40 border border-slate-200/40 dark:border-[#1F1F35]/20 p-5 rounded-none relative">
            
            {/* Step 1 Interactive Widget */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-widest text-center">Vyberte volný slot</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button 
                    onClick={() => handleSelectSlot("08:00")}
                    className="p-3.5 rounded-none bg-white dark:bg-[#131322] border border-slate-200 dark:border-zinc-800 text-center font-bold text-slate-700 dark:text-zinc-350 hover:border-tenant-primary transition-all cursor-pointer"
                  >
                    08:00 - 09:00<br/>
                    <span className="text-[10px] font-normal text-slate-400">450 Kč</span>
                  </button>
                  <button 
                    disabled 
                    className="p-3.5 rounded-none bg-slate-250 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 text-center text-slate-400 cursor-not-allowed opacity-50 bg-stripes-past"
                  >
                    09:00 - 10:00<br/>
                    <span className="text-[10px]">Obsazeno</span>
                  </button>
                  <button 
                    onClick={() => handleSelectSlot("10:00")}
                    className="p-3.5 rounded-none bg-white dark:bg-[#131322] border border-slate-200 dark:border-zinc-800 text-center font-bold text-slate-700 dark:text-zinc-350 hover:border-tenant-primary transition-all cursor-pointer"
                  >
                    10:00 - 11:00<br/>
                    <span className="text-[10px] font-normal text-slate-400">450 Kč</span>
                  </button>
                  <button 
                    onClick={() => handleSelectSlot("11:00")}
                    className="p-3.5 rounded-none bg-white dark:bg-[#131322] border border-slate-200 dark:border-zinc-800 text-center font-bold text-slate-700 dark:text-zinc-350 hover:border-tenant-primary transition-all cursor-pointer"
                  >
                    11:00 - 12:00<br/>
                    <span className="text-[10px] font-normal text-slate-400">450 Kč</span>
                  </button>
                </div>
                {selectedSlot && (
                  <p className="text-[10px] text-center text-tenant-primary font-bold">
                    Zvolen slot {selectedSlot} ...
                  </p>
                )}
              </div>
            )}

            {/* Step 2 Interactive Widget */}
            {currentStep === 2 && (
              <div className="space-y-5 py-4 text-center animate-fade-in">
                <div className="mx-auto h-12 w-12 rounded-none bg-tenant-primary/10 text-tenant-primary flex items-center justify-center border border-tenant-primary/20">
                  <ShieldCheck size={26} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground">Přihlášení do systému</h4>
                  <p className="text-[10px] text-slate-400 max-w-[220px] mx-auto leading-relaxed">
                    Přihlásit se můžete bez hesla pomocí svého partnerského studentského či firemního účtu.
                  </p>
                </div>

                {ssoCompleted ? (
                  <div className="p-3 rounded-none bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-500 font-bold flex items-center justify-center gap-2">
                    <Check size={16} />
                    Uživatel úspěšně ověřen
                  </div>
                ) : (
                  <button
                    onClick={handleSsoLogin}
                    disabled={ssoProcessing}
                    className="w-full py-3 px-4 rounded-none text-xs font-bold text-white bg-tenant-gradient hover:opacity-95 disabled:opacity-80 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-tenant-primary/10"
                  >
                    {ssoProcessing ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Ověřování identity...
                      </>
                    ) : (
                      <>
                        Přihlásit se na jedno kliknutí
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Step 3 Interactive Widget */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-fade-in">
                {checkoutCompleted ? (
                  <div className="space-y-4 text-center py-2">
                    <div className="p-2.5 bg-white dark:bg-black/60 rounded-none border border-slate-200 dark:border-zinc-800 shadow-md inline-block">
                      {/* Simulated QR Code */}
                      <div className="h-32 w-32 bg-slate-950 p-2.5 rounded-none flex flex-col justify-between items-center relative overflow-hidden border border-slate-900">
                        {/* Glow */}
                        <div className="absolute inset-0 bg-tenant-primary/5" />
                        
                        <div className="flex justify-between w-full h-8">
                          <div className="h-6 w-6 border-4 border-white rounded-none" />
                          <div className="h-6 w-6 border-4 border-white rounded-none" />
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 w-16 h-12">
                          <div className="h-2 w-2 bg-white/70" />
                          <div className="h-2 w-2 bg-white/20" />
                          <div className="h-2 w-2 bg-white/80" />
                          <div className="h-2 w-2 bg-white/40" />
                          <div className="h-2 w-2 bg-white/30" />
                          <div className="h-2 w-2 bg-white/70" />
                          <div className="h-2 w-2 bg-white/10" />
                          <div className="h-2 w-2 bg-white/90" />
                        </div>
                        <div className="flex justify-between w-full h-8 items-end">
                          <div className="h-6 w-6 border-4 border-white rounded-none" />
                          <div className="h-3.5 w-3.5 bg-tenant-primary rounded-full animate-ping" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground">Platba dokončena! (450 Kč)</p>
                      <p className="text-[9.5px] text-slate-400">QR vstupenku máte v e-mailu i v mobilu.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-[#131322] border border-slate-200 dark:border-zinc-800 rounded-none p-4 space-y-3">
                      <div className="flex justify-between text-xs border-b border-slate-100 dark:border-[#1F1F35]/20 pb-2">
                        <span className="text-slate-455">Rezervovaný čas:</span>
                        <span className="font-bold text-slate-800 dark:text-zinc-200">{selectedSlot || "10:00"} - {(selectedSlot ? parseInt(selectedSlot) + 1 : 11)}:00</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-455">Celkem k úhradě:</span>
                        <span className="font-extrabold text-tenant-primary text-sm">450 Kč</span>
                      </div>
                    </div>

                    <button
                      onClick={handleCheckout}
                      disabled={checkoutProcessing}
                      className="w-full py-3 px-4 rounded-none text-xs font-bold text-white bg-tenant-gradient hover:opacity-95 disabled:opacity-80 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-tenant-primary/10"
                    >
                      {checkoutProcessing ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Zpracování platby online...
                        </>
                      ) : (
                        <>
                          Zaplatit 450 Kč & Generovat QR kód
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 4 Interactive Widget */}
            {currentStep === 4 && (
              <div className="space-y-5 py-2 text-center animate-fade-in">
                {iotResult === "granted" ? (
                  <div className="space-y-4 animate-scale-up">
                    <div className="mx-auto h-14 w-14 rounded-none bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/5">
                      <Unlock size={24} className="animate-bounce" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-extrabold text-emerald-500">DVEŘE ODEMČENY</h4>
                      <p className="text-[10px] text-slate-450 dark:text-zinc-400 max-w-[240px] mx-auto leading-normal">
                        Ověření proběhlo úspěšně. Zámek byl automaticky uvolněn na 5 sekund pro bezpečný průchod.
                      </p>
                    </div>
                    <button
                      onClick={resetSimulator}
                      className="mt-2 text-[10px] font-bold text-slate-400 hover:text-tenant-primary transition-colors flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                    >
                      <RefreshCw size={11} />
                      Vyzkoušet znovu od začátku
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5 py-4">
                    <div className="mx-auto h-12 w-12 rounded-none bg-slate-200 dark:bg-zinc-800 text-slate-500 flex items-center justify-center border border-slate-300 dark:border-zinc-700 relative">
                      <Lock size={20} />
                      <span className="absolute top-0 right-0 h-2 w-2 rounded-none bg-red-500" />
                    </div>
                    <div className="space-y-1 text-center">
                      <h4 className="text-xs font-bold text-slate-400">Naskenujte kód ze svého telefonu</h4>
                      <p className="text-[9.5px] text-slate-550 max-w-[200px] mx-auto leading-relaxed">
                        Nasimulujte příchod k budově a přiložení telefonu k naší nástěnné čtečce u vchodu.
                      </p>
                    </div>

                    <button
                      onClick={handleScanGate}
                      disabled={iotProcessing}
                      className="w-full py-3 px-4 rounded-none text-xs font-bold text-white bg-tenant-gradient hover:opacity-95 disabled:opacity-85 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-tenant-primary/10"
                    >
                      {iotProcessing ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Ověřování platnosti vstupu...
                        </>
                      ) : (
                        <>
                          Přiložit telefon ke čtečce
                          <Smartphone size={13} />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

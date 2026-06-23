"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, Check, MapPin, Calendar, Clock, 
  User, X, Lock, Play, ChevronRight, RotateCcw,
  Volume2, VolumeX
} from "lucide-react";
import AIStepper from "./AIStepper";
import AIWaveform from "./AIWaveform";
import AIInputBar from "./AIInputBar";

export default function AIShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null);

  // Simulation states
  // 0: Greeting
  // 1: Area (Plocha) selected
  // 2: Date (Datum) selected
  // 3: Time (Čas) selected
  // 4: Client (Klient) selected - Ready to Confirm
  // 5: Confirmation Modal Popup
  // 6: Booking Confirmed (Success Screen)
  const [simStep, setSimStep] = useState<number>(0);
  const [inputText, setInputText] = useState("");
  const [isTypingText, setIsTypingText] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);

  // parsed params
  const [parsedParams, setParsedParams] = useState({
    area: "",
    date: "",
    time: "",
    client: ""
  });



  const getAiResponseText = () => {
    switch (simStep) {
      case 0:
        return "Dobrý den! Jsem ReKeeper, váš inteligentní rezervační asistent. Jakou rezervaci dnes provedeme?";
      case 1:
        return `Rozumím. Vybral jsem hrací plochu: ${parsedParams.area}. Na jaký den to bude?`;
      case 2:
        return `Zítra ve středu máme volno. V jakou konkrétní hodinu by se vám to hodilo?`;
      case 3:
        return `Slot v čase ${parsedParams.time} je volný. Pro koho mám rezervaci založit? Napište jméno.`;
      case 4:
        return `Skvělé! Všechny údaje mám kompletní. Rezervace: ${parsedParams.area} na zítra (${parsedParams.date}) v čase ${parsedParams.time} pro klienta ${parsedParams.client}. Klikněte na zelené tlačítko POTVRDIT.`;
      case 5:
        return "Zobrazuji rekapitulaci k uložení do systému...";
      case 6:
        return "Rezervace byla úspěšně schválena a zapsána do PostgreSQL databáze!";
      default:
        return "Jak vám mohu pomoci?";
    }
  };

  // Typing simulation
  const runSimInput = (textToType: string, targetStep: number, finalParams: typeof parsedParams) => {
    if (isTypingText || isListening) return;
    setIsTypingText(true);
    setInputText("");

    let currentLength = 0;
    const typingInterval = setInterval(() => {
      currentLength++;
      setInputText(textToType.slice(0, currentLength));
      if (currentLength >= textToType.length) {
        clearInterval(typingInterval);
        setIsTypingText(false);

        // Waveform/thinking simulation
        setIsListening(true);
        setTimeout(() => {
          setIsListening(false);
          setInputText("");
          setSimStep(targetStep);
          setParsedParams(finalParams);
        }, 1100);
      }
    }, 30);
  };

  const triggerOneShotDemo = () => {
    resetSimulation();
    const finalParams = {
      area: "Tenisový kurt č. 3",
      date: "Středa",
      time: "15:00 - 16:00",
      client: "Jan Novák"
    };
    setTimeout(() => {
      runSimInput(
        "Chci rezervovat tenisový kurt 3 na zítra od 15:00 na jméno Jan Novák.",
        4,
        finalParams
      );
    }, 150);
  };

  const stepToArea = () => {
    runSimInput(
      "Rezervovat tenisový kurt.",
      1,
      { ...parsedParams, area: "Tenisový kurt č. 3" }
    );
  };

  const stepToDate = () => {
    runSimInput(
      "Zítra (Středa).",
      2,
      { ...parsedParams, area: "Tenisový kurt č. 3", date: "Středa" }
    );
  };

  const stepToTime = () => {
    runSimInput(
      "Od 15:00 na jednu hodinu.",
      3,
      { ...parsedParams, area: "Tenisový kurt č. 3", date: "Středa", time: "15:00 - 16:00" }
    );
  };

  const stepToClient = () => {
    runSimInput(
      "Na jméno Jan Novák.",
      4,
      { ...parsedParams, area: "Tenisový kurt č. 3", date: "Středa", time: "15:00 - 16:00", client: "Jan Novák" }
    );
  };

  const resetSimulation = () => {
    setSimStep(0);
    setInputText("");
    setIsListening(false);
    setIsTypingText(false);
    setParsedParams({
      area: "",
      date: "",
      time: "",
      client: ""
    });
  };

  const handleInputSubmit = () => {
    if (isTypingText || isListening) return;
    
    // If input is empty, trigger simulation for the current active step
    if (!inputText.trim()) {
      if (simStep === 0) stepToArea();
      else if (simStep === 1) stepToDate();
      else if (simStep === 2) stepToTime();
      else if (simStep === 3) stepToClient();
      return;
    }

    const text = inputText;
    setInputText("");
    setIsListening(true);

    setTimeout(() => {
      setIsListening(false);
      
      if (simStep === 0) {
        setParsedParams(prev => ({ ...prev, area: "Tenisový kurt č. 3" }));
        setSimStep(1);
      } else if (simStep === 1) {
        setParsedParams(prev => ({ ...prev, date: "Středa" }));
        setSimStep(2);
      } else if (simStep === 2) {
        setParsedParams(prev => ({ ...prev, time: "15:00 - 16:00" }));
        setSimStep(3);
      } else if (simStep === 3) {
        setParsedParams(prev => ({ ...prev, client: text }));
        setSimStep(4);
      } else if (simStep === 4) {
        setSimStep(5);
      }
    }, 1100);
  };

  return (
    <section 
      id="ai-assistant" 
      ref={sectionRef}
      style={{
        background: 'linear-gradient(135deg, #13002D 0%, #061035 25%, #001F30 50%, #180835 75%, #13002D 100%)',
        backgroundSize: '400% 400%',
      }}
      className="py-20 lg:py-28 animate-[section-gradient_15s_ease_infinite] border-b border-zinc-900/60 relative overflow-hidden transition-all duration-300 select-none text-white"
    >
      {/* Self-contained CSS animations for smooth floating, pulsing, and waveforms */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap');
        @keyframes section-gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float-eye {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-8px) scale(1.02); }
        }
        @keyframes pulse-halo {
          0%, 100% { transform: scale(0.95); opacity: 0.55; }
          50% { transform: scale(1.05); opacity: 0.75; }
        }
        @keyframes pulse-core {
          0%, 100% { transform: scale(0.9); opacity: 0.7; }
          50% { transform: scale(1.1); opacity: 0.95; }
        }
        @keyframes handwrite-float {
          0%, 100% { transform: translateY(0px) rotate(-6deg); }
          50% { transform: translateY(-8px) rotate(-2deg); }
        }
        .float-eye-element {
          animation: float-eye 5s ease-in-out infinite;
        }
        .pulse-halo-element {
          animation: pulse-halo 3s ease-in-out infinite;
        }
        .pulse-core-element {
          animation: pulse-core 2.5s ease-in-out infinite;
        }
      `}} />

      {/* Dynamic background lights (strictly matches app color palette) */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] pointer-events-none select-none -z-10 opacity-20">
        <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#7000FF] via-[#3B82F6] to-[#00F5FF] blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
      </div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] pointer-events-none select-none -z-10 opacity-15">
        <div className="w-full h-full rounded-full bg-gradient-to-br from-[#00F5FF] to-[#7000FF] blur-[130px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Column: Title & Interactive Controls */}
        <div className="lg:col-span-5 space-y-6 text-left relative z-20">
          
          <div className="flex items-center gap-4">
            {/* Authentic Liquid Energy Core representation scaled for showcase */}
            <div className="relative w-20 h-20 shrink-0 select-none">
              {/* Ambient background glow bleeding outside the border */}
              <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-[#7000FF] via-[#EC4899] to-[#00F5FF] opacity-35 blur-[12px] animate-pulse" />
              
              {/* The main core sphere */}
              <div className="relative w-full h-full rounded-full border border-white/20 dark:border-white/15 bg-slate-950/90 backdrop-blur-lg shadow-[0_10px_25px_rgba(112,0,255,0.35),inset_0_1.5px_3px_rgba(255,255,255,0.2)] overflow-hidden flex items-center justify-center">
                {/* Pulsing base glow */}
                <div className="absolute inset-0 rounded-full bg-purple-500/10 animate-pulse" />
                
                {/* Layer 1: Deep Purple Blob */}
                <div className="absolute h-[50px] w-[50px] rounded-full bg-[#7000FF] blur-[10px] opacity-85 animate-blob-orbit-1" />
                
                {/* Layer 2: Neon Cyan Blob */}
                <div className="absolute h-[42px] w-[42px] rounded-full bg-[#00F5FF] blur-[9px] opacity-75 animate-blob-orbit-2 mix-blend-screen" />
                
                {/* Layer 3: Hot Pink Blob */}
                <div className="absolute h-[46px] w-[46px] rounded-full bg-[#EC4899] blur-[10px] opacity-70 animate-blob-orbit-3 mix-blend-screen" />
                
                {/* Layer 4: Royal Blue Blob */}
                <div className="absolute h-[52px] w-[52px] rounded-full bg-[#3B82F6] blur-[11px] opacity-60 animate-blob-orbit-1 mix-blend-screen" style={{ animationDirection: 'reverse', animationDuration: '9s' }} />
                
                {/* Layer 5: Bright Core (Siri style neon focus) */}
                <div className="absolute h-[20px] w-[20px] rounded-full bg-cyan-100 blur-[4px] opacity-60 animate-pulse" style={{ animationDuration: '1.5s' }} />
                
                {/* Glass reflection overlay */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7000FF]/15 border border-[#7000FF]/30 text-[#A78BFA] text-[10px] font-black uppercase tracking-widest shadow-xs select-none">
                <Sparkles size={11} className="text-[#A78BFA] animate-spin" style={{ animationDuration: '3s' }} />
                AI Assistant Core
              </div>
              <h3 className="text-sm font-extrabold text-zinc-400">ReKeeper AI Copilot</h3>
            </div>
          </div>

          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Budoucnost rezervací s <br />
            <span className="text-[#A78BFA]">
              autonomním AI agentem.
            </span>
          </h2>
          
          <p className="text-sm text-zinc-400 leading-relaxed">
            ReKeeper je vestavěný neurální asistent, který plně automatizuje rezervace a konfiguraci areálu. Oproti běžným chatovacím oknům je napojen na jádro plánovacího systému – rozumí časům, kapacitám, slevovým limitům a v reálném čase hlídá konflikty na kalendářním gridu.
          </p>
 
          {/* Interactive controls */}
          <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4 shadow-none">
            <h3 className="text-xs font-bold text-[#A78BFA] uppercase tracking-wider">Spustit interaktivní simulaci:</h3>
            
            <div className="flex flex-col gap-3.5">
              {/* Option A: One-Shot */}
              <button 
                onClick={triggerOneShotDemo}
                disabled={isTypingText || isListening}
                className="w-full text-left p-3.5 bg-[#7000FF]/5 hover:bg-[#7000FF]/15 border border-[#7000FF]/20 hover:border-[#7000FF]/40 rounded-xl transition-all cursor-pointer group flex items-start gap-3 disabled:opacity-55 disabled:cursor-not-allowed"
              >
                <div className="h-6 w-6 rounded-lg bg-[#7000FF]/20 flex items-center justify-center shrink-0 text-[#C084FC] group-hover:scale-105 transition-transform mt-0.5">
                  <Play size={12} fill="currentColor" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    Blesková rezervace (One-Shot)
                  </div>
                  <p className="text-[10px] text-zinc-450">AI naparsuje celou větu naráz a okamžitě vyplní všechny 4 kroky rezervace.</p>
                </div>
              </button>
 
              {/* Option B: Step by Step Flow */}
              <div className="p-4 bg-black/45 border border-zinc-800/80 rounded-2xl space-y-3.5">
                <div className="text-xs font-bold text-white flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-[#A78BFA] uppercase tracking-wider text-[10px]">Postupná konverzace (Krok za krokem)</span>
                  <button 
                    onClick={resetSimulation}
                    className="text-[10px] font-bold text-zinc-400 hover:text-rose-455 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw size={11} /> Reset
                  </button>
                </div>
                
                <div className="space-y-3">
                  {/* Step 1: Sportoviště */}
                  <div 
                    onClick={() => { if (!isTypingText && !isListening && simStep === 0) stepToArea(); }}
                    className={`flex items-start gap-3.5 p-2.5 rounded-xl border transition-all select-none ${
                      simStep === 0 
                        ? "border-[#00F5FF]/30 bg-[#00F5FF]/5 cursor-pointer hover:bg-[#00F5FF]/10 hover:border-[#00F5FF]/50" 
                        : simStep > 0
                          ? "border-[#7000FF]/20 bg-[#7000FF]/2 opacity-95"
                          : "border-transparent bg-transparent opacity-40 pointer-events-none"
                    }`}
                  >
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                      simStep === 0
                        ? "border-[#00F5FF] bg-[#00F5FF]/15 text-[#00F5FF] shadow-[0_0_10px_rgba(0,245,255,0.3)] animate-pulse"
                        : simStep > 0
                          ? "border-purple-550 bg-[#7000FF]/25 text-purple-300"
                          : "border-zinc-800 bg-zinc-950 text-zinc-650"
                    }`}>
                      <MapPin size={15} />
                    </div>
                    <div className="space-y-0.5 text-left">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        1. Výběr sportoviště
                        {simStep > 0 && <span className="text-[9px] text-[#A78BFA] font-medium">({parsedParams.area})</span>}
                      </div>
                      <p className="text-[9.5px] text-zinc-455 leading-relaxed">
                        Vyhledá strukturu areálu a zvolí cílovou hrací plochu či sektor.
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Datum */}
                  <div 
                    onClick={() => { if (!isTypingText && !isListening && simStep === 1) stepToDate(); }}
                    className={`flex items-start gap-3.5 p-2.5 rounded-xl border transition-all select-none ${
                      simStep === 1 
                        ? "border-[#00F5FF]/30 bg-[#00F5FF]/5 cursor-pointer hover:bg-[#00F5FF]/10 hover:border-[#00F5FF]/50" 
                        : simStep > 1
                          ? "border-[#7000FF]/20 bg-[#7000FF]/2 opacity-95"
                          : "border-transparent bg-transparent opacity-40 pointer-events-none"
                    }`}
                  >
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                      simStep === 1
                        ? "border-[#00F5FF] bg-[#00F5FF]/15 text-[#00F5FF] shadow-[0_0_10px_rgba(0,245,255,0.3)] animate-pulse"
                        : simStep > 1
                          ? "border-purple-555 bg-[#7000FF]/25 text-purple-300"
                          : "border-zinc-800 bg-zinc-950 text-zinc-650"
                    }`}>
                      <Calendar size={15} />
                    </div>
                    <div className="space-y-0.5 text-left">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        2. Volba data
                        {simStep > 1 && <span className="text-[9px] text-[#A78BFA] font-medium">({parsedParams.date})</span>}
                      </div>
                      <p className="text-[9.5px] text-zinc-455 leading-relaxed">
                        Vyhodnotí otevírací dobu, státní svátky a prázdninové provozy.
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Čas */}
                  <div 
                    onClick={() => { if (!isTypingText && !isListening && simStep === 2) stepToTime(); }}
                    className={`flex items-start gap-3.5 p-2.5 rounded-xl border transition-all select-none ${
                      simStep === 2 
                        ? "border-[#00F5FF]/30 bg-[#00F5FF]/5 cursor-pointer hover:bg-[#00F5FF]/10 hover:border-[#00F5FF]/50" 
                        : simStep > 2
                          ? "border-[#7000FF]/20 bg-[#7000FF]/2 opacity-95"
                          : "border-transparent bg-transparent opacity-40 pointer-events-none"
                    }`}
                  >
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                      simStep === 2
                        ? "border-[#00F5FF] bg-[#00F5FF]/15 text-[#00F5FF] shadow-[0_0_10px_rgba(0,245,255,0.3)] animate-pulse"
                        : simStep > 2
                          ? "border-purple-550 bg-[#7000FF]/25 text-purple-300"
                          : "border-zinc-800 bg-zinc-950 text-zinc-650"
                    }`}>
                      <Clock size={15} />
                    </div>
                    <div className="space-y-0.5 text-left">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        3. Časový slot
                        {simStep > 2 && <span className="text-[9px] text-[#A78BFA] font-medium">({parsedParams.time})</span>}
                      </div>
                      <p className="text-[9.5px] text-zinc-455 leading-relaxed">
                        Ověří kolize v kalendáři, technické breaky a úklidové časy.
                      </p>
                    </div>
                  </div>

                  {/* Step 4: Klient */}
                  <div 
                    onClick={() => { if (!isTypingText && !isListening && simStep === 3) stepToClient(); }}
                    className={`flex items-start gap-3.5 p-2.5 rounded-xl border transition-all select-none ${
                      simStep === 3 
                        ? "border-[#00F5FF]/30 bg-[#00F5FF]/5 cursor-pointer hover:bg-[#00F5FF]/10 hover:border-[#00F5FF]/50" 
                        : simStep > 3
                          ? "border-[#7000FF]/20 bg-[#7000FF]/2 opacity-95"
                          : "border-transparent bg-transparent opacity-40 pointer-events-none"
                    }`}
                  >
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                      simStep === 3
                        ? "border-[#00F5FF] bg-[#00F5FF]/15 text-[#00F5FF] shadow-[0_0_10px_rgba(0,245,255,0.3)] animate-pulse"
                        : simStep > 3
                          ? "border-purple-555 bg-[#7000FF]/25 text-purple-300"
                          : "border-zinc-800 bg-zinc-950 text-zinc-650"
                    }`}>
                      <User size={15} />
                    </div>
                    <div className="space-y-0.5 text-left">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        4. Identifikace
                        {simStep > 3 && <span className="text-[9px] text-[#A78BFA] font-medium">({parsedParams.client})</span>}
                      </div>
                      <p className="text-[9.5px] text-zinc-455 leading-relaxed">
                        Vyhledá profil klienta a prověří kredity či permanentky.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Calendar Grid overlay with real floating Assistant Widget */}
        <div className="lg:col-span-7 flex justify-center relative">
          
          {/* Calendar grid mock backdrop */}
          <div className="w-full max-w-lg aspect-[4/3.1] bg-[#07070F] rounded-[32px] border border-zinc-800/80 p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden select-none">
            
            <div 
              className="absolute inset-0 opacity-10 pointer-events-none text-zinc-800" 
              style={{
                backgroundImage: `
                  linear-gradient(to right, currentColor 1px, transparent 1px),
                  linear-gradient(to bottom, currentColor 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px'
              }}
            />
            
            {/* Header info */}
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Rezervační Dashboard - Středa</span>
              <span className="text-[9px] font-mono text-zinc-500">ID: zskomenskeho</span>
            </div>
 
            {/* Grid display representing scheduler */}
            <div className="flex-1 grid grid-cols-12 gap-2 mt-4 text-left relative">
              
              {/* Left hours axis */}
              <div className="col-span-2 flex flex-col justify-between text-[9px] font-bold text-zinc-500 font-mono pr-2 border-r border-zinc-900 py-1">
                <span>13:00</span>
                <span>14:00</span>
                <span>15:00</span>
                <span>16:00</span>
                <span>17:00</span>
              </div>
 
              {/* Resources columns */}
              <div className="col-span-10 grid grid-cols-3 gap-2 relative">
                
                {/* Kurt 1 Column */}
                <div className="flex flex-col border-r border-zinc-900/60 pr-1">
                  <span className="text-[9px] font-bold text-zinc-400 text-center mb-2 block truncate">Badminton 1</span>
                  <div className="flex-1 bg-white/[0.01] rounded-lg border border-dashed border-zinc-800/40" />
                </div>
 
                {/* Kurt 2 Column */}
                <div className="flex flex-col border-r border-zinc-900/60 pr-1">
                  <span className="text-[9px] font-bold text-zinc-400 text-center mb-2 block truncate">Badminton 2</span>
                  <div className="flex-1 bg-white/[0.01] rounded-lg border border-dashed border-zinc-800/40 relative">
                    {/* Fixed occupied block */}
                    <div className="absolute top-[10%] left-0 right-0 h-[35%] bg-zinc-800/40 border border-zinc-700/30 rounded-md p-1 flex flex-col justify-between">
                      <span className="text-[7.5px] font-bold text-zinc-400 leading-none">Obsazeno</span>
                    </div>
                  </div>
                </div>
 
                {/* Kurt 3 Column (Tenis / target resource) */}
                <div className="flex flex-col relative">
                  <span className={`text-[9px] font-bold text-center mb-2 block truncate transition-colors duration-300 ${simStep >= 1 ? "text-[#7000FF]" : "text-zinc-400"}`}>
                    Kurt 3 (Tenis)
                  </span>
                  
                  <div className={`flex-1 rounded-lg border border-dashed transition-all duration-300 relative ${simStep >= 1 ? "bg-purple-950/5 border-[#7000FF]/25" : "bg-white/[0.01] border-zinc-800/40"}`}>
                    
                    {/* Simulated live drawing of reservation block on scheduler */}
                    {simStep >= 3 && (
                      <div className={`absolute top-[45%] left-0 right-0 h-[25%] rounded-md p-1.5 flex flex-col justify-between transition-all duration-500 ${
                        simStep === 6 
                          ? "bg-gradient-to-r from-[#7000FF]/35 to-indigo-650/45 border-[#7000FF]/70 shadow-[0_0_15px_rgba(112,0,255,0.25)] animate-pulse" 
                          : "border-dashed border-[#00F5FF] bg-[#00F5FF]/10"
                      } border`}>
                        <div className="flex justify-between items-start">
                          <span className={`text-[8px] font-bold leading-none ${simStep === 6 ? "text-white" : "text-[#00F5FF]"}`}>
                            {parsedParams.client ? "Rezervace" : "Zpracovávám..."}
                          </span>
                          {simStep === 6 ? (
                            <Lock size={8} className="text-purple-350" />
                          ) : (
                            <span className="h-1 w-1 rounded-full bg-[#00F5FF] animate-ping" />
                          )}
                        </div>
                        <span className="text-[8px] text-zinc-200 font-extrabold truncate">
                          {parsedParams.client || "..."}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
 
              </div>
 
            </div>
 
            {/* Bottom status */}
            <div className="flex justify-between items-center text-[8.5px] text-zinc-550 border-t border-zinc-900 pt-2.5 font-sans">
              <span>Status: Synchronizováno</span>
              <span className="flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-emerald-500" />
                IoT API Hub Online
              </span>
            </div>
 
            {/* Nova Rezervace Confirmation Modal Popup */}
            {simStep === 5 && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-40 animate-fadeIn select-none">
                <div className="bg-white text-black rounded-3xl w-full max-w-[360px] p-5 shadow-2xl border border-zinc-200 animate-scaleUp">
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 leading-tight">Nová rezervace</h4>
                      <p className="text-[10px] text-slate-500 font-medium">Potvrďte termín nebo upravte parametry níže:</p>
                    </div>
                    <button 
                      onClick={() => setSimStep(4)} 
                      className="text-slate-455 hover:text-slate-700 transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </div>
 
                  <div className="mt-4 space-y-3.5 text-left">
                    <div className="space-y-1">
                      <span className="text-[8px] font-extrabold text-[#7000FF] tracking-wider uppercase block">VYBERTE PLOCHU/SEKTOR</span>
                      <div className="text-[11px] font-bold text-slate-800 border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                        {parsedParams.area}
                      </div>
                    </div>
 
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[8px] font-extrabold text-slate-400 tracking-wider uppercase block">DEN</span>
                        <div className="text-[11px] font-bold text-slate-800 border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                          {parsedParams.date}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-extrabold text-slate-400 tracking-wider uppercase block">ZAČÁTEK</span>
                        <div className="text-[11px] font-bold text-slate-800 border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                          15:00
                        </div>
                      </div>
                    </div>
 
                    <div className="space-y-1">
                      <span className="text-[8px] font-extrabold text-slate-400 tracking-wider uppercase block">DOBA TRVÁNÍ</span>
                      <div className="text-[11px] font-bold text-slate-800 border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                        1 hodina
                      </div>
                    </div>
 
                    {/* Price banner */}
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-150 flex justify-between items-center text-xs">
                      <span className="font-semibold text-emerald-800">Cena pronájmu:</span>
                      <span className="font-extrabold text-emerald-700">250 Kč</span>
                    </div>
 
                    <div className="grid grid-cols-2 gap-2.5 pt-2">
                      <button 
                        onClick={() => setSimStep(4)} 
                        className="py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer text-center"
                      >
                        Zrušit
                      </button>
                      <button 
                        onClick={() => setSimStep(6)} 
                        className="py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#7000FF] to-[#8B5CF6] hover:opacity-95 active:scale-95 transition-all cursor-pointer text-center shadow-md shadow-purple-500/20"
                      >
                        Potvrdit rezervaci
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Success Booking Screen */}
            {simStep === 6 && (
              <div className="absolute inset-0 bg-[#07070F]/90 backdrop-blur-md flex items-center justify-center p-5 z-40 animate-fadeIn">
                <div className="text-center space-y-4 max-w-sm">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(16,185,129,0.35)] scale-110">
                    <Check size={24} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">Rezervace úspěšně zapsána!</h4>
                    <p className="text-[10px] text-zinc-400">ReKeeper dokončil automatické workflow na pozadí:</p>
                  </div>
 
                  <div className="bg-black/40 border border-zinc-800/80 rounded-2xl p-3.5 text-[10px] text-left space-y-1.5 text-zinc-300 font-mono">
                    <div className="flex items-center gap-2"><Check size={10} className="text-emerald-450" /> Vytvořeno v PostgreSQL (locks OK)</div>
                    <div className="flex items-center gap-2"><Check size={10} className="text-emerald-455" /> Odeslána SMS + Mail klientovi</div>
                    <div className="flex items-center gap-2"><Check size={10} className="text-emerald-450" /> Vygenerován PIN pro IoT turniket</div>
                    <div className="flex items-center gap-2"><Check size={10} className="text-emerald-455" /> Zaúčtováno v ERP modulu</div>
                  </div>
 
                  <button 
                    onClick={resetSimulation} 
                    className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Vyzkoušet znovu
                  </button>
                </div>
              </div>
            )}
 
          </div>
 
          {/* Floating Assistant Widget (Overlaying Scheduler Grid) */}
          <div 
            className="absolute bottom-6 right-6 w-[88%] max-w-[390px] animated-glowing-border p-5 pt-14 pb-5 flex flex-col gap-4 z-30 transition-all duration-300 shadow-2xl font-sans"
          >
            {/* Ambient Breathing Blurs Inside Widget */}
            <div className="absolute inset-0 rounded-[28px] overflow-hidden pointer-events-none z-0">
              <div className="absolute top-[-80px] left-[-60px] w-[200px] h-[200px] rounded-full bg-[#7000FF] opacity-[0.05] dark:opacity-[0.08] blur-[60px] animate-blob-orbit-1" />
              <div className="absolute bottom-[-100px] right-[-50px] w-[180px] h-[180px] rounded-full bg-[#00F5FF] opacity-[0.04] dark:opacity-[0.07] blur-[55px] animate-blob-orbit-2" />
              <div className="absolute top-[30%] left-[35%] w-[160px] h-[160px] rounded-full bg-[#EC4899] opacity-[0.03] dark:opacity-[0.05] blur-[50px] animate-blob-orbit-3" />
            </div>
 
            {/* Stepper circles row attached half-above the top edge */}
            <AIStepper
              steps={[
                {
                  id: "area",
                  label: "Plocha",
                  icon: <MapPin size={18} />,
                  isCompleted: simStep >= 1,
                  tooltip: parsedParams.area ? `Plocha: ${parsedParams.area}` : "Plocha",
                  animationDelay: "0ms"
                },
                {
                  id: "date",
                  label: "Datum",
                  icon: <Calendar size={18} />,
                  isCompleted: simStep >= 2,
                  tooltip: parsedParams.date ? `Datum: ${parsedParams.date}` : "Datum",
                  animationDelay: "75ms"
                },
                {
                  id: "time",
                  label: "Čas",
                  icon: <Clock size={18} />,
                  isCompleted: simStep >= 3,
                  tooltip: parsedParams.time ? `Čas: ${parsedParams.time}` : "Čas",
                  animationDelay: "150ms"
                },
                {
                  id: "client",
                  label: "Klient",
                  icon: <User size={18} />,
                  isCompleted: simStep >= 4,
                  tooltip: parsedParams.client ? `Klient: ${parsedParams.client}` : "Klient",
                  animationDelay: "225ms"
                }
              ]}
              onStepClick={(index) => {
                if (isTypingText || isListening) return;
                if (index === 0) stepToArea();
                else if (index === 1) stepToDate();
                else if (index === 2) stepToTime();
                else if (index === 3) stepToClient();
              }}
            />
 
            {/* Header info bar */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5 z-10 select-none">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-450 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.7)]" />
                <span className="text-[10px] tracking-widest uppercase font-extrabold text-purple-400">
                  {isListening ? "ReKeeper poslouchá..." : isTypingText ? "Zpracovávám..." : "ReKeeper: Timekeeper"}
                </span>
              </div>
 
              {/* Tiny summary line of completed steps */}
              <div className="flex gap-1.5 text-[9px] font-bold text-zinc-400 tracking-wide max-w-[45%] truncate">
                {parsedParams.area && <span className="text-blue-400 truncate">● {parsedParams.area}</span>}
                {parsedParams.date && <span className="text-purple-400 truncate">● {parsedParams.date}</span>}
                {parsedParams.time && <span className="text-pink-400 truncate">● {parsedParams.time}</span>}
              </div>
 
              <div className="flex items-center gap-1.5 z-10">
                <button 
                  onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isVoiceEnabled ? "border-purple-500/30 text-purple-400 bg-purple-500/5 hover:bg-purple-500/10" : "border-white/5 text-zinc-550 hover:text-white"
                  }`}
                  title={isVoiceEnabled ? "Mluvení zapnuto" : "Mluvení vypnuto"}
                >
                  {isVoiceEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                </button>
                <button 
                  onClick={resetSimulation}
                  className="p-1.5 rounded-lg border border-white/5 text-zinc-500 hover:text-rose-400 hover:border-rose-500/35 hover:bg-rose-500/5 transition-all cursor-pointer"
                  title="Restartovat ReKeepera"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>
 
            {/* Waveform animation or bubble */}
            {isListening ? (
              <AIWaveform label="ReKeeper poslouchá..." className="py-2.5 min-h-[46px]" />
            ) : (
              <div className="text-[11.5px] text-zinc-200 italic min-h-[38px] flex items-center bg-slate-950/40 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] select-none leading-relaxed break-words z-10 text-left">
                {getAiResponseText()}
              </div>
            )}
 
            {/* Input bar */}
            <AIInputBar
              inputText={inputText}
              onChangeInput={(val) => {
                if (!isTypingText && !isListening) {
                  setInputText(val);
                }
              }}
              onSubmit={handleInputSubmit}
              onMicClick={() => {}}
              onConfirm={() => setSimStep(5)}
              isListening={isListening}
              isLoading={isTypingText}
              isSpeechSupported={true}
              isReadyToConfirm={simStep === 4}
              disabled={simStep >= 5}
            />

            {/* Cartoony handwritten pointer arrow to try the assistant */}
            <div className="absolute right-[-125px] bottom-[25px] hidden md:flex flex-col items-center gap-1.5 pointer-events-none select-none z-40 animate-[handwrite-float_3.5s_ease-in-out_infinite]">
              <span className="text-zinc-200 text-sm font-extrabold tracking-wide whitespace-nowrap rotate-[8deg]" style={{ fontFamily: '"Caveat", cursive' }}>
                Vyzkoušejte mě!
              </span>
              <svg width="75" height="60" viewBox="0 0 75 60" fill="none" className="rotate-[10deg] text-[#A78BFA] drop-shadow-[0_2px_8px_rgba(167,139,250,0.45)]">
                {/* Curved Arrow Body from right to left */}
                <path d="M65,10 C50,5 25,15 15,38" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" fill="none" />
                {/* Arrow Head pointing to bottom-left */}
                <path d="M26,34 L15,38 L18,27" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
 
          </div>
 
        </div>
 
              </div>
 
            </section>
  );
}

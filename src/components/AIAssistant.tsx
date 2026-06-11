"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Send, Settings, X, Bot, User, Sparkles, Volume2, VolumeX, Key, Check, AlertTriangle, Calendar, Clock, MapPin, ChevronRight } from "lucide-react";
import { useSearchParams } from "next/navigation";

interface AIAssistantProps {
  tenantId: string;
  resources: { id: string; name: string; parentId?: string | null }[];
  initialEvents: any[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: any[];
}

interface ConsoleState {
  resourceId: string | null;
  resourceName: string | null;
  dayIndex: number | null;
  startHour: number | null;
  duration: number | null;
  userName: string | null;
  userEmail: string | null;
  hasConflict: boolean;
  conflictMessage: string | null;
  suggestedAlternativeTime: number | null;
  suggestedAlternativeResourceId: string | null;
}

export default function AIAssistant({ tenantId, resources, initialEvents }: AIAssistantProps) {
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userApiKey, setUserApiKey] = useState("");
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState(true);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [hasSavedKey, setHasSavedKey] = useState(false);
  
  // Decoupled Console State inside the Dynamic Island HUD
  const [consoleState, setConsoleState] = useState<ConsoleState>({
    resourceId: null,
    resourceName: null,
    dayIndex: null,
    startHour: null,
    duration: null,
    userName: null,
    userEmail: null,
    hasConflict: false,
    conflictMessage: null,
    suggestedAlternativeTime: null,
    suggestedAlternativeResourceId: null
  });

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Dobrý den! Jsem váš inteligentní asistent. Řekněte mi například: 'Chci tenis na středu ve 4 odpoledne na jméno Jakub'."
    }
  ]);

  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition & Local Storage Key
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSpeechSupported(true);
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "cs-CZ";
        
        rec.onstart = () => {
          setIsListening(true);
        };
        
        rec.onend = () => {
          setIsListening(false);
        };
        
        rec.onerror = () => {
          setIsListening(false);
        };
        
        rec.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          if (text) {
            setInputText(text);
            handleSend(text);
          }
        };
        recognitionRef.current = rec;
      }

      const key = localStorage.getItem("resys_gemini_api_key");
      if (key) {
        setUserApiKey(key);
        setHasSavedKey(true);
      }
    }
  }, []);

  // Vocal readback output
  const speakText = (text: string) => {
    if (!isVoiceOutputEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[\*\#\-\`\_]/g, "").replace(/\[.*?\]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const isCzech = /[áčďéěíňóřšťúůýž]/i.test(cleanText) || cleanText.toLowerCase().includes("rezerv") || cleanText.toLowerCase().includes("kurt");
    utterance.lang = isCzech ? "cs-CZ" : "en-US";
    window.speechSynthesis.speak(utterance);
  };

  const handleMicClick = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      recognitionRef.current.start();
    }
  };

  const saveApiKey = () => {
    if (userApiKey.trim()) {
      localStorage.setItem("resys_gemini_api_key", userApiKey.trim());
      setHasSavedKey(true);
      setShowSettings(false);
    } else {
      localStorage.removeItem("resys_gemini_api_key");
      setHasSavedKey(false);
    }
  };

  const clearApiKey = () => {
    localStorage.removeItem("resys_gemini_api_key");
    setUserApiKey("");
    setHasSavedKey(false);
  };

  // Sends prompt requests to backend assistant API route
  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    setInputText("");
    const newMessages = [...messages, { role: "user", content: text } as Message];
    setMessages(newMessages);
    setIsLoading(true);

    const activeDateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const activeResSlug = searchParams.get("resource") || "";
    const activeRes = resources.find(r => r.id === activeResSlug || r.name.toLowerCase().replace(/\s+/g, "-").includes(activeResSlug.split("-")[0]));

    const currentBookingsContext = initialEvents
      .filter(e => e.isOccupied)
      .map(e => ({
        resourceId: e.resourceId,
        resourceName: e.resourceName || resources.find(r => r.id === e.resourceId)?.name || "Plocha",
        dayIndex: e.dayIndex,
        startHour: e.startHour,
        durationHours: e.durationHours,
        name: e.name
      }));

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      if (userApiKey.trim()) {
        headers["x-gemini-api-key"] = userApiKey.trim();
      }

      const response = await fetch("/api/assistant", {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: newMessages,
          resources,
          existingBookings: currentBookingsContext,
          currentDate: new Date().toISOString(),
          weekStart: getMondayOfDate(new Date(activeDateStr)).toISOString().split("T")[0],
          activeResourceId: activeRes?.id || ""
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to call AI endpoint");
      }

      const data = await response.json();
      
      const replyMessage: Message = {
        role: "assistant",
        content: data.reply || "Rozumím. Upravuji stav rezervace na obrazovce.",
        toolCalls: data.toolCalls
      };

      setMessages(prev => [...prev, replyMessage]);

      if (replyMessage.content) {
        speakText(replyMessage.content);
      }

      if (data.toolCalls && data.toolCalls.length > 0) {
        data.toolCalls.forEach((call: any) => {
          executeToolCall(call);
        });
      }

    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `Omlouvám se, došlo k chybě: ${err.message || "Nepodařilo se navázat spojení."}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const executeToolCall = (call: any) => {
    const { name, args } = call;
    console.log("HUD executing tool call:", name, args);

    switch (name) {
      case "navigate_date":
        if (args.date) {
          window.dispatchEvent(new CustomEvent("assistant-navigate-date", { detail: { date: args.date } }));
        }
        break;
      case "select_resource":
        if (args.resourceId) {
          window.dispatchEvent(new CustomEvent("assistant-select-resource", { detail: { resourceId: args.resourceId } }));
          setConsoleState(prev => ({
            ...prev,
            resourceId: args.resourceId,
            resourceName: resources.find(r => r.id === args.resourceId)?.name || null
          }));
        }
        break;
      case "highlight_slot":
        window.dispatchEvent(
          new CustomEvent("assistant-highlight-slot", {
            detail: {
              resourceId: args.resourceId,
              dayIndex: args.dayIndex,
              startHour: args.startHour,
              duration: args.duration
            }
          })
        );
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("assistant-highlight-slot", { detail: null }));
        }, 7000);
        break;
      case "report_booking_status":
        const matchedResName = resources.find(r => r.id === args.resourceId)?.name || null;
        setConsoleState({
          resourceId: args.resourceId || null,
          resourceName: matchedResName || args.resourceName || null,
          dayIndex: args.dayIndex !== undefined ? args.dayIndex : null,
          startHour: args.startHour !== undefined ? args.startHour : null,
          duration: args.duration !== undefined ? args.duration : null,
          userName: args.userName || null,
          userEmail: args.userEmail || null,
          hasConflict: !!args.hasConflict,
          conflictMessage: args.conflictMessage || null,
          suggestedAlternativeTime: args.suggestedAlternativeTime !== undefined ? args.suggestedAlternativeTime : null,
          suggestedAlternativeResourceId: args.suggestedAlternativeResourceId || null
        });

        if (args.dayIndex !== undefined && args.startHour !== undefined && args.duration !== undefined && !args.hasConflict) {
          window.dispatchEvent(
            new CustomEvent("assistant-set-draft", {
              detail: {
                resourceId: args.resourceId || consoleState.resourceId,
                dayIndex: args.dayIndex,
                startHour: args.startHour,
                duration: args.duration || 1.0,
                userName: args.userName || "Předběžná rezervace"
              }
            })
          );
        }
        break;
      case "propose_draft_booking":
        const draftResName = resources.find(r => r.id === args.resourceId)?.name || null;
        setConsoleState({
          resourceId: args.resourceId,
          resourceName: draftResName,
          dayIndex: args.dayIndex,
          startHour: args.startHour,
          duration: args.duration,
          userName: args.userName,
          userEmail: args.userEmail || null,
          hasConflict: false,
          conflictMessage: null,
          suggestedAlternativeTime: null,
          suggestedAlternativeResourceId: null
        });
        window.dispatchEvent(new CustomEvent("assistant-set-draft", { detail: args }));
        break;
      case "confirm_current_booking":
        window.dispatchEvent(new CustomEvent("assistant-perform-booking"));
        setTimeout(() => {
          setConsoleState({
            resourceId: null,
            resourceName: null,
            dayIndex: null,
            startHour: null,
            duration: null,
            userName: null,
            userEmail: null,
            hasConflict: false,
            conflictMessage: null,
            suggestedAlternativeTime: null,
            suggestedAlternativeResourceId: null
          });
          window.dispatchEvent(new CustomEvent("assistant-set-draft", { detail: null }));
        }, 1000);
        break;
    }
  };

  const handleApplyAlternative = () => {
    if (consoleState.suggestedAlternativeTime !== null) {
      const targetTimeStr = formatDecimalToTimeString(consoleState.suggestedAlternativeTime);
      const targetTimeText = `Změň rezervaci na ${consoleState.resourceName || "vybranou plochu"} na ${getDayNameCzech(consoleState.dayIndex || 0)} od ${targetTimeStr}`;
      handleSend(targetTimeText);
    }
  };

  const handleManualConfirm = () => {
    window.dispatchEvent(new CustomEvent("assistant-perform-booking"));
    setTimeout(() => {
      setConsoleState({
        resourceId: null,
        resourceName: null,
        dayIndex: null,
        startHour: null,
        duration: null,
        userName: null,
        userEmail: null,
        hasConflict: false,
        conflictMessage: null,
        suggestedAlternativeTime: null,
        suggestedAlternativeResourceId: null
      });
      window.dispatchEvent(new CustomEvent("assistant-set-draft", { detail: null }));
    }, 1000);
  };

  // Helper date mappings
  const getMondayOfDate = (d: Date) => {
    const temp = new Date(d);
    const day = temp.getDay();
    const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(temp.setDate(diff));
  };

  const getDayNameCzech = (idx: number | null) => {
    if (idx === null) return "";
    const names = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"];
    return names[idx] || "";
  };

  const formatDecimalToTimeString = (decimal: number | null) => {
    if (decimal === null) return "";
    const h = Math.floor(decimal);
    const m = Math.round((decimal % 1) * 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const isReadyToConfirm = consoleState.resourceId && consoleState.dayIndex !== null && consoleState.startHour !== null && !consoleState.hasConflict;

  return (
    <>
      {/* Floating Action Button (FAB) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-tr from-[#7000FF] to-[#3B82F6] text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 z-50 cursor-pointer group"
          title="Otevřít AI Asistenta"
        >
          <div className="absolute inset-0 rounded-full bg-[#7000FF]/20 animate-ping" />
          <Sparkles size={22} className="group-hover:rotate-12 transition-transform duration-300 text-white" />
        </button>
      )}

      {/* Unified Compact Dynamic Island voice HUD */}
      {isOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-[550px] bg-[#0E0E18]/85 dark:bg-[#07070C]/90 border border-slate-700/30 dark:border-white/10 text-white p-4.5 rounded-3xl shadow-[0_12px_45px_rgba(112,0,255,0.22)] backdrop-blur-2xl flex flex-col gap-4 z-50 transition-all duration-350 font-sans border-b-purple-500/30">
          
          {/* Header Controls */}
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_#a855f7]" />
              <span className="text-[10px] tracking-widest uppercase font-extrabold text-purple-400">
                {isListening ? "Poslouchám hlas..." : isLoading ? "Přemýšlím..." : "AI Hlasový Asistent"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsVoiceOutputEnabled(!isVoiceOutputEnabled)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isVoiceOutputEnabled ? "border-purple-500/30 text-purple-400 bg-purple-500/5 hover:bg-purple-500/10" : "border-white/5 text-zinc-500 hover:text-white"
                }`}
                title={isVoiceOutputEnabled ? "Vypnout mluvení" : "Zapnout mluvení"}
              >
                {isVoiceOutputEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  showSettings ? "border-purple-500/30 text-purple-400 bg-purple-500/5" : "border-white/5 text-zinc-500 hover:text-white"
                }`}
                title="API Nastavení"
              >
                <Key size={13} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg border border-white/5 text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Stepper horizontal parameter capsules */}
          <div className="grid grid-cols-4 gap-2 text-center select-none">
            {/* Step 1: PLOCHA */}
            <div
              className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all duration-200 truncate flex items-center justify-center gap-1.5 ${
                consoleState.resourceName
                  ? "bg-blue-500/10 text-blue-400 border-blue-500/25 shadow-[0_0_8px_rgba(59,130,246,0.1)]"
                  : "bg-white/5 border-dashed border-white/10 text-zinc-500"
              }`}
              title={consoleState.resourceName || "Vyberte plochu"}
            >
              <MapPin size={10} className={consoleState.resourceName ? "text-blue-400" : "text-zinc-600"} />
              <span className="truncate">{consoleState.resourceName || "Plocha?"}</span>
            </div>

            {/* Step 2: DATUM */}
            <div
              className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all duration-200 truncate flex items-center justify-center gap-1.5 ${
                consoleState.dayIndex !== null
                  ? "bg-purple-500/10 text-purple-400 border-purple-500/25 shadow-[0_0_8px_rgba(168,85,247,0.1)]"
                  : "bg-white/5 border-dashed border-white/10 text-zinc-500"
              }`}
              title={getDayNameCzech(consoleState.dayIndex) || "Zvolte datum"}
            >
              <Calendar size={10} className={consoleState.dayIndex !== null ? "text-purple-400" : "text-zinc-600"} />
              <span className="truncate">{getDayNameCzech(consoleState.dayIndex) || "Datum?"}</span>
            </div>

            {/* Step 3: ČAS */}
            <div
              className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all duration-200 truncate flex items-center justify-center gap-1.5 ${
                consoleState.startHour !== null
                  ? consoleState.hasConflict
                    ? "bg-rose-500/15 text-rose-400 border-rose-500/25 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.15)]"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                  : "bg-white/5 border-dashed border-white/10 text-zinc-500"
              }`}
              title={consoleState.startHour !== null ? `${formatDecimalToTimeString(consoleState.startHour)}` : "Zvolte čas"}
            >
              <Clock size={10} className={consoleState.startHour !== null ? (consoleState.hasConflict ? "text-rose-400 animate-bounce" : "text-emerald-400") : "text-zinc-600"} />
              <span className="truncate">
                {consoleState.startHour !== null ? formatDecimalToTimeString(consoleState.startHour) : "Čas?"}
              </span>
            </div>

            {/* Step 4: KLIENT */}
            <div
              className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all duration-200 truncate flex items-center justify-center gap-1.5 ${
                consoleState.userName
                  ? "bg-purple-500/10 text-purple-400 border-purple-500/25 shadow-[0_0_8px_rgba(168,85,247,0.1)]"
                  : "bg-white/5 border-dashed border-white/10 text-zinc-500"
              }`}
              title={consoleState.userName || "Zadejte jméno"}
            >
              <User size={10} className={consoleState.userName ? "text-purple-300" : "text-zinc-600"} />
              <span className="truncate">{consoleState.userName || "Klient?"}</span>
            </div>
          </div>

          {/* Conflict warnings inside capsule */}
          {consoleState.hasConflict && (
            <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/15 space-y-2.5 animate-fadeIn">
              <div className="flex gap-2">
                <AlertTriangle size={13} className="text-rose-500 shrink-0 mt-0.5" />
                <p className="text-[10.5px] text-zinc-300 leading-normal">
                  {consoleState.conflictMessage || "Zvolený termín je již obsazen."}
                </p>
              </div>
              
              {consoleState.suggestedAlternativeTime !== null && (
                <div className="p-2.5 bg-black/30 border border-white/5 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-[10px] font-semibold text-emerald-400">
                    Doporučeno: {getDayNameCzech(consoleState.dayIndex)} od {formatDecimalToTimeString(consoleState.suggestedAlternativeTime)}
                  </span>
                  <button
                    onClick={handleApplyAlternative}
                    className="text-[9px] font-extrabold bg-emerald-500 hover:bg-emerald-400 text-black px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-0.5"
                  >
                    Zvolit návrh <ChevronRight size={10} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Siri waveforms when recording or response text */}
          {isListening ? (
            <div className="flex items-center justify-center gap-2 py-3 bg-black/15 rounded-2xl border border-white/5">
              <span className="w-1.5 h-3 bg-purple-500 rounded-full wave-bar shadow-[0_0_6px_#a855f7]" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-7 bg-blue-500 rounded-full wave-bar shadow-[0_0_6px_#3b82f6]" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-10 bg-purple-400 rounded-full wave-bar shadow-[0_0_6px_#c084fc]" style={{ animationDelay: "300ms" }} />
              <span className="w-1.5 h-12 bg-cyan-400 rounded-full wave-bar shadow-[0_0_6px_#22d3ee]" style={{ animationDelay: "450ms" }} />
              <span className="w-1.5 h-7 bg-blue-400 rounded-full wave-bar shadow-[0_0_6px_#60a5fa]" style={{ animationDelay: "600ms" }} />
              <span className="w-1.5 h-3 bg-purple-500 rounded-full wave-bar shadow-[0_0_6px_#a855f7]" style={{ animationDelay: "750ms" }} />
              <span className="text-[10px] text-purple-300 font-bold tracking-widest uppercase ml-4 animate-pulse select-none">
                Poslouchám hlas...
              </span>
            </div>
          ) : (
            <div className="text-[11.5px] text-zinc-300 italic min-h-[38px] flex items-center bg-black/15 px-3.5 py-2.5 rounded-2xl border border-white/5 select-none leading-relaxed break-words">
              {messages[messages.length - 1]?.content || "Jak vám mohu dnes pomoci?"}
            </div>
          )}

          {/* Input field + Buttons */}
          <div className="flex items-center gap-2">
            {isSpeechSupported && (
              <button
                onClick={handleMicClick}
                className={`h-11 w-11 rounded-2xl flex items-center justify-center border transition-all cursor-pointer ${
                  isListening
                    ? "border-rose-500 bg-rose-500/15 text-rose-400 animate-pulse scale-105 shadow-[0_0_12px_rgba(239,68,68,0.25)]"
                    : "border-white/10 text-zinc-300 bg-white/5 hover:bg-white/10 hover:border-purple-500/30"
                }`}
              >
                <Mic size={18} />
              </button>
            )}

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={isListening ? "Mluvte nyní..." : "Napište pokyn..."}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 h-11 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
              disabled={isListening || isLoading}
            />

            {/* If ready to confirm, render glowing green CTA confirm button, otherwise standard send button */}
            {isReadyToConfirm ? (
              <button
                onClick={handleManualConfirm}
                className="h-11 px-4.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-[11px] font-extrabold tracking-wider uppercase shadow-md shadow-emerald-600/20 hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check size={14} className="text-emerald-100" />
                Potvrdit
              </button>
            ) : (
              <button
                onClick={() => handleSend()}
                className="h-11 w-11 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-colors cursor-pointer"
                disabled={isListening || isLoading}
              >
                <Send size={16} />
              </button>
            )}
          </div>

          {/* API settings drawer inside capsule */}
          {showSettings && (
            <div className="p-3 bg-black/45 rounded-2xl border border-white/15 space-y-2 mt-1 animate-fadeIn">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
                <Key size={13} />
                <span>Klíč pro Gemini API</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={userApiKey}
                  onChange={(e) => setUserApiKey(e.target.value)}
                  placeholder="Vložte AIzaSy... API klíč"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={saveApiKey}
                  className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer"
                >
                  Uložit
                </button>
              </div>
              {hasSavedKey && (
                <div className="flex items-center justify-between text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/15">
                  <span>Aktivní klíč v localStorage</span>
                  <button onClick={clearApiKey} className="text-rose-400 font-bold hover:underline cursor-pointer">
                    Smazat
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

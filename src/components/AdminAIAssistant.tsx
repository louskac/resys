"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Send, Settings, X, Bot, User, Sparkles, Volume2, VolumeX, RotateCcw, Check, AlertTriangle, Building, Layout, ShieldAlert, Cpu } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import AILiquidCore from "./AILiquidCore";
import AIWaveform from "./AIWaveform";
import AIInputBar from "./AIInputBar";

interface AdminAIAssistantProps {
  tenantId: string;
  resources: any[];
  bookings: any[];
  devices: any[];
  checkinLogs: any[];
  activeTab: string;
  settingsForm: any;
  activeDate?: string;
  weekStart?: string;
  tenantName: string;
  tenantVertical: string;
  tenantTagline?: string;
  tenantAiInstructions?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: any[];
}

function getAdminGreeting(tenantVertical: string, tenantAiInstructions?: string): string {
  const isFootball = tenantAiInstructions?.toLowerCase().includes("fotbal") || 
                     tenantAiInstructions?.toLowerCase().includes("soccer") ||
                     tenantAiInstructions?.toLowerCase().includes("umělk") ||
                     tenantAiInstructions?.toLowerCase().includes("hřišt");

  if (isFootball) {
    return "Dobrý den, jsem ReKeeper, váš timekeeper & gatekeeper. Mohu vám pomoci spravovat zdroje, časové sloty, IoT čtečky nebo změnit tagline portálu. Zkuste například: 'Chci vytvořit nové hřiště Sektor C s kapacitou 15'.";
  }

  if (tenantVertical === "SPORTS_GROUND") {
    return "Dobrý den, jsem ReKeeper, váš timekeeper & gatekeeper. Mohu vám pomoci spravovat zdroje, časové sloty, IoT čtečky nebo změnit tagline portálu. Zkuste například: 'Chci vytvořit nový kurt Kurt 3 s kapacitou 4'.";
  } else if (tenantVertical === "CAPACITY_CLASS") {
    return "Dobrý den, jsem ReKeeper, váš timekeeper & gatekeeper. Mohu vám pomoci spravovat zdroje, časové sloty, IoT čtečky nebo změnit tagline portálu. Zkuste například: 'Chci vytvořit nový sál Sál B s kapacitou 25'.";
  } else if (tenantVertical === "EDUCATIONAL_COURSE") {
    return "Dobrý den, jsem ReKeeper, váš timekeeper & gatekeeper. Mohu vám pomoci spravovat zdroje, časové sloty, IoT čtečky nebo změnit tagline portálu. Zkuste například: 'Chci vytvořit novou učebnu Třída 102 s kapacitou 30'.";
  } else if (tenantVertical === "EVENT_TICKETING") {
    return "Dobrý den, jsem ReKeeper, váš timekeeper & gatekeeper. Mohu vám pomoci spravovat zdroje, časové sloty, IoT čtečky nebo změnit tagline portálu. Zkuste například: 'Chci vytvořit novou akci Koncert s kapacitou 500'.";
  }
  return "Dobrý den, jsem ReKeeper, váš timekeeper & gatekeeper. Mohu vám pomoci spravovat zdroje, časové sloty, IoT čtečky nebo změnit tagline portálu. Zkuste například: 'Chci vytvořit nový zdroj Plocha s kapacitou 10'.";
}

export default function AdminAIAssistant({
  tenantId,
  resources,
  bookings,
  devices,
  checkinLogs,
  activeTab,
  settingsForm,
  activeDate,
  weekStart,
  tenantName,
  tenantVertical,
  tenantTagline,
  tenantAiInstructions
}: AdminAIAssistantProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState(true);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [backdropClicks, setBackdropClicks] = useState(0);
  const [shouldShake, setShouldShake] = useState(false);

  const [draftState, setDraftState] = useState<{
    tab: string;
    resourceName: string | null;
    ruleName: string | null;
    deviceName: string | null;
    tagline: string | null;
  }>({
    tab: activeTab,
    resourceName: null,
    ruleName: null,
    deviceName: null,
    tagline: null
  });

  const [messages, setMessages] = useState<Message[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const handleSendRef = useRef<any>(null);
  const lastInputWasVoiceRef = useRef(false);
  const isVoiceOutputEnabledRef = useRef(isVoiceOutputEnabled);
  const toolCallQueueRef = useRef<any[]>([]);

  // Sync isVoiceOutputEnabled with ref
  useEffect(() => {
    isVoiceOutputEnabledRef.current = isVoiceOutputEnabled;
    if (!isVoiceOutputEnabled && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [isVoiceOutputEnabled]);

  // Keep handleSend ref updated
  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  // Reset backdrop clicks
  useEffect(() => {
    setBackdropClicks(0);
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBackdropClicks(prev => {
      const next = prev + 1;
      if (next >= 2) {
        setIsOpen(false);
        return 0;
      }
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 300);
      return next;
    });
  };

  // Check speech support
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isSupported = !!(
        navigator.mediaDevices && 
        window.MediaRecorder
      );
      setIsSpeechSupported(isSupported);
    }
  }, []);

  const generateAiGreeting = async () => {
    setIsLoading(true);
    try {
      const initPrompt = "Pozdravte administrátora vřele v jazyce portálu (česky), představte se jako ReKeeper a stručně (1-2 věty) nabídněte pomoc se správou portálu (zdroje, pravidla, zařízení). Zkuste například navrhnout nějakou konkrétní akci podle vašeho nastavení. Dodržujte instrukce pro terminologii.";
      const response = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: initPrompt }],
          tenantId,
          resources,
          bookings,
          devices,
          checkinLogs,
          activeDate,
          weekStart,
          activeTab,
          settingsForm,
          tenantName,
          tenantVertical,
          tenantTagline,
          tenantAiInstructions
        })
      });

      if (!response.ok) {
        throw new Error("Failed to fetch greeting");
      }

      const data = await response.json();
      const greetingMsg: Message = {
        role: "assistant",
        content: data.reply || getAdminGreeting(tenantVertical, tenantAiInstructions)
      };
      setMessages([greetingMsg]);
      
      if (isVoiceOutputEnabledRef.current) {
        speakText(greetingMsg.content);
      }
    } catch (err) {
      console.error("Failed to generate AI greeting:", err);
      setMessages([
        {
          role: "assistant",
          content: getAdminGreeting(tenantVertical, tenantAiInstructions)
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      generateAiGreeting();
    }
  }, [isOpen, messages.length]);

  // Cleanup MediaRecorder
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          // ignore
        }
      }
    };
  }, []);

  const handleReset = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setMessages([]);
    setDraftState({
      tab: activeTab,
      resourceName: null,
      ruleName: null,
      deviceName: null,
      tagline: null
    });
    setInputText("");
  };

  // Speak voice output
  const speakText = (text: string) => {
    if (!isVoiceOutputEnabledRef.current || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[\*\#\-\`\_]/g, "").replace(/\[.*?\]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const isCzech = /[áčďéěíňóřšťúůýž]/i.test(cleanText) || cleanText.toLowerCase().includes("zdroj") || cleanText.toLowerCase().includes("nastaven");
    utterance.lang = isCzech ? "cs-CZ" : "en-US";
    window.speechSynthesis.speak(utterance);
  };

  // Sync dashboard active tab to local state
  useEffect(() => {
    setDraftState(prev => ({
      ...prev,
      tab: activeTab
    }));
  }, [activeTab]);

  // Listen to visual confirmation / action notifications from dashboard to close or reset drafting states
  useEffect(() => {
    const handleActionCompleted = (e: Event) => {
      const customEvent = e as CustomEvent<{ action: string; success: boolean }>;
      if (customEvent.detail?.success) {
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: `Akce '${customEvent.detail.action}' byla úspěšně uložena a potvrzena v systému.`
          }
        ]);
        speakText("Změny byly úspěšně uloženy.");
        
        // Reset specific draft states
        setDraftState(prev => ({
          ...prev,
          resourceName: null,
          ruleName: null,
          deviceName: null,
          tagline: null
        }));

        // Process next call from queue ref
        if (toolCallQueueRef.current.length > 0) {
          const nextCall = toolCallQueueRef.current.shift();
          setTimeout(() => {
            console.log("Executing queued tool call from ref:", nextCall.name, nextCall.args);
            executeToolCall(nextCall);
            
            const helperText = `Otevírám další předvyplněný formulář pro: "${nextCall.args.name || nextCall.name}".`;
            
            // Add a helper notification message from the assistant
            setMessages(prev => [
              ...prev,
              {
                role: "assistant",
                content: helperText
              }
            ]);
            
            // Speak the transition helper notification
            speakText(helperText);
          }, 800);
        }
      }
    };

    window.addEventListener("admin-assistant-action-completed", handleActionCompleted);
    return () => {
      window.removeEventListener("admin-assistant-action-completed", handleActionCompleted);
    };
  }, []);

  const handleMicClick = () => {
    if (isListening) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          console.error("Mic stop error:", err);
        }
      }
      setIsListening(false);
      return;
    }

    if (typeof window === "undefined" || !navigator.mediaDevices) return;

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        try {
          let options = {};
          if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
            options = { mimeType: "audio/webm;codecs=opus" };
          } else if (MediaRecorder.isTypeSupported("audio/webm")) {
            options = { mimeType: "audio/webm" };
          } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
            options = { mimeType: "audio/ogg;codecs=opus" };
          } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
            options = { mimeType: "audio/mp4" };
          }

          const recorder = new MediaRecorder(stream, options);
          mediaRecorderRef.current = recorder;
          audioChunksRef.current = [];

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };

          recorder.onstart = () => {
            setIsListening(true);
          };

          recorder.onerror = () => {
            setIsListening(false);
            stream.getTracks().forEach(track => track.stop());
            setMessages(prev => [
              ...prev,
              {
                role: "assistant",
                content: "Chyba mikrofonu při nahrávání hlasu. Zkuste zadat textový příkaz."
              }
            ]);
          };

          recorder.onstop = async () => {
            stream.getTracks().forEach(track => track.stop());
            setIsListening(false);

            const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
            audioChunksRef.current = [];

            if (audioBlob.size < 500) return;

            setIsLoading(true);
            try {
              const formData = new FormData();
              formData.append("file", audioBlob);

              const response = await fetch("/api/transcribe", {
                method: "POST",
                body: formData
              });

              if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Chyba při transkripci.");
              }

              const data = await response.json();
              if (data.text && data.text.trim()) {
                setInputText(data.text);
                lastInputWasVoiceRef.current = true;
                if (handleSendRef.current) {
                  handleSendRef.current(data.text);
                }
              }
            } catch (err: any) {
              console.error(err);
              setMessages(prev => [
                ...prev,
                {
                  role: "assistant",
                  content: `Nepodařilo se rozpoznat hlas: ${err.message || "Chyba spojení."}`
                }
              ]);
            } finally {
              setIsLoading(false);
              mediaRecorderRef.current = null;
            }
          };

          recorder.start(200);
        } catch (err: any) {
          console.error(err);
          setIsListening(false);
          stream.getTracks().forEach(track => track.stop());
        }
      })
      .catch(err => {
        console.error(err);
        setIsListening(false);
      });
  };

  async function handleSend(textToSend?: string) {
    if (textToSend === undefined) {
      lastInputWasVoiceRef.current = false;
    }
    const text = (textToSend || inputText).trim();
    if (!text) return;

    setInputText("");
    const newMessages = [...messages, { role: "user", content: text } as Message];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          tenantId,
          resources,
          bookings,
          devices,
          checkinLogs,
          activeDate,
          weekStart,
          activeTab,
          settingsForm,
          tenantName,
          tenantVertical,
          tenantTagline,
          tenantAiInstructions
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Chyba na serveru AI.");
      }

      const data = await response.json();
      const replyMessage: Message = {
        role: "assistant",
        content: data.reply || "Provedl jsem požadovanou úpravu na obrazovce.",
        toolCalls: data.toolCalls
      };

      setMessages(prev => [...prev, replyMessage]);

      if (replyMessage.content) {
        speakText(replyMessage.content);
      }

      if (data.toolCalls && data.toolCalls.length > 0) {
        const [firstCall, ...remainingCalls] = data.toolCalls;
        // Execute the first tool call immediately
        executeToolCall(firstCall);
        
        // Queue the remaining calls
        toolCallQueueRef.current = remainingCalls;
      }

    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `Omlouvám se, nastala chyba: ${err.message || "Nepodařilo se připojit k AI."}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  const executeToolCall = (call: any) => {
    const { name, args } = call;
    console.log("Admin Assistant executing tool call:", name, args);

    switch (name) {
      case "navigate_tab":
        if (args.tab) {
          window.dispatchEvent(new CustomEvent("admin-assistant-navigate-tab", { detail: { tab: args.tab } }));
          setDraftState(prev => ({
            ...prev,
            tab: args.tab
          }));
        }
        break;

      case "draft_resource":
        window.dispatchEvent(new CustomEvent("admin-assistant-draft-resource", { detail: args }));
        setDraftState(prev => ({
          ...prev,
          tab: "resources",
          resourceName: args.name
        }));
        break;

      case "draft_rule":
        window.dispatchEvent(new CustomEvent("admin-assistant-draft-rule", { detail: args }));
        setDraftState(prev => ({
          ...prev,
          tab: "rules",
          ruleName: args.name
        }));
        break;

      case "draft_device":
        window.dispatchEvent(new CustomEvent("admin-assistant-draft-device", { detail: args }));
        setDraftState(prev => ({
          ...prev,
          tab: "devices",
          deviceName: args.name
        }));
        break;

      case "draft_settings":
        window.dispatchEvent(new CustomEvent("admin-assistant-draft-settings", { detail: args }));
        setDraftState(prev => ({
          ...prev,
          tab: "settings",
          tagline: args.tagline || null
        }));
        break;
    }
  };

  const czechTabNames: Record<string, string> = {
    overview: "Přehled",
    resources: "Zdroje (Kurty)",
    rules: "Sloty a Ceník",
    bookings: "Rezervace",
    devices: "IoT Turnikety",
    settings: "Nastavení portálu"
  };

  return (
    <>
      {isOpen && (
        <div 
          onClick={handleBackdropClick}
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 cursor-default animate-fadeIn md:hidden"
        />
      )}

      {!isOpen && (
        <AILiquidCore 
          onClick={() => setIsOpen(true)} 
          label="Spustit ReKeeper"
          badgeText="ReKeeper Admin"
          title="Otevřít administrátorského asistenta ReKeeper"
        />
      )}

      {isOpen && (
        <div className={`fixed bottom-6 md:bottom-8 right-6 md:right-8 w-[95%] max-w-[460px] left-auto mx-0 bg-[#0A0A12]/95 border border-purple-500/20 shadow-[0_20px_50px_rgba(112,0,255,0.25)] rounded-[28px] p-5 pt-8 pb-5 flex flex-col gap-4 z-50 transition-all duration-300 font-sans ${shouldShake ? "animate-dynamic-shake" : ""}`}>
          
          {/* Subtle glowing backgrounds */}
          <div className="absolute inset-0 rounded-[28px] overflow-hidden pointer-events-none z-0">
            <div className="absolute top-[-80px] left-[-60px] w-[260px] h-[260px] rounded-full bg-[#7000FF] opacity-[0.08] blur-[70px] animate-blob-orbit-1" />
            <div className="absolute bottom-[-100px] right-[-50px] w-[240px] h-[240px] rounded-full bg-[#3B82F6] opacity-[0.06] blur-[65px] animate-blob-orbit-2" />
          </div>

          {/* Stepper / Active status chips row */}
          <div className="flex flex-wrap items-center gap-1.5 z-10 select-none">
            <span className="text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center gap-1.5">
              <Layout size={10} />
              Sekce: {czechTabNames[draftState.tab] || draftState.tab}
            </span>

            {draftState.resourceName && (
              <span className="text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-center gap-1.5 animate-pulse">
                <Building size={10} />
                Příprava: {draftState.resourceName}
              </span>
            )}

            {draftState.ruleName && (
              <span className="text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-1.5 animate-pulse">
                <Sparkles size={10} />
                Příprava slotu: {draftState.ruleName}
              </span>
            )}

            {draftState.deviceName && (
              <span className="text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-1.5 animate-pulse">
                <Cpu size={10} />
                Příprava čtečky: {draftState.deviceName}
              </span>
            )}
          </div>

          {/* HUD Header controls */}
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5 z-10 select-none">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-550 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.7)]" />
              <span className="text-[10px] tracking-widest uppercase font-extrabold text-purple-400">
                {isListening ? "ReKeeper poslouchá..." : isLoading ? "Zpracovávám příkaz..." : "ReKeeper: Admin"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 z-10">
              <button
                onClick={() => {
                  const nextVal = !isVoiceOutputEnabled;
                  setIsVoiceOutputEnabled(nextVal);
                  if (typeof window !== "undefined" && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                  }
                }}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isVoiceOutputEnabled ? "border-purple-500/30 text-purple-400 bg-purple-500/5 hover:bg-purple-500/10" : "border-white/5 text-zinc-500 hover:text-white"
                }`}
                title={isVoiceOutputEnabled ? "Hlas zapnut" : "Hlas vypnut"}
              >
                {isVoiceOutputEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              </button>
              <button
                onClick={handleReset}
                className="p-1.5 rounded-lg border border-white/5 text-zinc-500 hover:text-rose-400 hover:border-rose-500/35 hover:bg-rose-500/5 transition-all cursor-pointer"
                title="Restartovat ReKeepera"
              >
                <RotateCcw size={13} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg border border-white/5 text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Waveforms or content zones */}
          {isListening ? (
            <AIWaveform label="Poslouchám pokyn..." />
          ) : (
            <div className="text-[11.5px] text-zinc-200 italic min-h-[38px] flex items-center bg-slate-950/50 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] select-none leading-relaxed break-words z-10">
              {messages[messages.length - 1]?.content || "S čím vám mohu pomoci?"}
            </div>
          )}

          {/* Form Prefill/Draft Assist alerts */}
          {!isListening && (draftState.resourceName || draftState.ruleName || draftState.deviceName || draftState.tagline) && (
            <div className="p-3 bg-purple-500/5 rounded-2xl border border-purple-500/10 space-y-2 animate-fadeIn z-10">
              <div className="flex gap-2">
                <Check size={13} className="text-purple-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-zinc-400 leading-normal font-medium">
                  Formulář byl předvyplněn na vaší obrazovce. Zkontrolujte prosím parametry v otevřeném okně a klikněte na tlačítko <strong>Uložit</strong>.
                </p>
              </div>
            </div>
          )}

          {/* AI Input controls */}
          <AIInputBar
            inputText={inputText}
            onChangeInput={(val) => {
              setInputText(val);
              lastInputWasVoiceRef.current = false;
            }}
            onSubmit={() => handleSend()}
            onMicClick={handleMicClick}
            onConfirm={() => {}}
            isListening={isListening}
            isLoading={isLoading}
            isSpeechSupported={isSpeechSupported}
            isReadyToConfirm={false} // Direct DB mutations are guardrailed (reviewed by clicking save manually in UI)
          />
        </div>
      )}
    </>
  );
}

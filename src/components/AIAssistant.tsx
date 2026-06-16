"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Send, Settings, X, Bot, User, Sparkles, Volume2, VolumeX, RotateCcw, Check, AlertTriangle, Calendar, Clock, MapPin, ChevronRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import AILiquidCore from "./AILiquidCore";
import AIStepper from "./AIStepper";
import AIWaveform from "./AIWaveform";
import AIInputBar from "./AIInputBar";

interface AIAssistantProps {
  tenantId: string;
  resources: { id: string; name: string; parentId?: string | null }[];
  initialEvents: any[];
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
  recurrencePattern: "none" | "weekly" | "bi-weekly" | "monthly" | null;
  recurrenceCount: number | null;
}

function getCustomerGreeting(tenantVertical: string, tenantAiInstructions?: string): string {
  const isFootball = tenantAiInstructions?.toLowerCase().includes("fotbal") || 
                     tenantAiInstructions?.toLowerCase().includes("soccer") ||
                     tenantAiInstructions?.toLowerCase().includes("umělk") ||
                     tenantAiInstructions?.toLowerCase().includes("hřišt");

  if (isFootball) {
    return "Dobrý den! Jsem ReKeeper, váš inteligentní rezervační asistent. Řekněte mi například: 'Chci fotbal na středu ve 4 odpoledne na jméno Jakub'.";
  }

  if (tenantVertical === "SPORTS_GROUND") {
    return "Dobrý den! Jsem ReKeeper, váš inteligentní rezervační asistent. Řekněte mi například: 'Chci tenis na středu ve 4 odpoledne na jméno Jakub'.";
  } else if (tenantVertical === "CAPACITY_CLASS") {
    return "Dobrý den! Jsem ReKeeper, váš inteligentní rezervační asistent. Řekněte mi například: 'Chci lekci na středu ve 4 odpoledne na jméno Jakub'.";
  } else if (tenantVertical === "EDUCATIONAL_COURSE") {
    return "Dobrý den! Jsem ReKeeper, váš inteligentní rezervační asistent. Řekněte mi například: 'Chci kurz na středu ve 4 odpoledne na jméno Jakub'.";
  } else if (tenantVertical === "EVENT_TICKETING") {
    return "Dobrý den! Jsem ReKeeper, váš inteligentní rezervační asistent. Řekněte mi například: 'Chci lístek na středu ve 4 odpoledne na jméno Jakub'.";
  }
  return "Dobrý den! Jsem ReKeeper, váš inteligentní rezervační asistent. Řekněte mi například: 'Chci rezervovat na středu ve 4 odpoledne na jméno Jakub'.";
}

export default function AIAssistant({ 
  tenantId, 
  resources, 
  initialEvents,
  tenantName,
  tenantVertical,
  tenantTagline,
  tenantAiInstructions
}: AIAssistantProps) {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState(true);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [backdropClicks, setBackdropClicks] = useState(0);
  const [shouldShake, setShouldShake] = useState(false);

  // Sync session user to consoleState.userName if logged in
  useEffect(() => {
    if (session?.user?.name) {
      const userName = session.user.name;
      const userEmail = session.user.email || null;
      setConsoleState(prev => {
        if (prev.userName !== userName) {
          return {
            ...prev,
            userName,
            userEmail
          };
        }
        return prev;
      });
    }
  }, [session]);

  // Conflict status listener was unified into the central event sync useEffect below

  const lastInputWasVoiceRef = useRef(false);
  const isVoiceOutputEnabledRef = useRef(isVoiceOutputEnabled);

  // Sync isVoiceOutputEnabled with ref to avoid React stale closure issues in async callbacks
  useEffect(() => {
    isVoiceOutputEnabledRef.current = isVoiceOutputEnabled;
    if (!isVoiceOutputEnabled && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [isVoiceOutputEnabled]);

  // Reset backdrop clicks when assistant is opened or closed
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
    suggestedAlternativeResourceId: null,
    recurrencePattern: "none",
    recurrenceCount: null
  });

  const [messages, setMessages] = useState<Message[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const handleSendRef = useRef<any>(null);

  // Keep handleSend ref updated to avoid stale closure issues in audio transcription callbacks
  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  // Check if MediaRecorder is supported on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isSupported = !!(
        navigator.mediaDevices && 
        window.MediaRecorder
      );
      setIsSpeechSupported(isSupported);
    }
  }, []);

  // Cleanup active MediaRecorder on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        console.log("AIAssistant cleanup: stopping media recorder on unmount");
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          // ignore
        }
      }
    };
  }, []);

  const generateAiGreeting = async () => {
    setIsLoading(true);
    try {
      const initPrompt = "Pozdravte uživatele vřele v jazyce portálu (česky), představte se jako ReKeeper a stručně (1-2 věty) jej vyzvěte k rezervaci. Nabídněte pomoc s rezervací hřiště nebo zdroje na základě vašeho nastavení a instrukcí. Zkuste například navrhnout nějakou konkrétní akci podle vašeho nastavení. Dodržujte instrukce pro terminologii.";
      const activeDateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];
      const activeResSlug = searchParams.get("resource") || "";
      const activeRes = resources.find(r => r.id === activeResSlug || r.name.toLowerCase().replace(/\s+/g, "-").includes(activeResSlug.split("-")[0]));

      const currentBookingsContext = initialEvents
        .filter(e => e.isOccupied)
        .map(e => ({
          id: e.id,
          resourceId: e.resourceId,
          resourceName: e.resourceName || resources.find(r => r.id === e.resourceId)?.name || "Plocha",
          dayIndex: e.dayIndex,
          startHour: e.startHour,
          durationHours: e.durationHours,
          name: e.name,
          instructor: e.instructor
        }));

      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: initPrompt }],
          resources,
          existingBookings: currentBookingsContext,
          currentDate: new Date().toISOString(),
          weekStart: (() => {
            const temp = new Date(activeDateStr);
            const day = temp.getUTCDay();
            const diff = temp.getUTCDate() - day + (day === 0 ? -6 : 1);
            const mon = new Date(temp);
            mon.setUTCDate(diff);
            mon.setUTCHours(0, 0, 0, 0);
            return mon.toISOString().split("T")[0];
          })(),
          activeResourceId: activeRes?.id || "",
          loggedInUser: session?.user ? { name: session.user.name, email: session.user.email } : null,
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
        content: data.reply || getCustomerGreeting(tenantVertical, tenantAiInstructions)
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
          content: getCustomerGreeting(tenantVertical, tenantAiInstructions)
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

  // Reset assistant state to start a new booking conversation
  const handleReset = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setMessages([]);
    setConsoleState({
      resourceId: null,
      resourceName: null,
      dayIndex: null,
      startHour: null,
      duration: null,
      userName: session?.user?.name || null,
      userEmail: session?.user?.email || null,
      hasConflict: false,
      conflictMessage: null,
      suggestedAlternativeTime: null,
      suggestedAlternativeResourceId: null,
      recurrencePattern: "none",
      recurrenceCount: null
    });
    setInputText("");
    window.dispatchEvent(new CustomEvent("assistant-set-draft", { detail: null }));
  };

  // Vocal text-to-speech feedback
  const speakText = (text: string) => {
    if (!isVoiceOutputEnabledRef.current || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[\*\#\-\`\_]/g, "").replace(/\[.*?\]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const isCzech = /[áčďéěíňóřšťúůýž]/i.test(cleanText) || cleanText.toLowerCase().includes("rezerv") || cleanText.toLowerCase().includes("kurt");
    utterance.lang = isCzech ? "cs-CZ" : "en-US";
    window.speechSynthesis.speak(utterance);
  };

  // Synchronize URL resource parameter to consoleState
  useEffect(() => {
    const activeResSlug = searchParams.get("resource") || "";
    if (activeResSlug) {
      const activeRes = resources.find(r => 
        r.id === activeResSlug || 
        r.name.toLowerCase().replace(/\s+/g, "-").includes(activeResSlug.split("-")[0])
      );
      if (activeRes) {
        setConsoleState(prev => {
          if (prev.resourceId === activeRes.id && prev.resourceName === activeRes.name) {
            return prev;
          }
          return {
            ...prev,
            resourceId: activeRes.id,
            resourceName: activeRes.name
          };
        });
      }
    }
  }, [searchParams, resources]);

  // Central event listener synchronization between AI Assistant and Calendar View
  useEffect(() => {
    const handleConflictStatus = (e: Event) => {
      const customEvent = e as CustomEvent<{ hasConflict: boolean; conflictMessage: string | null }>;
      if (customEvent.detail) {
        setConsoleState(prev => ({
          ...prev,
          hasConflict: customEvent.detail.hasConflict,
          conflictMessage: customEvent.detail.conflictMessage
        }));
      }
    };

    const handleBookingSuccess = () => {
      setIsLoading(false);
      setMessages(prev => {
        // Prevent duplicate success messages
        if (prev.length > 0 && prev[prev.length - 1].content.includes("Rezervace byla úspěšně potvrzena")) {
          return prev;
        }
        return [
          ...prev,
          {
            role: "assistant",
            content: "Rezervace byla úspěšně potvrzena! Zavírám ReKeepera..."
          }
        ];
      });
      speakText("Rezervace byla úspěšně potvrzena!");
      
      setTimeout(() => {
        setConsoleState({
          resourceId: null,
          resourceName: null,
          dayIndex: null,
          startHour: null,
          duration: null,
          userName: session?.user?.name || null,
          userEmail: session?.user?.email || null,
          hasConflict: false,
          conflictMessage: null,
          suggestedAlternativeTime: null,
          suggestedAlternativeResourceId: null,
          recurrencePattern: "none",
          recurrenceCount: null
        });
        window.dispatchEvent(new CustomEvent("assistant-set-draft", { detail: null }));
      }, 1000);
      
      setTimeout(() => {
        setIsOpen(false);
      }, 2500);
    };

    const handleBookingError = (e: Event) => {
      setIsLoading(false);
      const customEvent = e as CustomEvent<{ message: string }>;
      const errorMsg = customEvent.detail?.message || "Rezervaci se nepodařilo potvrdit.";
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `Omlouvám se, nepodařilo se dokončit rezervaci: ${errorMsg}`
        }
      ]);
      speakText(`Nepodařilo se dokončit rezervaci. ${errorMsg}`);
    };

    const handleBookingCancelled = () => {
      setConsoleState(prev => ({
        ...prev,
        dayIndex: null,
        startHour: null,
        duration: null,
        hasConflict: false,
        conflictMessage: null
      }));
      window.dispatchEvent(new CustomEvent("assistant-set-draft", { detail: null }));
    };

    window.addEventListener("assistant-conflict-status", handleConflictStatus);
    window.addEventListener("assistant-booking-success", handleBookingSuccess);
    window.addEventListener("assistant-booking-error", handleBookingError);
    window.addEventListener("assistant-booking-cancelled", handleBookingCancelled);

    return () => {
      window.removeEventListener("assistant-conflict-status", handleConflictStatus);
      window.removeEventListener("assistant-booking-success", handleBookingSuccess);
      window.removeEventListener("assistant-booking-error", handleBookingError);
      window.removeEventListener("assistant-booking-cancelled", handleBookingCancelled);
    };
  }, [session, speakText]);

  const handleMicClick = () => {
    console.log("handleMicClick: isListening =", isListening, "mediaRecorder =", mediaRecorderRef.current);
    
    if (isListening) {
      console.log("handleMicClick: stopping active recording");
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          console.error("handleMicClick: stop error:", err);
        }
      }
      setIsListening(false);
      return;
    }

    if (typeof window === "undefined" || !navigator.mediaDevices) {
      console.warn("handleMicClick: Media devices are not supported in this browser environment.");
      return;
    }

    console.log("handleMicClick: request microphone permission and start recording");
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        try {
          // Detect a supported MIME type for recording (prefer webm, fallback to mp4 or ogg)
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

          console.log("Creating MediaRecorder with options:", options);
          const recorder = new MediaRecorder(stream, options);
          mediaRecorderRef.current = recorder;
          audioChunksRef.current = [];

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };

          recorder.onstart = () => {
            console.log("MediaRecorder onstart: recording active");
            setIsListening(true);
          };

          recorder.onerror = (e: any) => {
            console.error("MediaRecorder onerror:", e.error || e);
            setIsListening(false);
            stream.getTracks().forEach(track => track.stop());
            
            setMessages(prev => [
              ...prev,
              {
                role: "assistant",
                content: "Rozpoznávání hlasu selhalo kvůli chybě mikrofonu. Zkuste to prosím znovu nebo napište pokyn."
              }
            ]);
          };

          recorder.onstop = async () => {
            console.log("MediaRecorder onstop: recording completed");
            // Turn off the microphone track icons by stopping the tracks
            stream.getTracks().forEach(track => track.stop());
            setIsListening(false);

            const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
            audioChunksRef.current = [];

            if (audioBlob.size < 500) {
              console.warn("Recorded audio blob is too small, ignoring transcription.");
              return;
            }

            setIsLoading(true);
            try {
              const formData = new FormData();
              formData.append("file", audioBlob);

              console.log(`Sending ${audioBlob.size} bytes audio blob to /api/transcribe...`);
              const response = await fetch("/api/transcribe", {
                method: "POST",
                body: formData
              });

              if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Chyba serveru při přepisu řeči.");
              }

              const data = await response.json();
              console.log("Transcription result:", data.text);
              if (data.text && data.text.trim()) {
                setInputText(data.text);
                lastInputWasVoiceRef.current = true;
                if (handleSendRef.current) {
                  handleSendRef.current(data.text);
                }
              }
            } catch (err: any) {
              console.error("Transcription execution failed:", err);
              setMessages(prev => [
                ...prev,
                {
                  role: "assistant",
                  content: `Omlouvám se, nepodařilo se přepsat váš hlas: ${err.message || "Chyba sítě."}`
                }
              ]);
            } finally {
              setIsLoading(false);
              mediaRecorderRef.current = null;
            }
          };

          recorder.start(200);
        } catch (err: any) {
          console.error("Failed to construct MediaRecorder:", err);
          setIsListening(false);
          stream.getTracks().forEach(track => track.stop());
        }
      })
      .catch(err => {
        console.error("getUserMedia error:", err);
        let errorMsg = "Nepodařilo se získat přístup k mikrofonu.";
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          errorMsg = "Přístup k mikrofonu byl zamítnut. Povolte prosím mikrofon v adresním řádku prohlížeče a zkuste to znovu.";
        }
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: errorMsg
          }
        ]);
        setIsListening(false);
      });
  };

  // Submit prompt requests to Gemini
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

    const activeDateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const activeResSlug = searchParams.get("resource") || "";
    const activeRes = resources.find(r => r.id === activeResSlug || r.name.toLowerCase().replace(/\s+/g, "-").includes(activeResSlug.split("-")[0]));

    const currentBookingsContext = initialEvents
      .filter(e => e.isOccupied)
      .map(e => ({
        id: e.id,
        resourceId: e.resourceId,
        resourceName: e.resourceName || resources.find(r => r.id === e.resourceId)?.name || "Plocha",
        dayIndex: e.dayIndex,
        startHour: e.startHour,
        durationHours: e.durationHours,
        name: e.name,
        instructor: e.instructor
      }));

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      const response = await fetch("/api/assistant", {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: newMessages,
          resources,
          existingBookings: currentBookingsContext,
          currentDate: new Date().toISOString(),
          weekStart: getMondayOfDate(new Date(activeDateStr)).toISOString().split("T")[0],
          activeResourceId: activeRes?.id || "",
          loggedInUser: session?.user ? { name: session.user.name, email: session.user.email } : null,
          tenantName,
          tenantVertical,
          tenantTagline,
          tenantAiInstructions
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

      if (replyMessage.content && lastInputWasVoiceRef.current) {
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
      case "report_booking_status": {
        const nextResourceId = args.resourceId !== undefined ? args.resourceId : consoleState.resourceId;
        const matchedResName = nextResourceId ? (resources.find(r => r.id === nextResourceId)?.name || null) : null;
        const nextResourceName = args.resourceId !== undefined 
          ? matchedResName 
          : (args.resourceName !== undefined ? args.resourceName : consoleState.resourceName);

        const nextDayIndex = args.dayIndex !== undefined ? args.dayIndex : consoleState.dayIndex;
        const nextStartHour = args.startHour !== undefined ? args.startHour : consoleState.startHour;
        const nextDuration = args.duration !== undefined ? args.duration : consoleState.duration;
        const nextUserName = args.userName !== undefined ? args.userName : consoleState.userName;
        const nextUserEmail = args.userEmail !== undefined ? args.userEmail : consoleState.userEmail;
        const nextHasConflict = args.hasConflict !== undefined ? !!args.hasConflict : consoleState.hasConflict;
        const nextConflictMessage = args.conflictMessage !== undefined ? args.conflictMessage : consoleState.conflictMessage;
        const nextSuggestedAltTime = args.suggestedAlternativeTime !== undefined ? args.suggestedAlternativeTime : consoleState.suggestedAlternativeTime;
        const nextSuggestedAltResId = args.suggestedAlternativeResourceId !== undefined ? args.suggestedAlternativeResourceId : consoleState.suggestedAlternativeResourceId;
        const nextRecPattern = args.recurrencePattern !== undefined ? args.recurrencePattern : consoleState.recurrencePattern;
        const nextRecCount = args.recurrenceCount !== undefined ? args.recurrenceCount : consoleState.recurrenceCount;

        setConsoleState({
          resourceId: nextResourceId,
          resourceName: nextResourceName,
          dayIndex: nextDayIndex,
          startHour: nextStartHour,
          duration: nextDuration,
          userName: nextUserName,
          userEmail: nextUserEmail,
          hasConflict: nextHasConflict,
          conflictMessage: nextConflictMessage,
          suggestedAlternativeTime: nextSuggestedAltTime,
          suggestedAlternativeResourceId: nextSuggestedAltResId,
          recurrencePattern: nextRecPattern,
          recurrenceCount: nextRecCount
        });

        if (nextDayIndex !== null && nextStartHour !== null && !nextHasConflict) {
          window.dispatchEvent(
            new CustomEvent("assistant-set-draft", {
              detail: {
                resourceId: nextResourceId,
                dayIndex: nextDayIndex,
                startHour: nextStartHour,
                duration: nextDuration || 1.0,
                userName: nextUserName || "Předběžná rezervace",
                recurrencePattern: nextRecPattern || "none",
                recurrenceCount: nextRecCount || null
              }
            })
          );
        }
        break;
      }
      case "propose_draft_booking": {
        const draftResourceId = args.resourceId !== undefined ? args.resourceId : consoleState.resourceId;
        const draftResName = draftResourceId ? (resources.find(r => r.id === draftResourceId)?.name || null) : null;
        
        const draftDayIndex = args.dayIndex !== undefined ? args.dayIndex : consoleState.dayIndex;
        const draftStartHour = args.startHour !== undefined ? args.startHour : consoleState.startHour;
        const draftDuration = args.duration !== undefined ? args.duration : consoleState.duration;
        const draftUserName = args.userName !== undefined ? args.userName : consoleState.userName;
        const draftUserEmail = args.userEmail !== undefined ? args.userEmail : consoleState.userEmail;
        const draftRecPattern = args.recurrencePattern !== undefined ? args.recurrencePattern : consoleState.recurrencePattern;
        const draftRecCount = args.recurrenceCount !== undefined ? args.recurrenceCount : consoleState.recurrenceCount;

        setConsoleState({
          resourceId: draftResourceId,
          resourceName: draftResName || consoleState.resourceName,
          dayIndex: draftDayIndex,
          startHour: draftStartHour,
          duration: draftDuration,
          userName: draftUserName,
          userEmail: draftUserEmail,
          hasConflict: false,
          conflictMessage: null,
          suggestedAlternativeTime: null,
          suggestedAlternativeResourceId: null,
          recurrencePattern: draftRecPattern,
          recurrenceCount: draftRecCount
        });

        window.dispatchEvent(
          new CustomEvent("assistant-set-draft", {
            detail: {
              resourceId: draftResourceId,
              dayIndex: draftDayIndex,
              startHour: draftStartHour,
              duration: draftDuration || 1.0,
              userName: draftUserName || "Předběžná rezervace",
              recurrencePattern: draftRecPattern || "none",
              recurrenceCount: draftRecCount || null
            }
          })
        );
        break;
      }
      case "confirm_current_booking":
        setIsLoading(true);
        window.dispatchEvent(new CustomEvent("assistant-perform-booking"));
        break;
      case "cancel_booking": {
        const { bookingId, cancelSeries } = args;
        setIsLoading(true);
        fetch(`/api/bookings?bookingId=${bookingId}&cancelSeries=${!!cancelSeries}`, {
          method: "DELETE"
        })
        .then(async (res) => {
          if (res.ok) {
            setMessages(prev => [...prev, {
              role: "assistant",
              content: "Rezervace byla úspěšně zrušena. Stránka se nyní obnoví."
            }]);
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            const data = await res.json();
            throw new Error(data.error || "Chyba při rušení");
          }
        })
        .catch((err) => {
          console.error(err);
          setMessages(prev => [...prev, {
            role: "assistant",
            content: `Omlouvám se, zrušení rezervace se nezdařilo: ${err.message}`
          }]);
        })
        .finally(() => {
          setIsLoading(false);
        });
        break;
      }
      case "reschedule_booking": {
        const { bookingId, resourceId, dayIndex, startHour, duration } = args;
        setIsLoading(true);
        
        let startTime: string | undefined;
        let endTime: string | undefined;
        if (startHour !== undefined) {
          const formatDecimalToTime = (decimal: number) => {
            const h = Math.floor(decimal);
            const m = Math.round((decimal % 1) * 60);
            return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
          };
          startTime = formatDecimalToTime(startHour);
          if (duration !== undefined) {
            endTime = formatDecimalToTime(startHour + duration);
          } else {
            endTime = formatDecimalToTime(startHour + 1);
          }
        }

        fetch("/api/bookings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId,
            resourceId,
            dayIndex,
            startTime,
            endTime
          })
        })
        .then(async (res) => {
          if (res.ok) {
            setMessages(prev => [...prev, {
              role: "assistant",
              content: "Rezervace byla úspěšně změněna. Stránka se nyní obnoví."
            }]);
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            const data = await res.json();
            throw new Error(data.error || "Chyba při úpravě");
          }
        })
        .catch((err) => {
          console.error(err);
          setMessages(prev => [...prev, {
            role: "assistant",
            content: `Omlouvám se, změna rezervace se nezdařila: ${err.message}`
          }]);
        })
        .finally(() => {
          setIsLoading(false);
        });
        break;
      }
    }
  };

  const handleApplyAlternative = () => {
    if (consoleState.suggestedAlternativeTime !== null) {
      const targetTimeStr = formatDecimalToTimeString(consoleState.suggestedAlternativeTime);
      const targetTimeText = `Změň rezervaci na ${consoleState.resourceName || "vybranou plochu"} na ${getDayNameCzech(consoleState.dayIndex || 0)} od ${targetTimeStr}`;
      lastInputWasVoiceRef.current = false;
      handleSend(targetTimeText);
    }
  };

  const handleManualConfirm = () => {
    setIsLoading(true);
    window.dispatchEvent(new CustomEvent("assistant-perform-booking"));
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

  const isReadyToConfirm = !!(consoleState.resourceId && consoleState.dayIndex !== null && consoleState.startHour !== null && !consoleState.hasConflict);

  return (
    <>
      {/* Backdrop for disabling everything else when AI is open */}
      {isOpen && (
        <div 
          onClick={handleBackdropClick}
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[1.5px] transition-opacity duration-300 cursor-default animate-fadeIn"
        />
      )}

      {/* Floating Action Button (FAB) redesigned as a premium centered AI Command Bar */}
      {!isOpen && (
        <AILiquidCore onClick={() => setIsOpen(true)} />
      )}

      {/* Google Stitch inspired Dynamic Island Voice HUD */}
      {isOpen && (
        <div className={`fixed bottom-10 md:bottom-12 left-0 right-0 mx-auto w-[95%] max-w-[550px] animated-glowing-border p-5 pt-14 pb-5 flex flex-col gap-4 z-50 transition-[opacity,background-color,border-color,box-shadow,backdrop-filter] duration-350 font-sans ${shouldShake ? "animate-dynamic-shake" : ""}`}>
          
          {/* Subtle breathing liquid background mesh matching the design language */}
          <div className="absolute inset-0 rounded-[28px] overflow-hidden pointer-events-none z-0">
            {/* Ambient Purple Blur */}
            <div className="absolute top-[-80px] left-[-60px] w-[260px] h-[260px] rounded-full bg-[#7000FF] opacity-[0.05] dark:opacity-[0.08] blur-[70px] animate-blob-orbit-1" />
            {/* Ambient Cyan Blur */}
            <div className="absolute bottom-[-100px] right-[-50px] w-[240px] h-[240px] rounded-full bg-[#00F5FF] opacity-[0.04] dark:opacity-[0.07] blur-[65px] animate-blob-orbit-2" />
            {/* Ambient Pink Blur */}
            <div className="absolute top-[30%] left-[35%] w-[220px] h-[220px] rounded-full bg-[#EC4899] opacity-[0.03] dark:opacity-[0.05] blur-[60px] animate-blob-orbit-3" />
          </div>

          {/* Stepper circles row half-attached to the top edge */}
          <AIStepper
            steps={[
              {
                id: "resource",
                label: "Plocha",
                icon: <MapPin size={18} />,
                isCompleted: !!consoleState.resourceName,
                tooltip: consoleState.resourceName ? `Plocha: ${consoleState.resourceName}` : "Plocha",
                animationDelay: "0ms"
              },
              {
                id: "day",
                label: "Datum",
                icon: <Calendar size={18} />,
                isCompleted: consoleState.dayIndex !== null,
                tooltip: consoleState.dayIndex !== null ? `Datum: ${getDayNameCzech(consoleState.dayIndex)}` : "Datum",
                animationDelay: "75ms"
              },
              {
                id: "time",
                label: "Čas",
                icon: <Clock size={18} />,
                isCompleted: consoleState.startHour !== null,
                isError: consoleState.hasConflict,
                tooltip: consoleState.startHour !== null ? `Čas: ${formatDecimalToTimeString(consoleState.startHour)}` : "Čas",
                animationDelay: "150ms"
              },
              {
                id: "client",
                label: "Klient",
                icon: <User size={18} />,
                isCompleted: !!consoleState.userName && !!consoleState.resourceName && consoleState.dayIndex !== null && consoleState.startHour !== null,
                tooltip: consoleState.userName ? `Klient: ${consoleState.userName}` : "Klient",
                animationDelay: "225ms"
              }
            ]}
          />

          {/* Inline header details showing parameter summary */}
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5 z-10 mt-1 select-none">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-450 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.7)]" />
              <span className="text-[10px] tracking-widest uppercase font-extrabold text-purple-400">
                {isListening ? "ReKeeper poslouchá..." : isLoading ? "Zpracovávám..." : "ReKeeper: Timekeeper"}
              </span>
            </div>
            {/* Tiny summary line of completed steps */}
            <div className="flex gap-2 text-[9px] font-bold text-zinc-400 tracking-wide max-w-[55%] truncate">
              {consoleState.resourceName && <span className="text-blue-400 truncate">● {consoleState.resourceName}</span>}
              {consoleState.dayIndex !== null && <span className="text-purple-400 truncate">● {getDayNameCzech(consoleState.dayIndex)}</span>}
              {consoleState.recurrencePattern && consoleState.recurrencePattern !== "none" && (
                <span className="text-pink-400 truncate">
                  ● Opakování: {consoleState.recurrencePattern === "weekly" ? "Týdně" : consoleState.recurrencePattern === "bi-weekly" ? "Každé 2 týdny" : "Měsíčně"} ({consoleState.recurrenceCount}x)
                </span>
              )}
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
                title={isVoiceOutputEnabled ? "Mluvení zapnuto" : "Mluvení vypnuto"}
              >
                {isVoiceOutputEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              </button>
              <button
                onClick={handleReset}
                className="p-1.5 rounded-lg border border-white/5 text-zinc-500 hover:text-rose-450 hover:border-rose-500/35 hover:bg-rose-500/5 transition-all cursor-pointer"
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

          {/* Overlap conflict warning alert box */}
          {consoleState.hasConflict && (
            <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/15 space-y-2.5 animate-fadeIn z-10">
              <div className="flex gap-2">
                <AlertTriangle size={13} className="text-rose-500 shrink-0 mt-0.5" />
                <p className="text-[10.5px] text-zinc-300 leading-normal">
                  {consoleState.conflictMessage || "Zvolený termín je již obsazen."}
                </p>
              </div>
              
              {consoleState.suggestedAlternativeTime !== null && (
                <div className="p-2.5 bg-black/35 border border-white/5 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-[10px] font-semibold text-emerald-400">
                    Doporučeno: {getDayNameCzech(consoleState.dayIndex)} od {formatDecimalToTimeString(consoleState.suggestedAlternativeTime)}
                  </span>
                  <button
                    onClick={handleApplyAlternative}
                    className="text-[9px] font-extrabold bg-emerald-500 hover:bg-emerald-400 text-black px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-0.5"
                  >
                    Zvolit návrh <ChevronRight size={10} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Siri fluid waveforms or conversation response text */}
          {isListening ? (
            <AIWaveform />
          ) : (
            <div className="text-[11.5px] text-zinc-200 italic min-h-[38px] flex items-center bg-slate-950/40 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] select-none leading-relaxed break-words z-10">
              {messages[messages.length - 1]?.content || "Jak vám mohu pomoci?"}
            </div>
          )}

          {/* Input Hud bar + Confirm CTA */}
          <AIInputBar
            inputText={inputText}
            onChangeInput={(val) => {
              setInputText(val);
              lastInputWasVoiceRef.current = false;
            }}
            onSubmit={() => handleSend()}
            onMicClick={handleMicClick}
            onConfirm={handleManualConfirm}
            isListening={isListening}
            isLoading={isLoading}
            isSpeechSupported={isSpeechSupported}
            isReadyToConfirm={isReadyToConfirm}
          />
        </div>
      )}
    </>
  );
}

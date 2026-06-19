"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Building, Clock, ArrowRight, Check, Sparkles, Cpu, ShieldAlert, Loader2, User, Smile
} from "lucide-react";
import AIStepper from "./AIStepper";

interface AdminOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  tenantName: string;
  tenantVertical: string;
  initialTagline?: string;
  onCompleted: () => void;
}

interface Facility {
  name: string;
  capacity: number;
  price: number;
  surface?: string;
  parentName?: string;
  openTime?: string;
  closeTime?: string;
  openingHours?: OpeningHoursDay[];
}

interface TreeNode {
  facility: Facility;
  children: TreeNode[];
}

interface OpeningHoursDay {
  dayOfWeek: number;
  name: string;
  openTime: string;
  closeTime: string;
  closed: boolean;
}

interface OnboardingState {
  tagline: string;
  openTime: string;
  closeTime: string;
  openingHours: OpeningHoursDay[];
  facilities: Facility[];
  device: {
    name: string;
    active: boolean;
  } | null;
  deviceSkipped?: boolean;
}

export default function AdminOnboardingWizard({
  isOpen,
  onClose,
  tenantId,
  tenantName,
  tenantVertical,
  initialTagline = "",
  onCompleted
}: AdminOnboardingWizardProps) {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [chatState, setChatState] = useState<OnboardingState>({
    tagline: initialTagline || "",
    openTime: "",
    closeTime: "",
    openingHours: [],
    facilities: [],
    device: null
  });

  const [allInformationCollected, setAllInformationCollected] = useState(false);
  const [currentStage, setCurrentStage] = useState<string>("welcome");

  const STAGE_ORDER = ["welcome", "tagline", "hours", "resource", "access", "summary"];
  const isStagePast = (stageToCheck: string) => {
    const checkIdx = STAGE_ORDER.indexOf(stageToCheck);
    const currentIdx = STAGE_ORDER.indexOf(currentStage);
    return currentIdx > checkIdx;
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isChatLoading, isOpen]);

  // Fetch initial greeting on mount
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setIsChatLoading(true);
      fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "onboarding_chat",
          data: {
            messages: [],
            state: chatState,
            tenantId,
            tenantName,
            tenantVertical
          }
        })
      })
      .then(res => res.json())
      .then(resData => {
        if (resData.status === "success") {
          setMessages([{ role: "assistant", content: resData.reply }]);
          if (resData.state) {
            setChatState(resData.state);
          }
          if (resData.currentStage) {
            setCurrentStage(resData.currentStage);
          }
          setAllInformationCollected(!!resData.allInformationCollected);
        } else {
          setMessages([{ role: "assistant", content: `Vítejte v administraci portálu ${tenantName}! Jsem ReKeeper a pomohu vám uvést váš portál do provozu přes jednoduchý chat. Pro začátek mi prosím napište tagline/podtitul vašeho portálu.` }]);
        }
      })
      .catch(err => {
        console.error("Error fetching greeting:", err);
        setMessages([{ role: "assistant", content: `Dobrý den! Jsem ReKeeper a pomohu vám uvést váš portál ${tenantName} do provozu. Pro začátek mi prosím napište tagline/podtitul vašeho portálu.` }]);
      })
      .finally(() => setIsChatLoading(false));
    }
  }, [isOpen, tenantName, tenantVertical, tenantId]);

  if (!isOpen) return null;

  const sendChatMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const newMsg = { role: "user" as const, content: textToSend };
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setInputText("");
    setIsChatLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "onboarding_chat",
          data: {
            messages: updatedMessages,
            state: chatState,
            tenantId,
            tenantName,
            tenantVertical
          }
        })
      });

      if (!res.ok) {
        throw new Error("Komunikace s AI selhala. Zkontrolujte připojení k internetu.");
      }

      const resData = await res.json();
      if (resData.status === "success") {
        setMessages(prev => [...prev, { role: "assistant", content: resData.reply }]);
        if (resData.state) {
          setChatState(resData.state);
        }
        if (resData.currentStage) {
          setCurrentStage(resData.currentStage);
        }
        setAllInformationCollected(!!resData.allInformationCollected);
      } else {
        throw new Error(resData.reply || "Komunikace s AI selhala.");
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      setErrorMsg(err.message || "Během komunikace s AI došlo k chybě.");
    } finally {
      setIsChatLoading(false);
    }
  };

  const buildFacilitiesTree = (facilities: Facility[]): TreeNode[] => {
    const nodesMap: Record<string, TreeNode> = {};
    const roots: TreeNode[] = [];

    // Initialize all nodes
    facilities.forEach(fac => {
      nodesMap[fac.name] = { facility: fac, children: [] };
    });

    // Link parents and children
    facilities.forEach(fac => {
      const node = nodesMap[fac.name];
      if (fac.parentName && nodesMap[fac.parentName]) {
        nodesMap[fac.parentName].children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const fac = node.facility;
    const paddingLeft = depth * 12; // indentation in pixels
    
    // Check if this facility has custom hours
    const hasCustomHours = (fac.openingHours && fac.openingHours.length > 0) || (fac.openTime && fac.closeTime);
    let hoursText = "";
    if (hasCustomHours) {
      if (fac.openTime && fac.closeTime) {
        hoursText = `${fac.openTime}—${fac.closeTime}`;
      } else if (fac.openingHours) {
        const openDays = fac.openingHours.filter(d => !d.closed);
        if (openDays.length === 0) {
          hoursText = "Zavřeno";
        } else {
          const first = openDays[0];
          hoursText = `${first.openTime}—${first.closeTime}`;
        }
      }
    }

    return (
      <div key={fac.name} className="space-y-1 py-1 border-b border-white/[0.03] last:border-b-0">
        <div className="flex items-center justify-between text-[10.5px]">
          <div className="flex items-center min-w-0 pr-2" style={{ paddingLeft: `${paddingLeft}px` }}>
            {depth > 0 && (
              <span className="text-purple-500/70 mr-1 select-none font-bold">↳</span>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-zinc-200 truncate" title={fac.name}>
                {fac.name}
              </span>
              {hoursText && (
                <span className="text-[8px] text-zinc-400 font-medium flex items-center gap-0.5 mt-0.5">
                  <Clock size={8} className="shrink-0" /> {hoursText}
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 text-[9.5px]">
            <span className="bg-white/5 border border-white/[0.04] px-1.5 py-0.5 rounded text-zinc-400 font-medium">
              {fac.capacity} os.
            </span>
            <span className="text-purple-400 font-bold">
              {fac.price} Kč
            </span>
          </div>
        </div>
        
        {/* Render children recursively */}
        {node.children.map(child => renderTreeNode(child, depth + 1))}
      </div>
    );
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // 1. Save Tenant Settings (Tagline, openTime, closeTime, onboardingCompleted = true)
      const czechDayNames = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"];
      const dayIndices = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun
      
      const topLevelBranches = chatState.facilities.filter(f => !f.parentName);
      const branchesWithHours = topLevelBranches.filter(f => (f.openingHours && f.openingHours.length > 0) || (f.openTime && f.closeTime));

      let openingHours: OpeningHoursDay[] = [];
      let openTime = "";
      let closeTime = "";
      let hasHours = false;

      const hasGlobalHours = !!((chatState.openingHours && chatState.openingHours.length > 0) || (chatState.openTime && chatState.closeTime));

      if (hasGlobalHours) {
        openingHours = chatState.openingHours && chatState.openingHours.length === 7
          ? chatState.openingHours
          : dayIndices.map((dayOfWeek, idx) => ({
              dayOfWeek,
              name: czechDayNames[idx],
              openTime: chatState.openTime || "08:00",
              closeTime: chatState.closeTime || "22:00",
              closed: false
            }));
        openTime = chatState.openTime || "08:00";
        closeTime = chatState.closeTime || "22:00";
        hasHours = true;
      } else if (branchesWithHours.length > 0) {
        // Compute the union/envelope of all top-level branch hours per day of week
        let earliestStartMinutes = 24 * 60;
        let latestEndMinutes = 0;
        let anyOpen = false;

        openingHours = dayIndices.map((dayOfWeek, idx) => {
          let dayOpenTime = "";
          let dayCloseTime = "";
          let dayClosed = true;

          branchesWithHours.forEach(branch => {
            let bOpen = "";
            let bClose = "";
            let bClosed = false;

            if (branch.openingHours && branch.openingHours.length === 7) {
              const dayData = branch.openingHours.find(d => d.dayOfWeek === dayOfWeek);
              if (dayData) {
                bOpen = dayData.openTime;
                bClose = dayData.closeTime;
                bClosed = dayData.closed;
              }
            } else if (branch.openTime && branch.closeTime) {
              bOpen = branch.openTime;
              bClose = branch.closeTime;
              bClosed = false;
            }

            if (bOpen && bClose && !bClosed) {
              dayClosed = false;
              anyOpen = true;

              const [hOpen, mOpen] = bOpen.split(":").map(Number);
              const [hClose, mClose] = bClose.split(":").map(Number);
              const openMin = hOpen * 60 + mOpen;
              const closeMin = hClose * 60 + mClose;

              if (dayOpenTime) {
                const [curHOpen, curMOpen] = dayOpenTime.split(":").map(Number);
                const curOpenMin = curHOpen * 60 + curMOpen;
                if (openMin < curOpenMin) dayOpenTime = bOpen;
              } else {
                dayOpenTime = bOpen;
              }

              if (dayCloseTime) {
                const [curHClose, curMClose] = dayCloseTime.split(":").map(Number);
                const curCloseMin = curHClose * 60 + curMClose;
                if (closeMin > curCloseMin) dayCloseTime = bClose;
              } else {
                dayCloseTime = bClose;
              }

              if (openMin < earliestStartMinutes) earliestStartMinutes = openMin;
              if (closeMin > latestEndMinutes) latestEndMinutes = closeMin;
            }
          });

          return {
            dayOfWeek,
            name: czechDayNames[idx],
            openTime: dayClosed ? "08:00" : dayOpenTime,
            closeTime: dayClosed ? "22:00" : dayCloseTime,
            closed: dayClosed
          };
        });

        if (anyOpen) {
          const pad = (n: number) => String(n).padStart(2, "0");
          openTime = `${pad(Math.floor(earliestStartMinutes / 60))}:${pad(earliestStartMinutes % 60)}`;
          closeTime = `${pad(Math.floor(latestEndMinutes / 60))}:${pad(latestEndMinutes % 60)}`;
          hasHours = true;
        } else {
          openTime = "08:00";
          closeTime = "22:00";
          hasHours = false;
        }
      } else {
        // Fallback default
        openingHours = dayIndices.map((dayOfWeek, idx) => ({
          dayOfWeek,
          name: czechDayNames[idx],
          openTime: "08:00",
          closeTime: "22:00",
          closed: false
        }));
        openTime = "08:00";
        closeTime = "22:00";
        hasHours = false;
      }

      const settingsData = {
        id: tenantId,
        attributes: {
          tagline: chatState.tagline,
          openTime,
          closeTime,
          openingHours,
          onboardingCompleted: true,
          adminEmails: [`admin@${tenantId}.cz`]
        }
      };

      const settingsRes = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tenant_settings_update", data: settingsData })
      });

      if (!settingsRes.ok) {
        throw new Error("Nepodařilo se uložit nastavení portálu.");
      }

      // 2. Loop through facilities list and create resources (and rules)
      const createdResourceMap: Record<string, string> = {}; // map parentName -> database resource ID

      // Sort facilities so parents are created before their children (n-level depth dependency sort)
      const sortedFacilities: Facility[] = [];
      const remaining = [...chatState.facilities];
      let progress = true;
      while (remaining.length > 0 && progress) {
        progress = false;
        for (let i = 0; i < remaining.length; i++) {
          const fac = remaining[i];
          const parentAlreadyCreated = !fac.parentName || sortedFacilities.some(f => f.name === fac.parentName);
          const parentInRemaining = fac.parentName && remaining.some(f => f.name === fac.parentName);
          if (parentAlreadyCreated || !parentInRemaining) {
            sortedFacilities.push(fac);
            remaining.splice(i, 1);
            i--;
            progress = true;
          }
        }
      }
      if (remaining.length > 0) {
        sortedFacilities.push(...remaining);
      }

      const defaultGlobalOpeningHours = dayIndices.map((dayOfWeek, idx) => ({
        dayOfWeek,
        name: czechDayNames[idx],
        openTime: chatState.openTime || "08:00",
        closeTime: chatState.closeTime || "22:00",
        closed: false
      }));

      for (const fac of sortedFacilities) {
        const parentId = fac.parentName ? createdResourceMap[fac.parentName] : undefined;

        // Check if this facility has specific opening hours, otherwise fallback recursively to parent branch or global hours
        const facilityHasSpecificHours = (fac.openingHours && fac.openingHours.length > 0) || (fac.openTime && fac.closeTime);
        
        let facOpeningHours = openingHours;
        let facHasHours = hasHours;

        if (facilityHasSpecificHours) {
          const facOpenTime = fac.openTime || chatState.openTime || "08:00";
          const facCloseTime = fac.closeTime || chatState.closeTime || "22:00";
          facOpeningHours = dayIndices.map((dayOfWeek, idx) => {
            const existingDay = fac.openingHours?.find(d => d.dayOfWeek === dayOfWeek);
            if (existingDay) return existingDay;
            return {
              dayOfWeek,
              name: czechDayNames[idx],
              openTime: facOpenTime,
              closeTime: facCloseTime,
              closed: false
            };
          });
          facHasHours = true;
        } else {
          // Traverse parents to find hours
          let currentParentName = fac.parentName;
          let parentFac = chatState.facilities.find(f => f.name === currentParentName);
          let foundParentHours = false;
          while (parentFac) {
            const parentHasSpecificHours = (parentFac.openingHours && parentFac.openingHours.length > 0) || (parentFac.openTime && parentFac.closeTime);
            if (parentHasSpecificHours) {
              const pOpenTime = parentFac.openTime || chatState.openTime || "08:00";
              const pCloseTime = parentFac.closeTime || chatState.closeTime || "22:00";
              facOpeningHours = dayIndices.map((dayOfWeek, idx) => {
                const existingDay = parentFac?.openingHours?.find(d => d.dayOfWeek === dayOfWeek);
                if (existingDay) return existingDay;
                return {
                  dayOfWeek,
                  name: czechDayNames[idx],
                  openTime: pOpenTime,
                  closeTime: pCloseTime,
                  closed: false
                };
              });
              facHasHours = true;
              foundParentHours = true;
              break;
            }
            currentParentName = parentFac.parentName;
            parentFac = currentParentName ? chatState.facilities.find(f => f.name === currentParentName) : undefined;
          }
          if (!foundParentHours) {
            // Fallback to user-defined global hours or default, NOT the union of other branches
            facOpeningHours = hasGlobalHours ? openingHours : defaultGlobalOpeningHours;
            facHasHours = hasGlobalHours || !!(chatState.openTime && chatState.closeTime);
          }
        }

        // Get calculated start/end times if any open days exist
        let facOpenTimeVal = undefined;
        let facCloseTimeVal = undefined;
        if (facHasHours && facOpeningHours && facOpeningHours.length > 0) {
          const openDays = facOpeningHours.filter(d => !d.closed);
          if (openDays.length > 0) {
            let earliest = "24:00";
            let latest = "00:00";
            openDays.forEach(d => {
              if (d.openTime && d.openTime < earliest) earliest = d.openTime;
              if (d.closeTime && d.closeTime > latest) latest = d.closeTime;
            });
            facOpenTimeVal = earliest;
            facCloseTimeVal = latest;
          }
        }

        const resourceData = {
          tenantId,
          name: fac.name,
          type: tenantVertical === "EDUCATIONAL_COURSE" ? "COURSE_PROGRAM" : "SPACE",
          maxCapacity: parseInt(String(fac.capacity), 10) || 10,
          attributes: {
            surface: fac.surface || undefined,
            price: String(fac.price || 0),
            parentId: parentId || undefined,
            openTime: facOpenTimeVal,
            closeTime: facCloseTimeVal,
            openingHours: facHasHours ? facOpeningHours : undefined
          }
        };

        const resourceRes = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "resource_upsert", data: resourceData })
        });

        if (!resourceRes.ok) {
          throw new Error(`Nepodařilo se vytvořit první rezervační zdroj ${fac.name}.`);
        }

        const resourceResult = await resourceRes.json();
        const createdResource = resourceResult.resource;

        if (createdResource && createdResource.id) {
          // Store mapping for children references
          createdResourceMap[fac.name] = createdResource.id;

          if (facHasHours && facOpeningHours && facOpeningHours.length > 0) {
            // Group days by their openTime and closeTime to create day-specific ScheduleRules
            const hourGroups: Record<string, { days: number[]; open: string; close: string }> = {};
            
            facOpeningHours.forEach(day => {
              if (day.closed) return;
              const key = `${day.openTime}-${day.closeTime}`;
              if (!hourGroups[key]) {
                hourGroups[key] = { days: [], open: day.openTime, close: day.closeTime };
              }
              hourGroups[key].days.push(day.dayOfWeek);
            });

            for (const key of Object.keys(hourGroups)) {
              const group = hourGroups[key];
              const ruleData = {
                tenantId,
                resourceId: createdResource.id,
                name: "Standardní provoz",
                startTime: group.open,
                endTime: group.close,
                price: fac.price || 0,
                maxCapacity: fac.capacity || 10,
                daysOfWeek: group.days
              };

              const ruleRes = await fetch("/api/admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "rule_upsert", data: ruleData })
              });

              if (!ruleRes.ok) {
                console.warn(`Could not create default schedule rule slot for resource ${fac.name}`);
              }
            }
          }
        }
      }

      // 3. Create optional IoT checkin reader device
      // 3. Create optional IoT checkin reader device
      if (chatState.device && chatState.device.name && chatState.device.name.trim() !== "") {
        const deviceData = {
          tenantId,
          name: chatState.device.name,
          active: chatState.device.active ?? true
        };

        const deviceRes = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "device_upsert", data: deviceData })
        });

        if (!deviceRes.ok) {
          console.warn("Could not create IoT scanner device.");
        }
      }

      // Onboarding successfully completed
      onCompleted();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Během ukládání konfigurace došlo k chybě.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDayGroupRange = (days: number[], shortNames: Record<number, string>) => {
    if (days.length === 7) return "Po–Ne";
    const isWeekdays = days.length === 5 && [1, 2, 3, 4, 5].every(d => days.includes(d));
    if (isWeekdays) return "Po–Pá";
    const isWeekend = days.length === 2 && [6, 0].every(d => days.includes(d));
    if (isWeekend) return "So–Ne";
    return days.map(d => shortNames[d]).join(", ");
  };

  const formatFacilityHours = (fac: Facility) => {
    const hasSpecific = (fac.openingHours && fac.openingHours.length > 0) || (fac.openTime && fac.closeTime);
    if (!hasSpecific) return null;
    
    if (fac.openingHours && fac.openingHours.length > 0) {
      const dayShortNames: Record<number, string> = {
        1: "Po", 2: "Út", 3: "St", 4: "Čt", 5: "Pá", 6: "So", 0: "Ne"
      };

      const groups: { openTime: string; closeTime: string; closed: boolean; days: number[] }[] = [];
      const orderedDays = [1, 2, 3, 4, 5, 6, 0];

      orderedDays.forEach(dayOfWeek => {
        const dayData = fac.openingHours!.find(d => d.dayOfWeek === dayOfWeek);
        if (!dayData) return;

        const match = groups.find(g => g.openTime === dayData.openTime && g.closeTime === dayData.closeTime && g.closed === dayData.closed);
        if (match) {
          match.days.push(dayOfWeek);
        } else {
          groups.push({
            openTime: dayData.openTime,
            closeTime: dayData.closeTime,
            closed: dayData.closed,
            days: [dayOfWeek]
          });
        }
      });
      
      return (
        <div className="space-y-0.5 pl-2 border-l border-purple-500/30">
          {groups.map((g, idx) => {
            const formattedDays = formatDayGroupRange(g.days, dayShortNames);
            return (
              <div key={idx} className="flex justify-between items-center text-[9.5px]">
                <span className="text-zinc-400 font-medium">{formattedDays}:</span>
                {g.closed ? (
                  <span className="text-rose-400/80 font-medium">Zavřeno</span>
                ) : (
                  <span className="text-zinc-300 font-semibold">{g.openTime}—{g.closeTime}</span>
                )}
              </div>
            );
          })}
        </div>
      );
    } else if (fac.openTime && fac.closeTime) {
      return (
        <div className="text-[9.5px] text-zinc-300 font-semibold pl-2 border-l border-purple-500/30">
          {fac.openTime}—{fac.closeTime} (Po–Ne)
        </div>
      );
    }
    return null;
  };

  const formatOpeningHoursDisplay = () => {
    // 1. Check if there are top-level branches with custom hours
    const topLevelBranches = chatState.facilities.filter(f => !f.parentName);
    const branchesWithHours = topLevelBranches.filter(f => (f.openingHours && f.openingHours.length > 0) || (f.openTime && f.closeTime));
    
    if (branchesWithHours.length > 0) {
      return (
        <div className="space-y-2">
          {branchesWithHours.map(branch => {
            const hoursNode = formatFacilityHours(branch);
            if (!hoursNode) return null;
            return (
              <div key={branch.name} className="space-y-1">
                <div className="text-[10px] font-semibold text-purple-300">{branch.name}</div>
                {hoursNode}
              </div>
            );
          })}
        </div>
      );
    }

    // 2. Otherwise fall back to global hours
    const isActuallyConfigured = chatState.openingHours && chatState.openingHours.length > 0 && 
      chatState.openingHours.some(day => !day.closed && day.openTime && day.closeTime);

    if (!isActuallyConfigured) {
      if (chatState.openTime && chatState.closeTime) {
        return <span className="text-zinc-200 font-bold">{chatState.openTime} — {chatState.closeTime} (Po–Ne)</span>;
      }
      return <span className="text-zinc-600 font-medium italic animate-pulse">Nenastaveno</span>;
    }

    const dayShortNames: Record<number, string> = {
      1: "Po", 2: "Út", 3: "St", 4: "Čt", 5: "Pá", 6: "So", 0: "Ne"
    };

    const groups: { openTime: string; closeTime: string; closed: boolean; days: number[] }[] = [];
    const orderedDays = [1, 2, 3, 4, 5, 6, 0];

    orderedDays.forEach(dayOfWeek => {
      const dayData = chatState.openingHours.find(d => d.dayOfWeek === dayOfWeek);
      if (!dayData) return;

      const match = groups.find(g => g.openTime === dayData.openTime && g.closeTime === dayData.closeTime && g.closed === dayData.closed);
      if (match) {
        match.days.push(dayOfWeek);
      } else {
        groups.push({
          openTime: dayData.openTime,
          closeTime: dayData.closeTime,
          closed: dayData.closed,
          days: [dayOfWeek]
        });
      }
    });

    return (
      <div className="space-y-1">
        {groups.map((g, idx) => {
          const formattedDays = formatDayGroupRange(g.days, dayShortNames);
          return (
            <div key={idx} className="flex justify-between items-center text-[10.5px] border-b border-white/[0.02] last:border-b-0 py-0.5">
              <span className="text-zinc-400 font-medium">{formattedDays}</span>
              {g.closed ? (
                <span className="text-rose-400 font-semibold">Zavřeno</span>
              ) : (
                <span className="text-zinc-200 font-bold">{g.openTime} — {g.closeTime}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05050A]/75 backdrop-blur-md p-4 animate-fadeIn font-sans">
      <div className="relative w-full max-w-[850px] animated-glowing-border p-6 pt-14 pb-6 flex flex-col gap-6 text-foreground transition-all duration-350 font-sans z-10 bg-[#0A0A15]/90 rounded-[28px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        
        {/* Subtle breathing liquid background mesh matching the design language */}
        <div className="absolute inset-0 rounded-[28px] overflow-hidden pointer-events-none z-0">
          {/* Ambient Purple Blur */}
          <div className="absolute top-[-80px] left-[-60px] w-[260px] h-[260px] rounded-full bg-[#7000FF] opacity-[0.05] dark:opacity-[0.08] blur-[70px] animate-blob-orbit-1" />
          {/* Ambient Cyan Blur */}
          <div className="absolute bottom-[-100px] right-[-50px] w-[240px] h-[240px] rounded-full bg-[#00F5FF] opacity-[0.04] dark:opacity-[0.07] blur-[65px] animate-blob-orbit-2" />
          {/* Ambient Pink Blur */}
          <div className="absolute top-[30%] left-[35%] w-[220px] h-[220px] rounded-full bg-[#EC4899] opacity-[0.03] dark:opacity-[0.05] blur-[60px] animate-blob-orbit-3" />
        </div>

        {/* Stepper circles row half-attached to the top edge (non-clickable checklist badges) */}
        <AIStepper
          steps={[
            {
              id: "welcome",
              label: "Vítejte",
              icon: <Smile size={18} />,
              isCompleted: isStagePast("welcome") || messages.length > 1,
              tooltip: "Úvodní představení",
              animationDelay: "0ms"
            },
            {
              id: "tagline",
              label: "Prezentace",
              icon: <Sparkles size={18} />,
              isCompleted: !!chatState.tagline.trim() || isStagePast("tagline"),
              tooltip: chatState.tagline ? `Podtitul: ${chatState.tagline}` : "Slogan / Podtitul",
              animationDelay: "50ms"
            },
            {
              id: "hours",
              label: "Provoz",
              icon: <Clock size={18} />,
              isCompleted: (chatState.openingHours.length > 0 && chatState.openingHours.some(day => !day.closed && day.openTime && day.closeTime)) || 
                (!!chatState.openTime && !!chatState.closeTime) || 
                chatState.facilities.some(f => !f.parentName && ((f.openingHours && f.openingHours.length > 0) || (!!f.openTime && !!f.closeTime))) ||
                isStagePast("hours"),
              tooltip: (chatState.openingHours.length > 0 && chatState.openingHours.some(day => !day.closed && day.openTime && day.closeTime)) || 
                (chatState.openTime && chatState.closeTime) ||
                chatState.facilities.some(f => !f.parentName && ((f.openingHours && f.openingHours.length > 0) || (f.openTime && f.closeTime))) 
                  ? "Provozní doba nastavena" 
                  : "Otevírací doba",
              animationDelay: "100ms"
            },
            {
              id: "resource",
              label: "Zdroje",
              icon: <Building size={18} />,
              isCompleted: chatState.facilities.length > 0 || isStagePast("resource"),
              tooltip: chatState.facilities.length > 0 ? `Zapsáno ${chatState.facilities.length} zdrojů` : "Hlavní zdroje a kapacity",
              animationDelay: "150ms"
            },
            {
              id: "access",
              label: "Přístup",
              icon: <Cpu size={18} />,
              isCompleted: chatState.device !== null || isStagePast("access") || allInformationCollected,
              tooltip: chatState.device?.name ? `IoT Brána: ${chatState.device.name}` : "IoT přístup (volitelný)",
              animationDelay: "200ms"
            },
            {
              id: "summary",
              label: "Shrnutí",
              icon: <User size={18} />,
              isCompleted: allInformationCollected,
              tooltip: allInformationCollected ? "Konfigurace dokončena" : "Dokončení a kontrola",
              animationDelay: "250ms"
            }
          ]}
        />

        {/* Stepper Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3 select-none shrink-0 z-10">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.7)]" />
            <span className="text-[10px] tracking-widest uppercase font-extrabold text-purple-400">
              ReKeeper: Onboarding portálu
            </span>
          </div>
          <span className="text-[10px] font-bold text-zinc-400">
            Konverzační Asistent
          </span>
        </div>

        {/* Validation Errors */}
        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3.5 rounded-2xl flex items-start gap-2 animate-fadeIn shrink-0 z-10">
            <ShieldAlert size={16} className="shrink-0 mt-0.5 text-rose-500" />
            <span className="leading-normal font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Dynamic Onboarding layout */}
        <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-[480px] max-h-[580px] overflow-hidden z-10">
          {/* Left Column: Chat Area */}
          <div className="flex-1 flex flex-col bg-slate-950/20 backdrop-blur-md border border-white/[0.04] rounded-2xl p-4 overflow-hidden relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]">
            
            {/* Scrollable message container */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 scrollbar-thin scrollbar-thumb-purple-900/30 scrollbar-track-transparent">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 items-start ${
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  } animate-fadeIn`}
                >
                  {msg.role === "assistant" ? (
                    <div className="h-8 w-8 rounded-lg bg-purple-600/10 border border-purple-500/25 flex items-center justify-center text-purple-400 shrink-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]">
                      <Sparkles size={14} className="animate-pulse" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-emerald-600/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]">
                      <User size={14} />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[75%] rounded-2xl p-3 text-[11.5px] leading-relaxed font-medium ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 text-emerald-200"
                        : "bg-slate-950/50 border border-white/[0.06] text-zinc-200"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>
              ))}

              {isChatLoading && (
                <div className="flex gap-3 items-start animate-pulse">
                  <div className="h-8 w-8 rounded-lg bg-purple-600/10 border border-purple-500/25 flex items-center justify-center text-purple-400 shrink-0">
                    <Loader2 size={14} className="animate-spin text-purple-400" />
                  </div>
                  <div className="max-w-[75%] rounded-2xl p-3 bg-slate-950/40 border border-white/[0.04] text-zinc-500 text-xs">
                    ReKeeper přemýšlí...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="relative flex items-center gap-2 border-t border-white/5 pt-3 shrink-0">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isChatLoading) {
                    sendChatMessage(inputText);
                  }
                }}
                placeholder={isChatLoading ? "Čekám na odpověď..." : "Napište zprávu ReKeeperovi..."}
                disabled={isChatLoading}
                className="flex-1 bg-slate-950/60 focus:bg-slate-950/80 border border-white/10 focus:border-purple-500/40 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none transition-all disabled:opacity-50"
              />
              <button
                onClick={() => sendChatMessage(inputText)}
                disabled={isChatLoading || !inputText.trim()}
                className="p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all shadow-[0_0_10px_rgba(147,51,234,0.3)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Right Column: Live Configuration Dashboard */}
          <div className="w-full md:w-[300px] flex flex-col bg-slate-950/30 backdrop-blur-md border border-white/[0.06] rounded-2xl p-4 overflow-y-auto scrollbar-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] shrink-0">
            <h3 className="text-[10px] tracking-widest uppercase font-extrabold text-purple-400 mb-3 select-none flex items-center gap-1.5 border-b border-white/5 pb-2">
              <Building size={12} /> Průběžná Konfigurace
            </h3>

            <div className="space-y-4 flex-1">
              {/* Tagline config */}
              <div className="space-y-1">
                <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-500">Podtitul (Tagline)</span>
                <div className="p-2.5 bg-slate-950/40 rounded-xl border border-white/[0.04] text-[11px]">
                  {chatState.tagline ? (
                    <span className="text-zinc-200 font-semibold italic">"{chatState.tagline}"</span>
                  ) : (
                    <span className="text-zinc-600 font-medium italic">Nenastaveno</span>
                  )}
                </div>
              </div>

              {/* Operating Hours config */}
              <div className="space-y-1">
                <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-500">Provozní Doba</span>
                <div className="p-2.5 bg-slate-950/40 rounded-xl border border-white/[0.04]">
                  {formatOpeningHoursDisplay()}
                </div>
              </div>

              {/* Resources list config */}
              <div className="space-y-1">
                <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-500">Zdroje & Kapacity</span>
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-purple-900/30 scrollbar-track-transparent border border-white/[0.04] bg-slate-950/20 rounded-xl p-2.5">
                  {chatState.facilities.length > 0 ? (
                    buildFacilitiesTree(chatState.facilities).map(node => renderTreeNode(node, 0))
                  ) : (
                    <div className="p-2.5 text-center text-[11px] text-zinc-600 font-medium italic animate-pulse">
                      Žádné zdroje
                    </div>
                  )}
                </div>
              </div>

              {/* IoT scanner config */}
              <div className="space-y-1">
                <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-500">IoT QR Čtečka</span>
                <div className="p-2.5 bg-slate-950/40 rounded-xl border border-white/[0.04] text-[11px]">
                  {chatState.device?.name ? (
                    <span className="text-zinc-200 font-semibold">{chatState.device.name}</span>
                  ) : (
                    <span className="text-zinc-600 font-medium italic">Nenastaveno / přeskočeno</span>
                  )}
                </div>
              </div>

              {/* Admin Profile Details */}
              <div className="space-y-1 pt-2 border-t border-white/5">
                <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-500">Administrátorský Účet</span>
                <div className="p-2.5 bg-slate-950/40 rounded-xl border border-white/[0.04] text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">E-mail:</span>
                    <span className="text-zinc-300 font-mono select-all">admin@{tenantId}.cz</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Heslo:</span>
                    <span className="text-zinc-300 font-mono select-all">{tenantId}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons footer */}
        <div className="flex items-center justify-between border-t border-white/5 pt-4 shrink-0 select-none z-10">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-3 border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-extrabold rounded-2xl transition-all cursor-pointer disabled:opacity-50"
          >
            Storno
          </button>

          <button
            onClick={handleSubmit}
            disabled={isLoading || !allInformationCollected}
            className={`px-6 py-3 text-black text-xs font-extrabold rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              allInformationCollected
                ? "bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-[0_0_20px_rgba(16,185,129,0.5)] animate-pulse"
                : "bg-zinc-700 text-zinc-400"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin text-black" />
                Spouštím portál...
              </>
            ) : (
              <>
                Vytvořit portál a spustit
                <Check size={14} />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

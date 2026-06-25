"use client";

import React, { useState } from "react";
import { Play, Loader2, CheckCircle2, XCircle, Wifi } from "lucide-react";

interface ScenarioRequest {
  deviceId: string;
  deviceToken: string;
  qrPayload: string;
}

interface ScenarioResponse {
  status: string;
  userName?: string;
  resourceName?: string;
  command?: string;
  reason?: string;
  message?: string;
}

interface Scenario {
  id: string;
  name: string;
  badge: string;
  request: ScenarioRequest;
  response: ScenarioResponse;
  status: number;
  statusText: string;
  granted: boolean;
}

const scenarios: Scenario[] = [
  {
    id: "umelka-valid",
    name: "Platný QR - Umělka",
    badge: "Povoleno",
    request: {
      deviceId: "d1a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      deviceToken: "device_token_umelka_active",
      qrPayload: "b00f1234-5678-90ab-cdef-1234567890ab"
    },
    status: 200,
    statusText: "OK",
    response: {
      status: "granted",
      userName: "Josef Novák",
      resourceName: "Beach Volejbal Hřiště A",
      command: "open_gate"
    },
    granted: true
  },
  {
    id: "sfera-valid",
    name: "Platný QR - Sféra",
    badge: "Povoleno",
    request: {
      deviceId: "ae029f52-87c5-412e-b3d9-063db1a289b4",
      deviceToken: "device_token_sfera_active",
      qrPayload: "7b0b1234-5678-90ab-cdef-1234567890ab"
    },
    status: 200,
    statusText: "OK",
    response: {
      status: "granted",
      userName: "Ing. Anna Dvořáková",
      resourceName: "Kreativní dílna Sféra",
      command: "open_gate"
    },
    granted: true
  },
  {
    id: "expired",
    name: "Expirovaná rezervace",
    badge: "Zamítnuto",
    request: {
      deviceId: "d1a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      deviceToken: "device_token_umelka_active",
      qrPayload: "c99f8888-5678-90ab-cdef-1234567890ab"
    },
    status: 200,
    statusText: "OK",
    response: {
      status: "denied",
      reason: "invalid_time"
    },
    granted: false
  },
  {
    id: "unauthorized",
    name: "Neznámý token čtečky",
    badge: "Odmítnuto",
    request: {
      deviceId: "unknown_hacked_scanner",
      deviceToken: "bad_token_123",
      qrPayload: "b00f1234-5678-90ab-cdef-1234567890ab"
    },
    status: 401,
    statusText: "Unauthorized",
    response: {
      status: "denied",
      reason: "unauthorized"
    },
    granted: false
  }
];

export default function IoTSimulator() {
  const [activeScenario, setActiveScenario] = useState<Scenario>(scenarios[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [simulationResult, setSimulationResult] = useState<{
    status: number;
    statusText: string;
    body: ScenarioResponse;
    granted: boolean;
  } | null>(null);

  const runSimulation = (scenario: Scenario) => {
    setActiveScenario(scenario);
    setIsLoading(true);
    setSimulationResult(null);

    const timestamp = new Date().toLocaleTimeString();
    
    setConsoleLogs([
      `[${timestamp}] [NET] Inicializace spojení se zařízením...`,
      `[${timestamp}] [AUTH] ID: ${scenario.request.deviceId}`,
      `[${timestamp}] [SCAN] Naskenován QR kód: "${scenario.request.qrPayload.substring(0, 18)}..."`,
      `[${timestamp}] [POST] POST /api/device/checkin ...`
    ]);

    setTimeout(() => {
      setIsLoading(false);
      setSimulationResult({
        status: scenario.status,
        statusText: scenario.statusText,
        body: scenario.response,
        granted: scenario.granted
      });
      
      const resTime = new Date().toLocaleTimeString();
      setConsoleLogs(prev => [
        ...prev,
        `[${resTime}] [RESP] Status: HTTP ${scenario.status} ${scenario.statusText}`,
        scenario.granted 
          ? `[${resTime}] [OK] BRÁNA UVOLNĚNA: Příkaz: ${scenario.response.command}`
          : `[${resTime}] [DENIED] VSTUP ZAKÁZÁN: Důvod: ${scenario.response.reason}`
      ]);
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Simulation Selector Panel */}
      <div className="grid grid-cols-2 gap-3 select-none">
        {scenarios.map((scenario) => {
          const isActive = activeScenario.id === scenario.id;
          const isPovoleno = scenario.granted;
          return (
            <button
              key={scenario.id}
              onClick={() => runSimulation(scenario)}
              disabled={isLoading}
              className={`p-3.5 rounded-none border text-left transition-all relative overflow-hidden flex flex-col justify-between h-20 group cursor-pointer ${
                isActive
                  ? "bg-tenant-primary/10 border-tenant-primary/40 shadow-sm"
                  : "bg-white/45 dark:bg-[#07070C]/35 backdrop-blur-md border-slate-200/50 dark:border-[#1F1F35]/30 hover:bg-white/80 dark:hover:bg-[#131322]/40"
              }`}
            >
              <div className="flex justify-between items-start w-full">
                <span className={`text-[11px] font-bold transition-colors ${
                  isActive ? "text-tenant-primary" : "text-slate-700 dark:text-zinc-350"
                }`}>
                  {scenario.name}
                </span>
                <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-none border uppercase tracking-wider ${
                  isPovoleno 
                    ? "bg-tenant-primary/10 text-tenant-primary border-tenant-primary/20" 
                    : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                }`}>
                  {scenario.badge}
                </span>
              </div>
              
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono flex items-center gap-1 select-none">
                <Play size={10} className={isActive ? "text-tenant-primary" : ""} />
                Spustit test
              </span>
            </button>
          );
        })}
      </div>

      {/* Terminal Block */}
      <div className="bg-[#05050A]/95 border border-slate-200/20 dark:border-[#1F1F35]/70 rounded-none overflow-hidden shadow-2xl relative">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-[#08080E]/90 select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600/60 dark:bg-zinc-700/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600/60 dark:bg-zinc-700/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600/60 dark:bg-zinc-700/60" />
            <span className="text-[10px] text-slate-450 dark:text-zinc-400 font-mono font-bold ml-2 tracking-wider">
              iot-reader-checkin.sh
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 text-[9px] text-zinc-450 dark:text-zinc-400 font-mono uppercase bg-white/5 dark:bg-black/30 px-2.5 py-0.5 rounded-none border border-white/5">
            <Wifi size={10} className="text-tenant-primary animate-pulse" />
            Hardware Node
          </div>
        </div>

        {/* Terminal Screen split */}
        <div className="grid md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-white/5">
          {/* Left panel: Log flow & simulator info */}
          <div className="md:col-span-5 p-5 space-y-4 min-h-[250px] flex flex-col justify-between">
            <div className="space-y-2 font-mono text-[10.5px]">
              <div className="text-zinc-500 uppercase font-sans text-[8px] font-bold tracking-wider mb-2">Simulační logy čtečky:</div>
              {consoleLogs.length === 0 ? (
                <div className="text-zinc-500 italic py-4">Klikněte na jeden z výše uvedených scénářů pro spuštění testu čtečky...</div>
              ) : (
                consoleLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`${
                      log.includes("[OK]")
                        ? "text-tenant-primary font-semibold"
                        : log.includes("[DENIED]")
                        ? "text-rose-400 font-semibold"
                        : "text-zinc-450 dark:text-zinc-400"
                    } leading-relaxed animate-fade-in`}
                  >
                    {log}
                  </div>
                ))
              )}

              {isLoading && (
                <div className="flex items-center gap-2 text-tenant-primary py-1 font-semibold">
                  <Loader2 size={12} className="animate-spin" />
                  Odesílám dotaz na api...
                </div>
              )}
            </div>

            {/* Relay open signal display */}
            {simulationResult && (
              <div className={`p-3 rounded-none border flex items-center justify-between transition-all ${
                simulationResult.granted
                  ? "bg-tenant-primary/10 border-tenant-primary/20 text-tenant-primary"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-400"
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-none ${simulationResult.granted ? "bg-tenant-primary" : "bg-rose-500"}`} />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider font-sans">
                    {simulationResult.granted ? "Vstup: Uvolněn" : "Vstup: Blokován"}
                  </span>
                </div>
                {simulationResult.granted ? (
                  <CheckCircle2 size={15} className="text-tenant-primary" />
                ) : (
                  <XCircle size={15} className="text-rose-500" />
                )}
              </div>
            )}
          </div>

          {/* Right panel: HTTP Payload display */}
          <div className="md:col-span-7 p-5 space-y-4 bg-black/15 font-mono text-[11px] overflow-x-auto min-h-[250px] flex flex-col justify-between">
            {/* Request Block */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-zinc-500 text-[8px] font-bold tracking-wider uppercase font-sans">
                <span>API Request (POST /api/device/checkin)</span>
              </div>
              <pre className="text-zinc-300 bg-[#05050A] p-3 rounded-none border border-white/5 leading-relaxed">
                {"{\n  "}<span className="text-[#C084FC]">&quot;deviceId&quot;</span>{": "}<span className="text-[#38BDF8]">&quot;{activeScenario.request.deviceId}&quot;</span>{",\n  "}<span className="text-[#C084FC]">&quot;deviceToken&quot;</span>{": "}<span className="text-[#38BDF8]">&quot;{activeScenario.request.deviceToken}&quot;</span>{",\n  "}<span className="text-[#C084FC]">&quot;qrPayload&quot;</span>{": "}<span className="text-[#38BDF8]">&quot;{activeScenario.request.qrPayload}&quot;</span>{"\n}"}
              </pre>
            </div>

            {/* Response Block */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-zinc-500 text-[8px] font-bold tracking-wider uppercase font-sans">
                <span>API Response</span>
                {simulationResult && (
                  <span className={`text-[9px] font-bold font-mono ${
                    simulationResult.status === 200 ? "text-tenant-primary" : "text-rose-450"
                  }`}>
                    HTTP {simulationResult.status} {simulationResult.statusText}
                  </span>
                )}
              </div>
              <pre className={`p-3 rounded-none border transition-all leading-relaxed ${
                isLoading 
                  ? "bg-[#05050A] border-white/5 opacity-40"
                  : simulationResult
                    ? simulationResult.status === 200
                      ? "bg-tenant-primary/5 border-tenant-primary/10 text-tenant-primary"
                      : "bg-rose-500/5 border-rose-500/10 text-rose-400"
                    : "bg-[#05050A] border-white/5 text-zinc-500"
              }`}>
                {isLoading 
                  ? "{\n  \"loading\": true\n}"
                  : simulationResult 
                    ? JSON.stringify(simulationResult.body, null, 2)
                    : "{\n  /* Čekání na stisk tlačítka... */\n}"
                }
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

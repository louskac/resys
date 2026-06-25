"use client";

import React, { useState } from "react";
import { Terminal, Copy, Check, Play, Cpu } from "lucide-react";

interface Endpoint {
  method: "GET" | "POST";
  path: string;
  description: string;
  requestHeaders: Record<string, string>;
  requestBody?: string;
  responseStatus: number;
  responseStatusText: string;
  responseBody: string;
}

const endpoints: Endpoint[] = [
  {
    method: "GET",
    path: "/api/availability?tenantId=umelka&date=2026-06-23&resourceId=beach-a",
    description: "Zjištění dostupných rezervačních slotů pro konkrétní datum a sportoviště.",
    requestHeaders: {
      "Accept": "application/json",
      "x-api-key": "resys_prod_api_key_xxxxxxxx"
    },
    responseStatus: 200,
    responseStatusText: "OK",
    responseBody: JSON.stringify([
      {
        "slotStart": "2026-06-23T08:00:00.000Z",
        "slotEnd": "2026-06-23T09:00:00.000Z",
        "available": true,
        "priceCzk": 450
      },
      {
        "slotStart": "2026-06-23T09:00:00.000Z",
        "slotEnd": "2026-06-23T10:00:00.000Z",
        "available": false,
        "reason": "RESERVED"
      },
      {
        "slotStart": "2026-06-23T10:00:00.000Z",
        "slotEnd": "2026-06-23T11:00:00.000Z",
        "available": true,
        "priceCzk": 450
      }
    ], null, 2)
  },
  {
    method: "POST",
    path: "/api/bookings",
    description: "Okamžité bezpečné vytvoření rezervace bez rizika dvojího zapsání.",
    requestHeaders: {
      "Content-Type": "application/json",
      "Authorization": "Bearer tenant_token_jwt_xxxxx"
    },
    requestBody: JSON.stringify({
      "tenantId": "umelka",
      "resourceId": "beach-a",
      "start": "2026-06-23T10:00:00.000Z",
      "end": "2026-06-23T11:00:00.000Z",
      "userId": "usr_oneid_8f3d2a1c"
    }, null, 2),
    responseStatus: 201,
    responseStatusText: "Created",
    responseBody: JSON.stringify({
      "success": true,
      "bookingId": "bk_9a8b7c6d-e5f6-7a8b",
      "status": "CONFIRMED",
      "totalPriceCzk": 450,
      "qrTicketCode": "qr_access_ticket_umelka_bk9a8b"
    }, null, 2)
  },
  {
    method: "POST",
    path: "/api/device/checkin",
    description: "Ověření QR kódu u vstupu pro automatické otevření dveří či turniketu.",
    requestHeaders: {
      "Content-Type": "application/json",
      "x-device-token": "device_token_umelka_active"
    },
    requestBody: JSON.stringify({
      "deviceId": "d1a2b3c4-e5f6-7a8b-9c0d",
      "qrPayload": "qr_access_ticket_umelka_bk9a8b"
    }, null, 2),
    responseStatus: 200,
    responseStatusText: "OK",
    responseBody: JSON.stringify({
      "status": "granted",
      "userName": "Josef Novák",
      "resourceName": "Beach Volejbal Hřiště A",
      "command": "open_lock_relay_1",
      "pulseDurationMs": 2000
    }, null, 2)
  }
];

export default function DeveloperConsole() {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [simulatedResponse, setSimulatedResponse] = useState<string | null>(null);
  const [simulatedStatus, setSimulatedStatus] = useState<string | null>(null);

  const endpoint = endpoints[activeTab];

  const handleCopy = () => {
    const code = `curl -X ${endpoint.method} "https://api.resys.io${endpoint.path}" \\
${Object.entries(endpoint.requestHeaders).map(([k, v]) => `  -H "${k}: ${v}"`).join(" \\\n")}${endpoint.requestBody ? ` \\\n  -d '${endpoint.requestBody.replace(/\n/g, "")}'` : ""}`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runSimulation = () => {
    setIsRunning(true);
    setSimulatedResponse(null);
    setSimulatedStatus(null);
    setTimeout(() => {
      setIsRunning(false);
      setSimulatedStatus(`HTTP ${endpoint.responseStatus} ${endpoint.responseStatusText}`);
      setSimulatedResponse(endpoint.responseBody);
    }, 800);
  };

  return (
    <div className="w-full bg-[#07070C] border border-slate-800/80 rounded-none overflow-hidden shadow-2xl relative">
      {/* Glow background accent */}
      <div className="absolute top-0 right-1/4 w-[150px] h-[150px] rounded-full bg-tenant-primary/10 blur-[80px] pointer-events-none" />

      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-900 bg-black/40">
        <div className="flex items-center gap-2">
          <Terminal className="text-tenant-primary" size={16} />
          <span className="font-mono text-xs font-bold text-slate-400">ReSys API Sandbox v1.0</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]/60" />
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-0">
        {/* Left sidebar: endpoints navigation */}
        <div className="lg:col-span-4 border-r border-slate-900 p-4 space-y-2 bg-[#090910]/40">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">Dostupné Endpointy</p>
          {endpoints.map((ep, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActiveTab(idx);
                setSimulatedResponse(null);
                setSimulatedStatus(null);
              }}
              className={`w-full text-left p-3 rounded-none transition-all flex flex-col gap-1 border border-transparent ${
                activeTab === idx
                  ? "bg-tenant-primary/15 border-tenant-primary/30 border-l-2 border-l-tenant-primary text-white"
                  : "border-l-2 border-l-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-none font-mono ${
                  ep.method === "GET" ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                }`}>
                  {ep.method}
                </span>
                <span className="font-mono text-[11px] truncate font-semibold">{ep.path.split("?")[0]}</span>
              </div>
              <span className="text-[10px] text-slate-500 leading-normal line-clamp-1">{ep.description}</span>
            </button>
          ))}
        </div>

        {/* Right side: terminal console view */}
        <div className="lg:col-span-8 p-6 flex flex-col justify-between min-h-[380px] bg-[#030306]">
          <div className="space-y-4">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white font-sans">Popis rozhraní</h4>
                <p className="text-xs text-slate-450 leading-relaxed font-sans">{endpoint.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-none bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                  title="Kopírovat cURL příkaz"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
                <button
                  onClick={runSimulation}
                  disabled={isRunning}
                  className="bg-tenant-primary/15 hover:bg-tenant-gradient border border-tenant-primary/30 border-l-2 border-l-tenant-primary text-white text-xs font-bold py-2 px-3.5 rounded-none flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <Play size={12} fill="currentColor" />
                  {isRunning ? "Odesílání..." : "Test API"}
                </button>
              </div>
            </div>

            {/* Request block */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">Request Console (cURL)</span>
              <pre className="p-4 rounded-none bg-black border border-slate-900 text-slate-350 text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
                <span className="text-slate-500">$ </span>
                <span className="text-tenant-primary">curl </span>
                <span className="text-emerald-400">-X {endpoint.method} </span>
                <span className="text-slate-300">&quot;https://api.resys.io{endpoint.path}&quot; \<br /></span>
                {Object.entries(endpoint.requestHeaders).map(([k, v]) => (
                  <span key={k}>  -H <span className="text-cyan-400">&quot;{k}: {v}&quot;</span> \<br /></span>
                ))}
                {endpoint.requestBody && (
                  <span>  -d <span className="text-amber-400">&apos;{endpoint.requestBody.replace(/\s+/g, " ")}&apos;</span></span>
                )}
              </pre>
            </div>

            {/* Simulated Response */}
            {(simulatedResponse || isRunning) && (
              <div className="space-y-2 pt-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">HTTP Response</span>
                  {simulatedStatus && (
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-none ${
                      endpoint.responseStatus >= 200 && endpoint.responseStatus < 300 
                        ? "bg-emerald-500/10 text-emerald-400" 
                        : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {simulatedStatus}
                    </span>
                  )}
                </div>

                <div className="p-4 rounded-none bg-black border border-slate-900 font-mono text-[11px] min-h-[80px] flex items-start overflow-x-auto">
                  {isRunning ? (
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-sans">
                      Odesílání požadavku na universal reservation core...
                    </div>
                  ) : (
                    <pre className="text-slate-300 w-full leading-relaxed">{simulatedResponse}</pre>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-900/60 pt-4 mt-4 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span className="flex items-center gap-1.5">
              <Cpu size={12} className="text-emerald-400" />
              Response Time: ~9ms (Avg)
            </span>
            <span>Standard: JSON RESTful</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import {
  Radio,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Copy,
  RefreshCw,
  Clock,
  MapPin,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { EldLogEntry, EldProvider, Stop } from "../types/dwell";
import { triggerHapticTap } from "../utils/audioAlerts";

interface EldTelematicsHubProps {
  activeStop: Stop | null;
  onRefreshClock?: () => Promise<void>;
}

export const EldTelematicsHub: React.FC<EldTelematicsHubProps> = ({
  activeStop,
  onRefreshClock,
}) => {
  const [logs, setLogs] = useState<EldLogEntry[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<EldProvider>("samsara");
  const [selectedAction, setSelectedAction] = useState<"arrival" | "departure" | "ping">("arrival");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  const fetchTelematicsData = async () => {
    try {
      const res = await fetch("/api/telematics/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setConnections(data.activeConnections || []);
      }
    } catch (err) {
      console.error("Error fetching telematics:", err);
    }
  };

  useEffect(() => {
    fetchTelematicsData();
    const interval = setInterval(fetchTelematicsData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateWebhook = async () => {
    triggerHapticTap();
    setIsSimulating(true);

    try {
      const res = await fetch("/api/telematics/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          action: selectedAction,
          stopId: activeStop?.id,
        }),
      });

      if (res.ok) {
        await fetchTelematicsData();
        if (onRefreshClock) {
          await onRefreshClock();
        }
      }
    } catch (err) {
      console.error("Simulate ELD error:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCopyWebhookUrl = (provider: string) => {
    triggerHapticTap();
    const fullUrl = `${window.location.origin}/api/telematics/webhook/${provider}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedEndpoint(provider);
    setTimeout(() => setCopiedEndpoint(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                ELD & Telematics Webhook Ingestion Engine
              </h2>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Direct Ingestion
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Eliminates driver button presses. Automatically starts and stops the detention clock upon Samsara, Motive, or Geotab geofence entry & exit.
            </p>
          </div>

          <button
            onClick={fetchTelematicsData}
            className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Stream
          </button>
        </div>

        {/* 3 Supported ELD Provider Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
          {[
            {
              id: "samsara",
              name: "Samsara Cloud",
              badge: "API v2 / Webhooks",
              color: "border-sky-500/30 bg-sky-950/20 text-sky-400",
              desc: "GeofenceEntry & Vehicle Location Stream",
            },
            {
              id: "motive",
              name: "Motive (KeepTruckin)",
              badge: "Enterprise Webhooks",
              color: "border-emerald-500/30 bg-emerald-950/20 text-emerald-400",
              desc: "Geofence Alert & Ignition Telemetry",
            },
            {
              id: "geotab",
              name: "Geotab MyGeotab",
              badge: "Data Feed Service",
              color: "border-amber-500/30 bg-amber-950/20 text-amber-400",
              desc: "ZoneEntry / Exit & Exception Rules",
            },
          ].map((prov) => {
            const conn = connections.find((c) => c.provider === prov.id);
            return (
              <div
                key={prov.id}
                className={`p-3.5 rounded-xl border ${prov.color} flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-white">{prov.name}</span>
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {conn ? `${conn.latencyMs}ms` : "Active"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">{prov.desc}</p>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500 truncate max-w-[140px]">
                    /api/telematics/webhook/{prov.id}
                  </span>
                  <button
                    onClick={() => handleCopyWebhookUrl(prov.id)}
                    className="p-1 rounded text-slate-400 hover:text-white transition flex items-center gap-1 text-[11px]"
                    title="Copy Webhook Ingestion URL"
                  >
                    {copiedEndpoint === prov.id ? (
                      <span className="text-emerald-400 font-semibold">Copied!</span>
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Webhook Simulator */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white">Interactive ELD Webhook Simulator</h3>
          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Live Testing
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Transmit an authentic simulated webhook payload from an ELD provider to test automated dock geofence detection.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {/* Provider Selector */}
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
              Select ELD Provider
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(["samsara", "motive", "geotab"] as EldProvider[]).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    triggerHapticTap();
                    setSelectedProvider(p);
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                    selectedProvider === p
                      ? "bg-emerald-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Action Selector */}
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
              Trigger Event Action
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {[
                { id: "arrival", label: "Arrival" },
                { id: "ping", label: "GPS Ping" },
                { id: "departure", label: "Departure" },
              ].map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    triggerHapticTap();
                    setSelectedAction(a.id as any);
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedAction === a.id
                      ? "bg-emerald-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Trigger Button */}
          <div className="flex items-end">
            <button
              onClick={handleSimulateWebhook}
              disabled={isSimulating}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-2"
            >
              {isSimulating ? (
                <span>Transmitting Webhook...</span>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  Transmit {selectedProvider.toUpperCase()} Webhook
                </>
              )}
            </button>
          </div>
        </div>

        {activeStop && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs flex items-center justify-between text-slate-400">
            <span>Target Stop: <strong className="text-white">{activeStop.facilityName}</strong></span>
            <span>Current Status: <strong className="text-emerald-400 font-mono">{activeStop.departedAt ? "DEPARTED" : activeStop.arrivedAt ? "AT DOCK" : "EN ROUTE"}</strong></span>
          </div>
        )}
      </div>

      {/* Live Telematics Stream Logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Live Ingested Telematics Feed</h3>
            <span className="text-xs font-mono text-slate-500">({logs.length} events logged)</span>
          </div>
        </div>

        <div className="space-y-2">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No telematics events ingested yet. Fire a webhook above to test.
            </div>
          ) : (
            logs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const provColor =
                log.provider === "samsara"
                  ? "text-sky-400 bg-sky-500/10 border-sky-500/30"
                  : log.provider === "motive"
                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                  : "text-amber-400 bg-amber-500/10 border-amber-500/30";

              return (
                <div
                  key={log.id}
                  className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 transition hover:border-slate-700 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${provColor}`}
                      >
                        {log.provider}
                      </span>
                      <span className="font-semibold text-slate-200">{log.summary}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(log.receivedAt).toLocaleTimeString()}
                      </span>
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="text-slate-400 hover:text-white"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {log.autoActionTaken && (
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>{log.autoActionTaken}</span>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">
                        Raw Ingested Webhook Payload:
                      </p>
                      <pre className="bg-slate-900 p-2.5 rounded-lg text-[11px] font-mono text-emerald-300 overflow-x-auto">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

import React from "react";
import { Clock, AlertCircle, CheckCircle2, ChevronRight, FileText, ArrowUpRight, DollarSign, ShieldAlert } from "lucide-react";
import { Load } from "../types/dwell";

interface DispatcherActiveLoadsProps {
  loads: any[];
  onSelectLoad: (load: any) => void;
  onViewDriverCab: (load: any) => void;
  onInspectTerms: (load: any) => void;
}

export const DispatcherActiveLoads: React.FC<DispatcherActiveLoadsProps> = ({
  loads,
  onSelectLoad,
  onViewDriverCab,
  onInspectTerms,
}) => {
  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Active Fleet Loads & Telematics Clocks</h1>
          <p className="text-xs text-slate-400">
            Real-time J1939 telematics tracking stops, dock countdowns, and automated detention claims.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-lime-400/10 border border-lime-400/30 text-lime-400 text-xs font-black">
            <span className="w-2 h-2 rounded-full bg-lime-400 animate-ping" />
            {loads.filter((l) => l.status === "at_dock" || l.status === "detention_accruing").length} Trucks at Dock
          </div>
        </div>
      </div>

      {/* Grid of Load Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loads.map((load) => {
          const activeStop = load.activeStop || load.stops?.[0];
          const clock = load.currentClock;
          const isAccruing = clock && clock.detentionMinutes > 0;
          const isAtDock = activeStop && activeStop.arrivedAt && !activeStop.departedAt;
          const needsReview = load.terms?.needsReview;

          return (
            <div
              key={load.id}
              className={`rounded-2xl border transition-all p-5 shadow-lg bg-[#0D1424] ${
                isAccruing
                  ? "border-amber-400 bg-gradient-to-br from-[#0D1424] via-[#0D1424] to-amber-950/30 shadow-[0_0_25px_rgba(245,158,11,0.2)]"
                  : isAtDock
                  ? "border-lime-400/40"
                  : "border-white/5 hover:border-white/10"
              }`}
            >
              {/* Load header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-white">{load.loadNumber}</span>
                    <span className="text-xs text-slate-400 font-bold">PRO #{load.proNumber}</span>
                    {needsReview && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        <ShieldAlert className="w-3 h-3" />
                        Needs Review
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-slate-300">{load.brokerName}</div>
                </div>

                {/* Status Badge */}
                <div>
                  {isAccruing ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950 shadow-md animate-pulse">
                      <Clock className="w-3.5 h-3.5" />
                      +${((clock?.amountCents || 0) / 100).toFixed(2)} ACCRUING
                    </span>
                  ) : isAtDock ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-lime-400/20 text-lime-400 border border-lime-400/30">
                      <Clock className="w-3.5 h-3.5" />
                      Dock Clock Running
                    </span>
                  ) : load.status === "completed" || load.status === "claim_filed" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Stop Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-slate-800 text-slate-400">
                      In Transit
                    </span>
                  )}
                </div>
              </div>

              {/* Facility details */}
              {activeStop && (
                <div className="bg-[#070B14] rounded-xl p-3 border border-white/5 mb-4">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-black uppercase text-lime-400 text-[10px]">
                      {activeStop.type === "delivery" ? "Delivery Receiver" : "Pickup Shipper"}
                    </span>
                    <span className="text-[11px] font-semibold">
                      Window:{" "}
                      {activeStop.appointmentStart
                        ? new Date(activeStop.appointmentStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "Anytime"}
                    </span>
                  </div>
                  <div className="font-black text-white text-sm">{activeStop.facilityName}</div>
                  <div className="text-xs text-slate-400 truncate">{activeStop.facilityAddress}</div>
                </div>
              )}

              {/* Clock metrics bar */}
              {clock && isAtDock && (
                <div className="grid grid-cols-3 gap-2 mb-4 p-2.5 rounded-xl bg-[#060A14] border border-white/5 text-center">
                  <div>
                    <div className="text-[10px] uppercase font-black text-slate-400">Free Time Left</div>
                    <div className={`font-mono text-sm font-black ${clock.freeTimeRemainingMinutes > 0 ? "text-lime-400" : "text-amber-400"}`}>
                      {clock.freeTimeRemainingMinutes > 0 ? `${clock.freeTimeRemainingMinutes}m` : "Expired (0m)"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-black text-slate-400">Billable Dwell</div>
                    <div className="font-mono text-sm font-black text-white">
                      {Math.floor(clock.detentionMinutes / 60)}h {clock.detentionMinutes % 60}m
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-black text-slate-400">Claim Amount</div>
                    <div className={`font-mono text-sm font-black ${isAccruing ? "text-amber-400" : "text-lime-400"}`}>
                      ${((clock.amountCents || 0) / 100).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              {/* Contract terms pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] mb-4 text-slate-400">
                <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-white/5 text-slate-300 font-bold">
                  Rate: ${(load.terms?.detentionRateCentsPerHour?.value ? load.terms.detentionRateCentsPerHour.value / 100 : 50).toFixed(2)}/hr
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-white/5 text-slate-300 font-bold">
                  Free Time: {load.terms?.freeTimeMinutes?.delivery?.value || 120}m
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-white/5 text-slate-300 font-bold">
                  Starts: {load.terms?.freeTimeStartsFrom?.value === "scheduled_appointment" ? "Appt Window" : "Arrival"}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-white/5 text-slate-300 font-bold">
                  Window: {load.terms?.claimFilingWindowHours?.value || 24}h
                </span>
              </div>

              {/* Actions footer */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                <button
                  onClick={() => onInspectTerms(load)}
                  className="text-slate-400 hover:text-white font-bold flex items-center gap-1 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Audit Contract Terms
                </button>

                <button
                  onClick={() => onViewDriverCab(load)}
                  className="px-3 py-1.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-black shadow-md shadow-lime-500/20 flex items-center gap-1 transition-all active:scale-95"
                >
                  <span>Open Driver View</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

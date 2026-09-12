import React, { useState, useEffect } from "react";
import { Clock, AlertTriangle, ShieldAlert, BedDouble, Navigation, CheckCircle2, ChevronRight } from "lucide-react";
import { HosCalculation, Stop } from "../types/dwell";
import { triggerHapticTap } from "../utils/audioAlerts";

interface HosRiskWarningWidgetProps {
  stop: Stop | null;
  claimId?: string;
  onEscalateToLayover?: () => void;
}

export const HosRiskWarningWidget: React.FC<HosRiskWarningWidgetProps> = ({
  stop,
  claimId,
  onEscalateToLayover,
}) => {
  const [hosData, setHosData] = useState<HosCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const [escalated, setEscalated] = useState(false);

  useEffect(() => {
    if (!stop) return;
    const fetchHos = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/hos/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stopId: stop.id }),
        });
        if (res.ok) {
          const data = await res.json();
          setHosData(data.analysis);
        }
      } catch (err) {
        console.error("Failed to fetch HOS analysis:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHos();
  }, [stop]);

  if (!stop || !hosData) return null;

  const targetClaimId = claimId || `claim-${stop.id}`;

  const handleLayoverEscalation = async () => {
    if (!targetClaimId) return;
    triggerHapticTap();
    setIsEscalating(true);
    try {
      const res = await fetch(`/api/claims/${targetClaimId}/escalate-layover`, {
        method: "POST",
      });
      if (res.ok) {
        setEscalated(true);
        if (onEscalateToLayover) onEscalateToLayover();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsEscalating(false);
    }
  };

  const isCritical = hosData.isLayoverMandated || hosData.is14HourViolationImminent;

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 transition-all ${
        hosData.isLayoverMandated
          ? "bg-rose-950/40 border-rose-600/70 text-rose-200"
          : hosData.is14HourViolationImminent
          ? "bg-amber-950/40 border-amber-600/60 text-amber-200"
          : "bg-slate-900/60 border-slate-800 text-slate-200"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl ${
              hosData.isLayoverMandated
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse"
                : hosData.is14HourViolationImminent
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
            }`}
          >
            {hosData.isLayoverMandated ? (
              <ShieldAlert className="w-5 h-5" />
            ) : (
              <Clock className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm tracking-tight text-white">
                HOS & 14-Hour Clock Impact
              </h3>
              {hosData.isLayoverMandated && (
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-500 text-slate-950">
                  RESET MANDATED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Real-time FMCSA 49 CFR § 395 drive-time preservation engine
            </p>
          </div>
        </div>

        {/* Haven badge */}
        <div className="flex items-center gap-1.5 text-xs bg-slate-950/50 px-3 py-1.5 rounded-xl border border-white/5">
          <Navigation className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-300 font-medium">Safe Haven:</span>
          <span className="text-white font-semibold truncate max-w-[200px]">
            {hosData.safeParkingHavenName}
          </span>
          <span className="text-slate-400">({hosData.estimatedDriveToSafeHavenMinutes}m)</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-3.5">
        <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5">
          <span className="text-[11px] text-slate-400 block mb-0.5">14-Hr Clock Window</span>
          <span
            className={`font-mono text-base sm:text-lg font-black ${
              hosData.minutesUntil14HrExpired < 60 ? "text-rose-400" : "text-white"
            }`}
          >
            {Math.max(0, Math.floor(hosData.minutesUntil14HrExpired / 60))}h {Math.max(0, hosData.minutesUntil14HrExpired % 60)}m
          </span>
          <span className="text-[10px] text-slate-500 block">time until violation</span>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5">
          <span className="text-[11px] text-slate-400 block mb-0.5">Drive Time Burned</span>
          <span className="font-mono text-base sm:text-lg font-black text-amber-400">
            {Math.floor(hosData.currentDwellMinutes / 60)}h {hosData.currentDwellMinutes % 60}m
          </span>
          <span className="text-[10px] text-slate-500 block">lost at receiver dock</span>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5">
          <span className="text-[11px] text-slate-400 block mb-0.5">Duty Used So Far</span>
          <span className="font-mono text-base sm:text-lg font-black text-white">
            {Math.floor(hosData.onDutyMinutesUsed / 60)}h {hosData.onDutyMinutesUsed % 60}m
          </span>
          <span className="text-[10px] text-slate-500 block">of 14:00 max daily</span>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5">
          <span className="text-[11px] text-slate-400 block mb-0.5">Safe Haven Margin</span>
          <span
            className={`font-mono text-base sm:text-lg font-black ${
              hosData.minutesUntil14HrExpired - hosData.estimatedDriveToSafeHavenMinutes <= 15
                ? "text-rose-400"
                : "text-emerald-400"
            }`}
          >
            {Math.max(0, hosData.minutesUntil14HrExpired - hosData.estimatedDriveToSafeHavenMinutes)}m
          </span>
          <span className="text-[10px] text-slate-500 block">cushion to reach parking</span>
        </div>
      </div>

      {/* Warning Statement */}
      <div className="text-xs leading-relaxed p-3 rounded-xl bg-slate-950/70 border border-white/10 mb-3 flex items-start gap-2">
        <AlertTriangle
          className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
            hosData.isLayoverMandated ? "text-rose-400" : "text-amber-400"
          }`}
        />
        <span className="text-slate-300">{hosData.complianceWarning}</span>
      </div>

      {/* Automated Layover Escalation Action */}
      {targetClaimId && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <BedDouble className="w-4 h-4 text-purple-400" />
            <span>
              If driver is trapped into a 10-hour sleeper reset, auto-escalate from hourly detention to full Layover:
            </span>
          </div>

          <button
            onClick={handleLayoverEscalation}
            disabled={isEscalating || escalated}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all w-full sm:w-auto justify-center ${
              escalated
                ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/50"
                : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 active:scale-95"
            }`}
          >
            {escalated ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Escalated to $450 Layover Claim
              </>
            ) : (
              <>
                <BedDouble className="w-4 h-4" />
                {isEscalating ? "Escalating Claim..." : "Escalate to Layover Claim ($450.00)"}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

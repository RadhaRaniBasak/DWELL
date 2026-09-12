import React, { useState } from "react";
import {
  Clock,
  AlertTriangle,
  ShieldAlert,
  BedDouble,
  Navigation,
  CheckCircle2,
  ChevronRight,
  Info,
  MapPin,
  ShieldCheck,
  Flame,
  BatteryCharging,
  Hourglass,
} from "lucide-react";
import { Stop, HosCalculation } from "../types/dwell";
import { triggerHapticTap } from "../utils/audioAlerts";

interface HosClockRiskIndicatorProps {
  clockData: any;
  stop: Stop | null;
  loadNumber?: string;
  onEscalateToLayover?: () => void;
}

export const HosClockRiskIndicator: React.FC<HosClockRiskIndicatorProps> = ({
  clockData,
  stop,
  loadNumber,
  onEscalateToLayover,
}) => {
  const [isEscalating, setIsEscalating] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [showHavenDetails, setShowHavenDetails] = useState(false);

  if (!stop) return null;

  // Real-time calculation derived from clockData & stop state
  const hasArrived = Boolean(clockData?.arrivedAt || stop?.arrivedAt);
  const arrivalTime = (clockData?.arrivedAt || stop?.arrivedAt)
    ? new Date(clockData?.arrivedAt || stop?.arrivedAt)
    : new Date();

  // Dwell minutes currently accrued at dock
  const now = new Date();
  const currentDwellMinutes = hasArrived
    ? Math.max(0, Math.floor((now.getTime() - arrivalTime.getTime()) / (60 * 1000)))
    : 0;

  // Server-computed baseline or dynamic fallback
  const serverHos: HosCalculation | undefined = clockData?.hos;

  // Assume standard commercial driver 14-hour (840 min) window with 6.5h prior duty
  const priorDutyMinutes = 390; // 6.5 hours inbound
  const totalOnDutyMinutes = serverHos
    ? serverHos.onDutyMinutesUsed
    : priorDutyMinutes + currentDwellMinutes;

  // 14-Hour limit is 840 minutes (14 hours)
  const minutesUntil14HrExpired = serverHos
    ? serverHos.minutesUntil14HrExpired
    : Math.max(0, 840 - totalOnDutyMinutes);

  // Maximum drive time available (11-hour limit = 660m, capped by remaining 14h window)
  const remainingDriveMinutes = serverHos
    ? serverHos.driveMinutesRemaining
    : Math.max(0, Math.min(330, minutesUntil14HrExpired));

  const safeHavenMinutes = serverHos?.estimatedDriveToSafeHavenMinutes ?? 35;
  const safeHavenName = serverHos?.safeParkingHavenName ?? "TA Travel Center #182 (Exit 42, 18 mi)";

  // Cushion needed to legally reach safe haven
  const marginToSafeHaven = minutesUntil14HrExpired - safeHavenMinutes;

  // Projected 10-hour sleeper reset condition
  const isLayoverMandated = serverHos?.isLayoverMandated ?? (marginToSafeHaven <= 15);
  const isViolationImminent = serverHos?.is14HourViolationImminent ?? (minutesUntil14HrExpired <= 75);

  const targetClaimId = `claim-${stop.id}`;

  const handleLayoverEscalate = async () => {
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
      console.error("Layover escalation failed:", err);
    } finally {
      setIsEscalating(false);
    }
  };

  // Convert minutes into "Xh Ym"
  const formatHAndM = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.max(0, mins % 60);
    return `${h}h ${m}m`;
  };

  // Calculate percentage of 14-hour clock used
  const dutyPercentageUsed = Math.min(100, Math.round((totalOnDutyMinutes / 840) * 100));
  const drivePercentageLeft = Math.min(100, Math.round((remainingDriveMinutes / 330) * 100));

  return (
    <div
      id="hos-clock-risk-indicator"
      className={`rounded-2xl border transition-all duration-300 overflow-hidden shadow-lg ${
        isLayoverMandated
          ? "bg-rose-950/60 border-rose-500/80 ring-1 ring-rose-500/40"
          : isViolationImminent
          ? "bg-amber-950/50 border-amber-500/70 ring-1 ring-amber-500/30"
          : "bg-slate-900/90 border-slate-800"
      }`}
    >
      {/* Top Banner */}
      <div className="p-3.5 sm:p-4 border-b border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl flex items-center justify-center ${
              isLayoverMandated
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse"
                : isViolationImminent
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
            }`}
          >
            {isLayoverMandated ? (
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            ) : isViolationImminent ? (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            ) : (
              <Clock className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-white tracking-tight">
                14-Hour Clock Risk & Drive-Time Radar
              </span>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isLayoverMandated
                    ? "bg-rose-500 text-slate-950 animate-pulse"
                    : isViolationImminent
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                }`}
              >
                {isLayoverMandated
                  ? "RESET MANDATED"
                  : isViolationImminent
                  ? "TIME CRITICAL"
                  : "NORMAL WINDOW"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              FMCSA 49 CFR § 395.3 Live Duty & Sleeper Berth Projection
            </p>
          </div>
        </div>

        {/* Safe Haven distance badge */}
        <button
          onClick={() => setShowHavenDetails(!showHavenDetails)}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-700/60 hover:bg-slate-800 text-slate-300 text-xs transition"
          title="Click to view nearest safe parking haven details"
        >
          <Navigation className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-white">Safe Haven:</span>
          <span className="truncate max-w-[140px] text-slate-300">
            {safeHavenMinutes}m transit
          </span>
          <Info className="w-3 h-3 text-slate-400 ml-0.5" />
        </button>
      </div>

      {/* Main Metric Cards */}
      <div className="p-3.5 sm:p-4 space-y-3.5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* 1. Remaining Drive Time */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
              <BatteryCharging className="w-3 h-3 text-cyan-400" />
              Remaining Drive Time
            </span>
            <div className="my-1">
              <span
                className={`font-mono text-xl sm:text-2xl font-black ${
                  remainingDriveMinutes <= 45
                    ? "text-rose-400"
                    : remainingDriveMinutes <= 90
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}
              >
                {formatHAndM(remainingDriveMinutes)}
              </span>
            </div>
            <span className="text-[10px] text-slate-500">FMCSA 11-hr drive cap</span>
          </div>

          {/* 2. 14-Hour Duty Window */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
              <Hourglass className="w-3 h-3 text-amber-400" />
              14-Hr Duty Clock
            </span>
            <div className="my-1">
              <span
                className={`font-mono text-xl sm:text-2xl font-black ${
                  minutesUntil14HrExpired <= 60 ? "text-rose-400" : "text-white"
                }`}
              >
                {formatHAndM(minutesUntil14HrExpired)}
              </span>
            </div>
            <span className="text-[10px] text-slate-500">until duty violation</span>
          </div>

          {/* 3. Dock Dwell Burn */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
              <Flame className="w-3 h-3 text-rose-400" />
              Dock Dwell Burn
            </span>
            <div className="my-1">
              <span className="font-mono text-xl sm:text-2xl font-black text-rose-400">
                +{formatHAndM(currentDwellMinutes)}
              </span>
            </div>
            <span className="text-[10px] text-slate-500">burned while parked</span>
          </div>

          {/* 4. Margin to Safe Haven */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
              <Navigation className="w-3 h-3 text-cyan-400" />
              Haven Buffer
            </span>
            <div className="my-1">
              <span
                className={`font-mono text-xl sm:text-2xl font-black ${
                  marginToSafeHaven <= 0
                    ? "text-rose-400"
                    : marginToSafeHaven <= 20
                    ? "text-amber-400"
                    : "text-cyan-400"
                }`}
              >
                {marginToSafeHaven <= 0 ? "0m (TRAPPED)" : `+${marginToSafeHaven}m`}
              </span>
            </div>
            <span className="text-[10px] text-slate-500">cushion to TA truck stop</span>
          </div>
        </div>

        {/* Visual Drive Time vs Dwell Bar Gauge */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5">
          <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
            <span className="text-slate-300 flex items-center gap-1.5">
              14-Hour Shift Depletion
              <span className="text-[10px] text-slate-500 font-normal">
                ({totalOnDutyMinutes}m used of 840m)
              </span>
            </span>
            <span
              className={
                dutyPercentageUsed >= 90
                  ? "text-rose-400"
                  : dutyPercentageUsed >= 75
                  ? "text-amber-400"
                  : "text-emerald-400"
              }
            >
              {dutyPercentageUsed}% on-duty
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
            {/* Used prior drive/duty */}
            <div
              style={{ width: `${Math.min(75, (priorDutyMinutes / 840) * 100)}%` }}
              className="bg-blue-600 h-full"
              title="Pre-arrival on-duty drive time"
            />
            {/* Current dock dwell burn */}
            <div
              style={{ width: `${Math.min(40, (currentDwellMinutes / 840) * 100)}%` }}
              className="bg-rose-500 h-full animate-pulse"
              title="Dock dwell consuming duty hours"
            />
            {/* Safe haven buffer */}
            <div
              style={{ width: `${Math.min(10, (safeHavenMinutes / 840) * 100)}%` }}
              className="bg-amber-400/80 h-full"
              title="Drive-time required for safe haven"
            />
            {/* Remaining free window */}
            <div className="bg-emerald-500/40 h-full flex-1" title="Remaining legal drive buffer" />
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" /> Inbound Drive
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Dock Dwell
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Safe Haven
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500/40 inline-block" /> Buffer
            </span>
          </div>
        </div>

        {/* CRITICAL WARNING ALERT: 10-Hour Sleeper Berth Reset Projected */}
        {isLayoverMandated && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-rose-950/80 border-2 border-rose-500 text-rose-100 shadow-xl animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-500 text-slate-950 font-black shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 fill-slate-950" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h4 className="font-black text-sm sm:text-base text-white tracking-tight">
                    MANDATORY 10-HOUR SLEEPER BERTH RESET PROJECTED
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/30 text-rose-300 border border-rose-500/50">
                    FMCSA 49 CFR § 395.3(a)(2)
                  </span>
                </div>
                <p className="text-xs text-rose-200 leading-relaxed mb-3">
                  Current dock dwell (+{formatHAndM(currentDwellMinutes)}) has exhausted available
                  drive time. The driver cannot legally drive {safeHavenMinutes} minutes to reach
                  safe parking ({safeHavenName}) before the 14-hour on-duty window closes. Under
                  federal law, the driver must immediately enter sleeper berth for a mandatory
                  10-hour reset.
                </p>

                {/* Layover Escalation CTA Button */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-rose-500/30">
                  <div className="text-xs text-rose-300 font-semibold flex items-center gap-1.5">
                    <BedDouble className="w-4 h-4 text-rose-300" />
                    <span>Converts hourly dwell to contractual full-day Layover</span>
                  </div>

                  <button
                    id="btn-escalate-layover-claim"
                    onClick={handleLayoverEscalate}
                    disabled={isEscalating || escalated}
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 ${
                      escalated
                        ? "bg-emerald-600 text-white border border-emerald-400 cursor-default"
                        : "bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-rose-900/50"
                    }`}
                  >
                    {escalated ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Escalated to $450.00 Layover Claim
                      </>
                    ) : (
                      <>
                        <BedDouble className="w-4 h-4" />
                        {isEscalating
                          ? "Escalating Claim..."
                          : "Escalate to Layover Claim ($450.00)"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Warning if approaching danger zone but not yet mandated */}
        {!isLayoverMandated && isViolationImminent && (
          <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/60 text-amber-200 flex items-start gap-2.5 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-100 block mb-0.5">
                Urgent Release Notice Required
              </span>
              Driver has only {formatHAndM(minutesUntil14HrExpired)} remaining on the 14-hour clock.
              Facility release required within {Math.max(0, marginToSafeHaven)} minutes to avoid
              triggering a mandatory 10-hour sleeper berth reset at the dock.
            </div>
          </div>
        )}

        {/* Safe Haven Details Accordion */}
        {showHavenDetails && (
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5 animate-in fade-in">
            <div className="flex items-center justify-between font-bold text-white mb-1">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                Safe Haven Facility Intelligence
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">
                {safeHavenMinutes}m ETA (18.2 miles)
              </span>
            </div>
            <p className="text-slate-400 text-[11px]">
              <strong className="text-white">{safeHavenName}</strong>: Commercial truck parking
              haven with 114 verified tractor-trailer spaces, DEF lanes, CAT scale, and 24/7
              security.
            </p>
            <p className="text-slate-400 text-[11px]">
              If facility security orders driver off property after 14-hour clock expires, driver
              can invoke Emergency Safe Haven exception to proceed directly here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

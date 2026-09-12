import React, { useState } from "react";
import {
  Clock,
  X,
  AlertTriangle,
  FileText,
  DollarSign,
  ShieldAlert,
  Hotel,
  TrendingDown,
  Printer,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Claim, Load, Stop } from "../types/dwell";

interface LayoverRescheduleOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: Claim | null;
  load: Load | null;
  stop: Stop | null;
  onEscalated?: () => void;
}

export const LayoverRescheduleOptimizerModal: React.FC<LayoverRescheduleOptimizerModalProps> = ({
  isOpen,
  onClose,
  claim,
  load,
  stop,
  onEscalated,
}) => {
  const [layoverFlat, setLayoverFlat] = useState(500);
  const [hotelMeals, setHotelMeals] = useState(150);
  const [lostDispatch, setLostDispatch] = useState(650);
  const [isEscalating, setIsEscalating] = useState(false);
  const [escalatedSuccess, setEscalatedSuccess] = useState(false);

  if (!isOpen || !claim) return null;

  const totalClaim = layoverFlat + hotelMeals + lostDispatch;
  const dwellMinutes = claim.detentionMinutes || 600;
  const dwellHours = Math.floor(dwellMinutes / 60);
  const dwellRemainMins = dwellMinutes % 60;

  const handleExecuteOptimizer = async () => {
    setIsEscalating(true);
    try {
      const res = await fetch(`/api/claims/${claim.id}/layover-optimizer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layoverFlatDollars: layoverFlat,
          hotelMealsDollars: hotelMeals,
          lostDispatchOpportunityDollars: lostDispatch,
        }),
      });

      if (res.ok) {
        setEscalatedSuccess(true);
        if (onEscalated) onEscalated();
      }
    } catch (err) {
      console.error("Layover optimization failed:", err);
    } finally {
      setIsEscalating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#080D18] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#0D1424]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center font-black">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white uppercase tracking-tight">
                  Layover & Driver Reschedule Optimizer
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500 text-white">
                  FMCSA Part 395
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Detention exceeded 6+ hours, exhausting the driver's legal 14-hour on-duty window
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Incident Alert Banner */}
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-bold text-rose-300">
                14-Hour On-Duty Window Breach Detected at {stop?.facilityName || "Dock"}
              </div>
              <p className="text-slate-300">
                Total continuous dwell: <strong className="text-white">{dwellHours}h {dwellRemainMins}m</strong>.
                Under Federal Motor Carrier Safety Administration (FMCSA 49 C.F.R. § 395.3), the driver is placed
                out-of-service for a mandatory 10-hour sleeper berth reset, canceling downstream dispatch.
              </p>
            </div>
          </div>

          {/* Itemized Recovery Breakdown Calculator */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              Itemized Accessorial & Consequential Damages
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Item 1: Flat Layover */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase">
                  <Clock className="w-3.5 h-3.5 text-lime-400" />
                  <span>Flat Layover Rate</span>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-slate-500 font-bold">$</span>
                  <input
                    type="number"
                    value={layoverFlat}
                    onChange={(e) => setLayoverFlat(Number(e.target.value) || 0)}
                    className="w-full bg-[#0D1424] border border-slate-800 rounded-lg pl-6 pr-2 py-1 text-sm font-mono font-bold text-white focus:outline-none focus:border-lime-400"
                  />
                </div>
                <div className="text-[10px] text-slate-500">Tractor & trailer daily hold fee</div>
              </div>

              {/* Item 2: Hotel & Meals */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase">
                  <Hotel className="w-3.5 h-3.5 text-sky-400" />
                  <span>Lodging & Per Diem</span>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-slate-500 font-bold">$</span>
                  <input
                    type="number"
                    value={hotelMeals}
                    onChange={(e) => setHotelMeals(Number(e.target.value) || 0)}
                    className="w-full bg-[#0D1424] border border-slate-800 rounded-lg pl-6 pr-2 py-1 text-sm font-mono font-bold text-white focus:outline-none focus:border-lime-400"
                  />
                </div>
                <div className="text-[10px] text-slate-500">Driver meals & room allowance</div>
              </div>

              {/* Item 3: Missed Next Dispatch */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase">
                  <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Lost Load Revenue</span>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-slate-500 font-bold">$</span>
                  <input
                    type="number"
                    value={lostDispatch}
                    onChange={(e) => setLostDispatch(Number(e.target.value) || 0)}
                    className="w-full bg-[#0D1424] border border-slate-800 rounded-lg pl-6 pr-2 py-1 text-sm font-mono font-bold text-white focus:outline-none focus:border-lime-400"
                  />
                </div>
                <div className="text-[10px] text-slate-500">Pre-booked canceled load damage</div>
              </div>
            </div>
          </div>

          {/* Total Combined Recovery Summary Box */}
          <div className="p-4 rounded-xl bg-[#0D1424] border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase">Upgraded Total Claim Demand</div>
              <div className="text-xs text-slate-400">
                Replaces standard hourly detention with full legal business interruption damages
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black font-mono text-lime-400">
                ${totalClaim.toFixed(2)} USD
              </div>
              <div className="text-[10px] text-slate-500">Certified Carrier Demand</div>
            </div>
          </div>

          {/* Success Banner */}
          {escalatedSuccess && (
            <div className="p-4 rounded-xl bg-lime-400/15 border border-lime-400/30 text-xs text-lime-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-lime-400" />
                <span>Claim upgraded to $<strong>{totalClaim.toFixed(2)}</strong> Layover demand!</span>
              </div>
              <a
                href={`/api/claims/${claim.id}/packet`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 rounded bg-lime-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Packet</span>
              </a>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#0D1424] border-t border-white/5 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition-all"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExecuteOptimizer}
              disabled={isEscalating}
              className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-rose-500/20 cursor-pointer transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isEscalating ? "Generating FMCSA Demand..." : "Escalate to $1,300 Layover Claim"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

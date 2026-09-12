import React from "react";
import {
  BedDouble,
  Clock,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  FileText,
  DollarSign,
  AlertTriangle,
  Sparkles,
  X,
} from "lucide-react";
import { triggerHapticTap } from "../utils/audioAlerts";

interface LayoverConversionPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConvert: () => Promise<void>;
  isConverting: boolean;
  isConverted: boolean;
  dwellMinutes: number;
  stopName?: string;
  loadNumber?: string;
  brokerName?: string;
  onViewClaimsPipeline?: () => void;
}

export const LayoverConversionPromptModal: React.FC<LayoverConversionPromptModalProps> = ({
  isOpen,
  onClose,
  onConvert,
  isConverting,
  isConverted,
  dwellMinutes,
  stopName = "Facility Dock",
  loadNumber = "CHR-882941",
  brokerName = "Broker",
  onViewClaimsPipeline,
}) => {
  if (!isOpen) return null;

  const hours = Math.floor(dwellMinutes / 60);
  const minutes = dwellMinutes % 60;

  return (
    <div
      id="layover-conversion-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="layover-conversion-modal"
        className="relative w-full max-w-xl bg-slate-900 border-2 border-rose-500/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Top Alert Header Banner */}
        <div className="bg-gradient-to-r from-rose-900/90 via-rose-800/80 to-amber-900/80 p-4 sm:p-5 border-b border-rose-500/40 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500 text-slate-950 font-black shrink-0 animate-pulse">
              <BedDouble className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 border border-rose-400/50">
                  CRITICAL FMCSA THRESHOLD
                </span>
                <span className="text-xs font-mono text-rose-300 font-bold">
                  {hours}h {minutes}m Accrued Dwell
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                10+ Hour Dwell Detected: Convert to Layover Claim
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
            title="Dismiss prompt"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Situation Brief */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-white/5 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Incident Location:</span>
              <span className="text-white font-bold">{stopName}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Active Load / Broker:</span>
              <span className="text-white font-mono">Load #{loadNumber} • {brokerName}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Total Dwell Incident:</span>
              <span className="text-rose-400 font-mono font-bold">
                {hours} Hours {minutes} Minutes (&gt; 10-Hour Legal Threshold)
              </span>
            </div>
          </div>

          {/* Legal Rationale */}
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 text-xs text-amber-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-100">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>FMCSA 49 CFR § 395.3 Mandatory Reset Enforcement</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Continuous facility dwell exceeding 10 hours has depleted available driving hours and triggered a mandatory 10-hour sleeper berth reset. Hourly detention rates become legally contentious and commercially inadequate for multi-hour immobilization.
            </p>
          </div>

          {/* Upgrade Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Standard Detention (Before) */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2 opacity-75">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Current Format: Hourly Detention
              </span>
              <div className="text-lg font-mono font-bold text-slate-300">
                $50 – $75 / hr
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Subject to arbitrary broker dispute caps, incremental rounding denials, and delayed claims review.
              </p>
            </div>

            {/* Flat Layover (After Upgrade) */}
            <div className="bg-gradient-to-b from-rose-950/40 to-slate-950/80 p-3.5 rounded-xl border-2 border-rose-500 text-xs space-y-2 shadow-lg relative">
              <div className="absolute -top-2.5 right-3 bg-rose-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                Upgraded Template
              </div>
              <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider block">
                Upgraded: Layover Accessorial
              </span>
              <div className="text-xl font-mono font-black text-emerald-400 flex items-center gap-1">
                <span>Flat $500.00 / day</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                Full 24-hour accessorial demand citing federal sleeper berth out-of-service mandate and certified telematics.
              </p>
            </div>
          </div>

          {/* Upgraded Template Details */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-white/5 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-white">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>What changes upon conversion?</span>
            </div>
            <ul className="space-y-1.5 text-slate-300 text-[11px]">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Billing Rate Adjustment:</strong> Converts to a flat <strong>$500.00/day</strong> contractual accessorial fee.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Template Upgrade:</strong> Replaces standard hourly detention letter with official <em>Layover Invoice & Demand for Payment</em> citing FMCSA 49 CFR § 395.3(a)(2).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Audited Telematics Inclusion:</strong> Embeds geofence arrival timestamps, dwell duration, and gate log proof into the formal demand package.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            Keep Hourly Detention
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            {isConverted && onViewClaimsPipeline && (
              <button
                onClick={() => {
                  triggerHapticTap();
                  onViewClaimsPipeline();
                }}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition"
              >
                Inspect in Claims Pipeline
              </button>
            )}

            <button
              id="btn-confirm-convert-layover"
              onClick={async () => {
                triggerHapticTap();
                await onConvert();
              }}
              disabled={isConverting || isConverted}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg transition active:scale-95 ${
                isConverted
                  ? "bg-emerald-600 text-white border border-emerald-400 cursor-default"
                  : "bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-rose-900/50"
              }`}
            >
              {isConverted ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Converted to Flat $500/day Layover Claim
                </>
              ) : isConverting ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  Upgrading Invoice...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Convert to Layover Claim ($500/day)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

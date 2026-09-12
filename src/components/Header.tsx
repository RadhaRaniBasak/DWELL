import React from "react";
import { Truck, ShieldCheck, BarChart3, FileText, Play, RotateCcw, Volume2, VolumeX, Sparkles, Radio, TrendingUp, Scale, FileSignature, Smartphone, Calculator } from "lucide-react";
import { PWAInstallButton } from "./PWAInstallButton";
import { playDetentionWarningSound, triggerHapticTap } from "../utils/audioAlerts";

export type NavTabType =
  | "driver"
  | "driver_sms"
  | "dispatcher_loads"
  | "dispatcher_claims"
  | "disputes_ar"
  | "prebooking_risk"
  | "addendum_generator"
  | "broker_scorecards"
  | "rate_intelligence"
  | "telematics"
  | "dispatcher_facilities"
  | "rate_con";

interface HeaderProps {
  activeTab: NavTabType;
  setActiveTab: (tab: NavTabType) => void;
  onOpenDemoGuide: () => void;
  onOpenEvalHarness: () => void;
  onResetDemo: () => void;
  atRiskCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenDemoGuide,
  onOpenEvalHarness,
  onResetDemo,
  atRiskCount,
  soundEnabled,
  onToggleSound,
}) => {
  return (
    <header className="bg-[#080D18]/95 backdrop-blur-xl border-b border-white/5 text-white sticky top-0 z-40 pt-safe transition-all shadow-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-lime-400 text-slate-950 flex items-center justify-center font-black tracking-tight text-base sm:text-lg shadow-lg shadow-lime-500/20">
              DW
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-lg tracking-tight text-white uppercase">Dwell</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-lime-400/15 text-lime-400 border border-lime-400/30 tracking-wider">
                  TELEMATICS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden lg:flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse"></span>
                <span>Automated dock dwell tracking & contractual detention claims</span>
              </p>
            </div>
          </div>

          {/* Desktop Navigation tabs */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-white/5">
            <button
              id="nav-driver"
              onClick={() => {
                triggerHapticTap();
                setActiveTab("driver");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-bold transition-all ${
                activeTab === "driver"
                  ? "bg-lime-400 text-slate-950 font-black shadow-md shadow-lime-500/20"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Driver Cab</span>
            </button>

            <button
              id="nav-driver-sms"
              onClick={() => {
                triggerHapticTap();
                setActiveTab("driver_sms");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-bold transition-all ${
                activeTab === "driver_sms"
                  ? "bg-lime-400 text-slate-950 font-black shadow-md shadow-lime-500/20"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Driver SMS</span>
            </button>

            <button
              id="nav-dispatcher-loads"
              onClick={() => {
                triggerHapticTap();
                setActiveTab("dispatcher_loads");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-bold transition-all ${
                activeTab === "dispatcher_loads"
                  ? "bg-lime-400 text-slate-950 font-black shadow-md shadow-lime-500/20"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Active Loads</span>
            </button>

            <button
              id="nav-dispatcher-claims"
              onClick={() => {
                triggerHapticTap();
                setActiveTab("dispatcher_claims");
              }}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-bold transition-all ${
                activeTab === "dispatcher_claims"
                  ? "bg-lime-400 text-slate-950 font-black shadow-md shadow-lime-500/20"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Claims</span>
              {atRiskCount > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                  {atRiskCount}
                </span>
              )}
            </button>

            <button
              id="nav-disputes-ar"
              onClick={() => {
                triggerHapticTap();
                setActiveTab("disputes_ar");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-bold transition-all ${
                activeTab === "disputes_ar"
                  ? "bg-lime-400 text-slate-950 font-black shadow-md shadow-lime-500/20"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>Disputes & A/R</span>
            </button>

            <button
              id="nav-prebooking-risk"
              onClick={() => {
                triggerHapticTap();
                setActiveTab("prebooking_risk");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-bold transition-all ${
                activeTab === "prebooking_risk"
                  ? "bg-lime-400 text-slate-950 font-black shadow-md shadow-lime-500/20"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Risk Multiplier</span>
            </button>

            <button
              id="nav-addendum-generator"
              onClick={() => {
                triggerHapticTap();
                setActiveTab("addendum_generator");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-bold transition-all ${
                activeTab === "addendum_generator"
                  ? "bg-lime-400 text-slate-950 font-black shadow-md shadow-lime-500/20"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              }`}
            >
              <FileSignature className="w-4 h-4" />
              <span>Addendum</span>
            </button>

            <button
              id="nav-broker-scorecards"
              onClick={() => {
                triggerHapticTap();
                setActiveTab("broker_scorecards");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-bold transition-all ${
                activeTab === "broker_scorecards"
                  ? "bg-lime-400 text-slate-950 font-black shadow-md shadow-lime-500/20"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Scorecards</span>
            </button>

            <button
              id="nav-rate-intelligence"
              onClick={() => {
                triggerHapticTap();
                setActiveTab("rate_intelligence");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-bold transition-all ${
                activeTab === "rate_intelligence"
                  ? "bg-lime-400 text-slate-950 font-black shadow-md shadow-lime-500/20"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Rates</span>
            </button>

            <button
              id="nav-telematics"
              onClick={() => {
                triggerHapticTap();
                setActiveTab("telematics");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-bold transition-all ${
                activeTab === "telematics"
                  ? "bg-lime-400 text-slate-950 font-black shadow-md shadow-lime-500/20"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>Telematics</span>
            </button>

            <button
              id="nav-rate-con"
              onClick={() => {
                triggerHapticTap();
                setActiveTab("rate_con");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-bold transition-all ${
                activeTab === "rate_con"
                  ? "bg-lime-400 text-slate-950 font-black shadow-md shadow-lime-500/20"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Rate Con</span>
            </button>
          </nav>

          {/* Action buttons: Install, Audio Chime, Demo Guide, Eval, Reset */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Install PWA Button for Android / iOS / Desktop */}
            <PWAInstallButton />

            {/* Cab Audio Alert Toggle */}
            <button
              onClick={() => {
                triggerHapticTap();
                if (!soundEnabled) {
                  playDetentionWarningSound();
                }
                onToggleSound();
              }}
              className={`p-1.5 rounded-xl border text-xs font-bold transition-all ${
                soundEnabled
                  ? "bg-lime-400/20 border-lime-400/50 text-lime-400 shadow-md shadow-lime-500/10"
                  : "bg-slate-900 border-white/10 text-slate-400 hover:text-white"
              }`}
              title={soundEnabled ? "Cab alert audio ON (tap to mute)" : "Cab alert audio MUTED (tap to enable chime)"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              id="btn-demo-script"
              onClick={() => {
                triggerHapticTap();
                onOpenDemoGuide();
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 text-xs font-black shadow-lg shadow-lime-500/20 transition-all active:scale-95"
              title="Open 90-second Demo Controller"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
              <span className="hidden sm:inline tracking-tight">90s Demo</span>
            </button>

            <button
              id="btn-eval-harness"
              onClick={() => {
                triggerHapticTap();
                onOpenEvalHarness();
              }}
              className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-bold transition-colors"
              title="Contract Extraction Accuracy Benchmark"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Eval (100%)</span>
            </button>

            <button
              id="btn-reset-demo"
              onClick={() => {
                triggerHapticTap();
                onResetDemo();
              }}
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 transition-colors"
              title="Reset Demo State"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  Camera,
  CheckCircle2,
  AlertOctagon,
  Navigation,
  FileCheck,
  Radio,
  RefreshCw,
  Info,
  Share2,
  Maximize2,
  Minimize2,
  Mic,
  BedDouble,
  Sparkles,
  Truck,
  Fuel,
  Gauge,
  Shield,
  AlertTriangle,
  Smartphone,
  Monitor,
  MapPin,
  Flame,
  Weight,
  Cpu,
} from "lucide-react";
import { Evidence, Stop } from "../types/dwell";
import { playDetentionExpiredAlert, playDetentionWarningSound, triggerHapticTap } from "../utils/audioAlerts";
import { OpticalWatermarkCamera } from "./OpticalWatermarkCamera";
import { VoiceEvidenceLogger } from "./VoiceEvidenceLogger";
import { HosRiskWarningWidget } from "./HosRiskWarningWidget";
import { HosClockRiskIndicator } from "./HosClockRiskIndicator";

interface DriverViewProps {
  activeStop: Stop | null;
  loadNumber: string;
  brokerName: string;
  clockData: any;
  onArrive: (source?: "manual" | "geofence", customTime?: string) => Promise<void>;
  onDepart: (source?: "manual" | "geofence", customTime?: string) => Promise<void>;
  onUploadEvidence: (type: string, label: string, notes?: string) => Promise<void>;
  onSimulateGpsFix: (isInside: boolean) => Promise<void>;
  onRefreshClock: () => Promise<void>;
  onViewClaim: () => void;
  soundEnabled?: boolean;
}

export const DriverView: React.FC<DriverViewProps> = ({
  activeStop,
  loadNumber,
  brokerName,
  clockData,
  onArrive,
  onDepart,
  onUploadEvidence,
  onSimulateGpsFix,
  onRefreshClock,
  onViewClaim,
  soundEnabled = true,
}) => {
  const [showProofModal, setShowProofModal] = useState(false);
  const [showWatermarkCamera, setShowWatermarkCamera] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [proofType, setProofType] = useState<string>("dock_stamp");
  const [proofLabel, setProofLabel] = useState<string>("Dock Door In/Out Stamp");
  const [proofNotes, setProofNotes] = useState<string>("");
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<"phone" | "expanded">("phone");
  const [activeTelemetryTab, setActiveTelemetryTab] = useState<"overview" | "tpms" | "engine">("overview");

  const lastStateRef = useRef<string>("");

  // Live seconds ticker to make countdown and dollars actively climb
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Audio & haptic trigger on state transitions
  useEffect(() => {
    if (!clockData?.state) return;
    const currentState = clockData.state;

    if (lastStateRef.current && lastStateRef.current !== currentState) {
      if (currentState === "free_time_expired") {
        if (soundEnabled) playDetentionExpiredAlert();
        else triggerHapticTap();
      } else if (currentState === "clock_running") {
        triggerHapticTap();
      } else if (currentState === "departed") {
        triggerHapticTap();
      }
    }
    lastStateRef.current = currentState;
  }, [clockData?.state, soundEnabled]);

  const toggleFullscreen = () => {
    triggerHapticTap();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleShareSummary = async () => {
    triggerHapticTap();
    const dollars = ((clockData?.amountCents || 0) / 100).toFixed(2);
    const textToShare = `Dwell Detention Alert:\nLoad #${loadNumber} (${brokerName})\nFacility: ${activeStop?.facilityName}\nStatus: ${clockData?.state === "free_time_expired" ? "DETENTION ACCRUING" : clockData?.state}\nBillable Dwell: ${clockData?.detentionMinutes || 0} mins ($${dollars})\nTelematics verified.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Detention Claim - Load #${loadNumber}`,
          text: textToShare,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(textToShare);
      alert("Dock summary copied to clipboard!");
    }
  };

  if (!activeStop || !clockData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mb-4 text-lime-400" />
        <p className="text-lg font-bold text-white">Connecting to Commercial Tractor ELD & Dock Clock...</p>
        <p className="text-xs text-slate-500 mt-1">Acquiring telematics satellite lock (Door Geofence: 250m)</p>
      </div>
    );
  }

  const state = clockData.state || "en_route"; // "en_route" | "clock_running" | "free_time_expired" | "departed"

  const freeMins = clockData.freeTimeRemainingMinutes || 0;
  const detentionMins = clockData.detentionMinutes || 0;
  const accruedCents = clockData.amountCents || 0;
  const accruedDollars = (accruedCents / 100).toFixed(2);
  const hourlyRateDollars = ((clockData.hourlyRateCents || 5000) / 100).toFixed(2);

  const countdownHours = Math.floor(freeMins / 60);
  const countdownMins = freeMins % 60;
  const countdownSeconds = Math.max(0, 59 - (currentTimeSec % 60));

  const handleCaptureProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUploadEvidence(proofType, proofLabel, proofNotes);
    setShowProofModal(false);
    setProofNotes("");
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[calc(100vh-5.5rem)] text-white select-none py-2">
      {/* Top View Mode Switcher (Mobile Mockup vs Expanded Cockpit) */}
      <div className="w-full max-w-md sm:max-w-xl lg:max-w-2xl flex items-center justify-between px-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-lime-400 animate-ping"></span>
          <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-lime-400" />
            ELD TELEMATICS LIVE
          </span>
        </div>

        <div className="flex items-center gap-1 bg-slate-900/90 border border-white/10 p-1 rounded-xl shadow-md">
          <button
            onClick={() => {
              triggerHapticTap();
              setViewMode("phone");
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              viewMode === "phone"
                ? "bg-lime-400 text-slate-950 font-black shadow-md shadow-lime-500/20"
                : "text-slate-400 hover:text-white"
            }`}
            title="Sleek Mobile App Shell view (Mining Fleet layout)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile App</span>
          </button>
          <button
            onClick={() => {
              triggerHapticTap();
              setViewMode("expanded");
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              viewMode === "expanded"
                ? "bg-lime-400 text-slate-950 font-black shadow-md shadow-lime-500/20"
                : "text-slate-400 hover:text-white"
            }`}
            title="Expanded Cockpit View for widescreen screens"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Cockpit View</span>
          </button>
        </div>
      </div>

      {/* Main Container: Smartphone Frame OR Expanded Cockpit */}
      <div
        className={`w-full transition-all duration-300 ${
          viewMode === "phone"
            ? "max-w-[430px] bg-[#0A0F1D] border-[5px] border-slate-800 rounded-[2.75rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] p-4 sm:p-5 relative overflow-hidden"
            : "max-w-4xl bg-[#090E1B] border border-white/10 rounded-3xl shadow-2xl p-4 sm:p-6"
        }`}
      >
        {/* Smartphone Dynamic Island & Status Bar (in phone mode) */}
        {viewMode === "phone" && (
          <div className="flex items-center justify-between px-2 pt-1 pb-3 text-xs text-slate-400 border-b border-white/5 mb-3">
            <span className="font-bold text-white tracking-tight">9:41</span>
            {/* Dynamic Island pill */}
            <div className="h-4 w-24 bg-slate-950 rounded-full border border-white/10 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse"></span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DWELL</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-[10px] font-bold">5G</span>
              <div className="w-5 h-2.5 border border-slate-400 rounded-sm p-0.5 flex items-center">
                <div className="h-full w-4 bg-lime-400 rounded-2xs"></div>
              </div>
            </div>
          </div>
        )}

        {/* Driver Operator & Truck Telematics Banner */}
        <div className="bg-[#0E1526] border border-white/5 rounded-2xl p-3 sm:p-4 mb-3 shadow-lg">
          <div className="flex items-center justify-between">
            {/* Driver Profile */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-500 text-slate-950 font-black text-base flex items-center justify-center shadow-lg shadow-lime-500/20 shrink-0">
                MV
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm text-white tracking-tight truncate">Marcus Vance</h3>
                  <span className="px-1.5 py-0.2 rounded bg-lime-400/20 text-lime-400 text-[10px] font-extrabold uppercase tracking-wide border border-lime-400/30">
                    MASTER CDL-A
                  </span>
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                  <Truck className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                  <span className="font-semibold text-slate-300">Freightliner Cascadia #418</span>
                  <span className="text-slate-500">• 53' Reefer</span>
                </p>
              </div>
            </div>

            {/* Quick Utility Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleShareSummary}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/5 transition"
                title="Share dock status with Dispatch / Broker"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/5 transition"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Display Mode"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Active Freight Load & Rate Pill */}
          <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Contract Load</span>
              <div className="font-black text-white text-sm">#{loadNumber}</div>
              <div className="text-[11px] text-slate-400 truncate max-w-[180px]">{brokerName}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase text-lime-400 tracking-wider block">Contractual Rate</span>
              <span className="font-mono text-base font-black text-lime-400 tracking-tight">${hourlyRateDollars}/hr</span>
              <span className="text-[10px] text-slate-400 block">(${(clockData.hourlyRateCents ? clockData.hourlyRateCents / 6000 : 1.42).toFixed(2)}/min)</span>
            </div>
          </div>
        </div>

        {/* Commercial Freight Haul Truck Telemetry Strip (4 Metric Grid) */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-lime-400" />
              VEHICLE TELEMATICS (J1939 CAN-BUS)
            </span>
            <span className="text-[10px] font-bold text-lime-400 bg-lime-400/10 px-2 py-0.5 rounded-full border border-lime-400/20">
              ALL SYSTEMS NOMINAL
            </span>
          </div>

          {/* 4 Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* 1. Diesel Fuel */}
            <div className="bg-[#0E1526] border border-white/5 rounded-2xl p-2.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Diesel</span>
                <Fuel className="w-3.5 h-3.5 text-lime-400" />
              </div>
              <div className="font-mono text-lg font-black text-white">184 GAL</div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                <div className="bg-lime-400 h-full rounded-full w-[84%]"></div>
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-semibold">
                <span>84% Full</span>
                <span className="text-lime-400">736 mi</span>
              </div>
            </div>

            {/* 2. TPMS */}
            <div className="bg-[#0E1526] border border-white/5 rounded-2xl p-2.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">TPMS</span>
                <Gauge className="w-3.5 h-3.5 text-lime-400" />
              </div>
              <div className="font-mono text-lg font-black text-white">105 PSI</div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                <div className="bg-lime-400 h-full rounded-full w-[96%]"></div>
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-semibold">
                <span>18 Wheels</span>
                <span className="text-lime-400">Optimal</span>
              </div>
            </div>

            {/* 3. Engine Temp */}
            <div className="bg-[#0E1526] border border-white/5 rounded-2xl p-2.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Coolant</span>
                <Flame className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="font-mono text-lg font-black text-white">192°F</div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full w-[65%]"></div>
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-semibold">
                <span>Detroit DD15</span>
                <span className="text-emerald-400">99% Health</span>
              </div>
            </div>

            {/* 4. Cargo Weight / Payload */}
            <div className="bg-[#0E1526] border border-white/5 rounded-2xl p-2.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Payload</span>
                <Weight className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="font-mono text-lg font-black text-white">41,200#</div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                <div className="bg-cyan-400 h-full rounded-full w-[92%]"></div>
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-semibold">
                <span>53' Van</span>
                <span className="text-cyan-400">92% Cap</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Icon Quick Thumb Operations Grid (Tactile Squircles matching the Dribbble app) */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <button
            id="btn-quick-proof"
            onClick={() => {
              triggerHapticTap();
              setShowProofModal(true);
            }}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#0E1526] hover:bg-slate-800 border border-white/5 active:scale-95 transition shadow-sm group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
              <Camera className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-[10px] font-black text-white">Proof Cam</span>
          </button>

          <button
            id="btn-quick-voice"
            onClick={() => {
              triggerHapticTap();
              setShowVoiceModal(true);
            }}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#0E1526] hover:bg-slate-800 border border-white/5 active:scale-95 transition shadow-sm group"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
              <Mic className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-[10px] font-black text-white">Voice Log</span>
          </button>

          <button
            id="btn-quick-geofence"
            onClick={() => {
              triggerHapticTap();
              onSimulateGpsFix(true);
            }}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#0E1526] hover:bg-slate-800 border border-white/5 active:scale-95 transition shadow-sm group"
          >
            <div className="w-9 h-9 rounded-xl bg-lime-400/20 border border-lime-400/30 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
              <Navigation className="w-4 h-4 text-lime-400" />
            </div>
            <span className="text-[10px] font-black text-white">Geofence</span>
          </button>

          <button
            id="btn-quick-claim"
            onClick={() => {
              triggerHapticTap();
              onViewClaim();
            }}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#0E1526] hover:bg-slate-800 border border-white/5 active:scale-95 transition shadow-sm group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
              <FileCheck className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-[10px] font-black text-white">Claim Slip</span>
          </button>
        </div>

        {/* Facility Target Information */}
        <div className="bg-[#0E1526] border border-white/5 rounded-2xl p-3 mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
              {activeStop.type === "delivery" ? "Delivery Receiver" : "Pickup Shipper"}
            </span>
            <span className="text-[10px] font-bold text-lime-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-lime-400" />
              Dock Radius 250m
            </span>
          </div>
          <h2 className="text-lg font-black text-white tracking-tight leading-tight">
            {activeStop.facilityName}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{activeStop.facilityAddress}</p>
        </div>

        {/* REAL-TIME DWELL & DETENTION COCKPIT DISPLAY */}
        {/* STATE 1: EN ROUTE */}
        {state === "en_route" && (
          <div className="p-4 bg-gradient-to-b from-[#0D1527] to-[#0A0F1D] border border-white/10 rounded-2xl mb-3 text-center shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto mb-3">
              <Navigation className="w-7 h-7 text-blue-400 animate-pulse" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest text-blue-400 mb-1 block">
              STATUS: APPROACHING DOCK
            </span>
            <h3 className="text-2xl font-black text-white tracking-tight mb-1">En Route to Facility</h3>
            <p className="text-xs text-slate-300 max-w-xs mx-auto mb-4">
              Scheduled window opens:{" "}
              <span className="font-bold text-white">
                {activeStop.appointmentStart
                  ? new Date(activeStop.appointmentStart).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Open Dock Window"}
              </span>
            </p>

            <div className="space-y-2">
              <button
                id="btn-driver-arrive"
                onClick={() => onArrive("manual")}
                className="w-full py-4 rounded-2xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-xl tracking-wide shadow-xl shadow-lime-500/25 active:scale-95 transition-transform"
              >
                I'M HERE (IN-GATE)
              </button>

              <button
                id="btn-sim-geofence"
                onClick={() => onSimulateGpsFix(true)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-white/5 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Radio className="w-3.5 h-3.5 text-lime-400" />
                Simulate 250m Dock Geofence Crossing
              </button>
            </div>
          </div>
        )}

        {/* STATE 2: CLOCK RUNNING (Within Free Time) */}
        {state === "clock_running" && (
          <div className="p-4 bg-gradient-to-b from-[#0D1527] to-[#0A0F1D] border border-lime-500/30 rounded-2xl mb-3 text-center shadow-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 text-xs font-black uppercase tracking-wider mb-2">
              <Clock className="w-3.5 h-3.5" />
              Dock Clock Running
            </div>

            <p className="text-[11px] uppercase font-black text-slate-400 tracking-wider">
              Contractual Free Time Remaining
            </p>

            {/* Giant High-Contrast Digital Countdown in Neon Lime */}
            <div className="my-2 py-3 px-4 rounded-2xl bg-[#060A14] border border-white/10 w-full text-center shadow-inner">
              <span className="font-mono text-5xl sm:text-6xl font-black text-lime-400 tracking-tight">
                {String(countdownHours).padStart(2, "0")}:{String(countdownMins).padStart(2, "0")}:
                {String(countdownSeconds).padStart(2, "0")}
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4 max-w-xs mx-auto">
              In-gate logged at{" "}
              <span className="text-white font-bold">
                {clockData.arrivedAt ? new Date(clockData.arrivedAt).toLocaleTimeString() : "--"}
              </span>
              . Contractual detention at <span className="text-lime-400 font-bold">${hourlyRateDollars}/hr</span> starts
              the second clock hits zero.
            </p>

            {/* Primary Proof Capture Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                id="btn-driver-capture-proof"
                onClick={() => setShowProofModal(true)}
                className="py-3 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm tracking-wide shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-1.5"
              >
                <Camera className="w-4 h-4" />
                CAPTURE BOL
              </button>
              <button
                id="btn-driver-voice-memo"
                onClick={() => {
                  triggerHapticTap();
                  setShowVoiceModal(true);
                }}
                className="py-3 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-purple-600/30 active:scale-95 transition-transform flex items-center justify-center gap-1.5"
              >
                <Mic className="w-4 h-4 text-purple-200" />
                VOICE LOG
              </button>
            </div>

            {/* Fast-forward Demo triggers */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                id="btn-fast-forward-expiry"
                onClick={async () => {
                  const expiredArrival = new Date(Date.now() - 135 * 60 * 1000).toISOString();
                  await onArrive("manual", expiredArrival);
                }}
                className="py-2 px-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-bold border border-white/5"
                title="Fast-forward time past 2 hours free time"
              >
                +2.2h Expiry
              </button>
              <button
                id="btn-fast-forward-10h-layover"
                onClick={async () => {
                  const layoverArrival = new Date(Date.now() - 630 * 60 * 1000).toISOString();
                  await onArrive("manual", layoverArrival);
                }}
                className="py-2 px-1 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 text-[11px] font-bold border border-rose-700/60 flex items-center justify-center gap-1"
                title="Simulate 10.5h Dwell to trigger $500 Layover Claim prompt"
              >
                <BedDouble className="w-3 h-3 text-rose-400" />
                <span>10.5h Layover</span>
              </button>
              <button
                id="btn-driver-depart-early"
                onClick={() => onDepart("manual")}
                className="py-2 px-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-[11px] font-bold border border-white/5"
              >
                Depart Now
              </button>
            </div>
          </div>
        )}

        {/* STATE 3: FREE TIME EXPIRED (Detention Accruing) */}
        {state === "free_time_expired" && (
          <div className="p-4 bg-gradient-to-b from-amber-950/70 via-[#0C1222] to-red-950/70 border-2 border-amber-400 rounded-2xl mb-3 text-center shadow-[0_0_35px_rgba(245,158,11,0.25)]">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider mb-2 animate-pulse">
              <AlertOctagon className="w-4 h-4 fill-slate-950 text-amber-400" />
              DETENTION ACCRUING NOW
            </div>

            <p className="text-[11px] uppercase font-black text-amber-300 tracking-wider">
              Free Time Exhausted • Broker Rate: ${hourlyRateDollars}/HR
            </p>

            {/* Glowing Dollar Accumulator in High-Contrast Mono */}
            <div className="my-2 py-3 px-4 rounded-2xl bg-slate-950 border border-amber-400/50 w-full text-center shadow-inner">
              <span className="font-mono text-5xl sm:text-6xl font-black text-amber-400 tracking-tight drop-shadow">
                +${accruedDollars}
              </span>
              <div className="text-xs font-bold text-amber-200 mt-1">
                {Math.floor(detentionMins / 60)}h {detentionMins % 60}m billable dwell past free time
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-3 max-w-xs mx-auto">
              Contractual notice required before departure. Ensure stamped BOL or dock photo is attached to secure full settlement.
            </p>

            {/* Proof Actions */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                id="btn-driver-capture-proof-urgent"
                onClick={() => setShowProofModal(true)}
                className="py-3 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm tracking-wide shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-1.5"
              >
                <Camera className="w-4 h-4" />
                ⚠️ SNAP PROOF
              </button>
              <button
                id="btn-driver-voice-memo-urgent"
                onClick={() => {
                  triggerHapticTap();
                  setShowVoiceModal(true);
                }}
                className="py-3 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs sm:text-sm tracking-wide shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-1.5"
              >
                <Mic className="w-4 h-4 text-purple-200" />
                VOICE DELAY LOG
              </button>
            </div>

            {/* Departure Button */}
            <div className="space-y-2">
              <button
                id="btn-driver-depart"
                onClick={() => onDepart("manual")}
                className="w-full py-3.5 rounded-2xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-base shadow-lg shadow-lime-500/20 active:scale-95 transition-transform"
              >
                I'VE DEPARTED (UNLOAD COMPLETE)
              </button>

              <button
                id="btn-fast-forward-10h-layover-state3"
                onClick={async () => {
                  const layoverArrival = new Date(Date.now() - 630 * 60 * 1000).toISOString();
                  await onArrive("manual", layoverArrival);
                }}
                className="w-full py-2 px-3 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-200 text-xs font-bold border border-rose-700/60 flex items-center justify-center gap-1.5 transition-colors"
                title="Simulate 10.5h dwell to trigger $500 Layover prompt"
              >
                <BedDouble className="w-3.5 h-3.5 text-rose-400" />
                <span>Simulate 10.5h Dwell (Trigger $500 Layover Invoice)</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE 4: DEPARTED */}
        {state === "departed" && (
          <div className="p-4 bg-gradient-to-b from-[#0D1527] to-[#0A0F1D] border border-lime-500/40 rounded-2xl mb-3 text-center shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-lime-400/20 border border-lime-400/40 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-7 h-7 text-lime-400" />
            </div>

            <span className="text-[11px] font-black uppercase tracking-widest text-lime-400 mb-1 block">
              STOP COMPLETE & AUDITED
            </span>
            <h3 className="text-xl font-black text-white mb-1">Detention Claim Assembled</h3>

            {/* Total Accrued Card */}
            <div className="my-2 p-3 rounded-xl bg-[#060A14] border border-white/10 w-full text-center">
              <div className="text-[10px] text-slate-400 font-black uppercase">Total Billable Claim</div>
              <div className="font-mono text-4xl sm:text-5xl font-black text-lime-400 my-1">
                ${accruedDollars}
              </div>
              <div className="text-xs text-slate-300">
                {Math.floor(detentionMins / 60)}h {detentionMins % 60}m billed at ${hourlyRateDollars}/hr
              </div>
            </div>

            {/* Filing Deadline Notice */}
            <div className="w-full p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mb-3 text-left flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <span>Filing Deadline: </span>
                <span className="font-bold text-white">
                  {clockData.filingDeadlineAt
                    ? new Date(clockData.filingDeadlineAt).toLocaleString()
                    : "Within 24 Hours"}
                </span>
                <p className="text-[11px] text-amber-200/80 font-normal mt-0.5">
                  Pre-drafted claim email with verified in-gate/out-gate stamps and BOL proof is ready for review.
                </p>
              </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-2 mb-2">
              <button
                id="btn-driver-view-claim"
                onClick={onViewClaim}
                className="py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-sm shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1.5"
              >
                <FileCheck className="w-4 h-4" />
                VIEW CLAIM
              </button>
              <button
                id="btn-driver-share-claim"
                onClick={handleShareSummary}
                className="py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 font-bold text-sm shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-4 h-4 text-lime-400" />
                SHARE PROOF
              </button>
            </div>
          </div>
        )}

        {/* Hours of Service (14-Hour Clock Risk & Radar Indicator) */}
        {activeStop && (
          <div className="my-2.5">
            <HosClockRiskIndicator
              clockData={clockData}
              stop={activeStop}
              loadNumber={loadNumber}
              onEscalateToLayover={onRefreshClock}
            />
          </div>
        )}

        {/* Evidence & Missing Contractual Documents Checklist */}
        <div className="bg-[#0E1526] border border-white/5 rounded-2xl p-3 text-xs">
          <div className="flex items-center justify-between text-slate-400 font-bold mb-2">
            <span className="tracking-wide uppercase font-black text-slate-300">Evidence Packet</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  triggerHapticTap();
                  setShowVoiceModal(true);
                }}
                className="text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-lg transition"
              >
                <Mic className="w-3 h-3" />
                <span>+ Voice Note</span>
              </button>
              <span className={clockData.isEvidenceComplete ? "text-lime-400 font-bold" : "text-amber-400 font-bold"}>
                {clockData.evidence?.length || 0} Attached
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            {clockData.evidence?.map((ev: Evidence) => (
              <div
                key={ev.id}
                className="p-2 rounded-xl bg-[#060A14] border border-white/5 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-lime-300 truncate font-semibold">
                    {ev.type === "voice_memo" ? (
                      <Mic className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                    )}
                    <span className="truncate">{ev.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">
                    {new Date(ev.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {ev.transcript && (
                  <p className="text-[11px] text-slate-300 italic pl-4 line-clamp-2 border-l-2 border-purple-500/50 ml-1">
                    "{ev.transcript}"
                  </p>
                )}
              </div>
            ))}
            {clockData.missingDocs?.map((doc: string) => (
              <div key={doc} className="flex items-center gap-1.5 text-slate-400 py-0.5">
                <div className="w-2.5 h-2.5 rounded-full border border-slate-600 shrink-0" />
                <span className="text-slate-400 truncate">Contractual requirement: {doc.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Proof Capture Modal */}
      {showProofModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0E1526] border border-white/10 rounded-2xl w-full max-w-sm p-5 text-white shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-base flex items-center gap-2 text-white">
                <Camera className="w-5 h-5 text-lime-400" />
                Attach Dock Proof
              </h3>
              <button
                onClick={() => setShowProofModal(false)}
                className="text-slate-400 hover:text-white text-base font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Direct Optical Watermarking & Hands-Free Audio Action */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setShowProofModal(false);
                  setShowWatermarkCamera(true);
                }}
                className="p-3 bg-lime-400/10 hover:bg-lime-400/20 border border-lime-400/30 rounded-xl text-center flex flex-col items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
              >
                <div className="p-1.5 rounded-lg bg-lime-400/20 text-lime-400">
                  <Camera className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-lime-400">Watermark Cam</span>
                <span className="text-[10px] text-slate-400 leading-tight">Burn GPS & Clock</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowProofModal(false);
                  setShowVoiceModal(true);
                }}
                className="p-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl text-center flex flex-col items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
              >
                <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                  <Mic className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-purple-300">Voice Memo</span>
                <span className="text-[10px] text-slate-400 leading-tight">Dictate Dock Delay</span>
              </button>
            </div>

            <form onSubmit={handleCaptureProofSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Evidence Type</label>
                <select
                  value={proofType}
                  onChange={(e) => {
                    setProofType(e.target.value);
                    if (e.target.value === "dock_stamp") setProofLabel("Dock Door In/Out Stamp");
                    if (e.target.value === "signed_bol") setProofLabel("Signed Bill of Lading (BOL)");
                    if (e.target.value === "gate_pass") setProofLabel("Facility Gate Pass Receipt");
                    if (e.target.value === "facility_photo") setProofLabel("Truck at Dock Door Photo");
                  }}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-lime-400"
                >
                  <option value="dock_stamp">Facility Dock In/Out Stamp (Strongest)</option>
                  <option value="signed_bol">Signed Bill of Lading (BOL)</option>
                  <option value="gate_pass">Guard Shack Gate Pass</option>
                  <option value="facility_photo">Photo of Truck at Dock Door</option>
                  <option value="gps_log">ELD Telematics GPS Log</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Label / Reference</label>
                <input
                  type="text"
                  value={proofLabel}
                  onChange={(e) => setProofLabel(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-lime-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Notes / Door # / Security Badge</label>
                <textarea
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  placeholder="e.g. Stamped by dock clerk Door #14, time stamp 07:15"
                  rows={2}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProofModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 text-slate-300 font-bold text-xs border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-xs shadow-md"
                >
                  Upload Proof
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Optical Watermark Camera Full-Screen Component */}
      {showWatermarkCamera && activeStop && (
        <OpticalWatermarkCamera
          activeStop={activeStop}
          loadNumber={loadNumber}
          brokerName={brokerName}
          onClose={() => setShowWatermarkCamera(false)}
          onEvidenceCaptured={async () => {
            setShowWatermarkCamera(false);
            await onRefreshClock();
          }}
        />
      )}

      {/* Browser Microphone Voice Evidence Logger with AI Audio-to-Text */}
      {showVoiceModal && activeStop && (
        <VoiceEvidenceLogger
          stopId={activeStop.id}
          facilityName={activeStop.facilityName}
          loadNumber={loadNumber}
          brokerName={brokerName}
          mode="modal"
          onClose={() => setShowVoiceModal(false)}
          onEvidenceLogged={async () => {
            setShowVoiceModal(false);
            await onRefreshClock();
          }}
        />
      )}
    </div>
  );
};

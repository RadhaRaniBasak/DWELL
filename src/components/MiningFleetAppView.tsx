import React, { useState, useEffect } from "react";
import {
  Truck,
  Wrench,
  Clock,
  Navigation,
  FileCheck,
  AlertTriangle,
  Radio,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  Bell,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ArrowRight,
  Plus,
  Compass,
  Gauge,
  Scale,
  Building2,
  BarChart3,
  Smartphone,
  Monitor,
  Flame,
  Zap,
} from "lucide-react";
import { MiningTruck, ServiceWorkOrder, PitGeofenceZone } from "../types/miningFleet";
import { SAMPLE_MINING_TRUCKS, INITIAL_SERVICE_WORK_ORDERS, PIT_GEOFENCE_ZONES } from "../data/miningFleetData";
import { MiningTruckVisual } from "./MiningTruckVisual";
import { ServiceBookingModal } from "./ServiceBookingModal";
import { triggerHapticTap } from "../utils/audioAlerts";
import { NavTabType } from "./Header";
import { Stop } from "../types/dwell";

interface MiningFleetAppViewProps {
  activeStop: Stop | null;
  loadNumber: string;
  brokerName: string;
  clockData: any;
  onArrive: (source?: "manual" | "geofence", customTime?: string) => Promise<void>;
  onDepart: (source?: "manual" | "geofence", customTime?: string) => Promise<void>;
  onSimulateGpsFix: (isInside: boolean) => Promise<void>;
  onNavigateToTab: (tab: NavTabType) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const MiningFleetAppView: React.FC<MiningFleetAppViewProps> = ({
  activeStop,
  loadNumber,
  brokerName,
  clockData,
  onArrive,
  onDepart,
  onSimulateGpsFix,
  onNavigateToTab,
  soundEnabled,
  onToggleSound,
}) => {
  const [trucks, setTrucks] = useState<MiningTruck[]>(SAMPLE_MINING_TRUCKS);
  const [selectedTruckId, setSelectedTruckId] = useState<string>("truck-418");
  const [workOrders, setWorkOrders] = useState<ServiceWorkOrder[]>(INITIAL_SERVICE_WORK_ORDERS);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"device" | "expanded">("device");
  const [activeBottomNav, setActiveBottomNav] = useState<"fleet" | "dwell" | "service" | "map" | "analytics">("fleet");
  const [hotspotDetail, setHotspotDetail] = useState<string | null>(null);
  const [tickerSec, setTickerSec] = useState<number>(0);

  // Live seconds ticker for smooth counter animation
  useEffect(() => {
    const timer = setInterval(() => {
      setTickerSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentTruck = trucks.find((t) => t.id === selectedTruckId) || trucks[0];

  // Dynamic Dwell dollars from clockData or simulated
  const dwellDollars = clockData?.amountCents
    ? (clockData.amountCents / 100).toFixed(2)
    : "63.75";
  const dwellMinutes = clockData?.detentionMinutes ?? 45;
  const isClockRunning = clockData?.state === "clock_running" || clockData?.state === "free_time_expired";
  const isFreeTimeExpired = clockData?.state === "free_time_expired";

  const handleBookService = (newOrder: ServiceWorkOrder) => {
    setWorkOrders((prev) => [newOrder, ...prev]);
  };

  const handleSelectTruck = (truckId: string) => {
    triggerHapticTap();
    setSelectedTruckId(truckId);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center transition-all duration-300">
      {/* Top View Mode Switcher on Desktop (Phone Frame vs Wide Canvas) */}
      <div className="hidden lg:flex items-center justify-between w-full max-w-5xl mb-4 px-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase font-bold text-slate-400">
            Design Mode:
          </span>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex gap-1">
            <button
              onClick={() => {
                triggerHapticTap();
                setViewMode("device");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === "device"
                  ? "bg-lime-400 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile Device Mockup (Dribbble View)</span>
            </button>
            <button
              onClick={() => {
                triggerHapticTap();
                setViewMode("expanded");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === "expanded"
                  ? "bg-lime-400 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Expanded Cockpit View</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-lime-400 bg-lime-500/10 border border-lime-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
            Iron Ridge Pit Alpha-04 • Telematics Synced
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE DEVICE CONTAINER (OR FLUID EXPANDED)                                */}
      {/* ========================================================================= */}
      <div
        className={`w-full transition-all duration-300 ${
          viewMode === "device"
            ? "max-w-[430px] rounded-[48px] border-[10px] border-slate-800 bg-[#090D16] shadow-[0_25px_70px_rgba(0,0,0,0.9)] ring-1 ring-white/10 overflow-hidden relative"
            : "max-w-5xl rounded-3xl border border-slate-800 bg-[#090D16] shadow-2xl p-4 sm:p-6"
        }`}
      >
        {/* Phone Notch & Status Bar (in Device Mode) */}
        {viewMode === "device" && (
          <div className="w-full bg-[#090D16] pt-3 px-6 pb-2 flex items-center justify-between text-[11px] font-semibold text-slate-300 select-none z-30">
            <span className="font-mono font-bold tracking-tight text-white">9:41</span>

            {/* Dynamic Island Pill */}
            <div className="w-24 h-4.5 bg-black rounded-full flex items-center justify-center gap-1.5 border border-white/5">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-ping" />
              <span className="text-[8px] font-mono text-slate-300 font-bold uppercase tracking-wider">
                PIT CH-14
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="text-[9px] font-mono font-black text-lime-400">5G</span>
              <Radio className="w-3 h-3 text-slate-300" />
              <div className="w-5 h-2.5 border border-slate-400 rounded-sm p-0.5 flex items-center">
                <div className="h-full bg-lime-400 rounded-xs w-4/5" />
              </div>
            </div>
          </div>
        )}

        {/* Inner Scrollable Mobile Screen Content */}
        <div className="p-4 sm:p-5 space-y-4 pb-24 text-slate-100 font-sans">
          {/* Top Header Bar (Operator Avatar & Site Status) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-400 to-lime-400 p-0.5 shadow-md shadow-amber-500/20">
                  <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center font-black text-white text-sm">
                    MV
                  </div>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-lime-400 border-2 border-slate-950" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="font-black text-sm text-white tracking-tight">
                    {currentTruck.operatorName}
                  </h2>
                  <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    OP-782
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {currentTruck.locationName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onToggleSound}
                className={`p-2 rounded-xl border text-slate-300 transition-colors ${
                  soundEnabled
                    ? "bg-slate-900/90 border-slate-800 text-lime-400"
                    : "bg-slate-900/40 border-slate-800 text-slate-500"
                }`}
                title={soundEnabled ? "Audio Alarms On" : "Audio Muted"}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                onClick={() => {
                  triggerHapticTap();
                  setIsServiceModalOpen(true);
                }}
                className="relative p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4 text-slate-300" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              </button>
            </div>
          </div>

          {/* Mining Truck Fleet Roster Selector (Horizontal Thumb Scroll) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Active Mining Fleet</span>
              <span className="text-lime-400 font-mono font-semibold">
                {trucks.length} Haulers Connected
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
              {trucks.map((t) => {
                const isSelected = t.id === selectedTruckId;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTruck(t.id)}
                    className={`shrink-0 px-3 py-2 rounded-2xl border text-left transition-all flex items-center gap-2 ${
                      isSelected
                        ? "bg-gradient-to-r from-slate-900 to-slate-850 border-lime-400/80 shadow-md shadow-lime-500/10 ring-1 ring-lime-400/40"
                        : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/60 text-slate-400"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                        isSelected
                          ? "bg-lime-400 text-slate-950"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {t.truckNumber}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white leading-tight">
                        {t.model.split(" ")[0]} {t.truckNumber}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {t.payloadTonnes > 0 ? `${t.payloadTonnes}T Ore` : "Empty Bay"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hero Mining Truck Telematics Card */}
          <div className="bg-gradient-to-b from-[#131B2E] via-[#0F1626] to-[#0A0E18] border border-slate-800/90 rounded-3xl p-4 shadow-xl relative overflow-hidden space-y-3">
            {/* Top Badge Row */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-amber-400 tracking-wider block">
                  {currentTruck.manufacturer} • {currentTruck.className}
                </span>
                <h3 className="text-lg font-black text-white tracking-tight">
                  {currentTruck.model}
                </h3>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-400 block">Operating Hours</span>
                <span className="text-xs font-mono font-black text-slate-200">
                  {currentTruck.hoursOperating.toLocaleString()} HRS
                </span>
              </div>
            </div>

            {/* Heavy Mining Truck Visual Component */}
            <MiningTruckVisual
              truck={currentTruck}
              onSelectHotspot={(part) => {
                triggerHapticTap();
                setHotspotDetail(part);
              }}
              selectedHotspot={hotspotDetail}
            />

            {/* 4-Metric Industrial Telemetry Grid (Inspired by Sajib's Dribbble Card) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {/* 1. Fuel / Diesel */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span className="uppercase font-bold tracking-wider">Diesel</span>
                  <span className="text-lime-400 font-mono">⛽ {currentTruck.fuelPercent}%</span>
                </div>
                <div className="mt-1.5">
                  <span className="text-sm font-black text-white font-mono">
                    {currentTruck.fuelGallons}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono ml-1">GAL</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-lime-500 to-lime-400 rounded-full"
                    style={{ width: `${currentTruck.fuelPercent}%` }}
                  />
                </div>
              </div>

              {/* 2. TPMS Tire Pressure */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span className="uppercase font-bold tracking-wider">TPMS</span>
                  <span
                    className={`font-mono text-[9px] font-bold px-1 rounded ${
                      currentTruck.tireStatus === "optimal"
                        ? "bg-lime-500/20 text-lime-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {currentTruck.tireStatus === "optimal" ? "NORMAL" : "CHECK"}
                  </span>
                </div>
                <div className="mt-1.5">
                  <span className="text-sm font-black text-white font-mono">
                    {currentTruck.tirePressurePsi}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono ml-1">PSI</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">
                  6/6 Giant 63" Wheels
                </div>
              </div>

              {/* 3. Engine Temp */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span className="uppercase font-bold tracking-wider">Coolant</span>
                  <span className="text-lime-400 font-mono">🌡️ OPTIMAL</span>
                </div>
                <div className="mt-1.5">
                  <span className="text-sm font-black text-white font-mono">
                    {currentTruck.engineTempF}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono ml-1">°F</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">
                  Health: {currentTruck.engineHealthPercent}%
                </div>
              </div>

              {/* 4. Ore Payload */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span className="uppercase font-bold tracking-wider">Payload</span>
                  <span className="text-amber-400 font-mono">
                    {Math.round((currentTruck.payloadTonnes / currentTruck.maxPayloadTonnes) * 100)}%
                  </span>
                </div>
                <div className="mt-1.5">
                  <span className="text-sm font-black text-white font-mono">
                    {currentTruck.payloadTonnes}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono ml-1">TON</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                    style={{
                      width: `${Math.round(
                        (currentTruck.payloadTonnes / currentTruck.maxPayloadTonnes) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* REAL-TIME DWELL & DETENTION AUDIT CARD (Core Dwell Engine Integration)    */}
          {/* ========================================================================= */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-amber-500/40 rounded-3xl p-4 shadow-xl space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                  Live Pit Dwell & Contractual Detention
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold">
                $85.00 / HR
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-2xl p-3">
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 block">
                  Location / Facility
                </span>
                <strong className="text-xs text-white font-bold block truncate max-w-[180px]">
                  {activeStop?.facilityName || "Iron Ridge Crusher & Ore Hopper #1"}
                </strong>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Geofence Verified
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">
                  Detention Accrued
                </span>
                <span className="text-xl font-black font-mono text-amber-400 tracking-tight">
                  ${dwellDollars}
                </span>
                <span className="text-[10px] text-slate-400 font-mono block">
                  {dwellMinutes} min billable dwell
                </span>
              </div>
            </div>

            {/* Quick Action Buttons for Driver/Operator */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onArrive("geofence")}
                className="py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>In-Gate</span>
              </button>

              <button
                onClick={() => onDepart("geofence")}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Depart</span>
              </button>

              <button
                onClick={() => onNavigateToTab("disputes_ar")}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span>Rebuttal</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SAJIB'S 4-ICON QUICK THUMB ACTION GRID                                   */}
          {/* ========================================================================= */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Quick Operations & Dispatch
            </span>

            <div className="grid grid-cols-4 gap-2">
              {/* 1. Book Service */}
              <button
                onClick={() => {
                  triggerHapticTap();
                  setIsServiceModalOpen(true);
                }}
                className="p-3 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-lime-500/50 flex flex-col items-center gap-1.5 text-center transition-all group active:scale-95 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-lime-500/15 border border-lime-500/30 text-lime-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Wrench className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-200">Book Repair</span>
              </button>

              {/* 2. Detention Clock */}
              <button
                onClick={() => {
                  triggerHapticTap();
                  onNavigateToTab("driver");
                }}
                className="p-3 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-amber-500/50 flex flex-col items-center gap-1.5 text-center transition-all group active:scale-95 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-200">Dwell Clock</span>
              </button>

              {/* 3. Claims Pipeline */}
              <button
                onClick={() => {
                  triggerHapticTap();
                  onNavigateToTab("dispatcher_claims");
                }}
                className="p-3 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-blue-500/50 flex flex-col items-center gap-1.5 text-center transition-all group active:scale-95 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileCheck className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-200">Claims</span>
              </button>

              {/* 4. Pit Geofence Radar */}
              <button
                onClick={() => {
                  triggerHapticTap();
                  onNavigateToTab("telematics");
                }}
                className="p-3 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-emerald-500/50 flex flex-col items-center gap-1.5 text-center transition-all group active:scale-95 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Navigation className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-200">Geofence</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* UPCOMING SERVICE & REPAIRS HUB (Directly from Dribbble Concept)           */}
          {/* ========================================================================= */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-lime-400" />
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  Preventive Maintenance & Repair Hub
                </h4>
              </div>
              <button
                onClick={() => {
                  triggerHapticTap();
                  setIsServiceModalOpen(true);
                }}
                className="text-xs text-lime-400 hover:text-lime-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>+ Book Service</span>
              </button>
            </div>

            {/* List of Work Orders */}
            <div className="space-y-2">
              {workOrders.map((wo) => (
                <div
                  key={wo.id}
                  className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 flex flex-col gap-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-extrabold text-lime-400">
                          {wo.id}
                        </span>
                        <span
                          className={`text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-full ${
                            wo.urgency === "critical"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : wo.urgency === "moderate"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {wo.urgency}
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-white mt-1 leading-snug">
                        {wo.title}
                      </h5>
                    </div>

                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {wo.model.split(" ")[0]} #{wo.truckNumber}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                    <span className="truncate">{wo.serviceBay}</span>
                    <span className="font-mono text-slate-300 font-semibold shrink-0">
                      {wo.scheduledTime}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PIT GEOFENCE RADAR & ORE TRAFFIC STATUS                                   */}
          {/* ========================================================================= */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-emerald-400" />
                Mine Pit Geofence Radar
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Real-time GPS Fixes</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {PIT_GEOFENCE_ZONES.map((zone) => (
                <div
                  key={zone.id}
                  className="bg-slate-950/60 border border-slate-800 rounded-2xl p-2.5 text-xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-white text-[11px] truncate">{zone.name.split("(")[0]}</strong>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        zone.status === "congested"
                          ? "bg-rose-400 animate-ping"
                          : "bg-emerald-400"
                      }`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 font-mono">
                    <span>{zone.activeTruckCount} Trucks</span>
                    <span className="text-amber-400">{zone.averageDwellMinutes}m Avg Dwell</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SAJIB'S 5-TAB FLOATING BOTTOM NAVIGATION BAR                              */}
        {/* ========================================================================= */}
        <div className="absolute bottom-0 inset-x-0 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-4 py-2.5 flex items-center justify-between z-40">
          {[
            { id: "fleet", label: "Fleet", icon: Truck, targetTab: null },
            { id: "dwell", label: "Dwell", icon: Clock, targetTab: "driver" as NavTabType },
            { id: "service", label: "Service", icon: Wrench, action: () => setIsServiceModalOpen(true) },
            { id: "map", label: "Pit Map", icon: Navigation, targetTab: "telematics" as NavTabType },
            { id: "analytics", label: "Scorecards", icon: BarChart3, targetTab: "broker_scorecards" as NavTabType },
          ].map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeBottomNav === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  triggerHapticTap();
                  setActiveBottomNav(tab.id as any);
                  if (tab.action) {
                    tab.action();
                  } else if (tab.targetTab) {
                    onNavigateToTab(tab.targetTab);
                  }
                }}
                className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all cursor-pointer ${
                  isTabActive
                    ? "text-lime-400 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-all ${
                    isTabActive
                      ? "bg-lime-400/15 border border-lime-400/30 text-lime-400 shadow-sm shadow-lime-500/20"
                      : "text-slate-400"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Service & Repair Booking Modal */}
      <ServiceBookingModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        truck={currentTruck}
        onBookService={handleBookService}
      />
    </div>
  );
};

import React from "react";
import { MiningTruck } from "../types/miningFleet";

interface MiningTruckVisualProps {
  truck: MiningTruck;
  onSelectHotspot?: (part: "tires" | "engine" | "payload" | "fuel" | "cab") => void;
  selectedHotspot?: string | null;
}

export const MiningTruckVisual: React.FC<MiningTruckVisualProps> = ({
  truck,
  onSelectHotspot,
  selectedHotspot,
}) => {
  const isHealthy = truck.engineHealthPercent >= 90;
  const isWarning = truck.tireStatus === "warning" || truck.engineHealthPercent < 90;

  return (
    <div className="relative w-full aspect-[16/9] max-h-56 sm:max-h-64 flex items-center justify-center select-none overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 via-[#0e172a]/95 to-[#070b14] border border-white/5 shadow-inner">
      {/* Background Grid & Industrial Hazard Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

      {/* Subtle Ground Shadow & Neon Glow */}
      <div
        className={`absolute bottom-3 w-4/5 h-6 rounded-full blur-xl transition-all duration-700 ${
          truck.status === "in_dwell"
            ? "bg-amber-500/25"
            : truck.status === "maintenance"
            ? "bg-rose-500/25"
            : "bg-lime-500/25"
        }`}
      />

      {/* SVG Industrial Heavy Mining Dump Truck (CAT 797F Style) */}
      <svg
        viewBox="0 0 540 260"
        className="w-full h-full max-w-[480px] drop-shadow-2xl z-10 transition-transform duration-500 hover:scale-[1.02]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bodyYellow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          <linearGradient id="metalChassis" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>

          <linearGradient id="tireRubber" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="40%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          <linearGradient id="rimYellow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#CA8A04" />
          </linearGradient>

          <linearGradient id="orePile" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="50%" stopColor="#64748B" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
        </defs>

        {/* 1. Mined Ore Pile inside dump body */}
        <path
          d="M 120 70 Q 200 45 280 55 Q 340 50 370 70 L 360 85 L 130 85 Z"
          fill="url(#orePile)"
          className="transition-all"
        />
        {/* Ore texture lumps */}
        <ellipse cx="190" cy="62" rx="22" ry="8" fill="#334155" />
        <ellipse cx="260" cy="58" rx="28" ry="9" fill="#1E293B" />
        <ellipse cx="320" cy="64" rx="20" ry="7" fill="#475569" />

        {/* 2. Massive Angled Dump Bed Body */}
        <g
          id="hotspot-payload"
          onClick={() => onSelectHotspot?.("payload")}
          className="cursor-pointer group"
        >
          <path
            d="M 85 70 L 370 70 L 410 135 L 140 145 L 85 100 Z"
            fill="url(#bodyYellow)"
            stroke="#78350F"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Ribbed Body Reinforcements */}
          <line x1="160" y1="75" x2="175" y2="140" stroke="#B45309" strokeWidth="4" strokeLinecap="round" />
          <line x1="215" y1="75" x2="230" y2="140" stroke="#B45309" strokeWidth="4" strokeLinecap="round" />
          <line x1="270" y1="75" x2="285" y2="140" stroke="#B45309" strokeWidth="4" strokeLinecap="round" />
          <line x1="325" y1="75" x2="340" y2="140" stroke="#B45309" strokeWidth="4" strokeLinecap="round" />
          <line x1="380" y1="75" x2="395" y2="135" stroke="#B45309" strokeWidth="4" strokeLinecap="round" />

          {/* Model Stamp on Dump Bed */}
          <rect x="210" y="90" width="105" height="24" rx="4" fill="#0F172A" opacity="0.85" />
          <text x="262" y="106" fill="#FDE047" fontSize="11" fontFamily="monospace" fontWeight="900" textAnchor="middle" letterSpacing="1.5">
            {truck.truckNumber} • 797F
          </text>
        </g>

        {/* 3. Heavy Lower Chassis & Drive Train */}
        <rect x="120" y="140" width="310" height="30" rx="6" fill="url(#metalChassis)" stroke="#1E293B" strokeWidth="2" />

        {/* Hydraulic Hoist Cylinders */}
        <g id="hotspot-engine" onClick={() => onSelectHotspot?.("engine")} className="cursor-pointer">
          <line x1="240" y1="145" x2="275" y2="105" stroke="#94A3B8" strokeWidth="8" strokeLinecap="round" />
          <line x1="245" y1="145" x2="275" y2="105" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* Hydraulic warning blinker */}
          <circle cx="275" cy="105" r="4" fill={isHealthy ? "#22C55E" : "#F59E0B"} />
        </g>

        {/* 4. Operator Cab, Catwalk & Access Ladders (Left Side / Front) */}
        <g id="hotspot-cab" onClick={() => onSelectHotspot?.("cab")} className="cursor-pointer group">
          {/* Front Grille & Radiator Housing */}
          <rect x="70" y="115" width="60" height="60" rx="5" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />
          <line x1="75" y1="130" x2="125" y2="130" stroke="#475569" strokeWidth="2" />
          <line x1="75" y1="140" x2="125" y2="140" stroke="#475569" strokeWidth="2" />
          <line x1="75" y1="150" x2="125" y2="150" stroke="#475569" strokeWidth="2" />
          <line x1="75" y1="160" x2="125" y2="160" stroke="#475569" strokeWidth="2" />

          {/* Heavy Halogen / LED Headlights */}
          <circle cx="78" cy="124" r="5" fill="#FEF08A" filter="drop-shadow(0 0 4px #FACC15)" />
          <circle cx="78" cy="168" r="4" fill="#FEF08A" />

          {/* Elevated Operator Cab */}
          <polygon points="65,100 115,100 120,68 85,68" fill="url(#bodyYellow)" stroke="#78350F" strokeWidth="2" />
          {/* Cab Tinted Windshield */}
          <polygon points="70,95 108,95 112,73 85,73" fill="#0284C7" stroke="#0369A1" strokeWidth="1.5" opacity="0.9" />
          <rect x="73" y="75" width="25" height="15" fill="#E0F2FE" opacity="0.4" />

          {/* Safety Handrails & Canopy Overhang */}
          <line x1="60" y1="102" x2="130" y2="102" stroke="#FBBF24" strokeWidth="2.5" />
          <line x1="60" y1="102" x2="60" y2="140" stroke="#FBBF24" strokeWidth="2" />
          <line x1="65" y1="102" x2="65" y2="140" stroke="#FBBF24" strokeWidth="2" />
          <line x1="80" y1="102" x2="80" y2="115" stroke="#FBBF24" strokeWidth="2" />

          {/* High-Mounted Dual Exhaust Stacks */}
          <rect x="128" y="45" width="8" height="55" rx="3" fill="#64748B" />
          <line x1="130" y1="42" x2="134" y2="42" stroke="#94A3B8" strokeWidth="3" />
          {/* Subtle animated exhaust heat shimmer */}
          <circle cx="132" cy="36" r="3" fill="#94A3B8" opacity="0.5" className="animate-ping" />
        </g>

        {/* 5. Fuel Tank & Air Reservoirs */}
        <g id="hotspot-fuel" onClick={() => onSelectHotspot?.("fuel")} className="cursor-pointer">
          <rect x="200" y="150" width="70" height="24" rx="5" fill="#334155" stroke="#1E293B" strokeWidth="2" />
          <text x="235" y="166" fill="#94A3B8" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
            DIESEL 1240G
          </text>
        </g>

        {/* 6. Massive Giant Haul Truck Wheels & Tires (53/80R63) */}
        {/* Front Axle Wheel */}
        <g id="hotspot-tires-front" onClick={() => onSelectHotspot?.("tires")} className="cursor-pointer group">
          {/* Outer Tire */}
          <circle cx="120" cy="188" r="48" fill="url(#tireRubber)" stroke="#0F172A" strokeWidth="4" />
          {/* Rugged Tread Grooves */}
          <circle cx="120" cy="188" r="45" stroke="#334155" strokeWidth="3" strokeDasharray="6 4" fill="none" />
          <circle cx="120" cy="188" r="32" fill="#020617" />
          {/* Yellow Heavy Industrial Rim */}
          <circle cx="120" cy="188" r="24" fill="url(#rimYellow)" stroke="#B45309" strokeWidth="2" />
          {/* Heavy Lug Nuts Hub */}
          <circle cx="120" cy="188" r="10" fill="#1E293B" />
          <circle cx="120" cy="188" r="4" fill="#F59E0B" />
          {/* TPMS Status Ring */}
          <circle
            cx="120"
            cy="188"
            r="49"
            fill="none"
            stroke={truck.tireStatus === "optimal" ? "#22C55E" : "#F59E0B"}
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="animate-spin"
            style={{ transformOrigin: "120px 188px", animationDuration: "12s" }}
          />
        </g>

        {/* Rear Axle Dual Wheels */}
        <g id="hotspot-tires-rear" onClick={() => onSelectHotspot?.("tires")} className="cursor-pointer group">
          {/* Outer Tire */}
          <circle cx="360" cy="188" r="52" fill="url(#tireRubber)" stroke="#0F172A" strokeWidth="4" />
          {/* Rugged Tread Grooves */}
          <circle cx="360" cy="188" r="48" stroke="#334155" strokeWidth="3.5" strokeDasharray="7 5" fill="none" />
          <circle cx="360" cy="188" r="34" fill="#020617" />
          {/* Yellow Heavy Industrial Rim */}
          <circle cx="360" cy="188" r="25" fill="url(#rimYellow)" stroke="#B45309" strokeWidth="2" />
          {/* Heavy Lug Nuts Hub */}
          <circle cx="360" cy="188" r="11" fill="#1E293B" />
          <circle cx="360" cy="188" r="5" fill="#F59E0B" />
          {/* TPMS Status Ring */}
          <circle
            cx="360"
            cy="188"
            r="53"
            fill="none"
            stroke={truck.tireStatus === "optimal" ? "#22C55E" : "#F59E0B"}
            strokeWidth="1.5"
            strokeDasharray="5 5"
            className="animate-spin"
            style={{ transformOrigin: "360px 188px", animationDuration: "14s" }}
          />
        </g>
      </svg>

      {/* Interactive Telemetry Overlay Badges */}
      <div className="absolute top-2.5 left-3 flex items-center gap-1.5 z-20">
        <span className="text-[10px] uppercase font-mono font-black px-2 py-0.5 rounded-full bg-slate-900/90 text-amber-300 border border-amber-500/30">
          {truck.model}
        </span>
        <span
          className={`text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border ${
            truck.status === "in_dwell"
              ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
              : truck.status === "maintenance"
              ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
              : "bg-lime-500/20 text-lime-300 border-lime-500/40"
          }`}
        >
          ● {truck.statusLabel}
        </span>
      </div>

      <div className="absolute bottom-2.5 right-3 flex items-center gap-2 z-20">
        <span className="text-[10px] font-mono font-bold text-slate-300 bg-slate-900/90 px-2 py-1 rounded-lg border border-white/5">
          Load: <strong className="text-lime-400">{truck.payloadTonnes}T</strong> / {truck.maxPayloadTonnes}T
        </span>
      </div>
    </div>
  );
};

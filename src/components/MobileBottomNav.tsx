import React, { useState } from "react";
import { Gauge, Truck, AlertTriangle, Building2, FileCheck, Radio, TrendingUp, Scale, FileSignature, BarChart3, MoreHorizontal, Smartphone, Calculator } from "lucide-react";
import { triggerHapticTap } from "../utils/audioAlerts";
import { NavTabType } from "./Header";

interface MobileBottomNavProps {
  activeTab: NavTabType;
  setActiveTab: (tab: NavTabType) => void;
  atRiskCount: number;
  activeLoadCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  atRiskCount,
  activeLoadCount = 3,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const primaryTabs = [
    {
      id: "driver" as const,
      label: "Cab",
      icon: Gauge,
      badge: null,
    },
    {
      id: "dispatcher_loads" as const,
      label: "Loads",
      icon: Truck,
      badge: activeLoadCount > 0 ? `${activeLoadCount}` : null,
      badgeColor: "bg-lime-400 text-slate-950 font-black",
    },
    {
      id: "dispatcher_claims" as const,
      label: "Claims",
      icon: AlertTriangle,
      badge: atRiskCount > 0 ? `${atRiskCount}` : null,
      badgeColor: "bg-amber-400 text-slate-950 font-black",
    },
    {
      id: "disputes_ar" as const,
      label: "Disputes",
      icon: Scale,
      badge: null,
    },
    {
      id: "more" as const,
      label: "More",
      icon: MoreHorizontal,
      badge: null,
    },
  ];

  const moreTabs = [
    { id: "driver_sms" as const, label: "Driver SMS Dispatch", icon: Smartphone },
    { id: "prebooking_risk" as const, label: "Pre-Booking Risk Multiplier", icon: Calculator },
    { id: "addendum_generator" as const, label: "Addendum Generator", icon: FileSignature },
    { id: "broker_scorecards" as const, label: "Broker Scorecards", icon: BarChart3 },
    { id: "rate_intelligence" as const, label: "Rate Intelligence", icon: TrendingUp },
    { id: "telematics" as const, label: "Telematics (ELD)", icon: Radio },
    { id: "rate_con" as const, label: "Rate Con Upload", icon: FileCheck },
    { id: "dispatcher_facilities" as const, label: "Facility Risk", icon: Building2 },
  ];

  return (
    <>
      {/* Expandable More Menu Sheet */}
      {showMoreMenu && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end p-3 animate-in fade-in">
          <div className="bg-[#0D1424] border border-white/10 rounded-2xl p-4 shadow-2xl space-y-2 mb-20">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-xs uppercase font-black tracking-wider text-slate-300">Additional Operations</span>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="text-xs text-slate-400 hover:text-white font-bold"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {moreTabs.map((mt) => {
                const Icon = mt.icon;
                const isActive = activeTab === mt.id;
                return (
                  <button
                    key={mt.id}
                    onClick={() => {
                      triggerHapticTap();
                      setActiveTab(mt.id);
                      setShowMoreMenu(false);
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all text-xs font-bold ${
                      isActive
                        ? "bg-lime-400 text-slate-950 border-lime-400 shadow-md shadow-lime-500/20"
                        : "bg-slate-950/60 border-white/5 text-slate-300 hover:bg-slate-900"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-slate-950" : "text-lime-400"}`} />
                    <span>{mt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav
        id="mobile-bottom-navigation"
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-3 left-3 right-3 z-40 bg-[#0B111E]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl px-2 py-1.5 transition-transform"
      >
        <div className="grid grid-cols-5 gap-1 items-center max-w-lg mx-auto">
          {primaryTabs.map((tab) => {
            const isActive = tab.id === "more" ? showMoreMenu : activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  triggerHapticTap();
                  if (tab.id === "more") {
                    setShowMoreMenu(!showMoreMenu);
                  } else {
                    setShowMoreMenu(false);
                    setActiveTab(tab.id as NavTabType);
                  }
                }}
                className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
                  isActive
                    ? "text-slate-950 bg-lime-400 font-black shadow-lg shadow-lime-500/25"
                    : "text-slate-400 hover:text-white active:bg-slate-900/50"
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? "text-slate-950 scale-105" : "text-slate-400"}`} />
                  {tab.badge && (
                    <span
                      className={`absolute -top-1.5 -right-3 px-1.5 py-0.2 rounded-full text-[9px] font-black shadow-sm ${
                        tab.badgeColor || "bg-amber-400 text-slate-950"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-black tracking-tight mt-1 ${isActive ? "text-slate-950" : "text-slate-400"}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

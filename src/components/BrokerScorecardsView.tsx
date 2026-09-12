import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  DollarSign,
  Truck,
  Percent,
  Clock,
  ChevronRight,
  Sparkles,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import { BrokerScorecard, FleetOpportunityLoss } from "../types/dwell";
import { triggerHapticTap } from "../utils/audioAlerts";
import { BrokerAnalyticsCharts } from "./BrokerAnalyticsCharts";

export const BrokerScorecardsView: React.FC = () => {
  const [scorecards, setScorecards] = useState<BrokerScorecard[]>([]);
  const [opportunityLoss, setOpportunityLoss] = useState<FleetOpportunityLoss | null>(null);
  const [truckCount, setTruckCount] = useState<number>(18);
  const [hourlyCost, setHourlyCost] = useState<number>(125);
  const [loading, setLoading] = useState(false);
  const [selectedBrokerId, setSelectedBrokerId] = useState<string | null>(null);

  const fetchScorecards = async (trucks: number, cost: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/analytics/broker-scorecards?trucks=${trucks}&cost=${cost}`);
      if (res.ok) {
        const data = await res.json();
        setScorecards(data.scorecards);
        setOpportunityLoss(data.opportunityLoss);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScorecards(truckCount, hourlyCost);
  }, []);

  const handleRecalculate = (newTrucks: number, newCost: number) => {
    triggerHapticTap();
    setTruckCount(newTrucks);
    setHourlyCost(newCost);
    fetchScorecards(newTrucks, newCost);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Fleet Executive Analytics & Broker Scorecards
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Broker payout efficiency rankings, dispute frequencies, and lost opportunity cost metrics
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 self-start sm:self-auto text-xs">
          <Truck className="w-4 h-4 text-indigo-400" />
          <span className="text-slate-300 font-semibold">Active Fleet:</span>
          <span className="text-white font-mono font-bold">{truckCount} Power Units</span>
          <span className="text-slate-500">(${hourlyCost}/hr ATRI Cost)</span>
        </div>
      </div>
      {opportunityLoss && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-400 block mb-0.5">
                Executive Lost Opportunity Calculator
              </span>
              <h2 className="text-lg font-bold text-white">
                Fleet Unrecovered Dwell Impact Analysis
              </h2>
            </div>
            <div className="flex items-center gap-4 bg-slate-950/80 p-2.5 rounded-xl border border-white/5 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Trucks:</span>
                <input
                  type="number"
                  min="1"
                  max="150"
                  value={truckCount}
                  onChange={(e) => handleRecalculate(parseInt(e.target.value, 10) || 1, hourlyCost)}
                  className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-center"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Cost/Hr:</span>
                <input
                  type="number"
                  min="80"
                  max="250"
                  value={hourlyCost}
                  onChange={(e) => handleRecalculate(truckCount, parseInt(e.target.value, 10) || 100)}
                  className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-center"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5">
              <span className="text-xs text-slate-400 block mb-1">Monthly Fleet Dwell</span>
              <span className="font-mono text-xl sm:text-2xl font-black text-white">
                {opportunityLoss.totalDwellHoursMonth} hrs
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">Across all docks</span>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5">
              <span className="text-xs text-slate-400 block mb-1">Unbilled / Free Time</span>
              <span className="font-mono text-xl sm:text-2xl font-black text-amber-400">
                {opportunityLoss.unpaidDwellHoursMonth} hrs
              </span>
              <span className="text-[11px] text-amber-300/70 block mt-1">Uncompensated driver time</span>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5">
              <span className="text-xs text-slate-400 block mb-1">Tractor Opportunity Loss</span>
              <span className="font-mono text-xl sm:text-2xl font-black text-rose-400">
                ${opportunityLoss.unrecoveredCostDollars.toLocaleString()}
              </span>
              <span className="text-[11px] text-rose-300/70 block mt-1">At ${opportunityLoss.tractorHourlyCostDollars}/hr operating cost</span>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5">
              <span className="text-xs text-slate-400 block mb-1">Detention Collected</span>
              <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400">
                ${opportunityLoss.recoveredDetentionDollars.toLocaleString()}
              </span>
              <span className="text-[11px] text-emerald-300/70 block mt-1">
                {opportunityLoss.netRecoveryEfficiencyPercent}% recovery efficiency
              </span>
            </div>
          </div>
        </div>
      )}
      {scorecards.length > 0 && (
        <BrokerAnalyticsCharts
          scorecards={scorecards}
          selectedBrokerId={selectedBrokerId}
          onSelectBroker={(id) => {
            setSelectedBrokerId(id === selectedBrokerId ? null : id);
            if (id) {
              const el = document.getElementById(`scorecard-${id}`);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }
          }}
        />
      )}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-wider font-bold text-slate-400 flex items-center gap-2">
            <span>Broker Performance & Pay Reliability Index</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
              5 MAJOR BROKERS EVALUATED
            </span>
          </h2>
          <span className="text-xs text-slate-500">Ranked by historical settlement rate</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scorecards.map((sc) => {
            const isSelected = selectedBrokerId === sc.id;
            return (
              <div
                id={`scorecard-${sc.id}`}
                key={sc.id}
                onClick={() => {
                  triggerHapticTap();
                  setSelectedBrokerId(isSelected ? null : sc.id);
                }}
                className={`rounded-2xl border p-5 shadow-xl flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 border-indigo-500 ring-2 ring-indigo-500 shadow-indigo-500/25 scale-[1.01]"
                    : sc.ratingTier.includes("Tier A")
                    ? "bg-slate-900/90 border-emerald-500/40 hover:border-emerald-400/60"
                    : sc.ratingTier.includes("Tier B")
                    ? "bg-slate-900/90 border-amber-500/40 hover:border-amber-400/60"
                    : "bg-slate-900/90 border-rose-500/50 hover:border-rose-400/70"
                }`}
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-white/10">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-white tracking-tight">
                          {sc.brokerName}
                        </h3>
                        {isSelected && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-600 text-white rounded">
                            CHART SELECTED
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {sc.loadsCount} Audited Loads
                      </span>
                    </div>

                    <span
                      className={`text-[11px] px-2.5 py-1 rounded-lg font-bold ${
                        sc.ratingTier.includes("Tier A")
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : sc.ratingTier.includes("Tier B")
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {sc.ratingTier}
                    </span>
                  </div>

                {/* Scorecard Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 py-1 text-center font-mono">
                  <div className="bg-slate-950/60 p-2 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-400 block font-sans">Payout Rate</span>
                    <span
                      className={`text-base font-black ${
                        sc.payoutRatePercent >= 90
                          ? "text-emerald-400"
                          : sc.payoutRatePercent >= 70
                          ? "text-amber-400"
                          : "text-rose-400"
                      }`}
                    >
                      {sc.payoutRatePercent}%
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-2 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-400 block font-sans">Days to Pay</span>
                    <span className="text-base font-black text-white">
                      {sc.averageDaysToPay}d
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-2 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-400 block font-sans">Dispute Rate</span>
                    <span
                      className={`text-base font-black ${
                        sc.disputeFrequencyPercent <= 15
                          ? "text-emerald-400"
                          : sc.disputeFrequencyPercent <= 30
                          ? "text-amber-400"
                          : "text-rose-400"
                      }`}
                    >
                      {sc.disputeFrequencyPercent}%
                    </span>
                  </div>
                </div>

                {/* Financial Overview */}
                <div className="flex justify-between items-center text-xs bg-slate-950/40 px-3 py-2 rounded-xl border border-white/5 font-mono">
                  <span className="text-slate-400">Total Paid / Claimed:</span>
                  <span className="text-white font-bold">
                    ${(sc.totalPaidCents / 100).toLocaleString()} / ${(sc.totalClaimedCents / 100).toLocaleString()}
                  </span>
                </div>

                {/* Recommended Dispatch Terms */}
                <div className="text-xs p-3 rounded-xl bg-slate-950/70 border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Recommended Negotiation Strategy:
                  </span>
                  <p className="text-slate-300 leading-relaxed italic">
                    "{sc.recommendedTerms}"
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 mt-3 flex items-center justify-between text-xs">
                <span className="text-slate-400">Broker Credit Risk:</span>
                <span className="font-mono font-bold text-white">
                  Score: {sc.creditScore}/100
                </span>
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
};

import React, { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
  CartesianGrid,
} from "recharts";
import {
  Percent,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowUpDown,
  Filter,
  BarChart2,
  Calendar,
} from "lucide-react";
import { BrokerScorecard } from "../types/dwell";
import { triggerHapticTap } from "../utils/audioAlerts";

interface BrokerAnalyticsChartsProps {
  scorecards: BrokerScorecard[];
  selectedBrokerId: string | null;
  onSelectBroker: (brokerId: string) => void;
}

export const BrokerAnalyticsCharts: React.FC<BrokerAnalyticsChartsProps> = ({
  scorecards,
  selectedBrokerId,
  onSelectBroker,
}) => {
  const [viewMode, setViewMode] = useState<"dual" | "payout" | "latency">("dual");
  const [sortBy, setSortBy] = useState<"default" | "payout" | "speed">("default");

  const getShortName = (name: string) => {
    if (name.includes("Robinson")) return "C.H. Robinson";
    if (name.includes("Coyote")) return "Coyote";
    if (name.includes("TQL") || name.includes("Total Quality")) return "TQL";
    if (name.includes("Landstar")) return "Landstar";
    if (name.includes("Apex")) return "Apex";
    return name.split(" ")[0];
  };

  const top5 = [...scorecards].slice(0, 5);

  const sortedData = [...top5].sort((a, b) => {
    if (sortBy === "payout") return b.payoutRatePercent - a.payoutRatePercent;
    if (sortBy === "speed") return a.averageDaysToPay - b.averageDaysToPay;
    return 0; 
  });

  const chartData = sortedData.map((sc) => ({
    id: sc.id,
    brokerName: sc.brokerName,
    shortName: getShortName(sc.brokerName),
    payoutRate: sc.payoutRatePercent,
    daysToPay: sc.averageDaysToPay,
    disputeRate: sc.disputeFrequencyPercent,
    totalPaid: sc.totalPaidCents / 100,
    totalClaimed: sc.totalClaimedCents / 100,
    creditScore: sc.creditScore,
    tier: sc.ratingTier,
  }));

  const getPayoutColor = (rate: number, isSelected: boolean) => {
    if (isSelected) return "#6366f1"; 
    if (rate >= 85) return "#10b981"; 
    if (rate >= 65) return "#f59e0b"; 
    return "#f43f5e"; 
  };
  const getLatencyColor = (days: number, isSelected: boolean) => {
    if (isSelected) return "#6366f1"; 
    if (days <= 21) return "#10b981"; 
    if (days <= 35) return "#f59e0b"; 
    return "#f43f5e"; 
  };
  const CustomPayoutTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700/90 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[210px] z-50">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-white text-sm">{data.shortName}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                data.payoutRate >= 85
                  ? "bg-emerald-500/20 text-emerald-300"
                  : data.payoutRate >= 65
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-rose-500/20 text-rose-300"
              }`}
            >
              {data.tier}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span>Settlement Payout:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {data.payoutRate}%
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-400 font-mono text-[11px]">
            <span>Claimed:</span>
            <span>${data.totalClaimed.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400 font-mono text-[11px]">
            <span>Paid Out:</span>
            <span className="text-white font-bold">${data.totalPaid.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400 text-[11px] pt-1 border-t border-slate-800">
            <span>Dispute Frequency:</span>
            <span className="font-mono text-amber-400">{data.disputeRate}%</span>
          </div>
          <p className="text-[10px] text-slate-500 italic mt-1">Click to view scorecard details</p>
        </div>
      );
    }
    return null;
  };
  const CustomLatencyTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700/90 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[210px] z-50">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-white text-sm">{data.shortName}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-300">
              Credit: {data.creditScore}/100
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span>Avg Days to Pay:</span>
            <span
              className={`font-mono font-bold text-sm ${
                data.daysToPay <= 21
                  ? "text-emerald-400"
                  : data.daysToPay <= 35
                  ? "text-amber-400"
                  : "text-rose-400"
              }`}
            >
              {data.daysToPay} Days
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-400 text-[11px]">
            <span>Industry Benchmark:</span>
            <span className="font-mono text-slate-300">30 Days (Net 30)</span>
          </div>
          <div className="flex justify-between items-center text-slate-400 text-[11px]">
            <span>Variance vs Net 30:</span>
            <span
              className={`font-mono font-bold ${
                data.daysToPay <= 30 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {data.daysToPay <= 30
                ? `${30 - data.daysToPay}d faster`
                : `+${data.daysToPay - 30}d overdue`}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 italic mt-1 pt-1 border-t border-slate-800">
            Click to view scorecard details
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Top 5 Broker Performance Visualizer
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold">
              RECHARTS INTERACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Direct comparison of detention payout fulfillment rates vs historical settlement latency
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => {
                triggerHapticTap();
                setViewMode("dual");
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                viewMode === "dual"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Dual Charts
            </button>
            <button
              onClick={() => {
                triggerHapticTap();
                setViewMode("payout");
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                viewMode === "payout"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Payout %
            </button>
            <button
              onClick={() => {
                triggerHapticTap();
                setViewMode("latency");
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                viewMode === "latency"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Days-to-Pay
            </button>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => {
                triggerHapticTap();
                setSortBy(e.target.value as any);
              }}
              className="bg-transparent border-none text-white text-xs focus:outline-none cursor-pointer"
            >
              <option value="default" className="bg-slate-900 text-white">Default Tier</option>
              <option value="payout" className="bg-slate-900 text-white">Highest Payout %</option>
              <option value="speed" className="bg-slate-900 text-white">Fastest Days-to-Pay</option>
            </select>
          </div>
        </div>
      </div>
      <div
        className={`grid gap-4 ${
          viewMode === "dual" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {(viewMode === "dual" || viewMode === "payout") && (
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Percent className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Average Detention Payout Rate</h3>
                  <span className="text-[11px] text-slate-400">
                    Actual accessorial dollars collected vs billed
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Target: &gt;80%
              </span>
            </div>
            <div className="w-full h-64 sm:h-72 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -18, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                  <XAxis
                    dataKey="shortName"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomPayoutTooltip />} cursor={{ fill: "#1e293b", opacity: 0.4 }} />
                  <ReferenceLine
                    y={80}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    label={{
                      value: "80% Target",
                      fill: "#10b981",
                      fontSize: 10,
                      position: "insideTopRight",
                    }}
                  />
                  <Bar
                    dataKey="payoutRate"
                    radius={[6, 6, 0, 0]}
                    className="cursor-pointer transition-all duration-300"
                    onClick={(data: any) => {
                      if (data?.id) {
                        triggerHapticTap();
                        onSelectBroker(data.id);
                      }
                    }}
                  >
                    {chartData.map((entry) => {
                      const isSelected = selectedBrokerId === entry.id;
                      return (
                        <Cell
                          key={`payout-cell-${entry.id}`}
                          fill={getPayoutColor(entry.payoutRate, isSelected)}
                          stroke={isSelected ? "#ffffff" : "transparent"}
                          strokeWidth={isSelected ? 2 : 0}
                          className="hover:opacity-80 transition-opacity cursor-pointer"
                          onClick={() => {
                            triggerHapticTap();
                            onSelectBroker(entry.id);
                          }}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> High Pay (&gt;85%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Moderate (65-84%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> High Dispute (&lt;65%)
              </span>
            </div>
          </div>
        )}
        {(viewMode === "dual" || viewMode === "latency") && (
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Historical Payment Latency</h3>
                  <span className="text-[11px] text-slate-400">
                    Average turnaround days from invoice dispatch to cash received
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                Net 30 Baseline
              </span>
            </div>

            {/* Recharts Bar Chart */}
            <div className="w-full h-64 sm:h-72 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -18, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                  <XAxis
                    dataKey="shortName"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    domain={[0, 70]}
                    tickFormatter={(v) => `${v}d`}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomLatencyTooltip />} cursor={{ fill: "#1e293b", opacity: 0.4 }} />
                  <ReferenceLine
                    y={30}
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    label={{
                      value: "Net 30 Benchmark",
                      fill: "#cbd5e1",
                      fontSize: 10,
                      position: "insideTopRight",
                    }}
                  />
                  <Bar
                    dataKey="daysToPay"
                    radius={[6, 6, 0, 0]}
                    className="cursor-pointer transition-all duration-300"
                    onClick={(data: any) => {
                      if (data?.id) {
                        triggerHapticTap();
                        onSelectBroker(data.id);
                      }
                    }}
                  >
                    {chartData.map((entry) => {
                      const isSelected = selectedBrokerId === entry.id;
                      return (
                        <Cell
                          key={`latency-cell-${entry.id}`}
                          fill={getLatencyColor(entry.daysToPay, isSelected)}
                          stroke={isSelected ? "#ffffff" : "transparent"}
                          strokeWidth={isSelected ? 2 : 0}
                          className="hover:opacity-80 transition-opacity cursor-pointer"
                          onClick={() => {
                            triggerHapticTap();
                            onSelectBroker(entry.id);
                          }}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Fast Pay (&le;21d)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Average (22-35d)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Delinquent (&gt;35d)
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between bg-slate-950/60 px-3 py-2 rounded-xl border border-white/5 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-indigo-400" />
          Tip: Tap any broker bar to inspect its full audited claims history, credit tier, and counter-offer strategy below.
        </span>
        {selectedBrokerId && (
          <button
            onClick={() => onSelectBroker("")}
            className="text-indigo-400 hover:text-indigo-300 font-semibold underline text-[11px]"
          >
            Clear Filter
          </button>
        )}
      </div>
    </div>
  );
};

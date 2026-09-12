import React, { useState } from "react";
import {
  Calculator,
  Building2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  DollarSign,
  Clock,
  Copy,
  Check,
  TrendingUp,
  Sparkles,
  Percent,
} from "lucide-react";
import { Facility } from "../types/dwell";

interface PreBookingRiskScorecardProps {
  facilities?: Facility[];
}

export const PreBookingRiskScorecard: React.FC<PreBookingRiskScorecardProps> = () => {
  const [facilityQuery, setFacilityQuery] = useState("Walmart DC #6094");
  const [brokerQuery, setBrokerQuery] = useState("C.H. Robinson Worldwide");
  const [linehaulRate, setLinehaulRate] = useState<number>(2800);
  const [isLoading, setIsLoading] = useState(false);
  const [scorecardData, setScorecardData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handleCalculateScorecard = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/risk/prebooking-scorecard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityQuery,
          brokerQuery,
          baseLinehaulRateDollars: linehaulRate,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setScorecardData(data);
      }
    } catch (err) {
      console.error("Failed to compute prebooking scorecard:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Run on first load with default
  React.useEffect(() => {
    handleCalculateScorecard();
  }, []);

  const handleCopyAddendum = () => {
    if (!scorecardData?.proposedCounterSnippet) return;
    navigator.clipboard.writeText(scorecardData.proposedCounterSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-[#080D18] rounded-2xl border border-white/10 p-4 sm:p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
              Pre-Booking Risk Scorecard & Rate Multiplier
            </h2>
            <p className="text-xs text-slate-400">
              Evaluate shipper/receiver dwell risk before signing the rate confirmation. Generate rate counter-proposals with audited data.
            </p>
          </div>
        </div>

        <button
          onClick={handleCalculateScorecard}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-lime-500/20 cursor-pointer transition-all disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isLoading ? "Auditing History..." : "Recalculate Risk Surcharge"}</span>
        </button>
      </div>

      {/* Input Parameters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-[11px] font-bold uppercase text-slate-400 mb-1.5 block">
            Target Shipper / Receiver:
          </label>
          <select
            value={facilityQuery}
            onChange={(e) => setFacilityQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
          >
            <option value="Walmart DC #6094">Walmart DC #6094 (Bentonville, AR)</option>
            <option value="Target Distribution Center #3801">Target DC #3801 (Cedar Falls, IA)</option>
            <option value="Sysco Atlanta Distribution Center">Sysco Atlanta DC (College Park, GA)</option>
            <option value="Kroger Regional Distribution Center">Kroger Regional DC (Dallas, TX)</option>
            <option value="Amazon Fulfillment BNA3">Amazon Fulfillment BNA3 (Murfreesboro, TN)</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase text-slate-400 mb-1.5 block">
            Freight Broker:
          </label>
          <select
            value={brokerQuery}
            onChange={(e) => setBrokerQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
          >
            <option value="C.H. Robinson Worldwide">C.H. Robinson Worldwide</option>
            <option value="Total Quality Logistics (TQL)">Total Quality Logistics (TQL)</option>
            <option value="Echo Global Logistics">Echo Global Logistics</option>
            <option value="Coyote Logistics">Coyote Logistics</option>
            <option value="Landstar Ranger, Inc.">Landstar Ranger, Inc.</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase text-slate-400 mb-1.5 block">
            Offered Linehaul Rate ($ USD):
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-slate-500 font-bold">$</span>
            <input
              type="number"
              value={linehaulRate}
              onChange={(e) => setLinehaulRate(Number(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-lime-400"
            />
          </div>
        </div>
      </div>

      {/* Scorecard Results Dashboard */}
      {scorecardData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          {/* Left Column: Historical Risk Metrics (5 cols) */}
          <div className="lg:col-span-5 bg-slate-950/80 rounded-xl border border-white/5 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400">Audited Facility Profile</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  scorecardData.riskTier.includes("Severe")
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    : scorecardData.riskTier.includes("Moderate")
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                }`}
              >
                {scorecardData.riskTier}
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-bold text-white">{scorecardData.facility.canonicalName}</div>
              <div className="text-xs text-slate-400">{scorecardData.facility.address}</div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
              <div className="p-2.5 rounded-lg bg-[#0D1424] border border-white/5 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Median Dwell</div>
                <div className="text-base font-black font-mono text-white mt-0.5">
                  {scorecardData.avgDwellHours}h
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0D1424] border border-white/5 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-bold">P90 Dwell</div>
                <div className="text-base font-black font-mono text-amber-400 mt-0.5">
                  {scorecardData.p90Hours}h
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0D1424] border border-white/5 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Detained %</div>
                <div className="text-base font-black font-mono text-rose-400 mt-0.5">
                  {scorecardData.overagePercent}%
                </div>
              </div>
            </div>

            {/* Surcharge recommendation banner */}
            <div className="p-3 rounded-lg bg-lime-400/10 border border-lime-400/30 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-lime-400 uppercase">Recommended Surcharge</span>
                <span className="text-base font-black font-mono text-lime-400">
                  +${scorecardData.detentionSurchargeDollars}.00
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                To maintain fleet profitability against a {scorecardData.overagePercent}% detention probability, counter-offer with a linehaul of{" "}
                <strong className="text-white font-mono">${scorecardData.suggestedTotalRate}</strong> or bind the protective detention rate.
              </p>
            </div>
          </div>

          {/* Right Column: Protective Counter-Offer Addendum (7 cols) */}
          <div className="lg:col-span-7 bg-slate-950/80 rounded-xl border border-white/5 p-4 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-lime-400" />
                  Recommended Pre-Booking Counter Terms
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-lime-400 font-bold">
                    Rate: ${scorecardData.recommendedDetentionRate}/hr | Free: {scorecardData.recommendedFreeTimeMinutes / 60}h
                  </span>
                </div>
              </div>

              {/* Monospace Counter Snippet */}
              <div className="relative">
                <pre className="p-3 rounded-lg bg-[#070B14] border border-slate-800 text-[11px] font-mono text-slate-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                  {scorecardData.proposedCounterSnippet}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-[11px] text-slate-400">
                Expected Detention Recovery: <strong className="text-lime-400 font-mono">+${scorecardData.estimatedDetentionRecoveryDollars}.00</strong>
              </span>
              <button
                onClick={handleCopyAddendum}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied to Clipboard!" : "Copy Counter Proposal"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

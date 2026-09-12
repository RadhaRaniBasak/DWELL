import React, { useState, useEffect } from "react";
import {
  Search,
  Building2,
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  Copy,
  ChevronRight,
  FileSpreadsheet,
  Info,
  Sparkles,
} from "lucide-react";
import { FacilityRateIntelligence } from "../types/dwell";
import { triggerHapticTap } from "../utils/audioAlerts";

export const FacilityRateIntelligenceView: React.FC = () => {
  const [query, setQuery] = useState<string>("");
  const [facilities, setFacilities] = useState<FacilityRateIntelligence[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<FacilityRateIntelligence | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedCheatSheet, setCopiedCheatSheet] = useState<boolean>(false);

  const fetchFacilities = async (searchQuery: string = "") => {
    setLoading(true);
    try {
      const url = searchQuery
        ? `/api/facilities/search?q=${encodeURIComponent(searchQuery)}`
        : `/api/facilities/intelligence`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setFacilities(data);
        if (data.length > 0 && !selectedFacility) {
          setSelectedFacility(data[0]);
        }
      }
    } catch (err) {
      console.error("Facility search error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHapticTap();
    fetchFacilities(query);
  };

  const handleCopyNegotiationScript = () => {
    if (!selectedFacility) return;
    triggerHapticTap();
    const script = `Carrier Rate Counter-Offer (Facility: ${selectedFacility.name})\n` +
      `• Demanded Free Time: ${selectedFacility.recommendedContractualTerms.demandedFreeTimeHours} hour(s)\n` +
      `• Demanded Detention Rate: $${selectedFacility.recommendedContractualTerms.demandedDetentionRatePerHour}/hr starting at minute ${selectedFacility.recommendedContractualTerms.demandedFreeTimeHours * 60 + 1}\n` +
      `• Rate Adjustment: +$${(selectedFacility.recommendedRateAdderPerMileCents / 100).toFixed(2)}/mi or +$${selectedFacility.recommendedFlatDetentionBufferDollars} flat delay contingency\n` +
      `• Documented fleet history shows ${selectedFacility.overageRatePercent}% detention risk with median ${selectedFacility.medianDwellHours}h dwell.\n`;

    navigator.clipboard.writeText(script);
    setCopiedCheatSheet(true);
    setTimeout(() => setCopiedCheatSheet(false), 2500);
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case "Severe":
        return "bg-rose-500/20 border-rose-500/40 text-rose-300";
      case "High":
        return "bg-amber-500/20 border-amber-500/40 text-amber-300";
      case "Moderate":
        return "bg-yellow-500/20 border-yellow-500/40 text-yellow-300";
      default:
        return "bg-emerald-500/20 border-emerald-500/40 text-emerald-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                Facility Benchmarking & Rate Intelligence
              </h2>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Broker Counter-Quote Tool
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Lookup any shipper or receiver before booking a load. Price in detention risk, demand protective contract clauses, and counter broker low-ball rates.
            </p>
          </div>
        </div>

        {/* Search Bar & Quick Chips */}
        <div className="mt-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search facility name, address, city, or chain (e.g. Walmart, Target, Joliet, Midlothian)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition active:scale-95 flex items-center gap-1.5"
            >
              Search
            </button>
          </form>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-500 text-[11px] whitespace-nowrap">Suggested:</span>
            {["Walmart", "Target", "Amazon", "Kroger", "Bentonville", "Midlothian"].map((chip) => (
              <button
                key={chip}
                onClick={() => {
                  triggerHapticTap();
                  setQuery(chip);
                  fetchFacilities(chip);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700/80 whitespace-nowrap transition"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Facility List + Detailed Intelligence Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Facility Cards */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Matching Facilities ({facilities.length})</span>
            {loading && <span className="text-emerald-400 text-[11px]">Loading...</span>}
          </h3>

          {facilities.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-400">
              No facilities found matching "{query}". Try searching "Walmart" or "Target".
            </div>
          ) : (
            facilities.map((fac) => {
              const isSelected = selectedFacility?.facilityId === fac.facilityId;
              return (
                <div
                  key={fac.facilityId}
                  onClick={() => {
                    triggerHapticTap();
                    setSelectedFacility(fac);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? "bg-slate-800/90 border-emerald-500 shadow-md ring-1 ring-emerald-500/20"
                      : "bg-slate-900 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="font-bold text-sm text-white">{fac.name}</h4>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getRiskBadgeColor(
                        fac.riskCategory
                      )}`}
                    >
                      {fac.riskCategory} Risk
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-3">{fac.address}</p>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-800/80">
                    <div className="bg-slate-950/60 p-1.5 rounded-lg">
                      <div className="text-[10px] text-slate-500">Median Dwell</div>
                      <div className="font-bold text-white font-mono">{fac.medianDwellHours}h</div>
                    </div>
                    <div className="bg-slate-950/60 p-1.5 rounded-lg">
                      <div className="text-[10px] text-slate-500">Overage Rate</div>
                      <div className={`font-bold font-mono ${fac.overageRatePercent > 50 ? "text-rose-400" : "text-emerald-400"}`}>
                        {fac.overageRatePercent}%
                      </div>
                    </div>
                    <div className="bg-slate-950/60 p-1.5 rounded-lg">
                      <div className="text-[10px] text-slate-500">Rate Adder</div>
                      <div className="font-bold text-emerald-400 font-mono">
                        +${(fac.recommendedRateAdderPerMileCents / 100).toFixed(2)}/mi
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Detailed Rate Negotiation Intelligence */}
        <div className="lg:col-span-7">
          {selectedFacility ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-white">{selectedFacility.name}</h3>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getRiskBadgeColor(
                        selectedFacility.riskCategory
                      )}`}
                    >
                      {selectedFacility.riskCategory} Detention Risk
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{selectedFacility.address}</p>
                </div>

                <button
                  onClick={handleCopyNegotiationScript}
                  className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  {copiedCheatSheet ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied Script!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Counter-Offer Script</span>
                    </>
                  )}
                </button>
              </div>

              {/* Core Risk Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 mb-1">
                    Median Dock Time
                  </div>
                  <div className="text-lg font-black text-white font-mono">
                    {selectedFacility.medianDwellHours} hrs
                  </div>
                  <div className="text-[11px] text-slate-400">50% dwell under this</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 mb-1">
                    P90 Worst-Case
                  </div>
                  <div className="text-lg font-black text-amber-400 font-mono">
                    {selectedFacility.p90DwellHours} hrs
                  </div>
                  <div className="text-[11px] text-slate-400">10% wait longer</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 mb-1">
                    Overage Frequency
                  </div>
                  <div className="text-lg font-black text-rose-400 font-mono">
                    {selectedFacility.overageRatePercent}%
                  </div>
                  <div className="text-[11px] text-slate-400">Exceeds 2h free time</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 mb-1">
                    Recovery Success
                  </div>
                  <div className="text-lg font-black text-emerald-400 font-mono">
                    {selectedFacility.historicalDetentionRecoveryPercent}%
                  </div>
                  <div className="text-[11px] text-slate-400">Broker paid claim</div>
                </div>
              </div>

              {/* Recommended Rate Premium Card */}
              <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Recommended Rate Premium Adder
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Based on {selectedFacility.totalRecordedStops} fleet stops</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-xs text-slate-300">Mileage-based Add:</span>
                    <div className="text-xl font-black text-emerald-400 font-mono">
                      +${(selectedFacility.recommendedRateAdderPerMileCents / 100).toFixed(2)}{" "}
                      <span className="text-xs text-slate-400 font-normal">/ mile</span>
                    </div>
                  </div>
                  <div className="hidden sm:block text-slate-600 font-bold text-lg">OR</div>
                  <div>
                    <span className="text-xs text-slate-300">Flat Delay Contingency:</span>
                    <div className="text-xl font-black text-emerald-400 font-mono">
                      +${selectedFacility.recommendedFlatDetentionBufferDollars}.00{" "}
                      <span className="text-xs text-slate-400 font-normal">flat buffer</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contractual Protective Clauses Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Demanded Rate Confirmation Terms (Counter-Offer)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Free Time Demand:</span>
                    <span className="font-bold text-white">
                      {selectedFacility.recommendedContractualTerms.demandedFreeTimeHours} Hour(s) Free Time
                    </span>{" "}
                    <span className="text-slate-500">(Reject standard 2h)</span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Detention Hourly Rate:</span>
                    <span className="font-bold text-emerald-400">
                      ${selectedFacility.recommendedContractualTerms.demandedDetentionRatePerHour}/hr
                    </span>{" "}
                    <span className="text-slate-500">(Billed per minute or 15m)</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Required In-Cab Evidence:</span>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-200">
                    {selectedFacility.recommendedContractualTerms.requiredProof}
                  </div>
                </div>
              </div>

              {/* Negotiation Cheat Sheet Bullet Points */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Dispatcher Negotiation Talking Points:
                </h4>
                <ul className="space-y-2 text-xs text-slate-300">
                  {selectedFacility.negotiationCheatSheet.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-xs text-slate-400">
              Select a facility from the left column to review detailed dwell benchmarks and rate adders.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from "react";
import { BarChart3, AlertTriangle, ShieldCheck, MapPin, Building, ChevronRight, History } from "lucide-react";
import { Facility } from "../types/dwell";

interface DispatcherFacilityRiskProps {
  facilities: Facility[];
}

export const DispatcherFacilityRisk: React.FC<DispatcherFacilityRiskProps> = ({
  facilities,
}) => {
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);

  const getRiskBadge = (category: string) => {
    switch (category) {
      case "Severe":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-500 text-white shadow-sm">Severe Risk</span>;
      case "High":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950">High Risk</span>;
      case "Moderate":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">Moderate</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Low Risk</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Facility Dwell Risk Intelligence</h1>
          <p className="text-xs text-slate-400">
            Historical dock overage analytics, p90 dwell times, and predictive carrier detention risk.
          </p>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 max-w-md">
          <span className="font-bold text-emerald-400">Dispatcher Tip: </span>
          Facilities with overage rates &gt; 50% consistently trap drivers beyond free time. Require $65+/hr detention or 1h free time before accepting load dispatch.
        </div>
      </div>

      {/* Facilities Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Facility & Address</th>
                <th className="p-4">Stops Tracked</th>
                <th className="p-4">Overage Rate</th>
                <th className="p-4">Median Dwell</th>
                <th className="p-4">90th %ile Dwell</th>
                <th className="p-4">Risk Tier</th>
                <th className="p-4 text-right">History</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {facilities.map((fac) => {
                const overagePct = Math.round(fac.stats.overageRate * 100);
                const medianH = Math.floor(fac.stats.medianDwellMinutes / 60);
                const medianM = fac.stats.medianDwellMinutes % 60;
                const p90H = Math.floor(fac.stats.p90DwellMinutes / 60);
                const p90M = fac.stats.p90DwellMinutes % 60;

                return (
                  <tr
                    key={fac.id}
                    onClick={() => setSelectedFacility(fac)}
                    className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-bold text-white text-sm">{fac.canonicalName}</div>
                      <div className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {fac.address}
                      </div>
                    </td>
                    <td className="p-4 font-mono font-medium">{fac.stats.stopCount} stops</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${
                              overagePct >= 70
                                ? "bg-red-500"
                                : overagePct >= 40
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${overagePct}%` }}
                          />
                        </div>
                        <span className="font-bold font-mono text-sm">{overagePct}%</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-medium">
                      {medianH}h {medianM}m
                    </td>
                    <td className="p-4 font-mono font-semibold text-white">
                      {p90H}h {p90M}m
                    </td>
                    <td className="p-4">{getRiskBadge(fac.riskCategory)}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFacility(fac);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700 inline-flex items-center gap-1"
                      >
                        <History className="w-3.5 h-3.5" />
                        View Logs
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Facility History Modal */}
      {selectedFacility && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col text-white shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getRiskBadge(selectedFacility.riskCategory)}
                  <span className="text-xs text-slate-400">
                    Overage Rate: {Math.round(selectedFacility.stats.overageRate * 100)}%
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white">{selectedFacility.canonicalName}</h2>
                <p className="text-xs text-slate-400">{selectedFacility.address}</p>
              </div>
              <button
                onClick={() => setSelectedFacility(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* Prompt C Normalization Info */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <span className="font-bold uppercase text-slate-400 block mb-1">
                  Prompt C: Raw Name Normalization Aliases
                </span>
                <p className="text-slate-300 mb-2">
                  Incoming rate confirmations contain diverse naming styles. Prompt C canonicalizes them into this facility entity:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedFacility.rawNames.map((alias, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[11px]"
                    >
                      "{alias}"
                    </span>
                  ))}
                </div>
              </div>

              {/* Historical Dwells List */}
              <div>
                <h3 className="font-bold text-sm text-white mb-2 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-emerald-400" />
                  Recorded Telematics Dwell Stops ({selectedFacility.historicalDwells.length})
                </h3>
                <div className="space-y-2">
                  {selectedFacility.historicalDwells.map((dwell, idx) => {
                    const dwellH = Math.floor(dwell.dwellMinutes / 60);
                    const dwellM = dwell.dwellMinutes % 60;
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                          dwell.exceededFreeTime
                            ? "bg-red-950/20 border-red-500/30 text-slate-200"
                            : "bg-slate-950 border-slate-800 text-slate-400"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>Load #{dwell.loadNumber}</span>
                            <span className="text-[11px] text-slate-400 font-normal">({dwell.date})</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Free Time: {dwell.freeTimeMinutes}m • Total Dwell: {dwellH}h {dwellM}m
                          </div>
                        </div>

                        <div className="text-right">
                          {dwell.exceededFreeTime ? (
                            <div>
                              <span className="font-black text-red-400 font-mono text-sm block">
                                +${(dwell.detentionAccruedCents / 100).toFixed(2)}
                              </span>
                              <span className="text-[10px] text-red-300 font-semibold">Exceeded Free Time</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-emerald-400 font-semibold">Within Free Time</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 text-right">
              <button
                onClick={() => setSelectedFacility(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

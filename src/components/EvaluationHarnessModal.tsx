import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Play, ShieldCheck, BarChart2, RefreshCw } from "lucide-react";
import { EvaluationResult, FieldAccuracyReport } from "../services/extraction/evaluateExtraction";

interface EvaluationHarnessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EvaluationHarnessModal: React.FC<EvaluationHarnessModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);

  const runHarness = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/eval/run");
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !result) {
      runHarness();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-bold text-base text-white">
                Contract Extraction Evaluation Harness
              </h2>
              <p className="text-xs text-slate-400">
                Automated regression testing against 12 golden rate confirmation fixtures
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold p-1"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Top Score Banner */}
          {result && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Tested Fixtures</div>
                <div className="font-mono text-2xl font-black text-white">{result.totalFixtures}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Fields Tested</div>
                <div className="font-mono text-2xl font-black text-white">{result.totalFieldsTested}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Fields Correct</div>
                <div className="font-mono text-2xl font-black text-emerald-400">{result.totalFieldsCorrect}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Overall Accuracy</div>
                <div className="font-mono text-2xl font-black text-emerald-400">
                  {result.overallAccuracyPercent}%
                </div>
              </div>
            </div>
          )}

          {/* Field-by-Field Breakdown */}
          {result && (
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">
                Field-Level Accuracy Breakdown
              </h3>
              <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden divide-y divide-slate-800 text-xs">
                {Object.values(result.fieldReports).map((rep: FieldAccuracyReport) => {
                  const pass = rep.accuracyPercent >= 85;
                  return (
                    <div key={rep.fieldName} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {pass ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                        <div>
                          <span className="font-mono font-bold text-white text-xs">{rep.fieldName}</span>
                          <span className="text-slate-400 ml-2">
                            ({rep.correct} / {rep.total} matched)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${pass ? "bg-emerald-500" : "bg-red-500"}`}
                            style={{ width: `${rep.accuracyPercent}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-xs w-10 text-right">
                          {rep.accuracyPercent}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Golden Test Scenarios List */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
            <span className="font-bold text-slate-300 uppercase tracking-wide block">
              12 Real-World Golden Fixtures Evaluated:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-400 text-[11px]">
              <div>• C.H. Robinson: $50/hr, starts at appt, 24h window</div>
              <div>• TQL: $40/hr, 12h filing window, strict POD</div>
              <div>• Coyote: $45/hr, 30m billing increment, 48h window</div>
              <div>• Landstar: $55/hr, 2h free time pickup & delivery</div>
              <div>• Echo: $40/hr, starts at physical arrival, 24h window</div>
              <div>• Arrive: $50/hr, $250 stop cap, 2h free time</div>
              <div>• Uber Freight: $50/hr, 15m quarter-hour increment</div>
              <div>• Schneider: $60/hr, 24h filing deadline</div>
              <div>• J.B. Hunt: $50/hr, 2h free time, $300 cap</div>
              <div>• BNSF Logistics: $45/hr, 30-min notice trigger</div>
              <div>• Convoy (Flexport): $50/hr, in/out dock stamps</div>
              <div>• Apex Custom: Multi-stop contract, 1h free delivery</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            onClick={runHarness}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            {loading ? "Testing..." : "Re-Run All 12 Fixtures"}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

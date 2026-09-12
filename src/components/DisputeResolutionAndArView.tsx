import React, { useState, useEffect } from "react";
import {
  Scale,
  DollarSign,
  AlertOctagon,
  FileCheck,
  Send,
  CheckCircle2,
  Copy,
  Clock,
  ShieldAlert,
  ChevronRight,
  Mail,
  Building2,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Edit3,
  Flame,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { BrokerRebuttalExcuse, DisputeCase, ArAgingInvoice } from "../types/dwell";
import { triggerHapticTap } from "../utils/audioAlerts";

const EXCUSE_OPTIONS: { id: BrokerRebuttalExcuse; label: string; desc: string }[] = [
  {
    id: "alleged_late_arrival",
    label: "Broker Claims Late Arrival",
    desc: "Refutes alleged tardiness using certified ELD GPS breadcrumbs and gate check-in time within window.",
  },
  {
    id: "shipper_blamed",
    label: "Broker Blames Shipper / Third Party",
    desc: "Enforces broker privity of contract under 49 U.S.C. § 14101 and Carmack precedent.",
  },
  {
    id: "partial_payment_offered",
    label: "Partial / Courtesy Payment ($50) Offered",
    desc: "Rejects accord and satisfaction under UCC § 3-311 and demands full contractual balance.",
  },
  {
    id: "missing_gate_times",
    label: "BOL Missing In/Out Gate Stamps",
    desc: "Provides certified optical watermark camera proof with cryptographic SHA-256 hash.",
  },
  {
    id: "rescheduled_appointment",
    label: "Facility Rescheduled During Delay",
    desc: "Cites Surface Transportation Board rulings that carrier cannot be held as uncompensated warehouse.",
  },
];

export const DisputeResolutionAndArView: React.FC = () => {
  const [subTab, setSubTab] = useState<"rebuttals" | "ar_aging">("rebuttals");

  // Generator Source Mode
  const [rebuttalSource, setRebuttalSource] = useState<"queue" | "custom">("queue");

  // Dispute Cases from Queue
  const [disputes, setDisputes] = useState<DisputeCase[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<DisputeCase | null>(null);
  const [activeExcuse, setActiveExcuse] = useState<BrokerRebuttalExcuse>("alleged_late_arrival");

  // Custom Dispute Rejection Inputs
  const [customBrokerName, setCustomBrokerName] = useState("Total Quality Logistics (TQL)");
  const [customLoadNumber, setCustomLoadNumber] = useState("TQL-982410");
  const [customClaimedAmount, setCustomClaimedAmount] = useState("225.00");
  const [customBrokerOffer, setCustomBrokerOffer] = useState("0.00");
  const [customBrokerStatement, setCustomBrokerStatement] = useState(
    "Denied: Shipper reports your driver arrived outside the designated appointment window and failed to provide 2-hour advance check-in notice."
  );
  const [customDriverNotes, setCustomDriverNotes] = useState(
    "ELD breadcrumb proves truck was inside facility fence at 07:44 AM. Guard shack delay held driver up."
  );
  const [legalTone, setLegalTone] = useState<"firm_legal" | "aggressive_demand" | "commercial_settlement">("firm_legal");

  // Letter & Output State
  const [generatedLetter, setGeneratedLetter] = useState<{
    subject: string;
    letterMarkdown: string;
    statutoryCitations: string[];
    engine?: string;
    generatedAt?: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMarkdown, setEditedMarkdown] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // A/R Invoices
  const [arData, setArData] = useState<{
    invoices: ArAgingInvoice[];
    totalOutstandingCents: number;
    pastDueCount: number;
    brackets: Record<string, number>;
  } | null>(null);
  const [selectedBracket, setSelectedBracket] = useState<string>("all");
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  const fetchDisputes = async () => {
    try {
      const res = await fetch("/api/disputes");
      if (res.ok) {
        const list: DisputeCase[] = await res.json();
        setDisputes(list);
        return list;
      }
    } catch (err) {
      console.error(err);
    }
    return [];
  };

  const fetchArInvoices = async () => {
    try {
      const res = await fetch("/api/ar/invoices");
      if (res.ok) {
        const data = await res.json();
        setArData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Explicit Generation Function
  const handleGenerateRebuttal = async (opts?: {
    dispute?: DisputeCase | null;
    excuse?: BrokerRebuttalExcuse;
    tone?: "firm_legal" | "aggressive_demand" | "commercial_settlement";
    source?: "queue" | "custom";
  }) => {
    triggerHapticTap();
    setIsGenerating(true);
    setGenerationError(null);

    const source = opts?.source ?? rebuttalSource;
    const excuse = opts?.excuse ?? activeExcuse;
    const tone = opts?.tone ?? legalTone;
    const dispute = opts?.dispute ?? selectedDispute;

    let payload: any = {};

    if (source === "queue" && dispute) {
      payload = {
        brokerName: dispute.brokerName,
        loadNumber: dispute.loadNumber,
        disputeReason: excuse,
        claimedAmountCents: dispute.claimedAmountCents,
        brokerOfferedCents: dispute.brokerOfferedCents,
        telematicsPing: dispute.evidenceCitations?.telematicsPing || "2026-09-10 07:42:15 UTC (Lat 41.5201, Lng -87.4120)",
        gatePassTime: dispute.evidenceCitations?.gatePassTime || "07:45 AM In-Gate Guard Stamp #14",
        rateConClause: dispute.evidenceCitations?.rateConClause || "Detention $85/hr after 2 hrs free time",
        brokerStatement: dispute.brokerStatement,
        tone,
      };
    } else {
      const claimedCents = Math.round((parseFloat(customClaimedAmount) || 150) * 100);
      const offerCents = Math.round((parseFloat(customBrokerOffer) || 0) * 100);
      payload = {
        brokerName: customBrokerName || "Broker Operations",
        loadNumber: customLoadNumber || "LOAD-001",
        disputeReason: excuse,
        claimedAmountCents: claimedCents,
        brokerOfferedCents: offerCents,
        telematicsPing: "2026-09-10 07:42:15 UTC (Lat 41.5201, Lng -87.4120)",
        gatePassTime: "07:45 AM In-Gate Guard Stamp #14",
        rateConClause: "Detention $85/hr after 2 hrs free time; 15-min billing increments",
        brokerStatement: customBrokerStatement,
        customNotes: customDriverNotes,
        tone,
      };
    }

    try {
      const res = await fetch("/api/disputes/generate-rebuttal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        setGeneratedLetter(result);
        setEditedMarkdown(result.letterMarkdown || "");
        setIsEditing(false);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setGenerationError(errJson.error || "Failed to generate rebuttal letter.");
      }
    } catch (err: any) {
      console.error("Rebuttal generation error:", err);
      setGenerationError(err.message || "Network error while generating rebuttal.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Automatically load disputes and generate initial rebuttal on mount
  useEffect(() => {
    const init = async () => {
      const list = await fetchDisputes();
      if (list.length > 0) {
        const first = list[0];
        setSelectedDispute(first);
        setActiveExcuse(first.disputeReason);
        handleGenerateRebuttal({
          dispute: first,
          excuse: first.disputeReason,
          source: "queue",
        });
      }
      fetchArInvoices();
    };
    init();
  }, []);

  const handleSendRebuttal = async () => {
    const markdownToSend = isEditing ? editedMarkdown : generatedLetter?.letterMarkdown;
    const subjectToSend = generatedLetter?.subject;
    if (!markdownToSend) return;

    triggerHapticTap();
    setIsSending(true);
    try {
      const targetId = selectedDispute?.id || "disp-001";
      const res = await fetch(`/api/disputes/${targetId}/send-rebuttal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          letterMarkdown: markdownToSend,
          subject: subjectToSend,
        }),
      });
      if (res.ok) {
        setSentSuccess(true);
        setTimeout(() => setSentSuccess(false), 3500);
        await fetchDisputes();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendReminder = async (invoiceId: string) => {
    triggerHapticTap();
    setSendingReminderId(invoiceId);
    try {
      const res = await fetch(`/api/ar/invoices/${invoiceId}/send-reminder`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchArInvoices();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSendingReminderId(null);
    }
  };

  const handleCopyLetter = () => {
    const textToCopy = isEditing ? editedMarkdown : generatedLetter?.letterMarkdown;
    if (!textToCopy) return;
    triggerHapticTap();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredInvoices = (arData?.invoices || []).filter((inv) => {
    if (selectedBracket === "all") return true;
    return inv.agingBracket === selectedBracket;
  });

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0D1424] border border-white/5 rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-lime-400/20 text-lime-400 border border-lime-400/30">
              <Scale className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">
              Broker Rebuttal & Dispute Resolution Engine
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Automated legal pushbacks, statutory contract citations, and A/R collections aging tracker
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center bg-[#070B14] p-1 rounded-xl border border-white/5 self-start sm:self-auto">
          <button
            onClick={() => {
              triggerHapticTap();
              setSubTab("rebuttals");
            }}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
              subTab === "rebuttals"
                ? "bg-lime-400 text-slate-950 shadow-md shadow-lime-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Scale className="w-3.5 h-3.5" /> One-Click Rebuttal Generator
          </button>
          <button
            onClick={() => {
              triggerHapticTap();
              setSubTab("ar_aging");
            }}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
              subTab === "ar_aging"
                ? "bg-lime-400 text-slate-950 shadow-md shadow-lime-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" /> Broker Aging & A/R (Collections)
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* SUB-TAB 1: REBUTTAL GENERATOR */}
      {/* ==================================================== */}
      {subTab === "rebuttals" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Generator Controls & Form */}
          <div className="lg:col-span-5 space-y-4">
            {/* Mode Switcher */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex gap-1 shadow-lg">
              <button
                onClick={() => {
                  triggerHapticTap();
                  setRebuttalSource("queue");
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  rebuttalSource === "queue"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Active Disputes ({disputes.length})</span>
              </button>
              <button
                onClick={() => {
                  triggerHapticTap();
                  setRebuttalSource("custom");
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  rebuttalSource === "custom"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Custom Rebuttal / Email</span>
              </button>
            </div>

            {/* Queue Mode: Disputed Claims Selector */}
            {rebuttalSource === "queue" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    <span>Select Denied Claim</span>
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono">
                    {disputes.length} CASES
                  </span>
                </div>

                <div className="space-y-2">
                  {disputes.map((disp) => (
                    <button
                      key={disp.id}
                      onClick={() => {
                        triggerHapticTap();
                        setSelectedDispute(disp);
                        setActiveExcuse(disp.disputeReason);
                        handleGenerateRebuttal({
                          dispute: disp,
                          excuse: disp.disputeReason,
                          source: "queue",
                        });
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                        selectedDispute?.id === disp.id
                          ? "bg-slate-800 border-amber-500/80 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/40"
                          : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">{disp.brokerName}</span>
                        <span className="font-mono text-xs font-black text-amber-400">
                          ${(disp.claimedAmountCents / 100).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-mono">{disp.loadNumber}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            disp.status === "rebuttal_sent"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          {disp.status === "rebuttal_sent" ? "Rebuttal Sent" : "Broker Denial"}
                        </span>
                      </div>

                      {disp.brokerStatement && (
                        <p className="text-[11px] text-slate-300 italic bg-slate-900/90 p-2 rounded border border-white/5 line-clamp-2 mt-0.5">
                          "{disp.brokerStatement}"
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Mode: Direct Form Input */}
            {rebuttalSource === "custom" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
                <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Custom Rebuttal Parameters</span>
                </h2>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Broker Name
                    </label>
                    <input
                      type="text"
                      value={customBrokerName}
                      onChange={(e) => setCustomBrokerName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                      placeholder="e.g. C.H. Robinson, TQL, Coyote"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Load / PRO #
                    </label>
                    <input
                      type="text"
                      value={customLoadNumber}
                      onChange={(e) => setCustomLoadNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none font-mono"
                      placeholder="e.g. LOAD-8841"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Claimed Amount ($)
                    </label>
                    <input
                      type="number"
                      value={customClaimedAmount}
                      onChange={(e) => setCustomClaimedAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-400 font-mono font-bold focus:border-amber-500 focus:outline-none"
                      placeholder="150.00"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Broker Offer ($)
                    </label>
                    <input
                      type="number"
                      value={customBrokerOffer}
                      onChange={(e) => setCustomBrokerOffer(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono focus:border-amber-500 focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Broker Rejection Email / Statement (Paste Here)
                  </label>
                  <textarea
                    rows={2}
                    value={customBrokerStatement}
                    onChange={(e) => setCustomBrokerStatement(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                    placeholder="Paste the broker's rejection email or excuse..."
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Driver Field Notes / ELD Context
                  </label>
                  <input
                    type="text"
                    value={customDriverNotes}
                    onChange={(e) => setCustomDriverNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-amber-500 focus:outline-none"
                    placeholder="e.g. Staged at door 4 since 08:00 AM, lumper crew late"
                  />
                </div>
              </div>
            )}

            {/* Rebuttal Excuse Selector */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-amber-400" />
                <span>Broker Rejection Category</span>
              </h2>

              <div className="space-y-1.5">
                {EXCUSE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      triggerHapticTap();
                      setActiveExcuse(opt.id);
                      handleGenerateRebuttal({ excuse: opt.id });
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all ${
                      activeExcuse === opt.id
                        ? "bg-amber-500/10 border-amber-500/60 text-amber-200 ring-1 ring-amber-500/30"
                        : "bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>{opt.label}</span>
                      {activeExcuse === opt.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Tone Selector & Primary Generate Button */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-slate-400">Legal Stance / Tone</span>
                <span className="text-[10px] text-slate-500 font-mono">FMCSR & UCC Guided</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "firm_legal", label: "Contractual", icon: Scale },
                  { id: "aggressive_demand", label: "Fierce Demand", icon: Flame },
                  { id: "commercial_settlement", label: "Settlement", icon: Zap },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        triggerHapticTap();
                        setLegalTone(t.id as any);
                        handleGenerateRebuttal({ tone: t.id as any });
                      }}
                      className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                        legalTone === t.id
                          ? "bg-amber-500/15 border-amber-500 text-amber-300 font-bold"
                          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-[11px]">{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* PRIMARY PROMINENT GENERATE BUTTON */}
              <button
                onClick={() => handleGenerateRebuttal()}
                disabled={isGenerating}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Synthesizing Legal Rebuttal with Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>Generate AI Legal Rebuttal</span>
                    <span className="ml-auto text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-950/20 text-slate-900 font-extrabold">
                      Gemini 3.8 Flash
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Pre-written Legally Grounded Letter & Audit Evidence */}
          <div className="lg:col-span-7 space-y-4">
            {/* Error Banner if any */}
            {generationError && (
              <div className="bg-rose-950/60 border border-rose-500/40 rounded-2xl p-4 text-rose-300 text-xs flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{generationError}</span>
                </div>
                <button
                  onClick={() => handleGenerateRebuttal()}
                  className="px-2.5 py-1 rounded bg-rose-500/30 hover:bg-rose-500/50 text-rose-200 font-bold"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Generating State with Pulse Animation */}
            {isGenerating && (
              <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-8 shadow-2xl flex flex-col items-center justify-center text-center space-y-4 animate-pulse">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
                  <Sparkles className="w-7 h-7 animate-spin" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h4 className="text-base font-bold text-white">Synthesizing Formal Legal Rebuttal</h4>
                  <p className="text-xs text-slate-400">
                    Evaluating broker denial statements, cross-referencing certified ELD GPS telematics breadcrumbs, and invoking 49 U.S.C. § 14101 and UCC § 2-607 legal precedent...
                  </p>
                </div>
                <div className="w-56 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 animate-pulse rounded-full w-4/5" />
                </div>
                <span className="text-[11px] font-mono text-amber-300">
                  Model: gemini-3.8-flash • Statutory Defense Engine
                </span>
              </div>
            )}

            {/* Generated Letter Display */}
            {!isGenerating && generatedLetter && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col space-y-4">
                {/* Letter Header Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-emerald-400" />
                        Legal Rebuttal & Demand Letter
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                        {generatedLetter.engine === "gemini-3.8-flash"
                          ? "⚡ Gemini 3.8 Flash"
                          : "🏛️ Deterministic Legal Template"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-1 truncate">
                      Subject: {generatedLetter.subject}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                        isEditing
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      {isEditing ? "Done Editing" : "Edit Text"}
                    </button>

                    <button
                      onClick={handleCopyLetter}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copied ? "Copied!" : "Copy"}
                    </button>

                    <button
                      onClick={handleSendRebuttal}
                      disabled={isSending}
                      className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isSending ? "Sending..." : sentSuccess ? "Sent!" : "Dispatch Rebuttal"}
                    </button>
                  </div>
                </div>

                {/* Statutory Citations Badge Row */}
                {generatedLetter.statutoryCitations && generatedLetter.statutoryCitations.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Statutory & Contractual Authority Applied:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {generatedLetter.statutoryCitations.map((cite, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-medium"
                        >
                          ⚖️ {cite}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evidence Packet Snippet */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                  <div className="font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                    Dual-Source Evidence Packet Auto-Attached:
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    • <strong className="text-slate-200">Telematics Audit:</strong>{" "}
                    {selectedDispute?.evidenceCitations?.telematicsPing || "2026-09-10 07:42:15 UTC (Lat 41.5201, Lng -87.4120)"}
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    • <strong className="text-slate-200">Gate Check-in:</strong>{" "}
                    {selectedDispute?.evidenceCitations?.gatePassTime || "07:45 AM In-Gate Guard Stamp #14"}
                  </div>
                </div>

                {/* Formatted Letter Body View or Live Editor */}
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-amber-300">
                      <span>Editing letter body markdown:</span>
                      <span className="text-slate-500 font-mono">{editedMarkdown.length} characters</span>
                    </div>
                    <textarea
                      rows={14}
                      value={editedMarkdown}
                      onChange={(e) => setEditedMarkdown(e.target.value)}
                      className="w-full bg-slate-950 border border-amber-500/50 rounded-xl p-4 font-mono text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed"
                    />
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[480px] overflow-y-auto selection:bg-amber-500 selection:text-slate-950">
                    {editedMarkdown || generatedLetter.letterMarkdown}
                  </div>
                )}
              </div>
            )}

            {/* Empty State / Not Yet Generated */}
            {!isGenerating && !generatedLetter && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 shadow-xl flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Scale className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h4 className="text-base font-bold text-white">Rebuttal Generator Ready</h4>
                  <p className="text-xs text-slate-400">
                    Select a broker dispute or paste a broker rejection statement on the left, then click Generate AI Legal Rebuttal.
                  </p>
                </div>
                <button
                  onClick={() => handleGenerateRebuttal()}
                  className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Legal Rebuttal Now</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUB-TAB 2: BROKER AGING & COLLECTIONS TRACKER (A/R) */}
      {/* ==================================================== */}
      {subTab === "ar_aging" && arData && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <span className="text-xs text-slate-400 font-semibold block mb-1">
                Total Outstanding A/R
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-white">
                ${(arData.totalOutstandingCents / 100).toFixed(2)}
              </span>
              <span className="text-[11px] text-amber-400 block mt-1">Across 4 broker accounts</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <span className="text-xs text-slate-400 font-semibold block mb-1">Past Due Invoices</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-rose-400">
                {arData.pastDueCount} Invoices
              </span>
              <span className="text-[11px] text-rose-300/80 block mt-1">Requiring collections escalation</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <span className="text-xs text-slate-400 font-semibold block mb-1">Avg Collection Time</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-white">22.4 Days</span>
              <span className="text-[11px] text-emerald-400 block mt-1">Industry standard: 34 days</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <span className="text-xs text-slate-400 font-semibold block mb-1">Reminders Sent</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-white">
                {arData.invoices.reduce((acc, i) => acc + i.remindersSentCount, 0)} Total
              </span>
              <span className="text-[11px] text-slate-400 block mt-1">Auto-logged audit trail</span>
            </div>
          </div>

          {/* Aging Brackets Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900 p-3 rounded-2xl border border-slate-800">
            <span className="text-xs font-bold text-slate-400 mr-2">Aging Brackets:</span>
            {[
              { id: "all", label: "All Invoices", count: arData.invoices.length },
              { id: "current", label: "Current (0-14d)", count: arData.brackets.current },
              { id: "1-15_days", label: "1-15d Past Due", count: arData.brackets.days1_15 },
              { id: "16-30_days", label: "16-30d Past Due", count: arData.brackets.days16_30 },
              { id: "31-45_days", label: "31-45d Past Due", count: arData.brackets.days31_45 },
              { id: "45+_days", label: "45+d Past Due (Critical)", count: arData.brackets.days45Plus },
            ].map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  triggerHapticTap();
                  setSelectedBracket(b.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedBracket === b.id
                    ? "bg-amber-500 text-slate-950"
                    : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <span>{b.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 font-mono">
                  {b.count}
                </span>
              </button>
            ))}
          </div>

          {/* Invoices List Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Invoice #</th>
                    <th className="p-3.5">Broker & Credit Tier</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Days Past Due</th>
                    <th className="p-3.5">Aging Bracket</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Collections Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-white">
                        {inv.invoiceNumber}
                        <span className="block text-[10px] text-slate-500">{inv.loadNumber}</span>
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-white">{inv.brokerName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              inv.brokerCreditTier === "Low Risk"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : inv.brokerCreditTier === "Moderate Risk"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            Credit: {inv.brokerCreditScore}/100 ({inv.brokerCreditTier})
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono font-bold text-amber-400 text-sm">
                        ${(inv.amountCents / 100).toFixed(2)}
                      </td>

                      <td className="p-3.5 font-mono">
                        <span
                          className={`font-bold ${
                            inv.daysPastDue > 30
                              ? "text-rose-400"
                              : inv.daysPastDue > 15
                              ? "text-amber-400"
                              : "text-slate-300"
                          }`}
                        >
                          {inv.daysPastDue > 0 ? `+${inv.daysPastDue} days` : "Current"}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700">
                          {inv.agingBracket.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            inv.status === "paid"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : inv.status === "reminder_dispatched"
                              ? "bg-cyan-500/20 text-cyan-300"
                              : inv.status === "disputed"
                              ? "bg-rose-500/20 text-rose-300"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {inv.status.replace(/_/g, " ")}
                        </span>
                        {inv.remindersSentCount > 0 && (
                          <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                            {inv.remindersSentCount} notice{inv.remindersSentCount > 1 ? "s" : ""} sent
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleSendReminder(inv.id)}
                          disabled={sendingReminderId === inv.id}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 hover:border-amber-500/50 flex items-center gap-1.5 ml-auto transition-all active:scale-95"
                        >
                          <Mail className="w-3.5 h-3.5 text-amber-400" />
                          {sendingReminderId === inv.id ? "Dispatching..." : "Send Reminder"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

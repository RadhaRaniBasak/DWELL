import React, { useState } from "react";
import {
  ShieldAlert,
  Clock,
  Send,
  FileCheck,
  CheckCircle2,
  Copy,
  Download,
  AlertTriangle,
  RefreshCw,
  Eye,
  Paperclip,
  Database,
  BedDouble,
  Mic,
} from "lucide-react";
import { Claim } from "../types/dwell";
import { AutomatedEmailDispatcherModal } from "./AutomatedEmailDispatcherModal";
import { TmsExportModal } from "./TmsExportModal";
import { Mail, Zap } from "lucide-react";

interface DispatcherClaimsPipelineProps {
  claims: any[];
  onSendClaim: (claimId: string, email?: string) => Promise<void>;
  onRegenerateLetter: (claimId: string) => Promise<void>;
  onConvertToLayover?: (claimId: string) => Promise<void>;
}

export const DispatcherClaimsPipeline: React.FC<DispatcherClaimsPipelineProps> = ({
  claims,
  onSendClaim,
  onRegenerateLetter,
  onConvertToLayover,
}) => {
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Sort claims by: at_risk first, then by filing deadline ascending
  const sortedClaims = [...claims].sort((a, b) => {
    if (a.status === "at_risk" && b.status !== "at_risk") return -1;
    if (b.status === "at_risk" && a.status !== "at_risk") return 1;
    const timeA = a.filingDeadlineAt ? new Date(a.filingDeadlineAt).getTime() : Infinity;
    const timeB = b.filingDeadlineAt ? new Date(b.filingDeadlineAt).getTime() : Infinity;
    return timeA - timeB;
  });

  const handleCopyLetter = () => {
    if (selectedClaim?.letterMarkdown) {
      navigator.clipboard.writeText(selectedClaim.letterMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSend = async (claimId: string) => {
    setSending(true);
    try {
      await onSendClaim(claimId);
      if (selectedClaim?.id === claimId) {
        setSelectedClaim((prev: any) => (prev ? { ...prev, status: "filed", sentAt: new Date().toISOString() } : null));
      }
    } finally {
      setSending(false);
    }
  };

  const handleRegenerate = async (claimId: string) => {
    setRegenerating(true);
    try {
      await onRegenerateLetter(claimId);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Detention Claims Pipeline</h1>
          <p className="text-xs text-slate-400">
            Automated claim assembly, evidence checklist validation, and contractual notice & filing deadlines.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <button
            onClick={() => setShowExportModal(true)}
            className="px-3 py-1.5 rounded-xl bg-lime-400/10 hover:bg-lime-400/20 text-lime-400 border border-lime-400/30 font-black flex items-center gap-1.5 transition active:scale-95 shadow-sm"
          >
            <Database className="w-3.5 h-3.5 text-lime-400" />
            <span>Export TMS / Invoices</span>
          </button>
          <button
            onClick={() => setShowEmailModal(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
          >
            <Mail className="w-3.5 h-3.5 text-lime-400" />
            <span>Auto-Dispatch Queue</span>
          </button>
          <span className="px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-300 font-black border border-amber-400/30">
            {claims.filter((c) => c.status === "at_risk").length} At-Risk
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-lime-400/20 text-lime-400 font-black border border-lime-400/30">
            {claims.filter((c) => c.status === "filed").length} Filed
          </span>
        </div>
      </div>

      {/* Claims List */}
      <div className="space-y-3">
        {sortedClaims.map((claim) => {
          const isAtRisk = claim.status === "at_risk";
          const isFiled = claim.status === "filed";
          const hasMissingDocs = claim.missingRequiredDocs && claim.missingRequiredDocs.length > 0;
          const hoursLeft = claim.hoursUntilFilingDeadline;

          return (
            <div
              key={claim.id}
              className={`p-4 rounded-2xl border transition-all bg-[#0D1424] flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                isAtRisk
                  ? "border-amber-400/60 bg-amber-950/20 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                  : isFiled
                  ? "border-lime-400/30 bg-[#0D1424]/80"
                  : "border-white/5 hover:border-white/10"
              }`}
            >
              {/* Left Details */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-black text-white">{claim.loadNumber || "Load #"}</span>
                  <span className="text-xs text-slate-300 font-semibold">• {claim.brokerName}</span>
                  {claim.computation?.billingIncrement === "daily" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/50">
                      <BedDouble className="w-3 h-3 text-rose-400" />
                      LAYOVER CLAIM ($500/DAY)
                    </span>
                  )}
                  {isAtRisk && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 animate-pulse">
                      <Clock className="w-3 h-3" />
                      DEADLINE CLOSING: {hoursLeft !== null ? `${hoursLeft}h remaining` : "URGENT"}
                    </span>
                  )}
                  {isFiled && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-lime-400/20 text-lime-400 border border-lime-400/30">
                      <CheckCircle2 className="w-3 h-3" />
                      Filed ({new Date(claim.sentAt).toLocaleDateString()})
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-400">
                  Facility: <span className="text-white font-bold">{claim.facilityName}</span>
                </div>

                <div className="text-xs text-slate-400">
                  <span className="font-bold text-slate-300">Computation:</span>{" "}
                  {claim.computation?.explanation || `${Math.floor(claim.detentionMinutes / 60)}h ${claim.detentionMinutes % 60}m billable`}
                </div>

                {hasMissingDocs && !isFiled && (
                  <div className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-bold mt-1">
                    <AlertTriangle className="w-3 h-3" />
                    Missing required document: {claim.missingRequiredDocs.join(", ")}
                  </div>
                )}
              </div>

              {/* Right: Amount & Actions */}
              <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Claim Total</span>
                  <span className="font-mono text-2xl font-black text-lime-400">
                    ${((claim.amountCents || 0) / 100).toFixed(2)}
                  </span>
                  {claim.computation?.billingIncrement === "daily" && (
                    <span className="text-[10px] text-rose-300 font-mono font-bold block">Flat Daily Rate</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {onConvertToLayover && (claim.detentionMinutes >= 480 || claim.detentionMinutes >= 600) && claim.computation?.billingIncrement !== "daily" && !isFiled && (
                    <button
                      onClick={() => onConvertToLayover(claim.id)}
                      className="px-2.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-black flex items-center gap-1 shadow animate-pulse"
                      title="Incident exceeds 10h dwell — convert to Layover Claim ($500/day)"
                    >
                      <BedDouble className="w-3.5 h-3.5" />
                      <span>Convert Layover ($500)</span>
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedClaim(claim)}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-lime-400" />
                    Inspect Letter
                  </button>

                  {!isFiled && (
                    <button
                      onClick={() => handleSend(claim.id)}
                      disabled={sending}
                      className="px-3.5 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 text-xs font-black shadow-md shadow-lime-500/20 flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5 text-slate-950" />
                      {sending ? "Filing..." : "File Claim"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Claim Letter Inspection Drawer / Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1424] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col text-white shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#070B14]">
              <div>
                <span className="text-xs font-black uppercase text-lime-400">
                  Automated Claim Formatter
                </span>
                <h3 className="font-black text-base text-white">{selectedClaim.letterSubject}</h3>
              </div>
              <button
                onClick={() => setSelectedClaim(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 font-sans">
              {/* Fact Audit Box */}
              <div className="p-3 rounded-xl bg-[#070B14] border border-white/5 text-xs space-y-1">
                <div className="font-black text-slate-300 uppercase tracking-wide">
                  Deterministic Arithmetic Proof
                </div>
                <div className="text-lime-300 font-mono">
                  {selectedClaim.computation?.explanation}
                </div>
                <div className="text-slate-400">
                  Filing Deadline:{" "}
                  <span className="text-white font-bold">
                    {selectedClaim.filingDeadlineAt
                      ? new Date(selectedClaim.filingDeadlineAt).toLocaleString()
                      : "24h standard"}
                  </span>
                </div>
              </div>

              {/* Letter Markdown Box */}
              <div className="p-4 rounded-xl bg-[#060A14] border border-white/5 text-sm leading-relaxed whitespace-pre-wrap font-sans text-slate-200">
                {selectedClaim.letterMarkdown}
              </div>

              {/* Attachments list */}
              <div className="text-xs">
                <span className="font-black text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <Paperclip className="w-3 h-3 text-lime-400" />
                  Included Evidence Attachments ({selectedClaim.attachments?.length || 0})
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedClaim.attachments?.map((att: string, i: number) => {
                    const isVoice = att.toLowerCase().includes("voice") || att.toLowerCase().includes("memo");
                    return (
                      <span
                        key={i}
                        className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-mono text-[11px] ${
                          isVoice
                            ? "bg-purple-950/60 text-purple-300 border border-purple-500/40"
                            : "bg-slate-900 text-slate-300 border border-white/5"
                        }`}
                      >
                        {isVoice ? (
                          <Mic className="w-3 h-3 text-purple-400" />
                        ) : (
                          <FileCheck className="w-3 h-3 text-lime-400" />
                        )}
                        {att}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-white/5 flex items-center justify-between bg-[#070B14]">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLetter}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 border border-white/10 flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? "Copied!" : "Copy Letter"}
                </button>

                <button
                  onClick={() => {
                    if (navigator.share && selectedClaim) {
                      navigator.share({
                        title: `Detention Claim - Load #${selectedClaim.loadNumber}`,
                        text: selectedClaim.letterMarkdown,
                      }).catch(() => {});
                    } else {
                      handleCopyLetter();
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 border border-white/10 flex items-center gap-1.5"
                  title="Share claim packet via Native Sheet / WhatsApp / Email"
                >
                  <Download className="w-3.5 h-3.5" />
                  Share Packet
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 flex items-center gap-1.5"
                  title="Print or Save Claim Packet as PDF"
                >
                  Print / PDF
                </button>

                <button
                  onClick={() => handleRegenerate(selectedClaim.id)}
                  disabled={regenerating}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin text-emerald-400" : ""}`} />
                  Re-Format
                </button>
              </div>

              <div className="flex items-center gap-2">
                {selectedClaim.status !== "filed" ? (
                  <button
                    onClick={() => handleSend(selectedClaim.id)}
                    disabled={sending}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sending ? "Sending..." : `Send Claim to ${selectedClaim.brokerEmail || "Broker"}`}
                  </button>
                ) : (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Claim Sent & Filed
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Automated Broker Email Dispatcher Modal */}
      {showEmailModal && (
        <AutomatedEmailDispatcherModal
          onClose={() => setShowEmailModal(false)}
          onClaimDispatched={() => {
            // refresh
          }}
        />
      )}

      {/* TMS & Accounting Export Modal */}
      <TmsExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  );
};

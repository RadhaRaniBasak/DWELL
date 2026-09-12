import React, { useState, useEffect } from "react";
import {
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  FileCheck,
  Shield,
  X,
  Play,
  Settings,
  RefreshCw,
} from "lucide-react";
import { AutoDispatchRule, EmailDispatchRecord } from "../types/dwell";
import { triggerHapticTap } from "../utils/audioAlerts";

interface AutomatedEmailDispatcherModalProps {
  onClose: () => void;
  onClaimDispatched?: () => void;
}

export const AutomatedEmailDispatcherModal: React.FC<AutomatedEmailDispatcherModalProps> = ({
  onClose,
  onClaimDispatched,
}) => {
  const [dispatches, setDispatches] = useState<EmailDispatchRecord[]>([]);
  const [rule, setRule] = useState<AutoDispatchRule>({
    enabled: true,
    dispatchTiming: "15m_before_notice_deadline",
    requireAllEvidence: false,
    notifyDriver: true,
    ccEmail: "dispatch@carrierops.com",
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [runningDaemon, setRunningDaemon] = useState<boolean>(false);
  const [daemonResult, setDaemonResult] = useState<string | null>(null);

  const fetchEmailData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/email/dispatches");
      if (res.ok) {
        const data = await res.json();
        setDispatches(data.dispatches || []);
        if (data.rule) setRule(data.rule);
      }
    } catch (err) {
      console.error("Fetch email dispatches error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailData();
  }, []);

  const handleToggleRule = async (enabled: boolean) => {
    triggerHapticTap();
    const updated = { ...rule, enabled };
    setRule(updated);
    try {
      await fetch("/api/email/auto-dispatch-rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error("Save rule error:", err);
    }
  };

  const handleRunDaemonNow = async () => {
    triggerHapticTap();
    setRunningDaemon(true);
    setDaemonResult(null);

    try {
      const res = await fetch("/api/email/run-daemon", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setDaemonResult(
          data.dispatchedCount > 0
            ? `Successfully auto-dispatched ${data.dispatchedCount} claims to broker inboxes!`
            : "All active claims evaluated. None are currently within the 15-minute deadline window."
        );
        await fetchEmailData();
        if (onClaimDispatched) onClaimDispatched();
      }
    } catch (err) {
      console.error("Run daemon error:", err);
      setDaemonResult("Error running automated dispatch daemon.");
    } finally {
      setRunningDaemon(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Automated Broker Email Dispatcher
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  SMTP / SendGrid
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Guarantees claims and evidence are filed before broker notice windows expire.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {/* Rule Configuration Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div>
                <span className="text-xs font-bold text-white block">Auto-Dispatch Automation Daemon</span>
                <span className="text-xs text-slate-400">
                  Automatically emails PDF packet to broker detention desk 15 minutes before deadline.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleRule(!rule.enabled)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    rule.enabled
                      ? "bg-emerald-500 text-slate-950 shadow-sm"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${rule.enabled ? "bg-slate-950" : "bg-slate-500"}`} />
                  {rule.enabled ? "Daemon Enabled" : "Daemon Paused"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block">Trigger Threshold:</span>
                <span className="font-bold text-white">15 Minutes Before Deadline</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Dispatch CC Inbox:</span>
                <span className="font-mono text-emerald-400 font-bold">{rule.ccEmail}</span>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleRunDaemonNow}
                  disabled={runningDaemon}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Play className="w-3 h-3 fill-current text-emerald-400" />
                  {runningDaemon ? "Checking Deadlines..." : "Run Check Now"}
                </button>
              </div>
            </div>

            {daemonResult && (
              <div className="mt-3 p-2.5 rounded-lg bg-slate-900 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{daemonResult}</span>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Dispatched Detention Claims ({dispatches.length})
              </h3>
              <button
                onClick={fetchEmailData}
                className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>

            <div className="space-y-3">
              {dispatches.length === 0 ? (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500">
                  No automated dispatches logged yet.
                </div>
              ) : (
                dispatches.map((disp) => (
                  <div
                    key={disp.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs space-y-2.5 transition hover:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-white text-sm">
                            Load #{disp.loadNumber}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Delivered (SMTP 250)
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 uppercase">
                            {disp.triggerSource.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-slate-300 font-medium">{disp.subject}</p>
                      </div>

                      <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                        {new Date(disp.dispatchedAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-[11px]">
                      <div>
                        <span className="text-slate-500">To Broker Inbox: </span>
                        <strong className="text-emerald-400 font-mono">{disp.recipientEmail}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Message-ID: </span>
                        <span className="font-mono text-slate-300 truncate block max-w-[240px]">
                          {disp.messageId}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                      <span className="text-slate-500">Attached:</span>
                      {disp.attachments.map((att, i) => (
                        <span
                          key={i}
                          className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3 text-emerald-400" />
                          {att}
                        </span>
                      ))}
                    </div>

                    <div className="text-[10px] font-mono text-slate-500 border-t border-slate-900 pt-1.5">
                      SMTP Response: {disp.smtpResponse}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

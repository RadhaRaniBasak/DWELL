import React, { useState, useEffect } from "react";
import {
  Receipt,
  X,
  CheckCircle2,
  Building2,
  DollarSign,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { Claim, Load, AccountingSyncRecord } from "../types/dwell";

interface AccountingSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: Claim | null;
  load: Load | null;
  onSyncSuccess?: () => void;
}

export const AccountingSyncModal: React.FC<AccountingSyncModalProps> = ({
  isOpen,
  onClose,
  claim,
  load,
  onSyncSuccess,
}) => {
  const [platform, setPlatform] = useState<"quickbooks" | "xero">("quickbooks");
  const [glAccount, setGlAccount] = useState("4010 - Accessorial Detention Revenue");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<AccountingSyncRecord | null>(null);
  const [recentSyncs, setRecentSyncs] = useState<AccountingSyncRecord[]>([]);

  const fetchRecentSyncs = async () => {
    try {
      const res = await fetch("/api/accounting/syncs");
      if (res.ok) {
        const data = await res.json();
        setRecentSyncs(data);
      }
    } catch (err) {
      console.error("Failed to load syncs:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRecentSyncs();
      setSyncResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExecuteSync = async () => {
    if (!claim) return;
    setIsSyncing(true);
    try {
      const res = await fetch("/api/accounting/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: claim.id,
          platform,
          glAccount,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSyncResult(data.syncRecord);
        await fetchRecentSyncs();
        if (onSyncSuccess) onSyncSuccess();
      }
    } catch (err) {
      console.error("Sync to accounting failed:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const amountDollars = claim ? (claim.amountCents / 100).toFixed(2) : "0.00";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#080D18] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#0D1424]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lime-400 text-slate-950 flex items-center justify-center font-black">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-tight">
                Accounting & Ledger Integration
              </h2>
              <p className="text-xs text-slate-400">
                Direct API push to QuickBooks Online or Xero chart of accounts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPlatform("quickbooks")}
              className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                platform === "quickbooks"
                  ? "bg-lime-400/10 border-lime-400 text-white shadow-lg shadow-lime-500/10"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                <span className="font-bold text-xs uppercase tracking-wide">QuickBooks Online</span>
              </div>
              <span className="text-[10px] text-lime-400 font-mono">v3 REST API</span>
            </button>

            <button
              onClick={() => setPlatform("xero")}
              className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                platform === "xero"
                  ? "bg-lime-400/10 border-lime-400 text-white shadow-lg shadow-lime-500/10"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-sky-400"></span>
                <span className="font-bold text-xs uppercase tracking-wide">Xero Accounting</span>
              </div>
              <span className="text-[10px] text-sky-400 font-mono">Invoicing API</span>
            </button>
          </div>

          {claim ? (
            <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">Selected Detention Claim</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-lime-400/15 border border-lime-400/30 text-lime-400 uppercase">
                  {claim.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-white">{load?.brokerName || "C.H. Robinson Worldwide"}</div>
                  <div className="text-xs text-slate-400">Load #{load?.loadNumber || claim.loadId} • Invoice #{claim.id}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black font-mono text-lime-400">${amountDollars}</div>
                  <div className="text-[10px] text-slate-500">Certified Claim Balance</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950 text-slate-400 text-xs text-center">
              No claim selected. Pick a claim from the Claims or Disputes pipeline to sync.
            </div>
          )}

          {/* GL Account Mapping Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Target GL Chart of Accounts Mapping:
            </label>
            <select
              value={glAccount}
              onChange={(e) => setGlAccount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-lime-400"
            >
              <option value="4010 - Accessorial Detention Revenue">4010 - Accessorial Detention Revenue (Operating Income)</option>
              <option value="4020 - Layover & Driver Detention Surcharges">4020 - Layover & Driver Detention Surcharges</option>
              <option value="1200 - Accounts Receivable (A/R Uncollected)">1200 - Accounts Receivable (A/R Uncollected)</option>
              <option value="4050 - Linehaul Accessorial Miscellaneous">4050 - Linehaul Accessorial Miscellaneous</option>
            </select>
          </div>

          {syncResult && (
            <div className="p-4 rounded-xl bg-lime-400/15 border border-lime-400/40 text-xs text-lime-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-lime-400 text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Successfully Posted to {platform === "quickbooks" ? "QuickBooks Online" : "Xero"}!</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
                <div>Ledger Reference: <strong className="text-white">{syncResult.ledgerInvoiceId}</strong></div>
                <div>Amount Synced: <strong className="text-white">${(syncResult.amountCents / 100).toFixed(2)}</strong></div>
                <div>Account: <span className="text-white">{syncResult.glAccount}</span></div>
                <div>Status: <span className="text-lime-400 font-bold uppercase">{syncResult.status}</span></div>
              </div>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Recent Accounting Sync History
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {recentSyncs.length === 0 ? (
                <div className="text-slate-500 text-xs py-2">No prior ledger syncs found.</div>
              ) : (
                recentSyncs.map((s) => (
                  <div
                    key={s.id}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className="capitalize text-lime-400">{s.platform}</span>
                        <span>•</span>
                        <span>{s.ledgerInvoiceId}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{s.brokerName} ({s.loadNumber})</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-white">${(s.amountCents / 100).toFixed(2)}</div>
                      <div className="text-[10px] text-lime-400 font-bold uppercase">{s.status}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#0D1424] border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-lime-400" />
            <span>Encrypted OAuth 2.0 Ledger Gateway</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition-all"
            >
              Close
            </button>
            <button
              onClick={handleExecuteSync}
              disabled={isSyncing || !claim}
              className="px-5 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-lime-500/20 cursor-pointer transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Syncing to Ledger..." : "Sync Invoice to Ledger"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

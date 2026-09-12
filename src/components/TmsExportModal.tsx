import React, { useState, useEffect } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  X,
  CheckCircle2,
  Copy,
  Layers,
  ArrowDownToLine,
  Database,
} from "lucide-react";
import { ExportFormat } from "../types/dwell";
import { triggerHapticTap } from "../utils/audioAlerts";

interface TmsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TmsExportModal: React.FC<TmsExportModalProps> = ({ isOpen, onClose }) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("quickbooks_csv");
  const [previewContent, setPreviewContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchPreview = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/export/${selectedFormat}`);
        if (res.ok) {
          const text = await res.text();
          setPreviewContent(text);
        }
      } catch (err) {
        console.error("Failed to load export preview:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [isOpen, selectedFormat]);

  if (!isOpen) return null;

  const handleDownload = () => {
    triggerHapticTap();
    const blob = new Blob([previewContent], {
      type: selectedFormat === "edi_210" ? "text/plain" : "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      selectedFormat === "edi_210"
        ? `EDI210_Detention_Invoices_${Date.now()}.edi`
        : selectedFormat === "quickbooks_csv"
        ? `QuickBooks_Invoices_${Date.now()}.csv`
        : `Claims_Export_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    triggerHapticTap();
    navigator.clipboard.writeText(previewContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                TMS & Accounting Export Center
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  DIRECT SYNC
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Export filed detention claims directly into QuickBooks, EDI 210, or TMS spreadsheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm">
          {/* Format Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              onClick={() => {
                triggerHapticTap();
                setSelectedFormat("quickbooks_csv");
              }}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                selectedFormat === "quickbooks_csv"
                  ? "bg-emerald-500/10 border-emerald-500/60 text-emerald-200"
                  : "bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-white">QuickBooks CSV</span>
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Formatted with customer, invoice #, and Accessorial: Detention item lines.
              </p>
            </button>

            <button
              onClick={() => {
                triggerHapticTap();
                setSelectedFormat("edi_210");
              }}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                selectedFormat === "edi_210"
                  ? "bg-emerald-500/10 border-emerald-500/60 text-emerald-200"
                  : "bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-white">EDI 210 Invoice</span>
                <Layers className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                ANSI X12 210 Motor Carrier Freight Details for enterprise TMS platforms.
              </p>
            </button>

            <button
              onClick={() => {
                triggerHapticTap();
                setSelectedFormat("standard_csv");
              }}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                selectedFormat === "standard_csv"
                  ? "bg-emerald-500/10 border-emerald-500/60 text-emerald-200"
                  : "bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-white">Standard Claims CSV</span>
                <FileText className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Universal spreadsheet with complete audit timestamps, rates, and hours.
              </p>
            </button>
          </div>

          {/* Export Payload Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Generated Payload Preview ({selectedFormat.toUpperCase()}):
              </span>
              <button
                onClick={handleCopy}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? "Copied!" : "Copy Payload"}
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
              {loading ? "Generating export..." : previewContent}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-800/80 border-t border-slate-700 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            disabled={!previewContent || loading}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Download Export File
          </button>
        </div>
      </div>
    </div>
  );
};

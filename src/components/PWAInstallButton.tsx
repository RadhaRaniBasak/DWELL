import React, { useState } from "react";
import { Download, Smartphone, Share, PlusSquare, CheckCircle2, X } from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // If already running as installed standalone app, do not show prompt
  if (isInstalled) {
    return (
      <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
        <CheckCircle2 className="w-3 h-3" /> PWA Active
      </span>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-95 transition-all shadow-sm ${className}`}
        title="Install Dwell to your device for offline & quick cab dock access"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  return (
    <>
      <button
        onClick={() => setShowIOSModal(true)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white transition-all active:scale-95 ${className}`}
        title="Add Dwell to iPhone/iPad or Android Home Screen"
      >
        <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
        <span className="hidden sm:inline">Install on Mobile</span>
        <span className="sm:hidden">Install</span>
      </button>

      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 relative">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-slate-950 border border-emerald-500/40 flex items-center justify-center shadow-inner">
                <Smartphone className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Install Dwell on Mobile</h3>
                <p className="text-xs text-slate-400">Add to Home Screen for native cab-mount app experience</p>
              </div>
            </div>

            <div className="space-y-3 my-4 text-xs bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div>
                  <span className="font-semibold text-slate-200">In Apple Safari (iOS):</span>
                  <p className="text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    Tap the <Share className="w-3.5 h-3.5 text-blue-400 inline" /> <strong className="text-slate-200">Share</strong> icon in the bottom Safari toolbar.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div>
                  <span className="font-semibold text-slate-200">Add to Home Screen:</span>
                  <p className="text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    Scroll down the sheet and tap <PlusSquare className="w-3.5 h-3.5 text-slate-200 inline" /> <strong className="text-slate-200">"Add to Home Screen"</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </div>
                <div>
                  <span className="font-semibold text-slate-200">Chrome (Android):</span>
                  <p className="text-slate-400 mt-0.5">
                    Tap the three dots menu (top-right) &rarr; select <strong className="text-slate-200">"Install App"</strong> or <strong className="text-slate-200">"Add to Home screen"</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 mb-4 bg-emerald-950/30 border border-emerald-900/50 p-2.5 rounded-lg flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span>Enables fullscreen cab view, offline storage, and instant dock telematics.</span>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

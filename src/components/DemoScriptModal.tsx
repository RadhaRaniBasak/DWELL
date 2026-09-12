import React, { useState } from "react";
import { Play, ArrowRight, CheckCircle2, Truck, FileText, ShieldAlert, BarChart3, Clock, Sparkles, Scale, FileSignature, Database, Mic } from "lucide-react";
import { NavTabType } from "./Header";

interface DemoScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: NavTabType) => void;
  onTriggerExpiredState: () => void;
  onTriggerDeparture: () => void;
  onResetToBeat1: () => void;
  onTrigger10HourLayoverState?: () => void;
}

export const DemoScriptModal: React.FC<DemoScriptModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onTriggerExpiredState,
  onTriggerDeparture,
  onResetToBeat1,
  onTrigger10HourLayoverState,
}) => {
  const [currentBeat, setCurrentBeat] = useState<number>(1);

  if (!isOpen) return null;

  const beats = [
    {
      beat: 1,
      title: "Beat 1 (0:00–0:15): The $1.1B Problem",
      subtitle: "The thesis & the pain carriers suffer daily",
      spokenScript:
        "Truck drivers lose $1.1B a year sitting at docks. Brokers will pay detention — $50 an hour after two hours free — but only if you file before their notice window closes, which can be as short as 24 hours or even 2 hours. Today, carriers leave 80% of it on the table because the driver forgets, the paperwork gets lost, or the rate con had an accessorial clause nobody caught.",
      actionLabel: "View Rate Con Parser",
      action: () => onNavigateTab("rate_con"),
    },
    {
      beat: 2,
      title: "Beat 2 (0:15–0:35): The Rate Con & The Clause",
      subtitle: "Prompt A extracts terms. Notice: Starts at Appt, NOT Arrival!",
      spokenScript:
        "Here's a standard C.H. Robinson rate confirmation. We drop it into Dwell. Watch what it pulls out: 2 hours free, $50 an hour, notice within 30 minutes of free time expiring. But look at this clause: free time starts from scheduled appointment, not arrival. Our driver arrived 45 minutes early. A naive clock would start ticking immediately and lose the claim. Dwell caught the clause.",
      actionLabel: "Go to Driver Cab Screen",
      action: () => onNavigateTab("driver"),
    },
    {
      beat: 3,
      title: "Beat 3 (0:35–0:55): The Cab & The Emotional Beat",
      subtitle: "Free time expires: Screen goes LOUD RED, dollars climb live",
      spokenScript:
        "Switch to the driver's phone. Truck is at the dock in Bentonville. Free time is running down. Watch what happens when it expires. [Trigger: Screen turns RED, numbers climb: +$100.00 ACCRUED!] The driver doesn't have to remember to text dispatch. Dwell's already notified the broker per the contract's notice clause.",
      actionLabel: "Trigger Red Expired State Now",
      action: () => {
        onNavigateTab("driver");
        onTriggerExpiredState();
      },
    },
    {
      beat: 4,
      title: "Beat 4 (0:55–1:15): The Automated Claim",
      subtitle: "Truck departs, claim letter assembled with exact math and attached BOL",
      spokenScript:
        "Truck departs. Look at what Dwell just assembled: an exact detention calculation — pure deterministic math — a markdown claim letter citing the exact rate con clause, the GPS arrival timestamp, the stamped BOL the driver snapped in the cab, and a countdown: 23 hours 41 minutes until the filing window closes. One tap to file.",
      actionLabel: "Simulate Departure & Open Pipeline",
      action: () => {
        onTriggerDeparture();
        onNavigateTab("dispatcher_claims");
      },
    },
    {
      beat: 5,
      title: "Beat 5 (1:15–1:30): The Moat & Intelligence",
      subtitle: "Facility risk analytics: 78% overage rate at Walmart DC #6094",
      spokenScript:
        "And every time Dwell watches a stop, the carrier gets smarter. Walmart DC #6094 in Bentonville has a 78% overage rate across our 9 recorded stops, with a median dwell of 4h 05m. A dispatcher seeing this facility on a load knows before booking whether the rate confirmation's $50/hr detention rate is adequate.\n\nThe LLM reads contracts. Code does arithmetic. Dwell gets carriers paid.",
      actionLabel: "Open Facility Risk Table",
      action: () => onNavigateTab("dispatcher_facilities"),
    },
    {
      beat: 6,
      title: "Beat 6: 10+ Hour Dwell & Layover Conversion",
      subtitle: "Detects >10h dwell & upgrades invoice to flat $500/day",
      spokenScript:
        "When dock detention exceeds 10 hours, the driver's 14-hour on-duty clock is exhausted, mandating a 10-hour sleeper berth reset under FMCSA 49 CFR § 395.3. Dwell automatically detects this critical dwell breach and triggers the 'Convert to Layover Claim' prompt, upgrading the invoice from hourly detention to a flat $500/day contractual layover demand.",
      actionLabel: "Simulate 10.5h Dwell (Trigger Layover Prompt)",
      action: () => {
        onNavigateTab("driver");
        if (onTrigger10HourLayoverState) {
          onTrigger10HourLayoverState();
        }
      },
    },
  ];

  const current = beats[currentBeat - 1];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl text-white shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-xs">
              90s
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Dwell Demo Director</h2>
              <p className="text-[11px] text-slate-400">Step-by-step cue cards for the 90-second pitch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold p-1"
          >
            ✕
          </button>
        </div>

        {/* Step indicator dots */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-2 justify-center gap-2">
          {beats.map((b) => (
            <button
              key={b.beat}
              onClick={() => setCurrentBeat(b.beat)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                currentBeat === b.beat
                  ? "bg-indigo-600 text-white shadow-sm scale-105"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Beat {b.beat}
            </button>
          ))}
        </div>

        {/* Script Content */}
        <div className="p-6 space-y-4">
          <div>
            <span className="text-xs font-bold uppercase text-indigo-400 tracking-wider">
              {current.subtitle}
            </span>
            <h3 className="text-lg font-extrabold text-white mt-0.5">{current.title}</h3>
          </div>

          {/* Teleprompter Box */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-sans text-sm text-slate-200 leading-relaxed italic border-l-4 border-l-indigo-500">
            "{current.spokenScript}"
          </div>

          {/* Action Trigger Button */}
          <div className="pt-2">
            <button
              onClick={() => {
                current.action();
                onClose();
              }}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-transform active:scale-98"
            >
              <Sparkles className="w-4 h-4" />
              <span>{current.actionLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            onClick={() => setCurrentBeat((p) => Math.max(1, p - 1))}
            disabled={currentBeat === 1}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-300"
          >
            ← Previous Beat
          </button>

          <span className="text-xs font-mono text-slate-400">
            {currentBeat} of {beats.length}
          </span>

          <button
            onClick={() => setCurrentBeat((p) => Math.min(beats.length, p + 1))}
            disabled={currentBeat === beats.length}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-300"
          >
            Next Beat →
          </button>
        </div>
      </div>
    </div>
  );
};

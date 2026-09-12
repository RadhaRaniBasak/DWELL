import React, { useState, useEffect } from "react";
import {
  FileSignature,
  Download,
  Copy,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  DollarSign,
  Clock,
  Building2,
  FileText,
  AlertCircle,
} from "lucide-react";
import { CarrierAddendumTerms } from "../types/dwell";
import { triggerHapticTap } from "../utils/audioAlerts";

export const CarrierAddendumGeneratorView: React.FC = () => {
  const [carrierName, setCarrierName] = useState("Ironclad Freightways LLC");
  const [mcNumber, setMcNumber] = useState("MC-1049281");
  const [dotNumber, setDotNumber] = useState("USDOT 3481029");
  const [brokerName, setBrokerName] = useState("C.H. Robinson Worldwide");
  const [loadNumber, setLoadNumber] = useState("CHR-90821-X");
  const [linehaulRate, setLinehaulRate] = useState(2850);
  const [freeTimeHours, setFreeTimeHours] = useState(1);
  const [detentionRate, setDetentionRate] = useState(85);
  const [billingIncrement, setBillingIncrement] = useState(15);
  const [layoverRate, setLayoverRate] = useState(450);
  const [tonuFee, setTonuFee] = useState(300);
  const [authorizedContact, setAuthorizedContact] = useState("Operations Dispatcher #4");

  const [copied, setCopied] = useState(false);

  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handlePrint = () => {
    triggerHapticTap();
    window.print();
  };

  const handleCopy = () => {
    triggerHapticTap();
    const text = document.getElementById("addendum-document")?.innerText || "";
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <FileSignature className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Rate Confirmation Counter-Offer & Addendum Generator
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Generate legally binding Carrier Protective Addendums replacing predatory 2-hour free time clauses
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Copy className="w-4 h-4 text-cyan-400" />
            {copied ? "Copied!" : "Copy Text"}
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-600/20 active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Controls & Custom Clause Enforcer */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Contract Parameters & Negotiation Terms
            </h2>

            {/* Quick Defaults info */}
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Standard broker contracts impose 2 hours of unpaid free time and $40/hr detention. This addendum asserts carrier rights before dispatch.
              </span>
            </div>

            {/* Carrier & Broker info */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Carrier Legal Name</label>
                <input
                  type="text"
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">MC Number</label>
                  <input
                    type="text"
                    value={mcNumber}
                    onChange={(e) => setMcNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">USDOT Number</label>
                  <input
                    type="text"
                    value={dotNumber}
                    onChange={(e) => setDotNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Broker Name</label>
                  <input
                    type="text"
                    value={brokerName}
                    onChange={(e) => setBrokerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Load / Ref #</label>
                  <input
                    type="text"
                    value={loadNumber}
                    onChange={(e) => setLoadNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Protective Term Sliders */}
            <div className="pt-3 border-t border-slate-800 space-y-4 text-xs">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-slate-300">Demanded Free Time:</span>
                  <span className="text-cyan-400 font-mono font-bold">
                    {freeTimeHours} Hour{freeTimeHours > 1 ? "s" : ""} (Standard Broker: 2h)
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.5"
                  value={freeTimeHours}
                  onChange={(e) => setFreeTimeHours(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-slate-300">Detention Hourly Rate:</span>
                  <span className="text-cyan-400 font-mono font-bold">
                    ${detentionRate}.00 / Hour
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="125"
                  step="5"
                  value={detentionRate}
                  onChange={(e) => setDetentionRate(parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-slate-300">Billing Increment:</span>
                  <span className="text-cyan-400 font-mono font-bold">
                    {billingIncrement} Minutes (${(detentionRate / (60 / billingIncrement)).toFixed(2)}/inc)
                  </span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="60"
                  step="15"
                  value={billingIncrement}
                  onChange={(e) => setBillingIncrement(parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Layover Rate</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500">$</span>
                    <input
                      type="number"
                      value={layoverRate}
                      onChange={(e) => setLayoverRate(parseInt(e.target.value, 10) || 450)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">TONU Fee</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500">$</span>
                    <input
                      type="number"
                      value={tonuFee}
                      onChange={(e) => setTonuFee(parseInt(e.target.value, 10) || 300)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Certified 1-Page Addendum Document Preview */}
        <div className="lg:col-span-7">
          <div
            id="addendum-document"
            className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-200 print:border-none print:shadow-none print:p-0 space-y-5 text-xs sm:text-sm font-serif leading-relaxed"
          >
            {/* Document Header */}
            <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-sans tracking-widest text-slate-600 font-bold block">
                  Mandatory Legal Contract Rider
                </span>
                <h2 className="text-lg sm:text-xl font-bold font-sans tracking-tight text-slate-950">
                  CARRIER DETENTION & ACCESSORIAL ADDENDUM
                </h2>
                <p className="text-xs text-slate-700 italic mt-0.5">
                  Protective Rider to Broker Rate Confirmation
                </p>
              </div>

              <div className="text-right text-xs font-sans">
                <span className="block font-bold text-slate-900">DATE: {dateStr}</span>
                <span className="block font-mono text-slate-700">LOAD REF: {loadNumber}</span>
              </div>
            </div>

            {/* Contracting Parties */}
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs font-sans grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Carrier</span>
                <strong className="text-slate-950">{carrierName}</strong>
                <span className="block text-slate-600 font-mono">{mcNumber} • {dotNumber}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Broker</span>
                <strong className="text-slate-950">{brokerName}</strong>
                <span className="block text-slate-600 font-mono">Governed Load: {loadNumber}</span>
              </div>
            </div>

            {/* Legal Addendum Clauses */}
            <div className="space-y-3.5 text-slate-800 text-justify">
              <p>
                <strong>PREAMBLE:</strong> This Carrier Protective Addendum is incorporated into and expressly supersedes any contrary or conflicting terms in Broker’s Rate Confirmation or Master Services Agreement for Load #{loadNumber}. Acceptance of carrier’s tender or commencement of transit constitutes full broker assent.
              </p>

              <div>
                <strong>1. FREE TIME ALLOTMENT:</strong> Carrier shall be granted exactly <strong>{freeTimeHours} hour{freeTimeHours > 1 ? "s" : ""} (60 minutes)</strong> of total free time for loading and <strong>{freeTimeHours} hour{freeTimeHours > 1 ? "s" : ""}</strong> for unloading. Free time calculation commences strictly from the earlier of: (a) confirmed physical gate check-in, or (b) scheduled appointment window.
              </div>

              <div>
                <strong>2. DETENTION RATE & INCREMENTS:</strong> Detention shall accrue at <strong>${detentionRate}.00 per hour</strong>, computed and rounded in <strong>{billingIncrement}-minute increments</strong> (${(detentionRate / (60 / billingIncrement)).toFixed(2)} per increment fraction).
              </div>

              <div>
                <strong>3. HOURS OF SERVICE (HOS) & LAYOVER CONVERSION:</strong> Under FMCSA 49 CFR § 395, should facility delay reduce driver available duty time such that driver cannot legally reach a designated safe haven parking location prior to 14-hour clock exhaustion, the detention shall automatically convert to a full <strong>Layover Claim of ${layoverRate}.00</strong> in lieu of standard hourly detention.
              </div>

              <div>
                <strong>4. TRUCK ORDER NOT USED (TONU):</strong> In the event of load cancellation or carrier rejection without fault within four (4) hours of scheduled arrival, a fee of <strong>${tonuFee}.00</strong> shall be paid immediately.
              </div>

              <div>
                <strong>5. BROKER INDEPENDENT PRIVITY:</strong> Pursuant to 49 U.S.C. § 14101, Broker is directly, primarily, and unconditionally liable for all accrued accessorial charges. Payment is strictly non-contingent upon Broker’s collection from shipper or receiver.
              </div>

              <div>
                <strong>6. CONFLICT OF TERMS:</strong> In the event of any discrepancy or conflict between this Addendum and Broker’s standard boilerplate agreement, <strong>the terms of this Carrier Addendum shall strictly prevail</strong>.
              </div>
            </div>

            {/* Signature Block */}
            <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-2 gap-6 font-sans text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  AUTHORIZED CARRIER REPRESENTATIVE
                </span>
                <div className="h-10 border-b border-slate-400 font-serif italic flex items-end pb-1 text-slate-900 text-sm">
                  {authorizedContact}
                </div>
                <span className="block text-[11px] text-slate-600 mt-1">
                  {carrierName} (Electronic Execution)
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  BROKER ACKNOWLEDGMENT & ACCEPTANCE
                </span>
                <div className="h-10 border-b border-slate-400 flex items-end pb-1 text-slate-500 text-[11px]">
                  [Dispatched with tender acceptance]
                </div>
                <span className="block text-[11px] text-slate-600 mt-1">
                  {brokerName}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

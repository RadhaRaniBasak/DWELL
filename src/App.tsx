import React, { useState, useEffect, useCallback } from "react";
import { Header, NavTabType } from "./components/Header";
import { DriverView } from "./components/DriverView";
import { DispatcherActiveLoads } from "./components/DispatcherActiveLoads";
import { DispatcherClaimsPipeline } from "./components/DispatcherClaimsPipeline";
import { DispatcherFacilityRisk } from "./components/DispatcherFacilityRisk";
import { FacilityRateIntelligenceView } from "./components/FacilityRateIntelligenceView";
import { EldTelematicsHub } from "./components/EldTelematicsHub";
import { RateConUploader } from "./components/RateConUploader";
import { DisputeResolutionAndArView } from "./components/DisputeResolutionAndArView";
import { CarrierAddendumGeneratorView } from "./components/CarrierAddendumGeneratorView";
import { BrokerScorecardsView } from "./components/BrokerScorecardsView";
import { EvaluationHarnessModal } from "./components/EvaluationHarnessModal";
import { DemoScriptModal } from "./components/DemoScriptModal";
import { LayoverConversionPromptModal } from "./components/LayoverConversionPromptModal";
import { DriverSmsCheckInHub } from "./components/DriverSmsCheckInHub";
import { PreBookingRiskScorecard } from "./components/PreBookingRiskScorecard";
import { AccountingSyncModal } from "./components/AccountingSyncModal";
import { LayoverRescheduleOptimizerModal } from "./components/LayoverRescheduleOptimizerModal";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { Load, Stop, Facility, Claim, DetentionTerms } from "./types/dwell";
import { BedDouble, ArrowRight, AlertTriangle, Sparkles, Receipt, ShieldAlert } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTabType>("driver");

  const [loads, setLoads] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [activeLoad, setActiveLoad] = useState<any | null>(null);
  const [activeStop, setActiveStop] = useState<Stop | null>(null);
  const [clockData, setClockData] = useState<any | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const [isLayoverPromptOpen, setIsLayoverPromptOpen] = useState(false);
  const [isConvertingLayover, setIsConvertingLayover] = useState(false);
  const [convertedStopIds, setConvertedStopIds] = useState<Set<string>>(new Set());
  const [dismissedStopIds, setDismissedStopIds] = useState<Set<string>>(new Set());
  const [detectedDwellMinutes, setDetectedDwellMinutes] = useState<number>(0);

  const [isAccountingSyncOpen, setIsAccountingSyncOpen] = useState(false);
  const [selectedSyncClaim, setSelectedSyncClaim] = useState<Claim | null>(null);
  const [isLayoverOptimizerOpen, setIsLayoverOptimizerOpen] = useState(false);

  const [isDemoGuideOpen, setIsDemoGuideOpen] = useState(false);
  const [isEvalHarnessOpen, setIsEvalHarnessOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "info" | "warning" } | null>(null);

  const showToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchAllData = useCallback(async () => {
    try {
      const [loadsRes, claimsRes, facsRes] = await Promise.all([
        fetch("/api/loads"),
        fetch("/api/claims"),
        fetch("/api/facilities/risk-table"),
      ]);

      const loadsData = await loadsRes.json();
      const claimsData = await claimsRes.json();
      const facsData = await facsRes.json();

      setLoads(loadsData);
      setClaims(claimsData);
      setFacilities(facsData);

      if (loadsData.length > 0) {
        const found = loadsData.find((l: any) => l.id === "load-chr-001") || loadsData[0];
        setActiveLoad(found);
        const stp = found.stops?.find((s: Stop) => s.id === "stop-chr-delivery") || found.stops?.[0];
        setActiveStop(stp || null);
      }
    } catch (err) {
      console.error("Failed to load initial data:", err);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const fetchClock = useCallback(async () => {
    if (!activeStop) return;
    try {
      const res = await fetch(`/api/stops/${activeStop.id}/clock`);
      if (res.ok) {
        const data = await res.json();
        setClockData(data);
      }
    } catch (err) {
      console.error("Failed to poll clock:", err);
    }
  }, [activeStop]);

  useEffect(() => {
    fetchClock();
    const interval = setInterval(fetchClock, 2500);
    return () => clearInterval(interval);
  }, [fetchClock]);

  useEffect(() => {
    if (!activeStop) return;

    const arrivalIso = clockData?.arrivedAt || activeStop.arrivedAt;
    if (!arrivalIso) return;

    const arrivalTime = new Date(arrivalIso).getTime();
    const departureTime = (clockData?.departedAt || activeStop.departedAt)
      ? new Date(clockData?.departedAt || activeStop.departedAt).getTime()
      : Date.now();

    const dwellMins = Math.max(0, Math.floor((departureTime - arrivalTime) / (60 * 1000)));

    // Detect if incident exceeds 10 hours (600 minutes total dwell or 480+ min billable detention)
    const exceeds10Hours = dwellMins >= 600 || (clockData?.detentionMinutes && clockData.detentionMinutes >= 480);

    if (exceeds10Hours) {
      const calcDwell = dwellMins >= 600 ? dwellMins : (clockData?.detentionMinutes || 480) + 120;
      setDetectedDwellMinutes(calcDwell);

      // Check if target claim is already converted to Layover ($500/day, daily billing increment)
      const targetClaim = claims.find((c) => c.stopId === activeStop.id || c.id === `claim-${activeStop.id}`);
      const isAlreadyConverted =
        convertedStopIds.has(activeStop.id) ||
        (targetClaim && targetClaim.amountCents === 50000 && targetClaim.computation?.billingIncrement === "daily");

      if (isAlreadyConverted && !convertedStopIds.has(activeStop.id)) {
        setConvertedStopIds((prev) => new Set([...prev, activeStop.id]));
      }

      // Automatically trigger the 'Convert to Layover Claim' prompt if not yet converted and not dismissed
      if (!isAlreadyConverted && !dismissedStopIds.has(activeStop.id)) {
        setIsLayoverPromptOpen(true);
      }
    } else {
      setDetectedDwellMinutes(0);
    }
  }, [clockData, activeStop, claims, dismissedStopIds, convertedStopIds]);

  // Convert detention incident to Layover Claim ($500/day)
  const handleConvertToLayover = async (customClaimOrStopId?: string) => {
    const targetStopId = customClaimOrStopId
      ? customClaimOrStopId.replace(/^claim-/, "")
      : activeStop?.id;
    if (!targetStopId) return;

    setIsConvertingLayover(true);
    try {
      const res = await fetch(`/api/claims/claim-${targetStopId}/escalate-layover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: 50000 }), // Adjusts billing rate to flat $500/day
      });

      if (res.ok) {
        setConvertedStopIds((prev) => new Set([...prev, targetStopId]));
        showToast("Converted to Layover Claim: upgraded to flat $500/day invoice!", "success");
        await fetchClock();
        await fetchAllData();
      } else {
        showToast("Layover conversion failed — please retry", "warning");
      }
    } catch (err) {
      console.error("Failed to convert to layover:", err);
      showToast("Layover conversion error", "warning");
    } finally {
      setIsConvertingLayover(false);
    }
  };

  // Fast-forward / simulate 10.5h dwell to test trigger
  const handleSimulate10HourDwell = async () => {
    if (!activeStop) return;
    const past10Hours = new Date(Date.now() - 630 * 60 * 1000).toISOString();
    setDismissedStopIds((prev) => {
      const next = new Set(prev);
      next.delete(activeStop.id);
      return next;
    });
    setConvertedStopIds((prev) => {
      const next = new Set(prev);
      next.delete(activeStop.id);
      return next;
    });
    await handleArrive("manual", past10Hours);
    showToast("Simulated 10.5-hour dwell (630 min) — triggering Layover conversion prompt!", "info");
  };

  // Handle Arrive
  const handleArrive = async (source: "manual" | "geofence" = "manual", customTime?: string) => {
    if (!activeStop) return;
    try {
      const res = await fetch(`/api/stops/${activeStop.id}/arrive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ at: customTime, source }),
      });
      if (res.ok) {
        showToast("Arrival confirmed & logged in audit trail", "success");
        await fetchClock();
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Depart
  const handleDepart = async (source: "manual" | "geofence" = "manual", customTime?: string) => {
    if (!activeStop) return;
    try {
      const res = await fetch(`/api/stops/${activeStop.id}/depart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ at: customTime, source }),
      });
      if (res.ok) {
        showToast("Departure verified — Final claim letter assembled!", "success");
        await fetchClock();
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Upload Evidence (Photo / BOL / Stamp)
  const handleUploadEvidence = async (type: string, label: string, notes?: string) => {
    if (!activeStop) return;
    try {
      const res = await fetch(`/api/stops/${activeStop.id}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, label, notes }),
      });
      if (res.ok) {
        showToast(`Proof captured: ${label}`, "success");
        await fetchClock();
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Simulate GPS Geofence Fix
  const handleSimulateGpsFix = async (isInside: boolean) => {
    if (!activeStop) return;
    const targetLat = activeStop.lat || 36.3621;
    const targetLng = activeStop.lng || -94.2052;
    // Inside: 50 meters away; Outside: 2000 meters away
    const lat = isInside ? targetLat + 0.0002 : targetLat + 0.05;
    const lng = isInside ? targetLng + 0.0002 : targetLng + 0.05;

    try {
      const res = await fetch(`/api/stops/${activeStop.id}/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, accuracyMeters: 12 }),
      });
      if (res.ok) {
        showToast(
          isInside ? "GPS fix registered inside 250m dock geofence" : "GPS fix registered outside facility",
          "info"
        );
        await fetchClock();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendClaim = async (claimId: string, email?: string) => {
    try {
      const res = await fetch(`/api/claims/${claimId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message, "success");
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegenerateLetter = async (claimId: string) => {
    try {
      const res = await fetch(`/api/claims/${claimId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        showToast("Claim letter re-formatted with verbatim citations", "success");
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadOrSelect = async (text: string, fixtureId?: string) => {
    try {
      const res = await fetch("/api/rate-confirmations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, fixtureId }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Rate con parsed: Load #${data.load.loadNumber}`, "success");
        setActiveLoad(data.load);
        const dStop = data.stops.find((s: Stop) => s.type === "delivery") || data.stops[0];
        setActiveStop(dStop);
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTerms = async (loadId: string, updatedTerms: Partial<DetentionTerms>) => {
    try {
      const res = await fetch(`/api/loads/${loadId}/terms`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updatedTerms }),
      });
      if (res.ok) {
        showToast("Contract terms updated & stop clocks recomputed!", "success");
        await fetchAllData();
        await fetchClock();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetDemo = async () => {
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (res.ok) {
        showToast("Demo environment reset to initial state", "info");
        await fetchAllData();
        setActiveTab("driver");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const atRiskCount = claims.filter((c) => c.status === "at_risk").length;

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col font-sans selection:bg-lime-400 selection:text-slate-950">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenDemoGuide={() => setIsDemoGuideOpen(true)}
        onOpenEvalHarness={() => setIsEvalHarnessOpen(true)}
        onResetDemo={handleResetDemo}
        atRiskCount={atRiskCount}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
      />

      <OfflineIndicator />

      {/* 10-Hour Dwell Detection Alert Banner */}
      {detectedDwellMinutes >= 600 && (
        <div
          id="banner-10h-dwell-detected"
          className="bg-gradient-to-r from-rose-950 via-rose-900 to-amber-950 border-b border-rose-500/50 px-4 py-2 text-xs text-rose-100 flex items-center justify-between gap-3 shadow-md"
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-1 rounded bg-rose-500 text-slate-950 font-black">
              <BedDouble className="w-4 h-4" />
            </span>
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              10+ Hour Dwell Detected ({Math.floor(detectedDwellMinutes / 60)}h {detectedDwellMinutes % 60}m):
            </span>
            <span>
              {convertedStopIds.has(activeStop?.id || "") ? (
                <strong className="text-emerald-400">Upgraded to Flat $500/day Layover Claim.</strong>
              ) : (
                <span className="text-rose-200">
                  Driver's 14-hour clock is exhausted. FMCSA § 395.3 mandates a 10-hour reset.
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                const targetClaim = claims[0] || null;
                setSelectedSyncClaim(targetClaim);
                setIsAccountingSyncOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-lime-400 border border-lime-400/40 font-bold transition text-xs flex items-center gap-1 cursor-pointer"
              title="Sync to QuickBooks or Xero Ledger"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Ledger Sync</span>
            </button>

            {convertedStopIds.has(activeStop?.id || "") ? (
              <button
                onClick={() => setActiveTab("dispatcher_claims")}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition text-xs flex items-center gap-1"
              >
                <span>View Layover Invoice</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  id="btn-open-layover-prompt"
                  onClick={() => setIsLayoverPromptOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black transition text-xs shadow flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>$500 Layover</span>
                </button>
                <button
                  onClick={() => setIsLayoverOptimizerOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-black transition text-xs shadow animate-pulse flex items-center gap-1 cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>$1,300 HOS Optimizer</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Floating Toast Notification */}
      {notification && (
        <div className="fixed bottom-20 md:bottom-5 right-5 z-50 animate-bounce">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold border flex items-center gap-2 ${
              notification.type === "success"
                ? "bg-emerald-500 text-slate-950 border-emerald-400"
                : notification.type === "warning"
                ? "bg-amber-500 text-slate-950 border-amber-400"
                : "bg-blue-600 text-white border-blue-400"
            }`}
          >
            <span>{notification.message}</span>
          </div>
        </div>
      )}
      {/* Main View Area with Mobile Bottom Nav Padding */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 pb-28 md:pb-8">
        {activeTab === "driver" && (
          <DriverView
            activeStop={activeStop}
            loadNumber={activeLoad?.loadNumber || "CHR-882941"}
            brokerName={activeLoad?.brokerName || "C.H. Robinson Worldwide"}
            clockData={clockData}
            onArrive={handleArrive}
            onDepart={handleDepart}
            onUploadEvidence={handleUploadEvidence}
            onSimulateGpsFix={handleSimulateGpsFix}
            onRefreshClock={fetchClock}
            onViewClaim={() => setActiveTab("dispatcher_claims")}
            soundEnabled={soundEnabled}
          />
        )}

        {activeTab === "driver_sms" && (
          <DriverSmsCheckInHub
            activeStop={activeStop}
            onEvidenceAdded={fetchAllData}
          />
        )}

        {activeTab === "prebooking_risk" && (
          <PreBookingRiskScorecard facilities={facilities} />
        )}

        {activeTab === "dispatcher_loads" && (
          <DispatcherActiveLoads
            loads={loads}
            onSelectLoad={(l) => {
              setActiveLoad(l);
              const stp = l.stops?.[0];
              if (stp) setActiveStop(stp);
            }}
            onViewDriverCab={(l) => {
              setActiveLoad(l);
              const stp = l.stops?.find((s: Stop) => !s.departedAt) || l.stops?.[0];
              if (stp) setActiveStop(stp);
              setActiveTab("driver");
            }}
            onInspectTerms={(l) => {
              setActiveLoad(l);
              setActiveTab("rate_con");
            }}
          />
        )}

        {activeTab === "dispatcher_claims" && (
          <DispatcherClaimsPipeline
            claims={claims}
            onSendClaim={handleSendClaim}
            onRegenerateLetter={handleRegenerateLetter}
            onConvertToLayover={handleConvertToLayover}
          />
        )}

        {activeTab === "disputes_ar" && (
          <DisputeResolutionAndArView />
        )}

        {activeTab === "addendum_generator" && (
          <CarrierAddendumGeneratorView />
        )}

        {activeTab === "broker_scorecards" && (
          <BrokerScorecardsView />
        )}

        {activeTab === "dispatcher_facilities" && (
          <DispatcherFacilityRisk facilities={facilities} />
        )}

        {activeTab === "rate_intelligence" && (
          <FacilityRateIntelligenceView />
        )}

        {activeTab === "telematics" && (
          <EldTelematicsHub
            activeStop={activeStop}
            onRefreshClock={fetchClock}
          />
        )}

        {activeTab === "rate_con" && (
          <RateConUploader
            currentLoad={activeLoad}
            onUploadOrSelect={handleUploadOrSelect}
            onUpdateTerms={handleUpdateTerms}
          />
        )}
      </main>
      {/* Modals */}
      <LayoverConversionPromptModal
        isOpen={isLayoverPromptOpen}
        onClose={() => {
          if (activeStop) {
            setDismissedStopIds((prev) => new Set([...prev, activeStop.id]));
          }
          setIsLayoverPromptOpen(false);
        }}
        onConvert={async () => {
          await handleConvertToLayover();
        }}
        isConverting={isConvertingLayover}
        isConverted={Boolean(activeStop && convertedStopIds.has(activeStop.id))}
        dwellMinutes={detectedDwellMinutes || 630}
        stopName={activeStop?.facilityName || "Walmart DC #6094"}
        loadNumber={activeLoad?.loadNumber || "CHR-882941"}
        brokerName={activeLoad?.brokerName || "C.H. Robinson Worldwide"}
        onViewClaimsPipeline={() => {
          setIsLayoverPromptOpen(false);
          setActiveTab("dispatcher_claims");
        }}
      />

      <EvaluationHarnessModal
        isOpen={isEvalHarnessOpen}
        onClose={() => setIsEvalHarnessOpen(false)}
      />

      <DemoScriptModal
        isOpen={isDemoGuideOpen}
        onClose={() => setIsDemoGuideOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onTriggerExpiredState={async () => {
          // Fast-forward stop to 135 minutes ago so free time has expired and clock is in LOUD RED state!
          if (activeStop) {
            const pastArrival = new Date(Date.now() - 135 * 60 * 1000).toISOString();
            await handleArrive("manual", pastArrival);
          }
        }}
        onTriggerDeparture={async () => {
          if (activeStop) {
            await handleDepart("manual");
          }
        }}
        onResetToBeat1={handleResetDemo}
        onTrigger10HourLayoverState={handleSimulate10HourDwell}
      />

      <AccountingSyncModal
        isOpen={isAccountingSyncOpen}
        onClose={() => setIsAccountingSyncOpen(false)}
        claim={selectedSyncClaim || claims[0] || null}
        load={activeLoad}
        onSyncSuccess={() => {
          showToast("Accessorial invoice posted to accounting ledger!", "success");
          fetchAllData();
        }}
      />

      <LayoverRescheduleOptimizerModal
        isOpen={isLayoverOptimizerOpen}
        onClose={() => setIsLayoverOptimizerOpen(false)}
        claim={claims[0] || null}
        load={activeLoad}
        stop={activeStop}
        onEscalated={() => {
          showToast("Escalated to $1,300 FMCSA Part 395 Layover Claim!", "success");
          fetchAllData();
        }}
      />

      {/* Mobile Persistent Bottom App Bar for Android & iOS */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        atRiskCount={atRiskCount}
      />
    </div>
  );
}

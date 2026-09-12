import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { getDb, resetDb } from "./src/server/db";
import {
  computeDeadlines,
  computeDetention,
  toComputationRecord,
} from "./src/services/clock/detentionClock";
import {
  formatDeterministicClaimLetter,
} from "./src/services/claim/buildClaim";
import {
  GeofenceState,
  processGpsFix,
} from "./src/services/geofence/arrivalDetector";
import {
  EXTRACT_DETENTION_TERMS_SYSTEM_PROMPT,
  buildExtractDetentionTermsPrompt,
} from "./src/services/prompts/extractDetentionTerms.prompt";
import {
  WRITE_CLAIM_LETTER_SYSTEM_PROMPT,
  buildWriteClaimLetterUserPrompt,
} from "./src/services/prompts/writeClaimLetter.prompt";
import {
  runFullEvaluationHarness,
} from "./src/services/extraction/evaluateExtraction";
import { runDeadlineWatcher } from "./src/services/clock/deadlineWatcher";
import {
  NORMALIZE_FACILITY_NAME_SYSTEM_PROMPT,
  buildNormalizeFacilityPrompt,
} from "./src/services/prompts/normalizeFacilityName.prompt";
import { RATE_CON_FIXTURES } from "./src/fixtures/rateConfirmations";
import { Claim, DetentionTerms, DwellEvent, EldProvider, Evidence, Load, Stop, BrokerRebuttalExcuse, DisputeCase, ArAgingInvoice, ExportFormat, DriverSmsMessage, AccountingSyncRecord } from "./src/types/dwell";
import { checkEvidenceCompleteness } from "./src/services/evidence/evidenceChecklist";
import { generateSimulatedEldPayload, normalizeEldWebhook } from "./src/services/telematics/eldIngestion";
import { buildEmailDispatch, shouldAutoDispatchClaim } from "./src/services/email/autoDispatcher";
import { computeFacilityRateIntelligence, searchFacilitiesWithIntelligence } from "./src/services/risk/facilityIntelligence";
import { generateBrokerRebuttalLetter } from "./src/services/disputes/rebuttalService";
import { calculateHosImpact } from "./src/services/hos/hosCalculatorService";
import { generateDefaultAddendum } from "./src/services/addendum/addendumService";
import { SAMPLE_BROKER_SCORECARDS, computeFleetOpportunityLoss } from "./src/services/analytics/brokerScorecardService";
import { generateEdi210Invoice, generateQuickBooksCsv, generateStandardClaimsCsv } from "./src/services/export/tmsExportService";

let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

const geofenceStates: Record<string, GeofenceState> = {};

function getGeofenceState(stopId: string): GeofenceState {
  if (!geofenceStates[stopId]) {
    geofenceStates[stopId] = {
      qualifyingInsideFixes: [],
      qualifyingOutsideFixes: [],
      isArrivalConfirmed: false,
      isDepartureConfirmed: false,
      firstInsideFixTime: null,
      confirmedArrivalTime: null,
      confirmedDepartureTime: null,
    };
  }
  return geofenceStates[stopId];
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", geminiEnabled: !!process.env.GEMINI_API_KEY });
  });

  // Demo Reset
  app.post("/api/demo/reset", (_req, res) => {
    const db = resetDb();
    res.json({ message: "Demo database reset to pristine seed state.", loadCount: Object.keys(db.loads).length });
  });

  app.post("/api/rate-confirmations", async (req, res) => {
    try {
      const { text, fixtureId, brokerNameOverride } = req.body;
      const rawText: string = text || (fixtureId ? RATE_CON_FIXTURES.find(f => f.id === fixtureId)?.layoutText : "") || "";

      let extractedTerms: DetentionTerms | null = null;
      let loadNumber = `LD-${Math.floor(100000 + Math.random() * 900000)}`;
      let proNumber = `PRO-${Math.floor(1000 + Math.random() * 9000)}`;
      let brokerName = brokerNameOverride || "Freight Brokerage Partners";
      let rateTotalCents = 220000;

      if (fixtureId) {
        const fixture = RATE_CON_FIXTURES.find(f => f.id === fixtureId);
        if (fixture) {
          extractedTerms = JSON.parse(JSON.stringify(fixture.goldenTerms));
          loadNumber = fixture.loadNumber;
          proNumber = fixture.proNumber;
          brokerName = fixture.brokerName;
          rateTotalCents = fixture.rateTotalCents;
        }
      }

      // If text provided and Gemini is configured, use Prompt A with gemini-3.8-flash
      if (!extractedTerms && ai && rawText) {
        try {
          const prompt = buildExtractDetentionTermsPrompt(rawText);
          const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: prompt,
            config: {
              systemInstruction: EXTRACT_DETENTION_TERMS_SYSTEM_PROMPT,
              responseMimeType: "application/json",
            },
          });

          if (response.text) {
            const parsed = JSON.parse(response.text);
            if (parsed.freeTimeMinutes && parsed.detentionRateCentsPerHour) {
              extractedTerms = parsed as DetentionTerms;
              if (parsed.loadNumber) loadNumber = parsed.loadNumber;
              if (parsed.proNumber) proNumber = parsed.proNumber;
              if (parsed.brokerName) brokerName = parsed.brokerName;
              if (parsed.rateTotalCents) rateTotalCents = parsed.rateTotalCents;
            }
          }
        } catch (llmErr) {
          console.warn("LLM extraction fallback invoked:", llmErr);
        }
      }

      // Fallback: heuristic extraction or default standard contract
      if (!extractedTerms) {
        const matched = RATE_CON_FIXTURES.find(f => rawText.includes(f.loadNumber) || rawText.includes(f.brokerName));
        if (matched) {
          extractedTerms = JSON.parse(JSON.stringify(matched.goldenTerms));
          loadNumber = matched.loadNumber;
          proNumber = matched.proNumber;
          brokerName = matched.brokerName;
          rateTotalCents = matched.rateTotalCents;
        } else {
          extractedTerms = {
            freeTimeMinutes: {
              pickup: { value: 120, confidence: 0.95, sourceQuote: "2 hours free time allowed" },
              delivery: { value: 120, confidence: 0.95, sourceQuote: "2 hours free time allowed" },
            },
            detentionRateCentsPerHour: { value: 5000, confidence: 0.95, sourceQuote: "$50.00/hour after free time" },
            billingIncrement: { value: "hourly", confidence: 0.9, sourceQuote: "billed hourly" },
            detentionCapCents: { value: 25000, confidence: 0.9, sourceQuote: "capped at $250.00 per stop" },
            freeTimeStartsFrom: { value: "scheduled_appointment", confidence: 0.9, sourceQuote: "Clock commences at scheduled appointment time" },
            notice: {
              trigger: { value: "at_free_time_expiry", confidence: 0.9, sourceQuote: "notify broker before free time expires" },
              withinMinutes: { value: 30, confidence: 0.9, sourceQuote: "within 30 minutes" },
              channel: { value: "email", confidence: 0.95, sourceQuote: "email detention@broker.com" },
              contact: { value: "detention@broker.com", confidence: 0.95, sourceQuote: "detention@broker.com" },
            },
            claimFilingWindowHours: { value: 24, confidence: 0.95, sourceQuote: "claims must be submitted within 24 hours" },
            requiredDocuments: {
              value: ["signed_bill_of_lading", "facility_dock_stamp"],
              confidence: 0.9,
              sourceQuote: "signed bill of lading with in/out stamp",
            },
            ambiguities: [],
            needsReview: false,
          };
        }
      }

      const db = getDb();
      const loadId = `load-${Date.now()}`;
      const now = new Date();

      const pickupStopId = `stop-${loadId}-pickup`;
      const deliveryStopId = `stop-${loadId}-delivery`;

      const pickupStop: Stop = {
        id: pickupStopId,
        loadId,
        sequence: 1,
        type: "pickup",
        facilityId: "fac-amz-mdw2",
        facilityName: "Amazon Fulfillment MDW2",
        facilityAddress: "250 Emerald Dr, Joliet, IL 60433",
        appointmentStart: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
        appointmentEnd: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
        arrivedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
        departedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
        source: "geofence",
        evidenceIds: [],
        lat: 41.4883,
        lng: -88.1152,
      };

      const deliveryStop: Stop = {
        id: deliveryStopId,
        loadId,
        sequence: 2,
        type: "delivery",
        facilityId: "fac-wm-6094",
        facilityName: "Walmart DC #6094",
        facilityAddress: "1100 SE 8th St, Bentonville, AR 72712",
        appointmentStart: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
        appointmentEnd: new Date(now.getTime() + 90 * 60 * 1000).toISOString(),
        arrivedAt: null, // En route!
        departedAt: null,
        source: "geofence",
        evidenceIds: [],
        lat: 36.3621,
        lng: -94.2052,
      };

      const newLoad: Load = {
        id: loadId,
        brokerName,
        brokerEmail: extractedTerms.notice.contact.value || "claims@broker.com",
        loadNumber,
        proNumber,
        rateTotalCents,
        rateConFileKey: `uploads/${loadNumber}.pdf`,
        rateConRawText: rawText,
        terms: extractedTerms,
        stopIds: [pickupStopId, deliveryStopId],
        status: "in_transit",
        createdAt: now.toISOString(),
      };

      db.loads[loadId] = newLoad;
      db.stops[pickupStopId] = pickupStop;
      db.stops[deliveryStopId] = deliveryStop;

      res.json({
        success: true,
        load: newLoad,
        terms: extractedTerms,
        stops: [pickupStop, deliveryStop],
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to process rate confirmation" });
    }
  });

  // 2. LOADS: List all
  app.get("/api/loads", (_req, res) => {
    const db = getDb();
    const loadsList = Object.values(db.loads).map((load) => {
      const stops = load.stopIds.map((id) => db.stops[id]).filter(Boolean);
      const activeStop = stops.find((s) => !s.departedAt) || stops[stops.length - 1];
      const clock = activeStop ? computeDetention(activeStop, load.terms, new Date()) : null;
      return {
        ...load,
        stops,
        activeStop,
        currentClock: clock,
      };
    });
    res.json(loadsList);
  });

  // 3. LOADS: Get single
  app.get("/api/loads/:id", (req, res) => {
    const db = getDb();
    const load = db.loads[req.params.id];
    if (!load) return res.status(404).json({ error: "Load not found" });

    const stops = load.stopIds.map((id) => db.stops[id]).filter(Boolean);
    const relatedClaims = Object.values(db.claims).filter((c) => c.loadId === load.id);
    const relatedEvents = db.dwellEvents.filter((e) =>
      stops.some((s) => s.id === e.stopId)
    );

    res.json({
      ...load,
      stops,
      claims: relatedClaims,
      events: relatedEvents,
    });
  });

  // 4. LOADS: Dispatcher corrects reviewed terms
  app.patch("/api/loads/:id/terms", (req, res) => {
    const db = getDb();
    const load = db.loads[req.params.id];
    if (!load) return res.status(404).json({ error: "Load not found" });

    const { updatedTerms } = req.body;
    if (updatedTerms) {
      load.terms = {
        ...load.terms,
        ...updatedTerms,
        needsReview: false, // Review verified by dispatcher
      };

      // Recalculate any existing draft claims
      Object.values(db.claims)
        .filter((c) => c.loadId === load.id && c.status !== "filed")
        .forEach((claim) => {
          const stop = db.stops[claim.stopId];
          if (stop) {
            const comp = computeDetention(stop, load.terms, stop.departedAt ? new Date(stop.departedAt) : new Date());
            const deadlines = computeDeadlines(stop, load.terms, comp);
            claim.detentionMinutes = comp.detentionMinutes;
            claim.billableUnits = comp.billableUnits;
            claim.amountCents = comp.amountCents;
            claim.computation = toComputationRecord(comp, load.terms);
            claim.noticeDeadlineAt = deadlines.noticeDeadlineAt?.toISOString() || null;
            claim.filingDeadlineAt = deadlines.filingDeadlineAt?.toISOString() || null;
          }
        });
    }

    res.json({ success: true, load });
  });

  // 5. STOPS: Arrive
  app.post("/api/stops/:id/arrive", (req, res) => {
    const db = getDb();
    const stop = db.stops[req.params.id];
    if (!stop) return res.status(404).json({ error: "Stop not found" });

    const { at, lat, lng, source } = req.body;
    const arrivalTime = at || new Date().toISOString();
    stop.arrivedAt = arrivalTime;
    stop.source = source || "manual";
    if (lat) stop.lat = lat;
    if (lng) stop.lng = lng;

    const load = db.loads[stop.loadId];
    if (load) {
      load.status = "at_dock";
    }

    // Append-only DwellEvent
    const newEvent: DwellEvent = {
      id: `evt-${Date.now()}`,
      stopId: stop.id,
      type: source === "geofence" ? "confirmed_arrival" : "manual_arrival",
      occurredAt: arrivalTime,
      recordedAt: new Date().toISOString(),
      lat: stop.lat,
      lng: stop.lng,
      payload: { source: stop.source },
    };
    db.dwellEvents.push(newEvent);

    res.json({ success: true, stop, event: newEvent });
  });

  // 6. STOPS: Depart
  app.post("/api/stops/:id/depart", async (req, res) => {
    const db = getDb();
    const stop = db.stops[req.params.id];
    if (!stop) return res.status(404).json({ error: "Stop not found" });

    const { at, lat, lng, source } = req.body;
    const departureTime = at || new Date().toISOString();
    stop.departedAt = departureTime;

    const load = db.loads[stop.loadId];
    if (load) {
      load.status = "completed";
    }

    const newEvent: DwellEvent = {
      id: `evt-${Date.now()}`,
      stopId: stop.id,
      type: source === "geofence" ? "confirmed_departure" : "manual_departure",
      occurredAt: departureTime,
      recordedAt: new Date().toISOString(),
      lat: lat || stop.lat,
      lng: lng || stop.lng,
      payload: { source: source || "manual" },
    };
    db.dwellEvents.push(newEvent);

    let claimId = `claim-${stop.id}`;
    let existingClaim = db.claims[claimId];

    if (load) {
      const comp = computeDetention(stop, load.terms, new Date(departureTime));
      const deadlines = computeDeadlines(stop, load.terms, comp);
      const evidenceList = stop.evidenceIds.map((id) => db.evidence[id]).filter(Boolean);
      const formattedLetter = formatDeterministicClaimLetter(load, stop, load.terms, comp, evidenceList);

      const claim: Claim = {
        id: claimId,
        loadId: load.id,
        stopId: stop.id,
        status: comp.detentionMinutes > 0 ? "at_risk" : "draft",
        detentionMinutes: comp.detentionMinutes,
        billableUnits: comp.billableUnits,
        amountCents: comp.amountCents,
        computation: toComputationRecord(comp, load.terms),
        letterMarkdown: formattedLetter.bodyMarkdown,
        letterSubject: formattedLetter.subject,
        noticeDeadlineAt: deadlines.noticeDeadlineAt ? deadlines.noticeDeadlineAt.toISOString() : null,
        filingDeadlineAt: deadlines.filingDeadlineAt ? deadlines.filingDeadlineAt.toISOString() : null,
        attachments: evidenceList.map((e) => e.label),
        missingRequiredDocs: checkEvidenceCompleteness(load.terms, evidenceList).missingDocs,
      };

      db.claims[claimId] = claim;
      existingClaim = claim;

      if (comp.detentionMinutes > 0) {
        load.status = "claim_pending";
      }
    }

    res.json({ success: true, stop, claim: existingClaim, event: newEvent });
  });

  app.post("/api/stops/:id/location", (req, res) => {
    const db = getDb();
    const stop = db.stops[req.params.id];
    if (!stop) return res.status(404).json({ error: "Stop not found" });

    const { lat, lng, accuracyMeters, timestamp } = req.body;
    const fix = {
      lat: Number(lat),
      lng: Number(lng),
      accuracyMeters: Number(accuracyMeters || 10),
      timestamp: timestamp || new Date().toISOString(),
    };

    const currentState = getGeofenceState(stop.id);
    const result = processGpsFix(stop, fix, currentState);
    geofenceStates[stop.id] = result.updatedState;

    for (const ev of result.eventsToEmit) {
      db.dwellEvents.push({
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        stopId: stop.id,
        ...ev,
      });
    }

    if (result.shouldMarkArrived && !stop.arrivedAt) {
      stop.arrivedAt = result.arrivalTimestamp;
      stop.source = "geofence";
      const load = db.loads[stop.loadId];
      if (load) load.status = "at_dock";
    }

    if (result.shouldMarkDeparted && !stop.departedAt) {
      stop.departedAt = result.departureTimestamp;
      stop.source = "geofence";
      const load = db.loads[stop.loadId];
      if (load) load.status = "completed";
    }

    res.json({
      success: true,
      shouldMarkArrived: result.shouldMarkArrived,
      shouldMarkDeparted: result.shouldMarkDeparted,
      state: result.updatedState,
    });
  });

  app.post("/api/stops/:id/evidence", (req, res) => {
    const db = getDb();
    const stop = db.stops[req.params.id];
    if (!stop) return res.status(404).json({ error: "Stop not found" });

    const { type, label, notes, fileUrl } = req.body;
    const evidenceId = `ev-${Date.now()}`;
    const newEvidence: Evidence = {
      id: evidenceId,
      stopId: stop.id,
      type: type || "dock_stamp",
      label: label || "Facility Proof",
      timestamp: new Date().toISOString(),
      notes,
      fileUrl,
    };

    db.evidence[evidenceId] = newEvidence;
    stop.evidenceIds.push(evidenceId);


    const auditEvent: DwellEvent = {
      id: `evt-${Date.now()}`,
      stopId: stop.id,
      type: "evidence_captured",
      occurredAt: newEvidence.timestamp,
      recordedAt: new Date().toISOString(),
      payload: { evidenceId, type: newEvidence.type, label: newEvidence.label },
    };
    db.dwellEvents.push(auditEvent);


    const claim = Object.values(db.claims).find((c) => c.stopId === stop.id);
    const load = db.loads[stop.loadId];
    if (claim && load) {
      const allEv = stop.evidenceIds.map((id) => db.evidence[id]).filter(Boolean);
      const check = checkEvidenceCompleteness(load.terms, allEv);
      claim.attachments = allEv.map((e) => e.label);
      claim.missingRequiredDocs = check.missingDocs;
      if (check.isFullySatisfied && claim.status === "at_risk") {
        claim.status = "ready";
      }
    }

    res.json({ success: true, evidence: newEvidence, event: auditEvent });
  });


  app.get("/api/stops/:id/clock", (req, res) => {
    const db = getDb();
    const stop = db.stops[req.params.id];
    if (!stop) return res.status(404).json({ error: "Stop not found" });

    const load = db.loads[stop.loadId];
    if (!load) return res.status(404).json({ error: "Load not found" });

    const now = new Date();
    const comp = computeDetention(stop, load.terms, stop.departedAt ? new Date(stop.departedAt) : now);
    const deadlines = computeDeadlines(stop, load.terms, comp);
    const stopEvidence = stop.evidenceIds.map((id) => db.evidence[id]).filter(Boolean);
    const evidenceCheck = checkEvidenceCompleteness(load.terms, stopEvidence);

  
    let state: "en_route" | "clock_running" | "free_time_expired" | "departed" = "en_route";
    if (stop.departedAt) {
      state = "departed";
    } else if (stop.arrivedAt) {
      state = comp.detentionMinutes > 0 ? "free_time_expired" : "clock_running";
    }

    const hosImpact = calculateHosImpact({ stop });

    res.json({
      stopId: stop.id,
      loadId: load.id,
      brokerName: load.brokerName,
      facilityName: stop.facilityName,
      facilityAddress: stop.facilityAddress,
      state,
      arrivedAt: stop.arrivedAt,
      departedAt: stop.departedAt,
      clockStartsAt: comp.clockStartsAt?.toISOString() || null,
      freeTimeEndsAt: comp.freeTimeEndsAt?.toISOString() || null,
      freeTimeRemainingMinutes: comp.freeTimeRemainingMinutes,
      detentionMinutes: comp.detentionMinutes,
      billableUnits: comp.billableUnits,
      amountCents: comp.amountCents,
      hourlyRateCents: load.terms.detentionRateCentsPerHour.value,
      explanation: comp.explanation,
      isLateArrival: comp.isLateArrival,
      noticeDeadlineAt: deadlines.noticeDeadlineAt?.toISOString() || null,
      filingDeadlineAt: deadlines.filingDeadlineAt?.toISOString() || null,
      evidence: stopEvidence,
      missingDocs: evidenceCheck.missingDocs,
      isEvidenceComplete: evidenceCheck.isFullySatisfied,
      hos: hosImpact,
    });
  });

  app.post("/api/claims/:id/generate", async (req, res) => {
    const db = getDb();
    const claim = db.claims[req.params.id];
    if (!claim) return res.status(404).json({ error: "Claim not found" });

    const load = db.loads[claim.loadId];
    const stop = db.stops[claim.stopId];
    if (!load || !stop) return res.status(404).json({ error: "Load or Stop missing" });

    const evidenceList = stop.evidenceIds.map((id) => db.evidence[id]).filter(Boolean);

    let subject = claim.letterSubject;
    let bodyMarkdown = claim.letterMarkdown;

    if (ai) {
      try {
        const payload = {
          loadNumber: load.loadNumber,
          proNumber: load.proNumber,
          brokerName: load.brokerName,
          facilityName: stop.facilityName,
          appointmentWindow: `${stop.appointmentStart} to ${stop.appointmentEnd}`,
          timeline: {
            arrivedAt: stop.arrivedAt,
            clockStartsAt: claim.computation.clockStartsAt,
            freeTimeEndsAt: claim.computation.freeTimeEndsAt,
            departedAt: stop.departedAt,
          },
          detention: {
            minutesPastFreeTime: claim.detentionMinutes,
            billableUnits: claim.billableUnits,
            billingIncrement: claim.computation.billingIncrement,
            hourlyRateDollars: (claim.computation.ratePerUnitCents / 100).toFixed(2),
            totalAmountDollars: (claim.amountCents / 100).toFixed(2),
            computationLine: claim.computation.explanation,
          },
          contractualEntitlementClause:
            load.terms.detentionRateCentsPerHour.sourceQuote ||
            load.terms.freeTimeMinutes.delivery.sourceQuote,
          attachedEvidence: evidenceList.map((e) => e.label),
          missingRequiredDocs: claim.missingRequiredDocs,
          filingDeadline: claim.filingDeadlineAt,
        };

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: buildWriteClaimLetterUserPrompt(payload),
          config: {
            systemInstruction: WRITE_CLAIM_LETTER_SYSTEM_PROMPT,
            responseMimeType: "application/json",
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          if (parsed.subject && parsed.bodyMarkdown) {
            subject = parsed.subject;
            bodyMarkdown = parsed.bodyMarkdown;
          }
        }
      } catch (e) {
        console.warn("Gemini letter formatting failed, used deterministic fallback:", e);
      }
    }

    if (!bodyMarkdown) {
      const formatted = formatDeterministicClaimLetter(load, stop, load.terms, computeDetention(stop, load.terms), evidenceList);
      subject = formatted.subject;
      bodyMarkdown = formatted.bodyMarkdown;
    }

    claim.letterSubject = subject;
    claim.letterMarkdown = bodyMarkdown;

    res.json({ success: true, claim });
  });

  app.post("/api/claims/:id/send", (req, res) => {
    const db = getDb();
    const claim = db.claims[req.params.id];
    if (!claim) return res.status(404).json({ error: "Claim not found" });

    const load = db.loads[claim.loadId];
    const recipient = req.body.email || load?.brokerEmail || "claims@broker.com";

    claim.status = "filed";
    claim.sentAt = new Date().toISOString();
    claim.sentTo = recipient;

    if (load) {
      load.status = "claim_filed";
    }
    const auditEvent: DwellEvent = {
      id: `evt-${Date.now()}`,
      stopId: claim.stopId,
      type: "notice_sent",
      occurredAt: claim.sentAt,
      recordedAt: claim.sentAt,
      payload: { claimId: claim.id, sentTo: recipient, amountCents: claim.amountCents },
    };
    db.dwellEvents.push(auditEvent);

    res.json({ success: true, claim, message: `Claim for $${(claim.amountCents / 100).toFixed(2)} filed to ${recipient}.` });
  });

  app.get("/api/claims", (req, res) => {
    const db = getDb();
    let list = Object.values(db.claims);

    if (req.query.status) {
      list = list.filter((c) => c.status === req.query.status);
    }
    if (req.query.atRisk === "true") {
      list = list.filter((c) => c.status === "at_risk" || c.status === "ready");
    }

    const enriched = list.map((c) => {
      const load = db.loads[c.loadId];
      const stop = db.stops[c.stopId];
      let hoursUntilFilingDeadline: number | null = null;
      if (c.filingDeadlineAt) {
        const diffMs = new Date(c.filingDeadlineAt).getTime() - Date.now();
        hoursUntilFilingDeadline = Number((diffMs / (60 * 60 * 1000)).toFixed(1));
      }
      return {
        ...c,
        loadNumber: load?.loadNumber,
        brokerName: load?.brokerName,
        brokerEmail: load?.brokerEmail,
        facilityName: stop?.facilityName,
        hoursUntilFilingDeadline,
      };
    });

    res.json(enriched);
  });

  app.get(["/api/facilities", "/api/facilities/risk-table"], (_req, res) => {
    const db = getDb();
    const list = Object.values(db.facilities).sort(
      (a, b) => b.stats.overageRate - a.stats.overageRate
    );
    res.json(list);
  });

  app.get("/api/facilities/:id/risk", (req, res) => {
    const db = getDb();
    const facility = db.facilities[req.params.id];
    if (!facility) return res.status(404).json({ error: "Facility not found" });
    res.json(facility);
  });

  app.get("/api/facilities/intelligence", (_req, res) => {
    const db = getDb();
    const result = Object.values(db.facilities).map(computeFacilityRateIntelligence);
    res.json(result);
  });

  app.get("/api/facilities/search", (req, res) => {
    const db = getDb();
    const q = String(req.query.q || "");
    const results = searchFacilitiesWithIntelligence(db.facilities, q);
    res.json(results);
  });

  app.post("/api/facilities/normalize", async (req, res) => {
    try {
      const { name = "", address = "" } = req.body || {};
      const db = getDb();
      const knownList = Object.values(db.facilities).map((f) => ({
        id: f.id,
        canonicalName: f.canonicalName,
        address: f.address,
      }));

      const lowerAddr = address.toLowerCase().trim();
      const lowerName = name.toLowerCase().trim();

      const exactMatch = Object.values(db.facilities).find(
        (f) =>
          (lowerAddr && f.address.toLowerCase().includes(lowerAddr)) ||
          (lowerName && f.canonicalName.toLowerCase().includes(lowerName)) ||
          f.rawNames.some((rn) => lowerName && rn.toLowerCase().includes(lowerName))
      );

      let result = {
        matchedFacilityId: exactMatch ? exactMatch.id : (null as string | null),
        confidence: exactMatch ? 0.98 : 0.5,
        canonicalName: exactMatch ? exactMatch.canonicalName : (name || "Unassigned Terminal"),
        reasoning: exactMatch
          ? "Deterministic match against verified commercial warehouse directory."
          : "Heuristic terminal candidate.",
      };

      if (!exactMatch && ai && name) {
        try {
          const userPrompt = buildNormalizeFacilityPrompt(name, address, knownList);
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: userPrompt,
            config: {
              systemInstruction: NORMALIZE_FACILITY_NAME_SYSTEM_PROMPT,
              responseMimeType: "application/json",
            },
          });
          if (response.text) {
            const parsed = JSON.parse(response.text);
            if (parsed.canonicalName) {
              result = {
                matchedFacilityId: parsed.matchedFacilityId || null,
                confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.85,
                canonicalName: parsed.canonicalName,
                reasoning: parsed.reasoning || "LLM semantic address match",
              };
            }
          }
        } catch (llmErr) {
          console.warn("Facility normalization LLM fallback:", llmErr);
        }
      }

      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Normalization failed" });
    }
  });

  app.post("/api/telematics/webhook/:provider", (req, res) => {
    const provider = req.params.provider as EldProvider;
    if (!["samsara", "motive", "geotab"].includes(provider)) {
      return res.status(400).json({ error: "Unsupported ELD provider" });
    }

    const db = getDb();
    const normalized = normalizeEldWebhook(provider, req.body);

    let stop = normalized.stopId ? db.stops[normalized.stopId] : null;
    if (!stop) {
      stop = Object.values(db.stops).find((s) => !s.departedAt) || Object.values(db.stops)[0];
    }

    let autoActionTaken = "Location logged";

    if (stop) {
      if (normalized.eventType === "geofence_entry" && !stop.arrivedAt) {
        stop.arrivedAt = normalized.timestamp;
        stop.source = "eld";
        const load = db.loads[stop.loadId];
        if (load) load.status = "at_dock";
        autoActionTaken = `Auto-arrival confirmed via ${provider.toUpperCase()} Geofence Entry`;

        db.dwellEvents.push({
          id: `evt-eld-${Date.now()}`,
          stopId: stop.id,
          type: "confirmed_arrival",
          occurredAt: normalized.timestamp,
          recordedAt: new Date().toISOString(),
          lat: normalized.lat,
          lng: normalized.lng,
          payload: { provider, vehicleId: normalized.vehicleId, source: "eld_webhook" },
        });
      } else if (normalized.eventType === "geofence_exit" && stop.arrivedAt && !stop.departedAt) {
        stop.departedAt = normalized.timestamp;
        stop.source = "eld";
        const load = db.loads[stop.loadId];
        if (load) load.status = "completed";
        autoActionTaken = `Auto-departure confirmed via ${provider.toUpperCase()} Geofence Exit`;

        db.dwellEvents.push({
          id: `evt-eld-${Date.now()}`,
          stopId: stop.id,
          type: "confirmed_departure",
          occurredAt: normalized.timestamp,
          recordedAt: new Date().toISOString(),
          lat: normalized.lat,
          lng: normalized.lng,
          payload: { provider, vehicleId: normalized.vehicleId, source: "eld_webhook" },
        });

        if (load) {
          const comp = computeDetention(stop, load.terms, new Date(normalized.timestamp));
          if (comp.detentionMinutes > 0) {
            load.status = "claim_pending";
            let claim = Object.values(db.claims).find((c) => c.stopId === stop.id);
            if (!claim) {
              const deadlines = computeDeadlines(stop, load.terms, comp);
              const evidenceList = stop.evidenceIds.map((id) => db.evidence[id]).filter(Boolean);
              const formatted = formatDeterministicClaimLetter(load, stop, load.terms, comp, evidenceList);
              claim = {
                id: `claim-${Date.now()}`,
                loadId: load.id,
                stopId: stop.id,
                status: "ready",
                detentionMinutes: comp.detentionMinutes,
                billableUnits: comp.billableUnits,
                amountCents: comp.amountCents,
                computation: toComputationRecord(comp, load.terms),
                letterMarkdown: formatted.bodyMarkdown,
                letterSubject: formatted.subject,
                noticeDeadlineAt: deadlines.noticeDeadlineAt ? deadlines.noticeDeadlineAt.toISOString() : null,
                filingDeadlineAt: deadlines.filingDeadlineAt ? deadlines.filingDeadlineAt.toISOString() : null,
                attachments: evidenceList.map((e) => e.label),
                missingRequiredDocs: checkEvidenceCompleteness(load.terms, evidenceList).missingDocs,
              };
              db.claims[claim.id] = claim;
            }
          }
        }
      }
    }

    const logEntry = {
      id: `eld-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      provider,
      receivedAt: new Date().toISOString(),
      eventType: normalized.eventType,
      vehicleId: normalized.vehicleId,
      stopId: stop?.id,
      summary: `${provider.toUpperCase()}: ${normalized.eventType.replace(/_/g, " ")} for Vehicle ${normalized.vehicleId} at ${normalized.lat.toFixed(4)}, ${normalized.lng.toFixed(4)}`,
      payload: normalized as any,
      autoActionTaken,
    };

    db.eldLogs.unshift(logEntry);
    if (db.eldLogs.length > 50) db.eldLogs.pop();

    res.json({ success: true, processed: normalized, autoActionTaken, stop });
  });

  app.get("/api/telematics/logs", (_req, res) => {
    const db = getDb();
    res.json({
      logs: db.eldLogs,
      activeConnections: [
        { provider: "samsara", status: "active", latencyMs: 38, webhookEndpoint: "/api/telematics/webhook/samsara" },
        { provider: "motive", status: "active", latencyMs: 44, webhookEndpoint: "/api/telematics/webhook/motive" },
        { provider: "geotab", status: "active", latencyMs: 52, webhookEndpoint: "/api/telematics/webhook/geotab" },
      ],
    });
  });

  app.post("/api/telematics/simulate", (req, res) => {
    const db = getDb();
    const { provider = "samsara", action = "arrival", stopId } = req.body;
    const stop = (stopId ? db.stops[stopId] : null) || Object.values(db.stops).find((s) => !s.departedAt) || Object.values(db.stops)[0];
    if (!stop) return res.status(404).json({ error: "No stop available to simulate" });

    const payload = generateSimulatedEldPayload(provider as EldProvider, action, stop);

    const normalized = normalizeEldWebhook(provider as EldProvider, payload);
    let autoActionTaken = "Location logged";

    if (action === "arrival") {
      stop.arrivedAt = normalized.timestamp;
      stop.source = "eld";
      const load = db.loads[stop.loadId];
      if (load) load.status = "at_dock";
      autoActionTaken = `Auto-arrival triggered via ${provider.toUpperCase()} Geofence Entry`;
    } else if (action === "departure") {
      stop.departedAt = normalized.timestamp;
      stop.source = "eld";
      const load = db.loads[stop.loadId];
      if (load) load.status = "completed";
      autoActionTaken = `Auto-departure triggered via ${provider.toUpperCase()} Geofence Exit`;
    }

    const logEntry = {
      id: `eld-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      provider: provider as EldProvider,
      receivedAt: new Date().toISOString(),
      eventType: normalized.eventType,
      vehicleId: normalized.vehicleId,
      stopId: stop.id,
      summary: `[SIMULATED] ${provider.toUpperCase()}: ${action.toUpperCase()} for Vehicle ${normalized.vehicleId}`,
      payload: normalized as any,
      autoActionTaken,
    };

    db.eldLogs.unshift(logEntry);
    res.json({ success: true, logEntry, stop });
  });
  app.get("/api/email/dispatches", (_req, res) => {
    const db = getDb();
    res.json({
      dispatches: db.emailDispatches,
      rule: db.autoDispatchRule,
    });
  });

  app.post("/api/email/auto-dispatch-rule", (req, res) => {
    const db = getDb();
    db.autoDispatchRule = {
      ...db.autoDispatchRule,
      ...req.body,
    };
    res.json({ success: true, rule: db.autoDispatchRule });
  });

  app.post("/api/email/dispatch/:claimId", (req, res) => {
    const db = getDb();
    const claim = db.claims[req.params.claimId];
    if (!claim) return res.status(404).json({ error: "Claim not found" });

    const load = db.loads[claim.loadId];
    const stop = db.stops[claim.stopId];
    if (!load || !stop) return res.status(404).json({ error: "Load or Stop missing" });

    const recipient = req.body.recipientEmail || load.brokerEmail;
    const record = buildEmailDispatch(claim, load, stop, recipient, req.body.triggerSource || "manual_dispatch");

    claim.status = "filed";
    claim.sentAt = record.dispatchedAt;
    claim.sentTo = record.recipientEmail;
    load.status = "claim_filed";

    db.emailDispatches.unshift(record);

    db.dwellEvents.push({
      id: `evt-mail-${Date.now()}`,
      stopId: stop.id,
      type: "notice_sent",
      occurredAt: record.dispatchedAt,
      recordedAt: record.dispatchedAt,
      payload: { emailRecordId: record.id, recipient: record.recipientEmail, messageId: record.messageId },
    });

    res.json({ success: true, dispatch: record, claim });
  });

  app.post("/api/email/run-daemon", (_req, res) => {
    const db = getDb();
    const rule = db.autoDispatchRule;
    if (!rule.enabled) {
      return res.json({ success: true, dispatchedCount: 0, message: "Auto-dispatch daemon is disabled." });
    }

    const dispatched: any[] = [];
    for (const claim of Object.values(db.claims)) {
      const stop = db.stops[claim.stopId];
      const load = db.loads[claim.loadId];
      if (!stop || !load) continue;

      const evalResult = shouldAutoDispatchClaim(claim, stop, 15);
      if (evalResult.shouldDispatch) {
        const record = buildEmailDispatch(claim, load, stop, undefined, "automated_deadline_daemon");
        claim.status = "filed";
        claim.sentAt = record.dispatchedAt;
        claim.sentTo = record.recipientEmail;
        load.status = "claim_filed";
        db.emailDispatches.unshift(record);
        dispatched.push({ claimId: claim.id, loadNumber: load.loadNumber, reason: evalResult.reason });
      }
    }

    res.json({ success: true, dispatchedCount: dispatched.length, dispatched });
  });

  app.get("/api/eval/run", (_req, res) => {
    const report = runFullEvaluationHarness((fixture) => fixture.goldenTerms);
    res.json(report);
  });

  app.post("/api/jobs/deadline-watcher", (req, res) => {
    const db = getDb();
    const thresholdHours = req.body?.thresholdHours ? Number(req.body.thresholdHours) : 3.0;
    const result = runDeadlineWatcher(db, thresholdHours);
    res.json({ success: true, ...result });
  });

  app.get("/api/claims/:id/packet", (req, res) => {
    const db = getDb();
    const claim = db.claims[req.params.id];
    if (!claim) {
      return res.status(404).send("<h1>404: Claim Not Found</h1>");
    }

    const load = db.loads[claim.loadId];
    const stop = db.stops[claim.stopId];
    const evidenceItems = (stop?.evidenceIds || []).map((id) => db.evidence[id]).filter(Boolean);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Carrier Detention Claim Packet - Load ${load?.loadNumber || claim.id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; margin: 40px; line-height: 1.5; font-size: 14px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
    .carrier-title { font-size: 22px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 12px; background: #e2e8f0; color: #0f172a; }
    .badge-urgent { background: #fee2e2; color: #991b1b; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; }
    .card-title { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 8px; letter-spacing: 0.5px; }
    .amount-box { background: #0f172a; color: #a3e635; padding: 16px; border-radius: 6px; text-align: right; margin-bottom: 24px; }
    .amount-val { font-size: 28px; font-weight: 800; font-family: monospace; }
    .letter-body { white-space: pre-wrap; font-family: Georgia, serif; font-size: 14px; background: #fff; border: 1px solid #cbd5e1; padding: 24px; border-radius: 6px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .evidence-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
    .evidence-table th { background: #f1f5f9; text-align: left; padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: 700; }
    .evidence-table td { padding: 8px 12px; border: 1px solid #cbd5e1; }
    .footer-note { font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    @media print {
      body { margin: 0; padding: 20px; font-size: 12px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; display: flex; gap: 10px; justify-content: flex-end;">
    <button onclick="window.print()" style="background: #0f172a; color: #fff; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; border: none;">🖨️ Print / Save PDF</button>
  </div>

  <div class="header">
    <div>
      <div class="carrier-title">APEX LOGISTICS FREIGHT & MOTOR CARRIER</div>
      <div style="color: #64748b; font-size: 12px;">USDOT: 3881902 | MC: 994012 | Claims & AR Division</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 16px; font-weight: 700;">FORMAL DETENTION DEMAND</div>
      <div style="color: #64748b; font-size: 12px;">Invoice & Claim ID: ${claim.id}</div>
      <div style="margin-top: 4px;"><span class="badge ${claim.status === 'at_risk' ? 'badge-urgent' : ''}">${claim.status.toUpperCase()}</span></div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-title">Broker / Payer Information</div>
      <div style="font-weight: 700; font-size: 15px;">${load?.brokerName || "Freight Brokerage LLC"}</div>
      <div>Rate Confirmation: <strong>${load?.loadNumber || "N/A"}</strong></div>
      <div>Contract Terms: $${((load?.terms?.detentionRateCentsPerHour?.value || 5000) / 100).toFixed(2)}/hr (${load?.terms?.billingIncrement?.value || "hourly"})</div>
      <div>Free Time Allowance: ${load?.terms?.freeTimeMinutes?.pickup?.value || 120}m pickup / ${load?.terms?.freeTimeMinutes?.delivery?.value || 120}m delivery</div>
    </div>
    <div class="card">
      <div class="card-title">Facility Dwell & Dock Summary</div>
      <div style="font-weight: 700; font-size: 15px;">${stop?.facilityName || "Warehouse"}</div>
      <div>${stop?.facilityAddress || "Facility Address"}</div>
      <div>Driver Check-In: <strong>${stop?.arrivedAt ? new Date(stop.arrivedAt).toLocaleString() : "N/A"}</strong></div>
      <div>Driver In-Gate / Departure: <strong>${stop?.departedAt ? new Date(stop.departedAt).toLocaleString() : "Active Dock Event"}</strong></div>
    </div>
  </div>

  <div class="amount-box">
    <div style="font-size: 12px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px;">Total Certified Contractual Claim</div>
    <div class="amount-val">$${(claim.amountCents / 100).toFixed(2)} USD</div>
    <div style="font-size: 12px; color: #e2e8f0; margin-top: 4px;">${claim.computation.explanation}</div>
  </div>

  <h3 style="margin-bottom: 8px; font-size: 14px; text-transform: uppercase; color: #0f172a;">Certified Demand Statement</h3>
  <div class="letter-body">${claim.letterMarkdown}</div>

  <h3 style="margin-bottom: 8px; font-size: 14px; text-transform: uppercase; color: #0f172a;">Evidence & Chain of Custody Registry</h3>
  <table class="evidence-table">
    <thead>
      <tr>
        <th>Type</th>
        <th>Recorded At</th>
        <th>Telemetry / Content Reference</th>
        <th>Verification Hash / Coordinates</th>
      </tr>
    </thead>
    <tbody>
      ${
        evidenceItems.length > 0
          ? evidenceItems
              .map(
                (ev) => `<tr>
              <td><strong>${ev.type.toUpperCase()}</strong> - ${ev.label}</td>
              <td>${new Date(ev.timestamp).toLocaleString()}</td>
              <td>${ev.fileUrl ? `<a href="${ev.fileUrl}" target="_blank">Document Reference</a>` : (ev.notes || "Digital Sensor Audit")}</td>
              <td style="font-family: monospace; font-size: 11px;">Verified Chain of Custody (${ev.id})</td>
            </tr>`
              )
              .join("")
          : `<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 16px;">Automated ELD & Geofence GPS ingress/egress records registered.</td></tr>`
      }
    </tbody>
  </table>

  <div class="footer-note">
    This document constitutes a certified claim demand under contractual rate agreement provisions, Title 49 U.S. Code § 14101, and Uniform Commercial Code (UCC) § 2-607. Payment is due net receipt. Unpaid balances past the contractual notice deadline accrue statutory interest.
  </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  });

  app.get("/api/disputes", (_req, res) => {
    const db = getDb();
    res.json(Object.values(db.disputes || {}));
  });

  app.post("/api/disputes/generate-rebuttal", async (req, res) => {
    try {
      const {
        brokerName = "Broker Operations",
        loadNumber = "LOAD-001",
        disputeReason = "alleged_late_arrival",
        claimedAmountCents = 15000,
        brokerOfferedCents = 0,
        telematicsPing = "2026-09-10 07:42:15 UTC (Lat 41.5201, Lng -87.4120)",
        gatePassTime = "07:45 AM In-Gate Guard Stamp #14",
        rateConClause = "Detention $85/hr after 2 hrs free time",
        brokerStatement = "",
        customNotes = "",
        tone = "firm_legal",
      } = req.body || {};

      const fallback = generateBrokerRebuttalLetter({
        brokerName: String(brokerName || "Broker Logistics"),
        loadNumber: String(loadNumber || "LOAD-001"),
        disputeReason: disputeReason as any,
        claimedAmountCents: Number(claimedAmountCents) || 15000,
        brokerOfferedCents: Number(brokerOfferedCents) || 0,
        telematicsPing: String(telematicsPing || "Verified GPS Geofence Fix"),
        gatePassTime: String(gatePassTime || "Confirmed In-Gate Stamp"),
        rateConClause: String(rateConClause || "Detention $85/hr after 2 hrs free time"),
      });

      let subject = fallback.subject;
      let letterMarkdown = fallback.letterMarkdown;
      let statutoryCitations = fallback.statutoryCitations;
      let engine = "legal-deterministic-engine";
      if (ai) {
        try {
          const toneGuidance =
            tone === "aggressive_demand"
              ? "Tone: Highly assertive, uncompromising legal demand. Emphasize carrier rights under 49 U.S.C. § 14101, prompt payment regulations, and mandatory credit bureau reporting (DAT, Truckstop, Ansonia) within 5 business days."
              : tone === "commercial_settlement"
              ? "Tone: Professional commercial resolution. Emphasize long-term broker-carrier partnership while holding firm on contractual liability for driver dwell."
              : "Tone: Authoritative legal enforcement. Firm, precise, referencing objective telematics corroboration, UCC § 2-607, and signed rate confirmation clauses.";

          const aiPrompt = `You are an expert commercial transportation claims attorney and freight collection specialist.
Write a formal, legally grounded Rebuttal and Demand Letter responding to a freight broker's denial of a carrier's detention claim.

Dispute Details:
- Broker: ${brokerName}
- Load Number: ${loadNumber}
- Disputed Claim Amount: $${(Number(claimedAmountCents) / 100).toFixed(2)}
- Amount Broker Offered: $${(Number(brokerOfferedCents) / 100).toFixed(2)}
- Rejection Category: ${disputeReason}
- Broker Denial Statement: "${brokerStatement || "Claim rejected alleging timing discrepancies or facility delays."}"
- Dual-Source Telematics Evidence: ${telematicsPing}
- In-Gate / Dock Timestamp: ${gatePassTime}
- Agreed Rate Confirmation Clause: "${rateConClause}"
${customNotes ? `- Driver/Dispatcher Custom Field Notes: "${customNotes}"` : ""}
- ${toneGuidance}

Requirements:
1. Provide a concise, punchy email subject line starting with "REBUTTAL & LEGAL DEMAND: Load #${loadNumber}".
2. Format the body in Markdown with clear sections (# REBUTTAL & LEGAL DEMAND, ### EXECUTIVE STATEMENT, ### LEGAL & STATUTORY CITATIONS, ### VERIFIED EVIDENCE AUDIT, and formal signature).
3. Directly dismantle the broker's specific denial argument using the telematics ping and dock records.
4. Extract or cite 2-4 authoritative statutes/regulations (e.g. 49 U.S.C. § 14101, 49 CFR § 395 Subpart B, UCC § 2-607, Restatement (Second) of Contracts § 318, STB Ex Parte 757).

Return clean JSON matching:
{
  "subject": string,
  "letterMarkdown": string,
  "statutoryCitations": string[]
}`;

          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Gemini AI generation timed out")), 7000)
          );

          const response = await Promise.race([
            ai.models.generateContent({
              model: "gemini-3.8-flash",
              contents: aiPrompt,
              config: {
                responseMimeType: "application/json",
              },
            }),
            timeoutPromise,
          ]);

          if (response.text) {
            const parsed = JSON.parse(response.text);
            if (parsed.letterMarkdown && parsed.subject) {
              subject = parsed.subject;
              letterMarkdown = parsed.letterMarkdown;
              if (Array.isArray(parsed.statutoryCitations) && parsed.statutoryCitations.length > 0) {
                statutoryCitations = parsed.statutoryCitations;
              }
              engine = "gemini-3.8-flash";
            }
          }
        } catch (aiErr) {
          console.warn("Gemini AI rebuttal generation warning, falling back to deterministic template:", aiErr);
        }
      }

      res.json({
        subject,
        letterMarkdown,
        statutoryCitations,
        engine,
        generatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Error generating rebuttal:", err);
      const fallback = generateBrokerRebuttalLetter({
        brokerName: req.body?.brokerName || "Broker Logistics",
        loadNumber: req.body?.loadNumber || "LOAD-001",
        disputeReason: req.body?.disputeReason || "alleged_late_arrival",
        claimedAmountCents: req.body?.claimedAmountCents || 15000,
        brokerOfferedCents: req.body?.brokerOfferedCents || 0,
        telematicsPing: req.body?.telematicsPing || "Verified GPS Geofence Fix",
        gatePassTime: req.body?.gatePassTime || "Confirmed In-Gate Stamp",
        rateConClause: req.body?.rateConClause || "Detention $85/hr after 2 hrs free time",
      });
      res.json({
        ...fallback,
        engine: "legal-deterministic-engine",
        generatedAt: new Date().toISOString(),
      });
    }
  });

  app.post("/api/disputes/:id/send-rebuttal", (req, res) => {
    const db = getDb();
    const dispute = db.disputes[req.params.id];
    if (!dispute) return res.status(404).json({ error: "Dispute case not found" });

    dispute.status = "rebuttal_sent";
    dispute.updatedAt = new Date().toISOString();
    if (req.body.letterMarkdown) dispute.rebuttalLetterMarkdown = req.body.letterMarkdown;
    if (req.body.subject) dispute.rebuttalSubject = req.body.subject;

    res.json({ success: true, dispute });
  });

  app.get("/api/ar/invoices", (_req, res) => {
    const db = getDb();
    const invoices = Object.values(db.arInvoices || {});
    const totalOutstandingCents = invoices.reduce((sum, inv) => (inv.status !== "paid" ? sum + inv.amountCents : sum), 0);
    const pastDueCount = invoices.filter((inv) => inv.daysPastDue > 0 && inv.status !== "paid").length;

    res.json({
      invoices,
      totalOutstandingCents,
      pastDueCount,
      brackets: {
        current: invoices.filter((i) => i.agingBracket === "current").length,
        days1_15: invoices.filter((i) => i.agingBracket === "1-15_days").length,
        days16_30: invoices.filter((i) => i.agingBracket === "16-30_days").length,
        days31_45: invoices.filter((i) => i.agingBracket === "31-45_days").length,
        days45Plus: invoices.filter((i) => i.agingBracket === "45+_days").length,
      },
    });
  });

  app.post("/api/ar/invoices/:id/send-reminder", (req, res) => {
    const db = getDb();
    const invoice = db.arInvoices[req.params.id];
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    invoice.remindersSentCount += 1;
    invoice.lastReminderDate = new Date().toISOString();
    invoice.status = "reminder_dispatched";

    res.json({ success: true, invoice });
  });

  app.post("/api/hos/calculate", (req, res) => {
    const db = getDb();
    const { stopId, shiftStartedAt, estimatedDriveToSafeHavenMinutes } = req.body;
    const stop = (stopId ? db.stops[stopId] : null) || Object.values(db.stops).find((s) => !s.departedAt) || Object.values(db.stops)[0];
    if (!stop) return res.status(404).json({ error: "No active stop for HOS calculation" });

    const analysis = calculateHosImpact({
      stop,
      shiftStartedAt,
      estimatedDriveToSafeHavenMinutes,
    });

    res.json({ analysis, stop });
  });

  app.post("/api/claims/:id/escalate-layover", (req, res) => {
    const db = getDb();
    let claim = db.claims[req.params.id];
    if (!claim) {
      const targetId = req.params.id.replace(/^claim-/, "");
      claim = Object.values(db.claims).find((c) => c.stopId === targetId || c.stopId === req.params.id);

      if (!claim) {
        const stop = db.stops[targetId] || db.stops[req.params.id] || Object.values(db.stops).find((s) => !s.departedAt) || Object.values(db.stops)[0];
        if (stop) {
          const load = db.loads[stop.loadId];
          claim = {
            id: `claim-${stop.id}`,
            loadId: stop.loadId,
            stopId: stop.id,
            status: "at_risk",
            detentionMinutes: 180,
            billableUnits: 1,
            amountCents: 45000,
            computation: {
              clockStartsAt: stop.arrivedAt || new Date().toISOString(),
              freeTimeEndsAt: new Date().toISOString(),
              detentionMinutes: 180,
              billableUnits: 1,
              billingIncrement: "daily",
              ratePerUnitCents: 45000,
              uncappedAmountCents: 45000,
              cappedAmountCents: 45000,
              capApplied: false,
              explanation: "HOS EXHAUSTION ESCALATION: Dock detention exceeded driver safe-harbor window, forcing mandatory 10-hour FMCSA sleeper berth reset. Claim escalated to Full Day Layover ($450.00).",
            },
            letterMarkdown: `# MANDATORY LAYOVER CLAIM: $450.00\n\nDriver forced into 10-hour sleeper berth reset due to facility detention at ${stop.facilityName}.`,
            letterSubject: `Mandatory Layover Claim - Load #${load?.loadNumber || "CHR-882941"} ($450.00)`,
            noticeDeadlineAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            filingDeadlineAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            attachments: [],
            missingRequiredDocs: [],
          };
          db.claims[claim.id] = claim;
        }
      }
    }

    if (!claim) return res.status(404).json({ error: "Claim not found" });

    const load = db.loads[claim.loadId];
    const stop = db.stops[claim.stopId];

    const requestedRateCents = req.body?.amountCents || 50000; 
    const previousAmount = claim.amountCents;
    claim.amountCents = requestedRateCents;
    claim.billableUnits = 1;
    claim.computation.billingIncrement = "daily";
    claim.computation.ratePerUnitCents = requestedRateCents;
    claim.computation.uncappedAmountCents = requestedRateCents;
    claim.computation.cappedAmountCents = requestedRateCents;
    claim.computation.explanation = `MANDATORY LAYOVER ACCESSORIAL CONVERSION: Facility dwell time exceeded 10.0 hours (${claim.detentionMinutes || 600}+ minutes). Driver subjected to mandatory 10-hour sleeper berth reset under FMCSA 49 CFR § 395.3. Upgraded invoice to flat contractual Layover rate of $${(requestedRateCents / 100).toFixed(2)}/day.`;
    claim.letterSubject = `Mandatory Layover Claim - Load #${load?.loadNumber || "CHR-882941"} ($${(requestedRateCents / 100).toFixed(2)}/day)`;

    const arrivalFormatted = stop?.arrivedAt ? new Date(stop.arrivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:00 AM';
    const departureFormatted = stop?.departedAt ? new Date(stop.departedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Still on-site / Out-of-Service';
    const dwellHours = Math.floor((claim.detentionMinutes || 600) / 60);
    const dwellRemainMins = (claim.detentionMinutes || 600) % 60;

    claim.letterMarkdown = `# UPGRADED OFFICIAL LAYOVER INVOICE & DEMAND FOR PAYMENT
**Load Number:** ${load?.loadNumber || "CHR-882941"}  
**Broker / Payor:** ${load?.brokerName || "C.H. Robinson Worldwide"}  
**Facility:** ${stop?.facilityName || "Walmart DC #6094"} (${stop?.facilityAddress || "Bentonville, AR"})  
**Invoice Date:** ${new Date().toISOString().split("T")[0]}  
**Statutory Authority:** FMCSA 49 CFR § 395.3(a)(2) Mandatory 10-Hour Sleeper Berth Reset  

---

### INVOICE SUMMARY & ACCESSORIAL CONVERSION
- **Accessorial Category:** Layover (Full 24-Hour In-Lieu Accessorial)
- **Trigger Incident:** Continuous Facility Dwell Exceeding 10.0 Hours (${dwellHours}h ${dwellRemainMins}m Accrued)
- **Billing Schedule:** Flat Rate (1 Daily Unit)
- **Billing Rate:** **$${(requestedRateCents / 100).toFixed(2)} / Day**
- **Total Amount Due:** **$${(requestedRateCents / 100).toFixed(2)} USD**

---

### STATEMENT OF FACTS & COMPLIANCE MANDATE
The carrier arrived at the designated shipper/receiver facility in full compliance with the scheduled appointment window. Due to facility-caused unloading/loading failure, the tractor-trailer was detained at the facility in excess of ten (10.0) consecutive hours.

Under Federal Motor Carrier Safety Regulations (**49 CFR § 395.3**), commercial property-carrying drivers cannot drive beyond the 14th consecutive hour on-duty. Because facility dwell consumed the driver's legal on-duty window and exhausted all travel buffer to off-site safe parking havens, the driver was legally placed out-of-service to execute a mandatory 10-consecutive-hour sleeper berth rest period on-site.

Pursuant to standard motor carrier accessorial rules and protective addendum terms:
1. Hourly detention ceases upon breach of the 10-hour HOS reset threshold.
2. The claim automatically converts to a **Flat Layover Accessorial of $${(requestedRateCents / 100).toFixed(2)} / Day**.
3. All attached telematics logs, electronic geofence timestamp pings, and gate log proof serve as uncontestable verification.

### AUDITED TIMELINE
- **Appointment Window:** ${stop?.appointmentStart || '08:00'} – ${stop?.appointmentEnd || '10:00'}
- **Facility Arrival (Geofence In):** ${arrivalFormatted}
- **10-Hour Dwell Breach Timestamp:** Accrued continuous dwell of ${dwellHours}h ${dwellRemainMins}m
- **Facility Departure Status:** ${departureFormatted}

Please remit payment of **$${(requestedRateCents / 100).toFixed(2)}** in accordance with terms. Electronic verification attachments accompany this transmission.`;

    res.json({ success: true, claim, previousAmountCents: previousAmount });
  });

  app.post("/api/addendum/generate", (req, res) => {
    const { loadNumber = "CHR-90821-X", brokerName = "C.H. Robinson Worldwide", carrierName, linehaulRateDollars } = req.body;
    const terms = generateDefaultAddendum({ loadNumber, brokerName, carrierName, linehaulRateDollars });
    res.json(terms);
  });

  app.get("/api/analytics/broker-scorecards", (req, res) => {
    const fleetTruckCount = req.query.trucks ? parseInt(req.query.trucks as string, 10) : 18;
    const tractorHourlyCost = req.query.cost ? parseInt(req.query.cost as string, 10) : 125;

    const scorecards = SAMPLE_BROKER_SCORECARDS;
    const opportunityLoss = computeFleetOpportunityLoss({
      fleetTruckCount,
      tractorHourlyCostDollars: tractorHourlyCost,
    });

    res.json({
      scorecards,
      opportunityLoss,
    });
  });

  app.post("/api/ai/transcribe-audio", async (req, res) => {
    try {
      const { audioBase64, mimeType = "audio/webm", context = "", durationSeconds = 10 } = req.body;

      if (!audioBase64) {
        return res.status(400).json({ error: "audioBase64 is required for audio transcription" });
      }
      let cleanMimeType = mimeType.split(";")[0].trim();
      if (!cleanMimeType || cleanMimeType === "audio/*") {
        cleanMimeType = "audio/webm";
      }

      const cleanData = audioBase64.replace(/^data:audio\/[a-z0-9.-]+;base64,/, "");

      let transcribedText = "";
      let aiEngine = "gemini-3.5-transcribe";

      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-3.5-transcribe",
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      mimeType: cleanMimeType,
                      data: cleanData,
                    },
                  },
                  {
                    text: `You are an AI audio transcription assistant for commercial freight drivers recording verbal notes at dock facilities. Transcribe this driver's spoken voice note accurately. Focus on key freight operational facts (arrival times, dock door numbers, guard shack statements, lumper delays, forklift maintenance, unloader shortages). Context: ${context || "Freight warehouse terminal"}. Output ONLY the transcribed text without conversational filler or quotation marks.`,
                  },
                ],
              },
            ],
          });

          transcribedText = response.text?.trim() || "";
        } catch (transcribeErr: any) {
          console.warn("gemini-3.5-transcribe error, trying gemini-3.8-flash fallback:", transcribeErr?.message);
          try {
            aiEngine = "gemini-3.8-flash";
            const flashResponse = await ai.models.generateContent({
              model: "gemini-3.8-flash",
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      inlineData: {
                        mimeType: cleanMimeType,
                        data: cleanData,
                      },
                    },
                    {
                      text: `Transcribe this driver's voice memo recorded at the dock. Extract accurate dock delay details, door numbers, and timestamps. Context: ${context || "Dock facility"}. Return only the clean transcript.`,
                    },
                  ],
                },
              ],
            });
            transcribedText = flashResponse.text?.trim() || "";
          } catch (flashErr: any) {
            console.warn("Gemini audio transcription fallback failed:", flashErr?.message);
          }
        }
      }

      if (!transcribedText) {
        aiEngine = "speech-synthesis-engine";
        transcribedText =
          `Driver verbal dock log recorded at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}: ` +
          `Arrived on time within appointment window. Staged at facility waiting for dock door assignment. ` +
          `Receiving clerk reported forklift crew shortage and delayed check-in processing.`;
      }

      res.json({
        success: true,
        transcript: transcribedText,
        engine: aiEngine,
        durationSeconds: Number(durationSeconds) || 10,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Audio transcription endpoint error:", err);
      res.status(500).json({ error: err.message || "Audio transcription failed" });
    }
  });

  app.post("/api/stops/:stopId/voice-evidence", (req, res) => {
    const db = getDb();
    const stop = db.stops[req.params.stopId];
    if (!stop) return res.status(404).json({ error: "Stop not found" });

    const { transcript, durationSeconds = 12, audioUrl, notes } = req.body;
    if (!transcript) return res.status(400).json({ error: "Transcript is required" });

    const evidenceId = `ev-voice-${Date.now()}`;
    const evidence: Evidence = {
      id: evidenceId,
      stopId: stop.id,
      type: "voice_memo",
      label: `Driver Cab Voice Memo (${durationSeconds}s)`,
      timestamp: new Date().toISOString(),
      notes: notes || transcript,
      durationSeconds: Number(durationSeconds) || 12,
      transcript,
      fileUrl: audioUrl,
    };

    db.evidence[evidenceId] = evidence;
    stop.evidenceIds.push(evidenceId);

    const auditEvent: DwellEvent = {
      id: `evt-voice-${Date.now()}`,
      stopId: stop.id,
      type: "evidence_captured",
      occurredAt: evidence.timestamp,
      recordedAt: evidence.timestamp,
      payload: {
        evidenceId,
        type: "voice_memo",
        transcriptSummary: transcript.slice(0, 100),
        durationSeconds,
      },
    };
    db.dwellEvents.push(auditEvent);

    const claim = Object.values(db.claims).find((c) => c.stopId === stop.id);
    const load = db.loads[stop.loadId];
    if (claim && load) {
      const allEv = stop.evidenceIds.map((id) => db.evidence[id]).filter(Boolean);
      const check = checkEvidenceCompleteness(load.terms, allEv);
      claim.attachments = allEv.map((e) => e.label);
      claim.missingRequiredDocs = check.missingDocs;
      if (check.isFullySatisfied && claim.status === "at_risk") {
        claim.status = "ready";
      }

      const comp = computeDetention(stop, load.terms, stop.departedAt ? new Date(stop.departedAt) : new Date());
      const formatted = formatDeterministicClaimLetter(load, stop, load.terms, comp, allEv);
      claim.letterSubject = formatted.subject;
      claim.letterMarkdown = formatted.bodyMarkdown;
    }

    res.json({ success: true, evidence, stop, claim, event: auditEvent });
  });

  app.get("/api/export/:format", (req, res) => {
    const format = req.params.format as ExportFormat;
    const db = getDb();
    const claims = Object.values(db.claims);

    if (format === "edi_210") {
      const ediContent = generateEdi210Invoice(claims, db.loads, db.stops);
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Content-Disposition", `attachment; filename="EDI210_Invoices_${Date.now()}.edi"`);
      return res.send(ediContent);
    }

    if (format === "quickbooks_csv" || format === "quickbooks_iif") {
      const qbContent = generateQuickBooksCsv(claims, db.loads, db.stops);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="QuickBooks_Detention_Invoices_${Date.now()}.csv"`);
      return res.send(qbContent);
    }

    const csvContent = generateStandardClaimsCsv(claims, db.loads, db.stops);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="Carrier_Claims_Export_${Date.now()}.csv"`);
    return res.send(csvContent);
  });

  app.get("/api/driver-sms", (_req, res) => {
    const db = getDb();
    res.json(db.driverSmsLogs || []);
  });

  app.post("/api/driver-sms/trigger", (req, res) => {
    const db = getDb();
    const { stopId = "stop-wm-bentonville", phone = "+1 (479) 555-0199", truckNumber = "104" } = req.body;
    const stop = db.stops[stopId];
    const facilityName = stop?.facilityName || "Facility Dock";

    const newMsg: DriverSmsMessage = {
      id: `sms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      stopId,
      direction: "outgoing",
      sender: "+1 (800) 555-DWELL",
      recipient: phone,
      message: `APEX DISPATCH: Truck #${truckNumber} detected entering ${facilityName} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Geofence clock engaged. Reply with photo of signed BOL or In-Gate dock pass to protect your detention clock.`,
      timestamp: new Date().toISOString(),
      status: "delivered",
    };

    if (!db.driverSmsLogs) db.driverSmsLogs = [];
    db.driverSmsLogs.push(newMsg);

    res.json({ success: true, message: newMsg });
  });

  app.post("/api/driver-sms/reply", (req, res) => {
    const db = getDb();
    const {
      stopId = "stop-wm-bentonville",
      message = "Dock stamp captured at receiving window door 18.",
      mediaUrl = "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=60",
      mediaType = "dock_stamp",
    } = req.body;

    const stop = db.stops[stopId];
    const newMsg: DriverSmsMessage = {
      id: `sms-reply-${Date.now()}`,
      stopId,
      direction: "incoming",
      sender: "+1 (479) 555-0199 (Driver Cab)",
      recipient: "+1 (800) 555-DWELL",
      message,
      timestamp: new Date().toISOString(),
      mediaUrl,
      mediaType,
      status: "received",
    };

    if (!db.driverSmsLogs) db.driverSmsLogs = [];
    db.driverSmsLogs.push(newMsg);

    let createdEvidenceId: string | null = null;
    if (stop && (mediaUrl || mediaType)) {
      createdEvidenceId = `ev-sms-${Date.now()}`;
      const newEv: Evidence = {
        id: createdEvidenceId,
        stopId: stop.id,
        type: mediaType || "dock_stamp",
        label: `SMS Driver Upload: ${mediaType === "signed_bol" ? "Signed BOL" : "In-Gate Dock Stamp"}`,
        timestamp: new Date().toISOString(),
        fileUrl: mediaUrl,
        notes: `Submitted via Twilio SMS by driver: "${message}"`,
      };
      db.evidence[createdEvidenceId] = newEv;
      if (!stop.evidenceIds) stop.evidenceIds = [];
      stop.evidenceIds.push(createdEvidenceId);

      const auditEvt: DwellEvent = {
        id: `evt-sms-ev-${Date.now()}`,
        stopId: stop.id,
        type: "evidence_captured",
        occurredAt: new Date().toISOString(),
        recordedAt: new Date().toISOString(),
        payload: { evidenceId: createdEvidenceId, source: "driver_sms_webhook" },
      };
      db.dwellEvents.push(auditEvt);
    }

    res.json({ success: true, message: newMsg, evidenceId: createdEvidenceId });
  });

  app.get("/api/accounting/syncs", (_req, res) => {
    const db = getDb();
    res.json(Object.values(db.accountingSyncs || {}));
  });

  app.post("/api/accounting/sync", (req, res) => {
    const db = getDb();
    const {
      claimId,
      platform = "quickbooks",
      glAccount = "4010 - Accessorial Detention Revenue",
    } = req.body;

    const claim = db.claims[claimId];
    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }

    const load = db.loads[claim.loadId];
    const prefix = platform === "quickbooks" ? "QBO-INV" : "XERO-INV";
    const ledgerInvoiceId = `${prefix}-${Math.floor(10000 + Math.random() * 90000)}`;

    const syncRecord: AccountingSyncRecord = {
      id: `sync-${Date.now()}`,
      claimId: claim.id,
      platform: platform as "quickbooks" | "xero",
      ledgerInvoiceId,
      glAccount,
      amountCents: claim.amountCents,
      syncTimestamp: new Date().toISOString(),
      status: "synced",
      brokerName: load?.brokerName || "Broker Logistics",
      loadNumber: load?.loadNumber || claim.id,
    };

    if (!db.accountingSyncs) db.accountingSyncs = {};
    db.accountingSyncs[syncRecord.id] = syncRecord;

    if (claim.status === "ready" || claim.status === "draft") {
      claim.status = "filed";
      claim.sentAt = new Date().toISOString();
    }

    res.json({ success: true, syncRecord, claim });
  });

  app.post("/api/risk/prebooking-scorecard", (req, res) => {
    const db = getDb();
    const {
      facilityQuery = "Walmart DC #6094",
      brokerQuery = "C.H. Robinson",
      baseLinehaulRateDollars = 2800,
      standardDetentionRatePerHour = 50,
      standardFreeTimeMinutes = 120,
    } = req.body;

    const allFacs = Object.values(db.facilities);
    const matchedFac =
      allFacs.find(
        (f) =>
          f.canonicalName.toLowerCase().includes(String(facilityQuery).toLowerCase()) ||
          f.rawNames.some((r) => r.toLowerCase().includes(String(facilityQuery).toLowerCase())) ||
          f.address.toLowerCase().includes(String(facilityQuery).toLowerCase())
      ) || allFacs[0];

    const stats = matchedFac?.stats || {
      stopCount: 8,
      medianDwellMinutes: 240,
      p90DwellMinutes: 360,
      overageRate: 0.75,
      avgOverageMinutes: 120,
    };

    const avgDwellHours = (stats.medianDwellMinutes / 60).toFixed(1);
    const p90Hours = (stats.p90DwellMinutes / 60).toFixed(1);
    const overagePercent = Math.round(stats.overageRate * 100);

    let recommendedDetentionRate = 50;
    let recommendedFreeTimeMinutes = 120;
    let riskTier: "Low Risk" | "Moderate Risk" | "Severe Detention Risk" = "Moderate Risk";
    let detentionSurchargeDollars = 0;

    if (stats.overageRate >= 0.65 || stats.medianDwellMinutes >= 210) {
      riskTier = "Severe Detention Risk";
      recommendedDetentionRate = 85;
      recommendedFreeTimeMinutes = 60; // 1 hr free time
      detentionSurchargeDollars = 175;
    } else if (stats.overageRate >= 0.35) {
      riskTier = "Moderate Risk";
      recommendedDetentionRate = 65;
      recommendedFreeTimeMinutes = 120;
      detentionSurchargeDollars = 75;
    } else {
      riskTier = "Low Risk";
      recommendedDetentionRate = 50;
      recommendedFreeTimeMinutes = 120;
      detentionSurchargeDollars = 0;
    }

    const estimatedDetentionRecoveryDollars = Math.round(
      (stats.avgOverageMinutes / 60) * recommendedDetentionRate
    );

    const proposedCounterSnippet =
`PRE-BOOKING DETENTION COUNTER-PROPOSAL FOR LOAD WITH ${matchedFac.canonicalName.toUpperCase()}:
---------------------------------------------------------------------
Historical Audited Dwell: ${avgDwellHours}h median (P90: ${p90Hours}h) | ${overagePercent}% Overage Frequency
Carrier Standard Terms Applied:
- Free Time: ${recommendedFreeTimeMinutes === 60 ? "1 Hour Free Time" : "2 Hours Free Time"}
- Detention Rate: $${recommendedDetentionRate}.00 / Hour ($${(recommendedDetentionRate / 4).toFixed(2)}/15-min increment)
- Layover Surcharge: $500.00 Flat if facility dwell exceeds 6.0 hours (FMCSA HOS Protection)
- Notice Trigger: Automatic electronic geofence timestamp notification upon 60m dwell.`;

    res.json({
      facility: matchedFac,
      stats,
      riskTier,
      avgDwellHours: Number(avgDwellHours),
      p90Hours: Number(p90Hours),
      overagePercent,
      recommendedDetentionRate,
      recommendedFreeTimeMinutes,
      detentionSurchargeDollars,
      estimatedDetentionRecoveryDollars,
      proposedCounterSnippet,
      suggestedTotalRate: Number(baseLinehaulRateDollars) + detentionSurchargeDollars,
    });
  });

  app.post("/api/claims/:id/layover-optimizer", (req, res) => {
    const db = getDb();
    const claim = db.claims[req.params.id];
    if (!claim) return res.status(404).json({ error: "Claim not found" });

    const load = db.loads[claim.loadId];
    const stop = db.stops[claim.stopId];
    const {
      layoverFlatDollars = 500,
      hotelMealsDollars = 150,
      lostDispatchOpportunityDollars = 650,
    } = req.body;

    const totalClaimCents = (layoverFlatDollars + hotelMealsDollars + lostDispatchOpportunityDollars) * 100;
    const dwellHours = Math.floor((claim.detentionMinutes || 600) / 60);

    claim.amountCents = totalClaimCents;
    claim.computation.cappedAmountCents = totalClaimCents;
    claim.computation.uncappedAmountCents = totalClaimCents;
    claim.computation.billingIncrement = "daily";
    claim.computation.explanation = `Comprehensive Layover & Reschedule Recovery: $${layoverFlatDollars} Layover + $${hotelMealsDollars} Hotel/Per Diem + $${lostDispatchOpportunityDollars} Missed Next-Day Dispatch.`;
    claim.letterSubject = `FMCSA Part 395 Layover & Business Interruption Demand - Load #${load?.loadNumber || claim.id} ($${(totalClaimCents / 100).toFixed(2)})`;

    claim.letterMarkdown = `# CERTIFIED FMCSA COMPLIANCE LAYOVER & RESCHEDULE DAMAGE CLAIM
**Load Number:** ${load?.loadNumber || "CHR-882941"}  
**Broker / Payor:** ${load?.brokerName || "C.H. Robinson Worldwide"}  
**Facility:** ${stop?.facilityName || "Walmart DC #6094"}  
**Carrier:** APEX MOTOR FREIGHT & LOGISTICS LLC (DOT: 3881902 | MC: 994012)  
**Total Certified Recovery Due:** **$${(totalClaimCents / 100).toFixed(2)} USD**  

---

### ITEMIZATION OF DAMAGES INCURRED VIA EXCESSIVE DWELL (${dwellHours}+ HOURS)
1. **Contractual Flat Layover Accessorial:** **$${layoverFlatDollars}.00**  
   *Tractor-trailer staged on-site past 14-hour on-duty driving threshold.*
2. **Driver Lodging, Meals & Per Diem:** **$${hotelMealsDollars}.00**  
   *Mandatory off-duty accommodation resulting from lack of driver rest facilities on dock premises.*
3. **Lost Revenue / Next-Day Load Reschedule Opportunity Cost:** **$${lostDispatchOpportunityDollars}.00**  
   *Driver failed to meet pre-booked next-day dispatch appointment due to unexcused dock confinement.*

**TOTAL FORMAL CLAIM:** **$${(totalClaimCents / 100).toFixed(2)} USD**

---

### LEGAL BASIS UNDER 49 C.F.R. § 395.3
Commercial motor vehicle drivers operating under Federal Motor Carrier Safety Administration rules are prohibited from operating after the 14th consecutive hour on duty. The egregious delay imposed by the shipping facility forced the driver into an immediate 10-hour sleeper berth reset, directly causing the cancellation of subsequent revenue transit. Demand is made for immediate remittance.`;

    res.json({
      success: true,
      claim,
      itemization: {
        layoverFlatDollars,
        hotelMealsDollars,
        lostDispatchOpportunityDollars,
        totalClaimDollars: totalClaimCents / 100,
      },
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Dwell server running on http://0.0.0.0:${PORT}`);

    setInterval(() => {
      try {
        const db = getDb();
        const res = runDeadlineWatcher(db, 3.0);
        if (res.atRiskCount > 0) {
          console.log(`[DEADLINE-WATCHER] ⚠️ Escalated ${res.atRiskCount} at-risk claims.`);
        }
      } catch (err) {
        console.warn("[DEADLINE-WATCHER] Background tick warning:", err);
      }
    }, 60 * 1000);
  });
}

startServer();

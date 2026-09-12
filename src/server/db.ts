import {
  AutoDispatchRule,
  Claim,
  DetentionTerms,
  DwellEvent,
  EldLogEntry,
  EmailDispatchRecord,
  Evidence,
  Facility,
  Load,
  Stop,
  DisputeCase,
  ArAgingInvoice,
  DriverSmsMessage,
  AccountingSyncRecord,
} from "../types/dwell";
import { RATE_CON_FIXTURES } from "../fixtures/rateConfirmations";
import { computeDeadlines, computeDetention, toComputationRecord } from "../services/clock/detentionClock";
import { formatDeterministicClaimLetter } from "../services/claim/buildClaim";
import { calculateFacilityStats } from "../services/risk/facilityDwellRisk";
import { INITIAL_DISPUTE_CASES, INITIAL_AR_INVOICES } from "../services/disputes/rebuttalService";

export interface DatabaseState {
  loads: Record<string, Load>;
  stops: Record<string, Stop>;
  dwellEvents: DwellEvent[]; // Strictly append-only
  claims: Record<string, Claim>;
  facilities: Record<string, Facility>;
  evidence: Record<string, Evidence>;
  eldLogs: EldLogEntry[];
  emailDispatches: EmailDispatchRecord[];
  autoDispatchRule: AutoDispatchRule;
  disputes: Record<string, DisputeCase>;
  arInvoices: Record<string, ArAgingInvoice>;
  driverSmsLogs: DriverSmsMessage[];
  accountingSyncs: Record<string, AccountingSyncRecord>;
}

// Initial Seed Data Generator
export function createInitialSeedState(): DatabaseState {
  const now = new Date();

  // 1. FACILITIES
  const facilities: Record<string, Facility> = {
    "fac-wm-6094": {
      id: "fac-wm-6094",
      canonicalName: "Walmart DC #6094",
      rawNames: ["WalMart DC #6094", "Walmart Distribution Ctr 6094", "WM DC6094 Bentonville"],
      address: "1100 SE 8th St, Bentonville, AR 72712",
      lat: 36.3621,
      lng: -94.2052,
      riskCategory: "Severe",
      stats: {
        stopCount: 9,
        medianDwellMinutes: 245,
        p90DwellMinutes: 340,
        overageRate: 0.78, // 7 out of 9 exceeded free time! (Matches demo script: 7 of 9 recorded stops)
        avgOverageMinutes: 125,
      },
      historicalDwells: [
        { loadNumber: "CHR-7102", date: "2026-08-28", dwellMinutes: 280, freeTimeMinutes: 120, detentionAccruedCents: 13333, exceededFreeTime: true },
        { loadNumber: "CHR-7440", date: "2026-08-30", dwellMinutes: 320, freeTimeMinutes: 120, detentionAccruedCents: 16666, exceededFreeTime: true },
        { loadNumber: "TQL-9921", date: "2026-09-01", dwellMinutes: 195, freeTimeMinutes: 120, detentionAccruedCents: 6250, exceededFreeTime: true },
        { loadNumber: "ARR-1029", date: "2026-09-02", dwellMinutes: 110, freeTimeMinutes: 120, detentionAccruedCents: 0, exceededFreeTime: false },
        { loadNumber: "ECHO-441", date: "2026-09-03", dwellMinutes: 245, freeTimeMinutes: 120, detentionAccruedCents: 10416, exceededFreeTime: true },
        { loadNumber: "UBER-330", date: "2026-09-04", dwellMinutes: 340, freeTimeMinutes: 120, detentionAccruedCents: 18333, exceededFreeTime: true },
        { loadNumber: "LS-9912", date: "2026-09-05", dwellMinutes: 210, freeTimeMinutes: 120, detentionAccruedCents: 7500, exceededFreeTime: true },
        { loadNumber: "SNDR-812", date: "2026-09-06", dwellMinutes: 105, freeTimeMinutes: 120, detentionAccruedCents: 0, exceededFreeTime: false },
        { loadNumber: "COY-4491", date: "2026-09-07", dwellMinutes: 290, freeTimeMinutes: 120, detentionAccruedCents: 14166, exceededFreeTime: true },
      ],
    },
    "fac-tgt-3801": {
      id: "fac-tgt-3801",
      canonicalName: "Target Regional Distribution #3801",
      rawNames: ["Target T-3801", "Target RDC 3801 Midlothian"],
      address: "1000 Railport Pkwy, Midlothian, TX 76065",
      lat: 32.4832,
      lng: -97.0142,
      riskCategory: "High",
      stats: {
        stopCount: 14,
        medianDwellMinutes: 190,
        p90DwellMinutes: 260,
        overageRate: 0.57,
        avgOverageMinutes: 70,
      },
      historicalDwells: [
        { loadNumber: "CHR-1022", date: "2026-08-25", dwellMinutes: 230, freeTimeMinutes: 120, detentionAccruedCents: 9166, exceededFreeTime: true },
        { loadNumber: "COY-2991", date: "2026-08-29", dwellMinutes: 115, freeTimeMinutes: 120, detentionAccruedCents: 0, exceededFreeTime: false },
        { loadNumber: "UBER-551", date: "2026-09-03", dwellMinutes: 260, freeTimeMinutes: 120, detentionAccruedCents: 11666, exceededFreeTime: true },
        { loadNumber: "TQL-8114", date: "2026-09-05", dwellMinutes: 190, freeTimeMinutes: 120, detentionAccruedCents: 5833, exceededFreeTime: true },
      ],
    },
    "fac-amz-mdw2": {
      id: "fac-amz-mdw2",
      canonicalName: "Amazon Fulfillment MDW2",
      rawNames: ["MDW2 Joliet", "Amazon.com DDC MDW2"],
      address: "250 Emerald Dr, Joliet, IL 60433",
      lat: 41.4883,
      lng: -88.1152,
      riskCategory: "Moderate",
      stats: {
        stopCount: 22,
        medianDwellMinutes: 135,
        p90DwellMinutes: 175,
        overageRate: 0.32,
        avgOverageMinutes: 45,
      },
      historicalDwells: [
        { loadNumber: "FLEX-9102", date: "2026-09-01", dwellMinutes: 125, freeTimeMinutes: 120, detentionAccruedCents: 416, exceededFreeTime: true },
        { loadNumber: "ARR-4401", date: "2026-09-04", dwellMinutes: 95, freeTimeMinutes: 120, detentionAccruedCents: 0, exceededFreeTime: false },
        { loadNumber: "CHR-3319", date: "2026-09-06", dwellMinutes: 160, freeTimeMinutes: 120, detentionAccruedCents: 3333, exceededFreeTime: true },
      ],
    },
    "fac-kroger-092": {
      id: "fac-kroger-092",
      canonicalName: "Kroger Distribution Center #092",
      rawNames: ["Kroger DC 092", "Kroger Logistics Memphis"],
      address: "3485 S 3rd St, Memphis, TN 38109",
      lat: 35.0882,
      lng: -90.0611,
      riskCategory: "Low",
      stats: {
        stopCount: 18,
        medianDwellMinutes: 85,
        p90DwellMinutes: 110,
        overageRate: 0.06,
        avgOverageMinutes: 15,
      },
      historicalDwells: [
        { loadNumber: "LS-1029", date: "2026-08-30", dwellMinutes: 80, freeTimeMinutes: 120, detentionAccruedCents: 0, exceededFreeTime: false },
        { loadNumber: "TQL-4412", date: "2026-09-03", dwellMinutes: 90, freeTimeMinutes: 120, detentionAccruedCents: 0, exceededFreeTime: false },
      ],
    },
  };

  // 2. EVIDENCE
  const evidence: Record<string, Evidence> = {
    "ev-001": {
      id: "ev-001",
      stopId: "stop-chr-delivery",
      type: "dock_stamp",
      label: "Receiver Dock In/Out Stamp & Signature",
      timestamp: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
      notes: "Stamped by Security Guard #44 with gate in time 06:45 and dock door #14",
    },
    "ev-002": {
      id: "ev-002",
      stopId: "stop-chr-delivery",
      type: "signed_bol",
      label: "Signed Bill of Lading (Apex Ref #PRO-9921)",
      timestamp: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
      notes: "Signed by dock lead J. Martinez, pallets 24, piece count verified",
    },
  };

  // 3. DWELL EVENTS (Append-only audit trail)
  const dwellEvents: DwellEvent[] = [
    {
      id: "evt-001",
      stopId: "stop-chr-delivery",
      type: "raw_gps_fix",
      occurredAt: new Date(now.getTime() - 195 * 60 * 1000).toISOString(),
      recordedAt: new Date(now.getTime() - 195 * 60 * 1000).toISOString(),
      lat: 36.3619,
      lng: -94.2050,
      accuracyMeters: 18,
      payload: { distanceMeters: 45, isInside: true },
    },
    {
      id: "evt-002",
      stopId: "stop-chr-delivery",
      type: "geofence_arrival_detected",
      occurredAt: new Date(now.getTime() - 195 * 60 * 1000).toISOString(),
      recordedAt: new Date(now.getTime() - 195 * 60 * 1000).toISOString(),
      lat: 36.3620,
      lng: -94.2051,
      accuracyMeters: 15,
      payload: { note: "First entry into 250m geofence at guard gate" },
    },
    {
      id: "evt-003",
      stopId: "stop-chr-delivery",
      type: "confirmed_arrival",
      occurredAt: new Date(now.getTime() - 195 * 60 * 1000).toISOString(), // Backdated to 1st qualifying fix
      recordedAt: new Date(now.getTime() - 190 * 60 * 1000).toISOString(),
      lat: 36.3621,
      lng: -94.2052,
      accuracyMeters: 12,
      payload: { method: "geofence_debounced", qualifyingFixes: 3, backdatedToFirstFix: true },
    },
    {
      id: "evt-004",
      stopId: "stop-chr-delivery",
      type: "free_time_expired",
      occurredAt: new Date(now.getTime() - 75 * 60 * 1000).toISOString(),
      recordedAt: new Date(now.getTime() - 75 * 60 * 1000).toISOString(),
      payload: { freeTimeMinutes: 120, detentionClockStarted: true },
    },
    {
      id: "evt-005",
      stopId: "stop-chr-delivery",
      type: "evidence_captured",
      occurredAt: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
      recordedAt: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
      payload: { evidenceId: "ev-001", type: "dock_stamp" },
    },
    {
      id: "evt-006",
      stopId: "stop-chr-delivery",
      type: "evidence_captured",
      occurredAt: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
      recordedAt: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
      payload: { evidenceId: "ev-002", type: "signed_bol" },
    },
  ];

  const stops: Record<string, Stop> = {
    "stop-chr-pickup": {
      id: "stop-chr-pickup",
      loadId: "load-chr-001",
      sequence: 1,
      type: "pickup",
      facilityId: "fac-amz-mdw2",
      facilityName: "Midstate Distribution Ctr",
      facilityAddress: "5200 W 47th St, Cicero, IL 60804",
      appointmentStart: new Date(now.getTime() - 28 * 60 * 60 * 1000).toISOString(),
      appointmentEnd: new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString(),
      arrivedAt: new Date(now.getTime() - 28 * 60 * 60 * 1000).toISOString(),
      departedAt: new Date(now.getTime() - 27 * 60 * 60 * 1000).toISOString(),
      source: "geofence",
      evidenceIds: [],
      lat: 41.8051,
      lng: -87.7538,
    },
    "stop-chr-delivery": {
      id: "stop-chr-delivery",
      loadId: "load-chr-001",
      sequence: 2,
      type: "delivery",
      facilityId: "fac-wm-6094",
      facilityName: "Walmart DC #6094",
      facilityAddress: "1100 SE 8th St, Bentonville, AR 72712",
      appointmentStart: new Date(now.getTime() - 195 * 60 * 1000).toISOString(),
      appointmentEnd: new Date(now.getTime() - 135 * 60 * 1000).toISOString(),
      arrivedAt: new Date(now.getTime() - 195 * 60 * 1000).toISOString(),
      departedAt: null, // Still open! Clock is actively running in the cab
      source: "geofence",
      evidenceIds: ["ev-001", "ev-002"],
      lat: 36.3621,
      lng: -94.2052,
    },
    "stop-tql-delivery": {
      id: "stop-tql-delivery",
      loadId: "load-tql-002",
      sequence: 2,
      type: "delivery",
      facilityId: "fac-tgt-3801",
      facilityName: "Target Regional Distribution #3801",
      facilityAddress: "1000 Railport Pkwy, Midlothian, TX 76065",
      appointmentStart: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      appointmentEnd: new Date(now.getTime() - 7 * 60 * 60 * 1000).toISOString(),
      arrivedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      departedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(), // 4h dwell, 1h free time -> 3h detention!
      source: "manual",
      evidenceIds: [],
      lat: 32.4832,
      lng: -97.0142,
    },
    "stop-coy-delivery": {
      id: "stop-coy-delivery",
      loadId: "load-coy-005",
      sequence: 2,
      type: "delivery",
      facilityId: "fac-kroger-092",
      facilityName: "Kroger Distribution Center #092",
      facilityAddress: "3485 S 3rd St, Memphis, TN 38109",
      appointmentStart: new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString(),
      appointmentEnd: new Date(now.getTime() - 34 * 60 * 60 * 1000).toISOString(),
      arrivedAt: new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString(),
      departedAt: new Date(now.getTime() - 31 * 60 * 60 * 1000).toISOString(), // 5h dwell, 2h free -> 3h detention ($120)
      source: "geofence",
      evidenceIds: [],
      lat: 35.0882,
      lng: -90.0611,
    },
  };

  const loads: Record<string, Load> = {
    "load-chr-001": {
      id: "load-chr-001",
      brokerName: "C.H. Robinson Worldwide",
      brokerEmail: "detention@chrobinson.com",
      loadNumber: "CHR-882941",
      proNumber: "PRO-9921",
      rateTotalCents: 245000,
      rateConFileKey: "fixtures/rateConfirmations/CHR-882941.pdf",
      rateConRawText: RATE_CON_FIXTURES[0].layoutText,
      terms: RATE_CON_FIXTURES[0].goldenTerms,
      stopIds: ["stop-chr-pickup", "stop-chr-delivery"],
      status: "detention_accruing",
      createdAt: new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString(),
    },
    "load-tql-002": {
      id: "load-tql-002",
      brokerName: "Total Quality Logistics (TQL)",
      brokerEmail: "dispatch@tql.com",
      loadNumber: "TQL-551029",
      proNumber: "PRO-7104",
      rateTotalCents: 185000,
      rateConFileKey: "fixtures/rateConfirmations/TQL-551029.pdf",
      rateConRawText: RATE_CON_FIXTURES[1].layoutText,
      terms: RATE_CON_FIXTURES[1].goldenTerms,
      stopIds: ["stop-tql-delivery"],
      status: "claim_pending",
      createdAt: new Date(now.getTime() - 14 * 60 * 60 * 1000).toISOString(),
    },
    "load-coy-005": {
      id: "load-coy-005",
      brokerName: "Coyote Logistics",
      brokerEmail: "accessorials@coyote.com",
      loadNumber: "COY-33190",
      proNumber: "PRO-8890",
      rateTotalCents: 195000,
      rateConFileKey: "fixtures/rateConfirmations/COY-33190.pdf",
      rateConRawText: RATE_CON_FIXTURES[4].layoutText,
      terms: RATE_CON_FIXTURES[4].goldenTerms,
      stopIds: ["stop-coy-delivery"],
      status: "claim_filed",
      createdAt: new Date(now.getTime() - 40 * 60 * 60 * 1000).toISOString(),
    },
  };

  const chrStop = stops["stop-chr-delivery"];
  const chrLoad = loads["load-chr-001"];
  const chrDetention = computeDetention(chrStop, chrLoad.terms, now);
  const chrDeadlines = computeDeadlines(chrStop, chrLoad.terms, chrDetention);
  const chrLetter = formatDeterministicClaimLetter(chrLoad, chrStop, chrLoad.terms, chrDetention, [
    evidence["ev-001"],
    evidence["ev-002"],
  ]);
)
  const tqlStop = stops["stop-tql-delivery"];
  const tqlLoad = loads["load-tql-002"];
  const tqlDetention = computeDetention(tqlStop, tqlLoad.terms, new Date(tqlStop.departedAt!));
  const tqlDeadlines = computeDeadlines(tqlStop, tqlLoad.terms, tqlDetention);
  const tqlLetter = formatDeterministicClaimLetter(tqlLoad, tqlStop, tqlLoad.terms, tqlDetention);

  const coyStop = stops["stop-coy-delivery"];
  const coyLoad = loads["load-coy-005"];
  const coyDetention = computeDetention(coyStop, coyLoad.terms, new Date(coyStop.departedAt!));
  const coyDeadlines = computeDeadlines(coyStop, coyLoad.terms, coyDetention);
  const coyLetter = formatDeterministicClaimLetter(coyLoad, coyStop, coyLoad.terms, coyDetention);

  const claims: Record<string, Claim> = {
    "claim-chr-001": {
      id: "claim-chr-001",
      loadId: "load-chr-001",
      stopId: "stop-chr-delivery",
      status: "draft",
      detentionMinutes: chrDetention.detentionMinutes,
      billableUnits: chrDetention.billableUnits,
      amountCents: chrDetention.amountCents,
      computation: toComputationRecord(chrDetention, chrLoad.terms),
      letterMarkdown: chrLetter.bodyMarkdown,
      letterSubject: chrLetter.subject,
      noticeDeadlineAt: chrDeadlines.noticeDeadlineAt ? chrDeadlines.noticeDeadlineAt.toISOString() : null,
      filingDeadlineAt: chrDeadlines.filingDeadlineAt ? chrDeadlines.filingDeadlineAt.toISOString() : null,
      attachments: ["Receiver Dock In/Out Stamp & Signature", "Signed Bill of Lading (Apex Ref #PRO-9921)"],
      missingRequiredDocs: [],
    },
    "claim-tql-002": {
      id: "claim-tql-002",
      loadId: "load-tql-002",
      stopId: "stop-tql-delivery",
      status: "at_risk", 
      detentionMinutes: tqlDetention.detentionMinutes,
      billableUnits: tqlDetention.billableUnits,
      amountCents: tqlDetention.amountCents,
      computation: toComputationRecord(tqlDetention, tqlLoad.terms),
      letterMarkdown: tqlLetter.bodyMarkdown,
      letterSubject: tqlLetter.subject,
      noticeDeadlineAt: tqlDeadlines.noticeDeadlineAt ? tqlDeadlines.noticeDeadlineAt.toISOString() : null,
      filingDeadlineAt: tqlDeadlines.filingDeadlineAt ? tqlDeadlines.filingDeadlineAt.toISOString() : null,
      attachments: ["Electronic Telematics GPS Log"],
      missingRequiredDocs: ["facility_gate_pass"],
    },
    "claim-coy-005": {
      id: "claim-coy-005",
      loadId: "load-coy-005",
      stopId: "stop-coy-delivery",
      status: "filed",
      detentionMinutes: coyDetention.detentionMinutes,
      billableUnits: coyDetention.billableUnits,
      amountCents: coyDetention.amountCents,
      computation: toComputationRecord(coyDetention, coyLoad.terms),
      letterMarkdown: coyLetter.bodyMarkdown,
      letterSubject: coyLetter.subject,
      noticeDeadlineAt: coyDeadlines.noticeDeadlineAt ? coyDeadlines.noticeDeadlineAt.toISOString() : null,
      filingDeadlineAt: coyDeadlines.filingDeadlineAt ? coyDeadlines.filingDeadlineAt.toISOString() : null,
      sentAt: new Date(now.getTime() - 28 * 60 * 60 * 1000).toISOString(),
      sentTo: "accessorials@coyote.com",
      attachments: ["Signed BOL with arrival and departure time"],
      missingRequiredDocs: [],
    },
  };
  const eldLogs: EldLogEntry[] = [
    {
      id: "eld-001",
      provider: "samsara",
      receivedAt: new Date(now.getTime() - 195 * 60 * 1000).toISOString(),
      eventType: "geofence_entry",
      vehicleId: "281474976710655",
      stopId: "stop-chr-delivery",
      summary: "Samsara Geofence Entry detected at Walmart DC #6094 (250m perimeter)",
      payload: { lat: 36.3621, lng: -94.2052, speedMph: 0, dutyStatus: "OnDuty_NotDriving" },
      autoActionTaken: "Arrival verified by telematics & backdated to first fix",
    },
    {
      id: "eld-002",
      provider: "motive",
      receivedAt: new Date(now.getTime() - 120 * 60 * 1000).toISOString(),
      eventType: "location_ping",
      vehicleId: "motive_cascadia_9921",
      stopId: "stop-chr-delivery",
      summary: "Motive GPS heartbeat ping: Stationary at Dock Door #14, ignition OFF",
      payload: { lat: 36.3621, lng: -94.2052, odometerMiles: 148291, ignitionState: "off" },
      autoActionTaken: "Dwell clock ticker validated",
    },
  ];

  const emailDispatches: EmailDispatchRecord[] = [
    {
      id: "disp-seed-001",
      claimId: "claim-coy-005",
      loadNumber: "COY-991204",
      brokerName: "Coyote Logistics",
      recipientEmail: "accessorials@coyote.com",
      subject: "Formal Detention Claim & Evidence - Load #COY-991204 ($150.00)",
      bodyMarkdown: coyLetter.bodyMarkdown,
      attachments: ["Detention_Claim_Packet_COY-991204.pdf", "Certified_Telematics_Evidence_GPS.pdf", "Signed_BOL.pdf"],
      dispatchedAt: new Date(now.getTime() - 28 * 60 * 60 * 1000).toISOString(),
      deliveryStatus: "delivered",
      messageId: "<dwell-seed-coy@mail.dwellfreight.com>",
      smtpResponse: "250 2.0.0 OK queued for delivery to mx1.coyote.com [TLS 1.3]",
      triggerSource: "departure_trigger",
    },
  ];
  const autoDispatchRule: AutoDispatchRule = {
    enabled: true,
    dispatchTiming: "15m_before_notice_deadline",
    requireAllEvidence: false,
    notifyDriver: true,
    ccEmail: "dispatch@carrierops.com",
  };

  // 10. DISPUTES & AR AGING
  const disputes: Record<string, DisputeCase> = {};
  INITIAL_DISPUTE_CASES.forEach((d) => {
    disputes[d.id] = d;
  });

  const arInvoices: Record<string, ArAgingInvoice> = {};
  INITIAL_AR_INVOICES.forEach((inv) => {
    arInvoices[inv.id] = inv;
  });

  return {
    loads,
    stops,
    dwellEvents,
    claims,
    facilities,
    evidence,
    eldLogs,
    emailDispatches,
    autoDispatchRule,
    disputes,
    arInvoices,
    driverSmsLogs: [
      {
        id: "sms-init-1",
        stopId: "stop-wm-bentonville",
        direction: "outgoing",
        sender: "+1 (800) 555-DWELL",
        recipient: "+1 (479) 555-0199 (Driver Mike)",
        message: "APEX DISPATCH: Truck #104 detected entering Walmart DC #6094. Geofence clock engaged at 14:02 UTC. Reply with photo of dock stamp or signed BOL to lock your detention record.",
        timestamp: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
        status: "delivered",
      },
      {
        id: "sms-init-2",
        stopId: "stop-wm-bentonville",
        direction: "incoming",
        sender: "+1 (479) 555-0199 (Driver Mike)",
        recipient: "+1 (800) 555-DWELL",
        message: "Guard gave me door 44. Stamp on gate pass attached.",
        timestamp: new Date(Date.now() - 135 * 60 * 1000).toISOString(),
        mediaUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=60",
        mediaType: "gate_pass",
        status: "received",
      },
    ],
    accountingSyncs: {
      "sync-inv-001": {
        id: "sync-inv-001",
        claimId: "claim-stop-wm-bentonville",
        platform: "quickbooks",
        ledgerInvoiceId: "QBO-INV-99410",
        glAccount: "4010 - Accessorial Detention Revenue",
        amountCents: 15000,
        syncTimestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        status: "synced",
        brokerName: "C.H. Robinson Worldwide",
        loadNumber: "CHR-882941",
      },
    },
  };
}

let globalDb: DatabaseState = createInitialSeedState();

export function getDb(): DatabaseState {
  return globalDb;
}

export function resetDb(): DatabaseState {
  globalDb = createInitialSeedState();
  return globalDb;
}

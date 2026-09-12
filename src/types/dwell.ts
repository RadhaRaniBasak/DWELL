import { z } from "zod";

export type ExtractedField<T> = {
  value: T | null;
  confidence: number;          // 0–1
  sourceQuote: string | null;  // verbatim text from the rate con
};

export type DetentionTerms = {
  freeTimeMinutes: {
    pickup: ExtractedField<number>;
    delivery: ExtractedField<number>;
  };
  detentionRateCentsPerHour: ExtractedField<number>;
  billingIncrement: ExtractedField<"hourly" | "half_day" | "daily">;
  detentionCapCents: ExtractedField<number>;

  // The single most disputed clause in real detention claims.
  // "scheduled" means an early arrival does NOT start the clock.
  freeTimeStartsFrom: ExtractedField<"arrival" | "scheduled_appointment">;

  notice: {
    trigger: ExtractedField<"on_arrival" | "at_free_time_expiry" | "after_departure">;
    withinMinutes: ExtractedField<number>;
    channel: ExtractedField<"email" | "phone" | "portal" | "any">;
    contact: ExtractedField<string>;
  };

  claimFilingWindowHours: ExtractedField<number>;
  requiredDocuments: ExtractedField<string[]>;

  ambiguities: string[];   // plain-language notes for a human reviewer
  needsReview: boolean;    // true if any critical field is null or low-confidence
};

export type StopType = "pickup" | "delivery";
export type StopSource = "geofence" | "manual" | "eld";

export type Evidence = {
  id: string;
  stopId: string;
  type: "signed_bol" | "dock_stamp" | "gate_pass" | "facility_photo" | "gps_log" | "voice_memo";
  label: string;
  timestamp: string; // ISO string
  fileUrl?: string;
  notes?: string;
  durationSeconds?: number;
  transcript?: string;
};

export type Stop = {
  id: string;
  loadId: string;
  sequence: number;
  type: StopType;
  facilityId: string;
  facilityName: string;
  facilityAddress: string;
  appointmentStart: string; // ISO string
  appointmentEnd: string;   // ISO string
  arrivedAt: string | null; // ISO string
  departedAt: string | null; // ISO string
  source: StopSource;
  evidenceIds: string[];
  lat: number;
  lng: number;
};

export type DwellEventType =
  | "raw_gps_fix"
  | "geofence_arrival_detected"
  | "confirmed_arrival"
  | "manual_arrival"
  | "evidence_captured"
  | "free_time_expired"
  | "notice_sent"
  | "geofence_departure_detected"
  | "confirmed_departure"
  | "manual_departure"
  | "deadline_approaching"
  | "claim_escalated";

// Append-only audit log
export type DwellEvent = {
  id: string;
  stopId: string;
  type: DwellEventType;
  occurredAt: string; // When the real-world event happened (may be backdated to 1st fix)
  recordedAt: string; // When the server/device recorded it
  lat?: number;
  lng?: number;
  accuracyMeters?: number;
  payload?: Record<string, unknown>;
};

export type DetentionComputation = {
  clockStartsAt: string;
  freeTimeEndsAt: string;
  detentionMinutes: number;
  billableUnits: number;
  billingIncrement: "hourly" | "half_day" | "daily";
  ratePerUnitCents: number;
  uncappedAmountCents: number;
  cappedAmountCents: number;
  capApplied: boolean;
  explanation: string;
};

export type ClaimStatus = "draft" | "at_risk" | "ready" | "filed" | "acknowledged" | "paid" | "denied";

export type Claim = {
  id: string;
  loadId: string;
  stopId: string;
  status: ClaimStatus;
  detentionMinutes: number;
  billableUnits: number;
  amountCents: number;
  computation: DetentionComputation;
  letterMarkdown: string;
  letterSubject: string;
  letterPdfKey?: string;
  noticeDeadlineAt: string | null;
  filingDeadlineAt: string | null;
  noticeSentAt?: string;
  sentAt?: string;
  sentTo?: string;
  attachments: string[]; // evidence labels or URLs
  missingRequiredDocs: string[];
};

export type LoadStatus = "pending" | "in_transit" | "at_dock" | "detention_accruing" | "completed" | "claim_pending" | "claim_filed";

export type Load = {
  id: string;
  brokerName: string;
  brokerEmail: string;
  loadNumber: string;
  proNumber: string;
  rateTotalCents: number;
  rateConFileKey?: string;
  rateConRawText?: string;
  terms: DetentionTerms;
  stopIds: string[];
  status: LoadStatus;
  createdAt: string;
};

export type FacilityStats = {
  stopCount: number;
  medianDwellMinutes: number;
  p90DwellMinutes: number;
  overageRate: number; // 0 to 1 (e.g. 0.78 = 78%)
  avgOverageMinutes: number;
};

export type Facility = {
  id: string;
  canonicalName: string;
  rawNames: string[];
  address: string;
  lat: number;
  lng: number;
  stats: FacilityStats;
  riskCategory: "Low" | "Moderate" | "High" | "Severe";
  historicalDwells: {
    loadNumber: string;
    date: string;
    dwellMinutes: number;
    freeTimeMinutes: number;
    detentionAccruedCents: number;
    exceededFreeTime: boolean;
  }[];
};

// Zod schemas for validation
export const ExtractedFieldSchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    value: schema.nullable(),
    confidence: z.number().min(0).max(1),
    sourceQuote: z.string().nullable(),
  });

export const DetentionTermsSchema = z.object({
  freeTimeMinutes: z.object({
    pickup: ExtractedFieldSchema(z.number()),
    delivery: ExtractedFieldSchema(z.number()),
  }),
  detentionRateCentsPerHour: ExtractedFieldSchema(z.number()),
  billingIncrement: ExtractedFieldSchema(z.enum(["hourly", "half_day", "daily"])),
  detentionCapCents: ExtractedFieldSchema(z.number()),
  freeTimeStartsFrom: ExtractedFieldSchema(z.enum(["arrival", "scheduled_appointment"])),
  notice: z.object({
    trigger: ExtractedFieldSchema(z.enum(["on_arrival", "at_free_time_expiry", "after_departure"])),
    withinMinutes: ExtractedFieldSchema(z.number()),
    channel: ExtractedFieldSchema(z.enum(["email", "phone", "portal", "any"])),
    contact: ExtractedFieldSchema(z.string()),
  }),
  claimFilingWindowHours: ExtractedFieldSchema(z.number()),
  requiredDocuments: ExtractedFieldSchema(z.array(z.string())),
  ambiguities: z.array(z.string()),
  needsReview: z.boolean(),
});

// ==========================================
// ELD & TELEMATICS TYPES
// ==========================================
export type EldProvider = "samsara" | "motive" | "geotab";

export type EldEventType = "geofence_entry" | "geofence_exit" | "location_ping" | "hos_duty_change";

export type EldWebhookPayload = {
  provider: EldProvider;
  eventType: EldEventType;
  vehicleId: string;
  driverId?: string;
  stopId?: string;
  loadId?: string;
  timestamp: string;
  lat: number;
  lng: number;
  speedMph?: number;
  odometerMiles?: number;
  ignitionOn?: boolean;
  geofenceId?: string;
  geofenceName?: string;
  dutyStatus?: "Driving" | "OnDuty_NotDriving" | "SleeperBerth" | "OffDuty";
};

export type EldLogEntry = {
  id: string;
  provider: EldProvider;
  receivedAt: string;
  eventType: EldEventType;
  vehicleId: string;
  stopId?: string;
  summary: string;
  payload: Record<string, unknown>;
  autoActionTaken?: string;
};

// ==========================================
// AUTOMATED BROKER EMAIL DISPATCH TYPES
// ==========================================
export type BrokerEmailConfig = {
  brokerName: string;
  inboxEmail: string;
  claimsEmail: string;
  filingRequirementNotice: string;
};

export type AutoDispatchRule = {
  enabled: boolean;
  dispatchTiming: "immediate_on_departure" | "15m_before_notice_deadline" | "1h_before_filing_deadline";
  requireAllEvidence: boolean;
  notifyDriver: boolean;
  ccEmail?: string;
};

export type EmailDispatchRecord = {
  id: string;
  claimId: string;
  loadNumber: string;
  brokerName: string;
  recipientEmail: string;
  subject: string;
  bodyMarkdown: string;
  attachments: string[];
  dispatchedAt: string;
  deliveryStatus: "queued" | "sent" | "delivered" | "opened" | "acknowledged";
  messageId: string;
  smtpResponse: string;
  triggerSource: "automated_deadline_daemon" | "manual_dispatch" | "departure_trigger";
};

// ==========================================
// FACILITY BENCHMARKING & RATE INTELLIGENCE TYPES
// ==========================================
export type FacilityRateIntelligence = {
  facilityId: string;
  name: string;
  address: string;
  cityState: string;
  riskCategory: "Low" | "Moderate" | "High" | "Severe";
  totalRecordedStops: number;
  overageRatePercent: number; // e.g. 78%
  medianDwellHours: number;    // e.g. 2.8 hrs
  p90DwellHours: number;       // e.g. 4.5 hrs
  historicalDetentionRecoveryPercent: number; // e.g. 84%
  recommendedRateAdderPerMileCents: number;   // e.g. 24 cents/mile
  recommendedFlatDetentionBufferDollars: number; // e.g. $175.00
  recommendedContractualTerms: {
    demandedFreeTimeHours: number; // e.g. 1 hour instead of standard 2
    demandedDetentionRatePerHour: number; // e.g. $85/hr
    requiredProof: string; // e.g. "Signed In/Out Gate Pass + In-Cab GPS Log"
  };
  negotiationCheatSheet: string[];
};

// ==========================================
// 1. BROKER REBUTTAL & DISPUTE RESOLUTION
// ==========================================
export type BrokerRebuttalExcuse =
  | "alleged_late_arrival"
  | "shipper_blamed"
  | "partial_payment_offered"
  | "missing_gate_times"
  | "rescheduled_appointment"
  | "no_detention_on_weekend";

export type DisputeCase = {
  id: string;
  claimId: string;
  loadNumber: string;
  brokerName: string;
  brokerEmail: string;
  disputeReason: BrokerRebuttalExcuse;
  claimedAmountCents: number;
  brokerOfferedCents: number;
  status: "open_dispute" | "rebuttal_sent" | "settled" | "escalated_legal";
  brokerStatement: string;
  rebuttalSubject: string;
  rebuttalLetterMarkdown: string;
  statutoryCitations: string[];
  evidenceCitations: {
    telematicsPing: string;
    gatePassTime: string;
    rateConClause: string;
  };
  filedAt: string;
  updatedAt: string;
};

export type ArAgingInvoice = {
  id: string;
  invoiceNumber: string;
  claimId: string;
  loadNumber: string;
  brokerName: string;
  brokerCreditScore: number; // 0–100
  brokerCreditTier: "Low Risk" | "Moderate Risk" | "High Risk";
  amountCents: number;
  filedDate: string;
  dueDate: string;
  daysPastDue: number;
  agingBracket: "current" | "1-15_days" | "16-30_days" | "31-45_days" | "45+_days";
  status: "pending_payment" | "reminder_dispatched" | "disputed" | "paid";
  remindersSentCount: number;
  lastReminderDate?: string;
};

// ==========================================
// 2. HOS (HOURS OF SERVICE) & 14-HR CLOCK IMPACT
// ==========================================
export type HosCalculation = {
  shiftStartedAt: string; // ISO
  currentDwellMinutes: number;
  freeTimeMinutes: number;
  onDutyMinutesUsed: number; // e.g. 9.5 hours = 570 min
  driveMinutesRemaining: number; // e.g. 1.5 hours = 90 min
  shift14HrExpiresAt: string; // ISO
  minutesUntil14HrExpired: number;
  is14HourViolationImminent: boolean; // < 60 min
  estimatedDriveToSafeHavenMinutes: number; // e.g. 35 min
  safeParkingHavenName: string;
  isLayoverMandated: boolean; // if cannot reach safe haven without 14-hr breach
  layoverChargeCents: number; // standard $450.00
  tonuChargeCents: number;    // $300.00
  complianceWarning: string;
};

// ==========================================
// 3. RATE CON COUNTER-OFFER & ADDENDUM
// ==========================================
export type CarrierAddendumTerms = {
  carrierName: string;
  mcNumber: string;
  dotNumber: string;
  loadNumber: string;
  brokerName: string;
  linehaulRateDollars: number;
  standardFreeTimeHours: number; // 1 hr instead of 2
  detentionRatePerHourDollars: number; // $85/hr
  billingIncrementMinutes: number; // 15 min
  layoverDailyRateDollars: number; // $450/day
  tonuFeeDollars: number; // $300
  mandatoryNoticeWindowMinutes: number; // 30 min
  authorizedContactName: string;
  dateSigned: string;
  clauses: string[];
};

// ==========================================
// 4. FLEET EXECUTIVE ANALYTICS & BROKER SCORECARD
// ==========================================
export type BrokerScorecard = {
  id: string;
  brokerName: string;
  loadsCount: number;
  totalClaimedCents: number;
  totalPaidCents: number;
  payoutRatePercent: number; // e.g. 92%
  averageDaysToPay: number;  // e.g. 18 days
  disputeFrequencyPercent: number; // e.g. 14%
  creditScore: number;       // e.g. 88
  ratingTier: "Tier A (Fast Pay)" | "Tier B (Average)" | "Tier C (High Dispute)";
  recommendedTerms: string;
};

export type FleetOpportunityLoss = {
  fleetTruckCount: number;
  tractorHourlyCostDollars: number; // e.g. $125/hr
  totalDwellHoursMonth: number;
  unpaidDwellHoursMonth: number;
  unrecoveredCostDollars: number;
  recoveredDetentionDollars: number;
  netRecoveryEfficiencyPercent: number;
};

// ==========================================
// 5. TMS & INVOICING EXPORTS & ACCOUNTING SYNC
// ==========================================
export type ExportFormat = "edi_210" | "quickbooks_iif" | "quickbooks_csv" | "standard_csv";

export type DriverSmsMessage = {
  id: string;
  stopId: string;
  direction: "outgoing" | "incoming";
  sender: string;
  recipient: string;
  message: string;
  timestamp: string;
  mediaUrl?: string;
  mediaType?: "signed_bol" | "dock_stamp" | "gate_pass";
  status: "sent" | "delivered" | "received";
};

export type AccountingSyncRecord = {
  id: string;
  claimId: string;
  platform: "quickbooks" | "xero";
  ledgerInvoiceId: string;
  glAccount: string;
  amountCents: number;
  syncTimestamp: string;
  status: "synced" | "pending";
  brokerName: string;
  loadNumber: string;
};



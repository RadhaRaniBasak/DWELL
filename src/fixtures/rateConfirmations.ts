import { DetentionTerms } from "../types/dwell";

export interface RateConFixture {
  id: string;
  brokerName: string;
  loadNumber: string;
  proNumber: string;
  rateTotalCents: number;
  origin: string;
  destination: string;
  title: string;
  tag: string;
  layoutText: string;
  goldenTerms: DetentionTerms;
}

export const RATE_CON_FIXTURES: RateConFixture[] = [
  {
    id: "rc-chr-001",
    brokerName: "C.H. Robinson Worldwide",
    loadNumber: "CHR-882941",
    proNumber: "PRO-9921",
    rateTotalCents: 245000,
    origin: "Cicero, IL",
    destination: "Bentonville, AR",
    title: "C.H. Robinson (The Appointment Trap)",
    tag: "scheduled_appointment",
    layoutText: `================================================================================
C.H. ROBINSON WORLDWIDE, INC.                    LOAD CONFIRMATION & RATE AGREEMENT
Eden Prairie, MN 55344                           Load #: CHR-882941  |  Pro #: PRO-9921
================================================================================
Carrier: Apex Freight Lines, LLC                 Date: 2026-09-08
Equipment: 53' Dry Van                           Agreed Total Rate: $2,450.00 USD

STOP 1: PICKUP (Origin)
Facility: Midstate Distribution Ctr
Address: 5200 W 47th St, Cicero, IL 60804
Appointment: 2026-09-09 08:00 CDT - 10:00 CDT (Firm)

STOP 2: DELIVERY (Destination)
Facility: Walmart DC #6094
Address: 1100 SE 8th St, Bentonville, AR 72712
Appointment: 2026-09-10 07:00 CDT (Strict appointment)

-------------------------------- ACCESSORIAL TERMS ------------------------------
DETENTION POLICY:
Two (2) hours of free time allowed for loading and two (2) hours of free time
allowed for unloading. Free time begins at scheduled appointment time or arrival
time, whichever is later. Early arrival does not commence detention clock.

Detention rate is $50.00 per hour, billed in hourly increments thereafter.
Maximum detention payable is capped at $250.00 per stop.

NOTICE REQUIREMENT:
Carrier must give written notice via email to detention@chrobinson.com within
30 minutes of free time expiration. Failure to notify broker within 30 minutes
forfeits all detention claims.

FILING DEADLINE & REQUIRED DOCUMENTATION:
Detention claims with signed bill of lading showing in/out times stamped by
facility security must be submitted within 24 hours of delivery departure.
================================================================================`,
    goldenTerms: {
      freeTimeMinutes: {
        pickup: { value: 120, confidence: 0.98, sourceQuote: "Two (2) hours of free time allowed for loading" },
        delivery: { value: 120, confidence: 0.98, sourceQuote: "two (2) hours of free time allowed for unloading" },
      },
      detentionRateCentsPerHour: { value: 5000, confidence: 0.99, sourceQuote: "Detention rate is $50.00 per hour" },
      billingIncrement: { value: "hourly", confidence: 0.95, sourceQuote: "billed in hourly increments thereafter" },
      detentionCapCents: { value: 25000, confidence: 0.96, sourceQuote: "Maximum detention payable is capped at $250.00 per stop" },
      freeTimeStartsFrom: { value: "scheduled_appointment", confidence: 0.97, sourceQuote: "Free time begins at scheduled appointment time or arrival time, whichever is later. Early arrival does not commence detention clock." },
      notice: {
        trigger: { value: "at_free_time_expiry", confidence: 0.95, sourceQuote: "within 30 minutes of free time expiration" },
        withinMinutes: { value: 30, confidence: 0.96, sourceQuote: "within 30 minutes of free time expiration" },
        channel: { value: "email", confidence: 0.99, sourceQuote: "written notice via email to detention@chrobinson.com" },
        contact: { value: "detention@chrobinson.com", confidence: 0.99, sourceQuote: "detention@chrobinson.com" },
      },
      claimFilingWindowHours: { value: 24, confidence: 0.95, sourceQuote: "must be submitted within 24 hours of delivery departure" },
      requiredDocuments: {
        value: ["signed_bill_of_lading", "in_out_facility_stamp"],
        confidence: 0.94,
        sourceQuote: "signed bill of lading showing in/out times stamped by facility security",
      },
      ambiguities: [],
      needsReview: false,
    },
  },
  {
    id: "rc-tql-002",
    brokerName: "Total Quality Logistics (TQL)",
    loadNumber: "TQL-551029",
    proNumber: "PRO-7104",
    rateTotalCents: 185000,
    origin: "Columbus, OH",
    destination: "Allentown, PA",
    title: "TQL (Strict 1-Hour & Half-Day Billing)",
    tag: "half_day",
    layoutText: `================================================================================
TOTAL QUALITY LOGISTICS                      BROKER-CARRIER RATE CONFIRMATION
Cincinnati, OH                               Load ID: TQL-551029  |  PO: 8841-B
================================================================================
Carrier: Swift Transport Partners            Rate: $1,850.00 FLAT
Stops: 1 Pickup (Columbus, OH) -> 1 Drop (Allentown, PA)

DETENTION CLAUSE:
Driver receives exactly 1 hour free time at both shipper and receiver.
Detention pays $65.00 per hour billed in half_day increments ($260 per 4hr block).
Carrier MUST notify TQL on arrival immediately within 15 minutes by calling
800-580-3101 or emailing dispatch@tql.com to validate clock.
All claims must be accompanied by facility gate pass and filed within 12 hours.
================================================================================`,
    goldenTerms: {
      freeTimeMinutes: {
        pickup: { value: 60, confidence: 0.96, sourceQuote: "Driver receives exactly 1 hour free time at both shipper and receiver" },
        delivery: { value: 60, confidence: 0.96, sourceQuote: "Driver receives exactly 1 hour free time at both shipper and receiver" },
      },
      detentionRateCentsPerHour: { value: 6500, confidence: 0.97, sourceQuote: "Detention pays $65.00 per hour" },
      billingIncrement: { value: "half_day", confidence: 0.94, sourceQuote: "billed in half_day increments" },
      detentionCapCents: { value: null, confidence: 0.9, sourceQuote: null },
      freeTimeStartsFrom: { value: "arrival", confidence: 0.85, sourceQuote: "Carrier MUST notify TQL on arrival immediately" },
      notice: {
        trigger: { value: "on_arrival", confidence: 0.95, sourceQuote: "notify TQL on arrival immediately within 15 minutes" },
        withinMinutes: { value: 15, confidence: 0.98, sourceQuote: "within 15 minutes" },
        channel: { value: "email", confidence: 0.92, sourceQuote: "calling 800-580-3101 or emailing dispatch@tql.com" },
        contact: { value: "dispatch@tql.com", confidence: 0.95, sourceQuote: "dispatch@tql.com" },
      },
      claimFilingWindowHours: { value: 12, confidence: 0.96, sourceQuote: "filed within 12 hours" },
      requiredDocuments: {
        value: ["facility_gate_pass"],
        confidence: 0.92,
        sourceQuote: "accompanied by facility gate pass",
      },
      ambiguities: ["Billing increment is half_day (4-hour block)"],
      needsReview: false,
    },
  },
  {
    id: "rc-echo-003",
    brokerName: "Echo Global Logistics",
    loadNumber: "ECHO-99321",
    proNumber: "PRO-3301",
    rateTotalCents: 310000,
    origin: "Savannah, GA",
    destination: "Indianapolis, IN",
    title: "Echo Global Logistics (Detention Denied $0)",
    tag: "denial_case",
    layoutText: `================================================================================
ECHO GLOBAL LOGISTICS                       RATE CONFIRMATION AGREEMENT
Chicago, IL                                 Load Ref: ECHO-99321
================================================================================
Rate: $3,100.00 All-Inclusive

ACCESSORIAL & DETENTION PROVISIONS:
Carrier agrees this load is moved under discounted volume rates.
NO DETENTION WILL BE PAID UNDER ANY CIRCUMSTANCES. Shipper and receiver do not
authorize detention billing. Zero accessorial reimbursement will be processed.
Driver delay is carrier responsibility.
================================================================================`,
    goldenTerms: {
      freeTimeMinutes: {
        pickup: { value: null, confidence: 0.9, sourceQuote: null },
        delivery: { value: null, confidence: 0.9, sourceQuote: null },
      },
      detentionRateCentsPerHour: { value: 0, confidence: 0.98, sourceQuote: "NO DETENTION WILL BE PAID UNDER ANY CIRCUMSTANCES" },
      billingIncrement: { value: "hourly", confidence: 0.8, sourceQuote: null },
      detentionCapCents: { value: 0, confidence: 0.95, sourceQuote: "Zero accessorial reimbursement will be processed" },
      freeTimeStartsFrom: { value: null, confidence: 0.8, sourceQuote: null },
      notice: {
        trigger: { value: null, confidence: 0.9, sourceQuote: null },
        withinMinutes: { value: null, confidence: 0.9, sourceQuote: null },
        channel: { value: null, confidence: 0.9, sourceQuote: null },
        contact: { value: null, confidence: 0.9, sourceQuote: null },
      },
      claimFilingWindowHours: { value: null, confidence: 0.9, sourceQuote: null },
      requiredDocuments: { value: [], confidence: 0.9, sourceQuote: null },
      ambiguities: ["Contract explicitly denies all detention claims ($0 rate)"],
      needsReview: true,
    },
  },
  {
    id: "rc-landstar-004",
    brokerName: "Landstar Ranger, Inc.",
    loadNumber: "LS-44019",
    proNumber: "PRO-1142",
    rateTotalCents: 210000,
    origin: "Jacksonville, FL",
    destination: "Charlotte, NC",
    title: "Landstar (Asymmetric Pickup vs Delivery)",
    tag: "asymmetric_free_time",
    layoutText: `================================================================================
LANDSTAR RANGER, INC.                       FREIGHT CONTRACT ORDER
Jacksonville, FL                            Contract: LS-44019
================================================================================
Shipper Free Time: 2 hours (120 min)
Consignee Free Time: 3 hours (180 min)
Detention rate: $60.00/hr after free time expires.
Detention cap: $300.00 per occurrence.
Filing window: 48 hours post-departure with time-stamped BOL.
================================================================================`,
    goldenTerms: {
      freeTimeMinutes: {
        pickup: { value: 120, confidence: 0.97, sourceQuote: "Shipper Free Time: 2 hours (120 min)" },
        delivery: { value: 180, confidence: 0.97, sourceQuote: "Consignee Free Time: 3 hours (180 min)" },
      },
      detentionRateCentsPerHour: { value: 6000, confidence: 0.98, sourceQuote: "Detention rate: $60.00/hr after free time expires" },
      billingIncrement: { value: "hourly", confidence: 0.9, sourceQuote: null },
      detentionCapCents: { value: 30000, confidence: 0.97, sourceQuote: "Detention cap: $300.00 per occurrence" },
      freeTimeStartsFrom: { value: "arrival", confidence: 0.85, sourceQuote: null },
      notice: {
        trigger: { value: "at_free_time_expiry", confidence: 0.85, sourceQuote: "after free time expires" },
        withinMinutes: { value: 60, confidence: 0.8, sourceQuote: null },
        channel: { value: "email", confidence: 0.8, sourceQuote: null },
        contact: { value: null, confidence: 0.8, sourceQuote: null },
      },
      claimFilingWindowHours: { value: 48, confidence: 0.96, sourceQuote: "Filing window: 48 hours post-departure" },
      requiredDocuments: {
        value: ["time_stamped_bol"],
        confidence: 0.95,
        sourceQuote: "time-stamped BOL",
      },
      ambiguities: ["Different free time for pickup (2h) and delivery (3h)"],
      needsReview: false,
    },
  },
  {
    id: "rc-coyote-005",
    brokerName: "Coyote Logistics",
    loadNumber: "COY-33190",
    proNumber: "PRO-8890",
    rateTotalCents: 195000,
    origin: "Memphis, TN",
    destination: "Atlanta, GA",
    title: "Coyote Logistics ($40/hr with $200 Cap)",
    tag: "capped_mid_increment",
    layoutText: `================================================================================
COYOTE LOGISTICS LLC                        RATE CONFIRMATION
Chicago, IL                                 Load: COY-33190
================================================================================
Free Time: 2 hours loading and unloading.
Detention: $40.00 per hour, hourly increment. Total detention shall not exceed $200.00.
Notice must be sent via email to accessorials@coyote.com prior to departure.
Claim deadline: 24 hours. Signed BOL with arrival and departure time required.
================================================================================`,
    goldenTerms: {
      freeTimeMinutes: {
        pickup: { value: 120, confidence: 0.98, sourceQuote: "Free Time: 2 hours loading and unloading" },
        delivery: { value: 120, confidence: 0.98, sourceQuote: "Free Time: 2 hours loading and unloading" },
      },
      detentionRateCentsPerHour: { value: 4000, confidence: 0.99, sourceQuote: "Detention: $40.00 per hour" },
      billingIncrement: { value: "hourly", confidence: 0.95, sourceQuote: "hourly increment" },
      detentionCapCents: { value: 20000, confidence: 0.98, sourceQuote: "Total detention shall not exceed $200.00" },
      freeTimeStartsFrom: { value: "arrival", confidence: 0.88, sourceQuote: null },
      notice: {
        trigger: { value: "after_departure", confidence: 0.85, sourceQuote: "prior to departure" },
        withinMinutes: { value: 60, confidence: 0.8, sourceQuote: null },
        channel: { value: "email", confidence: 0.98, sourceQuote: "email to accessorials@coyote.com" },
        contact: { value: "accessorials@coyote.com", confidence: 0.99, sourceQuote: "accessorials@coyote.com" },
      },
      claimFilingWindowHours: { value: 24, confidence: 0.96, sourceQuote: "Claim deadline: 24 hours" },
      requiredDocuments: {
        value: ["signed_bol", "facility_arrival_departure_stamp"],
        confidence: 0.94,
        sourceQuote: "Signed BOL with arrival and departure time required",
      },
      ambiguities: [],
      needsReview: false,
    },
  },
  {
    id: "rc-bnsf-006",
    brokerName: "BNSF Logistics",
    loadNumber: "BNSF-10294",
    proNumber: "PRO-4421",
    rateTotalCents: 280000,
    origin: "Fort Worth, TX",
    destination: "Denver, CO",
    title: "BNSF Logistics (Scale Ticket & Gate Log Proof)",
    tag: "strict_evidence",
    layoutText: `================================================================================
BNSF LOGISTICS                              CARRIER RATE AGREEMENT
Springdale, AR                              Load Reference: BNSF-10294
================================================================================
Rate: $2,800.00
Detention: $50/hour after 2 hours free time.
Required Evidence: Signed bill of lading, facility check-in receipt, gate log,
and scale ticket. All 4 documents required or claim is void.
Submit claim within 48 hours of delivery.
================================================================================`,
    goldenTerms: {
      freeTimeMinutes: {
        pickup: { value: 120, confidence: 0.95, sourceQuote: "after 2 hours free time" },
        delivery: { value: 120, confidence: 0.95, sourceQuote: "after 2 hours free time" },
      },
      detentionRateCentsPerHour: { value: 5000, confidence: 0.98, sourceQuote: "$50/hour after 2 hours free time" },
      billingIncrement: { value: "hourly", confidence: 0.9, sourceQuote: null },
      detentionCapCents: { value: null, confidence: 0.9, sourceQuote: null },
      freeTimeStartsFrom: { value: "arrival", confidence: 0.85, sourceQuote: null },
      notice: {
        trigger: { value: "at_free_time_expiry", confidence: 0.8, sourceQuote: null },
        withinMinutes: { value: 60, confidence: 0.8, sourceQuote: null },
        channel: { value: "any", confidence: 0.8, sourceQuote: null },
        contact: { value: null, confidence: 0.8, sourceQuote: null },
      },
      claimFilingWindowHours: { value: 48, confidence: 0.97, sourceQuote: "Submit claim within 48 hours of delivery" },
      requiredDocuments: {
        value: ["signed_bill_of_lading", "check_in_receipt", "gate_log", "scale_ticket"],
        confidence: 0.96,
        sourceQuote: "Signed bill of lading, facility check-in receipt, gate log, and scale ticket",
      },
      ambiguities: ["Strict evidence requirements: 4 separate documents demanded"],
      needsReview: false,
    },
  },
  {
    id: "rc-jbhunt-007",
    brokerName: "J.B. Hunt 360",
    loadNumber: "JBH-77402",
    proNumber: "PRO-5503",
    rateTotalCents: 175000,
    origin: "Little Rock, AR",
    destination: "Kansas City, MO",
    title: "J.B. Hunt 360 (Portal Submission)",
    tag: "portal_submission",
    layoutText: `================================================================================
J.B. HUNT TRANSPORT, INC.                   RATE CONFIRMATION
Lowell, AR                                  Order #: JBH-77402
================================================================================
Detention rate: $55.00/hour with 2 hours free time.
Driver must clock in via JB Hunt Carrier 360 portal when free time expires.
Filing window is 24 hours via portal.
================================================================================`,
    goldenTerms: {
      freeTimeMinutes: {
        pickup: { value: 120, confidence: 0.97, sourceQuote: "with 2 hours free time" },
        delivery: { value: 120, confidence: 0.97, sourceQuote: "with 2 hours free time" },
      },
      detentionRateCentsPerHour: { value: 5500, confidence: 0.98, sourceQuote: "Detention rate: $55.00/hour" },
      billingIncrement: { value: "hourly", confidence: 0.9, sourceQuote: null },
      detentionCapCents: { value: null, confidence: 0.9, sourceQuote: null },
      freeTimeStartsFrom: { value: "arrival", confidence: 0.85, sourceQuote: null },
      notice: {
        trigger: { value: "at_free_time_expiry", confidence: 0.94, sourceQuote: "when free time expires" },
        withinMinutes: { value: 30, confidence: 0.8, sourceQuote: null },
        channel: { value: "portal", confidence: 0.96, sourceQuote: "via JB Hunt Carrier 360 portal" },
        contact: { value: "carrier360.jbhunt.com", confidence: 0.9, sourceQuote: "JB Hunt Carrier 360 portal" },
      },
      claimFilingWindowHours: { value: 24, confidence: 0.95, sourceQuote: "Filing window is 24 hours via portal" },
      requiredDocuments: {
        value: ["signed_bol"],
        confidence: 0.85,
        sourceQuote: null,
      },
      ambiguities: [],
      needsReview: false,
    },
  },
  {
    id: "rc-schneider-008",
    brokerName: "Schneider Logistics",
    loadNumber: "SNDR-99014",
    proNumber: "PRO-6629",
    rateTotalCents: 220000,
    origin: "Green Bay, WI",
    destination: "Indianapolis, IN",
    title: "Schneider (Unstated Filing Window - Valid Null)",
    tag: "unstated_deadline",
    layoutText: `================================================================================
SCHNEIDER LOGISTICS                         RATE CONFIRMATION
Green Bay, WI                               Load: SNDR-99014
================================================================================
Agreed Total: $2,200.00
Detention allowance: 2 hours free time. Detention rate $50 per hour.
Proof of detention required with bill of lading.
(Notice and filing deadlines not specified in this document).
================================================================================`,
    goldenTerms: {
      freeTimeMinutes: {
        pickup: { value: 120, confidence: 0.96, sourceQuote: "2 hours free time" },
        delivery: { value: 120, confidence: 0.96, sourceQuote: "2 hours free time" },
      },
      detentionRateCentsPerHour: { value: 5000, confidence: 0.98, sourceQuote: "Detention rate $50 per hour" },
      billingIncrement: { value: "hourly", confidence: 0.9, sourceQuote: null },
      detentionCapCents: { value: null, confidence: 0.9, sourceQuote: null },
      freeTimeStartsFrom: { value: "arrival", confidence: 0.8, sourceQuote: null },
      notice: {
        trigger: { value: null, confidence: 0.9, sourceQuote: null },
        withinMinutes: { value: null, confidence: 0.9, sourceQuote: null },
        channel: { value: null, confidence: 0.9, sourceQuote: null },
        contact: { value: null, confidence: 0.9, sourceQuote: null },
      },
      claimFilingWindowHours: { value: null, confidence: 0.95, sourceQuote: null },
      requiredDocuments: {
        value: ["bill_of_lading"],
        confidence: 0.92,
        sourceQuote: "Proof of detention required with bill of lading",
      },
      ambiguities: ["Filing window is genuinely unstated in contract (correctly returned as null)"],
      needsReview: true,
    },
  },
  {
    id: "rc-arrive-009",
    brokerName: "Arrive Logistics",
    loadNumber: "ARR-44028",
    proNumber: "PRO-3391",
    rateTotalCents: 265000,
    origin: "Austin, TX",
    destination: "Nashville, TN",
    title: "Arrive Logistics (15-Minute Notice Window)",
    tag: "strict_notice",
    layoutText: `================================================================================
ARRIVE LOGISTICS                            LOAD RATE CONFIRMATION
Austin, TX                                  Load: ARR-44028
================================================================================
Detention Terms:
2 hours free time at shipper and receiver. $50.00/hour thereafter.
CRITICAL: Driver must notify broker upon arrival within 15 minutes of arriving
at dock via SMS to 512-555-0199 or email to tracking@arrivelogistics.com.
Claims must be submitted within 24 hours of unload with signed gate stamp.
================================================================================`,
    goldenTerms: {
      freeTimeMinutes: {
        pickup: { value: 120, confidence: 0.98, sourceQuote: "2 hours free time at shipper and receiver" },
        delivery: { value: 120, confidence: 0.98, sourceQuote: "2 hours free time at shipper and receiver" },
      },
      detentionRateCentsPerHour: { value: 5000, confidence: 0.98, sourceQuote: "$50.00/hour thereafter" },
      billingIncrement: { value: "hourly", confidence: 0.9, sourceQuote: null },
      detentionCapCents: { value: null, confidence: 0.9, sourceQuote: null },
      freeTimeStartsFrom: { value: "arrival", confidence: 0.95, sourceQuote: "upon arrival" },
      notice: {
        trigger: { value: "on_arrival", confidence: 0.98, sourceQuote: "notify broker upon arrival within 15 minutes" },
        withinMinutes: { value: 15, confidence: 0.98, sourceQuote: "within 15 minutes of arriving at dock" },
        channel: { value: "any", confidence: 0.95, sourceQuote: "via SMS to 512-555-0199 or email to tracking@arrivelogistics.com" },
        contact: { value: "tracking@arrivelogistics.com", confidence: 0.95, sourceQuote: "tracking@arrivelogistics.com" },
      },
      claimFilingWindowHours: { value: 24, confidence: 0.97, sourceQuote: "submitted within 24 hours of unload" },
      requiredDocuments: {
        value: ["signed_gate_stamp"],
        confidence: 0.95,
        sourceQuote: "signed gate stamp",
      },
      ambiguities: [],
      needsReview: false,
    },
  },
  {
    id: "rc-uber-010",
    brokerName: "Uber Freight",
    loadNumber: "UBER-67219",
    proNumber: "PRO-8120",
    rateTotalCents: 215000,
    origin: "Dallas, TX",
    destination: "Houston, TX",
    title: "Uber Freight (Dock-Stamped BOL & $250 Cap)",
    tag: "in_out_stamped_bol",
    layoutText: `================================================================================
UBER FREIGHT LLC                            RATE CONFIRMATION
San Francisco, CA                           Load: UBER-67219
================================================================================
Free Time: 2 hours.
Rate: $50/hour with $250 maximum cap.
Proof required: Dock-stamped bill of lading with driver sign-in and sign-out time.
Claim submission within 24 hours.
================================================================================`,
    goldenTerms: {
      freeTimeMinutes: {
        pickup: { value: 120, confidence: 0.98, sourceQuote: "Free Time: 2 hours" },
        delivery: { value: 120, confidence: 0.98, sourceQuote: "Free Time: 2 hours" },
      },
      detentionRateCentsPerHour: { value: 5000, confidence: 0.99, sourceQuote: "Rate: $50/hour" },
      billingIncrement: { value: "hourly", confidence: 0.9, sourceQuote: null },
      detentionCapCents: { value: 25000, confidence: 0.98, sourceQuote: "$250 maximum cap" },
      freeTimeStartsFrom: { value: "arrival", confidence: 0.85, sourceQuote: null },
      notice: {
        trigger: { value: "at_free_time_expiry", confidence: 0.8, sourceQuote: null },
        withinMinutes: { value: 60, confidence: 0.8, sourceQuote: null },
        channel: { value: "any", confidence: 0.8, sourceQuote: null },
        contact: { value: null, confidence: 0.8, sourceQuote: null },
      },
      claimFilingWindowHours: { value: 24, confidence: 0.96, sourceQuote: "Claim submission within 24 hours" },
      requiredDocuments: {
        value: ["dock_stamped_bill_of_lading"],
        confidence: 0.95,
        sourceQuote: "Dock-stamped bill of lading with driver sign-in and sign-out time",
      },
      ambiguities: [],
      needsReview: false,
    },
  },
  {
    id: "rc-flexport-011",
    brokerName: "Flexport / Convoy Legacy",
    loadNumber: "FLEX-88120",
    proNumber: "PRO-7019",
    rateTotalCents: 340000,
    origin: "Los Angeles, CA",
    destination: "Phoenix, AZ",
    title: "Flexport (ELD Telematics Auto-Proof)",
    tag: "telematics_proof",
    layoutText: `================================================================================
FLEXPORT FREIGHT SERVICES                   CARRIER RATE CONFIRMATION
San Francisco, CA                           Load: FLEX-88120
================================================================================
Free Time: 2 hours. Detention rate: $45.00/hour.
ELD telematics geofence entry and exit logs accepted as primary proof of dwell.
Submit claim to detention@flexport.com within 72 hours of completed delivery.
================================================================================`,
    goldenTerms: {
      freeTimeMinutes: {
        pickup: { value: 120, confidence: 0.98, sourceQuote: "Free Time: 2 hours" },
        delivery: { value: 120, confidence: 0.98, sourceQuote: "Free Time: 2 hours" },
      },
      detentionRateCentsPerHour: { value: 4500, confidence: 0.99, sourceQuote: "Detention rate: $45.00/hour" },
      billingIncrement: { value: "hourly", confidence: 0.9, sourceQuote: null },
      detentionCapCents: { value: null, confidence: 0.9, sourceQuote: null },
      freeTimeStartsFrom: { value: "arrival", confidence: 0.85, sourceQuote: null },
      notice: {
        trigger: { value: "after_departure", confidence: 0.8, sourceQuote: null },
        withinMinutes: { value: 60, confidence: 0.8, sourceQuote: null },
        channel: { value: "email", confidence: 0.95, sourceQuote: "detention@flexport.com" },
        contact: { value: "detention@flexport.com", confidence: 0.95, sourceQuote: "detention@flexport.com" },
      },
      claimFilingWindowHours: { value: 72, confidence: 0.97, sourceQuote: "within 72 hours of completed delivery" },
      requiredDocuments: {
        value: ["eld_telematics_log"],
        confidence: 0.95,
        sourceQuote: "ELD telematics geofence entry and exit logs accepted",
      },
      ambiguities: [],
      needsReview: false,
    },
  },
  {
    id: "rc-xpo-012",
    brokerName: "XPO Logistics",
    loadNumber: "XPO-55198",
    proNumber: "PRO-4490",
    rateTotalCents: 290000,
    origin: "Charlotte, NC",
    destination: "Atlanta, GA",
    title: "XPO Logistics (Contradictory Terms)",
    tag: "contradiction_review",
    layoutText: `================================================================================
XPO LOGISTICS                               RATE CONFIRMATION
High Point, NC                              Order: XPO-55198
================================================================================
[HEADER SUMMARY]
Free Time Allowance: 2 hours. Detention: $50/hr.

[SECTION 14 - ACCESSORIAL RULES]
Carrier agreed to 1 hour free time at shipper and consignee facilities.
Rate of detention is $50/hr capped at $200.00.
Notice must be sent within 1 hour of arrival. Claims due in 24 hours.
================================================================================`,
    goldenTerms: {
      freeTimeMinutes: {
        pickup: { value: 60, confidence: 0.65, sourceQuote: "1 hour free time at shipper and consignee facilities" },
        delivery: { value: 60, confidence: 0.65, sourceQuote: "1 hour free time at shipper and consignee facilities" },
      },
      detentionRateCentsPerHour: { value: 5000, confidence: 0.95, sourceQuote: "Rate of detention is $50/hr" },
      billingIncrement: { value: "hourly", confidence: 0.9, sourceQuote: null },
      detentionCapCents: { value: 20000, confidence: 0.95, sourceQuote: "capped at $200.00" },
      freeTimeStartsFrom: { value: "arrival", confidence: 0.8, sourceQuote: null },
      notice: {
        trigger: { value: "on_arrival", confidence: 0.9, sourceQuote: "Notice must be sent within 1 hour of arrival" },
        withinMinutes: { value: 60, confidence: 0.9, sourceQuote: "within 1 hour of arrival" },
        channel: { value: "any", confidence: 0.8, sourceQuote: null },
        contact: { value: null, confidence: 0.8, sourceQuote: null },
      },
      claimFilingWindowHours: { value: 24, confidence: 0.95, sourceQuote: "Claims due in 24 hours" },
      requiredDocuments: {
        value: ["signed_bol"],
        confidence: 0.8,
        sourceQuote: null,
      },
      ambiguities: [
        "Header summary states 2 hours free time, while Section 14 states 1 hour free time. Dispatcher review required.",
      ],
      needsReview: true,
    },
  },
];

import {
  computeDetention,
  computeDeadlines,
  resolveClockStart,
  toBillableUnits,
  applyCap,
  minutesBetween,
} from "../src/services/clock/detentionClock";
import { DetentionTerms, Stop } from "../src/types/dwell";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

console.log("\n=======================================================");
console.log("🚚 DWELL DETENTION CLOCK — 8 SPEC EDGE CASES TEST HARNESS");
console.log("=======================================================\n");

// Base Standard Terms Template
const baseTerms: DetentionTerms = {
  freeTimeMinutes: {
    pickup: { value: 120, confidence: 1, sourceQuote: "2 hrs free" },
    delivery: { value: 120, confidence: 1, sourceQuote: "2 hrs free" },
  },
  detentionRateCentsPerHour: { value: 5000, confidence: 1, sourceQuote: "$50/hr" },
  billingIncrement: { value: "hourly", confidence: 1, sourceQuote: "hourly" },
  detentionCapCents: { value: 25000, confidence: 1, sourceQuote: "cap $250" },
  freeTimeStartsFrom: { value: "scheduled_appointment", confidence: 1, sourceQuote: "from appt" },
  notice: {
    trigger: { value: "at_free_time_expiry", confidence: 1, sourceQuote: "at expiry" },
    withinMinutes: { value: 30, confidence: 1, sourceQuote: "within 30m" },
    channel: { value: "email", confidence: 1, sourceQuote: "email" },
    contact: { value: "claims@broker.com", confidence: 1, sourceQuote: "claims@broker.com" },
  },
  claimFilingWindowHours: { value: 24, confidence: 1, sourceQuote: "24h window" },
  requiredDocuments: { value: ["signed_bill_of_lading"], confidence: 1, sourceQuote: "bol" },
  ambiguities: [],
  needsReview: false,
};
console.log("Test 1: Arrives before appointment (clock must not start early)");
const stopEarly: Stop = {
  id: "stop-early",
  loadId: "load-1",
  sequence: 1,
  type: "pickup",
  facilityId: "fac-1",
  facilityName: "Test Facility",
  facilityAddress: "123 Main St",
  appointmentStart: "2026-09-10T14:00:00.000Z", 
  appointmentEnd: "2026-09-10T16:00:00.000Z",
  arrivedAt: "2026-09-10T13:30:00.000Z",
  departedAt: "2026-09-10T17:00:00.000Z", 
  source: "geofence",
  evidenceIds: [],
  lat: 36.3621,
  lng: -94.2052,
};

const clockStartEarly = resolveClockStart(stopEarly, baseTerms);
assert(
  clockStartEarly?.toISOString() === "2026-09-10T14:00:00.000Z",
  "Clock start matches appointmentStart (14:00Z), not early arrival (13:30Z)"
);
const resEarly = computeDetention(stopEarly, baseTerms);
assert(resEarly.detentionMinutes === 60, "Detention is exactly 60 minutes");
assert(resEarly.billableUnits === 1, "Billable units is 1 hour");
assert(resEarly.amountCents === 5000, "Amount is $50.00 (5000 cents)");

console.log("\nTest 2: Arrives after appointment (late arrival)");
const stopLate: Stop = {
  id: "stop-late",
  loadId: "load-1",
  sequence: 1,
  type: "delivery",
  facilityId: "fac-1",
  facilityName: "Test Facility",
  facilityAddress: "123 Main St",
  appointmentStart: "2026-09-10T10:00:00.000Z",
  appointmentEnd: "2026-09-10T11:00:00.000Z",
  arrivedAt: "2026-09-10T11:45:00.000Z", 
  departedAt: "2026-09-10T15:45:00.000Z", 
  source: "geofence",
  evidenceIds: [],
  lat: 36.3621,
  lng: -94.2052,
};
const resLate = computeDetention(stopLate, baseTerms);
assert(resLate.isLateArrival === true, "Correctly flags isLateArrival = true");
assert(
  resLate.clockStartsAt?.toISOString() === "2026-09-10T11:45:00.000Z",
  "Clock start begins at actual late arrival (11:45Z)"
);
assert(resLate.detentionMinutes === 120, "2 hours (120 min) detention accrued");
assert(resLate.amountCents === 10000, "Amount is $100.00");

console.log("\nTest 3: Spans midnight + DST safe");
const stopMidnight: Stop = {
  id: "stop-midnight",
  loadId: "load-1",
  sequence: 1,
  type: "delivery",
  facilityId: "fac-1",
  facilityName: "Test Facility",
  facilityAddress: "123 Main St",
  appointmentStart: "2026-11-01T22:00:00.000Z", 
  appointmentEnd: "2026-11-02T02:00:00.000Z",
  arrivedAt: "2026-11-01T22:00:00.000Z",
  departedAt: "2026-11-02T05:30:00.000Z", 
  source: "geofence",
  evidenceIds: [],
  lat: 36.3621,
  lng: -94.2052,
};
const deltaMins = minutesBetween(stopMidnight.arrivedAt!, stopMidnight.departedAt!);
assert(deltaMins === 450, "minutesBetween handles midnight crossing: 450 mins");
const resMidnight = computeDetention(stopMidnight, baseTerms);
assert(resMidnight.detentionMinutes === 330, "Detention past 2h free time is 330 mins (5.5h)");
assert(resMidnight.billableUnits === 6, "Hourly billing rounds up to 6 hours ($300 uncapped)");
assert(resMidnight.amountCents === 25000, "Amount capped at $250.00");
assert(resMidnight.capApplied === true, "Cap applied flag is true");

console.log("\nTest 4: Departure not yet recorded (live clock evaluation)");
const liveArrived = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(); // arrived 3h ago
const stopLive: Stop = {
  id: "stop-live",
  loadId: "load-1",
  sequence: 1,
  type: "pickup",
  facilityId: "fac-1",
  facilityName: "Live Facility",
  facilityAddress: "123 Main St",
  appointmentStart: liveArrived,
  appointmentEnd: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  arrivedAt: liveArrived,
  departedAt: null, 
  source: "geofence",
  evidenceIds: [],
  lat: 36.3621,
  lng: -94.2052,
};
const resLive = computeDetention(stopLive, baseTerms, new Date());
assert(resLive.detentionMinutes >= 59 && resLive.detentionMinutes <= 61, "Live clock shows ~60 mins detention");
assert(resLive.amountCents === 5000, "Live counter calculates 1 billable unit ($50)");

console.log("\nTest 5: half_day billing increment with remainder");
const halfDayTerms: DetentionTerms = {
  ...baseTerms,
  billingIncrement: { value: "half_day", confidence: 1, sourceQuote: "half day" },
};
assert(toBillableUnits(300, "half_day") === 2, "300 mins converts to 2 half-day units");
const stopHalfDay: Stop = {
  id: "stop-hd",
  loadId: "load-1",
  sequence: 1,
  type: "pickup",
  facilityId: "fac-1",
  facilityName: "Half Day Facility",
  facilityAddress: "123 Main St",
  appointmentStart: "2026-09-10T08:00:00.000Z",
  appointmentEnd: "2026-09-10T10:00:00.000Z",
  arrivedAt: "2026-09-10T08:00:00.000Z",
  departedAt: "2026-09-10T15:00:00.000Z",
  source: "geofence",
  evidenceIds: [],
  lat: 36.3621,
  lng: -94.2052,
};
const resHalfDay = computeDetention(stopHalfDay, halfDayTerms);
assert(resHalfDay.billableUnits === 2, "Billable units is 2 half-days");

assert(resHalfDay.amountCents === 25000, "Amount capped at $250.00");

console.log("\nTest 6: Cap reached mid-increment");
const cappedRes = applyCap(30000, 25000);
assert(cappedRes.amountCents === 25000, "applyCap clamps $300 to $250");
assert(cappedRes.capApplied === true, "applyCap marks capApplied = true");

const uncappedRes = applyCap(15000, 25000); 
assert(uncappedRes.amountCents === 15000, "applyCap preserves $150");
assert(uncappedRes.capApplied === false, "applyCap marks capApplied = false");

console.log("\nTest 7: All-null terms (no detention entitlement)");
const nullTerms: DetentionTerms = {
  ...baseTerms,
  detentionRateCentsPerHour: { value: null, confidence: 0, sourceQuote: "" },
  freeTimeMinutes: {
    pickup: { value: null, confidence: 0, sourceQuote: "" },
    delivery: { value: null, confidence: 0, sourceQuote: "" },
  },
};
const resNull = computeDetention(stopEarly, nullTerms);
assert(resNull.hasEntitlement === false, "hasEntitlement is false");
assert(resNull.amountCents === 0, "amountCents is 0");
assert(
  resNull.noEntitlementReason?.includes("no detention clause") === true,
  "Clear no-entitlement explanation provided"
);

console.log("\nTest 8: Multiple stops, different free times (pickup 120m vs delivery 60m)");
const splitTerms: DetentionTerms = {
  ...baseTerms,
  freeTimeMinutes: {
    pickup: { value: 120, confidence: 1, sourceQuote: "2h pickup" },
    delivery: { value: 60, confidence: 1, sourceQuote: "1h delivery" },
  },
};

const stopP: Stop = { ...stopEarly, type: "pickup" };
const stopD: Stop = { ...stopEarly, type: "delivery" };

const resP = computeDetention(stopP, splitTerms);
const resD = computeDetention(stopD, splitTerms);

assert(resP.freeTimeAllowedMinutes === 120, "Pickup receives 120 minutes free time");
assert(resD.freeTimeAllowedMinutes === 60, "Delivery receives 60 minutes free time");
assert(resD.detentionMinutes === resP.detentionMinutes + 60, "Delivery accrues 60 minutes more detention");

console.log("\n=======================================================");
console.log("✅ ALL 8 SPEC EDGE CASES PASSED WITH 100% ARITHMETIC ACCURACY!");
console.log("=======================================================\n");

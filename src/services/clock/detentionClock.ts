import { DetentionTerms, Stop, DetentionComputation } from "../../types/dwell";

export interface DetentionResult {
  clockStartsAt: Date | null;
  freeTimeEndsAt: Date | null;
  effectiveEnd: Date | null;
  freeTimeAllowedMinutes: number;
  totalDwellMinutes: number;
  freeTimeRemainingMinutes: number;
  detentionMinutes: number;
  billableUnits: number;
  ratePerUnitCents: number;
  uncappedAmountCents: number;
  amountCents: number;
  capApplied: boolean;
  isLateArrival: boolean;
  hasEntitlement: boolean;
  noEntitlementReason?: string;
  explanation: string;
}

/**
 * Pure function: resolve the exact moment the detention clock begins ticking.
 * Crucial rule: If the contract specifies 'scheduled_appointment',
 * arriving early does NOT start the free time clock earlier.
 */
export function resolveClockStart(stop: Stop, terms: DetentionTerms): Date | null {
  if (!stop.arrivedAt) return null;
  const arrived = new Date(stop.arrivedAt);
  const startsFromAppointment = terms.freeTimeStartsFrom.value === "scheduled_appointment";

  if (startsFromAppointment && stop.appointmentStart) {
    const apptStart = new Date(stop.appointmentStart);
    // Return the later of appointment start and actual arrival
    return arrived.getTime() > apptStart.getTime() ? arrived : apptStart;
  }

  return arrived;
}

/**
 * Pure function: look up free time minutes for this specific stop type
 */
export function freeTimeForStop(stopType: "pickup" | "delivery", terms: DetentionTerms): number | null {
  if (stopType === "pickup") {
    return terms.freeTimeMinutes.pickup.value;
  }
  return terms.freeTimeMinutes.delivery.value;
}

/**
 * Convert raw detention minutes to billable increment units
 */
export function toBillableUnits(
  detentionMinutes: number,
  increment: "hourly" | "half_day" | "daily" | null
): number {
  if (detentionMinutes <= 0) return 0;
  const inc = increment || "hourly";

  switch (inc) {
    case "hourly":
      // Standard freight billing: round up to the next full hour or pro-rata
      return Math.ceil(detentionMinutes / 60);
    case "half_day":
      // Half-day increments (e.g. 4-hour blocks)
      return Math.ceil(detentionMinutes / 240);
    case "daily":
      // Daily increments (24-hour blocks)
      return Math.ceil(detentionMinutes / 1440);
    default:
      return Math.ceil(detentionMinutes / 60);
  }
}

/**
 * Determine the dollar rate per billable unit based on hourly rate
 */
export function ratePerUnit(terms: DetentionTerms): number {
  const hourlyRateCents = terms.detentionRateCentsPerHour.value || 0;
  const inc = terms.billingIncrement.value || "hourly";

  switch (inc) {
    case "hourly":
      return hourlyRateCents;
    case "half_day":
      return hourlyRateCents * 4; // 4 hours per half-day block
    case "daily":
      return hourlyRateCents * 24; // 24 hours per daily block
    default:
      return hourlyRateCents;
  }
}

/**
 * Primary pure function: compute detention.
 * Takes Stop, DetentionTerms, and an optional evaluation timestamp (for live clocks).
 * Absolutely no I/O, no DB calls, no unparameterized new Date().
 */
export function computeDetention(
  stop: Stop,
  terms: DetentionTerms,
  asOf: Date = new Date()
): DetentionResult {
  // Check if contract has detention entitlement
  const hourlyRate = terms.detentionRateCentsPerHour.value;
  const freeTime = freeTimeForStop(stop.type, terms);

  if (hourlyRate === null && freeTime === null) {
    return {
      clockStartsAt: null,
      freeTimeEndsAt: null,
      effectiveEnd: null,
      freeTimeAllowedMinutes: 0,
      totalDwellMinutes: 0,
      freeTimeRemainingMinutes: 0,
      detentionMinutes: 0,
      billableUnits: 0,
      ratePerUnitCents: 0,
      uncappedAmountCents: 0,
      amountCents: 0,
      capApplied: false,
      isLateArrival: false,
      hasEntitlement: false,
      noEntitlementReason: "Rate confirmation has no detention clause or terms were not provided.",
      explanation: "No contractual detention entitlement found in rate confirmation.",
    };
  }

  if (hourlyRate === 0) {
    return {
      clockStartsAt: null,
      freeTimeEndsAt: null,
      effectiveEnd: null,
      freeTimeAllowedMinutes: freeTime ?? 120,
      totalDwellMinutes: 0,
      freeTimeRemainingMinutes: 0,
      detentionMinutes: 0,
      billableUnits: 0,
      ratePerUnitCents: 0,
      uncappedAmountCents: 0,
      amountCents: 0,
      capApplied: false,
      isLateArrival: false,
      hasEntitlement: false,
      noEntitlementReason: "Contract explicitly states $0 detention / detention denied.",
      explanation: "Contractual rate is explicitly $0/hr.",
    };
  }

  if (!stop.arrivedAt) {
    return {
      clockStartsAt: null,
      freeTimeEndsAt: null,
      effectiveEnd: null,
      freeTimeAllowedMinutes: freeTime ?? 120,
      totalDwellMinutes: 0,
      freeTimeRemainingMinutes: freeTime ?? 120,
      detentionMinutes: 0,
      billableUnits: 0,
      ratePerUnitCents: ratePerUnit(terms),
      uncappedAmountCents: 0,
      amountCents: 0,
      capApplied: false,
      isLateArrival: false,
      hasEntitlement: true,
      explanation: "Stop is en route; truck has not arrived at facility.",
    };
  }

  const arrivedAt = new Date(stop.arrivedAt);
  const apptEnd = stop.appointmentEnd ? new Date(stop.appointmentEnd) : null;
  const isLateArrival = apptEnd ? arrivedAt.getTime() > apptEnd.getTime() : false;

  const clockStartsAt = resolveClockStart(stop, terms)!;
  const allowedMinutes = freeTime ?? 120; // fallback standard 2h if unspecified
  const freeTimeEndsAt = new Date(clockStartsAt.getTime() + allowedMinutes * 60 * 1000);

  const effectiveEnd = stop.departedAt ? new Date(stop.departedAt) : asOf;

  // Total dwell from arrival to departure/asOf
  const totalDwellMinutes = Math.max(
    0,
    Math.round((effectiveEnd.getTime() - arrivedAt.getTime()) / (60 * 1000))
  );

  // Free time remaining (countdown)
  const freeTimeRemainingMinutes = Math.max(
    0,
    Math.round((freeTimeEndsAt.getTime() - effectiveEnd.getTime()) / (60 * 1000))
  );

  // Detention minutes past free time
  const detentionMinutes = Math.max(
    0,
    Math.round((effectiveEnd.getTime() - freeTimeEndsAt.getTime()) / (60 * 1000))
  );

  const billableIncrement = terms.billingIncrement.value || "hourly";
  const billableUnits = toBillableUnits(detentionMinutes, billableIncrement);
  const unitRateCents = ratePerUnit(terms);
  const uncappedAmountCents = billableUnits * unitRateCents;

  const capCents = terms.detentionCapCents.value;
  let amountCents = uncappedAmountCents;
  let capApplied = false;

  if (capCents !== null && uncappedAmountCents > capCents) {
    amountCents = capCents;
    capApplied = true;
  }

  const unitName =
    billableIncrement === "half_day"
      ? "half-day (4h)"
      : billableIncrement === "daily"
      ? "day (24h)"
      : "hour";

  const rateFormatted = `$${(unitRateCents / 100).toFixed(2)}`;
  const totalFormatted = `$${(amountCents / 100).toFixed(2)}`;
  const hours = Math.floor(detentionMinutes / 60);
  const mins = detentionMinutes % 60;
  const durationStr = `${hours}h ${mins}m`;

  const explanation =
    detentionMinutes > 0
      ? `${durationStr} past free time, billed at ${billableUnits} ${unitName}${
          billableUnits === 1 ? "" : "s"
        } x ${rateFormatted} = ${totalFormatted}${
          capApplied ? ` (capped at $${(capCents! / 100).toFixed(2)})` : ""
        }`
      : `Within free time allowance (${freeTimeRemainingMinutes}m remaining)`;

  return {
    clockStartsAt,
    freeTimeEndsAt,
    effectiveEnd,
    freeTimeAllowedMinutes: allowedMinutes,
    totalDwellMinutes,
    freeTimeRemainingMinutes,
    detentionMinutes,
    billableUnits,
    ratePerUnitCents: unitRateCents,
    uncappedAmountCents,
    amountCents,
    capApplied,
    isLateArrival,
    hasEntitlement: true,
    explanation,
  };
}

/**
 * DST-safe computation of elapsed minutes between two timestamps.
 * Uses UTC epoch millisecond deltas to eliminate Daylight Saving Time clock shift distortions.
 */
export function minutesBetween(a: Date | string, b: Date | string): number {
  const dateA = typeof a === "string" ? new Date(a) : a;
  const dateB = typeof b === "string" ? new Date(b) : b;
  return Math.round((dateB.getTime() - dateA.getTime()) / (60 * 1000));
}

/**
 * Pure function: applies contractual detention dollar cap if defined.
 */
export function applyCap(
  cents: number,
  capCents: number | null
): { amountCents: number; capApplied: boolean } {
  if (capCents !== null && cents > capCents) {
    return { amountCents: capCents, capApplied: true };
  }
  return { amountCents: Math.max(0, cents), capApplied: false };
}

/**
 * Pure calculation of Notice Deadline based on contract trigger
 */
export function computeNoticeDeadline(
  stop: Stop,
  terms: DetentionTerms,
  freeTimeEndsAt: Date | null = null
): Date | null {
  if (!stop.arrivedAt) return null;
  const arrived = new Date(stop.arrivedAt);
  const noticeTrigger = terms.notice.trigger.value;
  const withinMinutes = terms.notice.withinMinutes.value ?? 60;

  if (noticeTrigger === "on_arrival") {
    return new Date(arrived.getTime() + withinMinutes * 60 * 1000);
  }
  if (noticeTrigger === "at_free_time_expiry" && freeTimeEndsAt) {
    return new Date(freeTimeEndsAt.getTime() + withinMinutes * 60 * 1000);
  }
  if (noticeTrigger === "after_departure" && stop.departedAt) {
    const departed = new Date(stop.departedAt);
    return new Date(departed.getTime() + withinMinutes * 60 * 1000);
  }
  return null;
}

/**
 * Pure calculation of Claim Filing Deadline: departure + claimFilingWindowHours
 */
export function computeFilingDeadline(
  stop: Stop,
  terms: DetentionTerms
): Date | null {
  if (!stop.departedAt) return null;
  const departed = new Date(stop.departedAt);
  const windowHours = terms.claimFilingWindowHours.value ?? 24;
  return new Date(departed.getTime() + windowHours * 60 * 60 * 1000);
}

/**
 * Pure calculation of Notice and Filing Deadlines
 */
export function computeDeadlines(
  stop: Stop,
  terms: DetentionTerms,
  clockResult: DetentionResult
): { noticeDeadlineAt: Date | null; filingDeadlineAt: Date | null } {
  const noticeDeadlineAt = computeNoticeDeadline(stop, terms, clockResult.freeTimeEndsAt);
  const filingDeadlineAt = computeFilingDeadline(stop, terms);
  return { noticeDeadlineAt, filingDeadlineAt };
}

/**
 * Serialize computation for the Claim object
 */
export function toComputationRecord(result: DetentionResult, terms: DetentionTerms): DetentionComputation {
  return {
    clockStartsAt: result.clockStartsAt ? result.clockStartsAt.toISOString() : "",
    freeTimeEndsAt: result.freeTimeEndsAt ? result.freeTimeEndsAt.toISOString() : "",
    detentionMinutes: result.detentionMinutes,
    billableUnits: result.billableUnits,
    billingIncrement: terms.billingIncrement.value || "hourly",
    ratePerUnitCents: result.ratePerUnitCents,
    uncappedAmountCents: result.uncappedAmountCents,
    cappedAmountCents: result.amountCents,
    capApplied: result.capApplied,
    explanation: result.explanation,
  };
}

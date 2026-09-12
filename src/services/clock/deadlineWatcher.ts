import { Claim, DwellEvent, Stop, Load } from "../../types/dwell";
import { DatabaseState } from "../../server/db";

export interface DeadlineWatcherResult {
  runAt: string;
  totalClaimsChecked: number;
  atRiskCount: number;
  escalations: {
    claimId: string;
    loadNumber?: string;
    brokerName?: string;
    facilityName?: string;
    hoursUntilFilingDeadline: number | null;
    hoursUntilNoticeDeadline: number | null;
    triggerReason: string;
  }[];
}

/**
 * Core Deadline Watcher Job (Phase 8)
 *
 * Scans active and unfiled claims. When either noticeDeadlineAt or filingDeadlineAt
 * falls within the next 3 hours (180 minutes), it:
 * 1. Elevates claim status to "at_risk" (unless already filed)
 * 2. Emits an immutable audit event to DwellEvents for telematics chain of custody
 * 3. Records escalation metadata for dispatcher notification
 */
export function runDeadlineWatcher(
  db: DatabaseState,
  hoursThreshold: number = 3.0
): DeadlineWatcherResult {
  const now = Date.now();
  const escalations: DeadlineWatcherResult["escalations"] = [];
  let atRiskCount = 0;

  const activeClaims: Claim[] = Object.values(db.claims);

  for (const claim of activeClaims) {
    // Filed claims do not escalate
    if (claim.status === "filed") {
      continue;
    }

    const load = db.loads[claim.loadId];
    const stop = db.stops[claim.stopId];

    let hoursUntilFilingDeadline: number | null = null;
    let hoursUntilNoticeDeadline: number | null = null;
    let shouldEscalate = false;
    let triggerReason = "";

    // 1. Check filing deadline (e.g. 24 hours post-departure)
    if (claim.filingDeadlineAt) {
      const filingMs = new Date(claim.filingDeadlineAt).getTime();
      const diffHours = (filingMs - now) / (60 * 60 * 1000);
      hoursUntilFilingDeadline = Number(diffHours.toFixed(1));

      if (diffHours <= hoursThreshold) {
        shouldEscalate = true;
        triggerReason = diffHours <= 0
          ? "CRITICAL: Contractual claim filing deadline has EXPIRED"
          : `URGENT: Filing deadline expiring in ${diffHours.toFixed(1)}h (<= ${hoursThreshold}h threshold)`;
      }
    }

    // 2. Check notice deadline (e.g. within 30-60m of free time expiry)
    if (claim.noticeDeadlineAt) {
      const noticeMs = new Date(claim.noticeDeadlineAt).getTime();
      const diffHours = (noticeMs - now) / (60 * 60 * 1000);
      hoursUntilNoticeDeadline = Number(diffHours.toFixed(1));

      if (diffHours <= hoursThreshold) {
        shouldEscalate = true;
        const noticeReason = diffHours <= 0
          ? "CRITICAL: Initial broker detention notice window has EXPIRED"
          : `URGENT: Broker notice deadline expiring in ${diffHours.toFixed(1)}h`;
        triggerReason = triggerReason ? `${triggerReason} | ${noticeReason}` : noticeReason;
      }
    }

    if (shouldEscalate) {
      atRiskCount++;
      const wasAlreadyAtRisk = claim.status === "at_risk";
      claim.status = "at_risk";

      // Log append-only audit event if newly flagged or escalated
      if (!wasAlreadyAtRisk) {
        const auditEvent: DwellEvent = {
          id: `evt-deadline-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          stopId: claim.stopId,
          type: "deadline_approaching",
          occurredAt: new Date().toISOString(),
          recordedAt: new Date().toISOString(),
          payload: {
            claimId: claim.id,
            loadNumber: load?.loadNumber,
            brokerName: load?.brokerName,
            hoursUntilFilingDeadline,
            hoursUntilNoticeDeadline,
            triggerReason,
            amountCents: claim.amountCents,
          },
        };
        db.dwellEvents.push(auditEvent);
      }

      escalations.push({
        claimId: claim.id,
        loadNumber: load?.loadNumber,
        brokerName: load?.brokerName,
        facilityName: stop?.facilityName,
        hoursUntilFilingDeadline,
        hoursUntilNoticeDeadline,
        triggerReason,
      });
    }
  }

  return {
    runAt: new Date().toISOString(),
    totalClaimsChecked: activeClaims.length,
    atRiskCount,
    escalations,
  };
}

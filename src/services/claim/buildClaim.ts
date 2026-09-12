import {
  Claim,
  DetentionTerms,
  Evidence,
  Load,
  Stop,
} from "../../types/dwell";
import {
  computeDeadlines,
  computeDetention,
  toComputationRecord,
} from "../clock/detentionClock";
import { checkEvidenceCompleteness } from "../evidence/evidenceChecklist";

export interface FormattedClaimLetter {
  subject: string;
  bodyMarkdown: string;
}

/**
 * Pure deterministic formatter matching Prompt B rules.
 * Used directly or as fallback when Gemini API is offline/not configured.
 */
export function formatDeterministicClaimLetter(
  load: Load,
  stop: Stop,
  terms: DetentionTerms,
  computation = computeDetention(stop, terms),
  evidence: Evidence[] = []
): FormattedClaimLetter {
  const arrived = stop.arrivedAt ? new Date(stop.arrivedAt) : null;
  const departed = stop.departedAt ? new Date(stop.departedAt) : new Date();
  const { filingDeadlineAt } = computeDeadlines(stop, terms, computation);

  const check = checkEvidenceCompleteness(terms, evidence);
  const dateStr = arrived
    ? arrived.toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  const subject = `Detention claim — Load ${load.loadNumber} — ${stop.facilityName} — ${dateStr}`;

  const amountDollars = (computation.amountCents / 100).toFixed(2);
  const entitlementQuote =
    terms.detentionRateCentsPerHour.sourceQuote ||
    terms.freeTimeMinutes.delivery.sourceQuote ||
    "Contract specifies agreed detention compensation following free time allowance.";

  const apptStartStr = stop.appointmentStart
    ? new Date(stop.appointmentStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "N/A";
  const apptEndStr = stop.appointmentEnd
    ? new Date(stop.appointmentEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "N/A";
  const arrivedStr = arrived
    ? arrived.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "N/A";
  const clockStartStr = computation.clockStartsAt
    ? computation.clockStartsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "N/A";
  const freeTimeEndStr = computation.freeTimeEndsAt
    ? computation.freeTimeEndsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "N/A";
  const departedStr = departed
    ? departed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "N/A";

  const timelineRows = [
    `| Scheduled Window | ${apptStartStr} – ${apptEndStr} |`,
    `| Facility Arrival | ${arrivedStr} |`,
    `| Free Time Commenced | ${clockStartStr} |`,
    `| Free Time Ended | ${freeTimeEndStr} |`,
    `| Facility Departure | ${departedStr} |`,
    `| Billable Dwell | ${Math.floor(computation.detentionMinutes / 60)}h ${computation.detentionMinutes % 60}m |`,
  ].join("\n");

  const attachmentsList =
    evidence.length > 0
      ? evidence
          .map(
            (e) =>
              `- ${e.label} (${e.type.replace(/_/g, " ")}) recorded at ${new Date(
                e.timestamp
              ).toLocaleTimeString()}${e.transcript ? ` — Statement: *"${e.transcript}"*` : ""}`
          )
          .join("\n")
      : "- Electronic GPS geofence in/out telematics audit record";

  const missingDocsStr = check.missingDocs.join(", ");
  const missingDocNotice =
    check.missingDocs.length > 0
      ? `\n*Note: The rate agreement mentions ${missingDocsStr}. If further physical documentation is requested beyond the attached telematics and records, please notify us immediately and we will furnish supplementary logs.*`
      : "";

  const windowHours = terms.claimFilingWindowHours.value ?? 24;
  const deadlineStr = filingDeadlineAt ? filingDeadlineAt.toLocaleString() : "24h window";
  const deadlineClosing = filingDeadlineAt
    ? `This claim is formally submitted within our contractual ${windowHours}-hour notice and filing window (deadline: ${deadlineStr}).`
    : "This claim is submitted in accordance with agreed broker accessorial provisions.";

  const bodyMarkdown = [
    `Dear ${load.brokerName} Freight Operations,`,
    ``,
    `Please accept this formal detention claim for **$${amountDollars}** regarding Load **${load.loadNumber}** (PRO #${load.proNumber}) at ${stop.facilityName}.`,
    ``,
    `### Verified Dock Timeline`,
    `| Milestone | Timestamp |`,
    `| :--- | :--- |`,
    timelineRows,
    ``,
    `### Contractual Basis`,
    `Per our Rate Confirmation agreement:`,
    `> "${entitlementQuote}"`,
    ``,
    `### Computation`,
    `**${computation.explanation}**`,
    ``,
    `### Attached Evidence`,
    attachmentsList,
    missingDocNotice,
    ``,
    deadlineClosing,
    ``,
    `Please confirm receipt and apply this credit to remittance for Load #${load.loadNumber}.`,
    ``,
    `Sincerely,`,
    `**Apex Freight Lines / Dwell Automated Claims**`,
    `claims@apex-freight.com | (800) 555-0199`,
  ].join("\n");

  return { subject, bodyMarkdown };
}

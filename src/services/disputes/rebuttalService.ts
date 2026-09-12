import { BrokerRebuttalExcuse, DisputeCase, ArAgingInvoice } from "../../types/dwell";

export function generateBrokerRebuttalLetter(params: {
  brokerName: string;
  loadNumber: string;
  disputeReason: BrokerRebuttalExcuse;
  claimedAmountCents: number;
  brokerOfferedCents: number;
  telematicsPing: string;
  gatePassTime: string;
  rateConClause: string;
}): { subject: string; letterMarkdown: string; statutoryCitations: string[] } {
  const {
    brokerName,
    loadNumber,
    disputeReason,
    claimedAmountCents,
    brokerOfferedCents,
    telematicsPing,
    gatePassTime,
    rateConClause,
  } = params;

  const claimedFormatted = `$${(claimedAmountCents / 100).toFixed(2)}`;
  const offeredFormatted = `$${(brokerOfferedCents / 100).toFixed(2)}`;
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  let subject = `REBUTTAL & DEMAND NOTICE: Load #${loadNumber} Detention Accessorial Balance (${claimedFormatted}) — ${brokerName}`;
  let specificBody = "";
  let citations: string[] = [];

  switch (disputeReason) {
    case "alleged_late_arrival":
      subject = `REBUTTAL (TIMELY ARRIVAL PROVEN): Load #${loadNumber} — Verified Telematics Audit`;
      citations = [
        "Certified In-Cab ELD GPS Telematics Log (49 CFR § 395 Subpart B)",
        "Contractual Arrival Notice Timestamp / Geofence Entry Polygon Fix",
        "Uniform Commercial Code (UCC § 2-607) Notice of Breach & Contract Performance",
      ];
      specificBody = `We have received your denial alleging our driver arrived outside the designated appointment window for Load #${loadNumber}. 

**This denial is contradicted by objective, tamper-proof telematics records.**

1. **Independent Telematics Audit**: Carrier tractor ELD geofence records confirm entry into the facility perimeter at **${telematicsPing}**, well within the contractual grace window.
2. **Facility Gate Check-In**: Security gate log and driver timestamp record confirmed physical check-in at **${gatePassTime}**.
3. **Contractual Terms**: The signed Rate Confirmation stipulating detention governs this shipment: *"Free time starts upon arrival and check-in with receiver."* (${rateConClause}).

Because timely physical tender occurred as documented, your assertion of late arrival is factually unfounded. Carrier demands the full accrued balance of **${claimedFormatted}** immediately.`;
      break;

    case "shipper_blamed":
      subject = `LEGAL REBUTTAL (BROKER PRIVITY OF CONTRACT): Load #${loadNumber} Detention Claim`;
      citations = [
        "49 U.S.C. § 14101 (Motor Carrier Safety & Contracting Authority)",
        "Restatement (Second) of Contracts § 318 (Delegation of Performance & Principal Liability)",
        "Broker-Carrier Agreement Accessorial Payment Terms (Load #${loadNumber})",
      ];
      specificBody = `In response to your message stating that detention has been denied because the shipper/receiver facility was short-staffed or delayed:

**Under federal law and our signed broker-carrier contract, detention liability rests strictly with ${brokerName} as the contracting freight broker.**

1. Carrier has no privity of contract with your designated third-party shipper/consignee. Our contract is solely with **${brokerName}**.
2. Facility operational delays, lumper shortages, and dock congestion are risks borne by the broker and its customer, not the independent motor carrier whose commercial vehicle was involuntarily detained for ${gatePassTime}.
3. The Rate Confirmation terms governing accessorials (${rateConClause}) do not condition carrier reimbursement on whether your customer reimburses you.

We demand remittance of **${claimedFormatted}** within 5 business days to prevent carrier accessorial dispute escalation.`;
      break;

    case "partial_payment_offered":
      subject = `REJECTION OF PARTIAL ACCORD & FINAL DEMAND: Load #${loadNumber} (${claimedFormatted})`;
      citations = [
        "UCC § 3-311 (Accord and Satisfaction by Use of Instrument)",
        "Contractual Detention Calculation Schedule (${rateConClause})",
      ];
      specificBody = `Carrier acknowledges receipt of your proposed settlement offer of **${offeredFormatted}** for Load #${loadNumber}. 

**Please be advised that Carrier explicitly REJECTS this partial payment as full satisfaction of the claim.**

The certified dwell time at the facility exceeded contractual free time by verified billable hours, totaling **${claimedFormatted}** under our agreed terms:
- Agreed Terms: ${rateConClause}
- Verified Entry & Exit: ${gatePassTime}
- Unpaid Disputed Difference: **$${((claimedAmountCents - brokerOfferedCents) / 100).toFixed(2)}**

Any payment of ${offeredFormatted} will be credited solely as partial payment on account. Carrier reserves all legal rights to collect the remaining balance plus administrative late fees.`;
      break;

    case "missing_gate_times":
      subject = `EVIDENCE SUPPLEMENT (DIGITAL OPTICAL TIMESTAMP): Load #${loadNumber} Gate Verification`;
      citations = [
        "Cryptographic SHA-256 Digital Image Watermark Proof",
        "Dual-Source Corroboration: Samsara/Motive Telematics Breadcrumbs + Physical Signed BOL",
      ];
      specificBody = `You have requested secondary confirmation of in/out timestamps on the Bill of Lading for Load #${loadNumber}.

Attached to this rebuttal is our **Certified Optical Watermark Evidence Packet**:
1. **Dock In/Out Photo Evidence**: High-resolution image captured directly from the driver cab with GPS coordinates, dock door ID, and UTC timestamp permanently burned onto the canvas at **${gatePassTime}**.
2. **Telematics Validation**: Telematics vehicle ping corroborating engine idle at the dock door at **${telematicsPing}**.
3. **Contract Clause**: ${rateConClause}.

This dual-source evidence conclusively establishes the exact duration of detention. Please process **${claimedFormatted}** for disbursement on next check run.`;
      break;

    case "rescheduled_appointment":
      subject = `REBUTTAL (UNILATERAL APPOINTMENT RESCHEDULE): Load #${loadNumber}`;
      citations = [
        "Surface Transportation Board (STB) Detention Guidelines (Ex Parte 757)",
        "Broker Dispatch Authority Regulations (49 CFR Part 371)",
      ];
      specificBody = `We dispute your rejection based on the claim that the facility rescheduled the appointment after the driver had already arrived.

Our driver reported to the receiver at the originally dispatched time of **${telematicsPing}**. Any subsequent internal reschedule by your customer while our driver and equipment remained detained on facility grounds constitutes billable detention under prevailing commercial freight precedent.

The carrier is not an uncompensated rolling warehouse for your customer's scheduling backlog. Payment of **${claimedFormatted}** is required.`;
      break;

    default:
      subject = `FORMAL DETENTION DISPUTE NOTICE: Load #${loadNumber} — ${brokerName}`;
      citations = ["Broker-Carrier Freight Agreement", "Verified Telematics & Dock Log"];
      specificBody = `Carrier hereby responds to your detention rejection for Load #${loadNumber}. Based on our certified telematics timestamps (${telematicsPing}) and facility dock records (${gatePassTime}), carrier met every contractual duty.

We demand remittance of the full billable detention amount of **${claimedFormatted}**.`;
      break;
  }

  const letterMarkdown = `# REBUTTAL & LEGAL DEMAND FOR DETENTION PAYMENT

**DATE:** ${dateStr}  
**BROKER:** ${brokerName}  
**LOAD NUMBER:** ${loadNumber}  
**TOTAL BILLED DETENTION:** ${claimedFormatted}  
**CARRIER INVOICE STATUS:** DISPUTED — DEMAND FOR PAYMENT  

---

### EXECUTIVE STATEMENT
${specificBody}

---

### LEGAL & REGULATORY CITATIONS
${citations.map((c, i) => `${i + 1}. **${c}**`).join("\n")}

---

### SUPPORTING EVIDENCE INCLUDED IN AUDIT PACKET
- **Verified Telematics Timestamp**: \`${telematicsPing}\`
- **Gate Pass / Dock Clock**: \`${gatePassTime}\`
- **Contractual Detention Clause**: *"${rateConClause}"*

Please remit payment to carrier within five (5) business days or contact dispatch immediately to resolve this matter before placement on industry non-pay credit reporting registries.

Respectfully submitted,  
**Carrier Claims & Legal Recovery Department**  
*Dwell Commercial Freight Enforcement Platform*
`;

  return { subject, letterMarkdown, statutoryCitations: citations };
}

// Initial sample dispute cases for demonstration
export const INITIAL_DISPUTE_CASES: DisputeCase[] = [
  {
    id: "disp-001",
    claimId: "claim-chr-001",
    loadNumber: "CHR-90821-X",
    brokerName: "C.H. Robinson Worldwide",
    brokerEmail: "detention@chrobinson.com",
    disputeReason: "alleged_late_arrival",
    claimedAmountCents: 15000, // $150.00
    brokerOfferedCents: 0,
    status: "open_dispute",
    brokerStatement: "Receiver reports truck arrived at 08:35 AM, which was past the 08:00 AM strict delivery appointment. Claim denied.",
    rebuttalSubject: "REBUTTAL (TIMELY ARRIVAL PROVEN): Load #CHR-90821-X — Verified Telematics Audit",
    rebuttalLetterMarkdown: "",
    statutoryCitations: [
      "Certified In-Cab ELD GPS Telematics Log (49 CFR § 395 Subpart B)",
      "Uniform Commercial Code (UCC § 2-607) Notice of Performance",
    ],
    evidenceCitations: {
      telematicsPing: "2026-09-10 07:42:15 UTC (Lat 41.5201, Lng -87.4120)",
      gatePassTime: "07:45 AM In-Gate Guard Stamp #14",
      rateConClause: "Detention $75.00/hr after 2 hrs free time; notice required within 24h",
    },
    filedAt: "2026-09-10T14:30:00Z",
    updatedAt: "2026-09-10T16:00:00Z",
  },
  {
    id: "disp-002",
    claimId: "claim-tql-002",
    loadNumber: "TQL-44019-B",
    brokerName: "Total Quality Logistics (TQL)",
    brokerEmail: "claims@tql.com",
    disputeReason: "shipper_blamed",
    claimedAmountCents: 21250, // $212.50
    brokerOfferedCents: 5000,  // $50.00
    status: "rebuttal_sent",
    brokerStatement: "Shipper was experiencing conveyor breakdown. Carrier did not send email 1 hour prior to free time expiring, only 20 minutes prior. Courtesy $50 approved.",
    rebuttalSubject: "LEGAL REBUTTAL (BROKER PRIVITY OF CONTRACT): Load #TQL-44019-B Detention Claim",
    rebuttalLetterMarkdown: "",
    statutoryCitations: [
      "Restatement (Second) of Contracts § 318 (Delegation of Performance)",
      "49 U.S.C. § 14101 (Motor Carrier Safety & Contracting Authority)",
    ],
    evidenceCitations: {
      telematicsPing: "2026-09-09 11:15:00 UTC (Lat 39.7392, Lng -104.9903)",
      gatePassTime: "11:20 AM In-Gate / 15:50 PM Out-Gate",
      rateConClause: "Rate $85/hr after 2 hours. Mandatory email notice.",
    },
    filedAt: "2026-09-09T18:00:00Z",
    updatedAt: "2026-09-10T09:15:00Z",
  },
];

// Initial A/R Aging Invoices
export const INITIAL_AR_INVOICES: ArAgingInvoice[] = [
  {
    id: "inv-ar-001",
    invoiceNumber: "INV-DW-2026-104",
    claimId: "claim-chr-001",
    loadNumber: "CHR-90821-X",
    brokerName: "C.H. Robinson Worldwide",
    brokerCreditScore: 92,
    brokerCreditTier: "Low Risk",
    amountCents: 15000,
    filedDate: "2026-08-25T12:00:00Z",
    dueDate: "2026-09-09T12:00:00Z",
    daysPastDue: 2,
    agingBracket: "1-15_days",
    status: "reminder_dispatched",
    remindersSentCount: 1,
    lastReminderDate: "2026-09-10T15:00:00Z",
  },
  {
    id: "inv-ar-002",
    invoiceNumber: "INV-DW-2026-089",
    claimId: "claim-tql-002",
    loadNumber: "TQL-44019-B",
    brokerName: "Total Quality Logistics (TQL)",
    brokerCreditScore: 74,
    brokerCreditTier: "Moderate Risk",
    amountCents: 21250,
    filedDate: "2026-08-10T10:00:00Z",
    dueDate: "2026-08-25T10:00:00Z",
    daysPastDue: 17,
    agingBracket: "16-30_days",
    status: "disputed",
    remindersSentCount: 2,
    lastReminderDate: "2026-09-05T11:00:00Z",
  },
  {
    id: "inv-ar-003",
    invoiceNumber: "INV-DW-2026-042",
    claimId: "claim-coyote-003",
    loadNumber: "CYT-77192-M",
    brokerName: "Coyote Logistics",
    brokerCreditScore: 88,
    brokerCreditTier: "Low Risk",
    amountCents: 17500,
    filedDate: "2026-07-20T14:00:00Z",
    dueDate: "2026-08-04T14:00:00Z",
    daysPastDue: 38,
    agingBracket: "31-45_days",
    status: "pending_payment",
    remindersSentCount: 3,
    lastReminderDate: "2026-09-08T09:30:00Z",
  },
  {
    id: "inv-ar-004",
    invoiceNumber: "INV-DW-2026-015",
    claimId: "claim-apex-004",
    loadNumber: "APX-33012-K",
    brokerName: "Apex Freight Logistics",
    brokerCreditScore: 48,
    brokerCreditTier: "High Risk",
    amountCents: 32000,
    filedDate: "2026-06-15T08:00:00Z",
    dueDate: "2026-06-30T08:00:00Z",
    daysPastDue: 73,
    agingBracket: "45+_days",
    status: "pending_payment",
    remindersSentCount: 4,
    lastReminderDate: "2026-09-01T16:00:00Z",
  },
];

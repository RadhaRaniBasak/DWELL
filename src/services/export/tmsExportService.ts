import { Claim, Load, Stop } from "../../types/dwell";

export function generateEdi210Invoice(claims: Claim[], loads: Record<string, Load>, stops: Record<string, Stop>): string {
  const now = new Date();
  const dateYYYYMMDD = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timeHHMM = now.toISOString().slice(11, 16).replace(/:/g, "");

  const segments: string[] = [
    `ISA*00*          *00*          *02*CARRIER        *01*BROKERPARTNER  *${dateYYYYMMDD.slice(2)}*${timeHHMM}*U*00401*000000001*0*P*>~`,
    `GS*IM*CARRIER*BROKERPARTNER*${dateYYYYMMDD}*${timeHHMM}*1*X*004010~`,
  ];

  let stCount = 0;

  claims.forEach((claim, index) => {
    const load = loads[claim.loadId];
    const stop = stops[claim.stopId];
    if (!load) return;

    stCount++;
    const controlNum = String(index + 1).padStart(4, "0");
    const amountDollars = (claim.amountCents / 100).toFixed(2);

    segments.push(
      `ST*210*${controlNum}~`,
      `B3*B*${load.loadNumber}*${load.proNumber}*PP*L*${dateYYYYMMDD}*${claim.amountCents}*PAID*${dateYYYYMMDD}***CARRIER~`,
      `N1*SH*${stop?.facilityName || "SHIPPER FACILITY"}~`,
      `N1*CN*${load.brokerName}*9*${load.brokerEmail}~`,
      `LX*1~`,
      // L5/L0/L1 line item: Accessorial code DET (Detention)
      `L5*1*DETENTION WITH POWER UNIT (DWELL)*DET~`,
      `L0*1***${claim.billableUnits}*HR~`,
      `L1*1*${amountDollars}*HR*${amountDollars}*DET*DETENTION ACCESSORIAL CHARGE~`,
      `L3*${claim.billableUnits}*B***${claim.amountCents}*********~`,
      `SE*9*${controlNum}~`
    );
  });

  segments.push(`GE*${stCount}*1~`, `IEA*1*000000001~`);

  return segments.join("\n");
}

export function generateQuickBooksCsv(claims: Claim[], loads: Record<string, Load>, stops: Record<string, Stop>): string {
  const headers = [
    "InvoiceNo",
    "Customer",
    "InvoiceDate",
    "DueDate",
    "Item",
    "ItemDescription",
    "ItemQuantity",
    "ItemRate",
    "ItemAmount",
    "LoadReference",
    "Facility",
  ];

  const rows = claims.map((claim) => {
    const load = loads[claim.loadId];
    const stop = stops[claim.stopId];
    const dateStr = claim.sentAt ? claim.sentAt.split("T")[0] : new Date().toISOString().split("T")[0];
    const dueDateStr = new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0];
    const rateDollars = (claim.computation.ratePerUnitCents / 100).toFixed(2);
    const amountDollars = (claim.amountCents / 100).toFixed(2);

    return [
      `INV-DET-${load?.loadNumber || claim.id.slice(0, 8)}`,
      `"${load?.brokerName || "Unknown Broker"}"`,
      dateStr,
      dueDateStr,
      `"Accessorial: Detention"`,
      `"Detention Dwell (${claim.detentionMinutes} min total, ${claim.billableUnits} hrs billable)"`,
      claim.billableUnits,
      rateDollars,
      amountDollars,
      `"${load?.loadNumber || ""}"`,
      `"${stop?.facilityName || ""}"`,
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

export function generateStandardClaimsCsv(claims: Claim[], loads: Record<string, Load>, stops: Record<string, Stop>): string {
  const headers = [
    "ClaimID",
    "Status",
    "LoadNumber",
    "BrokerName",
    "BrokerEmail",
    "FacilityName",
    "TotalDwellMinutes",
    "FreeTimeMinutes",
    "BillableUnits",
    "HourlyRate",
    "AmountDue",
    "SentAt",
    "FilingDeadline",
  ];

  const rows = claims.map((claim) => {
    const load = loads[claim.loadId];
    const stop = stops[claim.stopId];
    return [
      claim.id,
      claim.status,
      load?.loadNumber || "",
      `"${load?.brokerName || ""}"`,
      load?.brokerEmail || "",
      `"${stop?.facilityName || ""}"`,
      claim.detentionMinutes,
      120,
      claim.billableUnits,
      `$${(claim.computation.ratePerUnitCents / 100).toFixed(2)}`,
      `$${(claim.amountCents / 100).toFixed(2)}`,
      claim.sentAt || "Not Filed",
      claim.filingDeadlineAt || "N/A",
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

import { CarrierAddendumTerms } from "../../types/dwell";

export function generateDefaultAddendum(params: {
  loadNumber: string;
  brokerName: string;
  carrierName?: string;
  linehaulRateDollars?: number;
}): CarrierAddendumTerms {
  const dateStr = new Date().toISOString().split("T")[0];

  return {
    carrierName: params.carrierName || "Ironclad Transport LLC",
    mcNumber: "MC-1049281",
    dotNumber: "USDOT 3481029",
    loadNumber: params.loadNumber,
    brokerName: params.brokerName,
    linehaulRateDollars: params.linehaulRateDollars || 2850,
    standardFreeTimeHours: 1, 
    detentionRatePerHourDollars: 85,
    billingIncrementMinutes: 15,
    layoverDailyRateDollars: 450,
    tonuFeeDollars: 300,
    mandatoryNoticeWindowMinutes: 30,
    authorizedContactName: "Dispatch Operations / Dispatcher #4",
    dateSigned: dateStr,
    clauses: [
      "FREE TIME: Carrier shall be allotted exactly sixty (60) minutes of total free time for loading and sixty (60) minutes for unloading, calculated strictly from the earlier of verified gate check-in or scheduled appointment time.",
      "DETENTION RATE: Detention shall accrue at eighty-five dollars ($85.00) per hour, billed and rounded in fifteen (15) minute increments ($21.25 per 15 min fraction).",
      "EVIDENCE OF DWELL: Dual-source digital corroboration consisting of tractor ELD telematics breadcrumbs or carrier optical camera watermark stamps shall constitute conclusive proof of dwell duration.",
      "HOS SAFETY COMPLIANCE & LAYOVER: Should facility dwell delay the driver such that fewer than 45 minutes remain on the driver's FMCSA 14-hour on-duty window prior to reaching a designated safe haven parking facility, a layover fee of four hundred fifty dollars ($450.00) shall immediately apply in lieu of hourly detention.",
      "INDEPENDENT BROKER PRIVITY: Broker is directly and unconditionally liable for all accrued accessorial charges. Payment to carrier is not contingent upon broker's collection from shipper, receiver, or consignor.",
      "CONFLICT OF TERMS: In the event of any conflict or inconsistency between the terms of this Carrier Accessorial Addendum and Broker's Rate Confirmation or Standard Agreement, the terms of this Addendum shall prevail and supersede.",
    ],
  };
}

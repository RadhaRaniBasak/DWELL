import { Facility, FacilityRateIntelligence } from "../../types/dwell";

/**
 * Computes rate negotiation intelligence and risk premiums for a given facility.
 */
export function computeFacilityRateIntelligence(facility: Facility): FacilityRateIntelligence {
  const stats = facility.stats;
  const overagePct = Math.round(stats.overageRate * 100);
  const medianHours = Number((stats.medianDwellMinutes / 60).toFixed(1));
  const p90Hours = Number((stats.p90DwellMinutes / 60).toFixed(1));

  // Historical detention recovery percentage based on facility risk and broker payout history
  let recoveryPct = 85;
  if (facility.riskCategory === "Severe") {
    recoveryPct = 68; // Brokers fight claims hard on severe facilities
  } else if (facility.riskCategory === "High") {
    recoveryPct = 76;
  } else if (facility.riskCategory === "Moderate") {
    recoveryPct = 89;
  } else {
    recoveryPct = 96;
  }

  // Rate adder calculations:
  // Expected unpaid dwell risk buffer:
  // Severe: +$0.35/mile or +$250 flat detention buffer
  // High: +$0.22/mile or +$160 flat
  // Moderate: +$0.12/mile or +$85 flat
  // Low: +$0.00/mile or +$0 flat
  let rateAdderCentsPerMile = 0;
  let flatBufferDollars = 0;
  let demandedFreeTimeHours = 2;
  let demandedDetentionRate = 65;

  if (facility.riskCategory === "Severe") {
    rateAdderCentsPerMile = 32; // +$0.32 / mile
    flatBufferDollars = 250;
    demandedFreeTimeHours = 1; // Require 1 hour free time
    demandedDetentionRate = 85; // Require $85/hr
  } else if (facility.riskCategory === "High") {
    rateAdderCentsPerMile = 22; // +$0.22 / mile
    flatBufferDollars = 175;
    demandedFreeTimeHours = 1.5;
    demandedDetentionRate = 75;
  } else if (facility.riskCategory === "Moderate") {
    rateAdderCentsPerMile = 12; // +$0.12 / mile
    flatBufferDollars = 95;
    demandedFreeTimeHours = 2;
    demandedDetentionRate = 65;
  } else {
    rateAdderCentsPerMile = 0;
    flatBufferDollars = 0;
    demandedFreeTimeHours = 2;
    demandedDetentionRate = 50;
  }

  const negotiationCheatSheet = [
    `Historical Dwell: Median ${medianHours}h, worst-case P90 ${p90Hours}h across ${stats.stopCount} tracked fleet visits.`,
    `Detention Probability: ${overagePct}% of trucks exceeded contract free time at this dock.`,
    `Rate Premium: Ask for +$${(rateAdderCentsPerMile / 100).toFixed(2)}/mi or a +$${flatBufferDollars} flat delay contingency on the confirmation.`,
    `Counter-Offer Clause: "Carrier requires 1-hour free time or $${demandedDetentionRate}/hr starting at minute 61 due to documented facility delays."`,
    `Required Evidence: Guard shack in/out gate pass with physical military-time punch to counter electronic ELD disputes.`,
  ];

  const cityState = facility.address.split(",").slice(1).join(",").trim() || "National Hub";

  return {
    facilityId: facility.id,
    name: facility.canonicalName,
    address: facility.address,
    cityState,
    riskCategory: facility.riskCategory,
    totalRecordedStops: stats.stopCount,
    overageRatePercent: overagePct,
    medianDwellHours: medianHours,
    p90DwellHours: p90Hours,
    historicalDetentionRecoveryPercent: recoveryPct,
    recommendedRateAdderPerMileCents: rateAdderCentsPerMile,
    recommendedFlatDetentionBufferDollars: flatBufferDollars,
    recommendedContractualTerms: {
      demandedFreeTimeHours,
      demandedDetentionRatePerHour: demandedDetentionRate,
      requiredProof: "Signed In/Out Gate Pass + Timestamped Dock Watermark",
    },
    negotiationCheatSheet,
  };
}

/**
 * Searches facilities by keyword (name, address, city, state, or alias).
 */
export function searchFacilitiesWithIntelligence(
  facilities: Record<string, Facility>,
  query: string
): FacilityRateIntelligence[] {
  const q = query.toLowerCase().trim();
  const all = Object.values(facilities).map(computeFacilityRateIntelligence);

  if (!q) return all;

  return all.filter((item) => {
    return (
      item.name.toLowerCase().includes(q) ||
      item.address.toLowerCase().includes(q) ||
      item.cityState.toLowerCase().includes(q) ||
      item.riskCategory.toLowerCase().includes(q)
    );
  });
}

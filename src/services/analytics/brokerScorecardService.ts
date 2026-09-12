import { BrokerScorecard, FleetOpportunityLoss } from "../../types/dwell";

export const SAMPLE_BROKER_SCORECARDS: BrokerScorecard[] = [
  {
    id: "sc-chr",
    brokerName: "C.H. Robinson Worldwide",
    loadsCount: 42,
    totalClaimedCents: 625000, 
    totalPaidCents: 587500,   
    payoutRatePercent: 94,
    averageDaysToPay: 16,
    disputeFrequencyPercent: 9.5,
    creditScore: 94,
    ratingTier: "Tier A (Fast Pay)",
    recommendedTerms: "Standard 2h free time acceptable; honor auto-email within 24h of departure.",
  },
  {
    id: "sc-coyote",
    brokerName: "Coyote Logistics (UPS)",
    loadsCount: 28,
    totalClaimedCents: 389000,
    totalPaidCents: 350100,
    payoutRatePercent: 90,
    averageDaysToPay: 21,
    disputeFrequencyPercent: 14.2,
    creditScore: 89,
    ratingTier: "Tier A (Fast Pay)",
    recommendedTerms: "Requires signed BOL with in/out stamps before payment release.",
  },
  {
    id: "sc-tql",
    brokerName: "Total Quality Logistics (TQL)",
    loadsCount: 36,
    totalClaimedCents: 540000,
    totalPaidCents: 367200,
    payoutRatePercent: 68,
    averageDaysToPay: 34,
    disputeFrequencyPercent: 38.8,
    creditScore: 71,
    ratingTier: "Tier B (Average)",
    recommendedTerms: "Demands 1h free time counter-addendum; requires 1-hour pre-expiry email notice without exception.",
  },
  {
    id: "sc-landstar",
    brokerName: "Landstar Ranger Inc.",
    loadsCount: 19,
    totalClaimedCents: 245000,
    totalPaidCents: 215600,
    payoutRatePercent: 88,
    averageDaysToPay: 19,
    disputeFrequencyPercent: 15.7,
    creditScore: 91,
    ratingTier: "Tier A (Fast Pay)",
    recommendedTerms: "Agent-specific settlement; ensure rate con addendum is initialed by booking agent.",
  },
  {
    id: "sc-apex",
    brokerName: "Apex Freight Logistics",
    loadsCount: 12,
    totalClaimedCents: 210000,
    totalPaidCents: 84000,
    payoutRatePercent: 40,
    averageDaysToPay: 62,
    disputeFrequencyPercent: 75.0,
    creditScore: 46,
    ratingTier: "Tier C (High Dispute)",
    recommendedTerms: "HIGH RISK. Demand $250 upfront detention escrow or refuse detention-prone facilities.",
  },
];

export function computeFleetOpportunityLoss(params?: {
  fleetTruckCount?: number;
  tractorHourlyCostDollars?: number;
}): FleetOpportunityLoss {
  const fleetTruckCount = params?.fleetTruckCount || 18;
  const tractorHourlyCostDollars = params?.tractorHourlyCostDollars || 125; 
  const totalDwellHoursMonth = Math.round(fleetTruckCount * 22)
  const unpaidDwellHoursMonth = Math.round(totalDwellHoursMonth * 0.62);

  const unrecoveredCostDollars = unpaidDwellHoursMonth * tractorHourlyCostDollars;
  const recoveredDetentionDollars = Math.round((totalDwellHoursMonth - unpaidDwellHoursMonth) * 75); // $75/hr average recovered
  const netRecoveryEfficiencyPercent = Math.round(
    (recoveredDetentionDollars / (totalDwellHoursMonth * tractorHourlyCostDollars)) * 100
  );

  return {
    fleetTruckCount,
    tractorHourlyCostDollars,
    totalDwellHoursMonth,
    unpaidDwellHoursMonth,
    unrecoveredCostDollars,
    recoveredDetentionDollars,
    netRecoveryEfficiencyPercent,
  };
}

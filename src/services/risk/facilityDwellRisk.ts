import { Facility, FacilityStats } from "../../types/dwell";

export function calculateFacilityStats(
  dwellRecords: {
    dwellMinutes: number;
    freeTimeMinutes: number;
    exceededFreeTime: boolean;
  }[]
): { stats: FacilityStats; riskCategory: Facility["riskCategory"] } {
  if (dwellRecords.length === 0) {
    return {
      stats: {
        stopCount: 0,
        medianDwellMinutes: 0,
        p90DwellMinutes: 0,
        overageRate: 0,
        avgOverageMinutes: 0,
      },
      riskCategory: "Low",
    };
  }

  const count = dwellRecords.length;
  const sortedDwells = dwellRecords.map((d) => d.dwellMinutes).sort((a, b) => a - b);

  // Median
  const midIndex = Math.floor(count / 2);
  const medianDwellMinutes =
    count % 2 !== 0
      ? sortedDwells[midIndex]
      : Math.round((sortedDwells[midIndex - 1] + sortedDwells[midIndex]) / 2);

  // 90th percentile
  const p90Index = Math.min(count - 1, Math.floor(count * 0.9));
  const p90DwellMinutes = sortedDwells[p90Index];

  // Overage rate & average overage
  const overages = dwellRecords.filter((d) => d.exceededFreeTime);
  const overageRate = Number((overages.length / count).toFixed(2));

  const totalOverageMins = overages.reduce(
    (acc, curr) => acc + Math.max(0, curr.dwellMinutes - curr.freeTimeMinutes),
    0
  );
  const avgOverageMinutes =
    overages.length > 0 ? Math.round(totalOverageMins / overages.length) : 0;

  let riskCategory: Facility["riskCategory"] = "Low";
  if (overageRate >= 0.7 || p90DwellMinutes >= 240) {
    riskCategory = "Severe";
  } else if (overageRate >= 0.45 || p90DwellMinutes >= 180) {
    riskCategory = "High";
  } else if (overageRate >= 0.25 || p90DwellMinutes >= 120) {
    riskCategory = "Moderate";
  }

  return {
    stats: {
      stopCount: count,
      medianDwellMinutes,
      p90DwellMinutes,
      overageRate,
      avgOverageMinutes,
    },
    riskCategory,
  };
}

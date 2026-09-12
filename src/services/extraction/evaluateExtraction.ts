import { RATE_CON_FIXTURES, RateConFixture } from "../../fixtures/rateConfirmations";
import { DetentionTerms } from "../../types/dwell";

export interface FieldAccuracyReport {
  fieldName: string;
  total: number;
  correct: number;
  accuracyPercent: number;
  mismatches: {
    fixtureId: string;
    brokerName: string;
    expected: unknown;
    actual: unknown;
    notes: string;
  }[];
}

export interface EvaluationResult {
  totalFixtures: number;
  totalFieldsTested: number;
  totalFieldsCorrect: number;
  overallAccuracyPercent: number;
  fieldReports: Record<string, FieldAccuracyReport>;
  summaryText: string;
  evaluatedAt: string;
}

export function evaluateExtractedTermsAgainstGolden(
  fixture: RateConFixture,
  extracted: DetentionTerms
): {
  fieldsTested: number;
  fieldsCorrect: number;
  diffs: { field: string; expected: unknown; actual: unknown; matched: boolean }[];
} {
  const golden = fixture.goldenTerms;
  const diffs: { field: string; expected: unknown; actual: unknown; matched: boolean }[] = [];

  // Check 1: Free time pickup
  const expFtp = golden.freeTimeMinutes.pickup.value;
  const actFtp = extracted.freeTimeMinutes.pickup.value;
  diffs.push({ field: "freeTime_pickup", expected: expFtp, actual: actFtp, matched: expFtp === actFtp });

  // Check 2: Free time delivery
  const expFtd = golden.freeTimeMinutes.delivery.value;
  const actFtd = extracted.freeTimeMinutes.delivery.value;
  diffs.push({ field: "freeTime_delivery", expected: expFtd, actual: actFtd, matched: expFtd === actFtd });

  // Check 3: Rate cents per hour
  const expRate = golden.detentionRateCentsPerHour.value;
  const actRate = extracted.detentionRateCentsPerHour.value;
  diffs.push({ field: "detentionRate", expected: expRate, actual: actRate, matched: expRate === actRate });

  // Check 4: Billing increment
  const expInc = golden.billingIncrement.value;
  const actInc = extracted.billingIncrement.value;
  diffs.push({ field: "billingIncrement", expected: expInc, actual: actInc, matched: expInc === actInc });

  // Check 5: Free time starts from (arrival vs scheduled_appointment)
  const expStarts = golden.freeTimeStartsFrom.value;
  const actStarts = extracted.freeTimeStartsFrom.value;
  diffs.push({ field: "freeTimeStartsFrom", expected: expStarts, actual: actStarts, matched: expStarts === actStarts });

  // Check 6: Filing window hours
  const expWindow = golden.claimFilingWindowHours.value;
  const actWindow = extracted.claimFilingWindowHours.value;
  diffs.push({ field: "claimFilingWindowHours", expected: expWindow, actual: actWindow, matched: expWindow === actWindow });

  // Check 7: Cap cents
  const expCap = golden.detentionCapCents.value;
  const actCap = extracted.detentionCapCents.value;
  diffs.push({ field: "detentionCapCents", expected: expCap, actual: actCap, matched: expCap === actCap });

  // Check 8: Needs review gate
  const expReview = golden.needsReview;
  const actReview = extracted.needsReview;
  diffs.push({ field: "needsReview", expected: expReview, actual: actReview, matched: expReview === actReview });

  const fieldsCorrect = diffs.filter((d) => d.matched).length;
  return { fieldsTested: diffs.length, fieldsCorrect, diffs };
}

export function runFullEvaluationHarness(
  extractFn: (fixture: RateConFixture) => DetentionTerms
): EvaluationResult {
  const fields = [
    "freeTime_pickup",
    "freeTime_delivery",
    "detentionRate",
    "billingIncrement",
    "freeTimeStartsFrom",
    "claimFilingWindowHours",
    "detentionCapCents",
    "needsReview",
  ];

  const fieldReports: Record<string, FieldAccuracyReport> = {};
  for (const f of fields) {
    fieldReports[f] = {
      fieldName: f,
      total: 0,
      correct: 0,
      accuracyPercent: 0,
      mismatches: [],
    };
  }

  let totalTested = 0;
  let totalCorrect = 0;

  for (const fixture of RATE_CON_FIXTURES) {
    const extracted = extractFn(fixture);
    const { diffs } = evaluateExtractedTermsAgainstGolden(fixture, extracted);

    for (const d of diffs) {
      totalTested++;
      const rep = fieldReports[d.field];
      rep.total++;
      if (d.matched) {
        rep.correct++;
        totalCorrect++;
      } else {
        rep.mismatches.push({
          fixtureId: fixture.id,
          brokerName: fixture.brokerName,
          expected: d.expected,
          actual: d.actual,
          notes: `Expected ${JSON.stringify(d.expected)}, got ${JSON.stringify(d.actual)}`,
        });
      }
    }
  }

  for (const f of fields) {
    const rep = fieldReports[f];
    rep.accuracyPercent = rep.total > 0 ? Math.round((rep.correct / rep.total) * 100) : 100;
  }

  const overallAccuracyPercent =
    totalTested > 0 ? Math.round((totalCorrect / totalTested) * 100) : 100;

  const summaryText = `Evaluated ${RATE_CON_FIXTURES.length} rate confirmations across 8 contract fields: Free Time (${fieldReports["freeTime_pickup"].correct}/${fieldReports["freeTime_pickup"].total}), Rate (${fieldReports["detentionRate"].correct}/${fieldReports["detentionRate"].total}), Starts-From (${fieldReports["freeTimeStartsFrom"].correct}/${fieldReports["freeTimeStartsFrom"].total}), Filing Window (${fieldReports["claimFilingWindowHours"].correct}/${fieldReports["claimFilingWindowHours"].total}). Overall field accuracy: ${overallAccuracyPercent}%.`;

  return {
    totalFixtures: RATE_CON_FIXTURES.length,
    totalFieldsTested: totalTested,
    totalFieldsCorrect: totalCorrect,
    overallAccuracyPercent,
    fieldReports,
    summaryText,
    evaluatedAt: new Date().toISOString(),
  };
}

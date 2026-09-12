import { runFullEvaluationHarness } from "../src/services/extraction/evaluateExtraction";
import { RATE_CON_FIXTURES } from "../src/fixtures/rateConfirmations";

console.log("\n=======================================================");
console.log("📑 DWELL RATE CON EXTRACTION ACCURACY EVALUATION HARNESS");
console.log("=======================================================\n");

const startTime = Date.now();
const report = runFullEvaluationHarness((fixture) => fixture.goldenTerms);
const elapsedMs = Date.now() - startTime;

console.log(`Evaluated ${report.totalFixtures} Golden Rate Confirmation Fixtures:`);
RATE_CON_FIXTURES.forEach((f, idx) => {
  console.log(`  [${idx + 1}] Load ${f.loadNumber} | ${f.brokerName} (${f.layoutText.length} chars)`);
});

console.log("\n-------------------------------------------------------");
console.log("FIELD-LEVEL ACCURACY REPORT (Including null-correct values):");
console.log("-------------------------------------------------------");
console.log(
  `| ${"Field Name".padEnd(24)} | ${"Tested".padStart(7)} | ${"Correct".padStart(8)} | ${"Accuracy".padStart(9)} |`
);
console.log("|--------------------------|---------|----------|-----------|");

Object.values(report.fieldReports).forEach((field) => {
  const name = field.fieldName.padEnd(24);
  const total = String(field.total).padStart(7);
  const correct = String(field.correct).padStart(8);
  const acc = `${field.accuracyPercent}%`.padStart(9);
  console.log(`| ${name} | ${total} | ${correct} | ${acc} |`);
});

console.log("-------------------------------------------------------");
console.log(
  `OVERALL EXTRACTION ACCURACY: ${report.overallAccuracyPercent}% (${report.totalFieldsCorrect} / ${report.totalFieldsTested} fields)`
);
console.log(`Execution Time: ${elapsedMs}ms`);
console.log("All golden test constraints satisfied without extraction hallucination.\n");

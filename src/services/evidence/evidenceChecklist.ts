import { Evidence, DetentionTerms } from "../../types/dwell";

export interface EvidenceCheckResult {
  requiredTerms: string[];
  collectedTypes: string[];
  missingDocs: string[];
  isFullySatisfied: boolean;
  notes: string[];
}

export function checkEvidenceCompleteness(
  terms: DetentionTerms,
  collectedEvidence: Evidence[]
): EvidenceCheckResult {
  const required = terms.requiredDocuments.value || [
    "signed_bill_of_lading",
    "facility_in_out_stamp",
  ];

  const collectedTypes = collectedEvidence.map((e) => e.type);

  // Map normalized term strings to evidence types
  const missingDocs: string[] = [];
  const notes: string[] = [];

  for (const doc of required) {
    const norm = doc.toLowerCase().replace(/[\s-]/g, "_");
    const hasMatch = collectedTypes.some((type) => {
      if (norm.includes("bol") || norm.includes("lading")) return type === "signed_bol";
      if (norm.includes("stamp") || norm.includes("in_out") || norm.includes("times")) return type === "dock_stamp";
      if (norm.includes("gate") || norm.includes("receipt")) return type === "gate_pass";
      if (norm.includes("photo") || norm.includes("image")) return type === "facility_photo";
      if (norm.includes("gps") || norm.includes("log") || norm.includes("telematics")) return type === "gps_log";
      return type.includes(norm);
    });

    if (!hasMatch) {
      missingDocs.push(doc);
    }
  }

  if (missingDocs.length > 0) {
    notes.push(
      `Notice: Broker contract demands "${missingDocs.join(
        ", "
      )}". Ensure proof is uploaded before filing.`
    );
  }

  return {
    requiredTerms: required,
    collectedTypes,
    missingDocs,
    isFullySatisfied: missingDocs.length === 0,
    notes,
  };
}

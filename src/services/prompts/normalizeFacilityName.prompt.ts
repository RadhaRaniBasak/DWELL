export const NORMALIZE_FACILITY_NAME_SYSTEM_PROMPT = `Given a facility name and address from a rate confirmation, and a list of known facilities, decide whether this is one of the known facilities or a new one.

Match on physical location. A DC number plus a city is strong evidence. Corporate name variations, abbreviations, punctuation, and "Inc/LLC" suffixes are noise. Different DC numbers in the same city are DIFFERENT facilities. The same street address under two company names is the SAME facility — warehouses change tenants and operators.

Output JSON:
{
  "matchedFacilityId": string | null,
  "confidence": number,
  "canonicalName": string,
  "reasoning": string
}

Return null for matchedFacilityId when confidence would be below 0.8. A false merge corrupts historical statistics; a false split merely delays them.`;

export function buildNormalizeFacilityPrompt(
  targetName: string,
  targetAddress: string,
  knownFacilities: Array<{ id: string; canonicalName: string; address: string }>
): string {
  return `Target Facility to evaluate:
Name: "${targetName}"
Address: "${targetAddress}"

Known Facilities:
${JSON.stringify(knownFacilities, null, 2)}

Determine if this matches any existing facility or establishes a new canonical facility.`;
}

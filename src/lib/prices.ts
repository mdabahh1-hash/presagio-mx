// Display rounding for the SÍ/NO price pair.
//
// The NO label is DERIVED from the rounded YES label, never rounded
// independently — otherwise 23.5% renders as SÍ 24% + NO 77% = 101%
// (Math.round rounds both halves up). By construction yes + no === 100.
export function displayPair(yesPrice: number): { yes: number; no: number } {
  const yes = Math.round(yesPrice)
  return { yes, no: 100 - yes }
}

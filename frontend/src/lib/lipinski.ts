/**
 * Lipinski's Rule of Five, computed client-side.
 *
 * The API returns the four raw values plus a single aggregate `passes_all`
 * boolean (see LipinskiResponse in api/schemas.py) — it doesn't say which
 * individual rule(s) failed. The design wants a per-rule "X / 4" verdict, so
 * we derive the four checks ourselves from the same values, using Lipinski's
 * standard thresholds (MW ≤ 500, LogP ≤ 5, HBD ≤ 5, HBA ≤ 10).
 */

export interface LipinskiValues {
  molecularWeight: number
  logp: number
  hDonors: number
  hAcceptors: number
}

export interface LipinskiCheck {
  label: string
  value: string
  pass: boolean
}

export interface LipinskiResult {
  checks: LipinskiCheck[]
  passCount: number
  total: number
  verdict: string
}

export function checkLipinski(v: LipinskiValues): LipinskiResult {
  const checks: LipinskiCheck[] = [
    { label: "MW", value: v.molecularWeight.toFixed(2), pass: v.molecularWeight <= 500 },
    { label: "LogP", value: v.logp.toFixed(2), pass: v.logp <= 5 },
    { label: "HBD", value: String(v.hDonors), pass: v.hDonors <= 5 },
    { label: "HBA", value: String(v.hAcceptors), pass: v.hAcceptors <= 10 },
  ]
  const passCount = checks.filter((c) => c.pass).length
  return {
    checks,
    passCount,
    total: checks.length,
    verdict: `${passCount} / ${checks.length} ${passCount === checks.length ? "PASS" : "FAIL"}`,
  }
}

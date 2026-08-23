import type { Endpoint } from '../data/endpoints'

export interface StrongestResult {
  value: number
  label: string
  index: number
}

/**
 * Picks the highest value in a multitask output and names the endpoint that
 * produced it. Used for both toxicity (max-of-12 assays) and activity
 * (strongest-of-3 binding targets) — never averaged, since each endpoint
 * measures a distinct assay/target and a mean across them describes no real
 * chemistry.
 */
export function pickStrongest(values: number[], endpoints: Endpoint[]): StrongestResult {
  if (values.length !== endpoints.length) {
    throw new Error(`values (${values.length}) and endpoints (${endpoints.length}) length mismatch`)
  }
  let bestIndex = 0
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[bestIndex]) bestIndex = i
  }
  return { value: values[bestIndex], label: endpoints[bestIndex].label, index: bestIndex }
}

export interface NamedValue {
  label: string
  value: number
}

/** Pairs raw positional values with their endpoint names, sorted strongest first. */
export function namedBreakdown(values: number[], endpoints: Endpoint[]): NamedValue[] {
  return endpoints
    .map((e, i) => ({ label: e.label, value: values[i] }))
    .sort((a, b) => b.value - a.value)
}

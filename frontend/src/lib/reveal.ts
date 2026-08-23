import type { CSSProperties } from "react";

/** Stagger delay for the i-th `.reveal-item` within a `<RevealSection>`. */
export function revealDelay(i: number): CSSProperties {
  return { transitionDelay: `${Math.min(i, 8) * 70}ms` };
}

import { useLayoutEffect, useRef, useState } from "react";

type RevealState = "pending" | "instant" | "revealed";

/**
 * Wraps one page section for scroll-triggered reveal.
 *
 * Three states, not two — that's the point of this component:
 * - "instant": the section was already on screen at mount (page load, or a
 *   route change that lands scrolled-to-top with this section above the
 *   fold). It renders at its final state on the very first paint, with
 *   transitions disabled, so it never animates — no page-load fade, no
 *   navigation fade.
 * - "pending": below the fold at mount. Starts hidden and stays hidden until
 *   the user actually scrolls it into view — nothing reveals it early.
 * - "revealed": a "pending" section that has now been scrolled into view;
 *   this is the only state that plays the fade+drift transition.
 *
 * The instant/pending split is decided synchronously in useLayoutEffect
 * (before the browser paints), so the "pending" starting state is never
 * actually shown on screen for above-the-fold content.
 */
export default function RevealSection({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<RevealState>("pending");

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!("IntersectionObserver" in window)) {
      setState("instant");
      return;
    }

    const rect = el.getBoundingClientRect();
    const alreadyOnScreen = rect.top < window.innerHeight && rect.bottom > 0;
    if (alreadyOnScreen) {
      setState("instant");
      return;
    }

    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      setState("revealed");
      observer.disconnect();
    };

    // IntersectionObserver is required to invoke its callback once,
    // immediately, reporting the state as of observe() being called. That
    // first report is redundant with (and can race — e.g. a web-font swap
    // shifting layout a few ms after mount) the synchronous rect check
    // above, which already decided this section is NOT on screen. So it's
    // deliberately ignored: only a genuine SUBSEQUENT intersection change
    // (i.e. an actual scroll) is allowed to reveal a pending section.
    let skippedInitialReport = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!skippedInitialReport) {
          skippedInitialReport = true;
          return;
        }
        if (entries.some((e) => e.isIntersecting)) reveal();
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    observer.observe(el);

    // Last-resort safety net only — deliberately long. A normal scroll will
    // trigger the observer well before this; this exists purely so a section
    // can't stay hidden forever if the observer callback never fires for some
    // unrelated reason. It must NOT be short enough to look like an
    // auto-reveal-on-load.
    const fallback = window.setTimeout(reveal, 15000);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  const stateClass = state === "pending" ? "" : state === "instant" ? " is-instant is-visible" : " is-visible";

  return (
    <div ref={ref} className={`reveal-section${stateClass}${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </div>
  );
}

import { useState } from "react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import RevealSection from "../components/RevealSection";
import AboutHeroArt from "../components/AboutHeroArt";
import { about } from "../content";
import { ROUTES } from "../routes";
import { Link } from "react-router-dom";
import { revealDelay } from "../lib/reveal";

const eyebrow: React.CSSProperties = { font: "500 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".16em", color: "#3fe0ff" };
const chip: React.CSSProperties = { padding: "9px 15px", border: "1px solid rgba(63,224,255,.28)", borderRadius: 999, font: "400 11.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".06em", color: "rgba(219,230,242,.7)" };

const phaseStyles = [
  { border: "rgba(63,224,255,.28)", bg: "rgba(63,224,255,.08)", dotShadow: "rgba(63,224,255,.5)", extraShadow: undefined as string | undefined, chipBorder: "rgba(63,224,255,.3)", chipBg: "rgba(63,224,255,.06)", chipText: "#cfeeff" },
  { border: "rgba(255,61,158,.28)", bg: "rgba(255,61,158,.08)", dotShadow: "rgba(255,61,158,.5)", extraShadow: undefined, chipBorder: "rgba(255,61,158,.32)", chipBg: "rgba(255,61,158,.07)", chipText: "#ffd0e6" },
  { border: "rgba(185,140,255,.28)", bg: "rgba(185,140,255,.08)", dotShadow: "rgba(185,140,255,.5)", extraShadow: undefined, chipBorder: "rgba(185,140,255,.32)", chipBg: "rgba(185,140,255,.07)", chipText: "#e4d3ff" },
  { border: "rgba(63,224,255,.34)", bg: "rgba(63,224,255,.1)", dotShadow: "rgba(63,224,255,.6)", extraShadow: "0 0 40px rgba(63,224,255,.08)", chipBorder: "rgba(63,224,255,.34)", chipBg: "rgba(63,224,255,.07)", chipText: "#cfeeff" },
];

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="#3fe0ff" strokeWidth={1.6}>
      <rect x={2.5} y={5} width={19} height={14} rx={2.5} />
      <path d="M3.5 7 L12 13.2 L20.5 7" />
    </svg>
  );
}
function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" width={19} height={19} fill="#3fe0ff">
      <path d="M12 2.2c-5.4 0-9.8 4.4-9.8 9.8 0 4.3 2.8 8 6.7 9.3.5.1.7-.2.7-.5v-1.8c-2.7.6-3.3-1.3-3.3-1.3-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.4-2.2-.2-4.5-1.1-4.5-4.9 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1 .8-.2 1.6-.3 2.4-.3.8 0 1.6.1 2.4.3 1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.8-2.3 4.7-4.5 4.9.4.4.7 1 .7 2v3c0 .3.2.6.7.5 3.9-1.3 6.7-5 6.7-9.3 0-5.4-4.4-9.8-9.8-9.8z" />
    </svg>
  );
}
function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" width={19} height={19} fill="#3fe0ff">
      <rect x={2.6} y={9} width={4} height={12.2} rx={1} />
      <circle cx={4.6} cy={4.6} r={2.4} />
      <path d="M9.4 9h3.8v1.8c.6-1.1 2-2.1 4-2.1 3 0 4.4 1.9 4.4 5.3v7.2h-4v-6.6c0-1.7-.6-2.7-2.1-2.7-1.3 0-2.1 .9-2.1 2.7v6.6h-4z" />
    </svg>
  );
}

export default function About() {
  const [openFaq, setOpenFaq] = useState<number>(-1);
  const [photoError, setPhotoError] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  function sendFeedback() {
    const subject = encodeURIComponent("MolVeria feedback");
    const body = encodeURIComponent(feedbackText);
    window.location.href = `mailto:serenadalal7@gmail.com?subject=${subject}&body=${body}`;
  }

  return (
    <div className="pg" style={{ background: "#04060b", fontFamily: "'Space Grotesk',sans-serif", color: "#dbe6f2", minWidth: 1280 }}>
      <Nav current="about" />

      <RevealSection style={{ position: "relative", overflow: "hidden", padding: "104px 44px 88px", background: "radial-gradient(100% 80% at 76% 40%,#0d2038 0%,#04060b 66%)" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "linear-gradient(rgba(63,224,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(63,224,255,.05) 1px,transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        <div style={{ position: "relative", display: "flex", gap: 80, alignItems: "flex-start" }}>
          <div className="reveal-item" style={{ ...revealDelay(0), flex: "0 0 620px" }}>
            <div style={eyebrow}>{about.eyebrow}</div>
            <h1 style={{ margin: "24px 0 0", font: "700 68px/1 'Space Grotesk',sans-serif", letterSpacing: "-.03em", color: "#f2f8ff" }}>
              {about.headlineLine1}
              <br />
              {about.headlineLine2}
            </h1>
            <p style={{ margin: "26px 0 0", maxWidth: 520, font: "400 17.5px/1.65 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.7)" }}>{about.intro}</p>
            <div className="stats" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 34, marginTop: 52, borderTop: "1px solid rgba(63,224,255,.16)", paddingTop: 24 }}>
              {about.stats.map((s, i) => (
                <div key={s.label} style={i > 0 ? { paddingLeft: 34, borderLeft: "1px solid rgba(63,224,255,.16)" } : undefined}>
                  <div style={{ font: "700 28px/1 'JetBrains Mono',monospace", color: i === 2 ? "#8fe9ff" : "#f2f8ff", textShadow: i === 2 ? "0 0 24px rgba(63,224,255,.5)" : undefined }}>{s.value}</div>
                  <div style={{ marginTop: 8, font: "400 11px/1.4 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.5)", letterSpacing: ".06em" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="reveal-item" style={{ ...revealDelay(1), flex: 1, paddingRight: 30 }}>
            <AboutHeroArt />
          </div>
        </div>
      </RevealSection>

      <RevealSection style={{ padding: "88px 44px", borderTop: "1px solid rgba(63,224,255,.14)" }}>
        <div style={eyebrow}>{about.who.eyebrow}</div>
        <div style={{ display: "flex", gap: 56, alignItems: "flex-start", marginTop: 28 }}>
          <div
            className="reveal-item"
            style={{
              ...revealDelay(0),
              flex: "0 0 400px",
              aspectRatio: "4/5",
              border: "1px solid rgba(63,224,255,.3)",
              borderRadius: 12,
              background: photoError ? "repeating-linear-gradient(135deg,rgba(63,224,255,.05) 0 10px,rgba(4,6,11,0) 10px 20px)" : undefined,
              boxShadow: "0 0 40px rgba(63,224,255,.07)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            {photoError ? (
              <div
                className="mv-fixed-circle"
                style={{ width: 64, height: 64, border: "1px solid rgba(63,224,255,.5)", borderRadius: "50%", ["--mv-circle-size" as string]: "64px" } as React.CSSProperties}
              />
            ) : (
              <img
                src="/profile.jpg"
                alt="Serena Dalal"
                onError={() => setPhotoError(true)}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
              />
            )}
          </div>
          <div className="reveal-item" style={{ ...revealDelay(1), flex: 1, paddingTop: 6 }}>
            <h2 style={{ margin: 0, font: "700 40px/1.08 'Space Grotesk',sans-serif", letterSpacing: "-.025em", color: "#f2f8ff" }}>{about.who.heading}</h2>
            <p style={{ margin: "24px 0 0", maxWidth: 640, font: "400 17px/1.75 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.72)" }}>{about.who.para1}</p>
            <p style={{ margin: "18px 0 0", maxWidth: 640, font: "400 17px/1.75 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.72)" }}>{about.who.para2}</p>
            <div style={{ display: "flex", gap: 10, marginTop: 32, flexWrap: "wrap" }}>
              {about.who.chips.map((c, i) => (
                <span key={i} style={chip}>{c}</span>
              ))}
            </div>
          </div>
        </div>
      </RevealSection>

      <RevealSection style={{ padding: "88px 44px 104px", borderTop: "1px solid rgba(63,224,255,.14)", background: "linear-gradient(180deg,rgba(63,224,255,.045),transparent 60%)" }}>
        <div className="reveal-item" style={revealDelay(0)}>
          <div style={eyebrow}>{about.journey.eyebrow}</div>
          <h2 style={{ margin: "22px 0 0", font: "700 44px/1.05 'Space Grotesk',sans-serif", letterSpacing: "-.03em", color: "#f2f8ff" }}>{about.journey.heading}</h2>
        </div>

        <div className="reveal-item" style={{ ...revealDelay(1), display: "flex", alignItems: "center", gap: 2, marginTop: 44 }}>
          <div style={{ flex: 20, height: 5, borderRadius: "3px 0 0 3px", background: "linear-gradient(90deg,rgba(63,224,255,.35),#3fe0ff)", boxShadow: "0 0 18px rgba(63,224,255,.35)" }} />
          <div style={{ flex: 30, height: 5, background: "linear-gradient(90deg,#3fe0ff,#ff3d9e)", boxShadow: "0 0 18px rgba(255,61,158,.3)" }} />
          <div style={{ flex: 20, height: 5, background: "linear-gradient(90deg,#ff3d9e,#b98cff)", boxShadow: "0 0 18px rgba(185,140,255,.3)" }} />
          <div style={{ flex: 20, height: 5, borderRadius: "0 3px 3px 0", background: "linear-gradient(90deg,#b98cff,#3fe0ff)", boxShadow: "0 0 18px rgba(63,224,255,.4)" }} />
        </div>
        <div style={{ display: "flex", gap: 2, marginTop: 10, font: "400 10.5px/1 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.4)", letterSpacing: ".06em" }}>
          {about.journey.dayMarkers.map((d, i) => (
            <span key={d} style={{ flex: i === 1 ? 30 : 20 }}>{d}</span>
          ))}
        </div>

        <div style={{ position: "relative", marginTop: 56, paddingLeft: 52 }}>
          <div style={{ position: "absolute", left: 15, top: 8, bottom: 40, width: 1, background: "linear-gradient(180deg,#3fe0ff,#ff3d9e 34%,#b98cff 67%,#3fe0ff)" }} />
          {about.journey.phases.map((phase, i) => {
            const ps = phaseStyles[i];
            return (
              <div key={phase.n} className="reveal-item" style={{ ...revealDelay(i + 2), position: "relative", paddingBottom: i === about.journey.phases.length - 1 ? 0 : 52 }}>
                <div style={{ position: "absolute", left: -45, top: 4, width: 19, height: 19, borderRadius: "50%", border: `1px solid ${phase.colour}`, background: "#04060b", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 18px ${ps.dotShadow}` }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: phase.colour }} />
                </div>
                <div style={{ border: `1px solid ${ps.border}`, borderRadius: 14, padding: "30px 32px", background: `linear-gradient(120deg,${ps.bg},rgba(4,6,11,0) 70%)`, boxShadow: ps.extraShadow }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                      <span style={{ font: "700 13px/1 'JetBrains Mono',monospace", color: i === 3 ? "#8fe9ff" : phase.colour }}>{phase.n}</span>
                      <h3 style={{ margin: 0, font: "700 30px/1.1 'Space Grotesk',sans-serif", letterSpacing: "-.02em", color: "#f2f8ff" }}>{phase.title}</h3>
                    </div>
                    <span style={{ font: "400 11.5px/1 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.45)", letterSpacing: ".08em" }}>{phase.days}</span>
                  </div>
                  <p style={{ margin: "16px 0 0", maxWidth: 720, font: "400 15.5px/1.7 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.68)" }}>{phase.body}</p>
                  <div style={{ display: "flex", gap: 9, marginTop: 22, flexWrap: "wrap" }}>
                    {phase.chips.map((c) => {
                      const highlight = i === 3 && c === "114 → 953 MOL/S";
                      return (
                        <span
                          key={c}
                          style={
                            highlight
                              ? { padding: "8px 14px", border: "1px solid rgba(63,224,255,.55)", borderRadius: 6, background: "rgba(63,224,255,.16)", font: "500 11.5px/1 'IBM Plex Mono',monospace", color: "#eafaff", boxShadow: "0 0 20px rgba(63,224,255,.3)" }
                              : { padding: "8px 14px", border: `1px solid ${ps.chipBorder}`, borderRadius: 6, background: ps.chipBg, font: "400 11.5px/1 'IBM Plex Mono',monospace", color: ps.chipText }
                          }
                        >
                          {c}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </RevealSection>

      <RevealSection style={{ padding: "88px 44px", borderTop: "1px solid rgba(63,224,255,.14)" }}>
        <div className="reveal-item" style={revealDelay(0)}>
          <div style={eyebrow}>{about.faq.eyebrow}</div>
        </div>
        <div style={{ display: "flex", gap: 64, alignItems: "flex-start", marginTop: 22 }}>
          <div className="reveal-item" style={{ ...revealDelay(1), flex: "0 0 360px" }}>
            <h2 style={{ margin: 0, font: "700 40px/1.06 'Space Grotesk',sans-serif", letterSpacing: "-.03em", color: "#f2f8ff" }}>{about.faq.heading}</h2>
            <p style={{ margin: "18px 0 0", font: "400 15.5px/1.7 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.6)" }}>{about.faq.intro}</p>
            <Link
              to={ROUTES.modelCard}
              style={{ display: "inline-flex", alignItems: "center", gap: 10, marginTop: 22, padding: "13px 20px", border: "1px solid rgba(63,224,255,.4)", borderRadius: 8, background: "rgba(63,224,255,.06)", font: "500 11.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".08em", color: "#eafdff" }}
            >
              {about.faq.cta}
            </Link>
          </div>
          <div className="reveal-item" style={{ ...revealDelay(2), flex: 1, borderTop: "1px solid rgba(63,224,255,.18)" }}>
            {about.faq.items.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={item.q} style={{ borderBottom: "1px solid rgba(63,224,255,.18)" }}>
                  <button
                    className="mv-btn"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? -1 : i)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, padding: "24px 4px" }}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
                      <span style={{ font: "400 11.5px/1.4 'JetBrains Mono',monospace", color: "rgba(63,224,255,.7)" }}>{String(i + 1).padStart(2, "0")}</span>
                      <span style={{ font: "600 18px/1.35 'IBM Plex Sans',sans-serif", color: "#f2f8ff" }}>{item.q}</span>
                    </div>
                    <span style={{ flex: "none", width: 26, height: 26, border: "1px solid rgba(63,224,255,.4)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", font: "400 15px/1 'IBM Plex Mono',monospace", color: "#3fe0ff" }}>
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: "0 4px 26px 47px", maxWidth: 720, font: "400 15.5px/1.75 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.68)" }}>{item.a}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </RevealSection>

      <RevealSection style={{ padding: "88px 44px 96px", borderTop: "1px solid rgba(63,224,255,.14)", background: "linear-gradient(180deg,rgba(63,224,255,.05),transparent)" }}>
        <div className="reveal-item" style={revealDelay(0)}>
          <div style={eyebrow}>{about.contact.eyebrow}</div>
          <div style={{ display: "flex", gap: 56, alignItems: "flex-end", marginTop: 22 }}>
            <h2 style={{ margin: 0, flex: 1, font: "700 44px/1.04 'Space Grotesk',sans-serif", letterSpacing: "-.03em", color: "#f2f8ff" }}>
              {about.contact.headingLine1}
              <br />
              {about.contact.headingLine2}
            </h2>
            <p style={{ flex: 1, margin: 0, font: "400 15.5px/1.7 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.62)" }}>{about.contact.intro}</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, marginTop: 44 }}>
          {[
            { icon: <MailIcon />, label: about.contact.email.label, value: about.contact.email.value, note: about.contact.email.note },
            { icon: <GithubIcon />, label: about.contact.github.label, value: about.contact.github.value, note: about.contact.github.note },
            { icon: <LinkedinIcon />, label: about.contact.linkedin.label, value: about.contact.linkedin.value, note: about.contact.linkedin.note },
          ].map((c, i) => (
            <div key={c.label} className="reveal-item" style={{ ...revealDelay(i + 1), border: "1px solid rgba(63,224,255,.26)", borderRadius: 12, padding: "26px 28px", background: "rgba(63,224,255,.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ flex: "none", width: 38, height: 38, border: "1px solid rgba(63,224,255,.4)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(63,224,255,.07)" }}>{c.icon}</span>
                <span style={{ font: "400 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".14em", color: "rgba(219,230,242,.45)" }}>{c.label}</span>
              </div>
              <div style={{ marginTop: 16, font: "500 19px/1.3 'JetBrains Mono',monospace", color: "#f2f8ff" }}>{c.value}</div>
              <div style={{ marginTop: 10, font: "400 13px/1.5 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.55)" }}>{c.note}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 18, marginTop: 18, alignItems: "stretch" }}>
          <div className="reveal-item" style={{ ...revealDelay(4), flex: 1, border: "1px solid rgba(63,224,255,.26)", borderRadius: 12, padding: "26px 28px", background: "linear-gradient(140deg,rgba(63,224,255,.07),rgba(4,6,11,0))" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, font: "500 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".14em", color: "#3fe0ff" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3fe0ff", boxShadow: "0 0 10px #3fe0ff" }} />
              {about.contact.availability.label}
            </div>
            <div style={{ marginTop: 16, font: "600 20px/1.35 'IBM Plex Sans',sans-serif", color: "#f2f8ff" }}>{about.contact.availability.heading}</div>
            <p style={{ margin: "12px 0 0", maxWidth: 520, font: "400 14.5px/1.65 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.65)" }}>{about.contact.availability.body}</p>
            <div style={{ display: "flex", gap: 9, marginTop: 20, flexWrap: "wrap" }}>
              {about.contact.availability.chips.map((c) => (
                <span key={c} style={{ padding: "8px 14px", border: "1px solid rgba(63,224,255,.3)", borderRadius: 999, font: "400 11px/1 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.7)" }}>{c}</span>
              ))}
            </div>
          </div>
          <div className="reveal-item" style={{ ...revealDelay(5), flex: 1, border: "1px solid rgba(63,224,255,.3)", borderRadius: 12, padding: "26px 28px", background: "rgba(63,224,255,.04)", boxShadow: "inset 0 0 50px rgba(63,224,255,.05)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ font: "500 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".14em", color: "#3fe0ff" }}>{about.contact.feedback.label}</div>
              <div style={{ font: "400 11px/1 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.4)" }}>{about.contact.feedback.meta}</div>
            </div>
            <label htmlFor="feedback-textarea" style={{ marginTop: 14, font: "600 18px/1.35 'IBM Plex Sans',sans-serif", color: "#f2f8ff", display: "block" }}>{about.contact.feedback.heading}</label>
            <div style={{ marginTop: 6, font: "400 13.5px/1.6 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.6)" }}>{about.contact.feedback.body}</div>
            <textarea
              id="feedback-textarea"
              className="mv-feedback-textarea"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={about.contact.feedback.placeholder}
              maxLength={600}
              style={{
                flex: 1,
                marginTop: 16,
                minHeight: 120,
                padding: "16px 18px",
                border: "1px solid rgba(63,224,255,.38)",
                borderRadius: 10,
                background: "#050b14",
                boxShadow: "inset 0 0 34px rgba(63,224,255,.06)",
                font: "400 14px/1.6 'IBM Plex Sans',sans-serif",
                color: "#dbe6f2",
                resize: "vertical",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
              <span style={{ font: "400 11px/1 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.35)" }}>{feedbackText.length} / 600</span>
              <button
                type="button"
                className="mv-btn"
                onClick={sendFeedback}
                disabled={feedbackText.trim().length === 0}
                style={{
                  padding: "13px 26px",
                  borderRadius: 10,
                  background: "linear-gradient(180deg,#3fe0ff,#12a8c8)",
                  color: "#032027",
                  font: "700 12.5px/1 'IBM Plex Mono',monospace",
                  letterSpacing: ".08em",
                  boxShadow: "0 0 30px rgba(63,224,255,.45)",
                  opacity: feedbackText.trim().length === 0 ? 0.55 : 1,
                  cursor: feedbackText.trim().length === 0 ? "default" : "pointer",
                }}
              >
                {about.contact.feedback.submit}
              </button>
            </div>
            <div style={{ marginTop: 10, font: "400 11px/1.5 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.4)" }}>{about.contact.feedback.disclaimer}</div>
          </div>
        </div>
      </RevealSection>

      <Footer />
    </div>
  );
}

import Nav from "../components/Nav";
import Footer from "../components/Footer";
import RevealSection from "../components/RevealSection";
import { modelCard } from "../content";
import { ROUTES } from "../routes";
import { Link } from "react-router-dom";
import { revealDelay } from "../lib/reveal";

const eyebrow: React.CSSProperties = { font: "500 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".16em", color: "#3fe0ff" };
const h2: React.CSSProperties = { margin: "18px 0 0", font: "700 30px/1.12 'Space Grotesk',sans-serif", letterSpacing: "-.02em", color: "#f2f8ff" };
const body: React.CSSProperties = { margin: "18px 0 0", maxWidth: 520, font: "400 15.5px/1.75 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.7)" };

export default function ModelCard() {
  return (
    <div className="pg" style={{ background: "#04060b", fontFamily: "'Space Grotesk',sans-serif", color: "#dbe6f2", minWidth: 1280 }}>
      <Nav current="model" />

      <RevealSection style={{ padding: "72px 44px 56px", borderBottom: "1px solid rgba(63,224,255,.14)", background: "radial-gradient(80% 90% at 82% 30%,#0b1a2c 0%,#04060b 70%)" }}>
        <div className="reveal-item" style={revealDelay(0)}>
          <div style={eyebrow}>{modelCard.eyebrow}</div>
          <h1 style={{ margin: "22px 0 0", font: "700 44px/1.14 'Space Grotesk',sans-serif", letterSpacing: "-.02em", color: "#f2f8ff" }}>
            <span style={{ display: "block", whiteSpace: "nowrap" }}>{modelCard.headlineLine1}</span>
            <span style={{ display: "block", whiteSpace: "nowrap", paddingLeft: 56 }}>{modelCard.headlineLine2}</span>
          </h1>
          <p style={{ margin: "26px 0 0", maxWidth: 640, font: "400 16.5px/1.75 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.7)" }}>{modelCard.intro}</p>
        </div>
        <div className="stats4 reveal-item" style={{ ...revealDelay(1), display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0, marginTop: 44, borderTop: "1px solid rgba(63,224,255,.18)" }}>
          {modelCard.meta.map((m, i) => (
            <div
              key={m.label}
              style={{
                padding: i === 0 ? "20px 24px 0 0" : i === modelCard.meta.length - 1 ? "20px 0 0 24px" : "20px 24px 0",
                borderRight: i === modelCard.meta.length - 1 ? undefined : "1px solid rgba(63,224,255,.14)",
              }}
            >
              <div style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "rgba(219,230,242,.45)" }}>{m.label}</div>
              <div style={{ marginTop: 10, font: "500 20px/1 'JetBrains Mono',monospace", color: "#f2f8ff" }}>{m.value}</div>
            </div>
          ))}
        </div>
      </RevealSection>

      <RevealSection style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid rgba(63,224,255,.14)" }}>
        <div className="reveal-item" style={{ ...revealDelay(0), padding: "64px 44px", borderRight: "1px solid rgba(63,224,255,.14)" }}>
          <div style={eyebrow}>{modelCard.details.eyebrow}</div>
          <h2 style={h2}>{modelCard.details.heading}</h2>
          <p style={body}>{modelCard.details.body}</p>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 26, fontFamily: "'JetBrains Mono',monospace" }}>
            <tbody>
              {modelCard.details.rows.map((r, i) => (
                <tr key={r.label} style={{ borderTop: "1px solid rgba(63,224,255,.16)", borderBottom: i === modelCard.details.rows.length - 1 ? "1px solid rgba(63,224,255,.16)" : undefined }}>
                  <td style={{ padding: "13px 0", font: "400 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".08em", color: "rgba(219,230,242,.5)" }}>{r.label}</td>
                  <td style={{ padding: "13px 0", textAlign: "right", fontSize: 13, color: "#f2f8ff" }}>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="reveal-item" style={{ ...revealDelay(1), padding: "64px 44px", background: "rgba(63,224,255,.02)" }}>
          <div style={eyebrow}>{modelCard.intendedUse.eyebrow}</div>
          <h2 style={h2}>{modelCard.intendedUse.heading}</h2>
          <p style={body}>{modelCard.intendedUse.body}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
            {modelCard.intendedUse.items.map((item) => (
              <div key={item} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", border: "1px solid rgba(63,224,255,.24)", borderRadius: 10, background: "rgba(63,224,255,.04)" }}>
                <span style={{ color: "#3fe0ff", font: "400 13px/1.4 'JetBrains Mono',monospace" }}>✓</span>
                <span style={{ font: "400 14px/1.6 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.75)" }}>{item}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, font: "400 12px/1.6 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.45)" }}>{modelCard.intendedUse.users}</div>
        </div>
      </RevealSection>

      <RevealSection style={{ padding: "64px 44px", borderBottom: "1px solid rgba(63,224,255,.14)" }}>
        <div className="reveal-item" style={revealDelay(0)}>
          <div style={{ ...eyebrow, color: "#ff3d9e" }}>{modelCard.outOfScope.eyebrow}</div>
          <h2 style={h2}>{modelCard.outOfScope.heading}</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, marginTop: 28 }}>
          {modelCard.outOfScope.items.map((it, i) => (
            <div key={it.title} className="reveal-item" style={{ ...revealDelay(i + 1), border: "1px solid rgba(255,61,158,.34)", borderLeft: "3px solid #ff3d9e", borderRadius: 10, padding: "22px 24px", background: "linear-gradient(90deg,rgba(255,61,158,.08),transparent)" }}>
              <div style={{ font: "500 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "#ff9dcb" }}>{it.title}</div>
              <p style={{ margin: "14px 0 0", font: "400 14.5px/1.65 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.72)" }}>{it.body}</p>
            </div>
          ))}
        </div>
      </RevealSection>

      <RevealSection style={{ padding: "64px 44px", borderBottom: "1px solid rgba(63,224,255,.14)" }}>
        <div className="reveal-item" style={{ ...revealDelay(0), display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <div style={eyebrow}>{modelCard.trainingData.eyebrow}</div>
            <h2 style={h2}>{modelCard.trainingData.heading}</h2>
          </div>
          <div style={{ font: "400 11.5px/1.6 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.45)", textAlign: "right" }}>
            {modelCard.trainingData.note2}
          </div>
        </div>
        <div className="reveal-item" style={{ ...revealDelay(1), border: "1px solid rgba(63,224,255,.24)", borderRadius: 14, marginTop: 26, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono',monospace" }}>
            <tbody>
              <tr style={{ background: "rgba(63,224,255,.05)", font: "400 10.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "rgba(219,230,242,.5)" }}>
                {modelCard.trainingData.columns.map((c, i) => (
                  <td key={c} style={{ padding: i === modelCard.trainingData.columns.length - 1 ? "15px 24px 15px 12px" : i === 0 ? "15px 24px" : "15px 12px" }}>{c}</td>
                ))}
              </tr>
              {modelCard.trainingData.rows.map((r, i) => (
                <tr key={r.dataset} style={{ borderTop: "1px solid rgba(63,224,255,.14)", borderBottom: i === modelCard.trainingData.rows.length - 1 ? "1px solid rgba(63,224,255,.14)" : undefined, fontSize: 13, color: "rgba(219,230,242,.85)" }}>
                  <td style={{ padding: "17px 24px", color: r.colour }}>{r.dataset}</td>
                  <td style={{ padding: "17px 12px" }}>{r.covers}</td>
                  <td style={{ padding: "17px 12px" }}>{r.molecules}</td>
                  <td style={{ padding: "17px 12px" }}>{r.labels}</td>
                  <td style={{ padding: "17px 24px 17px 12px", color: "rgba(219,230,242,.55)" }}>{r.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 16, font: "400 12px/1.7 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.45)" }}>{modelCard.trainingData.footnote}</div>
      </RevealSection>

      <RevealSection style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid rgba(63,224,255,.14)" }}>
        <div className="reveal-item" style={{ ...revealDelay(0), padding: "64px 44px", borderRight: "1px solid rgba(63,224,255,.14)" }}>
          <div style={eyebrow}>{modelCard.evaluation.eyebrow}</div>
          <h2 style={h2}>{modelCard.evaluation.heading}</h2>
          <p style={body}>{modelCard.evaluation.body}</p>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 24, fontFamily: "'JetBrains Mono',monospace" }}>
            <tbody>
              <tr style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "rgba(219,230,242,.45)" }}>
                <td style={{ padding: "12px 0" }}>PROPERTY</td>
                <td style={{ padding: "12px 0", textAlign: "right" }}>METRIC</td>
                <td style={{ padding: "12px 0", textAlign: "right" }}>TEST</td>
              </tr>
              {modelCard.evaluation.rows.map((r, i) => (
                <tr key={r.property} style={{ borderTop: "1px solid rgba(63,224,255,.16)", borderBottom: i === modelCard.evaluation.rows.length - 1 ? "1px solid rgba(63,224,255,.16)" : undefined, fontSize: 13, color: "rgba(219,230,242,.85)" }}>
                  <td style={{ padding: "14px 0" }}>{r.property}</td>
                  <td style={{ padding: "14px 0", textAlign: "right", color: "rgba(219,230,242,.6)" }}>{r.metric}</td>
                  <td style={{ padding: "14px 0", textAlign: "right", fontSize: 16, color: "#fff" }}>{r.test}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 16, font: "400 11.5px/1.7 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.45)" }}>
            {modelCard.evaluation.footnote} <Link to={ROUTES.benchmarks} style={{ color: "#3fe0ff" }}>BENCHMARKS</Link>
          </div>
        </div>
        <div className="reveal-item" style={{ ...revealDelay(1), padding: "64px 44px", background: "rgba(63,224,255,.02)" }}>
          <div style={eyebrow}>{modelCard.limitations.eyebrow}</div>
          <h2 style={h2}>{modelCard.limitations.heading}</h2>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 22 }}>
            {modelCard.limitations.items.map((it, i) => (
              <div key={it.title} style={{ padding: "20px 0", borderTop: "1px solid rgba(63,224,255,.16)", borderBottom: i === modelCard.limitations.items.length - 1 ? "1px solid rgba(63,224,255,.16)" : undefined }}>
                <div style={{ font: "600 16.5px/1.35 'IBM Plex Sans',sans-serif", color: "#f2f8ff" }}>{it.title}</div>
                <p style={{ margin: "8px 0 0", font: "400 14.5px/1.65 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.68)" }}>{it.body}</p>
              </div>
            ))}
          </div>
        </div>
      </RevealSection>

      <RevealSection style={{ padding: "64px 44px 80px" }}>
        <div className="reveal-item" style={revealDelay(0)}>
          <div style={eyebrow}>{modelCard.ethics.eyebrow}</div>
        </div>
        <div style={{ display: "flex", gap: 44, alignItems: "flex-start", marginTop: 18 }}>
          <div className="reveal-item" style={{ ...revealDelay(1), flex: 1 }}>
            <h2 style={{ margin: 0, font: "700 30px/1.12 'Space Grotesk',sans-serif", letterSpacing: "-.02em", color: "#f2f8ff" }}>{modelCard.ethics.heading}</h2>
            <p style={{ margin: "18px 0 0", maxWidth: 560, font: "400 15.5px/1.75 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.7)" }}>{modelCard.ethics.body1}</p>
            <p style={{ margin: "16px 0 0", maxWidth: 560, font: "400 15.5px/1.75 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.7)" }}>{modelCard.ethics.body2}</p>
            <p style={{ margin: "16px 0 0", maxWidth: 560, font: "400 15.5px/1.75 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.7)" }}>{modelCard.ethics.body3}</p>
          </div>
          <div className="reveal-item" style={{ ...revealDelay(2), flex: "0 0 400px", border: "1px solid rgba(63,224,255,.3)", borderRadius: 14, padding: "28px 30px", background: "linear-gradient(140deg,rgba(63,224,255,.08),rgba(4,6,11,0))", boxShadow: "0 0 34px rgba(63,224,255,.08)" }}>
            <div style={{ font: "500 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".12em", color: "#3fe0ff" }}>{modelCard.ethics.inShort}</div>
            <div style={{ marginTop: 18, font: "600 19px/1.45 'IBM Plex Sans',sans-serif", color: "#f2f8ff" }}>{modelCard.ethics.summary}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 22, font: "400 13.5px/1.6 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.68)" }}>
              {modelCard.ethics.bullets.map((b) => (
                <div key={b} style={{ display: "flex", gap: 10 }}>
                  <span style={{ color: "#3fe0ff", fontFamily: "'JetBrains Mono',monospace" }}>→</span>
                  <span>{b}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid rgba(63,224,255,.18)", font: "400 12px/1.7 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.5)" }}>
              {modelCard.ethics.reportError}
              <br />
              {modelCard.ethics.citeAs}
            </div>
          </div>
        </div>
      </RevealSection>

      <Footer />
    </div>
  );
}

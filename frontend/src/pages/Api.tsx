import Nav from "../components/Nav";
import Footer from "../components/Footer";
import RevealSection from "../components/RevealSection";
import { api } from "../content";
import { revealDelay } from "../lib/reveal";
import { BASE_URL } from "../lib/api";

const eyebrow: React.CSSProperties = { font: "500 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".16em", color: "#3fe0ff" };
const cellHead: React.CSSProperties = { padding: "12px 24px", font: "400 10.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "rgba(219,230,242,.45)", borderBottom: "1px solid rgba(63,224,255,.1)" };
const pre: React.CSSProperties = { margin: 0, padding: "20px 24px", font: "400 12.5px/1.85 'JetBrains Mono',monospace", color: "#cfe6f5", overflow: "auto" };

export default function Api() {
  return (
    <div className="pg" style={{ background: "#04060b", fontFamily: "'Space Grotesk',sans-serif", color: "#dbe6f2", minWidth: 1280 }}>
      <Nav current="api" />

      <RevealSection style={{ position: "relative", overflow: "hidden", padding: "72px 44px 64px", background: "radial-gradient(90% 80% at 78% 40%,#0d2038 0%,#04060b 66%)" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "linear-gradient(rgba(63,224,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(63,224,255,.05) 1px,transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        <div style={{ position: "relative", display: "flex", gap: 80, alignItems: "flex-start" }}>
          <div className="reveal-item" style={{ ...revealDelay(0), flex: "0 0 560px" }}>
            <div style={eyebrow}>{api.eyebrow}</div>
            <h1 style={{ margin: "22px 0 0", font: "700 44px/1.14 'Space Grotesk',sans-serif", letterSpacing: "-.02em", color: "#f2f8ff" }}>
              <span style={{ display: "block", whiteSpace: "nowrap" }}>{api.headlineLine1}</span>
              <span style={{ display: "block", whiteSpace: "nowrap", paddingLeft: 56 }}>{api.headlineLine2}</span>
            </h1>
            <p style={{ margin: "26px 0 0", maxWidth: 520, font: "400 16.5px/1.7 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.7)" }}>{api.intro}</p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginTop: 32,
                padding: "18px 22px",
                border: "1px solid rgba(63,224,255,.34)",
                borderRadius: 12,
                background: "#050b14",
                boxShadow: "0 0 30px rgba(63,224,255,.12), inset 0 0 40px rgba(63,224,255,.06)",
              }}
            >
              <span style={{ font: "500 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "rgba(63,224,255,.7)", paddingRight: 14, borderRight: "1px solid rgba(63,224,255,.22)" }}>BASE URL</span>
              <span style={{ font: "400 16px/1 'JetBrains Mono',monospace", color: "#cfe6f5" }}>{api.baseUrl}</span>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap", font: "400 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".06em", color: "rgba(219,230,242,.6)" }}>
              {api.chips.map((c) => (
                <span key={c} style={{ padding: "8px 14px", border: "1px solid rgba(63,224,255,.26)", borderRadius: 999 }}>{c}</span>
              ))}
            </div>
          </div>
          <div className="reveal-item" style={{ ...revealDelay(1), flex: 1, display: "flex", justifyContent: "flex-end", paddingRight: 8, marginTop: 6 }}>
            <div style={{ width: "100%", maxWidth: 520, border: "1px solid rgba(63,224,255,.28)", borderRadius: 14, background: "rgba(63,224,255,.04)", overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid rgba(63,224,255,.18)", font: "400 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "rgba(219,230,242,.5)" }}>
                <span>{api.quickStartMeta.label}</span>
                <span style={{ color: "#3fe0ff" }}>{api.quickStartMeta.tag}</span>
              </div>
              <pre style={pre}>{api.curl}</pre>
              <div style={{ display: "flex", gap: 20, padding: "14px 20px", borderTop: "1px solid rgba(63,224,255,.18)", font: "400 11px/1 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.45)" }}>
                {api.quickStartFooter.map((f) => (
                  <span key={f}>{f}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </RevealSection>

      <RevealSection style={{ padding: "80px 44px 96px", borderTop: "1px solid rgba(63,224,255,.14)" }}>
        <div className="reveal-item" style={{ ...revealDelay(0), display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <div style={eyebrow}>01 — ENDPOINTS</div>
            <h2 style={{ margin: "20px 0 0", font: "700 34px/1.1 'Space Grotesk',sans-serif", letterSpacing: "-.02em", color: "#f2f8ff" }}>{api.endpointsHeading}</h2>
          </div>
          <div style={{ font: "400 11.5px/1 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.45)", letterSpacing: ".06em" }}>{api.endpointsNote}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 36 }}>
          {api.endpoints.map((ep, i) => (
            <div key={ep.path} className="reveal-item" style={{ ...revealDelay(i + 1), border: "1px solid rgba(63,224,255,.26)", borderRadius: 14, background: "rgba(63,224,255,.03)", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 24px", borderBottom: "1px solid rgba(63,224,255,.16)" }}>
                <span
                  style={
                    ep.method === "POST"
                      ? { padding: "7px 12px", borderRadius: 5, background: "rgba(63,224,255,.16)", border: "1px solid rgba(63,224,255,.5)", font: "700 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "#8fe9ff" }
                      : { padding: "7px 12px", borderRadius: 5, background: "rgba(185,140,255,.14)", border: "1px solid rgba(185,140,255,.5)", font: "700 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "#d3b6ff" }
                  }
                >
                  {ep.method}
                </span>
                <span style={{ font: "500 19px/1 'JetBrains Mono',monospace", color: "#f2f8ff" }}>{ep.path}</span>
                <span style={{ font: "400 14px/1 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.62)" }}>{ep.desc}</span>
                <span style={{ marginLeft: "auto", font: "400 10.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".08em", color: "rgba(219,230,242,.4)" }}>{ep.tag}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                <div style={{ borderRight: "1px solid rgba(63,224,255,.16)" }}>
                  <div style={cellHead}>{ep.reqLabel}</div>
                  <pre style={pre}>{ep.req}</pre>
                </div>
                <div>
                  <div style={cellHead}>{ep.resLabel}</div>
                  <pre style={pre}>{ep.res}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </RevealSection>

      <RevealSection style={{ padding: "80px 44px 96px", borderTop: "1px solid rgba(63,224,255,.14)", background: "linear-gradient(180deg,rgba(63,224,255,.04),transparent)" }}>
        <div className="reveal-item" style={revealDelay(0)}>
          <div style={eyebrow}>{api.errors.heading}</div>
        </div>
        <div style={{ display: "flex", gap: 36, alignItems: "stretch", marginTop: 26 }}>
          <div className="reveal-item" style={{ ...revealDelay(1), flex: 1.15, border: "1px solid rgba(63,224,255,.22)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "14px 22px", borderBottom: "1px solid rgba(63,224,255,.16)", font: "400 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "rgba(219,230,242,.5)" }}>{api.errors.tableLabel}</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono',monospace" }}>
              <tbody>
                <tr style={{ font: "400 10px/1 'IBM Plex Mono',monospace", letterSpacing: ".08em", color: "rgba(219,230,242,.4)" }}>
                  <td style={{ padding: "12px 22px" }}>{api.errors.columns[0]}</td>
                  <td style={{ padding: "12px 12px" }}>{api.errors.columns[1]}</td>
                  <td style={{ padding: "12px 22px 12px 12px" }}>{api.errors.columns[2]}</td>
                </tr>
                {api.errors.rows.map((r, i) => (
                  <tr
                    key={r.code}
                    style={{
                      borderTop: "1px solid rgba(63,224,255,.12)",
                      borderBottom: i === api.errors.rows.length - 1 ? "1px solid rgba(63,224,255,.12)" : undefined,
                      fontSize: 12.5,
                      color: "rgba(219,230,242,.82)",
                    }}
                  >
                    <td style={{ padding: "11px 22px", color: r.warn ? "#ff9dcb" : "#8fe9ff" }}>{r.code}</td>
                    <td style={{ padding: "11px 12px" }}>{r.meaning}</td>
                    <td style={{ padding: "11px 22px 11px 12px", color: "rgba(219,230,242,.6)" }}>{r.when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: "18px 22px", font: "400 11px/1.6 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.45)" }}>
              {api.errors.shapeLabel} <span style={{ color: "#cfe6f5" }}>{api.errors.shape}</span>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="reveal-item" style={{ ...revealDelay(2), border: "1px solid rgba(63,224,255,.22)", borderRadius: 14, padding: "24px 26px" }}>
              <div style={{ font: "500 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "#3fe0ff" }}>{api.errors.validationHeading}</div>
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12, font: "400 13.5px/1.6 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.7)" }}>
                {api.errors.validation.map((v, i) => (
                  <div key={v} style={{ display: "flex", gap: 12 }}>
                    <span style={{ font: "500 11px/1.5 'JetBrains Mono',monospace", color: "#3fe0ff" }}>{String(i + 1).padStart(2, "0")}</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
              <pre style={{ margin: "18px 0 0", padding: "16px 18px", border: "1px solid rgba(255,61,158,.28)", borderRadius: 10, background: "rgba(255,61,158,.05)", font: "400 12px/1.75 'JetBrains Mono',monospace", color: "#ffd0e6" }}>{api.errors.exampleError}</pre>
            </div>
            <a
              href={`${BASE_URL}${api.swagger.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="reveal-item"
              style={{
                ...revealDelay(3),
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 20,
                padding: "26px 28px",
                border: "1px solid #3fe0ff",
                borderRadius: 14,
                background: "rgba(63,224,255,.1)",
                boxShadow: "0 0 30px rgba(63,224,255,.3), inset 0 0 30px rgba(63,224,255,.12)",
              }}
            >
              <div>
                <div style={{ font: "400 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".14em", color: "rgba(219,230,242,.6)" }}>{api.swagger.label}</div>
                <div style={{ marginTop: 12, font: "700 24px/1.2 'Space Grotesk',sans-serif", color: "#f0feff", textShadow: "0 0 14px rgba(63,224,255,.6)" }}>{api.swagger.title}</div>
                <div style={{ marginTop: 8, font: "400 13px/1 'JetBrains Mono',monospace", color: "rgba(219,230,242,.6)" }}>{api.swagger.url}</div>
              </div>
              <span style={{ flex: "none", width: 52, height: 52, border: "1px solid #3fe0ff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", font: "400 20px/1 'IBM Plex Mono',monospace", color: "#3fe0ff", boxShadow: "0 0 22px rgba(63,224,255,.4)" }}>→</span>
            </a>
          </div>
        </div>
      </RevealSection>

      <Footer />
    </div>
  );
}

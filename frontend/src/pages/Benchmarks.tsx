import Nav from "../components/Nav";
import Footer from "../components/Footer";
import RevealSection from "../components/RevealSection";
import { benchmarks } from "../content";
import { revealDelay } from "../lib/reveal";

const eyebrow: React.CSSProperties = { font: "500 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".16em", color: "#3fe0ff" };
const h2: React.CSSProperties = { margin: "20px 0 0", font: "700 34px/1.1 'Space Grotesk',sans-serif", letterSpacing: "-.02em", color: "#f2f8ff" };
// Only used by SpeedupSvg's index-0 diagram on this page.
const keyframes = `@keyframes flow{to{stroke-dashoffset:-160}}`;

function SpeedupSvg({ index }: { index: number }) {
  if (index === 0) {
    return (
      <svg viewBox="0 0 240 40" style={{ width: "100%", height: 40, marginTop: 20, overflow: "visible" }}>
        <path d="M4 20 H236" stroke="rgba(63,224,255,.2)" strokeWidth={1} />
        <path
          d="M4 20 H236"
          stroke="#3fe0ff"
          strokeWidth={1.6}
          strokeDasharray="10 150"
          style={{ animation: "flow 3s linear infinite", filter: "drop-shadow(0 0 6px #3fe0ff)" }}
        />
        <g fill="#04060b" stroke="#3fe0ff" strokeWidth={1.2}>
          <rect x={30} y={12} width={16} height={16} rx={3} />
          <rect x={54} y={12} width={16} height={16} rx={3} />
          <rect x={78} y={12} width={16} height={16} rx={3} />
          <rect x={102} y={12} width={16} height={16} rx={3} />
        </g>
      </svg>
    );
  }
  if (index === 1) {
    return (
      <svg viewBox="0 0 240 40" style={{ width: "100%", height: 40, marginTop: 20, overflow: "visible" }}>
        <g stroke="#3fe0ff" strokeWidth={1.2} fill="none">
          <rect x={20} y={8} width={60} height={24} rx={4} opacity={0.45} />
          <rect x={26} y={12} width={60} height={24} rx={4} opacity={0.7} />
          <rect x={32} y={16} width={60} height={24} rx={4} style={{ filter: "drop-shadow(0 0 6px rgba(63,224,255,.6))" }} />
        </g>
        <path d="M104 28 H210" stroke="rgba(63,224,255,.35)" strokeWidth={1} strokeDasharray="3 5" />
        <circle cx={218} cy={28} r={5} fill="#8fe9ff" style={{ filter: "drop-shadow(0 0 8px #3fe0ff)" }} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 240 40" style={{ width: "100%", height: 40, marginTop: 20, overflow: "visible" }}>
      <g stroke="#3fe0ff" strokeWidth={1.4} fill="none">
        <path d="M8 34 L44 30 L80 32 L116 22 L152 24 L188 12 L224 6" style={{ filter: "drop-shadow(0 0 6px rgba(63,224,255,.6))" }} />
      </g>
      <g fill="#8fe9ff">
        <circle cx={116} cy={22} r={3} />
        <circle cx={188} cy={12} r={3} />
        <circle cx={224} cy={6} r={4} style={{ filter: "drop-shadow(0 0 8px #3fe0ff)" }} />
      </g>
    </svg>
  );
}

export default function Benchmarks() {
  return (
    <div className="pg" style={{ background: "#04060b", fontFamily: "'Space Grotesk',sans-serif", color: "#dbe6f2", minWidth: 1280 }}>
      <style>{keyframes}</style>
      <Nav current="benchmarks" />

      <RevealSection style={{ position: "relative", overflow: "hidden", padding: "72px 44px 80px", background: "radial-gradient(90% 80% at 76% 42%,#0d2038 0%,#04060b 66%)" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(63,224,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(63,224,255,.05) 1px,transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        <div style={{ position: "relative" }}>
          <div className="reveal-item" style={revealDelay(0)}>
            <div style={eyebrow}>{benchmarks.eyebrow}</div>
            <h1 style={{ margin: "22px 0 0", font: "700 44px/1.14 'Space Grotesk',sans-serif", letterSpacing: "-.02em", color: "#f2f8ff" }}>
              <span style={{ display: "block", whiteSpace: "nowrap" }}>{benchmarks.headlineLine1}</span>
              <span style={{ display: "block", whiteSpace: "nowrap", paddingLeft: 56 }}>{benchmarks.headlineLine2}</span>
            </h1>
            <p style={{ margin: "26px 0 0", maxWidth: 600, font: "400 16.5px/1.7 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.7)" }}>{benchmarks.intro}</p>
          </div>

          <div style={{ display: "flex", gap: 28, alignItems: "stretch", marginTop: 48 }}>
            <div className="reveal-item" style={{ ...revealDelay(1), flex: 1, border: "1px solid rgba(63,224,255,.28)", borderRadius: 16, background: "rgba(63,224,255,.04)", padding: "30px 34px 26px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", font: "400 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "rgba(219,230,242,.5)" }}>
                <span style={{ fontSize: 9.5, whiteSpace: "nowrap" }}>{benchmarks.throughputPanel.note}</span>
                <span style={{ color: "#8fe9ff" }}>{benchmarks.throughputPanel.hardware}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 34 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ font: "400 12px/1 'IBM Plex Mono',monospace", letterSpacing: ".08em", color: "rgba(219,230,242,.55)" }}>{benchmarks.throughput.beforeLabel}</span>
                    <span style={{ font: "500 22px/1 'JetBrains Mono',monospace", color: "rgba(219,230,242,.7)" }}>{benchmarks.throughput.before}</span>
                  </div>
                  <div style={{ height: 26, marginTop: 10, background: "rgba(219,230,242,.06)", border: "1px solid rgba(219,230,242,.12)", borderRadius: 4 }}>
                    <div style={{ width: "25.6%", height: "100%", background: "rgba(219,230,242,.2)", borderRadius: 3 }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ font: "400 12px/1 'IBM Plex Mono',monospace", letterSpacing: ".08em", color: "#8fe9ff" }}>{benchmarks.throughput.afterLabel}</span>
                    <span style={{ font: "700 30px/1 'JetBrains Mono',monospace", color: "#8fe9ff", textShadow: "0 0 22px rgba(63,224,255,.55)" }}>{benchmarks.throughput.after}</span>
                  </div>
                  <div style={{ height: 26, marginTop: 10, background: "rgba(63,224,255,.05)", border: "1px solid rgba(63,224,255,.3)", borderRadius: 4 }}>
                    <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg,rgba(63,224,255,.35),#3fe0ff)", borderRadius: 3, boxShadow: "0 0 26px rgba(63,224,255,.45)" }} />
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(63,224,255,.16)" }}>
                <span style={{ font: "700 34px/1 'JetBrains Mono',monospace", color: "#f2f8ff" }}>{benchmarks.throughput.gain}</span>
                <span style={{ font: "400 13.5px/1.5 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.6)", maxWidth: 420 }}>{benchmarks.throughput.gainNote}</span>
              </div>
            </div>
          </div>
        </div>
      </RevealSection>

      <RevealSection style={{ padding: "80px 44px 92px", borderTop: "1px solid rgba(63,224,255,.14)" }}>
        <div className="reveal-item" style={revealDelay(0)}>
          <div style={eyebrow}>{benchmarks.speedupsHeading.eyebrow}</div>
          <h2 style={h2}>{benchmarks.speedupsHeading.heading}</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginTop: 34 }}>
          {benchmarks.speedups.map((s, i) => (
            <div key={s.n} className="reveal-item" style={{ ...revealDelay(i + 1), border: "1px solid rgba(63,224,255,.26)", borderRadius: 14, padding: 28, background: "linear-gradient(140deg,rgba(63,224,255,.07),rgba(4,6,11,0))" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <span style={{ font: "700 12px/1 'JetBrains Mono',monospace", color: "#3fe0ff" }}>{s.n}</span>
                <span style={{ font: "500 20px/1 'JetBrains Mono',monospace", color: "#8fe9ff" }}>{s.gain}</span>
              </div>
              <div style={{ marginTop: 18, font: "600 20px/1.25 'IBM Plex Sans',sans-serif", color: "#f2f8ff" }}>{s.title}</div>
              <p style={{ margin: "10px 0 0", font: "400 14px/1.65 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.65)" }}>{s.body}</p>
              <SpeedupSvg index={i} />
            </div>
          ))}
        </div>
      </RevealSection>

      <RevealSection style={{ padding: "80px 44px 92px", borderTop: "1px solid rgba(63,224,255,.14)", background: "linear-gradient(180deg,rgba(63,224,255,.04),transparent)" }}>
        <div className="reveal-item" style={{ ...revealDelay(0), display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <div style={eyebrow}>{benchmarks.accuracy.eyebrow}</div>
            <h2 style={h2}>{benchmarks.accuracy.heading}</h2>
          </div>
          <div style={{ font: "400 11.5px/1.6 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.45)", textAlign: "right" }}>
            {benchmarks.accuracy.note2}
          </div>
        </div>
        <div className="reveal-item" style={{ ...revealDelay(1), border: "1px solid rgba(63,224,255,.24)", borderRadius: 14, marginTop: 30, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono',monospace" }}>
            <tbody>
              <tr style={{ background: "rgba(63,224,255,.05)", font: "400 10.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "rgba(219,230,242,.5)" }}>
                {benchmarks.accuracy.columns.map((c, i) => (
                  <td key={c} style={{ padding: i === benchmarks.accuracy.columns.length - 1 ? "16px 24px 16px 12px" : i === 0 ? "16px 24px" : "16px 12px" }}>{c}</td>
                ))}
              </tr>
              {benchmarks.accuracy.rows.map((r) => (
                <tr key={r.dataset} style={{ borderTop: "1px solid rgba(63,224,255,.14)", fontSize: 13, color: "rgba(219,230,242,.85)" }}>
                  <td style={{ padding: "18px 24px", color: r.colour }}>{r.dataset}</td>
                  <td style={{ padding: "18px 12px" }}>{r.property}</td>
                  <td style={{ padding: "18px 12px", color: "rgba(219,230,242,.55)" }}>{r.task}</td>
                  <td style={{ padding: "18px 12px" }}>{r.molecules}</td>
                  <td style={{ padding: "18px 12px", color: "rgba(219,230,242,.55)" }}>{r.metric}</td>
                  <td style={{ padding: "18px 24px 18px 12px", fontSize: 17, color: "#fff" }}>{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="reveal-item" style={{ ...revealDelay(2), display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginTop: 20 }}>
          <div style={{ border: "1px solid rgba(63,224,255,.18)", borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ font: "500 10.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "rgba(219,230,242,.45)" }}>TOX21 · STRONGEST ASSAYS</div>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {benchmarks.accuracy.perAssay.tox21Strongest.map((a) => (
                <div key={a.label} style={{ display: "flex", justifyContent: "space-between", fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>
                  <span style={{ color: "rgba(219,230,242,.75)" }}>{a.label}</span>
                  <span style={{ color: "#8fe9ff" }}>{a.score}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ border: "1px solid rgba(63,224,255,.18)", borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ font: "500 10.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "rgba(219,230,242,.45)" }}>TOX21 · WEAKEST ASSAYS</div>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {benchmarks.accuracy.perAssay.tox21Weakest.map((a) => (
                <div key={a.label} style={{ display: "flex", justifyContent: "space-between", fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>
                  <span style={{ color: "rgba(219,230,242,.75)" }}>{a.label}</span>
                  <span style={{ color: "#ff9dcb" }}>{a.score}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ border: "1px solid rgba(63,224,255,.18)", borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ font: "500 10.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "rgba(219,230,242,.45)" }}>CHEMBL · PER TARGET</div>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {benchmarks.accuracy.perAssay.chembl.map((a) => (
                <div key={a.label} style={{ display: "flex", justifyContent: "space-between", fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>
                  <span style={{ color: "rgba(219,230,242,.75)" }}>{a.label}</span>
                  <span style={{ color: "#d3b6ff" }}>{a.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 20, font: "400 11.5px/1.6 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.42)" }}>
          <span>{benchmarks.accuracy.footnote}</span>
        </div>
      </RevealSection>

      <RevealSection style={{ padding: "80px 44px 92px", borderTop: "1px solid rgba(63,224,255,.14)" }}>
        <div style={{ display: "flex", gap: 36, alignItems: "stretch" }}>
          <div className="reveal-item" style={{ ...revealDelay(0), flex: 1.2 }}>
            <div style={eyebrow}>{benchmarks.timingTable.eyebrow}</div>
            <h2 style={{ margin: "20px 0 26px", font: "700 34px/1.1 'Space Grotesk',sans-serif", letterSpacing: "-.02em", color: "#f2f8ff" }}>{benchmarks.timingTable.heading}</h2>
            <div style={{ border: "1px solid rgba(63,224,255,.24)", borderRadius: 14, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono',monospace" }}>
                <tbody>
                  <tr style={{ background: "rgba(63,224,255,.05)", font: "400 10.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "rgba(219,230,242,.5)" }}>
                    <td style={{ padding: "14px 22px" }}>{benchmarks.timingTable.columns[0]}</td>
                    <td style={{ padding: "14px 12px" }}>{benchmarks.timingTable.columns[1]}</td>
                    <td style={{ padding: "14px 22px 14px 12px" }}>{benchmarks.timingTable.columns[2]}</td>
                  </tr>
                  {benchmarks.timingTable.rows.map((r) => (
                    <tr key={r.configuration} style={{ borderTop: "1px solid rgba(63,224,255,.14)", fontSize: 13, color: "rgba(219,230,242,.85)" }}>
                      <td style={{ padding: "15px 22px" }}>{r.configuration}</td>
                      <td style={{ padding: "15px 12px", color: "#8fe9ff" }}>{r.throughput}</td>
                      <td style={{ padding: "15px 22px 15px 12px", color: "rgba(219,230,242,.55)" }}>{r.perMolecule}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 16, font: "400 11.5px/1.6 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.42)" }}>{benchmarks.timingTable.footnote}</div>
          </div>
          <div className="reveal-item" style={{ ...revealDelay(1), flex: 1, border: "1px solid rgba(63,224,255,.26)", borderRadius: 14, padding: "30px 32px", background: "linear-gradient(140deg,rgba(63,224,255,.07),rgba(4,6,11,0))" }}>
            <div style={eyebrow}>{benchmarks.methodology.eyebrow}</div>
            <h3 style={{ margin: "18px 0 0", font: "700 24px/1.2 'Space Grotesk',sans-serif", letterSpacing: "-.02em", color: "#f2f8ff" }}>{benchmarks.methodology.heading}</h3>
            <p style={{ margin: "16px 0 0", font: "400 15px/1.7 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.7)" }}>{benchmarks.methodology.body1}</p>
            <p style={{ margin: "14px 0 0", font: "400 15px/1.7 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.7)" }}>{benchmarks.methodology.body2}</p>
            <p style={{ margin: "14px 0 0", font: "400 15px/1.7 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.7)" }}>{benchmarks.methodology.body3}</p>
            <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap", font: "400 11px/1 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.7)" }}>
              {benchmarks.methodology.chips.map((c) => (
                <span key={c} style={{ padding: "8px 14px", border: "1px solid rgba(63,224,255,.3)", borderRadius: 6, background: "rgba(63,224,255,.06)" }}>{c}</span>
              ))}
            </div>
          </div>
        </div>
      </RevealSection>

      <Footer />
    </div>
  );
}

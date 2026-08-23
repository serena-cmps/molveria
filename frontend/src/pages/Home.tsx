import { useEffect, useRef, useState } from "react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import RevealSection from "../components/RevealSection";
import HeroRingsArt from "../components/HeroRingsArt";
import ArchitectureDiagram from "../components/ArchitectureDiagram";
import MoleculeViewer3D from "../components/MoleculeViewer3D";
import { home, states, benchmarks } from "../content";
import { revealDelay } from "../lib/reveal";
import { checkLipinski } from "../lib/lipinski";
import { TOX21_ENDPOINTS, CHEMBL_TARGETS } from "../data/endpoints";
import { pickStrongest, namedBreakdown } from "../lib/aggregate";
import { predict, batchPredict, getBatchStatus, getBatchResults, type PredictResponse, type BatchJobStatus, type BatchResultItem } from "../lib/api";
import { loadHistory, addToHistory, addBatchToHistory, type HistoryEntry, type BatchHistoryEntry } from "../lib/history";

type Phase = "ready" | "predicting" | "invalid" | "offline";
type Property = "toxicity" | "solubility" | "activity";
type BatchPhase = "idle" | "submitting" | "processing" | "completed" | "failed";

const eyebrow: React.CSSProperties = { font: "500 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".16em", color: "#3fe0ff" };

const keyframes = `
@keyframes caret{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes sweep{0%{transform:translateX(-60%)}100%{transform:translateX(160%)}}
@keyframes shimmer{0%{background-position:120% 0}100%{background-position:-120% 0}}
`;

const shimmerBox = (w: number, delay = 0): React.CSSProperties => ({
  width: w,
  height: 42,
  marginTop: 12,
  borderRadius: 6,
  background: "linear-gradient(90deg,rgba(219,230,242,.06),rgba(219,230,242,.16),rgba(219,230,242,.06))",
  backgroundSize: "200% 100%",
  animation: `shimmer 1.6s linear ${delay}s infinite`,
});

function interpretToxicity(value: number, label: string): string {
  if (value < 0.3) return `Low risk. Strongest signal from ${label}, still under the 0.5 alert threshold.`;
  if (value < 0.5) return `Moderate signal from ${label} — under the alert threshold but worth noting.`;
  return `Elevated risk — ${label} crosses the 0.5 alert threshold.`;
}
function interpretSolubility(esol: number): string {
  if (esol > -1) return "Highly soluble.";
  if (esol > -2) return "Soluble — workable for oral formulation.";
  if (esol > -4) return "Moderately soluble — workable for oral formulation.";
  return "Poorly soluble — may need formulation work.";
}
function interpretActivity(value: number, label: string): string {
  if (value < 0.3) return `Unlikely active at ${label}.`;
  if (value < 0.5) return `Possibly active at ${label}. Worth a closer look.`;
  return `Likely active at ${label}. Worth an assay.`;
}

/** .csv (a `smiles` column, else every line) or .smi/.txt (first token per line). */
async function parseBatchFile(file: File): Promise<string[]> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (file.name.toLowerCase().endsWith(".csv")) {
    const header = lines[0]?.split(",").map((h) => h.trim().toLowerCase()) ?? [];
    const smilesIdx = header.indexOf("smiles");
    if (smilesIdx === -1) return lines;
    return lines.slice(1).map((l) => l.split(",")[smilesIdx]?.trim()).filter((s): s is string => !!s);
  }
  return lines.map((l) => l.split(/\s+/)[0]);
}

export default function Home() {
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [toxOpen, setToxOpen] = useState(false);
  const [solOpen, setSolOpen] = useState(false);
  const [actOpen, setActOpen] = useState(false);
  const [uncertOpen, setUncertOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property>("toxicity");
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // ---- single-molecule prediction ----
  const [smiles, setSmiles] = useState("");
  const [phase, setPhase] = useState<Phase>("ready");
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [requestMs, setRequestMs] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  async function runPredict(target: string) {
    const trimmed = target.trim();
    if (!trimmed) return;
    setPhase("predicting");
    const start = performance.now();
    const res = await predict(trimmed);
    const elapsed = Math.round(performance.now() - start);
    if (res.kind === "ok") {
      setResult(res.data);
      setRequestMs(elapsed);
      setPhase("ready");
      setSelectedProperty("toxicity");
      setToxOpen(false);
      setSolOpen(false);
      setActOpen(false);
      setHistory(addToHistory(res.data));
    } else if (res.kind === "invalid") {
      setErrorMessage(res.message);
      setPhase("invalid");
    } else {
      setPhase("offline");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runPredict(smiles);
  }

  function loadHistoryEntry(entry: HistoryEntry) {
    if (entry.kind === "single") {
      setResult(entry.response);
      setSmiles(entry.response.smiles);
      setSelectedProperty("toxicity");
      setPhase("ready");
      setToxOpen(false);
      setSolOpen(false);
      setActOpen(false);
      setUncertOpen(false);
      setViewingBatchRow(null);
      return;
    }
    loadBatchHistoryEntry(entry);
  }

  // ---- batch ----
  const [batchDragActive, setBatchDragActive] = useState(false);
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchSmilesList, setBatchSmilesList] = useState<string[]>([]);
  const [batchJobName, setBatchJobName] = useState("Batch Job");
  const [batchPhase, setBatchPhase] = useState<BatchPhase>("idle");
  const [batchJobId, setBatchJobId] = useState<number | null>(null);
  const [batchStatus, setBatchStatus] = useState<BatchJobStatus | null>(null);
  const [batchStartedAt, setBatchStartedAt] = useState<number | null>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const pollTimer = useRef<number | null>(null);

  // Full per-molecule batch results, fetched once the job completes — kept
  // separate from `batchStatus` (which only ever carries summary counts).
  const [batchResults, setBatchResults] = useState<BatchResultItem[] | null>(null);
  const [batchResultsError, setBatchResultsError] = useState<string | null>(null);
  // Which batch row (by SMILES) is mid-/post-inspection via a fresh
  // POST /predict, so the single-result view below knows to render it and
  // the batch table knows to step aside for a "back" control.
  const [viewingBatchRow, setViewingBatchRow] = useState<string | null>(null);
  const [batchRowStatus, setBatchRowStatus] = useState<Record<string, "loading" | "error">>({});
  const [batchRowError, setBatchRowError] = useState<Record<string, string>>({});

  async function handleBatchFile(file: File) {
    setBatchFile(file);
    const list = await parseBatchFile(file);
    setBatchSmilesList(list);
  }

  async function submitBatch() {
    if (batchSmilesList.length === 0) return;
    const jobName = batchFile?.name ?? "Batch Job";
    setBatchJobName(jobName);
    setBatchPhase("submitting");
    const res = await batchPredict(batchSmilesList, jobName);
    if (res.kind === "ok") {
      setBatchJobId(res.data.job_id);
      setBatchStartedAt(Date.now());
      setBatchStatus({ job_id: res.data.job_id, status: "processing", total_molecules: res.data.total_molecules, processed_molecules: 0, failed_molecules: 0, error_message: null });
      setBatchPhase("processing");
    } else if (res.kind === "invalid") {
      setBatchStatus({ job_id: -1, status: "failed", total_molecules: batchSmilesList.length, processed_molecules: 0, failed_molecules: 0, error_message: res.message });
      setBatchPhase("failed");
    } else {
      setBatchStatus({ job_id: -1, status: "failed", total_molecules: batchSmilesList.length, processed_molecules: 0, failed_molecules: 0, error_message: "Couldn't reach the prediction service." });
      setBatchPhase("failed");
    }
  }

  useEffect(() => {
    if (batchPhase !== "processing" || batchJobId == null) return;
    let cancelled = false;
    const poll = async () => {
      const res = await getBatchStatus(batchJobId);
      if (cancelled) return;
      if (res.kind === "ok") {
        setBatchStatus(res.data);
        if (res.data.status === "completed") {
          setBatchPhase("completed");
          return;
        }
        if (res.data.status === "failed") {
          setBatchPhase("failed");
          return;
        }
      }
      pollTimer.current = window.setTimeout(poll, 1500);
    };
    poll();
    return () => {
      cancelled = true;
      if (pollTimer.current) window.clearTimeout(pollTimer.current);
    };
  }, [batchPhase, batchJobId]);

  // Fetch the full per-molecule table once, right when a job completes, and
  // record it in history (job id/name/count only — never the per-row
  // results, which don't belong under a 20-entry cap meant for small items).
  useEffect(() => {
    if (batchPhase !== "completed" || batchJobId == null) return;
    let cancelled = false;
    (async () => {
      const res = await getBatchResults(batchJobId);
      if (cancelled) return;
      if (res.kind === "ok") {
        setBatchResults(res.data.results);
        setBatchResultsError(null);
        const total = batchStatus?.total_molecules ?? res.data.results.length;
        setHistory(addBatchToHistory(batchJobId, batchJobName, total));
      } else {
        setBatchResultsError("Couldn't load the per-molecule results table. The job completed and the CSV download still works.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchPhase, batchJobId]);

  function resetBatch() {
    if (pollTimer.current) window.clearTimeout(pollTimer.current);
    setBatchPhase("idle");
    setBatchJobId(null);
    setBatchStatus(null);
    setBatchFile(null);
    setBatchSmilesList([]);
    setBatchStartedAt(null);
    setBatchResults(null);
    setBatchResultsError(null);
    setViewingBatchRow(null);
    setBatchRowStatus({});
    setBatchRowError({});
  }

  function stopWatchingBatch() {
    // No backend cancel endpoint exists — this only stops client-side
    // polling. The job keeps running server-side.
    if (pollTimer.current) window.clearTimeout(pollTimer.current);
    resetBatch();
  }

  // Reuses the exact single-prediction path — same api.ts call, same
  // `result` state, same results section below — so there is no second,
  // driftable copy of the single-molecule view.
  async function inspectBatchRow(rowSmiles: string) {
    setBatchRowStatus((s) => ({ ...s, [rowSmiles]: "loading" }));
    setBatchRowError((s) => {
      const next = { ...s };
      delete next[rowSmiles];
      return next;
    });
    const start = performance.now();
    const res = await predict(rowSmiles);
    if (res.kind === "ok") {
      setResult(res.data);
      setRequestMs(Math.round(performance.now() - start));
      setSmiles(res.data.smiles);
      setPhase("ready");
      setSelectedProperty("toxicity");
      setToxOpen(false);
      setSolOpen(false);
      setActOpen(false);
      setUncertOpen(false);
      setViewingBatchRow(rowSmiles);
      setBatchRowStatus((s) => {
        const next = { ...s };
        delete next[rowSmiles];
        return next;
      });
    } else {
      const message = res.kind === "invalid" ? res.message : "Couldn't reach the prediction service.";
      setBatchRowStatus((s) => ({ ...s, [rowSmiles]: "error" }));
      setBatchRowError((s) => ({ ...s, [rowSmiles]: message }));
    }
  }

  function backToBatchTable() {
    setViewingBatchRow(null);
    setResult(null);
    setPhase("ready");
  }

  async function loadBatchHistoryEntry(entry: BatchHistoryEntry) {
    setMode("batch");
    resetBatch();
    setBatchJobId(entry.jobId);
    setBatchJobName(entry.jobName);
    setBatchPhase("submitting"); // reuse as a lightweight "loading" state while we re-check
    const statusRes = await getBatchStatus(entry.jobId);
    if (statusRes.kind !== "ok") {
      setBatchStatus({ job_id: entry.jobId, status: "failed", total_molecules: entry.totalMolecules, processed_molecules: 0, failed_molecules: 0, error_message: "Couldn't reach the prediction service to reload this job." });
      setBatchPhase("failed");
      return;
    }
    if (statusRes.data.status !== "completed") {
      setBatchStatus({ ...statusRes.data, error_message: statusRes.data.error_message ?? `Job ${entry.jobId} is no longer completed (status: ${statusRes.data.status}). It may have been rerun or its data cleared.` });
      setBatchPhase("failed");
      return;
    }
    setBatchStatus(statusRes.data);
    setBatchPhase("completed");
    // The completion effect above will fetch batchResults for this job id.
  }

  // ---- derived from `result` ----
  const tox21 = result ? pickStrongest(result.predictions.tox21, TOX21_ENDPOINTS) : null;
  const tox21Breakdown = result ? namedBreakdown(result.predictions.tox21, TOX21_ENDPOINTS) : [];
  const chembl = result ? pickStrongest(result.predictions.chembl, CHEMBL_TARGETS) : null;
  const chemblBreakdown = result ? namedBreakdown(result.predictions.chembl, CHEMBL_TARGETS) : [];
  const lipinskiResult = result
    ? checkLipinski({
        molecularWeight: result.lipinski.molecular_weight,
        logp: result.lipinski.logp,
        hDonors: result.lipinski.h_donors,
        hAcceptors: result.lipinski.h_acceptors,
      })
    : null;

  const propertyAtoms = result
    ? { toxicity: result.explanation.toxicity_atoms, solubility: result.explanation.solubility_atoms, activity: result.explanation.activity_atoms }[selectedProperty]
    : [];
  const viewerWeights: Record<number, number> = {};
  propertyAtoms.forEach((a) => (viewerWeights[a.index] = a.weight));
  const influentialCount = propertyAtoms.filter((a) => a.weight > 0.5).length;

  // Real per-property uncertainty: 1 - avg(per-task confidence) within each
  // group, the exact method the backend already uses for the single overall
  // figure — never a split of that overall number into plausible thirds.
  const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  const uncertaintyBreakdown = result
    ? [
        { key: "toxicity" as const, label: "TOXICITY", colour: "#ff3d9e", value: 1 - avg(result.confidences.tox21) },
        { key: "solubility" as const, label: "SOLUBILITY", colour: "#3fe0ff", value: 1 - result.confidences.esol },
        { key: "activity" as const, label: "ACTIVITY", colour: "#b98cff", value: 1 - avg(result.confidences.chembl) },
      ]
    : [];
  const leastConfident = uncertaintyBreakdown.length
    ? uncertaintyBreakdown.reduce((worst, u) => (u.value > worst.value ? u : worst))
    : null;

  const resultsMeta = result
    ? `${result.smiles} · ${requestMs ?? "—"} ms · confidence ${result.confidence.toFixed(2)}`
    : phase === "predicting"
    ? states.predicting.meta
    : phase === "invalid"
    ? states.invalid.meta
    : phase === "offline"
    ? states.offline.meta
    : null;

  const showSkeleton = phase === "predicting";
  const showResults = phase === "ready" && result !== null;
  const showEmptyResults = phase === "ready" && result === null;

  // Single source of truth for the throughput bar chart below — reuses the
  // same measured figures as the Benchmarks page so the two can't drift
  // apart again.
  const throughputBefore = parseFloat(benchmarks.throughput.before);
  const throughputAfter = parseFloat(benchmarks.throughput.after);
  const throughputBeforeHeightPct = Math.round((throughputBefore / throughputAfter) * 100);

  return (
    <div className="pg" style={{ background: "#04060b", fontFamily: "'Space Grotesk',sans-serif", color: "#dbe6f2", minWidth: 1280 }}>
      <style>{keyframes}</style>
      <Nav current="home" />

      {/* HERO */}
      <RevealSection style={{ position: "relative", overflow: "hidden", background: "radial-gradient(110% 85% at 74% 44%,#0d2038 0%,#04060b 64%)" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "linear-gradient(rgba(63,224,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(63,224,255,.05) 1px,transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        <div style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: 80, padding: "72px 44px 96px" }}>
          <div className="reveal-item" style={{ ...revealDelay(0), flex: "0 0 520px" }}>
            <h1 style={{ margin: 0, font: "700 44px/1.14 'Space Grotesk',sans-serif", letterSpacing: "-.02em", color: "#f2f8ff" }}>
              <span style={{ display: "block", whiteSpace: "nowrap" }}>{home.headlineLine1}</span>
              <span style={{ display: "block", whiteSpace: "nowrap", paddingLeft: 56 }}>{home.headlineLine2}</span>
            </h1>
            <p style={{ margin: "30px 0 0", maxWidth: 500, font: "400 17.5px/1.65 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.72)" }}>{home.intro}</p>
            <div style={{ display: "flex", gap: 14, marginTop: 40 }}>
              <div
                style={{
                  padding: "16px 30px",
                  borderRadius: 7,
                  border: "1px solid #6df0ff",
                  background: "linear-gradient(180deg,rgba(63,224,255,.22),rgba(63,224,255,.08))",
                  color: "#f0feff",
                  font: "600 14px/1 'IBM Plex Mono',monospace",
                  letterSpacing: ".06em",
                  textShadow: "0 0 12px rgba(63,224,255,.95)",
                  boxShadow: "0 0 26px rgba(63,224,255,.6), 0 0 70px rgba(63,224,255,.3), inset 0 0 26px rgba(63,224,255,.3)",
                }}
              >
                {home.primaryCta}
              </div>
              <div style={{ padding: "15px 28px", borderRadius: 6, border: "1px solid rgba(219,230,242,.28)", font: "600 14px/1 'IBM Plex Mono',monospace", letterSpacing: ".04em", color: "#dbe6f2" }}>
                {home.secondaryCta}
              </div>
            </div>
            <div className="stats" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", marginTop: 72, borderTop: "1px solid rgba(63,224,255,.16)", paddingTop: 26 }}>
              {home.stats.map((s, i) => (
                <div key={s.label} style={i === 0 ? { paddingRight: 26 } : { padding: "0 26px", borderLeft: "1px solid rgba(63,224,255,.16)", ...(i === 2 ? { paddingLeft: 26 } : {}) }}>
                  <div style={{ font: "700 32px/1 'JetBrains Mono',monospace", color: i === 1 ? "#8fe9ff" : "#f2f8ff", textShadow: i === 1 ? "0 0 26px rgba(63,224,255,.45)" : undefined, height: 34 }}>
                    {i === 1 ? (
                      <>
                        {s.value.split(" ")[0]}
                        <span style={{ fontSize: 16, color: "rgba(143,233,255,.75)" }}> mol/s</span>
                      </>
                    ) : (
                      s.value
                    )}
                  </div>
                  <div style={{ marginTop: 12, font: "400 11px/1.7 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.52)", letterSpacing: ".05em", whiteSpace: "nowrap" }}>
                    {s.label}
                    <br />
                    {s.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="reveal-item" style={{ ...revealDelay(1), flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "flex-start", paddingRight: 8, marginTop: -28 }}>
            <HeroRingsArt />
          </div>
        </div>
      </RevealSection>

      {/* HOW IT WORKS */}
      <RevealSection style={{ padding: "96px 44px", borderTop: "1px solid rgba(63,224,255,.14)" }}>
        <div style={{ display: "flex", gap: 56, alignItems: "flex-start" }}>
          <div
            className="reveal-item"
            style={{
              ...revealDelay(0),
              flex: 1.15,
              position: "relative",
              overflow: "hidden",
              border: "1px solid rgba(63,224,255,.34)",
              borderRadius: 10,
              background: "linear-gradient(160deg,rgba(63,224,255,.10),rgba(18,168,200,.05))",
              boxShadow: "0 0 40px rgba(63,224,255,.08)",
              aspectRatio: "16/10",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 18,
            }}
          >
            {videoError ? (
              <>
                <div className="mv-fixed-circle" style={{ width: 78, height: 78, borderRadius: "50%", border: "1px solid rgba(255,61,158,.5)", display: "flex", alignItems: "center", justifyContent: "center", ["--mv-circle-size" as string]: "78px" } as React.CSSProperties}>
                  <span style={{ font: "500 26px/1 'IBM Plex Mono',monospace", color: "#ff9dcb" }}>!</span>
                </div>
                <div style={{ font: "400 11.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".14em", color: "rgba(255,157,203,.7)", textAlign: "center", padding: "0 24px" }}>VIDEO UNAVAILABLE</div>
              </>
            ) : videoPlaying ? (
              <video
                src="/tutorial.mp4"
                controls
                autoPlay
                playsInline
                onError={() => setVideoError(true)}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : (
              <button
                className="mv-btn"
                onClick={() => setVideoPlaying(true)}
                aria-label={`Play tutorial video, ${home.howItWorks.videoSlot}`}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, width: "100%", height: "100%" }}
              >
                <div className="mv-fixed-circle" style={{ width: 78, height: 78, borderRadius: "50%", border: "1px solid #3fe0ff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 26px rgba(63,224,255,.35)", ["--mv-circle-size" as string]: "78px" } as React.CSSProperties}>
                  <div style={{ width: 0, height: 0, borderLeft: "20px solid #3fe0ff", borderTop: "12px solid transparent", borderBottom: "12px solid transparent", marginLeft: 6 }} />
                </div>
                <div style={{ font: "400 11.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".14em", color: "rgba(143,233,255,.6)" }}>{home.howItWorks.videoSlot}</div>
              </button>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: "0 0 32px", font: "700 34px/1.1 'Space Grotesk',sans-serif", letterSpacing: "-.02em", color: "#f2f8ff" }}>{home.howItWorks.heading}</h2>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {home.howItWorks.steps.map((s, i) => (
                <div
                  key={s.n}
                  className="reveal-item"
                  style={{ ...revealDelay(i + 1), display: "flex", gap: 18, padding: "22px 0", borderTop: "1px solid rgba(63,224,255,.18)", borderBottom: i === home.howItWorks.steps.length - 1 ? "1px solid rgba(63,224,255,.18)" : undefined }}
                >
                  <div style={{ font: "700 13px/1.4 'JetBrains Mono',monospace", color: ["#3fe0ff", "#8fe9ff", "#b98cff"][i] }}>{s.n}</div>
                  <div>
                    <div style={{ font: "600 17px/1.3 'IBM Plex Sans',sans-serif", color: "#f2f8ff" }}>{s.title}</div>
                    <div style={{ marginTop: 6, font: "400 14.5px/1.6 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.62)" }}>{s.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </RevealSection>

      {/* INPUT CARD */}
      <RevealSection style={{ padding: "0 44px 104px" }}>
        <div
          className="reveal-item"
          style={{
            position: "relative",
            border: "1px solid rgba(63,224,255,.3)",
            borderRadius: 16,
            background: "linear-gradient(180deg,rgba(63,224,255,.07),rgba(18,168,200,.04))",
            boxShadow: "0 0 60px rgba(63,224,255,.1), inset 0 0 60px rgba(63,224,255,.05)",
            padding: "34px 34px 30px",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,#3fe0ff,transparent)" }} />
          <div className="seg" style={{ display: "flex", gap: 6, padding: 4, border: "1px solid rgba(63,224,255,.24)", borderRadius: 10, background: "rgba(4,6,11,.7)", width: "fit-content" }}>
            <button
              className="mv-btn"
              aria-pressed={mode === "single"}
              onClick={() => setMode("single")}
              style={
                mode === "single"
                  ? { display: "flex", alignItems: "center", gap: 9, padding: "10px 18px", borderRadius: 7, background: "linear-gradient(180deg,rgba(63,224,255,.28),rgba(63,224,255,.14))", border: "1px solid rgba(63,224,255,.5)", color: "#eafaff", font: "600 12.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".08em", boxShadow: "0 0 22px rgba(63,224,255,.28)" }
                  : { display: "flex", alignItems: "center", gap: 9, padding: "10px 18px", borderRadius: 7, color: "rgba(219,230,242,.55)", font: "600 12.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".08em" }
              }
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: mode === "single" ? "#3fe0ff" : "transparent", border: mode === "single" ? "none" : "1px solid rgba(219,230,242,.4)", boxShadow: mode === "single" ? "0 0 10px #3fe0ff" : undefined }} />
              {home.input.single}
            </button>
            <button
              className="mv-btn"
              aria-pressed={mode === "batch"}
              onClick={() => setMode("batch")}
              style={
                mode === "batch"
                  ? { display: "flex", alignItems: "center", gap: 9, padding: "10px 18px", borderRadius: 7, background: "linear-gradient(180deg,rgba(63,224,255,.28),rgba(63,224,255,.14))", border: "1px solid rgba(63,224,255,.5)", color: "#eafaff", font: "600 12.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".08em", boxShadow: "0 0 22px rgba(63,224,255,.28)" }
                  : { display: "flex", alignItems: "center", gap: 9, padding: "10px 18px", borderRadius: 7, color: "rgba(219,230,242,.55)", font: "600 12.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".08em" }
              }
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: mode === "batch" ? "#3fe0ff" : "transparent", border: mode === "batch" ? "none" : "1px solid rgba(219,230,242,.4)", boxShadow: mode === "batch" ? "0 0 10px #3fe0ff" : undefined }} />
              {home.input.batch}
            </button>
          </div>

          {mode === "single" && (
            <>
              <form onSubmit={handleSubmit} style={{ display: "flex", gap: 16, marginTop: 24 }}>
                <div
                  style={{
                    flex: 1,
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "30px 28px",
                    border: `1px solid ${phase === "invalid" ? "#ff3d9e" : "rgba(63,224,255,.42)"}`,
                    borderRadius: 14,
                    background: "#050b14",
                    boxShadow: "0 0 30px rgba(63,224,255,.14), inset 0 0 44px rgba(63,224,255,.07)",
                  }}
                >
                  <label htmlFor="smiles-input" style={{ font: "500 13px/1 'IBM Plex Mono',monospace", color: "rgba(63,224,255,.65)", letterSpacing: ".1em", paddingRight: 16, borderRight: "1px solid rgba(63,224,255,.22)" }}>
                    {home.input.fieldLabel}
                  </label>
                  <input
                    id="smiles-input"
                    type="text"
                    value={smiles}
                    onChange={(e) => setSmiles(e.target.value)}
                    placeholder={home.input.sample}
                    autoComplete="off"
                    spellCheck={false}
                    style={{ flex: 1, minWidth: 0, font: "400 22px/1 'JetBrains Mono',monospace", color: "#cfe6f5", background: "transparent", border: "none", outline: "none" }}
                  />
                  {phase !== "predicting" && <span style={{ width: 2, height: 26, background: "#3fe0ff", boxShadow: "0 0 10px #3fe0ff", animation: "caret 1.1s steps(1) infinite" }} />}
                  <span style={{ marginLeft: "auto", font: "400 11px/1 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.35)" }}>{smiles ? `${smiles.length} CHARS` : ""}</span>
                </div>
                <button
                  type="submit"
                  className="mv-btn"
                  disabled={phase === "predicting" || !smiles.trim()}
                  style={{
                    padding: "0 46px",
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 14,
                    border: "1px solid #6df0ff",
                    background: "linear-gradient(180deg,rgba(63,224,255,.26),rgba(63,224,255,.09))",
                    color: "#f0feff",
                    font: "700 15px/1 'IBM Plex Mono',monospace",
                    letterSpacing: ".1em",
                    textShadow: "0 0 12px rgba(63,224,255,.95)",
                    boxShadow: "0 0 30px rgba(63,224,255,.6), 0 0 80px rgba(63,224,255,.3), inset 0 0 30px rgba(63,224,255,.3)",
                    opacity: phase === "predicting" || !smiles.trim() ? 0.55 : 1,
                    cursor: phase === "predicting" || !smiles.trim() ? "default" : "pointer",
                  }}
                >
                  {home.input.predict}
                </button>
              </form>

              {phase === "ready" && (
                <div className="hints" style={{ display: "flex", gap: 26, marginTop: 16, font: "400 12px/1.5 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.42)" }}>
                  <span>{home.input.hintTry}</span>
                </div>
              )}

              {phase === "predicting" && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", font: "400 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".08em", color: "rgba(219,230,242,.5)" }}>
                    <span style={{ color: "#3fe0ff" }}>{states.predicting.status}</span>
                    <span>{states.predicting.stages}</span>
                  </div>
                  <div style={{ height: 4, marginTop: 12, background: "rgba(63,224,255,.1)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: "62%", height: "100%", background: "linear-gradient(90deg,rgba(63,224,255,.3),#3fe0ff)", boxShadow: "0 0 18px rgba(63,224,255,.6)", animation: "sweep 1.4s ease-in-out infinite" }} />
                  </div>
                </div>
              )}

              {phase === "invalid" && (
                <div style={{ marginTop: 18, padding: "18px 20px", borderTop: "1px solid rgba(255,61,158,.45)", borderRight: "1px solid rgba(255,61,158,.45)", borderBottom: "1px solid rgba(255,61,158,.45)", borderLeft: "3px solid #ff3d9e", borderRadius: 10, background: "rgba(255,61,158,.07)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ font: "700 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "#ff3d9e" }}>{states.invalid.title}</span>
                  </div>
                  <div style={{ marginTop: 12, font: "400 14.5px/1.6 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.8)" }}>{errorMessage || states.invalid.body}</div>
                  <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                    <button className="mv-btn" onClick={() => setPhase("ready")} style={{ padding: "9px 16px", border: "1px solid rgba(255,61,158,.5)", borderRadius: 6, font: "500 11.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".06em", color: "#ffd0e6" }}>
                      EDIT SMILES
                    </button>
                  </div>
                </div>
              )}

              {phase === "offline" && (
                <div style={{ marginTop: 18, padding: "18px 20px", border: "1px solid rgba(219,230,242,.28)", borderRadius: 10, background: "rgba(219,230,242,.03)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(219,230,242,.5)" }} />
                        <span style={{ font: "700 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "rgba(219,230,242,.7)" }}>{states.offline.title}</span>
                      </div>
                      <div style={{ marginTop: 10, font: "400 14.5px/1.6 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.7)" }}>{states.offline.body}</div>
                    </div>
                    <button className="mv-btn" onClick={() => runPredict(smiles)} style={{ flex: "none", padding: "13px 24px", border: "1px solid #3fe0ff", borderRadius: 8, background: "rgba(63,224,255,.1)", font: "600 12px/1 'IBM Plex Mono',monospace", letterSpacing: ".08em", color: "#eafdff", boxShadow: "0 0 18px rgba(63,224,255,.35)" }}>
                      {states.offline.action}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {mode === "batch" && (
            <div style={{ marginTop: 24 }}>
              {batchPhase === "idle" && (
                <>
                  <input
                    ref={batchFileInputRef}
                    type="file"
                    accept=".csv,.smi,.txt"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleBatchFile(f);
                    }}
                  />
                  <div
                    onClick={() => batchFileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setBatchDragActive(true);
                    }}
                    onDragLeave={() => setBatchDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setBatchDragActive(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleBatchFile(f);
                    }}
                    style={{
                      border: `1px dashed ${batchDragActive ? "#3fe0ff" : "rgba(63,224,255,.4)"}`,
                      borderRadius: 14,
                      padding: "36px 28px",
                      textAlign: "center",
                      cursor: "pointer",
                      background: batchDragActive ? "rgba(63,224,255,.06)" : "transparent",
                    }}
                  >
                    <div style={{ font: "600 15px/1.3 'IBM Plex Sans',sans-serif", color: "#f2f8ff" }}>
                      {batchFile ? batchFile.name : "Drop a CSV or .smi file, or click to choose one"}
                    </div>
                    <div style={{ marginTop: 8, font: "400 12px/1.5 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.42)" }}>{home.input.hintBatch}</div>
                    {batchFile && (
                      <div style={{ marginTop: 12, font: "400 12.5px/1 'IBM Plex Mono',monospace", color: "#8fe9ff" }}>{batchSmilesList.length} molecule{batchSmilesList.length === 1 ? "" : "s"} found</div>
                    )}
                  </div>
                  {batchFile && batchSmilesList.length > 0 && (
                    <button
                      className="mv-btn"
                      onClick={submitBatch}
                      style={{
                        marginTop: 16,
                        padding: "13px 30px",
                        borderRadius: 10,
                        border: "1px solid #6df0ff",
                        background: "linear-gradient(180deg,rgba(63,224,255,.26),rgba(63,224,255,.09))",
                        color: "#f0feff",
                        font: "700 13px/1 'IBM Plex Mono',monospace",
                        letterSpacing: ".08em",
                        boxShadow: "0 0 24px rgba(63,224,255,.4)",
                      }}
                    >
                      PREDICT {batchSmilesList.length} MOLECULES
                    </button>
                  )}
                </>
              )}

              {(batchPhase === "submitting" || batchPhase === "processing") && batchStatus && (
                <div style={{ padding: "20px 22px", border: "1px solid rgba(63,224,255,.3)", borderRadius: 10, background: "rgba(63,224,255,.05)" }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                    <span style={{ font: "700 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "#3fe0ff" }}>
                      BATCH JOB {batchJobId != null ? `[${batchJobId}]` : ""} · {batchPhase === "submitting" ? "SUBMITTING" : "RUNNING"}
                    </span>
                    <span style={{ font: "500 20px/1 'JetBrains Mono',monospace", color: "#f2f8ff" }}>
                      {batchStatus.processed_molecules} <span style={{ fontSize: 12, color: "rgba(219,230,242,.5)" }}>/ {batchStatus.total_molecules} MOLECULES</span>
                    </span>
                  </div>
                  <div style={{ height: 8, marginTop: 14, background: "rgba(63,224,255,.1)", borderRadius: 4, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${batchStatus.total_molecules ? Math.round((batchStatus.processed_molecules / batchStatus.total_molecules) * 100) : 0}%`,
                        height: "100%",
                        background: "linear-gradient(90deg,rgba(63,224,255,.4),#3fe0ff)",
                        boxShadow: "0 0 20px rgba(63,224,255,.5)",
                        transition: "width 0.4s ease-out",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 26, marginTop: 14, font: "400 11.5px/1 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.5)" }}>
                    <span>ELAPSED {batchStartedAt ? `${((Date.now() - batchStartedAt) / 1000).toFixed(1)}s` : "—"}</span>
                    {batchStatus.failed_molecules > 0 && <span style={{ color: "#ff9dcb" }}>{batchStatus.failed_molecules} FAILED</span>}
                    <button className="mv-btn" onClick={stopWatchingBatch} style={{ marginLeft: "auto", color: "rgba(219,230,242,.65)" }}>
                      STOP WATCHING
                    </button>
                  </div>
                </div>
              )}

              {batchPhase === "completed" && batchStatus && (
                <div style={{ padding: "20px 22px", border: "1px solid rgba(63,224,255,.3)", borderRadius: 10, background: "rgba(63,224,255,.05)" }}>
                  <div style={{ font: "700 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "#3fe0ff" }}>BATCH JOB [{batchJobId}] · COMPLETE</div>
                  <div style={{ marginTop: 10, font: "400 14.5px/1.6 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.8)" }}>
                    {batchStatus.processed_molecules} of {batchStatus.total_molecules} molecules processed{batchStatus.failed_molecules > 0 ? `, ${batchStatus.failed_molecules} failed` : ""}.
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                    <a
                      href={`http://localhost:8000/batch/${batchJobId}/download`}
                      style={{ padding: "9px 16px", border: "1px solid #3fe0ff", borderRadius: 6, font: "500 11.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".06em", color: "#eafdff", textDecoration: "none" }}
                    >
                      DOWNLOAD CSV
                    </a>
                    <button className="mv-btn" onClick={resetBatch} style={{ padding: "9px 16px", border: "1px solid rgba(219,230,242,.22)", borderRadius: 6, font: "500 11.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".06em", color: "rgba(219,230,242,.65)" }}>
                      RUN ANOTHER BATCH
                    </button>
                  </div>

                  {viewingBatchRow ? (
                    <button
                      className="mv-btn"
                      onClick={backToBatchTable}
                      style={{
                        marginTop: 18,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 16px",
                        border: "1px solid rgba(63,224,255,.4)",
                        borderRadius: 8,
                        background: "rgba(63,224,255,.08)",
                        font: "600 11.5px/1 'IBM Plex Mono',monospace",
                        letterSpacing: ".06em",
                        color: "#8fe9ff",
                      }}
                    >
                      ← BACK TO BATCH RESULTS
                    </button>
                  ) : batchResults ? (
                    <div style={{ marginTop: 18 }}>
                      <div style={{ border: "1px solid rgba(63,224,255,.18)", borderRadius: 10, overflow: "hidden" }}>
                        <div style={{ display: "flex", background: "rgba(63,224,255,.05)", font: "400 10px/1 'IBM Plex Mono',monospace", letterSpacing: ".08em", color: "rgba(219,230,242,.45)" }}>
                          <span style={{ flex: "2 1 0", padding: "11px 16px" }}>SMILES</span>
                          <span style={{ flex: "1 1 0", padding: "11px 8px", color: "#ff9dcb" }}>TOXICITY</span>
                          <span style={{ flex: "1 1 0", padding: "11px 8px", color: "#8fe9ff" }}>SOLUBILITY</span>
                          <span style={{ flex: "1 1 0", padding: "11px 8px", color: "#d3b6ff" }}>ACTIVITY</span>
                          <span style={{ flex: "0 0 110px", padding: "11px 16px 11px 8px", textAlign: "right" }}>INSPECT</span>
                        </div>
                        {batchResults.map((r) => {
                          const rowTox = pickStrongest(r.predictions.tox21, TOX21_ENDPOINTS);
                          const rowChembl = pickStrongest(r.predictions.chembl, CHEMBL_TARGETS);
                          const status = batchRowStatus[r.smiles];
                          const error = batchRowError[r.smiles];
                          return (
                            <div key={r.smiles} style={{ borderTop: "1px solid rgba(63,224,255,.12)" }}>
                              <button
                                className="mv-btn"
                                onClick={() => inspectBatchRow(r.smiles)}
                                disabled={status === "loading"}
                                aria-label={`Inspect full results for ${r.smiles}`}
                                style={{
                                  width: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  fontSize: 12.5,
                                  color: "rgba(219,230,242,.85)",
                                  fontFamily: "'JetBrains Mono',monospace",
                                  background: status === "loading" ? "rgba(63,224,255,.05)" : "transparent",
                                }}
                                onMouseEnter={(e) => {
                                  if (status !== "loading") e.currentTarget.style.background = "rgba(63,224,255,.06)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = status === "loading" ? "rgba(63,224,255,.05)" : "transparent";
                                }}
                              >
                                <span style={{ flex: "2 1 0", padding: "13px 16px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.smiles}</span>
                                <span style={{ flex: "1 1 0", padding: "13px 8px" }}>{rowTox.value.toFixed(2)}</span>
                                <span style={{ flex: "1 1 0", padding: "13px 8px" }}>{r.predictions.esol.toFixed(2)}</span>
                                <span style={{ flex: "1 1 0", padding: "13px 8px" }}>{rowChembl.value.toFixed(2)}</span>
                                <span style={{ flex: "0 0 110px", padding: "13px 16px 13px 8px", textAlign: "right", color: status === "loading" ? "rgba(219,230,242,.5)" : status === "error" ? "#ff9dcb" : "#3fe0ff" }}>
                                  {status === "loading" ? "LOADING…" : status === "error" ? "RETRY →" : "INSPECT →"}
                                </span>
                              </button>
                              {status === "error" && error && (
                                <div style={{ padding: "0 16px 12px", font: "400 11.5px/1.5 'IBM Plex Sans',sans-serif", color: "#ff9dcb" }}>{error}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ marginTop: 10, font: "400 11px/1.6 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.35)" }}>
                        Click a row to load its full result — 3D structure, atom highlighting, per-assay breakdown — below.
                      </div>
                    </div>
                  ) : batchResultsError ? (
                    <div style={{ marginTop: 18, font: "400 13px/1.6 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.55)" }}>{batchResultsError}</div>
                  ) : (
                    <div style={{ marginTop: 18, font: "400 12px/1.6 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.45)" }}>Loading results table…</div>
                  )}
                </div>
              )}

              {batchPhase === "failed" && (
                <div style={{ padding: "18px 20px", border: "1px solid rgba(219,230,242,.28)", borderRadius: 10, background: "rgba(219,230,242,.03)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(219,230,242,.5)" }} />
                    <span style={{ font: "700 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "rgba(219,230,242,.7)" }}>{states.batchFailed.title}</span>
                  </div>
                  <div style={{ marginTop: 10, font: "400 14.5px/1.6 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.7)" }}>
                    {batchStatus?.error_message || "The batch job could not be completed."}
                  </div>
                  <button className="mv-btn" onClick={resetBatch} style={{ marginTop: 14, padding: "13px 24px", border: "1px solid #3fe0ff", borderRadius: 8, background: "rgba(63,224,255,.1)", font: "600 12px/1 'IBM Plex Mono',monospace", letterSpacing: ".08em", color: "#eafdff", boxShadow: "0 0 18px rgba(63,224,255,.35)" }}>
                    {states.batchFailed.action}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </RevealSection>

      {/* RESULTS */}
      <RevealSection style={{ padding: "0 44px 100px" }}>
        <div className="reveal-item" style={revealDelay(0)}>
          <h2 style={{ margin: resultsMeta ? "0 0 8px" : "0 0 28px", font: "700 40px/1.05 'Space Grotesk',sans-serif", letterSpacing: "-.025em", color: "#f2f8ff" }}>{home.results.heading}</h2>
          {resultsMeta && (
            <div style={{ font: "400 13px/1 'JetBrains Mono',monospace", color: "rgba(219,230,242,.5)", marginBottom: 28 }}>{resultsMeta}</div>
          )}
        </div>

        {showSkeleton && (
          <div style={{ display: "flex", gap: 28, alignItems: "stretch" }}>
            <div className="reveal-item" style={{ ...revealDelay(1), flex: 1.55, border: "1px solid rgba(63,224,255,.18)", borderRadius: 14, background: "radial-gradient(80% 70% at 50% 45%,rgba(63,224,255,.07),#04060b 72%)", padding: 26, display: "flex", flexDirection: "column", minHeight: 760 }}>
              <div style={{ display: "flex", justifyContent: "space-between", font: "500 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "rgba(219,230,242,.4)" }}>
                <span>3D STRUCTURE · ASSEMBLING</span>
                <span style={{ color: "#3fe0ff" }}>● BUILDING GRAPH</span>
              </div>
              <div style={{ height: 4, background: "rgba(63,224,255,.1)", borderRadius: 3, overflow: "hidden", marginTop: "auto" }}>
                <div style={{ width: "48%", height: "100%", background: "linear-gradient(90deg,rgba(63,224,255,.3),#3fe0ff)", animation: "sweep 1.4s ease-in-out infinite" }} />
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { border: "rgba(255,61,158,.2)", accent: "rgba(255,61,158,.5)", label: "TOXICITY", labelColour: "rgba(255,157,203,.6)", w: 130, delay: 0 },
                { border: "rgba(63,224,255,.2)", accent: "rgba(63,224,255,.5)", label: "SOLUBILITY", labelColour: "rgba(143,233,255,.6)", w: 150, delay: 0.2 },
                { border: "rgba(185,140,255,.2)", accent: "rgba(185,140,255,.5)", label: "ACTIVITY", labelColour: "rgba(211,182,255,.6)", w: 120, delay: 0.4 },
              ].map((c, i) => (
                <div key={c.label} className="reveal-item" style={{ ...revealDelay(i + 2), borderTop: `1px solid ${c.border}`, borderRight: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}`, borderLeft: `3px solid ${c.accent}`, borderRadius: 10, padding: "22px 24px" }}>
                  <div style={{ font: "500 11.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".12em", color: c.labelColour }}>{c.label}</div>
                  <div style={shimmerBox(c.w, c.delay)} />
                  <div style={{ width: "100%", height: 12, marginTop: 14, borderRadius: 4, background: "rgba(219,230,242,.07)" }} />
                  <div style={{ width: "70%", height: 12, marginTop: 8, borderRadius: 4, background: "rgba(219,230,242,.07)" }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {showEmptyResults && (
          <div className="reveal-item" style={{ ...revealDelay(1), border: "1px dashed rgba(63,224,255,.24)", borderRadius: 14, padding: "64px 28px", textAlign: "center" }}>
            <div style={{ font: "400 14.5px/1.6 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.5)" }}>Run a prediction above to see results here.</div>
          </div>
        )}

        {showResults && result && tox21 && chembl && lipinskiResult && (
          <div style={{ display: "flex", gap: 28, alignItems: "stretch" }}>
            <div className="reveal-item" style={{ ...revealDelay(1), flex: 1.55, border: "1px solid rgba(63,224,255,.25)", borderRadius: 14, background: "radial-gradient(80% 70% at 50% 45%,rgba(63,224,255,.12),#04060b 72%)", padding: 26, display: "flex", flexDirection: "column", minHeight: 760 }}>
              <div style={{ display: "flex", justifyContent: "space-between", font: "500 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "rgba(219,230,242,.55)" }}>
                <span>{home.results.viewerTitle}</span>
                <span style={{ color: "#8fe9ff" }}>◆ {influentialCount} INFLUENTIAL ATOM{influentialCount === 1 ? "" : "S"}</span>
              </div>
              <div style={{ flex: 1, minHeight: 320 }}>
                <MoleculeViewer3D atoms={result.structure.atoms} bonds={result.structure.bonds} weights={viewerWeights} />
              </div>
              <div style={{ display: "flex", gap: 22, font: "400 11.5px/1 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.55)" }}>
                <span><span style={{ color: "#8fe9ff" }}>●</span> {home.results.viewerLegend[0]}</span>
                <span><span style={{ color: "#6f9dc4" }}>○</span> {home.results.viewerLegend[1]}</span>
                <span>{home.results.viewerLegend[2]}</span>
              </div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* TOXICITY */}
              <div className="reveal-item" style={{ ...revealDelay(2), borderTop: `1px solid ${selectedProperty === "toxicity" ? "rgba(255,61,158,.7)" : "rgba(255,61,158,.4)"}`, borderRight: `1px solid ${selectedProperty === "toxicity" ? "rgba(255,61,158,.7)" : "rgba(255,61,158,.4)"}`, borderBottom: `1px solid ${selectedProperty === "toxicity" ? "rgba(255,61,158,.7)" : "rgba(255,61,158,.4)"}`, borderLeft: "3px solid #ff3d9e", borderRadius: 10, padding: "22px 24px", background: "linear-gradient(90deg,rgba(255,61,158,.10),transparent)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ font: "500 11.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".12em", color: "#ff3d9e" }}>{home.results.toxicity.label}</span>
                  <span style={{ font: "400 11px/1 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.45)" }}>{home.results.toxicity.meta}</span>
                </div>
                <div style={{ marginTop: 10, font: "700 46px/1 'JetBrains Mono',monospace", color: "#fff" }}>
                  {tox21.value.toFixed(2)} <span style={{ fontSize: 18, color: "rgba(219,230,242,.5)" }}>· {tox21.label}</span>
                </div>
                <div style={{ marginTop: 8, font: "400 14px/1.5 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.72)" }}>{interpretToxicity(tox21.value, tox21.label)}</div>
                <button
                  className="mv-btn"
                  aria-expanded={toxOpen}
                  onClick={() => {
                    setToxOpen((o) => !o);
                    setSelectedProperty("toxicity");
                  }}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,61,158,.22)", font: "500 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "#ff3d9e" }}
                >
                  <span>{(toxOpen ? home.results.hideDetail : home.results.showDetail) + " · 12 ASSAYS"}</span>
                  <span style={{ fontSize: 14 }}>{toxOpen ? "−" : "+"}</span>
                </button>
                {toxOpen && (
                  <div style={{ marginTop: 14, maxHeight: 280, overflow: "auto", fontFamily: "'JetBrains Mono',monospace" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", font: "400 10px/1 'IBM Plex Mono',monospace", letterSpacing: ".08em", color: "rgba(219,230,242,.4)" }}>
                      <span>ASSAY</span>
                      <span>SCORE</span>
                    </div>
                    {tox21Breakdown.map((a, i) => (
                      <div key={a.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid rgba(255,61,158,.14)", borderBottom: i === tox21Breakdown.length - 1 ? "1px solid rgba(255,61,158,.14)" : undefined, fontSize: 12, color: "rgba(219,230,242,.8)" }}>
                        <span>{a.label}</span>
                        <span style={{ color: i < 4 ? "#ffb3d6" : undefined }}>{a.value.toFixed(4)}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 10, font: "400 10.5px/1.5 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.4)" }}>SORTED HIGH → LOW · ALERT THRESHOLD 0.50</div>
                  </div>
                )}
              </div>

              {/* SOLUBILITY */}
              <div className="reveal-item" style={{ ...revealDelay(3), borderTop: `1px solid ${selectedProperty === "solubility" ? "rgba(63,224,255,.7)" : "rgba(63,224,255,.4)"}`, borderRight: `1px solid ${selectedProperty === "solubility" ? "rgba(63,224,255,.7)" : "rgba(63,224,255,.4)"}`, borderBottom: `1px solid ${selectedProperty === "solubility" ? "rgba(63,224,255,.7)" : "rgba(63,224,255,.4)"}`, borderLeft: "3px solid #3fe0ff", borderRadius: 10, padding: "22px 24px", background: "linear-gradient(90deg,rgba(63,224,255,.10),transparent)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ font: "500 11.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".12em", color: "#3fe0ff" }}>{home.results.solubility.label}</span>
                  <span style={{ font: "400 11px/1 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.45)" }}>{home.results.solubility.meta}</span>
                </div>
                <div style={{ marginTop: 10, font: "700 46px/1 'JetBrains Mono',monospace", color: "#fff" }}>{result.predictions.esol.toFixed(2)}</div>
                <div style={{ marginTop: 8, font: "400 14px/1.5 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.72)" }}>{interpretSolubility(result.predictions.esol)}</div>
                <button
                  className="mv-btn"
                  aria-expanded={solOpen}
                  onClick={() => {
                    setSolOpen((o) => !o);
                    setSelectedProperty("solubility");
                  }}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(63,224,255,.22)", font: "500 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "#3fe0ff" }}
                >
                  <span>{(solOpen ? home.results.hideDetail : home.results.showDetail) + " · ESOL VALUE"}</span>
                  <span style={{ fontSize: 14 }}>{solOpen ? "−" : "+"}</span>
                </button>
                {solOpen && (
                  <div style={{ marginTop: 14, fontFamily: "'JetBrains Mono',monospace" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid rgba(63,224,255,.14)", borderBottom: "1px solid rgba(63,224,255,.14)", fontSize: 12, color: "rgba(219,230,242,.8)" }}>
                      <span>PREDICTED log S</span>
                      <span style={{ color: "#8fe9ff" }}>{result.predictions.esol.toFixed(4)} log mol/L</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ACTIVITY */}
              <div className="reveal-item" style={{ ...revealDelay(4), borderTop: `1px solid ${selectedProperty === "activity" ? "rgba(185,140,255,.7)" : "rgba(185,140,255,.4)"}`, borderRight: `1px solid ${selectedProperty === "activity" ? "rgba(185,140,255,.7)" : "rgba(185,140,255,.4)"}`, borderBottom: `1px solid ${selectedProperty === "activity" ? "rgba(185,140,255,.7)" : "rgba(185,140,255,.4)"}`, borderLeft: "3px solid #b98cff", borderRadius: 10, padding: "22px 24px", background: "linear-gradient(90deg,rgba(185,140,255,.10),transparent)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ font: "500 11.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".12em", color: "#b98cff" }}>{home.results.activity.label}</span>
                  <span style={{ font: "400 11px/1 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.45)" }}>{home.results.activity.meta}</span>
                </div>
                <div style={{ marginTop: 10, font: "700 46px/1 'JetBrains Mono',monospace", color: "#fff" }}>
                  {chembl.value.toFixed(2)} <span style={{ fontSize: 16, color: "rgba(219,230,242,.5)" }}>· {chembl.label}</span>
                </div>
                <div style={{ marginTop: 8, font: "400 14px/1.5 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.72)" }}>{interpretActivity(chembl.value, chembl.label)}</div>
                <button
                  className="mv-btn"
                  aria-expanded={actOpen}
                  onClick={() => {
                    setActOpen((o) => !o);
                    setSelectedProperty("activity");
                  }}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(185,140,255,.22)", font: "500 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "#b98cff" }}
                >
                  <span>{(actOpen ? home.results.hideDetail : home.results.showDetail) + " · 3 TARGETS"}</span>
                  <span style={{ fontSize: 14 }}>{actOpen ? "−" : "+"}</span>
                </button>
                {actOpen && (
                  <div style={{ marginTop: 14, fontFamily: "'JetBrains Mono',monospace" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", font: "400 10px/1 'IBM Plex Mono',monospace", letterSpacing: ".08em", color: "rgba(219,230,242,.4)" }}>
                      <span>ChEMBL TARGET</span>
                      <span>SCORE</span>
                    </div>
                    {chemblBreakdown.map((t, i) => (
                      <div key={t.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid rgba(185,140,255,.16)", borderBottom: i === chemblBreakdown.length - 1 ? "1px solid rgba(185,140,255,.16)" : undefined, fontSize: 12, color: "rgba(219,230,242,.8)" }}>
                        <span>{t.label}</span>
                        <span style={{ color: i === 0 ? "#d3b6ff" : undefined }}>{t.value.toFixed(4)}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 10, font: "400 10.5px/1.5 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.4)" }}>SORTED HIGH → LOW · NEVER AVERAGED ACROSS TARGETS</div>
                  </div>
                )}
              </div>

              {/* CONFIDENCE / UNCERTAINTY */}
              <div className="reveal-item" style={{ ...revealDelay(5), display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ flex: 1, border: "1px solid rgba(63,224,255,.16)", borderRadius: 10, padding: "16px 18px", background: "rgba(63,224,255,.03)" }}>
                  <div style={{ font: "400 10.5px/1.4 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "rgba(219,230,242,.45)" }}>{home.results.confidence.label}</div>
                  <div style={{ marginTop: 10, font: "500 26px/1 'JetBrains Mono',monospace", color: "rgba(242,248,255,.9)" }}>{result.confidence.toFixed(2)}</div>
                  <div style={{ height: 3, background: "rgba(219,230,242,.12)", marginTop: 12 }}>
                    <div style={{ width: `${Math.round(result.confidence * 100)}%`, height: "100%", background: "rgba(63,224,255,.6)" }} />
                  </div>
                </div>
                <div style={{ flex: 1, border: "1px solid rgba(63,224,255,.16)", borderRadius: 10, padding: "16px 18px", background: "rgba(63,224,255,.03)" }}>
                  <div style={{ font: "400 10.5px/1.4 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "rgba(219,230,242,.45)" }}>{home.results.uncertainty.label}</div>
                  <div style={{ marginTop: 10, font: "500 26px/1 'JetBrains Mono',monospace", color: "rgba(242,248,255,.9)" }}>± {result.uncertainty.toFixed(2)}</div>
                  <div style={{ height: 3, background: "rgba(219,230,242,.12)", marginTop: 12 }}>
                    <div style={{ width: `${Math.round(result.uncertainty * 100)}%`, height: "100%", background: "rgba(63,224,255,.55)" }} />
                  </div>
                  <button
                    className="mv-btn"
                    aria-expanded={uncertOpen}
                    onClick={() => setUncertOpen((o) => !o)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(63,224,255,.16)", font: "500 10px/1 'IBM Plex Mono',monospace", letterSpacing: ".08em", color: "#3fe0ff" }}
                  >
                    <span>{uncertOpen ? home.results.hideDetail : home.results.showDetail}</span>
                    <span style={{ fontSize: 12 }}>{uncertOpen ? "−" : "+"}</span>
                  </button>
                  {uncertOpen && (
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 9 }}>
                      {uncertaintyBreakdown.map((u) => (
                        <div key={u.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ font: "500 10px/1 'IBM Plex Mono',monospace", color: u.colour, letterSpacing: ".07em" }}>
                            {u.label}
                            {leastConfident && u.key === leastConfident.key ? " ◆" : ""}
                          </span>
                          <span style={{ font: "500 13px/1 'JetBrains Mono',monospace", color: "rgba(242,248,255,.85)" }}>± {u.value.toFixed(2)}</span>
                        </div>
                      ))}
                      {leastConfident && (
                        <div style={{ marginTop: 2, font: "400 11px/1.5 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.55)" }}>
                          {leastConfident.label.charAt(0) + leastConfident.label.slice(1).toLowerCase()} is the least certain of the three — derived from its own per-task confidence scores, not split from the overall figure.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* LIPINSKI */}
              <div className="reveal-item" style={{ ...revealDelay(6), border: "1px solid rgba(63,224,255,.18)", borderRadius: 10, padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ font: "500 11.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "rgba(219,230,242,.6)" }}>{home.results.lipinski.label}</span>
                  <span style={{ font: "700 15px/1 'JetBrains Mono',monospace", color: "#3fe0ff" }}>{lipinskiResult.verdict}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginTop: 18, fontFamily: "'JetBrains Mono',monospace" }}>
                  {lipinskiResult.checks.map((c) => (
                    <div key={c.label}>
                      <div style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: c.pass ? "rgba(219,230,242,.45)" : "#ff9dcb", letterSpacing: ".08em" }}>{c.label}</div>
                      <div style={{ marginTop: 6, font: "500 18px/1", color: "#f2f8ff" }}>{c.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </RevealSection>

      {/* HISTORY */}
      {history.length > 0 && (
        <RevealSection style={{ padding: "0 44px 96px" }}>
          <div className="reveal-item" style={revealDelay(0)}>
            <div style={eyebrow}>RECENT PREDICTIONS</div>
            <h2 style={{ margin: "16px 0 24px", font: "700 30px/1.1 'Space Grotesk',sans-serif", letterSpacing: "-.02em", color: "#f2f8ff" }}>History</h2>
            <div style={{ border: "1px solid rgba(63,224,255,.18)", borderRadius: 12, overflow: "hidden", fontFamily: "'JetBrains Mono',monospace" }}>
              <div style={{ display: "flex", background: "rgba(63,224,255,.05)", font: "400 10px/1 'IBM Plex Mono',monospace", letterSpacing: ".08em", color: "rgba(219,230,242,.45)" }}>
                <span style={{ flex: "2 1 0", padding: "12px 18px" }}>SMILES / JOB</span>
                <span style={{ flex: "1 1 0", padding: "12px 8px", color: "#ff9dcb" }}>TOXICITY</span>
                <span style={{ flex: "1 1 0", padding: "12px 8px", color: "#8fe9ff" }}>SOLUBILITY</span>
                <span style={{ flex: "1 1 0", padding: "12px 8px", color: "#d3b6ff" }}>ACTIVITY</span>
                <span style={{ flex: "0 0 90px", padding: "12px 18px 12px 8px" }}>TIME</span>
              </div>
              {history.map((h) => (
                <div key={h.id} style={{ borderTop: "1px solid rgba(63,224,255,.12)" }}>
                  {h.kind === "single" ? (
                    <button
                      className="mv-btn"
                      onClick={() => loadHistoryEntry(h)}
                      aria-label={`Reload prediction for ${h.response.smiles}`}
                      style={{ width: "100%", display: "flex", alignItems: "center", fontSize: 12.5, color: "rgba(219,230,242,.85)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(63,224,255,.06)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ flex: "2 1 0", padding: "13px 18px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.response.smiles}</span>
                      <span style={{ flex: "1 1 0", padding: "13px 8px" }}>{pickStrongest(h.response.predictions.tox21, TOX21_ENDPOINTS).value.toFixed(2)}</span>
                      <span style={{ flex: "1 1 0", padding: "13px 8px" }}>{h.response.predictions.esol.toFixed(2)}</span>
                      <span style={{ flex: "1 1 0", padding: "13px 8px" }}>{pickStrongest(h.response.predictions.chembl, CHEMBL_TARGETS).value.toFixed(2)}</span>
                      <span style={{ flex: "0 0 90px", padding: "13px 18px 13px 8px", color: "rgba(219,230,242,.45)" }}>{new Date(h.timestamp).toLocaleTimeString()}</span>
                    </button>
                  ) : (
                    <button
                      className="mv-btn"
                      onClick={() => loadHistoryEntry(h)}
                      aria-label={`Reload batch job ${h.jobName}`}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, fontSize: 12.5, color: "rgba(219,230,242,.85)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(63,224,255,.06)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span
                        style={{
                          flex: "none",
                          margin: "0 0 0 18px",
                          padding: "3px 8px",
                          borderRadius: 4,
                          border: "1px solid rgba(63,224,255,.4)",
                          background: "rgba(63,224,255,.1)",
                          font: "600 9.5px/1.6 'IBM Plex Mono',monospace",
                          letterSpacing: ".08em",
                          color: "#8fe9ff",
                        }}
                      >
                        BATCH
                      </span>
                      <span style={{ flex: "1 1 0", padding: "13px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.jobName}</span>
                      <span style={{ flex: "none", padding: "13px 8px", color: "rgba(219,230,242,.55)" }}>{h.totalMolecules} molecule{h.totalMolecules === 1 ? "" : "s"}</span>
                      <span style={{ flex: "0 0 90px", padding: "13px 18px 13px 8px", color: "rgba(219,230,242,.45)" }}>{new Date(h.timestamp).toLocaleTimeString()}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, font: "400 11px/1.6 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.35)" }}>Click a row to reload it. Single predictions reload into the viewer; batch jobs reload the results table. Stored in this browser only.</div>
          </div>
        </RevealSection>
      )}

      {/* UNDER THE HOOD */}
      <RevealSection style={{ padding: "88px 44px 96px", borderTop: "1px solid rgba(63,224,255,.14)", background: "linear-gradient(180deg,rgba(63,224,255,.04),transparent)" }}>
        <div style={{ display: "flex", gap: 64 }}>
          <div className="reveal-item" style={{ ...revealDelay(0), flex: 1 }}>
            <div style={eyebrow}>{home.underTheHood.eyebrow}</div>
            <h2 style={{ margin: "16px 0 0", font: "700 36px/1.1 'Space Grotesk',sans-serif", letterSpacing: "-.02em", color: "#f2f8ff" }}>{home.underTheHood.heading}</h2>
            <p style={{ margin: "20px 0 0", maxWidth: 540, font: "400 15.5px/1.7 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.7)" }}>{home.underTheHood.body1}</p>
            <p style={{ margin: "16px 0 0", maxWidth: 540, font: "400 15.5px/1.7 'IBM Plex Sans',sans-serif", color: "rgba(219,230,242,.7)" }}>{home.underTheHood.body2}</p>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="reveal-item" style={{ ...revealDelay(1), border: "1px solid rgba(63,224,255,.22)", borderRadius: 12, padding: 26, background: "rgba(63,224,255,.03)" }}>
              <div style={{ font: "500 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".12em", color: "rgba(219,230,242,.5)" }}>ONE MOLECULE · THREE PATHS · THREE OUTPUTS</div>
              <ArchitectureDiagram />
            </div>
            <div className="reveal-item" style={{ ...revealDelay(2), border: "1px solid rgba(63,224,255,.22)", borderRadius: 12, padding: 24 }}>
              <div style={{ font: "500 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".12em", color: "rgba(219,230,242,.5)" }}>THROUGHPUT · MOLECULES / SECOND / CPU</div>
              <div className="vbars" style={{ display: "flex", alignItems: "flex-end", gap: 26, marginTop: 22, height: 130 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 8, height: "100%" }}>
                  <div style={{ font: "500 13px/1 'JetBrains Mono',monospace", color: "rgba(219,230,242,.6)" }}>{Math.round(throughputBefore)}</div>
                  <div style={{ height: `${throughputBeforeHeightPct}%`, background: "rgba(219,230,242,.18)", borderRadius: 3 }} />
                  <div style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.45)" }}>BEFORE</div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 8, height: "100%" }}>
                  <div style={{ font: "700 13px/1 'JetBrains Mono',monospace", color: "#8fe9ff" }}>{Math.round(throughputAfter)}</div>
                  <div style={{ height: "100%", background: "linear-gradient(180deg,#3fe0ff,rgba(18,168,200,.2))", borderRadius: 3, boxShadow: "0 0 26px rgba(63,224,255,.35)" }} />
                  <div style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: "rgba(219,230,242,.45)" }}>NOW · {benchmarks.throughput.gain}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </RevealSection>

      <Footer />
    </div>
  );
}

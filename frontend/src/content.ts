/**
 * MolVeria — single source of truth for all site copy.
 *
 * Ported from the approved design's `molveria-content.js`. Edit wording in
 * this file only; layout and styling live in src/pages and src/components
 * and never need touching for a copy change.
 */

export const brand = {
  name: "MolVeria",
  wordmark: "MOLVERIA",
  version: "v1.0",
  tagline: "Molecular property prediction",
  disclaimer: "RESEARCH AND SCREENING TOOL — NOT A SUBSTITUTE FOR LABORATORY TESTING",
  copyright: "© 2026 MOLVERIA · Serena Dalal",
  datasets: "TOX21 / ESOL / ChEMBL",
};

export const nav = {
  model: "MODEL",
  benchmarks: "BENCHMARKS",
  api: "API",
  about: "ABOUT",
  modelCard: "MODEL CARD",
  cta: "RUN PREDICTION →",
};

export const home = {
  headlineLine1: "One structure in.",
  headlineLine2: "Three properties out.",
  intro:
    "Paste a SMILES string. MolVeria returns toxicity, solubility, and biological activity, with a 3D view of the molecule and the atoms that drove each prediction highlighted.",
  primaryCta: "RUN A PREDICTION",
  secondaryCta: "EXPLORE MOLVERIA",
  stats: [
    { value: "14,788", label: "MOLECULES", sub: "TOX21 · ESOL · ChEMBL" },
    { value: "953 mol/s", label: "ON CPU", sub: "8.4× FASTER THAN 114" },
    { value: "16", label: "PREDICTIONS", sub: "12 assays · 1 measure · 3 targets" },
  ],
  howItWorks: {
    heading: "How it works",
    videoSlot: "TUTORIAL VIDEO · 2:31",
    steps: [
      { n: "01", title: "Paste a SMILES string", body: "Or drop a CSV of 100+ structures for batch scoring." },
      { n: "02", title: "Three networks score it in parallel", body: "The graph goes to three independent networks, one per property. Gradient saliency records which atoms each one used." },
      { n: "03", title: "Read the numbers and the atoms", body: "Every prediction ships with the substructure that produced it." },
    ],
  },
  input: {
    single: "SINGLE MOLECULE",
    batch: "BATCH UPLOAD",
    fieldLabel: "SMILES",
    sample: "CC(=O)Oc1ccccc1C(=O)O",
    validity: "21 CHARS · VALID",
    predict: "PREDICT",
    hintTry: "TRY: aspirin · caffeine · ibuprofen",
    hintBatch: "BATCH: CSV / SMI — up to 1,000 molecules per job, results on completion",
  },
  results: {
    heading: "Results",
    viewerTitle: "3D STRUCTURE · SALIENCY OVERLAY",
    viewerBadge: "◆ 3 INFLUENTIAL ATOMS",
    viewerLegend: ["INFLUENTIAL ATOM", "CARBON SKELETON", "DRAG TO ROTATE · SCROLL TO ZOOM"],
    toxicity: { label: "TOXICITY", meta: "12 assays" },
    solubility: { label: "SOLUBILITY", meta: "log mol/L" },
    activity: { label: "ACTIVITY", meta: "3 targets" },
    confidence: { label: "AVG CONFIDENCE" },
    uncertainty: { label: "UNCERTAINTY" },
    lipinski: { label: "LIPINSKI RULE OF FIVE" },
    showDetail: "SHOW DETAIL",
    hideDetail: "HIDE DETAIL",
    showBreakdown: "SHOW BREAKDOWN ",
    hideBreakdown: "HIDE BREAKDOWN ",
  },
  underTheHood: {
    eyebrow: "UNDER THE HOOD",
    heading: "Three GATs, one predictor",
    body1:
      "A molecule is a graph: atoms are points, bonds are the lines between them. MolVeria converts your structure into that graph once, then hands the same graph to three independent networks, each trained on its own dataset for its own property.",
    body2:
      "Each network learns which atoms matter for its own question, so the highlighted substructure you see is the model's own reasoning rather than a guess made afterwards. Caching the three models eliminated redundant disk loads, and batching the forward pass took throughput from 114 to 953 molecules per second — an 8.4× gain on the same weights, measured at batch size 100.",
  },
};

/** Interface states for the input + results area (design-preview switcher, not wired to the API yet). */
export const states = {
  predicting: {
    meta: "CC(=O)Oc1ccccc1C(=O)O · scoring… · 3 models",
    status: "● SCORING · 3 GAT MODELS",
    stages: "FEATURISING → MESSAGE PASSING → AGGREGATE",
  },
  invalid: {
    meta: "no prediction — input rejected before inference",
    title: "INVALID SMILES",
    body: "Unbalanced parentheses — one opening bracket has no match. Nothing was sent to the model.",
  },
  offline: {
    meta: "no prediction — service unreachable",
    title: "SERVICE UNREACHABLE",
    body: "Couldn't reach the prediction service. Your input is saved — nothing was lost.",
    action: "RETRY NOW",
  },
  // Not part of the original design — it only modeled the in-progress batch
  // state. Modeled directly on `offline`'s shape (title/body/action) since
  // that's this app's existing pattern for "this whole flow failed, here's
  // why, here's what to do."
  batchFailed: {
    title: "BATCH JOB FAILED",
    action: "TRY AGAIN",
  },
};

export const about = {
  eyebrow: "ABOUT & JOURNEY",
  headlineLine1: "Ninety days,",
  headlineLine2: "one model.",
  intro:
    "What started as a small idea turned into a full AI platform. Here's how it got there.",
  stats: [
    { value: "90", label: "DAYS OF BUILDING" },
    { value: "4", label: "PHASES" },
    { value: "8.4×", label: "FASTER BY THE END" },
  ],
  who: {
    eyebrow: "01 — WHO BUILT THIS",
    heading: "Serena Dalal, CS student at AUB",
    para1:
      "I'm a computer science student at AUB. MolVeria started from an idea I came across almost by chance — a simple molecule property predictor, and not much more than that. I thought it could be ten times better. Ninety days later it predicts toxicity, solubility, and biological activity across three independent datasets, explains which atoms drove each prediction, and runs as a deployed platform rather than a notebook.",
    para2:
      "Almost none of it was covered by my coursework. Graph neural networks, cheminformatics, working with real pharmaceutical data — I taught myself all of it from papers and documentation. It was harder than I expected in ways I didn't anticipate: sourcing datasets that were clean and usable took longer than building the models, and the architecture went through several revisions before the multi-property approach worked. I came close to abandoning it more than once. I'm glad I didn't — it's the best thing I've built and the one I've enjoyed most, and I'm interested in continuing to build systems where computational methods meet domains that need them.",
    chips: ["PyTorch Geometric", "Graph Neural Networks", "FastAPI", "RDKit"],
  },
  journey: {
    eyebrow: "02 — THE JOURNEY",
    heading: "Ninety days, four phases",
    dayMarkers: ["DAY 01", "DAY 21", "DAY 51", "DAY 71 — 90"],
    phases: [
      {
        n: "PHASE 01",
        title: "Fundamentals",
        days: "DAYS 01 — 20",
        colour: "#3fe0ff",
        body: "Learning what a molecule actually is, computationally. SMILES notation, how a structure becomes a graph of atoms and bonds, what message passing does and why it suits chemistry at all. This phase was almost entirely conceptual — no models yet, just building enough understanding to know what I was going to build and why a graph neural network was the right tool for it.",
        chips: ["CHEMISTRY BASICS", "SMILES", "GRAPH NEURAL NETWORK THEORY", "RDKit", "PyTorch Geometric"],
      },
      {
        n: "PHASE 02",
        title: "Core model",
        days: "DAYS 21 — 50",
        colour: "#ff3d9e",
        body: "Building the data pipeline and the first working GAT. This was where the roadmap started breaking: sourcing datasets that were clean and usable took far longer than expected, and the architecture went through several revisions before the training was stable.",
        chips: ["DATA PIPELINE", "DATA SPLITTING", "GAT ARCHITECTURE", "TRAINING", "HYPERPARAMETER TUNING", "EXPLAINABILITY"],
      },
      {
        n: "PHASE 03",
        title: "Enhancements",
        days: "DAYS 51 — 70",
        colour: "#b98cff",
        body: "Extending from one property to three, each with its own model and dataset. Adding gradient-based atom importance so predictions could be explained rather than just produced, and PostgreSQL so results persisted.",
        chips: ["MULTI-PROPERTY · 3 DATASETS", "INTERPRETABILITY", "DRUG-LIKENESS ANALYSIS", "PostgreSQL", "BATCH PROCESSING"],
      },
      {
        n: "PHASE 04",
        title: "Deployment",
        days: "DAYS 71 — 90",
        colour: "#3fe0ff",
        body: "Wrapping the models in a FastAPI service, building the frontend, and optimising inference — batching and model caching took throughput from 114 to 953 molecules per second on CPU.",
        chips: ["FastAPI", "React", "3D VISUALISATION", "Docker", "114 → 953 MOL/S"],
      },
    ],
  },
  faq: {
    eyebrow: "03 — QUESTIONS",
    heading: "Frequently asked",
    intro: "Anything not covered here is either in the model card or one email away.",
    cta: "READ THE MODEL CARD →",
    items: [
      { q: "What does MolVeria predict?", a: "Three properties from a single molecular structure: toxicity across 12 Tox21 assays, aqueous solubility as a log S value, and biological activity against 3 ChEMBL targets. Sixteen individual predictions in total." },
      { q: "What is a SMILES string and where do I get one?", a: "SMILES is a text format that describes a molecule's structure — aspirin is CC(=O)Oc1ccccc1C(=O)O. You can find them on PubChem or ChEMBL, or export them from most chemistry drawing software." },
      { q: "How accurate are the predictions?", a: "Performance varies by property. Activity is strongest — ROC-AUC of 0.93 to 0.96 across all three ChEMBL targets. Solubility achieves an R² of 0.799 with an RMSE of 0.889 log mol/L, explaining roughly 80% of variance. Toxicity is the most variable: ROC-AUC ranges from 0.60 to 0.92 depending on the assay, strongest on nuclear receptor binding and weakest on estrogen receptor activity. The full per-assay breakdown is on the Benchmarks page." },
      { q: "What does the uncertainty number mean?", a: "It's a confidence heuristic derived from how far each prediction sits from the decision boundary, not a calibrated statistical uncertainty. A higher number means the model is less committed to its answer. It's useful for prioritising which predictions to verify, not as a probability." },
      { q: "What do the highlighted atoms mean?", a: "They show which atoms most influenced that specific prediction, computed by gradient saliency. Each property highlights a different set, since the atoms driving solubility aren't necessarily the ones driving toxicity. Switching panels rehighlights the molecule." },
      { q: "Can I run more than one molecule?", a: "Yes. Batch upload accepts CSV or .smi files and processes them as a background job with live progress. The API also exposes a batch endpoint for programmatic use." },
      { q: "Should I use this for real drug development decisions?", a: "No. MolVeria is a screening and prioritisation tool trained on public datasets. Every figure it produces is a statistical estimate, not a measurement, and it isn't a substitute for laboratory assays or clinical evaluation." },
    ],
  },
  contact: {
    eyebrow: "04 — GET IN TOUCH",
    headingLine1: "Happy to talk about",
    headingLine2: "molecules or models.",
    intro: "Questions about the model, collaboration, or project work — all welcome.",
    email: { label: "EMAIL", value: "serenadalal7@gmail.com", note: "Usually replies within a few days" },
    github: { label: "GITHUB", value: "https://github.com/serena-cmps", note: "Model code, training scripts, and notebooks" },
    linkedin: { label: "LINKEDIN", value: "https://www.linkedin.com/in/serena-dalal-9b2a49421/", note: "Background, coursework, and other projects" },
    availability: {
      label: "AVAILABILITY",
      heading: "Open to work",
      body: "I'm a computer science student at AUB, available for internships, project work, and freelance builds alongside my studies.",
      chips: ["OPEN TO INTERNSHIPS", "ON-SITE OR REMOTE", "PART-TIME"],
    },
    feedback: {
      label: "FEEDBACK",
      meta: "VIA YOUR EMAIL CLIENT",
      heading: "What worked, what didn't?",
      body: "Share your thoughts or suggestions.",
      placeholder: "What worked, what didn't, what you'd change...",
      submit: "SEND FEEDBACK",
      disclaimer: "Opens your email app with this pre-filled. Nothing sends automatically. Requires an email app on your device.",
    },
  },
};

export const api = {
  eyebrow: "DEVELOPER API",
  headlineLine1: "Predictions over HTTP.",
  headlineLine2: "Nine endpoints.",
  intro:
    "A FastAPI service exposing the three models over HTTP. Interactive documentation is generated automatically and available at /docs on any running instance.",
  baseUrl: "https://molveria.onrender.com",
  chips: ["FastAPI · JSON", "NO AUTHENTICATION", "NO RATE LIMITING"],
  curl: 'curl -X POST https://molveria.onrender.com/predict \\\n  -H "Content-Type: application/json" \\\n  -d \'{"smiles": "CC(=O)Oc1ccccc1C(=O)O"}\'',
  quickStartMeta: { label: "QUICK START · cURL", tag: "● v1.0" },
  quickStartFooter: ["TYPICAL LATENCY 82 ms WARM · UP TO 60s COLD START", "RETURNS 16 VALUES"],
  endpointsHeading: "Nine endpoints",
  endpointsNote: "ALL JSON EXCEPT /batch/upload (multipart) AND /batch/{job_id}/download (CSV stream)",
  endpoints: [
    {
      method: "GET",
      path: "/health",
      desc: "Liveness check.",
      tag: "SYSTEM",
      reqLabel: "REQUEST",
      req: "GET /health",
      resLabel: "200 RESPONSE",
      res: '{\n  "status": "healthy",\n  "message": "API is running"\n}',
    },
    {
      method: "POST",
      path: "/predict",
      desc: "Score a single molecule — all three properties, confidence, uncertainty, per-atom explanation, and 3D structure.",
      tag: "SYNCHRONOUS",
      reqLabel: "REQUEST BODY",
      req: '{\n  "smiles": "CCO"\n}',
      resLabel: "200 RESPONSE",
      res: '{\n  "smiles": "CCO",\n  "predictions": {\n    "tox21": [0.0036, 0.0069, "...", 0.0004],\n    "esol": 0.6328,\n    "chembl": [0.0000, 0.0032, 0.0000]\n  },\n  "confidence": 0.9435,\n  "uncertainty": 0.0565,\n  "confidences": {\n    "tox21": [0.99, 0.99, "...", 1.0],\n    "esol": 0.73,\n    "chembl": [1.0, 0.99, 1.0]\n  },\n  "drug_like": true,\n  "lipinski": {\n    "molecular_weight": 46.07,\n    "logp": -0.00,\n    "h_donors": 1,\n    "h_acceptors": 1,\n    "passes_all": true\n  },\n  "explanation": {\n    "toxicity_atoms": [{"index": 0, "symbol": "C", "weight": 0.12}, "..."],\n    "solubility_atoms": ["..."],\n    "activity_atoms": ["..."]\n  },\n  "structure": {\n    "atoms": [{"index": 0, "symbol": "C", "x": 0.12, "y": -0.34, "z": 0.01}, "..."],\n    "bonds": [{"begin": 0, "end": 1, "order": 1.0}, "..."]\n  }\n}',
    },
    {
      method: "POST",
      path: "/batch_predict",
      desc: "Start a batch job from a list of SMILES strings — runs on a background thread.",
      tag: "ASYNC",
      reqLabel: "REQUEST BODY",
      req: '{\n  "smiles_list": ["CCO", "CC(C)O", "c1ccccc1"],\n  "job_name": "Quick Batch"\n}',
      resLabel: "200 RESPONSE",
      res: '{\n  "job_id": 1,\n  "status": "processing",\n  "total_molecules": 3,\n  "message": "Job 1 started, processing 3 molecules"\n}',
    },
    {
      method: "GET",
      path: "/results/{job_id}",
      desc: "Batch job results as JSON.",
      tag: "POLL",
      reqLabel: "REQUEST",
      req: "GET /results/1",
      resLabel: "200 RESPONSE",
      res: '{\n  "job_id": 1,\n  "status": "completed",\n  "total_molecules": 3,\n  "processed_molecules": 3,\n  "failed_molecules": 0,\n  "results": [\n    {"smiles": "CCO", "predictions": {"..."}, "confidence": 0.94, "uncertainty": 0.06, "drug_like": true}\n  ]\n}',
    },
    {
      method: "GET",
      path: "/explain/{molecule_id}",
      desc: "Predictions and confidence for a molecule already stored in the database, by its database id.",
      tag: "EXPLANATION",
      reqLabel: "REQUEST",
      req: "GET /explain/1",
      resLabel: "200 RESPONSE",
      res: '{\n  "molecule_id": 1,\n  "smiles": "CCO",\n  "predictions": {"..."},\n  "confidence_scores": {"tox_0": 0.99, "tox_1": 0.99, "...", "esol": 0.73, "chembl_0": 1.0, "..."},\n  "average_confidence": 0.9435,\n  "lipinski": {"..."},\n  "created_at": "2026-08-15T10:22:31"\n}',
    },
    {
      method: "POST",
      path: "/batch/upload",
      desc: "Start a batch job from an uploaded CSV file with a smiles column.",
      tag: "MULTIPART · NOT JSON",
      reqLabel: "REQUEST",
      req: 'POST /batch/upload\nContent-Type: multipart/form-data\n\nfile: molecules.csv     (must have a "smiles" column)\njob_name: "My Batch"    (optional, default "Batch Job")',
      resLabel: "200 RESPONSE",
      res: '{\n  "job_id": 2,\n  "status": "processing",\n  "total_molecules": 12,\n  "message": "Job 2 started, processing 12 molecules"\n}',
    },
    {
      method: "GET",
      path: "/batch/jobs",
      desc: "List all batch jobs and their status.",
      tag: "LIST",
      reqLabel: "REQUEST",
      req: "GET /batch/jobs",
      resLabel: "200 RESPONSE",
      res: '{\n  "jobs": [\n    {"job_id": 2, "user_id": 1, "job_name": "My Batch", "status": "completed",\n     "total_molecules": 12, "processed_molecules": 12, "failed_molecules": 0,\n     "error_message": null, "output_csv_path": "./uploads/...",\n     "started_at": "2026-08-15T10:20:00", "completed_at": "2026-08-15T10:20:04"}\n  ],\n  "total_count": 1\n}',
    },
    {
      method: "GET",
      path: "/batch/{job_id}",
      desc: "Status of one batch job.",
      tag: "POLL",
      reqLabel: "REQUEST",
      req: "GET /batch/2",
      resLabel: "200 RESPONSE",
      res: '{\n  "job_id": 2,\n  "user_id": 1,\n  "job_name": "My Batch",\n  "status": "processing",\n  "total_molecules": 12,\n  "processed_molecules": 7,\n  "failed_molecules": 0,\n  "error_message": null,\n  "output_csv_path": null,\n  "started_at": "2026-08-15T10:20:00",\n  "completed_at": null\n}',
    },
    {
      method: "GET",
      path: "/batch/{job_id}/download",
      desc: "Stream the completed job's results as a CSV file.",
      tag: "CSV · NOT JSON",
      reqLabel: "REQUEST",
      req: "GET /batch/2/download",
      resLabel: "RESPONSE",
      res: "200 · Content-Type: text/csv\nContent-Disposition: attachment; filename=batch_2_results.csv\n\nsmiles,tox_ahr,tox_ar,...,esol_log_solubility,chembl_prothrombin,...\nCCO,0.0036,0.0069,...\n\n400 if the job hasn't completed yet\n404 if the job or its output file doesn't exist",
    },
  ],
  errors: {
    heading: "02 — ERRORS & VALIDATION",
    tableLabel: "ERROR RESPONSES",
    columns: ["CODE", "MEANING", "WHEN"],
    shapeLabel: "400 / 404 / 500 RETURN THE SAME SHAPE:",
    shape: '{ "detail": <string>, "error": <string>, "status_code": <int> }',
    rows: [
      { code: "400", meaning: "Bad request", when: "Empty or unparseable SMILES; non-CSV upload; malformed CSV or missing smiles column; batch exceeding 1,000 molecules; upload exceeding 5 MB; download requested before the job completed" },
      { code: "404", meaning: "Not found", when: "No job or molecule with that id, or the output file is missing" },
      { code: "422", meaning: "Unprocessable entity", when: "Request body doesn't match the expected schema. Returns FastAPI's default validation shape, not the custom one below.", warn: true },
      { code: "500", meaning: "Server error", when: "Unhandled failure during prediction, database access, or file handling", warn: true },
    ],
    validationHeading: "SMILES VALIDATION",
    validation: [
      "Validated by attempting to parse with RDKit — anything RDKit rejects returns a 400.",
      "Not canonicalised — two different but chemically equivalent SMILES for the same molecule are treated as separate inputs.",
      "Batch jobs are capped at 1,000 molecules and uploaded files at 5 MB. No limit is applied to individual molecule size.",
    ],
    exampleError: '400 { "detail": "Invalid SMILES: C1CC(",\n      "error": "Invalid SMILES: C1CC(",\n      "status_code": 400 }',
  },
  swagger: { label: "FULL REFERENCE", title: "Swagger / OpenAPI docs", url: "/docs" },
};

export const benchmarks = {
  eyebrow: "BENCHMARKS",
  headlineLine1: "Same model.",
  headlineLine2: "8.4× the throughput.",
  intro:
    "Every figure on this page comes from a measured run on the hardware listed below. Nothing is estimated or projected.",
  throughputPanel: { note: "THROUGHPUT · MOLECULES PER SECOND · SINGLE CPU", hardware: "Intel Core Ultra 5 125U · 12 cores / 14 threads · 16 GB RAM · CPU inference, no GPU" },
  throughput: { before: "114.1", after: "953.1", gain: "8.4×", beforeLabel: "CACHED · BATCH SIZE 1", afterLabel: "CACHED · BATCH SIZE 100", gainNote: "Batching the forward pass took throughput from 114 to 953 molecules per second with models cached on both sides. Against a naive implementation that reloaded all three model checkpoints from disk per molecule, the gain is 42× — but that baseline isn't one anyone would ship, so 8.4× is the figure worth quoting." },
  speedupsHeading: { eyebrow: "01 — WHERE THE SPEEDUP CAME FROM", heading: "Three changes, no new weights" },
  speedups: [
    { n: "01", gain: "8.4×", title: "Batch processing", body: "Molecules were being passed through the network one at a time, leaving most of the CPU idle. Batching them into a single forward pass via PyTorch Geometric took throughput from 114.1 to 953.1 molecules per second, measured at batch size 100." },
    { n: "02", gain: "5.1×", title: "Model & feature caching", body: "The naive path reloaded all three model checkpoints from disk on every single molecule. Loading them once at startup and holding them in memory took throughput from 22.5 to 114.1 molecules per second, before any batching was involved." },
    { n: "03", gain: "", title: "Systematic benchmarking", body: "Neither of the gains above was obvious in advance — the assumed bottleneck was model inference, and it turned out to be disk I/O and idle CPU. Measuring across batch sizes 1 to 1000 is what located them, and is also what surfaced the drop-off above batch size 100." },
  ],
  accuracy: {
    eyebrow: "02 — MODEL ACCURACY",
    heading: "Per-dataset metrics",
    note2: "RANDOM SPLIT · HELD-OUT TEST SET",
    columns: ["DATASET", "PROPERTY", "TASK", "MOLECULES", "METRIC", "TEST SCORE"],
    rows: [
      { dataset: "Tox21", colour: "#ff9dcb", property: "Toxicity", task: "12 × binary", molecules: "3,124", metric: "ROC-AUC", score: "0.60 – 0.92" },
      { dataset: "ESOL", colour: "#8fe9ff", property: "Solubility", task: "regression", molecules: "1,128", metric: "RMSE / R²", score: "0.889 log mol/L / 0.799" },
      { dataset: "ChEMBL", colour: "#d3b6ff", property: "Activity", task: "3 × binary", molecules: "10,536", metric: "ROC-AUC", score: "0.93 – 0.96" },
    ],
    perAssay: {
      tox21Strongest: [
        { label: "PPAR-GAMMA", score: "0.92" },
        { label: "AR-LBD", score: "0.91" },
        { label: "ATAD5", score: "0.90" },
      ],
      tox21Weakest: [
        { label: "ER", score: "0.60" },
        { label: "HSE", score: "0.61" },
        { label: "ARE", score: "0.64" },
      ],
      chembl: [
        { label: "Prothrombin", score: "0.964" },
        { label: "Voltage-Gated", score: "0.941" },
        { label: "Cannabinoid Receptor 1", score: "0.931" },
      ],
    },
    footnote:
      "All figures come from a random train/test split. Random splits inflate performance on molecular datasets, because structurally similar molecules end up on both sides of the split — a scaffold split, which separates by core structure, would give lower and more realistic numbers. These results should be read as an upper bound, not as expected performance on genuinely novel chemistry.",
  },
  timingTable: {
    eyebrow: "03 — INFERENCE TIMING",
    heading: "Latency and throughput",
    columns: ["CONFIGURATION", "THROUGHPUT", "PER-MOLECULE"],
    rows: [
      { configuration: "No caching, no batching", throughput: "22.5 mol/s", perMolecule: "0.0445 s" },
      { configuration: "Cached, batch size 1", throughput: "114.1 mol/s", perMolecule: "0.0088 s" },
      { configuration: "Cached, batch size 10", throughput: "534.3 mol/s", perMolecule: "0.0019 s" },
      { configuration: "Cached, batch size 100", throughput: "953.1 mol/s", perMolecule: "0.0010 s" },
      { configuration: "Cached, batch size 1000", throughput: "785.5 mol/s", perMolecule: "0.0013 s" },
    ],
    footnote:
      "Median of 3 runs per configuration, real molecules drawn from the datasets. Throughput peaks at batch size 100 and declines at 1000 — likely CPU cache and memory bandwidth effects on this part, reported as measured rather than smoothed.",
  },
  methodology: {
    eyebrow: "04 — METHODOLOGY",
    heading: "Random splitting, held-out test set",
    body1:
      "Molecules were divided at random into training, validation and test sets (70 / 15 / 15, seed 42), with the test set held out until the final evaluation. Every figure on this page is measured on that held-out split.",
    body2: "Each of the three models was trained once. Early stopping on best validation loss; the resulting best checkpoint was then evaluated on the held-out test set.",
    body3: "Single training run per model, not averaged across seeds — so the scores carry no error bars. Repeating training under several seeds would give a confidence interval and is a reasonable next step, but every figure reported here comes from one run and is stated as such.",
    chips: ["SPLIT 70 / 15 / 15", "SEED 42", "SINGLE RUN PER MODEL"],
  },
};

export const modelCard = {
  eyebrow: "MODEL CARD",
  headlineLine1: "What this model does,",
  headlineLine2: "and what it does not.",
  intro:
    "MolVeria predicts three molecular properties from a structure and shows the atoms behind each number. It is a screening aid. Every prediction it produces is a statistical estimate, not a measurement, and the limitations below are as much a part of the model as the metrics.",
  meta: [
    { label: "VERSION", value: "v1.0" },
    { label: "RELEASED", value: "28 August 2026" },
    { label: "LICENCE", value: "All rights reserved. Source available for review; not licensed for reuse or redistribution." },
    { label: "CONTACT", value: "serenadalal7@gmail.com" },
  ],
  details: {
    eyebrow: "01 — MODEL DETAILS",
    heading: "Three networks, one featuriser",
    body: "Three independent Graph Attention Networks, one per property, each sharing the same backbone: 2 stacked GATConv layers, 4 attention heads per layer, hidden dimension 64, and 8-dimensional input atom features. Each model then diverges into its own per-task heads (Linear 256→32 → ReLU → Linear 32→1, one per output). Molecules are parsed with RDKit and converted to graphs where nodes are atoms and edges are bonds; hydrogens are implicit.",
    rows: [
      { label: "ARCHITECTURE", value: "GAT · 2 layers · 4 heads · hidden dim 64" },
      { label: "MODELS", value: "3 models · one per property" },
      { label: "PARAMETERS", value: "339,472 total · 168,204 + 77,377 + 93,891" },
      { label: "FEATURISER", value: "RDKit atom + bond features" },
      { label: "FRAMEWORK", value: "PyTorch 2.13.0+cpu · PyTorch Geometric 2.8.0.post1" },
    ],
  },
  intendedUse: {
    eyebrow: "02 — INTENDED USE",
    heading: "Early-stage screening",
    body: "The model is built to help prioritise which candidate molecules are worth synthesising or assaying first, and to make that ordering inspectable rather than opaque.",
    items: [
      "Ranking a set of candidates before committing lab time",
      "Flagging structures that merit a closer look at a given endpoint",
      "Teaching and demonstration of graph models on molecules",
    ],
    users: "INTENDED USERS: Students, researchers, and developers who want fast first-pass estimates of molecular properties, or a worked example of graph neural networks applied to cheminformatics.",
  },
  outOfScope: {
    eyebrow: "03 — OUT OF SCOPE",
    heading: "What this model must not be used for",
    items: [
      { title: "NOT A LAB REPLACEMENT", body: "A prediction is not an assay result. Nothing here substitutes for laboratory testing of toxicity, solubility or activity." },
      { title: "NOT CLINICAL OR MEDICAL", body: "Not for clinical evaluation, dosing, diagnosis, or any decision affecting a patient. It has not been validated for such use." },
      { title: "NOT FOR REGULATORY USE", body: "Not suitable for submissions, safety sign-off, or compliance evidence of any kind." },
      { title: "OUTSIDE THE TRAINING DISTRIBUTION", body: "Molecules structurally unlike the training data — large biologics, organometallics, and inorganic compounds are outside what these models have seen." },
      { title: "NO ROOM FOR CONSEQUENTIAL ERROR", body: "Any use where a wrong answer carries real consequence is out of scope for a screening tool like this." },
    ],
  },
  trainingData: {
    eyebrow: "04 — TRAINING DATA",
    heading: "Three public datasets",
    note2: "14,788 MOLECULES TOTAL",
    columns: ["DATASET", "COVERS", "MOLECULES", "LABELS", "NOTES"],
    rows: [
      { dataset: "Tox21", colour: "#ff9dcb", covers: "Nuclear receptor & stress response toxicity", molecules: "3,124", labels: "12 binary assays", notes: "Heavily imbalanced; many missing labels" },
      { dataset: "ESOL", colour: "#8fe9ff", covers: "Aqueous solubility", molecules: "1,128", labels: "1 continuous (log mol/L)", notes: "Small; narrow chemical range" },
      { dataset: "ChEMBL", colour: "#d3b6ff", covers: "Bioactivity against selected targets", molecules: "10,536", labels: "3 binary targets", notes: "Curated subset; molecules RDKit could not parse were dropped" },
    ],
    footnote: "SMILES strings are validated with RDKit and converted to graphs with atoms as nodes and bonds as edges, featurised with 8 atom-level descriptors. Input is not canonicalised — two different but chemically equivalent SMILES for the same molecule are treated as separate inputs. Hydrogens are left implicit, so atom indices in the explainability output correspond to heavy atoms only.",
  },
  evaluation: {
    eyebrow: "05 — EVALUATION",
    heading: "Random splits, held-out tests",
    body: "Molecules were divided at random into training, validation and test sets (70 / 15 / 15, seed 42), with the test set held out until the final evaluation. Early stopping selected the best checkpoint by validation loss, which was then evaluated once on the held-out test set.",
    rows: [
      { property: "Toxicity", metric: "ROC-AUC", test: "0.60 – 0.92" },
      { property: "Solubility", metric: "RMSE / R²", test: "0.889 log mol/L / 0.799" },
      { property: "Activity", metric: "ROC-AUC", test: "0.93 – 0.96" },
    ],
    footnote: "SPLIT 70 / 15 / 15 · SEED 42 · SINGLE RUN PER MODEL, NO ERROR BARS · NO TEST-SET TUNING · FULL FIGURES ON",
  },
  limitations: {
    eyebrow: "06 — LIMITATIONS",
    heading: "Where it is weakest",
    items: [
      { title: "Molecules unlike the training distribution", body: "Accuracy degrades on structures far from anything seen in training. The model does not refuse such inputs — it returns a number with a wider uncertainty." },
      { title: "Chemical space public data doesn't cover", body: "Tox21, ESOL and ChEMBL are narrow slices of chemistry. Organometallics, large biologics and many novel structures are effectively unrepresented." },
      { title: "Imbalanced toxicity labels", body: "Active compounds are a small minority in most Tox21 assays, and labels are sparse. A low toxicity score partly reflects that base rate, not just the structure." },
      { title: "Gradient saliency is not chemical causation", body: "Atom importance comes from gradient saliency — it shows which atoms the model responded to, which is not the same as which atoms are chemically responsible." },
      { title: "Random-split scores are an upper bound", body: "Results come from a random split, which inflates performance on molecular data because structurally similar molecules land on both sides. A scaffold split would give lower and more realistic numbers. Read these as an upper bound." },
      { title: "Toxicity accuracy varies widely by assay", body: "Toxicity performance varies widely by assay. A 0.60 ROC-AUC on ER is close to uninformative and should not be relied on." },
      { title: "Uncertainty is a heuristic, not a probability", body: "The uncertainty figure is a heuristic based on distance from the decision boundary, not a calibrated statistical confidence interval. It is useful for ranking which predictions to verify, not as a probability." },
      { title: "Small training sets", body: "Training sets are small by pharmaceutical standards. 1,128 molecules for solubility is enough to learn general trends, not edge cases." },
    ],
  },
  ethics: {
    eyebrow: "07 — ETHICAL CONSIDERATIONS",
    heading: "On trusting a number",
    body1:
      "The main risk with a tool like this is not a wrong prediction — it is a confident-looking prediction taken at face value. A single number on a screen invites more trust than the evidence behind it supports, and a low toxicity score in particular can quietly become permission to skip a test.",
    body2:
      "That is why confidence and uncertainty are shown next to every result rather than buried in an appendix, why the atoms behind each prediction are exposed, and why this page exists at all. Treat the output as a hypothesis to test, and let the uncertainty figure decide how much weight it deserves.",
    body3: "Every number this system produces is a statistical estimate drawn from a few thousand public molecules, not a measurement. It is built to help someone decide what to test first — not to decide what is safe.",
    inShort: "IN SHORT",
    summary: "A screening aid that shows its reasoning — and its doubt.",
    bullets: [
      "Use it to order experiments, not to replace them.",
      "Read the uncertainty before you read the value.",
      "Distrust results on unusual chemistry.",
    ],
    reportError: "REPORT AN ERROR: serenadalal7@gmail.com",
    citeAs: "CITE AS: Serena Dalal. (2026). MolVeria: multi-property molecular prediction with graph attention networks. v1.0.",
  },
};

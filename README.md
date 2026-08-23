# MolVeria

MolVeria predicts three molecular properties from a single structure — toxicity, aqueous solubility, and biological activity — and shows which atoms drove each prediction. Paste a SMILES string (or upload a batch of them) and it returns 16 individual predictions across three independent Graph Attention Networks, each with a 3D view of the molecule and per-atom gradient-saliency highlighting.

It is a screening aid, not a substitute for laboratory testing. See [Model Card & limitations](#model-card--limitations) below.

## What it predicts

| Property | Source | Output |
|---|---|---|
| Toxicity | 12 Tox21 assays | 12 binary scores (nuclear receptor & stress response pathways) |
| Solubility | ESOL | 1 continuous value (log mol/L) |
| Activity | 3 ChEMBL targets | 3 binary scores (Prothrombin, Cannabinoid receptor 1, Voltage-gated inward rectifier) |

16 predictions total per molecule, plus a confidence score, an uncertainty estimate, Lipinski Rule-of-Five drug-likeness, and per-atom importance weights for each property.

## Datasets

| Dataset | Molecules | Covers |
|---|---|---|
| Tox21 | 3,124 | Nuclear receptor & stress response toxicity |
| ESOL | 1,128 | Aqueous solubility |
| ChEMBL | 10,536 | Bioactivity against 3 selected targets |
| **Total** | **14,788** | |

All three are public benchmark datasets. Molecules RDKit could not parse were dropped during preprocessing; SMILES are validated but not canonicalised, so two different spellings of the same molecule are treated as separate inputs.

## Architecture

Three independent Graph Attention Networks, one per property — there is no shared learned encoder. Each shares the same backbone:

- 2 stacked GATConv layers
- 4 attention heads per layer
- Hidden dimension 64
- 8-dimensional input atom features (RDKit-derived: atomic number, H count, charge, degree, aromaticity, hybridization, ring membership, valence)

Each network then diverges into its own per-task heads (`Linear(256→32) → ReLU → Linear(32→1)`, one per output).

| Model | Tasks | Trainable parameters |
|---|---|---|
| Toxicity (Tox21) | 12 | 168,204 |
| Solubility (ESOL) | 1 | 77,377 |
| Activity (ChEMBL) | 3 | 93,891 |
| **Total** | **16** | **339,472** |

Atom importance is computed via vanilla gradient saliency (input-gradient attribution) against each property's own driving task — not attention weights, and not a mechanistic claim about which atoms are chemically responsible for the effect, just where the network's gradient was concentrated.

Built with PyTorch 2.13.0+cpu and PyTorch Geometric 2.8.0.post1.

## Results

| Property | Metric | Test score |
|---|---|---|
| Toxicity | ROC-AUC | 0.60 – 0.92 (varies by assay) |
| Solubility | RMSE / R² | 0.889 log mol/L / 0.799 |
| Activity | ROC-AUC | 0.93 – 0.96 |

Evaluated on a random 70/15/15 train/validation/test split (seed 42), one training run per model — these scores carry no error bars.

**These numbers are a random-split result, and that matters.** A random split lets structurally similar molecules land on both sides of the split, which inflates apparent performance on molecular data. A scaffold split — separating by core structure — would give lower, more realistic numbers. Read the figures above as an upper bound, not as expected performance on genuinely novel chemistry. Full per-assay breakdown and methodology are on the deployed site's Benchmarks page.

## Performance

Measured on an Intel Core Ultra 5 125U (12 cores / 14 threads, 16 GB RAM, CPU inference, no GPU):

| Configuration | Throughput |
|---|---|
| No caching, no batching | 22.5 mol/s |
| Cached, batch size 1 | 114.1 mol/s |
| Cached, batch size 100 | 953.1 mol/s |

Caching the three models eliminated redundant disk loads, taking throughput from 22.5 to 114.1 mol/s (5.1×). Batching the forward pass took it from 114.1 to 953.1 mol/s (a further 8.4×), for 42× overall against the naive baseline. The 8.4× figure is the one worth quoting: it isolates batching with models cached on both sides, whereas the naive baseline reloads all three checkpoints from disk per molecule and isn't an implementation anyone would ship. Median of 3 runs per configuration, real molecules drawn from the datasets.

## Setup

### Prerequisites

- Python 3.12
- Node.js
- PostgreSQL, running locally, with a `drug_discovery` database created and the schema in `database/create_schema.sql` applied

### Backend

```bash
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in your real database credentials:

```bash
cp .env.example .env
```

`.env` is gitignored — it holds your actual `DATABASE_URL` and is never committed. `.env.example` documents the expected format with a placeholder value.

Then run the API from the project root:

```bash
uvicorn api.main:app --reload --port 8000
```

Interactive API docs are served at `http://localhost:8000/docs` once it's running.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`, talking to the backend on port 8000.

## Model Card & Limitations

The deployed site's Model Card page has the full breakdown — intended use, out-of-scope uses, per-assay accuracy, and known limitations (random-split inflation, imbalanced toxicity labels, gradient saliency vs. causation, small training sets, and more). The short version:

**This is a screening and prioritisation aid trained on public datasets, not a substitute for laboratory testing.** Every prediction it produces is a statistical estimate, not a measurement. It is not for clinical, medical, or regulatory use, and it has not been validated on chemistry unlike its training data.

## License

All rights reserved. Source available for review; not licensed for reuse or redistribution.

## Contact

Serena Dalal — serenadalal7@gmail.com

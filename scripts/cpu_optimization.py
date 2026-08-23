"""
CPU throughput benchmark — real measurements, no assumed numbers.

Compares two paths on the exact same set of real molecules, drawn from
this project's own Tox21 / ESOL / ChEMBL datasets (data/*/raw/*.csv):

  UNOPTIMISED  — reload all three model checkpoints from disk before
                 every single molecule, no batching, one molecule at a
                 time. This is the "naive" path: no caching, no batching.

  OPTIMISED    — models loaded once and reused (the caching get_models()
                 already does in api/main.py), and molecules collated
                 into a single torch_geometric.data.Batch per run so
                 each model does ONE forward pass over the whole batch
                 instead of one call per molecule. Measured at batch
                 sizes of 1, 10, 100 and 1000 real molecules.

Both paths time SMILES -> graph conversion AND the three model forward
passes, since that's the full cost a real request pays end to end.

Every configuration is run 3 times; the reported number is the median,
so one slow run (OS scheduling noise, etc.) doesn't skew the result.

Run: python scripts/cpu_optimization.py
Output is printed live and also saved to results/cpu_benchmark_<UTC
timestamp>.txt so there's a durable record of the run.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import csv
import time
import random
import platform
import statistics
import datetime

import torch
import torch_geometric
from torch_geometric.data import Batch

from utils.smiles_to_graph import smiles_to_graph
from models.multitask_gat_tox21 import Tox21MultiTaskGAT
from models.multitask_gat_esol import ESOLRegression
from models.multitask_gat_chembl import ChEMBLMultiTaskGAT

# Hardware label is supplied by hand — Python has no reliable
# cross-platform way to read the marketing CPU name, and
# platform.processor() returns an empty string on this machine.
HARDWARE_LABEL = "Intel Core Ultra 5 125U, 12 cores / 14 threads, 16 GB RAM, CPU only (no GPU)"

MODEL_PATHS = {
    'tox21': './results/best_tox21_multitask.pt',
    'esol': './results/best_esol.pt',
    'chembl': './results/best_chembl_multitask.pt',
}

DATASET_FILES = [
    ('data/tox21/raw/tox21_smiles.csv', 'smiles'),
    ('data/esol/raw/ESOL.csv', 'smiles'),
    ('data/chembl/raw/chembl_3targets.csv', 'smiles'),
]

MAX_BATCH_SIZE = 1000
UNOPTIMISED_N = 25       # naive path reloads 3 checkpoints from disk per
                          # molecule, which is inherently slow — kept
                          # smaller than the batch sweep so the whole
                          # script finishes in a reasonable time. Flagged
                          # explicitly in the output rather than silently
                          # using a different sample size.
REPEATS = 3
SEED = 42

_log_lines = []


def log(msg=""):
    print(msg)
    _log_lines.append(msg)


def build_model(name, device):
    if name == 'tox21':
        m = Tox21MultiTaskGAT(input_dim=8, hidden_dim=64, heads=4, dropout=0.0, num_tasks=12)
    elif name == 'esol':
        m = ESOLRegression(input_dim=8, hidden_dim=64, heads=4, dropout=0.0)
    elif name == 'chembl':
        m = ChEMBLMultiTaskGAT(input_dim=8, hidden_dim=64, heads=4, dropout=0.0, num_tasks=3)
    else:
        raise ValueError(name)
    m.load_state_dict(torch.load(MODEL_PATHS[name], map_location=device))
    m.to(device).eval()
    return m


def load_real_molecule_pool(n, seed=SEED):
    """Real, distinct SMILES drawn from the project's own datasets —
    never a repeated molecule. Invalid rows (RDKit can't parse them)
    are skipped rather than crashing the benchmark."""
    raw = []
    for path, column in DATASET_FILES:
        full_path = os.path.join(os.path.dirname(__file__), '..', path)
        with open(full_path, newline='', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                s = (row.get(column) or '').strip()
                if s:
                    raw.append(s)

    # De-duplicate, preserving first occurrence, then shuffle with a
    # fixed seed so the run is reproducible.
    seen = set()
    unique = []
    for s in raw:
        if s not in seen:
            seen.add(s)
            unique.append(s)
    rng = random.Random(seed)
    rng.shuffle(unique)

    pool = []
    skipped = 0
    for s in unique:
        if len(pool) >= n:
            break
        try:
            smiles_to_graph(s)
        except Exception:
            skipped += 1
            continue
        pool.append(s)

    if len(pool) < n:
        raise RuntimeError(f"Only found {len(pool)} valid, distinct molecules across the dataset files — need {n}.")

    return pool, skipped, len(raw), len(unique)


def optimised_run(smiles_subset, tox21, esol, chembl, device):
    start = time.perf_counter()
    graphs = [smiles_to_graph(s) for s in smiles_subset]
    batch = Batch.from_data_list(graphs).to(device)
    with torch.no_grad():
        tox21(batch.x, batch.edge_index, batch.batch)
        esol(batch.x, batch.edge_index, batch.batch)
        chembl(batch.x, batch.edge_index, batch.batch)
    return time.perf_counter() - start


def unoptimised_run(smiles_subset, device):
    start = time.perf_counter()
    for s in smiles_subset:
        tox21 = build_model('tox21', device)
        esol = build_model('esol', device)
        chembl = build_model('chembl', device)
        graph = smiles_to_graph(s).to(device)
        with torch.no_grad():
            tox21(graph.x, graph.edge_index, graph.batch)
            esol(graph.x, graph.edge_index, graph.batch)
            chembl(graph.x, graph.edge_index, graph.batch)
    return time.perf_counter() - start


def main():
    run_started = datetime.datetime.now(datetime.timezone.utc)

    log("=" * 100)
    log(" CPU THROUGHPUT BENCHMARK — REAL MEASUREMENTS")
    log("=" * 100)
    log(f"\n Run started (UTC): {run_started.isoformat()}")
    log(f" Hardware: {HARDWARE_LABEL}")
    log(f" Python: {platform.python_version()}  |  torch: {torch.__version__}  |  torch_geometric: {torch_geometric.__version__}")
    log(f" torch.get_num_threads(): {torch.get_num_threads()}  |  os.cpu_count(): {os.cpu_count()}")

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    log(f" Device: {device}")

    log("\n" + "=" * 100)
    log(" MOLECULE POOL — real molecules, not repeated copies")
    log("=" * 100)
    pool, skipped, n_raw, n_unique = load_real_molecule_pool(MAX_BATCH_SIZE)
    log(f"\n Sourced from: {', '.join(p for p, _ in DATASET_FILES)}")
    log(f" Random seed: {SEED}")
    log(f" Raw rows across all files: {n_raw}  |  distinct SMILES: {n_unique}  |  unparseable (skipped): {skipped}")
    log(f" Molecule pool built for this run: {len(pool)} distinct, real, RDKit-valid molecules")
    log(f" Example molecules: {pool[0]}, {pool[1]}, {pool[2]} ...")

    # ------------------------------------------------------------------
    # UNOPTIMISED PATH — no model caching, no batching, one at a time
    # ------------------------------------------------------------------
    log("\n" + "=" * 100)
    log(" UNOPTIMISED PATH — reload models from disk per molecule, no batching")
    log("=" * 100)
    log(f"\n Sample size: {UNOPTIMISED_N} molecules (kept smaller than the batch")
    log(f" sweep below because reloading 3 checkpoints from disk {UNOPTIMISED_N} x {REPEATS}")
    log(f" times is inherently slow — this is disclosed, not hidden.)")
    log(f" Note: even this path benefits from the OS filesystem cache after the")
    log(f" first read of each checkpoint on this machine, so it is a conservative")
    log(f" (best-case) estimate of a true cold-disk penalty in production.")

    unopt_subset = pool[:UNOPTIMISED_N]
    unopt_times = []
    for run in range(REPEATS):
        t = unoptimised_run(unopt_subset, device)
        unopt_times.append(t)
        log(f"\n Run {run + 1}/{REPEATS}: {t:.4f}s total  ->  {UNOPTIMISED_N / t:.4f} mol/s")

    unopt_median_time = statistics.median(unopt_times)
    unopt_throughput = UNOPTIMISED_N / unopt_median_time
    log(f"\n Median time: {unopt_median_time:.4f}s over {REPEATS} runs")
    log(f" UNOPTIMISED THROUGHPUT (median): {unopt_throughput:.4f} mol/s")

    # ------------------------------------------------------------------
    # OPTIMISED PATH — models cached once, batched forward passes
    # ------------------------------------------------------------------
    log("\n" + "=" * 100)
    log(" OPTIMISED PATH — models loaded once, batched via torch_geometric.data.Batch")
    log("=" * 100)

    log("\n Loading all three models once (cached for the rest of this run)...")
    start_load = time.perf_counter()
    tox21 = build_model('tox21', device)
    esol = build_model('esol', device)
    chembl = build_model('chembl', device)
    load_time = time.perf_counter() - start_load
    log(f" Models loaded in {load_time:.4f}s (this cost is paid once, not per molecule)")

    batch_sizes = [1, 10, 100, 1000]
    optimised_results = {}

    for batch_size in batch_sizes:
        log(f"\n{'-' * 100}")
        log(f" Batch size: {batch_size} molecules")
        log(f"{'-' * 100}")

        subset = pool[:batch_size]
        times = []
        for run in range(REPEATS):
            t = optimised_run(subset, tox21, esol, chembl, device)
            times.append(t)
            log(f" Run {run + 1}/{REPEATS}: {t:.4f}s total  ->  {batch_size / t:.4f} mol/s")

        median_time = statistics.median(times)
        throughput = batch_size / median_time
        optimised_results[batch_size] = {
            'median_time_s': median_time,
            'throughput_mol_s': throughput,
            'all_times_s': times,
        }
        log(f" Median time: {median_time:.4f}s over {REPEATS} runs")
        log(f" THROUGHPUT (median): {throughput:.4f} mol/s")

    # ------------------------------------------------------------------
    # SUMMARY
    # ------------------------------------------------------------------
    log("\n" + "=" * 100)
    log(" SUMMARY")
    log("=" * 100)

    log(f"\n UNOPTIMISED (no caching, no batching, {UNOPTIMISED_N} molecules 1-at-a-time):")
    log(f"   {unopt_throughput:.4f} mol/s  ({unopt_median_time / UNOPTIMISED_N:.4f} s/mol)")

    log(f"\n OPTIMISED (models cached, batched forward pass) by batch size:")
    for batch_size in batch_sizes:
        r = optimised_results[batch_size]
        log(f"   batch={batch_size:>5}: {r['throughput_mol_s']:>10.4f} mol/s  ({r['median_time_s'] / batch_size:.6f} s/mol, median of {REPEATS} runs)")

    best_batch_size = max(optimised_results, key=lambda k: optimised_results[k]['throughput_mol_s'])
    best_throughput = optimised_results[best_batch_size]['throughput_mol_s']
    speedup = best_throughput / unopt_throughput

    log(f"\n Best optimised throughput: {best_throughput:.4f} mol/s at batch size {best_batch_size}")
    log(f" Measured speedup vs. unoptimised baseline: {speedup:.2f}x")

    log("\n" + "=" * 100)
    log(" BENCHMARK COMPLETE")
    log("=" * 100 + "\n")

    # Persist the full log
    results_dir = os.path.join(os.path.dirname(__file__), '..', 'results')
    os.makedirs(results_dir, exist_ok=True)
    filename = f"cpu_benchmark_{run_started.strftime('%Y%m%dT%H%M%SZ')}.txt"
    out_path = os.path.join(results_dir, filename)
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(_log_lines) + '\n')
    print(f"\nFull output saved to: {os.path.relpath(out_path)}")


if __name__ == "__main__":
    main()

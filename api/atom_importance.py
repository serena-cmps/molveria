"""
Per-atom importance for the 3D viewer's "which atoms drove this prediction"
highlighting.

Method: vanilla gradient saliency — one backward pass per property, taken
against that property's *driving* task (the same argmax task already shown
as the headline value, e.g. NR-ER for toxicity if that's the strongest of
the 12 assays), not a fixed task index. This is the same technique already
used offline in scripts/attention_extraction.py and
scripts/substructure_importance.py (both compute an identical
`node_importance` array internally, they just never persisted it per-atom or
used the real driving task) — this module is the real-time-callable version.

Cost: ~10ms per property per molecule on CPU for small molecules (benchmarked
on ethanol/aspirin/ibuprofen), so three properties together add roughly 30ms
to a single /predict call. Not intended to run over a whole batch job — call
per molecule, on demand.
"""

import numpy as np
import torch
from rdkit import Chem

from utils.smiles_to_graph import smiles_to_graph


def _node_importance(model, graph, task_idx: int, device) -> np.ndarray:
    """One forward+backward pass. Returns raw (unnormalized) per-atom
    abs-gradient magnitude — comparable only within this one array, never
    across properties (see normalize_importance)."""
    graph = graph.to(device)
    x = graph.x.clone().detach().requires_grad_(True)

    predictions = model(x, graph.edge_index, graph.batch)
    output = predictions[0, task_idx] if predictions.dim() > 1 else predictions[0]
    output.backward()

    return x.grad.abs().sum(dim=1).detach().cpu().numpy()


def _normalize(raw: np.ndarray) -> list:
    """Min-max to [0, 1] *within this one molecule+property*. Min-max (not
    softmax) so the relative spacing between atoms' raw magnitudes survives —
    softmax would compress or exaggerate gaps depending on scale. Never
    normalize across properties: raw gradient magnitude scale is arbitrary
    and incomparable between models (that mismatch is exactly what showed up
    as inconsistent scales in the old gradient_bond_importance.csv output)."""
    lo, hi = float(raw.min()), float(raw.max())
    if hi - lo < 1e-12:
        # Degenerate case (e.g. a single-atom molecule, or a model that's
        # genuinely flat across every atom for this task) — nothing to rank.
        return [0.0 for _ in raw]
    return [(float(v) - lo) / (hi - lo) for v in raw]


def _atom_array(mol, raw: np.ndarray) -> list:
    weights = _normalize(raw)
    return [
        {"index": i, "symbol": mol.GetAtomWithIdx(i).GetSymbol(), "weight": round(w, 4)}
        for i, w in enumerate(weights)
    ]


def compute_explanation(
    smiles: str,
    tox21_model,
    esol_model,
    chembl_model,
    device,
    tox21_vals: list,
    chembl_vals: list,
) -> dict:
    """Returns {"toxicity_atoms": [...], "solubility_atoms": [...], "activity_atoms": [...]},
    one entry per atom, each {index, symbol, weight}. `weight` is 0-1,
    min-max normalized within that property's own array.

    tox21_vals / chembl_vals are the already-computed prediction arrays for
    this molecule (from predict_single_molecule) — used only to find which
    task is the driving one per property (argmax), so the highlighted atoms
    actually explain the value shown on that panel, not an arbitrary fixed
    task (task 0 was the old, wrong behavior in the offline scripts).
    """
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise ValueError(f"Invalid SMILES: {smiles}")

    tox_task_idx = int(np.argmax(tox21_vals))
    chembl_task_idx = int(np.argmax(chembl_vals))

    graph = smiles_to_graph(smiles)

    tox_raw = _node_importance(tox21_model, graph, tox_task_idx, device)
    esol_raw = _node_importance(esol_model, graph, 0, device)
    chembl_raw = _node_importance(chembl_model, graph, chembl_task_idx, device)

    return {
        "toxicity_atoms": _atom_array(mol, tox_raw),
        "solubility_atoms": _atom_array(mol, esol_raw),
        "activity_atoms": _atom_array(mol, chembl_raw),
    }

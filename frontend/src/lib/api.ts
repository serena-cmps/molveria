/**
 * Thin fetch wrapper around the FastAPI backend. No framework, just typed
 * shapes matching api/schemas.py + the atom_importance.py / molecule_3d.py
 * additions.
 */

// Exported so other places that need to reach the backend (e.g. the API
// page's link to the live /docs) derive from this one constant instead of
// hardcoding a second copy that could drift from it — updating deployment
// is then a one-line change here rather than a hunt across the codebase.
//
// VITE_API_URL is a build-time Vite env var (set in Vercel for production),
// not read at runtime — falls back to localhost so local dev needs no .env.
export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface AtomImportance {
  index: number;
  symbol: string;
  weight: number;
}

export interface Atom3D {
  index: number;
  symbol: string;
  x: number;
  y: number;
  z: number;
  /** Cheap, best-effort RDKit substructure tag (e.g. "ester", "aromatic ring") — null when nothing matched. */
  functional_group: string | null;
}

export interface Bond3D {
  begin: number;
  end: number;
  order: number;
}

export interface Structure3D {
  atoms: Atom3D[];
  bonds: Bond3D[];
}

export interface Explanation {
  toxicity_atoms: AtomImportance[];
  solubility_atoms: AtomImportance[];
  activity_atoms: AtomImportance[];
}

export interface LipinskiRaw {
  molecular_weight: number;
  logp: number;
  h_donors: number;
  h_acceptors: number;
  passes_all: boolean;
}

export interface PredictResponse {
  smiles: string;
  predictions: { tox21: number[]; esol: number; chembl: number[] };
  confidence: number;
  uncertainty: number;
  /** Per-task confidence (0-1), grouped like `predictions` — the raw material for real per-property uncertainty. */
  confidences: { tox21: number[]; esol: number; chembl: number[] };
  drug_like: boolean;
  lipinski: LipinskiRaw;
  explanation: Explanation;
  structure: Structure3D;
}

/** Discriminated result — the caller switches on `.kind`, never throws. */
export type PredictResult =
  | { kind: "ok"; data: PredictResponse }
  | { kind: "invalid"; message: string }
  | { kind: "offline" };

export async function predict(smiles: string): Promise<PredictResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ smiles }),
    });
  } catch {
    // fetch itself throws on network failure / CORS block / server down —
    // that's exactly the "offline" state, not a validation problem.
    return { kind: "offline" };
  }

  if (res.status === 400 || res.status === 422) {
    let message = "Not a valid SMILES string.";
    try {
      const body = await res.json();
      message = typeof body.detail === "string" ? body.detail : message;
    } catch {
      // keep the default message
    }
    return { kind: "invalid", message };
  }

  if (!res.ok) {
    return { kind: "offline" };
  }

  const data = (await res.json()) as PredictResponse;
  return { kind: "ok", data };
}

export interface BatchPredictResponse {
  job_id: number;
  status: string;
  total_molecules: number;
  message: string;
}

export async function batchPredict(smilesList: string[], jobName = "Batch Job"): Promise<
  | { kind: "ok"; data: BatchPredictResponse }
  | { kind: "invalid"; message: string }
  | { kind: "offline" }
> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/batch_predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ smiles_list: smilesList, job_name: jobName }),
    });
  } catch {
    return { kind: "offline" };
  }

  if (res.status === 400 || res.status === 422) {
    let message = "The batch could not be submitted.";
    try {
      const body = await res.json();
      message = typeof body.detail === "string" ? body.detail : message;
    } catch {
      // keep default
    }
    return { kind: "invalid", message };
  }

  if (!res.ok) return { kind: "offline" };
  const data = (await res.json()) as BatchPredictResponse;
  return { kind: "ok", data };
}

export interface BatchJobStatus {
  job_id: number;
  status: "processing" | "completed" | "failed" | string;
  total_molecules: number;
  processed_molecules: number;
  failed_molecules: number;
  error_message: string | null;
}

export async function getBatchStatus(jobId: number): Promise<
  { kind: "ok"; data: BatchJobStatus } | { kind: "offline" }
> {
  try {
    const res = await fetch(`${BASE_URL}/batch/${jobId}`);
    if (!res.ok) return { kind: "offline" };
    const data = (await res.json()) as BatchJobStatus;
    return { kind: "ok", data };
  } catch {
    return { kind: "offline" };
  }
}

export interface BatchResultItem {
  smiles: string;
  predictions: { tox21: number[]; esol: number; chembl: number[] };
  confidence: number;
  drug_like: boolean;
}

export async function getBatchResults(jobId: number): Promise<
  | { kind: "ok"; data: { job_id: number; status: string; results: BatchResultItem[] } }
  | { kind: "offline" }
> {
  try {
    const res = await fetch(`${BASE_URL}/results/${jobId}`);
    if (!res.ok) return { kind: "offline" };
    const data = await res.json();
    return { kind: "ok", data };
  } catch {
    return { kind: "offline" };
  }
}

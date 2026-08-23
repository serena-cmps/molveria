import type { PredictResponse } from "./api";

/**
 * Session/browser-local prediction history.
 *
 * There is no backend endpoint that lists past single predictions —
 * POST /predict is stateless and never persists a row (only batch jobs do).
 * Building a real server-side history would mean a new endpoint and DB
 * schema, which wasn't in scope here, so this stores full prediction
 * responses in localStorage instead. That means history is per-browser, not
 * shared across devices, and caps out at STORAGE_LIMIT entries.
 *
 * Batch jobs are recorded too, but NOT their per-molecule results — a
 * completed job can have hundreds/thousands of rows, and storing all of
 * that would blow past what a 20-entry cap is meant to represent (20
 * *recent things*, not 20 recent things unless one of them happens to be
 * huge). A batch entry is just enough to identify and re-fetch the job
 * (job id, name, molecule count) — clicking it calls the batch endpoints
 * again rather than replaying stored data.
 */

const STORAGE_KEY = "molveria_prediction_history";
const STORAGE_LIMIT = 20;

export interface SingleHistoryEntry {
  kind: "single";
  id: string;
  timestamp: number;
  response: PredictResponse;
}

export interface BatchHistoryEntry {
  kind: "batch";
  id: string;
  timestamp: number;
  jobId: number;
  jobName: string;
  totalMolecules: number;
}

export type HistoryEntry = SingleHistoryEntry | BatchHistoryEntry;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(next: HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage full or unavailable (private browsing) — history just
    // won't persist across reloads; not worth failing over.
  }
}

export function addToHistory(response: PredictResponse): HistoryEntry[] {
  const entry: SingleHistoryEntry = {
    kind: "single",
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    response,
  };
  const next = [
    entry,
    ...loadHistory().filter((h) => h.kind !== "single" || h.response.smiles !== response.smiles),
  ].slice(0, STORAGE_LIMIT);
  save(next);
  return next;
}

export function addBatchToHistory(jobId: number, jobName: string, totalMolecules: number): HistoryEntry[] {
  const entry: BatchHistoryEntry = {
    kind: "batch",
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    jobId,
    jobName,
    totalMolecules,
  };
  const next = [
    entry,
    ...loadHistory().filter((h) => h.kind !== "batch" || h.jobId !== jobId),
  ].slice(0, STORAGE_LIMIT);
  save(next);
  return next;
}

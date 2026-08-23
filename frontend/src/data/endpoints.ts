/**
 * Names and order for the raw model outputs returned by POST /predict.
 * Order must match `models/multitask_gat_tox21.py` / `multitask_gat_chembl.py`
 * forward() concatenation order exactly — the API returns positional arrays,
 * not named fields.
 */

export interface Endpoint {
  key: string
  label: string
}

// tox21: [ahr, ar, are, aromatase, ar_lbd, atad5, er, er_lbd, hse, mmp, p53, ppar_gamma]
export const TOX21_ENDPOINTS: Endpoint[] = [
  { key: 'ahr', label: 'NR-AhR' },
  { key: 'ar', label: 'NR-AR' },
  { key: 'are', label: 'SR-ARE' },
  { key: 'aromatase', label: 'NR-Aromatase' },
  { key: 'ar_lbd', label: 'NR-AR-LBD' },
  { key: 'atad5', label: 'SR-ATAD5' },
  { key: 'er', label: 'NR-ER' },
  { key: 'er_lbd', label: 'NR-ER-LBD' },
  { key: 'hse', label: 'SR-HSE' },
  { key: 'mmp', label: 'SR-MMP' },
  { key: 'p53', label: 'SR-p53' },
  { key: 'ppar_gamma', label: 'NR-PPAR-gamma' },
]

// chembl: [prothrombin, cannabinoid_r1, voltage_gated]
export const CHEMBL_TARGETS: Endpoint[] = [
  { key: 'prothrombin', label: 'Prothrombin' },
  { key: 'cannabinoid_r1', label: 'Cannabinoid receptor 1' },
  { key: 'voltage_gated', label: 'Voltage-gated inward rectifier' },
]

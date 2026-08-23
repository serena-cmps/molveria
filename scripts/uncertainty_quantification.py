import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pandas as pd
import numpy as np

print("\n" + "="*100)
print("  UNCERTAINTY QUANTIFICATION - PREDICTION CONFIDENCE ANALYSIS")
print("="*100)

# ============================================================================
# CALCULATE CONFIDENCE FUNCTION
# ============================================================================
def get_confidence(prediction, pred_type='classification'):
    """
    Calculate confidence score for a prediction
    
    Confidence ranges from 0 to 1:
    - 1.0 = very confident
    - 0.0 = very uncertain
    
    Args:
        prediction: float value
        pred_type: 'classification' (0-1) or 'regression' (unbounded)
    
    Returns:
        confidence: float between 0 and 1
    """
    if prediction is None:
        return None
    
    if pred_type == 'regression':
        # For regression (ESOL solubility): use inverse of deviation
        # Assume solubility values range from -5 to 5
        abs_deviation = abs(prediction - 0)
        confidence = max(0, min(1, 1 - (abs_deviation / 5)))
        return confidence
    else:
        # For classification (0-1 probabilities)
        distance_from_center = abs(prediction - 0.5)
        confidence = 1 - (distance_from_center * 2)
        return confidence

# ============================================================================
# FLAG UNCERTAIN PREDICTIONS
# ============================================================================
def flag_uncertain(confidence, threshold=0.7):
    """
    Flag prediction as uncertain if confidence below threshold
    
    Args:
        confidence: float
        threshold: minimum confidence score (default 0.7)
    
    Returns:
        'Uncertain' or 'Confident'
    """
    if confidence < threshold:
        return 'Uncertain'
    return 'Confident'

# ============================================================================
# PROPERTY NAMES
# ============================================================================
tox21_assays = [
    'tox_ahr', 'tox_ar', 'tox_are', 'tox_aromatase', 'tox_ar_lbd', 'tox_atad5',
    'tox_er', 'tox_er_lbd', 'tox_hse', 'tox_mmp', 'tox_p53', 'tox_ppar_gamma'
]

esol_property = ['sol_esol']

chembl_targets = [
    'act_prothrombin',
    'act_cannabinoid_receptor_1',
    'act_voltage_gated'
]

all_predictions = tox21_assays + esol_property + chembl_targets

# ============================================================================
# PROCESS TOX21 DATASET
# ============================================================================
print("\n" + "="*100)
print(" PROCESSING TOX21 UNCERTAINTY")
print("="*100)

df_tox21 = pd.read_csv('./results/drug_likeness_reports_tox21.csv')

tox21_uncertainty = []

for idx, row in df_tox21.iterrows():
    smiles = row['smiles']
    
    # Calculate confidence for each prediction
    confidences = {}
    for pred_col in all_predictions:
        if pred_col in row:
            pred_value = row[pred_col]
            # ESOL is regression, others are classification
            pred_type = 'regression' if 'sol_esol' in pred_col else 'classification'
            conf = get_confidence(pred_value, pred_type)
            confidences[f'{pred_col}_conf'] = conf
    
    # Overall confidence (average of all 16)
    avg_confidence = np.mean([c for c in confidences.values() if c is not None])
    
    # Count uncertain predictions
    uncertain_count = sum([1 for c in confidences.values() if c is not None and c < 0.7])
    
    # Flag as uncertain if average confidence < 0.6
    overall_flag = 'Uncertain' if avg_confidence < 0.6 else 'Confident'
    
    report = {
        'smiles': smiles,
        'avg_confidence': avg_confidence,
        'uncertain_predictions': uncertain_count,
        'flag': overall_flag,
        **confidences
    }
    
    tox21_uncertainty.append(report)
    
    if (idx + 1) % 500 == 0:
        print(f"   Processed {idx + 1}/{len(df_tox21)} molecules...")

print(f"\n Tox21: {len(tox21_uncertainty)} molecules processed")

# Save Tox21 uncertainty
tox21_unc_df = pd.DataFrame(tox21_uncertainty)
tox21_unc_df.to_csv('./results/uncertainty_tox21.csv', index=False)
print(f" Saved: ./results/uncertainty_tox21.csv")

# ============================================================================
# PROCESS ESOL DATASET
# ============================================================================
print("\n" + "="*100)
print(" PROCESSING ESOL UNCERTAINTY")
print("="*100)

df_esol = pd.read_csv('./results/drug_likeness_reports_esol.csv')

esol_uncertainty = []

for idx, row in df_esol.iterrows():
    smiles = row['smiles']
    
    # Calculate confidence for each prediction
    confidences = {}
    for pred_col in all_predictions:
        if pred_col in row:
            pred_value = row[pred_col]
            # ESOL is regression, others are classification
            pred_type = 'regression' if 'sol_esol' in pred_col else 'classification'
            conf = get_confidence(pred_value, pred_type)
            confidences[f'{pred_col}_conf'] = conf
    
    # Overall confidence (average of all 16)
    avg_confidence = np.mean([c for c in confidences.values() if c is not None])
    
    # Count uncertain predictions
    uncertain_count = sum([1 for c in confidences.values() if c is not None and c < 0.7])
    
    # Flag as uncertain if average confidence < 0.6
    overall_flag = 'Uncertain' if avg_confidence < 0.6 else 'Confident'
    
    report = {
        'smiles': smiles,
        'avg_confidence': avg_confidence,
        'uncertain_predictions': uncertain_count,
        'flag': overall_flag,
        **confidences
    }
    
    esol_uncertainty.append(report)
    
    if (idx + 1) % 200 == 0:
        print(f"   Processed {idx + 1}/{len(df_esol)} molecules...")

print(f"\n ESOL: {len(esol_uncertainty)} molecules processed")

# Save ESOL uncertainty
esol_unc_df = pd.DataFrame(esol_uncertainty)
esol_unc_df.to_csv('./results/uncertainty_esol.csv', index=False)
print(f" Saved: ./results/uncertainty_esol.csv")

# ============================================================================
# PROCESS ChEMBL DATASET
# ============================================================================
print("\n" + "="*100)
print(" PROCESSING ChEMBL UNCERTAINTY")
print("="*100)

df_chembl = pd.read_csv('./results/drug_likeness_reports_chembl.csv')

chembl_uncertainty = []

for idx, row in df_chembl.iterrows():
    smiles = row['smiles']
    
    # Calculate confidence for each prediction
    confidences = {}
    for pred_col in all_predictions:
        if pred_col in row:
            pred_value = row[pred_col]
            # ESOL is regression, others are classification
            pred_type = 'regression' if 'sol_esol' in pred_col else 'classification'
            conf = get_confidence(pred_value, pred_type)
            confidences[f'{pred_col}_conf'] = conf
    
    # Overall confidence (average of all 16)
    avg_confidence = np.mean([c for c in confidences.values() if c is not None])
    
    # Count uncertain predictions
    uncertain_count = sum([1 for c in confidences.values() if c is not None and c < 0.7])
    
    # Flag as uncertain if average confidence < 0.6
    overall_flag = 'Uncertain' if avg_confidence < 0.6 else 'Confident'
    
    report = {
        'smiles': smiles,
        'avg_confidence': avg_confidence,
        'uncertain_predictions': uncertain_count,
        'flag': overall_flag,
        **confidences
    }
    
    chembl_uncertainty.append(report)
    
    if (idx + 1) % 1000 == 0:
        print(f"   Processed {idx + 1}/{len(df_chembl)} molecules...")

print(f"\n ChEMBL: {len(chembl_uncertainty)} molecules processed")

# Save ChEMBL uncertainty
chembl_unc_df = pd.DataFrame(chembl_uncertainty)
chembl_unc_df.to_csv('./results/uncertainty_chembl.csv', index=False)
print(f" Saved: ./results/uncertainty_chembl.csv")

# ============================================================================
# UNCERTAINTY SUMMARY STATISTICS
# ============================================================================
print("\n" + "="*100)
print(" UNCERTAINTY SUMMARY")
print("="*100)

print("\n TOX21 UNCERTAINTY STATISTICS:")
tox21_avg_conf = np.mean(tox21_unc_df['avg_confidence'])
tox21_uncertain = sum([1 for f in tox21_unc_df['flag'] if f == 'Uncertain'])
print(f"   Average Confidence: {tox21_avg_conf:.4f}")
print(f"   Uncertain Molecules: {tox21_uncertain}/{len(tox21_unc_df)} ({100*tox21_uncertain/len(tox21_unc_df):.1f}%)")
print(f"   Confident Molecules: {len(tox21_unc_df)-tox21_uncertain}/{len(tox21_unc_df)} ({100*(len(tox21_unc_df)-tox21_uncertain)/len(tox21_unc_df):.1f}%)")

print("\n ESOL UNCERTAINTY STATISTICS:")
esol_avg_conf = np.mean(esol_unc_df['avg_confidence'])
esol_uncertain = sum([1 for f in esol_unc_df['flag'] if f == 'Uncertain'])
print(f"   Average Confidence: {esol_avg_conf:.4f}")
print(f"   Uncertain Molecules: {esol_uncertain}/{len(esol_unc_df)} ({100*esol_uncertain/len(esol_unc_df):.1f}%)")
print(f"   Confident Molecules: {len(esol_unc_df)-esol_uncertain}/{len(esol_unc_df)} ({100*(len(esol_unc_df)-esol_uncertain)/len(esol_unc_df):.1f}%)")

print("\n ChEMBL UNCERTAINTY STATISTICS:")
chembl_avg_conf = np.mean(chembl_unc_df['avg_confidence'])
chembl_uncertain = sum([1 for f in chembl_unc_df['flag'] if f == 'Uncertain'])
print(f"   Average Confidence: {chembl_avg_conf:.4f}")
print(f"   Uncertain Molecules: {chembl_uncertain}/{len(chembl_unc_df)} ({100*chembl_uncertain/len(chembl_unc_df):.1f}%)")
print(f"   Confident Molecules: {len(chembl_unc_df)-chembl_uncertain}/{len(chembl_unc_df)} ({100*(len(chembl_unc_df)-chembl_uncertain)/len(chembl_unc_df):.1f}%)")

# ============================================================================
# CONFIDENCE DISTRIBUTION
# ============================================================================
print("\n" + "="*100)
print(" CONFIDENCE DISTRIBUTION")
print("="*100)

print("\n  TOX21:")
print(f"   High Confidence (>0.8): {sum([1 for c in tox21_unc_df['avg_confidence'] if c > 0.8])}")
print(f"   Medium Confidence (0.6-0.8): {sum([1 for c in tox21_unc_df['avg_confidence'] if 0.6 <= c <= 0.8])}")
print(f"   Low Confidence (<0.6): {sum([1 for c in tox21_unc_df['avg_confidence'] if c < 0.6])}")

print("\n  ESOL:")
print(f"   High Confidence (>0.8): {sum([1 for c in esol_unc_df['avg_confidence'] if c > 0.8])}")
print(f"   Medium Confidence (0.6-0.8): {sum([1 for c in esol_unc_df['avg_confidence'] if 0.6 <= c <= 0.8])}")
print(f"   Low Confidence (<0.6): {sum([1 for c in esol_unc_df['avg_confidence'] if c < 0.6])}")

print("\n  ChEMBL:")
print(f"   High Confidence (>0.8): {sum([1 for c in chembl_unc_df['avg_confidence'] if c > 0.8])}")
print(f"   Medium Confidence (0.6-0.8): {sum([1 for c in chembl_unc_df['avg_confidence'] if 0.6 <= c <= 0.8])}")
print(f"   Low Confidence (<0.6): {sum([1 for c in chembl_unc_df['avg_confidence'] if c < 0.6])}")

# ============================================================================
# FINAL SUMMARY
# ============================================================================
print("\n" + "="*100)
print(" UNCERTAINTY QUANTIFICATION COMPLETE!")
print("="*100)

print("\n OUTPUT FILES:")
print("   1. ./results/uncertainty_tox21.csv")
print("   2. ./results/uncertainty_esol.csv")
print("   3. ./results/uncertainty_chembl.csv")

print("\n  WHAT EACH FILE CONTAINS:")
print("   - SMILES")
print("   - Confidence for each of 16 predictions (0-1)")
print("   - Average confidence (overall)")
print("   - Uncertain predictions count")
print("   - Flag: 'Uncertain' or 'Confident'")

print("\n" + "="*100 + "\n")

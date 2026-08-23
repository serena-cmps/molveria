import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import torch
import pandas as pd
import json
from rdkit import Chem
from rdkit.Chem import Descriptors, Crippen

from scripts.ensemble_predictor import predict_16_properties

print("\n" + "="*100)
print("📋 DRUG-LIKENESS REPORTS - ENSEMBLE PREDICTIONS + LIPINSKI ANALYSIS")
print("="*100)

# ============================================================================
# LIPINSKI FUNCTIONS
# ============================================================================
def calculate_lipinski(smiles):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    
    weight = Descriptors.MolWt(mol)
    logp = Crippen.MolLogP(mol)
    hbd = Descriptors.NumHDonors(mol)
    hba = Descriptors.NumHAcceptors(mol)

    return {'mol_weight': weight, 'logp': logp, 'h_donors': hbd, 'h_acceptors': hba}

def check_lipinski(properties):
    if properties is None:
        return None
    
    if properties['mol_weight'] <= 500 and properties['logp'] <= 5 and properties['h_donors'] <= 5 and properties['h_acceptors'] <= 10:
        return {'is_drug_like': 'Yes', **properties}
    
    return {'is_drug_like': 'No', **properties}

# ============================================================================
# LOAD DATASETS
# ============================================================================
print("\n Loading datasets...\n")

df_tox21 = pd.read_csv("dataset/tox21_combined.csv")
df_esol = pd.read_csv('dataset/ESOL.csv')
df_chembl = pd.read_csv('dataset/chembl_3targets.csv')

print(f"✓ Tox21: {len(df_tox21)} molecules")
print(f"✓ ESOL: {len(df_esol)} molecules")
print(f"✓ ChEMBL: {len(df_chembl)} molecules")

# ============================================================================
# PROPERTY NAMES
# ============================================================================
tox21_assays = [
    'tox_ahr', 'tox_ar', 'tox_are', 'tox_aromatase', 'tox_ar_lbd', 'tox_atad5',
    'tox_er', 'tox_er_lbd', 'tox_hse', 'tox_mmp', 'tox_p53', 'tox_ppar_gamma'
]

esol_property = 'sol_esol'

chembl_targets = [
    'act_prothrombin',
    'act_cannabinoid_receptor_1',
    'act_voltage_gated'
]

# ============================================================================
# GENERATE REPORTS FOR TOX21
# ============================================================================
print("\n" + "="*100)
print(" GENERATING REPORTS - TOX21 DATASET")
print("="*100)

tox21_reports = []
failed_count = 0

for idx, row in df_tox21.iterrows():
    smiles = row['smiles']
    
    try:
        # Get ensemble predictions
        predictions = predict_16_properties(smiles)
        
        if "error" in predictions:
            failed_count += 1
            continue
        
        # Get drug-likeness
        lipinski = calculate_lipinski(smiles)
        drug_like = check_lipinski(lipinski)
        
        # Combine into one report
        report = {
            'smiles': smiles,
            # Toxicity predictions (Tox21 - 12)
            'tox_ahr': predictions['tox21_assays']['ahr'],
            'tox_ar': predictions['tox21_assays']['ar'],
            'tox_are': predictions['tox21_assays']['are'],
            'tox_aromatase': predictions['tox21_assays']['aromatase'],
            'tox_ar_lbd': predictions['tox21_assays']['ar_lbd'],
            'tox_atad5': predictions['tox21_assays']['atad5'],
            'tox_er': predictions['tox21_assays']['er'],
            'tox_er_lbd': predictions['tox21_assays']['er_lbd'],
            'tox_hse': predictions['tox21_assays']['hse'],
            'tox_mmp': predictions['tox21_assays']['mmp'],
            'tox_p53': predictions['tox21_assays']['p53'],
            'tox_ppar_gamma': predictions['tox21_assays']['ppar_gamma'],
            # Solubility (ESOL - 1)
            'sol_esol': predictions['esol_solubility'],
            # Activity (ChEMBL - 3)
            'act_prothrombin': predictions['chembl_targets']['target_1_prothrombin'],
            'act_cannabinoid_receptor_1': predictions['chembl_targets']['target_2_cannabinoid_receptor_1'],
            'act_voltage_gated': predictions['chembl_targets']['target_3_voltage_gated'],
            # Drug-likeness
            'is_drug_like': drug_like['is_drug_like'],
            'mol_weight': drug_like['mol_weight'],
            'logp': drug_like['logp'],
            'h_donors': drug_like['h_donors'],
            'h_acceptors': drug_like['h_acceptors']
        }
        
        tox21_reports.append(report)
        
        if (idx + 1) % 100 == 0:
            print(f"   Processed {idx + 1}/{len(df_tox21)} molecules...")
    
    except Exception as e:
        failed_count += 1
        continue

print(f"\n Generated {len(tox21_reports)} reports (failed: {failed_count})")

# Save Tox21 reports
tox21_df = pd.DataFrame(tox21_reports)
tox21_df.to_csv('./results/drug_likeness_reports_tox21.csv', index=False)
print(f" Saved: ./results/drug_likeness_reports_tox21.csv")

# ============================================================================
# GENERATE REPORTS FOR ESOL
# ============================================================================
print("\n" + "="*100)
print(" GENERATING REPORTS - ESOL DATASET")
print("="*100)

esol_reports = []
failed_count = 0

for idx, row in df_esol.iterrows():
    smiles = row['smiles']
    
    try:
        # Get ensemble predictions
        predictions = predict_16_properties(smiles)
        
        if "error" in predictions:
            failed_count += 1
            continue
        
        # Get drug-likeness
        lipinski = calculate_lipinski(smiles)
        drug_like = check_lipinski(lipinski)
        
        # Combine into one report
        report = {
            'smiles': smiles,
            # Toxicity predictions (Tox21 - 12)
            'tox_ahr': predictions['tox21_assays']['ahr'],
            'tox_ar': predictions['tox21_assays']['ar'],
            'tox_are': predictions['tox21_assays']['are'],
            'tox_aromatase': predictions['tox21_assays']['aromatase'],
            'tox_ar_lbd': predictions['tox21_assays']['ar_lbd'],
            'tox_atad5': predictions['tox21_assays']['atad5'],
            'tox_er': predictions['tox21_assays']['er'],
            'tox_er_lbd': predictions['tox21_assays']['er_lbd'],
            'tox_hse': predictions['tox21_assays']['hse'],
            'tox_mmp': predictions['tox21_assays']['mmp'],
            'tox_p53': predictions['tox21_assays']['p53'],
            'tox_ppar_gamma': predictions['tox21_assays']['ppar_gamma'],
            # Solubility (ESOL - 1)
            'sol_esol': predictions['esol_solubility'],
            # Activity (ChEMBL - 3)
            'act_prothrombin': predictions['chembl_targets']['target_1_prothrombin'],
            'act_cannabinoid_receptor_1': predictions['chembl_targets']['target_2_cannabinoid_receptor_1'],
            'act_voltage_gated': predictions['chembl_targets']['target_3_voltage_gated'],
            # Drug-likeness
            'is_drug_like': drug_like['is_drug_like'],
            'mol_weight': drug_like['mol_weight'],
            'logp': drug_like['logp'],
            'h_donors': drug_like['h_donors'],
            'h_acceptors': drug_like['h_acceptors']
        }
        
        esol_reports.append(report)
        
        if (idx + 1) % 100 == 0:
            print(f"   Processed {idx + 1}/{len(df_esol)} molecules...")
    
    except Exception as e:
        failed_count += 1
        continue

print(f"\n✓ Generated {len(esol_reports)} reports (failed: {failed_count})")

# Save ESOL reports
esol_df = pd.DataFrame(esol_reports)
esol_df.to_csv('./results/drug_likeness_reports_esol.csv', index=False)
print(f"✓ Saved: ./results/drug_likeness_reports_esol.csv")

# ============================================================================
# GENERATE REPORTS FOR ChEMBL
# ============================================================================
print("\n" + "="*100)
print(" GENERATING REPORTS - ChEMBL DATASET")
print("="*100)

chembl_reports = []
failed_count = 0

for idx, row in df_chembl.iterrows():
    smiles = row['smiles']
    
    try:
        # Get ensemble predictions
        predictions = predict_16_properties(smiles)
        
        if "error" in predictions:
            failed_count += 1
            continue
        
        # Get drug-likeness
        lipinski = calculate_lipinski(smiles)
        drug_like = check_lipinski(lipinski)
        
        # Combine into one report
        report = {
            'smiles': smiles,
            # Toxicity predictions (Tox21 - 12)
            'tox_ahr': predictions['tox21_assays']['ahr'],
            'tox_ar': predictions['tox21_assays']['ar'],
            'tox_are': predictions['tox21_assays']['are'],
            'tox_aromatase': predictions['tox21_assays']['aromatase'],
            'tox_ar_lbd': predictions['tox21_assays']['ar_lbd'],
            'tox_atad5': predictions['tox21_assays']['atad5'],
            'tox_er': predictions['tox21_assays']['er'],
            'tox_er_lbd': predictions['tox21_assays']['er_lbd'],
            'tox_hse': predictions['tox21_assays']['hse'],
            'tox_mmp': predictions['tox21_assays']['mmp'],
            'tox_p53': predictions['tox21_assays']['p53'],
            'tox_ppar_gamma': predictions['tox21_assays']['ppar_gamma'],
            # Solubility (ESOL - 1)
            'sol_esol': predictions['esol_solubility'],
            # Activity (ChEMBL - 3)
            'act_prothrombin': predictions['chembl_targets']['target_1_prothrombin'],
            'act_cannabinoid_receptor_1': predictions['chembl_targets']['target_2_cannabinoid_receptor_1'],
            'act_voltage_gated': predictions['chembl_targets']['target_3_voltage_gated'],
            # Drug-likeness
            'is_drug_like': drug_like['is_drug_like'],
            'mol_weight': drug_like['mol_weight'],
            'logp': drug_like['logp'],
            'h_donors': drug_like['h_donors'],
            'h_acceptors': drug_like['h_acceptors']
        }
        
        chembl_reports.append(report)
        
        if (idx + 1) % 200 == 0:
            print(f"   Processed {idx + 1}/{len(df_chembl)} molecules...")
    
    except Exception as e:
        failed_count += 1
        continue

print(f"\n Generated {len(chembl_reports)} reports (failed: {failed_count})")

# Save ChEMBL reports
chembl_df = pd.DataFrame(chembl_reports)
chembl_df.to_csv('./results/drug_likeness_reports_chembl.csv', index=False)
print(f" Saved: ./results/drug_likeness_reports_chembl.csv")

# ============================================================================
# COMBINED SUMMARY
# ============================================================================
print("\n" + "="*100)
print(" REPORTS SUMMARY")
print("="*100)

print(f"\n Tox21 Reports: {len(tox21_reports)} molecules")
print(f" ESOL Reports: {len(esol_reports)} molecules")
print(f" ChEMBL Reports: {len(chembl_reports)} molecules")
print(f" TOTAL: {len(tox21_reports) + len(esol_reports) + len(chembl_reports)} molecules analyzed")

# Drug-likeness distribution
print(f"\n Drug-Likeness Distribution:")
if len(tox21_reports) > 0:
    drug_like_count = sum([1 for r in tox21_reports if r['is_drug_like'] == 'Yes'])
    print(f"   Tox21: {drug_like_count}/{len(tox21_reports)} drug-like ({100*drug_like_count/len(tox21_reports):.1f}%)")

if len(esol_reports) > 0:
    drug_like_count = sum([1 for r in esol_reports if r['is_drug_like'] == 'Yes'])
    print(f"   ESOL: {drug_like_count}/{len(esol_reports)} drug-like ({100*drug_like_count/len(esol_reports):.1f}%)")

if len(chembl_reports) > 0:
    drug_like_count = sum([1 for r in chembl_reports if r['is_drug_like'] == 'Yes'])
    print(f"   ChEMBL: {drug_like_count}/{len(chembl_reports)} drug-like ({100*drug_like_count/len(chembl_reports):.1f}%)")

print("\n" + "="*100)
print(" DRUG-LIKENESS REPORTS GENERATED SUCCESSFULLY!")
print("="*100)

print("\n OUTPUT FILES:")
print("   1. ./results/drug_likeness_reports_tox21.csv")
print("   2. ./results/drug_likeness_reports_esol.csv")
print("   3. ./results/drug_likeness_reports_chembl.csv")
print("\n")

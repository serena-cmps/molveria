import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import torch
import numpy as np
from torch_geometric.loader import DataLoader
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, auc, precision_recall_curve,
    mean_squared_error, mean_absolute_error, r2_score
)
import json

from utils.multitask_datasets import Tox21MultiTaskDataset, ESOLDataset, ChEMBLDataset
from models.multitask_gat_tox21 import Tox21MultiTaskGAT
from models.multitask_gat_esol import ESOLRegression
from models.multitask_gat_chembl import ChEMBLMultiTaskGAT

print("\n" + "="*80)
print(" ENSEMBLE EVALUATION - PER-PROPERTY METRICS")
print("="*80)

# Setup device
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"\nUsing device: {device}")

# ============================================================================
# LOAD TEST DATASETS
# ============================================================================
print("\n Loading test datasets...\n")

print("   Loading Tox21 test data...")
tox21_test = Tox21MultiTaskDataset(root='./data/tox21_phase2', split='test')
tox21_test_loader = DataLoader(tox21_test, batch_size=32, shuffle=False, num_workers=0)
print(f"    Tox21 test: {len(tox21_test)} molecules")

print("   Loading ESOL test data...")
esol_test = ESOLDataset(root='./data/esol', split='test')
esol_test_loader = DataLoader(esol_test, batch_size=32, shuffle=False, num_workers=0)
print(f"    ESOL test: {len(esol_test)} molecules")

print("   Loading ChEMBL test data...")
chembl_test = ChEMBLDataset(root='./data/chembl', split='test')
chembl_test_loader = DataLoader(chembl_test, batch_size=32, shuffle=False, num_workers=0)
print(f"    ChEMBL test: {len(chembl_test)} molecules")

# ============================================================================
# LOAD TRAINED MODELS
# ============================================================================
print("\n Loading trained models...\n")

print("   Loading Tox21 model...")
tox21_model = Tox21MultiTaskGAT(input_dim=8, hidden_dim=64, heads=4, dropout=0.0, num_tasks=12)
tox21_model.load_state_dict(torch.load('./results/best_tox21_multitask.pt', map_location=device))
tox21_model.to(device)
tox21_model.eval()
print("    Tox21 model loaded")

print("   Loading ESOL model...")
esol_model = ESOLRegression(input_dim=8, hidden_dim=64, heads=4, dropout=0.0)
esol_model.load_state_dict(torch.load('./results/best_esol.pt', map_location=device))
esol_model.to(device)
esol_model.eval()
print("    ESOL model loaded")

print("   Loading ChEMBL model...")
chembl_model = ChEMBLMultiTaskGAT(input_dim=8, hidden_dim=64, heads=4, dropout=0.0, num_tasks=3)
chembl_model.load_state_dict(torch.load('./results/best_chembl_multitask.pt', map_location=device))
chembl_model.to(device)
chembl_model.eval()
print("    ChEMBL model loaded")

# ============================================================================
# PROPERTY NAMES
# ============================================================================
tox21_assays = [
    'ahr', 'ar', 'are', 'aromatase', 'ar_lbd', 'atad5',
    'er', 'er_lbd', 'hse', 'mmp', 'p53', 'ppar_gamma'
]

chembl_targets = [
    'target_1_prothrombin',
    'target_2_cannabinoid_receptor_1',
    'target_3_voltage_gated'
]

# ============================================================================
# EVALUATE TOX21 (12 ASSAYS - BINARY CLASSIFICATION)
# ============================================================================
print("\n" + "="*80)
print(" EVALUATING TOX21 MODEL (12 Toxicity Assays)")
print("="*80)

tox21_predictions_all = []
tox21_labels_all = []

with torch.no_grad():
    for batch in tox21_test_loader:
        batch = batch.to(device)
        predictions = tox21_model(batch.x, batch.edge_index, batch.batch)
        tox21_predictions_all.append(predictions.cpu().numpy())
        tox21_labels_all.append(batch.y.cpu().numpy())

tox21_predictions = np.concatenate(tox21_predictions_all, axis=0)
tox21_labels = np.concatenate(tox21_labels_all, axis=0)

# Ensure 2D shape (12 columns for 12 assays)
if len(tox21_labels.shape) == 1:
    tox21_labels = tox21_labels.reshape(-1, 12)
if len(tox21_predictions.shape) == 1:
    tox21_predictions = tox21_predictions.reshape(-1, 12)

print(f"\nTest set size: {len(tox21_labels)} molecules")
print(f"Predictions shape: {tox21_predictions.shape}")

# Calculate metrics for each Tox21 assay
tox21_metrics = {}
print("\n Per-Assay Metrics:\n")
print(f"{'Assay':<20} | {'Accuracy':<10} | {'Precision':<10} | {'Recall':<10} | {'F1':<10} | {'AUC-ROC':<10} | {'PR-AUC':<10}")
print("-" * 100)

for i, assay in enumerate(tox21_assays):
    pred = tox21_predictions[:, i]
    true = tox21_labels[:, i]
    
    # Binary predictions (threshold 0.5)
    pred_binary = (pred > 0.5).astype(int)
    
    # Calculate metrics
    accuracy = accuracy_score(true, pred_binary)
    precision = precision_score(true, pred_binary, zero_division=0)
    recall = recall_score(true, pred_binary, zero_division=0)
    f1 = f1_score(true, pred_binary, zero_division=0)
    
    # AUC metrics
    try:
        auc_roc = roc_auc_score(true, pred)
    except:
        auc_roc = 0.0
    
    try:
        precision_curve, recall_curve, _ = precision_recall_curve(true, pred)
        auc_pr = auc(recall_curve, precision_curve)
    except:
        auc_pr = 0.0
    
    tox21_metrics[assay] = {
        'accuracy': float(accuracy),
        'precision': float(precision),
        'recall': float(recall),
        'f1': float(f1),
        'auc_roc': float(auc_roc),
        'auc_pr': float(auc_pr)
    }
    
    print(f"{assay:<20} | {accuracy:<10.4f} | {precision:<10.4f} | {recall:<10.4f} | {f1:<10.4f} | {auc_roc:<10.4f} | {auc_pr:<10.4f}")

# ============================================================================
# EVALUATE ESOL (SOLUBILITY - REGRESSION)
# ============================================================================
print("\n" + "="*80)
print(" EVALUATING ESOL MODEL (Solubility Prediction)")
print("="*80)

esol_predictions_all = []
esol_labels_all = []

with torch.no_grad():
    for batch in esol_test_loader:
        batch = batch.to(device)
        predictions = esol_model(batch.x, batch.edge_index, batch.batch)
        esol_predictions_all.append(predictions.cpu().numpy())
        esol_labels_all.append(batch.y.cpu().numpy())

esol_predictions = np.concatenate(esol_predictions_all, axis=0)
esol_labels = np.concatenate(esol_labels_all, axis=0)

# Ensure proper shape
if len(esol_predictions.shape) > 1:
    esol_predictions = esol_predictions.flatten()
if len(esol_labels.shape) > 1:
    esol_labels = esol_labels.flatten()

print(f"\nTest set size: {len(esol_labels)} molecules")

# Calculate regression metrics
mse = mean_squared_error(esol_labels, esol_predictions)
mae = mean_absolute_error(esol_labels, esol_predictions)
rmse = np.sqrt(mse)
r2 = r2_score(esol_labels, esol_predictions)

esol_metrics = {
    'esol_solubility': {
        'mse': float(mse),
        'rmse': float(rmse),
        'mae': float(mae),
        'r2': float(r2)
    }
}

print("\n Solubility Metrics:\n")
print(f"{'Metric':<20} | {'Value':<15}")
print("-" * 40)
print(f"{'MSE':<20} | {mse:<15.6f}")
print(f"{'RMSE':<20} | {rmse:<15.6f}")
print(f"{'MAE':<20} | {mae:<15.6f}")
print(f"{'R² Score':<20} | {r2:<15.6f}")

# ============================================================================
# EVALUATE ChEMBL (3 TARGETS - BINARY CLASSIFICATION)
# ============================================================================
print("\n" + "="*80)
print(" EVALUATING ChEMBL MODEL (3 Activity Targets)")
print("="*80)

chembl_predictions_all = []
chembl_labels_all = []

with torch.no_grad():
    for batch in chembl_test_loader:
        batch = batch.to(device)
        predictions = chembl_model(batch.x, batch.edge_index, batch.batch)
        chembl_predictions_all.append(predictions.cpu().numpy())
        chembl_labels_all.append(batch.y.cpu().numpy())

chembl_predictions = np.concatenate(chembl_predictions_all, axis=0)
chembl_labels = np.concatenate(chembl_labels_all, axis=0)

# Ensur# Ensure 2D shape (3 columns for 3 targets)
if len(chembl_labels.shape) == 1:
    chembl_labels = chembl_labels.reshape(-1, 3)
if len(chembl_predictions.shape) == 1:
    chembl_predictions = chembl_predictions.reshape(-1, 3)

print(f"\nTest set size: {len(chembl_labels)} molecules")
print(f"Predictions shape: {chembl_predictions.shape}")

# Calculate metrics for each ChEMBL target
chembl_metrics = {}
print("\n Per-Target Metrics:\n")
print(f"{'Target':<40} | {'Accuracy':<10} | {'Precision':<10} | {'Recall':<10} | {'F1':<10} | {'AUC-ROC':<10} | {'PR-AUC':<10}")
print("-" * 120)

for i, target in enumerate(chembl_targets):
    pred = chembl_predictions[:, i]
    true = chembl_labels[:, i]
    
    # Binary predictions (threshold 0.5)
    pred_binary = (pred > 0.5).astype(int)
    
    # Calculate metrics
    accuracy = accuracy_score(true, pred_binary)
    precision = precision_score(true, pred_binary, zero_division=0)
    recall = recall_score(true, pred_binary, zero_division=0)
    f1 = f1_score(true, pred_binary, zero_division=0)
    
    # AUC metrics
    try:
        auc_roc = roc_auc_score(true, pred)
    except:
        auc_roc = 0.0
    
    try:
        precision_curve, recall_curve, _ = precision_recall_curve(true, pred)
        auc_pr = auc(recall_curve, precision_curve)
    except:
        auc_pr = 0.0
    
    chembl_metrics[target] = {
        'accuracy': float(accuracy),
        'precision': float(precision),
        'recall': float(recall),
        'f1': float(f1),
        'auc_roc': float(auc_roc),
        'auc_pr': float(auc_pr)
    }
    
    print(f"{target:<40} | {accuracy:<10.4f} | {precision:<10.4f} | {recall:<10.4f} | {f1:<10.4f} | {auc_roc:<10.4f} | {auc_pr:<10.4f}")

# ============================================================================
# SAVE ALL RESULTS
# ============================================================================
print("\n" + "="*80)
print(" SAVING RESULTS")
print("="*80)

all_metrics = {
    'tox21': tox21_metrics,
    'esol': esol_metrics,
    'chembl': chembl_metrics
}

# Save to JSON
results_file = './results/ensemble_evaluation_metrics.json'
with open(results_file, 'w') as f:
    json.dump(all_metrics, f, indent=2)

print(f"\n Metrics saved to: {results_file}")

# ============================================================================
# SUMMARY STATISTICS
# ============================================================================
print("\n" + "="*80)
print(" SUMMARY STATISTICS")
print("="*80)

print("\n TOX21 (12 Assays) - Average Metrics:")
tox21_avg_acc = np.mean([m['accuracy'] for m in tox21_metrics.values()])
tox21_avg_f1 = np.mean([m['f1'] for m in tox21_metrics.values()])
tox21_avg_auc = np.mean([m['auc_roc'] for m in tox21_metrics.values()])
print(f"   Average Accuracy: {tox21_avg_acc:.4f}")
print(f"   Average F1 Score: {tox21_avg_f1:.4f}")
print(f"   Average AUC-ROC:  {tox21_avg_auc:.4f}")

print("\n  ESOL (1 Property) - Regression Metrics:")
print(f"   RMSE:  {esol_metrics['esol_solubility']['rmse']:.4f}")
print(f"   MAE:   {esol_metrics['esol_solubility']['mae']:.4f}")
print(f"   R²:    {esol_metrics['esol_solubility']['r2']:.4f}")

print("\n ChEMBL (3 Targets) - Average Metrics:")
chembl_avg_acc = np.mean([m['accuracy'] for m in chembl_metrics.values()])
chembl_avg_f1 = np.mean([m['f1'] for m in chembl_metrics.values()])
chembl_avg_auc = np.mean([m['auc_roc'] for m in chembl_metrics.values()])
print(f"   Average Accuracy: {chembl_avg_acc:.4f}")
print(f"   Average F1 Score: {chembl_avg_f1:.4f}")
print(f"   Average AUC-ROC:  {chembl_avg_auc:.4f}")

print("\n" + "="*80)
print(" EVALUATION COMPLETE!")
print("="*80 + "\n")
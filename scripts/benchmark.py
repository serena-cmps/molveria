import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import time
import torch
import numpy as np
from utils.smiles_to_graph import smiles_to_graph
from models.multitask_gat_tox21 import Tox21MultiTaskGAT
from models.multitask_gat_esol import ESOLRegression
from models.multitask_gat_chembl import ChEMBLMultiTaskGAT

print("\n" + "="*100)
print(" PHASE 2 PERFORMANCE BENCHMARK")
print("="*100)

# Detect device
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"\n Device: {device}")
if device.type == 'cuda':
    print(f"   GPU: {torch.cuda.get_device_name(0)}")
    print(f"   CUDA Available: Yes")
else:
    print(f"   GPU: Not available (using CPU)")

# Test molecules
test_smiles_1 = ["CCO"]
test_smiles_5 = ["CCO", "CC(O)=O", "c1ccccc1", "CCN", "CC(C)O"]
test_smiles_10 = ["CCO", "CC(O)=O", "c1ccccc1", "CCN", "CC(C)O", "c1ccc2ccccc2c1", "CN1CCC[C@H]1c1cccnc1", "CC(=O)Oc1ccccc1C(=O)O", "CN1C=NC2=C1C(=O)N(C(=O)N2C)C", "CC(C)Cc1ccc(cc1)C(C)C(=O)O"]

print("\n" + "="*100)
print(" STEP 1: LOAD MODELS")
print("="*100)

try:
    start_load = time.time()
    
    # Load Tox21
    print("\nLoading Tox21...")
    start = time.time()
    tox21 = Tox21MultiTaskGAT(input_dim=8, hidden_dim=64, heads=4, dropout=0.0, num_tasks=12)
    tox21.load_state_dict(torch.load('./results/best_tox21_multitask.pt', map_location=device))
    tox21.to(device).eval()
    tox21_time = time.time() - start
    print(f" Tox21 loaded in {tox21_time:.4f}s")
    
    # Load ESOL
    print("Loading ESOL...")
    start = time.time()
    esol = ESOLRegression(input_dim=8, hidden_dim=64, heads=4, dropout=0.0)
    esol.load_state_dict(torch.load('./results/best_esol.pt', map_location=device))
    esol.to(device).eval()
    esol_time = time.time() - start
    print(f" ESOL loaded in {esol_time:.4f}s")
    
    # Load ChEMBL
    print("Loading ChEMBL...")
    start = time.time()
    chembl = ChEMBLMultiTaskGAT(input_dim=8, hidden_dim=64, heads=4, dropout=0.0, num_tasks=3)
    chembl.load_state_dict(torch.load('./results/best_chembl_multitask.pt', map_location=device))
    chembl.to(device).eval()
    chembl_time = time.time() - start
    print(f"  ChEMBL loaded in {chembl_time:.4f}s")
    
    total_load_time = time.time() - start_load
    print(f"\n Total model loading time: {total_load_time:.4f}s")
    
except Exception as e:
    print(f" Error loading models: {str(e)}")
    exit(1)

print("\n" + "="*100)
print(" STEP 2: BENCHMARK SMILES CONVERSION")
print("="*100)

smiles_times = []
for idx, smiles in enumerate(test_smiles_5):
    start = time.time()
    graph = smiles_to_graph(smiles)
    elapsed = time.time() - start
    smiles_times.append(elapsed)
    print(f"  [{idx+1}/5] {smiles}: {elapsed:.4f}s")

avg_smiles_time = np.mean(smiles_times)
print(f"\n Average SMILES conversion: {avg_smiles_time:.4f}s")

print("\n" + "="*100)
print(" STEP 3: BENCHMARK PREDICTIONS (1 Molecule)")
print("="*100)

graph = smiles_to_graph(test_smiles_1[0])
graph = graph.to(device)

pred_times = {'tox21': [], 'esol': [], 'chembl': []}

for run in range(3):
    print(f"\nRun {run+1}:")
    
    with torch.no_grad():
        # Tox21
        start = time.time()
        tox_pred = tox21(graph.x, graph.edge_index, graph.batch)
        tox21_pred_time = time.time() - start
        pred_times['tox21'].append(tox21_pred_time)
        print(f"  Tox21: {tox21_pred_time:.4f}s")
        
        # ESOL
        start = time.time()
        esol_pred = esol(graph.x, graph.edge_index, graph.batch)
        esol_pred_time = time.time() - start
        pred_times['esol'].append(esol_pred_time)
        print(f"  ESOL: {esol_pred_time:.4f}s")
        
        # ChEMBL
        start = time.time()
        chembl_pred = chembl(graph.x, graph.edge_index, graph.batch)
        chembl_pred_time = time.time() - start
        pred_times['chembl'].append(chembl_pred_time)
        print(f"  ChEMBL: {chembl_pred_time:.4f}s")

avg_tox21 = np.mean(pred_times['tox21'])
avg_esol = np.mean(pred_times['esol'])
avg_chembl = np.mean(pred_times['chembl'])
avg_total_pred = avg_tox21 + avg_esol + avg_chembl

print(f"\n Average prediction times (1 molecule):")
print(f"   Tox21: {avg_tox21:.4f}s")
print(f"   ESOL: {avg_esol:.4f}s")
print(f"   ChEMBL: {avg_chembl:.4f}s")
print(f"   TOTAL: {avg_total_pred:.4f}s")

print("\n" + "="*100)
print(" STEP 4: BENCHMARK FULL WORKFLOW")
print("="*100)

def process_molecules(smiles_list, name):
    print(f"\n{name} ({len(smiles_list)} molecules):")
    
    start_total = time.time()
    
    for idx, smiles in enumerate(smiles_list):
        start_mol = time.time()
        
        # Convert SMILES
        graph = smiles_to_graph(smiles)
        if graph is None:
            print(f"  [{idx+1}] {smiles}: FAILED")
            continue
        
        graph = graph.to(device)
        
        # Predict
        with torch.no_grad():
            tox_pred = tox21(graph.x, graph.edge_index, graph.batch)
            esol_pred = esol(graph.x, graph.edge_index, graph.batch)
            chembl_pred = chembl(graph.x, graph.edge_index, graph.batch)
        
        mol_time = time.time() - start_mol
        print(f"  [{idx+1}] {smiles}: {mol_time:.4f}s")
    
    total_time = time.time() - start_total
    avg_per_mol = total_time / len(smiles_list)
    
    print(f"\n  Total time: {total_time:.4f}s")
    print(f"  Per molecule: {avg_per_mol:.4f}s")
    
    return total_time, avg_per_mol

time_1, per_mol_1 = process_molecules(test_smiles_1, "Batch 1 molecule")
time_5, per_mol_5 = process_molecules(test_smiles_5, "Batch 5 molecules")
time_10, per_mol_10 = process_molecules(test_smiles_10, "Batch 10 molecules")

print("\n" + "="*100)
print(" SUMMARY & BOTTLENECK ANALYSIS")
print("="*100)

print(f"\n TIMING BREAKDOWN:")
print(f"  Model loading: {total_load_time:.4f}s")
print(f"  Per molecule (SMILES + prediction): {per_mol_10:.4f}s")
print(f"    - SMILES conversion: {avg_smiles_time:.4f}s ({avg_smiles_time/per_mol_10*100:.1f}%)")
print(f"    - Predictions: {avg_total_pred:.4f}s ({avg_total_pred/per_mol_10*100:.1f}%)")

print(f"\n THROUGHPUT:")
print(f"  1 molecule: {per_mol_1:.4f}s/mol = {1/per_mol_1:.2f} mol/s")
print(f"  5 molecules: {per_mol_5:.4f}s/mol = {1/per_mol_5:.2f} mol/s")
print(f"  10 molecules: {per_mol_10:.4f}s/mol = {1/per_mol_10:.2f} mol/s")

slowest = max(
    ('Model loading', total_load_time),
    ('SMILES conversion', avg_smiles_time),
    ('Predictions', avg_total_pred),
    key=lambda x: x[1]
)

print(f"\n BOTTLENECK: {slowest[0]} ({slowest[1]:.4f}s)")

print(f"\n MEMORY USAGE:")
if device.type == 'cuda':
    print(f"  GPU Memory allocated: {torch.cuda.memory_allocated()/1024/1024:.2f} MB")
    print(f"  GPU Memory reserved: {torch.cuda.memory_reserved()/1024/1024:.2f} MB")
else:
    print(f"  (CPU mode - no GPU memory)")

print("\n" + "="*100)
print(" BENCHMARK COMPLETE!")
print("="*100 + "\n")
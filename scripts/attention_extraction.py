import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import torch
import numpy as np
import pandas as pd
from utils.smiles_to_graph import smiles_to_graph
from models.multitask_gat_tox21 import Tox21MultiTaskGAT
from models.multitask_gat_esol import ESOLRegression
from models.multitask_gat_chembl import ChEMBLMultiTaskGAT

print("\n" + "="*100)
print(" GRADIENT-BASED BOND IMPORTANCE - INTERPRETABILITY")
print("="*100)

# Load models
print("\n Loading models...\n")
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}\n")

tox21_model = Tox21MultiTaskGAT(input_dim=8, hidden_dim=64, heads=4, dropout=0.0, num_tasks=12)
tox21_model.load_state_dict(torch.load('./results/best_tox21_multitask.pt', map_location=device))
tox21_model.to(device)
tox21_model.eval()
print(" Tox21 model loaded")

esol_model = ESOLRegression(input_dim=8, hidden_dim=64, heads=4, dropout=0.0)
esol_model.load_state_dict(torch.load('./results/best_esol.pt', map_location=device))
esol_model.to(device)
esol_model.eval()
print(" ESOL model loaded")

chembl_model = ChEMBLMultiTaskGAT(input_dim=8, hidden_dim=64, heads=4, dropout=0.0, num_tasks=3)
chembl_model.load_state_dict(torch.load('./results/best_chembl_multitask.pt', map_location=device))
chembl_model.to(device)
chembl_model.eval()
print(" ChEMBL model loaded")

# Gradient-based importance function
def calculate_bond_importance(model, graph, device, task_idx=0):
    graph = graph.to(device)
    x = graph.x.clone().detach().requires_grad_(True)
    
    predictions = model(x, graph.edge_index, graph.batch)
    
    if predictions.dim() > 1:
        pred = predictions[0, task_idx]
    else:
        pred = predictions[0]
    
    pred.backward()
    
    node_importance = torch.abs(x.grad).sum(dim=1).detach().cpu().numpy()
    
    bond_importance = []
    for edge in graph.edge_index.t():
        src, dst = edge.cpu().numpy()
        importance = (node_importance[src] + node_importance[dst]) / 2
        bond_importance.append(importance)
    
    return np.array(bond_importance), node_importance

# Load datasets
df_tox21 = pd.read_csv('dataset/tox21_combined.csv')
df_esol = pd.read_csv('dataset/ESOL.csv')
df_chembl = pd.read_csv('dataset/chembl_3targets.csv')

results = []

# Process TOX21
print("\n PROCESSING TOX21 MOLECULES\n")
for idx, row in df_tox21.iterrows():
    smiles = row['smiles']
    
    if (idx + 1) % 500 == 0:
        print(f"Processed {idx + 1}/{len(df_tox21)}...")
    
    try:
        graph = smiles_to_graph(smiles)
        if graph is None:
            continue
        
        bond_imp_tox21, node_imp_tox21 = calculate_bond_importance(tox21_model, graph, device, task_idx=0)
        bond_imp_esol, node_imp_esol = calculate_bond_importance(esol_model, graph, device, task_idx=0)
        bond_imp_chembl, node_imp_chembl = calculate_bond_importance(chembl_model, graph, device, task_idx=0)
        
        result = {
            'smiles': smiles,
            'dataset': 'Tox21',
            'num_atoms': len(node_imp_tox21),
            'num_bonds': len(bond_imp_tox21),
            'tox21_avg_bond_importance': np.mean(bond_imp_tox21),
            'tox21_max_bond_importance': np.max(bond_imp_tox21),
            'esol_avg_bond_importance': np.mean(bond_imp_esol),
            'esol_max_bond_importance': np.max(bond_imp_esol),
            'chembl_avg_bond_importance': np.mean(bond_imp_chembl),
            'chembl_max_bond_importance': np.max(bond_imp_chembl)
        }
        results.append(result)
    
    except Exception as e:
        continue

# Process ESOL
print("\n PROCESSING ESOL MOLECULES\n")
for idx, row in df_esol.iterrows():
    smiles = row['smiles']
    
    if (idx + 1) % 200 == 0:
        print(f"Processed {idx + 1}/{len(df_esol)}...")
    
    try:
        graph = smiles_to_graph(smiles)
        if graph is None:
            continue
        
        bond_imp_tox21, node_imp_tox21 = calculate_bond_importance(tox21_model, graph, device, task_idx=0)
        bond_imp_esol, node_imp_esol = calculate_bond_importance(esol_model, graph, device, task_idx=0)
        bond_imp_chembl, node_imp_chembl = calculate_bond_importance(chembl_model, graph, device, task_idx=0)
        
        result = {
            'smiles': smiles,
            'dataset': 'ESOL',
            'num_atoms': len(node_imp_tox21),
            'num_bonds': len(bond_imp_tox21),
            'tox21_avg_bond_importance': np.mean(bond_imp_tox21),
            'tox21_max_bond_importance': np.max(bond_imp_tox21),
            'esol_avg_bond_importance': np.mean(bond_imp_esol),
            'esol_max_bond_importance': np.max(bond_imp_esol),
            'chembl_avg_bond_importance': np.mean(bond_imp_chembl),
            'chembl_max_bond_importance': np.max(bond_imp_chembl)
        }
        results.append(result)
    
    except Exception as e:
        continue

# Process ChEMBL
print("\n PROCESSING CHEMBL MOLECULES\n")
for idx, row in df_chembl.iterrows():
    smiles = row['smiles']
    
    if (idx + 1) % 2000 == 0:
        print(f"Processed {idx + 1}/{len(df_chembl)}...")
    
    try:
        graph = smiles_to_graph(smiles)
        if graph is None:
            continue
        
        bond_imp_tox21, node_imp_tox21 = calculate_bond_importance(tox21_model, graph, device, task_idx=0)
        bond_imp_esol, node_imp_esol = calculate_bond_importance(esol_model, graph, device, task_idx=0)
        bond_imp_chembl, node_imp_chembl = calculate_bond_importance(chembl_model, graph, device, task_idx=0)
        
        result = {
            'smiles': smiles,
            'dataset': 'ChEMBL',
            'num_atoms': len(node_imp_tox21),
            'num_bonds': len(bond_imp_tox21),
            'tox21_avg_bond_importance': np.mean(bond_imp_tox21),
            'tox21_max_bond_importance': np.max(bond_imp_tox21),
            'esol_avg_bond_importance': np.mean(bond_imp_esol),
            'esol_max_bond_importance': np.max(bond_imp_esol),
            'chembl_avg_bond_importance': np.mean(bond_imp_chembl),
            'chembl_max_bond_importance': np.max(bond_imp_chembl)
        }
        results.append(result)
    
    except Exception as e:
        continue

# Save results
print("\n" + "="*100)
print(" SAVING RESULTS")
print("="*100)

if len(results) > 0:
    results_df = pd.DataFrame(results)
    results_df.to_csv('./results/gradient_bond_importance.csv', index=False)
    print(f"\n✓ Saved: gradient_bond_importance.csv")
    print(f"✓ Processed {len(results)} molecules total")
    print(f"\nFirst few results:\n")
    print(results_df.head(10).to_string(index=False))

print("\n" + "="*100)
print(" ATTENTION VISUALIZATION COMPLETE!")
print("="*100 + "\n")
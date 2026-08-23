import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import torch
import numpy as np
import pandas as pd
from rdkit import Chem
from rdkit.Chem import AllChem, Descriptors
from utils.smiles_to_graph import smiles_to_graph
from models.multitask_gat_tox21 import Tox21MultiTaskGAT
from models.multitask_gat_esol import ESOLRegression
from models.multitask_gat_chembl import ChEMBLMultiTaskGAT

print("\n" + "="*100)
print(" SUBSTRUCTURE IMPORTANCE - FUNCTIONAL GROUP ANALYSIS")
print("="*100)

# Load models
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

tox21_model = Tox21MultiTaskGAT(input_dim=8, hidden_dim=64, heads=4, dropout=0.0, num_tasks=12)
tox21_model.load_state_dict(torch.load('./results/best_tox21_multitask.pt', map_location=device))
tox21_model.to(device)
tox21_model.eval()

esol_model = ESOLRegression(input_dim=8, hidden_dim=64, heads=4, dropout=0.0)
esol_model.load_state_dict(torch.load('./results/best_esol.pt', map_location=device))
esol_model.to(device)
esol_model.eval()

chembl_model = ChEMBLMultiTaskGAT(input_dim=8, hidden_dim=64, heads=4, dropout=0.0, num_tasks=3)
chembl_model.load_state_dict(torch.load('./results/best_chembl_multitask.pt', map_location=device))
chembl_model.to(device)
chembl_model.eval()

print(" Models loaded\n")

# Define functional groups
functional_groups = {
    'aromatic_ring': '[c]:[c]',
    'hydroxyl': '[OH]',
    'carboxyl': '[C](=O)[O]',
    'amine': '[N]',
    'carbonyl': '[C](=O)',
    'ether': '[O][C]',
    'nitro': '[N](=O)=O',
    'halogen': '[F,Cl,Br,I]',
    'thiol': '[S]',
    'sulfide': '[S][C]'
}

def identify_substructures(smiles):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return {}
    
    substructures = {}
    for name, smarts in functional_groups.items():
        pattern = Chem.MolFromSmarts(smarts)
        if pattern is not None:
            matches = mol.GetSubstructMatches(pattern)
            substructures[name] = len(matches)
    
    return substructures

def calculate_substructure_importance(model, graph, device, task_idx=0):
    graph = graph.to(device)
    x = graph.x.clone().detach().requires_grad_(True)
    
    predictions = model(x, graph.edge_index, graph.batch)
    
    if predictions.dim() > 1:
        pred = predictions[0, task_idx]
    else:
        pred = predictions[0]
    
    pred.backward()
    
    node_importance = torch.abs(x.grad).sum(dim=1).detach().cpu().numpy()
    
    return node_importance

# Test with 5 molecules
test_smiles = ["CCO", "CC(O)=O", "c1ccccc1", "CCN", "CC(C)O"]
results = []

print("="*100)
print(" ANALYZING SUBSTRUCTURES")
print("="*100)

for idx, smiles in enumerate(test_smiles):
    print(f"\n{idx+1}. {smiles}")
    
    try:
        # Identify substructures
        substructs = identify_substructures(smiles)
        
        # Get graph
        graph = smiles_to_graph(smiles)
        if graph is None:
            continue
        
        # Calculate importance
        node_imp_tox21 = calculate_substructure_importance(tox21_model, graph, device, 0)
        node_imp_esol = calculate_substructure_importance(esol_model, graph, device, 0)
        node_imp_chembl = calculate_substructure_importance(chembl_model, graph, device, 0)
        
        result = {
            'smiles': smiles,
            'aromatic_ring': substructs.get('aromatic_ring', 0),
            'hydroxyl': substructs.get('hydroxyl', 0),
            'carboxyl': substructs.get('carboxyl', 0),
            'amine': substructs.get('amine', 0),
            'carbonyl': substructs.get('carbonyl', 0),
            'ether': substructs.get('ether', 0),
            'nitro': substructs.get('nitro', 0),
            'halogen': substructs.get('halogen', 0),
            'tox21_avg_node_importance': np.mean(node_imp_tox21),
            'esol_avg_node_importance': np.mean(node_imp_esol),
            'chembl_avg_node_importance': np.mean(node_imp_chembl)
        }
        
        results.append(result)
        
        print(f"   Substructures: {substructs}")
        print(f"   Tox21 importance: {result['tox21_avg_node_importance']:.4f}")
        print(f"   ESOL importance: {result['esol_avg_node_importance']:.4f}")
        print(f"   ChEMBL importance: {result['chembl_avg_node_importance']:.4f}")
    
    except Exception as e:
        print(f"    Error: {str(e)}")
        continue

# Save results
print("\n" + "="*100)
print(" SAVING RESULTS")
print("="*100)

if len(results) > 0:
    results_df = pd.DataFrame(results)
    results_df.to_csv('./results/substructure_importance.csv', index=False)
    print(f"\n Saved: ./results/substructure_importance.csv")
    
    print("\n RESULTS:\n")
    print(results_df.to_string(index=False))

print("\n" + "="*100)
print(" SUBSTRUCTURE ANALYSIS COMPLETE!")
print("="*100)

print("\n OUTPUT FILES:")
print("   ./results/substructure_importance.csv")

print("\n INTERPRETATION:")
print("    Count = how many times this group appears")
print("    Importance = how much this affects prediction")
print("    Higher count + high importance = group drives prediction")

print("\n" + "="*100 + "\n")
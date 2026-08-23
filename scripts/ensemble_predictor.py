import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import torch
import numpy as np
from utils.smiles_to_graph import smiles_to_graph
from models.multitask_gat_tox21 import Tox21MultiTaskGAT
from models.multitask_gat_esol import ESOLRegression
from models.multitask_gat_chembl import ChEMBLMultiTaskGAT

print("\n" + "="*80)
print(" ENSEMBLE PREDICTOR - 16 PROPERTY PREDICTIONS")
print("="*80)

# Setup device
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"\nUsing device: {device}")

# ============================================================================
# LOAD ALL 3 MODELS
# ============================================================================
print("\n Loading trained models...\n")

# Load Tox21 model (12 toxicity assays)
print("   Loading Tox21 model (12 assays)...")
tox21_model = Tox21MultiTaskGAT(input_dim=8, hidden_dim=64, heads=4, dropout=0.0, num_tasks=12)
tox21_model.load_state_dict(torch.load('./results/best_tox21_multitask.pt', map_location=device))
tox21_model.to(device)
tox21_model.eval()
print("    Tox21 model loaded")

# Load ESOL model (1 solubility prediction)
print("   Loading ESOL model (1 property)...")
esol_model = ESOLRegression(input_dim=8, hidden_dim=64, heads=4, dropout=0.0)
esol_model.load_state_dict(torch.load('./results/best_esol.pt', map_location=device))
esol_model.to(device)
esol_model.eval()
print("    ESOL model loaded")

# Load ChEMBL model (3 activity targets)
print("   Loading ChEMBL model (3 targets)...")
chembl_model = ChEMBLMultiTaskGAT(input_dim=8, hidden_dim=64, heads=4, dropout=0.0, num_tasks=3)
chembl_model.load_state_dict(torch.load('./results/best_chembl_multitask.pt', map_location=device))
chembl_model.to(device)
chembl_model.eval()
print("    ChEMBL model loaded")

print("\n All 3 models loaded successfully!")

# ============================================================================
# DEFINE PROPERTY NAMES
# ============================================================================
tox21_assays = [
    'ahr', 'ar', 'are', 'aromatase', 'ar_lbd', 'atad5',
    'er', 'er_lbd', 'hse', 'mmp', 'p53', 'ppar_gamma'
]

esol_property = ['esol_solubility']

chembl_targets = [
    'target_1_prothrombin',
    'target_2_cannabinoid_receptor_1',
    'target_3_voltage_gated'
]

all_properties = tox21_assays + esol_property + chembl_targets

# ============================================================================
# ENSEMBLE PREDICTION FUNCTION
# ============================================================================
def predict_16_properties(smiles):
    """
    Take a SMILES string and predict all 16 properties using ensemble
    
    Args:
        smiles (str): SMILES notation of molecule (e.g., "CCO" for ethanol)
    
    Returns:
        dict: 16 predictions with property names and values
    """
    
    try:
        # Step 1: Convert SMILES to graph
        print(f"\n  Converting SMILES to graph: {smiles}")
        graph = smiles_to_graph(smiles)
        
        if graph is None:
            return {"error": "Failed to convert SMILES to graph"}
        
        # Create batch with single molecule
        batch = graph.clone()
        batch = batch.to(device)
        batch.batch = torch.zeros(batch.x.shape[0], dtype=torch.long, device=device)
        
        print("    Graph created successfully")
        
        # Step 2: Run through Tox21 model (12 predictions)
        print("\n  Running Tox21 model (12 toxicity assays)...")
        with torch.no_grad():
            tox21_predictions = tox21_model(batch.x, batch.edge_index, batch.batch)
            tox21_predictions = tox21_predictions.cpu().numpy()[0]  # Get first (only) molecule
        print("    Tox21 predictions:")
        for assay, pred in zip(tox21_assays, tox21_predictions):
            print(f"      {assay}: {pred:.4f}")
        
        # Step 3: Run through ESOL model (1 prediction)
        print("\n  Running ESOL model (1 solubility)...")
        with torch.no_grad():
            esol_prediction = esol_model(batch.x, batch.edge_index, batch.batch)
            esol_prediction = esol_prediction.cpu().numpy()[0][0]  # Get scalar value
        print(f"    ESOL solubility: {esol_prediction:.4f}")
        
        # Step 4: Run through ChEMBL model (3 predictions)
        print("\n  Running ChEMBL model (3 activity targets)...")
        with torch.no_grad():
            chembl_predictions = chembl_model(batch.x, batch.edge_index, batch.batch)
            chembl_predictions = chembl_predictions.cpu().numpy()[0]  # Get first (only) molecule
        print("    ChEMBL predictions:")
        for target, pred in zip(chembl_targets, chembl_predictions):
            print(f"      {target}: {pred:.4f}")
        
        # Step 5: Combine all 16 predictions
        print("\n Combining all predictions...")
        all_predictions = np.concatenate([
            tox21_predictions,
            [esol_prediction],
            chembl_predictions
        ])
        
        # Create result dictionary
        results = {
            "smiles": smiles,
            "tox21_assays": dict(zip(tox21_assays, tox21_predictions.tolist())),
            "esol_solubility": float(esol_prediction),
            "chembl_targets": dict(zip(chembl_targets, chembl_predictions.tolist())),
            "all_16_predictions": dict(zip(all_properties, all_predictions.tolist()))
        }
        
        return results
    
    except Exception as e:
        return {"error": str(e)}

# ============================================================================
# EXAMPLE USAGE
# ============================================================================
if __name__ == "__main__":
    # Test molecules
    test_smiles = [
        "CC(O)=O",  # Acetic acid
        "CCO",  # Ethanol
        "c1ccccc1",  # Benzene
    ]
    
    print("\n" + "="*80)
    print(" TESTING ENSEMBLE WITH EXAMPLE MOLECULES")
    print("="*80)
    
    for smiles in test_smiles:
        print("\n" + "-"*80)
        results = predict_16_properties(smiles)
        
        if "error" in results:
            print(f" Error: {results['error']}")
        else:
            print("\n" + "="*80)
            print("FINAL RESULTS - 16 PROPERTY PREDICTIONS")
            print("="*80)
            print(f"\nMolecule: {results['smiles']}")
            
            print("\n TOXICITY (Tox21 - 12 assays):")
            for assay, value in results['tox21_assays'].items():
                print(f"   {assay:20s}: {value:.4f}")
            
            print("\n SOLUBILITY (ESOL):")
            print(f"   Log solubility: {results['esol_solubility']:.4f}")
            
            print("\n ACTIVITY (ChEMBL - 3 targets):")
            for target, value in results['chembl_targets'].items():
                print(f"   {target:30s}: {value:.4f}")
            
            print("\n" + "="*80)
            print(" PREDICTION COMPLETE!")
            print("="*80 + "\n")
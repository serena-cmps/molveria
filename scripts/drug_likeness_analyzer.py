from rdkit import Chem
from rdkit.Chem import Descriptors, Crippen
import pandas as pd

#load datasets
df  = pd.read_csv("dataset/tox21_combined.csv")
df1 = pd.read_csv('dataset/ESOL.csv')
df2 = pd.read_csv('dataset/chembl_3targets.csv')

#extract smiles
smiles_tox21 = df['smiles']
smiles_esol = df1['smiles']
smiles_chembl = df2['smiles']

#calculate lipinski property\ies
def calculate_lipinski(smiles):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    
    weight = Descriptors.MolWt(mol)
    logp = Crippen.MolLogP(mol)
    hbd = Descriptors.NumHDonors(mol)
    hba = Descriptors.NumHAcceptors(mol)

    return {'mol weight': weight, 'logp':logp, 'hydrogen donors': hbd, 'hydrogen acceptors' : hba }

def check_lipinski(properties):
    if properties is None:
        return None
    
    if properties['mol weight'] <= 500 and properties['logp'] <= 5 and properties['hydrogen donors'] <= 5 and properties['hydrogen acceptors'] <= 10:
        return {'is_drug_like': 'Yes', **properties}
    
    return {'is_drug_like': 'No', **properties}

#test

# Process Tox21
print("Processing Tox21...")
results_tox21 = []
for smiles in smiles_tox21:
    lipinski = calculate_lipinski(smiles)
    report = check_lipinski(lipinski)
    results_tox21.append(report)

results_df_tox21 = pd.DataFrame(results_tox21)
results_df_tox21.to_csv('./results/drug_likeness_tox21.csv', index=False)
print(f"✓ Tox21 done! Saved to drug_likeness_tox21.csv")

# Process ESOL
print("Processing ESOL...")
results_esol = []
for smiles in smiles_esol:
    lipinski = calculate_lipinski(smiles)
    report = check_lipinski(lipinski)
    results_esol.append(report)

results_df_esol = pd.DataFrame(results_esol)
results_df_esol.to_csv('./results/drug_likeness_esol.csv', index=False)
print(f"✓ ESOL done! Saved to drug_likeness_esol.csv")

# Process ChEMBL
print("Processing ChEMBL...")
results_chembl = []
for smiles in smiles_chembl:
    lipinski = calculate_lipinski(smiles)
    report = check_lipinski(lipinski)
    results_chembl.append(report)

results_df_chembl = pd.DataFrame(results_chembl)
results_df_chembl.to_csv('./results/drug_likeness_chembl.csv', index=False)
print(f"✓ ChEMBL done! Saved to drug_likeness_chembl.csv")

print("\n All datasets processed!")
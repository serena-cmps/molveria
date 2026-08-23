import random  #this is needed to shuffle scaffolds
from rdkit import Chem
from rdkit.Chem.Scaffolds import MurckoScaffold  #This is the tool that extracts molecular scaffolds

def get_scaffold(smiles):
    try:
        return MurckoScaffold.MurckoScaffoldSmilesFromSmiles(smiles) #Extract the scaffold from the SMILES
    except:
        return None


def scaffold_split(smiles_list, data_list, frac_train=0.7, frac_valid=0.15, seed=42):
    """Split molecules by scaffold to keep similar structures together"""
    random.seed(seed)
    
    # Group molecules by their scaffold
    scaffolds = {}
    for smiles, data in zip(smiles_list, data_list):
        scaf = get_scaffold(smiles)
        if scaf is None:
            continue
        if scaf not in scaffolds:
            scaffolds[scaf] = []
        scaffolds[scaf].append(data)
    
    # Split scaffolds randomly
    scaffold_list = list(scaffolds.keys())
    random.shuffle(scaffold_list)
    
    n = len(scaffold_list)
    train_idx = int(frac_train * n)
    val_idx = train_idx + int(frac_valid * n)
    
    # Collect data for each split
    train = []
    val = []
    test = []
    
    for i, scaf in enumerate(scaffold_list):
        if i < train_idx:
            train.extend(scaffolds[scaf])
        elif i < val_idx:
            val.extend(scaffolds[scaf])
        else:
            test.extend(scaffolds[scaf])
    
    print(f"Train: {len(train)} | Val: {len(val)} | Test: {len(test)}")
    return train, val, test
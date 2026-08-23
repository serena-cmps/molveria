import numpy as np
import torch
from torch_geometric.data import Data
from rdkit import Chem

def get_atom_features(atom):
    atomic_nb = atom.GetAtomicNum()
    hydrogen_num = atom.GetTotalNumHs()
    charge = atom.GetFormalCharge()
    degree = atom.GetDegree()
    aromatic = int(atom.GetIsAromatic())
    hybridization = atom.GetHybridization()
    ring = int(atom.IsInRing())
    valence = atom.GetTotalValence()
    
    return [atomic_nb, hydrogen_num, charge, degree, aromatic, hybridization, ring, valence]

def get_bond_features(bond):
    bond_type = int(bond.GetBondType())
    aromatic = int(bond.GetIsAromatic())
    ring = int(bond.IsInRing())
    conjugated = int(bond.GetIsConjugated())
    
    return [bond_type, aromatic, ring, conjugated]

def get_bond_edges(bond):
    atom1 = bond.GetBeginAtomIdx()
    atom2 = bond.GetEndAtomIdx()
    
    return [atom1, atom2]

def smiles_to_graph(smiles):
    
    # Edge case 1: Invalid SMILES
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise ValueError(f"Invalid SMILES: {smiles}")
    
    # Edge case 2: Empty molecule
    if mol.GetNumAtoms() == 0:
        raise ValueError(f"Molecule has no atoms: {smiles}")
    
    # STEP 1: Get atom features
    x_list = []
    for atom in mol.GetAtoms():
        features = get_atom_features(atom)
        x_list.append(features)
    
    # STEP 2: Get bond info
    edge_index_list = []
    edge_attr_list = []
    for bond in mol.GetBonds():
        edge = get_bond_edges(bond)
        edge_attr = get_bond_features(bond)
        
        # Add both directions (bonds are undirected)
        edge_index_list.append(edge)
        edge_index_list.append([edge[1], edge[0]])
        edge_attr_list.append(edge_attr)
        edge_attr_list.append(edge_attr)
    
    # STEP 3: Convert to tensors
    x = torch.tensor(x_list, dtype=torch.float32)
    
    # Edge case 3: Handle molecules with no bonds (isolated atoms)
    if len(edge_index_list) > 0:
        edge_index = torch.tensor(edge_index_list, dtype=torch.long).t().contiguous()
        edge_attr = torch.tensor(edge_attr_list, dtype=torch.float32)
    else:
        # Single atom or disconnected atoms - no bonds
        edge_index = torch.zeros((2, 0), dtype=torch.long)
        edge_attr = torch.zeros((0, 4), dtype=torch.float32)
    
    # STEP 4: Create Data object
    data = Data(x=x, edge_index=edge_index, edge_attr=edge_attr)
    
    return data
 


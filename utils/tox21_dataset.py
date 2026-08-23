import torch
import pandas as pd
import os
from torch_geometric.data import Dataset, Data
from torch_geometric.nn import global_mean_pool
from .smiles_to_graph import smiles_to_graph

class Tox21Dataset(Dataset):
    def __init__(self, root, split='train'):
        self.split = split
        super().__init__(root)
        self.data_list = torch.load(
            os.path.join(self.processed_dir, f'{split}_data.pt'),
            weights_only=False
        )

    @property
    def raw_file_names(self):
        return ['tox21_smiles.csv']

    @property
    def processed_file_names(self):
        return ['train_data.pt', 'val_data.pt', 'test_data.pt']

    def download(self):
        """Load real Tox21 CSV"""
        print("Loading real Tox21 data...")
        
        import shutil
        import os
        
        # Get project root (parent of data folder)
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # Get full path to combined CSV in project root
        csv_path = os.path.join(project_root, 'tox21_combined.csv')
        output_path = os.path.join(self.raw_dir, 'tox21_smiles.csv')
        
        if os.path.exists(csv_path):
            shutil.copy(csv_path, output_path)
            print(f" Copied {csv_path}")
        else:
            print(f" File not found: {csv_path}")
            raise FileNotFoundError(f"tox21_combined.csv not found in {project_root}")

    def process(self):
        """Convert SMILES to graphs with RANDOM SPLITTING"""
        print("Processing molecules...")
        
        df = pd.read_csv(os.path.join(self.raw_dir, 'tox21_smiles.csv'))
        
        # Print column names to debug
        print(f"CSV columns: {list(df.columns)}")
        
        data_list = []
        smiles_list = []
        
        for idx, row in df.iterrows():
            try:
                data = smiles_to_graph(row['smiles'])  # lowercase
                data.y = torch.tensor([row['activity']], dtype=torch.float)
                data_list.append(data)
                smiles_list.append(row['smiles'])
            except Exception as e:
                print(f" Failed on {row['smiles']}: {e}")
                continue
        
        print(f"Successfully converted: {len(data_list)}/{len(df)}")
        
        # RANDOM SPLIT
        import random
        random.seed(42)
        random.shuffle(data_list)
        
        n = len(data_list)
        train_size = int(0.7 * n)
        val_size = int(0.15 * n)
        
        train_data = data_list[:train_size]
        val_data = data_list[train_size:train_size + val_size]
        test_data = data_list[train_size + val_size:]
        
        os.makedirs(self.processed_dir, exist_ok=True)
        torch.save(train_data, os.path.join(self.processed_dir, 'train_data.pt'))
        torch.save(val_data, os.path.join(self.processed_dir, 'val_data.pt'))
        torch.save(test_data, os.path.join(self.processed_dir, 'test_data.pt'))
        
        print(f"Train: {len(train_data)} | Val: {len(val_data)} | Test: {len(test_data)}")
        print(f" Splits saved to {self.processed_dir}")

    def __len__(self):
        return len(self.data_list)

    def __getitem__(self, idx):
        return self.data_list[idx]
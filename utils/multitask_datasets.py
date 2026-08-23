import torch
import pandas as pd
import os
from torch_geometric.data import Dataset, Data
from torch_geometric.nn import global_mean_pool
from .smiles_to_graph import smiles_to_graph

class Tox21MultiTaskDataset(Dataset):
    def __init__(self, root, split='train'):
        self.split = split
        super().__init__(root)
        self.data_list = torch.load(
            os.path.join(self.processed_dir, f'{split}_data.pt'),
            weights_only=False
        )

    @property
    def raw_file_names(self):
        return ['tox21_combined.csv']

    @property
    def processed_file_names(self):
        return ['train_data.pt', 'val_data.pt', 'test_data.pt']

    def download(self):
        import shutil
        shutil.copy('dataset/tox21_combined.csv', 
                    os.path.join(self.raw_dir, 'tox21_combined.csv'))

    def process(self):
        print("Processing Tox21 molecules...")
        df = pd.read_csv(os.path.join(self.raw_dir, 'tox21_combined.csv'))
        data_list = []
        
        for idx, row in df.iterrows():
            try:
                data = smiles_to_graph(row['smiles'])
                # 12 toxicity labels
                labels = torch.tensor([row['ahr'], row['ar'], row['are'], row['aromatase'],
                                     row['ar_lbd'], row['atad5'], row['er'], row['er_lbd'],
                                     row['hse'], row['mmp'], row['p53'], row['ppar_gamma']],
                                     dtype=torch.float)
                data.y = labels
                data_list.append(data)
            except Exception as e:
                print(f" Failed on {row['smiles']}: {e}")
                continue
        
        print(f"Successfully converted: {len(data_list)}/{len(df)}")
        
        # Random split
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

    def __len__(self):
        return len(self.data_list)

    def __getitem__(self, idx):
        return self.data_list[idx]


class ESOLDataset(Dataset):
    def __init__(self, root, split='train'):
        self.split = split
        super().__init__(root)
        self.data_list = torch.load(
            os.path.join(self.processed_dir, f'{split}_data.pt'),
            weights_only=False
        )

    @property
    def raw_file_names(self):
        return ['ESOL.csv']

    @property
    def processed_file_names(self):
        return ['train_data.pt', 'val_data.pt', 'test_data.pt']

    def download(self):
        import shutil
        shutil.copy('dataset/ESOL.csv', 
                    os.path.join(self.raw_dir, 'ESOL.csv'))

    def process(self):
        print("Processing ESOL molecules...")
        df = pd.read_csv(os.path.join(self.raw_dir, 'ESOL.csv'))
        data_list = []
        
        for idx, row in df.iterrows():
            try:
                data = smiles_to_graph(row['smiles'])
                # 1 solubility label (regression - continuous value)
                data.y = torch.tensor([row['measured log solubility in mols per litre']], 
                                     dtype=torch.float)
                data_list.append(data)
            except Exception as e:
                print(f" Failed on {row['smiles']}: {e}")
                continue
        
        print(f"Successfully converted: {len(data_list)}/{len(df)}")
        
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

    def __len__(self):
        return len(self.data_list)

    def __getitem__(self, idx):
        return self.data_list[idx]


class ChEMBLDataset(Dataset):
    def __init__(self, root, split='train'):
        self.split = split
        super().__init__(root)
        self.data_list = torch.load(
            os.path.join(self.processed_dir, f'{split}_data.pt'),
            weights_only=False
        )

    @property
    def raw_file_names(self):
        return ['chembl_3targets.csv']

    @property
    def processed_file_names(self):
        return ['train_data.pt', 'val_data.pt', 'test_data.pt']

    def download(self):
        import shutil
        shutil.copy('dataset/chembl_3targets.csv', 
                    os.path.join(self.raw_dir, 'chembl_3targets.csv'))

    def process(self):
        print("Processing ChEMBL molecules...")
        df = pd.read_csv(os.path.join(self.raw_dir, 'chembl_3targets.csv'))
        data_list = []
        
        for idx, row in df.iterrows():
            try:
                data = smiles_to_graph(row['smiles'])
                # 3 activity labels
                labels = torch.tensor([row['target_1_Prothrombin'], 
                                     row['target_2_Cannabinoid receptor 1'],
                                     row['target_3_Voltage-gated inwardly rectify']],
                                     dtype=torch.float)
                data.y = labels
                data_list.append(data)
            except Exception as e:
                print(f" Failed on {row['smiles']}: {e}")
                continue
        
        print(f"Successfully converted: {len(data_list)}/{len(df)}")
        
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

    def __len__(self):
        return len(self.data_list)

    def __getitem__(self, idx):
        return self.data_list[idx]
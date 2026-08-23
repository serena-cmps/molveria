import torch
import torch.nn as nn
from torch_geometric.nn import GATConv, global_mean_pool

class Tox21MultiTaskGAT(nn.Module):
    def __init__(self, input_dim=8, hidden_dim=64, heads=4, dropout=0.0, num_tasks=12):
        super().__init__()
        
        self.num_tasks = num_tasks
        
        # Graph Attention layers
        self.conv1 = GATConv(input_dim, hidden_dim, heads=heads, dropout=dropout)
        self.conv2 = GATConv(hidden_dim * heads, hidden_dim, heads=heads, dropout=dropout)
        
        # Size after GAT layers
        gat_output_size = hidden_dim * heads
        
        # Task 1: AhR
        self.head_ahr = nn.Sequential(
            nn.Linear(gat_output_size, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )
        
        # Task 2: AR
        self.head_ar = nn.Sequential(
            nn.Linear(gat_output_size, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )
        
        # Task 3: ARE
        self.head_are = nn.Sequential(
            nn.Linear(gat_output_size, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )
        
        # Task 4: Aromatase
        self.head_aromatase = nn.Sequential(
            nn.Linear(gat_output_size, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )
        
        # Task 5: AR_LBD
        self.head_ar_lbd = nn.Sequential(
            nn.Linear(gat_output_size, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )
        
        # Task 6: ATAD5
        self.head_atad5 = nn.Sequential(
            nn.Linear(gat_output_size, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )
        
        # Task 7: ER
        self.head_er = nn.Sequential(
            nn.Linear(gat_output_size, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )
        
        # Task 8: ER_LBD
        self.head_er_lbd = nn.Sequential(
            nn.Linear(gat_output_size, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )
        
        # Task 9: HSE
        self.head_hse = nn.Sequential(
            nn.Linear(gat_output_size, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )
        
        # Task 10: MMP
        self.head_mmp = nn.Sequential(
            nn.Linear(gat_output_size, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )
        
        # Task 11: p53
        self.head_p53 = nn.Sequential(
            nn.Linear(gat_output_size, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )
        
        # Task 12: PPAR_GAMMA
        self.head_ppar_gamma = nn.Sequential(
            nn.Linear(gat_output_size, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )
    
    def forward(self, x, edge_index, batch):
        # First GAT layer
        x = self.conv1(x, edge_index)
        x = torch.relu(x)
        
        # Second GAT layer
        x = self.conv2(x, edge_index)
        x = torch.relu(x)
        
        # Pool all atoms for each molecule
        x = global_mean_pool(x, batch)
        
        # Get prediction from each task head
        out_ahr = self.head_ahr(x)
        out_ar = self.head_ar(x)
        out_are = self.head_are(x)
        out_aromatase = self.head_aromatase(x)
        out_ar_lbd = self.head_ar_lbd(x)
        out_atad5 = self.head_atad5(x)
        out_er = self.head_er(x)
        out_er_lbd = self.head_er_lbd(x)
        out_hse = self.head_hse(x)
        out_mmp = self.head_mmp(x)
        out_p53 = self.head_p53(x)
        out_ppar_gamma = self.head_ppar_gamma(x)
        
        # Combine all 12 predictions
        output = torch.cat([
            out_ahr, out_ar, out_are, out_aromatase,
            out_ar_lbd, out_atad5, out_er, out_er_lbd,
            out_hse, out_mmp, out_p53, out_ppar_gamma
        ], dim=1)
        
        return output
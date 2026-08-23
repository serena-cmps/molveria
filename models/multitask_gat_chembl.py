import torch
import torch.nn as nn
from torch_geometric.nn import GATConv, global_mean_pool

class ChEMBLMultiTaskGAT(nn.Module):
    def __init__(self, input_dim=8, hidden_dim=64, heads=4, dropout=0.0, num_tasks=3):
        super().__init__()
        
        self.num_tasks = num_tasks
        
        # Graph Attention layers
        self.conv1 = GATConv(input_dim, hidden_dim, heads=heads, dropout=dropout)
        self.conv2 = GATConv(hidden_dim * heads, hidden_dim, heads=heads, dropout=dropout)
        
        # Size after GAT layers
        gat_output_size = hidden_dim * heads
        
        # Task 1: Prothrombin
        self.head_prothrombin = nn.Sequential(
            nn.Linear(gat_output_size, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )
        
        # Task 2: Cannabinoid receptor 1
        self.head_cannabinoid = nn.Sequential(
            nn.Linear(gat_output_size, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )
        
        # Task 3: Voltage-gated inwardly rectifier
        self.head_voltage_gated = nn.Sequential(
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
        out_prothrombin = self.head_prothrombin(x)
        out_cannabinoid = self.head_cannabinoid(x)
        out_voltage_gated = self.head_voltage_gated(x)
        
        # Combine all 3 predictions
        output = torch.cat([
            out_prothrombin, out_cannabinoid, out_voltage_gated
        ], dim=1)
        
        return output
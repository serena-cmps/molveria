import torch
import torch.nn as nn
from torch_geometric.nn import GATConv, global_mean_pool

class ESOLRegression(nn.Module):
    def __init__(self, input_dim=8, hidden_dim=64, heads=4, dropout=0.0):
        super().__init__()

        # Graph Attention layers
        self.conv1 = GATConv(input_dim, hidden_dim, heads=heads, dropout=dropout)
        self.conv2 = GATConv(hidden_dim * heads, hidden_dim, heads=heads, dropout=dropout)
        
        # Size after GAT layers
        gat_output_size = hidden_dim * heads
        
        # Regression head for solubility (1 continuous output)
        # NO SIGMOID because we're predicting continuous values (log solubility)
        # Sigmoid would squash output to 0-1, but solubility can be negative or positive!
        self.solubility_head = nn.Sequential(
            nn.Linear(gat_output_size, 32),  # 256 → 32
            nn.ReLU(),                        # Activation
            nn.Linear(32, 1)                  # 32 → 1 (solubility value)
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
        
        # Get solubility prediction
        solubility_output = self.solubility_head(x)
        
        return solubility_output
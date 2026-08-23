from torch_geometric.nn import GATConv
import torch
import torch.nn as nn
from torch_geometric.nn import global_mean_pool

class GAT(nn.Module):
    def __init__(self, input_dim, hidden_dim, heads=8, dropout=0.0, num_layers=2):
        super().__init__()
        
        # Create layers dynamically
        self.layers = nn.ModuleList()
        
        # First layer: input_dim → hidden_dim
        self.layers.append(GATConv(input_dim, hidden_dim, heads=heads))
        
        # Remaining layers: hidden_dim * heads → hidden_dim
        for i in range(num_layers - 1):
            self.layers.append(GATConv(hidden_dim * heads, hidden_dim, heads=heads))
        
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_dim * heads, 1)
        self.sigmoid = nn.Sigmoid()
    
    def forward(self, x, edge_index, batch):
        # Pass through all layers
        for layer in self.layers:
            x = layer(x, edge_index)
            x = self.relu(x)
            x = self.dropout(x)
        
        x = global_mean_pool(x, batch)
        x = self.fc(x)
        return self.sigmoid(x)
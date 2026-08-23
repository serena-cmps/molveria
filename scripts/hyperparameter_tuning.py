import sys
import os

# Add parent directory to path so imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import torch
import torch.nn as nn
from torch.optim import Adam
from torch_geometric.loader import DataLoader
import pandas as pd
import shutil
from itertools import product

from utils.tox21_dataset import Tox21Dataset
from utils.utils import validate, test
from models.model_gat import GAT

# Clear cache
if os.path.exists('./data/tox21/processed'):
    shutil.rmtree('./data/tox21/processed')
    print("Cleared cache, regenerating dataset...")

# Load datasets
print("\n Loading datasets...")
train_dataset = Tox21Dataset(root='./data/tox21', split='train')
val_dataset = Tox21Dataset(root='./data/tox21', split='val')
test_dataset = Tox21Dataset(root='./data/tox21', split='test')

# Get feature dimension
sample = train_dataset[0]
input_dim = sample.x.shape[1]
print(f"Feature dimension: {input_dim}")

# Create dataloaders
train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True, num_workers=0)
val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False, num_workers=0)
test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False, num_workers=0)

# Setup device
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}\n")

# Define parameter grid
learning_rates = [0.0001, 0.001, 0.01]
hidden_dims = [32, 64, 128]
dropouts = [0.0, 0.3, 0.5]
num_layers_list = [2, 3, 4]

# Create all combinations
combinations = list(product(learning_rates, hidden_dims, dropouts, num_layers_list))
print(f"Total combinations to test: {len(combinations)}\n")

# Store results
results = []

print("=" * 80)
print(" STARTING HYPERPARAMETER TUNING")
print("=" * 80)

# Main training loop
for idx, (lr, hidden_dim, dropout, num_layers) in enumerate(combinations):
    print(f"\n[{idx+1}/{len(combinations)}] Training: LR={lr}, Hidden={hidden_dim}, Dropout={dropout}, Layers={num_layers}")
    
    # Create model
    model = GAT(input_dim=input_dim, hidden_dim=hidden_dim, heads=8, dropout=dropout, num_layers=num_layers)
    model.to(device)
    
    # Setup training
    criterion = nn.BCELoss()
    optimizer = Adam(model.parameters(), lr=lr)
    
    best_val_auc = 0
    best_epoch = 0
    
    # Train for 100 epochs
    for epoch in range(100):
        model.train()
        
        for batch in train_loader:
            batch = batch.to(device)
            out = model(batch.x, batch.edge_index, batch.batch)
            loss = criterion(out.squeeze(), batch.y)
            loss.backward()
            optimizer.step()
            optimizer.zero_grad()
        
        # Validate after each epoch
        val_loss, metrics = validate(model, val_loader, criterion, device)
        
        # Save best model
        if metrics['pr_auc'] > best_val_auc:
            best_val_auc = metrics['pr_auc']
            best_epoch = epoch
            torch.save(model.state_dict(), "../results/best_gat.pt")
    
    # After training: Load best model and test it
    model.load_state_dict(torch.load("../results/best_gat.pt"))
    test_acc = test(model, test_loader, device)
    
    # Store results
    results.append({
        'Learning Rate': lr,
        'Hidden Dim': hidden_dim,
        'Dropout': dropout,
        'Layers': num_layers,
        'Val Acc': f"{metrics['accuracy']:.4f}",
        'Test Acc': f"{test_acc:.4f}",
        'PR-AUC': f"{best_val_auc:.4f}",
        'Best Epoch': best_epoch
    })
    
    print(f"    Complete! Test Acc: {test_acc:.4f}, PR-AUC: {best_val_auc:.4f}")

# Create results table
print("\n" + "=" * 80)
print(" HYPERPARAMETER TUNING RESULTS")
print("=" * 80)

df = pd.DataFrame(results)
print(df.to_string(index=False))

# Save to CSV
df.to_csv('../results/hyperparameter_results.csv', index=False)
print("\n Results saved to results/hyperparameter_results.csv")

# Find best configuration
best_idx = df['Test Acc'].str.float().idxmax()
best_config = df.loc[best_idx]

print("\n" + "=" * 80)
print(" BEST CONFIGURATION")
print("=" * 80)
print(f"Learning Rate: {best_config['Learning Rate']}")
print(f"Hidden Dim: {best_config['Hidden Dim']}")
print(f"Dropout: {best_config['Dropout']}")
print(f"Layers: {best_config['Layers']}")
print(f"Test Accuracy: {best_config['Test Acc']}")
print(f"PR-AUC: {best_config['PR-AUC']}")
print("\n Use these parameters for your final model!")
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

from utils.tox21_dataset import Tox21Dataset
from utils.utils import validate, test
from models.model_gcn import GCN
from models.model_gat import GAT
from models.model_graphsage import GraphSAGE

# Clear old runs
if os.path.exists('./runs'):
    shutil.rmtree('./runs')
os.makedirs('./runs', exist_ok=True)

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

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}\n")

# Define models to train
models_config = [
    {'name': 'GCN', 'class': GCN, 'kwargs': {'input_dim': input_dim, 'hidden_dim': 64}},
    {'name': 'GAT', 'class': GAT, 'kwargs': {'input_dim': input_dim, 'hidden_dim': 64, 'heads': 4}},
    {'name': 'GraphSAGE', 'class': GraphSAGE, 'kwargs': {'input_dim': input_dim, 'hidden_dim': 64}},
]

# Store results
results = []

print("=" * 60)
print(" TRAINING ALL MODELS")
print("=" * 60)

for config in models_config:
    model_name = config['name']
    print(f"\n\n{'='*60}")
    print(f"Training {model_name}...")
    print(f"{'='*60}")
    
    # Create model
    model = config['class'](**config['kwargs'])
    model.to(device)
    
    # Setup training
    criterion = nn.BCELoss()
    optimizer = Adam(model.parameters(), lr=0.001)
    
    best_val_acc = 0
    best_epoch = 0
    
    # Training loop
    num_epochs = 100
    for epoch in range(num_epochs):
        model.train()
        for batch in train_loader:
            batch = batch.to(device)
            out = model(batch.x, batch.edge_index, batch.batch)
            loss = criterion(out.squeeze(), batch.y)
            loss.backward()
            optimizer.step()
            optimizer.zero_grad()
        
        # Validation
        val_loss, metrics = validate(model, val_loader, criterion, device)
        
        # Save best model
        if metrics['pr_auc'] > best_val_acc:
            best_val_acc = metrics['pr_auc']
            best_epoch = epoch
            torch.save(model.state_dict(), f"./results/best_{model_name}.pt")
    
    # Test best model
    model.load_state_dict(torch.load(f"./results/best_{model_name}.pt"))
    test_acc = test(model, test_loader, device)
    
    print(f"\n {model_name} Results:")
    print(f"   Best Val Acc: {metrics['accuracy']:.4f} (Epoch {best_epoch})")
    print(f"   Test Acc: {test_acc:.4f}")
    
    # Store results
    results.append({
        'Model': model_name,
        'Val Acc': f"{metrics['accuracy']:.4f}",
        'Test Acc': f"{test_acc:.4f}",
        'PR-AUC': f"{best_val_acc:.4f}",
        'Best Epoch': best_epoch,
    })

# Create comparison table
print("\n\n" + "=" * 60)
print(" MODEL COMPARISON TABLE")
print("=" * 60)

df = pd.DataFrame(results)
print(df.to_string(index=False))

# Save comparison table
df.to_csv('./results/model_comparison.csv', index=False)
print("\n Results saved to results/model_comparison.csv")
print(" TensorBoard logs saved to ./runs/")
print("\nTo view TensorBoard:")
print("  tensorboard --logdir=./runs/")

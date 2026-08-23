import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import torch
import torch.nn as nn
from torch.optim import Adam
from torch_geometric.loader import DataLoader
from utils.multitask_datasets import ESOLDataset
from models.multitask_gat_esol import ESOLRegression

print("\n" + "="*80)
print(" TRAINING ESOL REGRESSION MODEL (SOLUBILITY PREDICTION)")
print("="*80)

# Load dataset
print("\n Loading ESOL data...")
train_dataset = ESOLDataset(root='./data/esol', split='train')
val_dataset = ESOLDataset(root='./data/esol', split='val')
test_dataset = ESOLDataset(root='./data/esol', split='test')

print(f" Train: {len(train_dataset)} | Val: {len(val_dataset)} | Test: {len(test_dataset)}")

# Create dataloaders
train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True, num_workers=0)
val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False, num_workers=0)
test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False, num_workers=0)

# Setup model
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")

model = ESOLRegression(input_dim=8, hidden_dim=64, heads=4, dropout=0.0)
model.to(device)

# Training setup
criterion = nn.MSELoss()  # Regression loss for continuous values
optimizer = Adam(model.parameters(), lr=0.001)

best_val_loss = float('inf')
best_epoch = 0

# Training loop
print("\n Starting training...\n")
num_epochs = 50

for epoch in range(num_epochs):
    # Train
    model.train()
    total_loss = 0
    
    for batch in train_loader:
        batch = batch.to(device)
        optimizer.zero_grad()
        
        # Forward pass
        out = model(batch.x, batch.edge_index, batch.batch)
        
        # Regression loss
        loss = criterion(out, batch.y.view(-1, 1))
        
        loss.backward()
        optimizer.step()
        total_loss += loss.item()
    
    avg_train_loss = total_loss / len(train_loader)
    
    # Validate
    model.eval()
    val_loss = 0
    with torch.no_grad():
        for batch in val_loader:
            batch = batch.to(device)
            out = model(batch.x, batch.edge_index, batch.batch)
            loss = criterion(out, batch.y.view(-1, 1))
            val_loss += loss.item()
    
    avg_val_loss = val_loss / len(val_loader)
    
    # Save best model
    if avg_val_loss < best_val_loss:
        best_val_loss = avg_val_loss
        best_epoch = epoch
        torch.save(model.state_dict(), './results/best_esol.pt')
        print(f"Epoch {epoch:3d} | Train Loss: {avg_train_loss:.4f} | Val Loss: {avg_val_loss:.4f} ✓ SAVED")
    else:
        print(f"Epoch {epoch:3d} | Train Loss: {avg_train_loss:.4f} | Val Loss: {avg_val_loss:.4f}")

# Test best model
print(f"\n Testing best model (Epoch {best_epoch})...")
model.load_state_dict(torch.load('./results/best_esol.pt'))
model.eval()

test_loss = 0
with torch.no_grad():
    for batch in test_loader:
        batch = batch.to(device)
        out = model(batch.x, batch.edge_index, batch.batch)
        loss = criterion(out, batch.y.view(-1, 1))
        test_loss += loss.item()

avg_test_loss = test_loss / len(test_loader)

print("\n" + "="*80)
print(f"FINAL RESULTS")
print("="*80)
print(f"Best Validation Loss: {best_val_loss:.4f}")
print(f"Test Loss: {avg_test_loss:.4f}")
print(f"Model saved to: ./results/best_esol.pt")
print("="*80 + "\n")
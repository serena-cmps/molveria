import sys
import os

# Add parent directory to path so imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import torch
import torch.nn as nn
from torch.optim import Adam
from torch_geometric.loader import DataLoader
import shutil
from sklearn.metrics import precision_recall_fscore_support, roc_auc_score, precision_recall_curve, auc
import numpy as np

from utils.tox21_dataset import Tox21Dataset
from models.model_gcn import GCN

# Setup results directory with absolute path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
results_dir = os.path.join(project_root, 'results')
os.makedirs(results_dir, exist_ok=True)

# Clear cache to force reprocessing
if os.path.exists('./data/tox21/processed'):
    shutil.rmtree('./data/tox21/processed')
    print("Cleared cache, regenerating dataset...")

if os.path.exists('./data/tox21/raw'):
    shutil.rmtree('./data/tox21/raw')
    print("Cleared raw cache...")
# Load datasets
print("\n Loading datasets...")
train_dataset = Tox21Dataset(root='./data/tox21', split='train')
val_dataset = Tox21Dataset(root='./data/tox21', split='val')
test_dataset = Tox21Dataset(root='./data/tox21', split='test')

# Detect feature dimension
sample = train_dataset[0]
input_dim = sample.x.shape[1]
print(f"Feature dimension: {input_dim}")

# Create dataloaders
train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True, num_workers=0)
val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False, num_workers=0)
test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False, num_workers=0)

# Calculate pos_weight (from Lecture 8 - Data Imbalance)
train_labels = torch.cat([data.y for data in train_dataset.data_list])
n_negative = (train_labels == 0).sum().float()
n_positive = (train_labels == 1).sum().float()
pos_weight = n_negative / n_positive

print(f"Inactive: {n_negative:.0f}, Active: {n_positive:.0f}")
print(f"pos_weight: {pos_weight:.2f}\n")

# Create model
model = GCN(input_dim, 64)
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}\n")
model.to(device)
criterion = nn.BCELoss()
optimizer = Adam(model.parameters(), lr=0.001)

# Validation function
def validate(model, val_loader, criterion, device):
    model.eval() 
    if len(val_loader) == 0:
        print(" Validation set is empty!")
        model.train()
        return 0, {}
    
    with torch.no_grad():
        total_loss = 0
        all_preds = []
        all_labels = []
        
        for batch in val_loader:
            batch = batch.to(device)
            out = model(batch.x, batch.edge_index, batch.batch)
            loss = criterion(out.squeeze(), batch.y)
            
            total_loss += loss.item()
            all_preds.append(out.squeeze().cpu().numpy())
            all_labels.append(batch.y.cpu().numpy())
    
    all_preds = np.concatenate(all_preds, axis=0)
    all_labels = np.concatenate(all_labels, axis=0)
    
    probs = all_preds  
    predictions = (probs > 0.5).astype(int)
    
    # Calculate metrics (from Lecture 9)
    precision, recall, f1, _ = precision_recall_fscore_support(all_labels, predictions, average='binary')
    roc_auc = roc_auc_score(all_labels, probs)
    precision_curve, recall_curve, _ = precision_recall_curve(all_labels, probs)
    pr_auc = auc(recall_curve, precision_curve)
    
    accuracy = (predictions == all_labels).mean()
    avg_loss = total_loss / len(val_loader)
    
    metrics = {
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1': f1,
        'roc_auc': roc_auc,
        'pr_auc': pr_auc
    }
    
    model.train()
    return avg_loss, metrics

# Training loop
print("=" * 80)
print(" TRAINING GCN MODEL")
print("=" * 80 + "\n")

best_val_auc = 0
for epoch in range(100):
    model.train() 
    for batch in train_loader:
        batch = batch.to(device)
        out = model(batch.x, batch.edge_index, batch.batch)
        loss = criterion(out.squeeze(), batch.y)
        loss.backward()
        optimizer.step()
        optimizer.zero_grad()
    
    val_loss, metrics = validate(model, val_loader, criterion, device)
    
    if metrics['pr_auc'] > best_val_auc:
        best_val_auc = metrics['pr_auc']
        best_model_path = os.path.join(results_dir, "best.pt")
        torch.save(model.state_dict(), best_model_path)
        print(f"Epoch {epoch}: Acc={metrics['accuracy']:.4f} | Prec={metrics['precision']:.4f} | Recall={metrics['recall']:.4f} | F1={metrics['f1']:.4f} | PR-AUC={metrics['pr_auc']:.4f} (SAVED)")

print("\n" + "=" * 80)
print(" Training complete!")
print(f" Best model saved to: {os.path.join(results_dir, 'best.pt')}")
print("=" * 80)
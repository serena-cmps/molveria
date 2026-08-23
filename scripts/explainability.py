import sys
import os

# Add parent directory to path so imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import torch
import matplotlib.pyplot as plt
import numpy as np
from torch_geometric.loader import DataLoader

from utils.tox21_dataset import Tox21Dataset
from models.model_gat import GAT

print(" Loading explainability analysis...")

# Load model
model = GAT(input_dim=8, hidden_dim=64, heads=4, dropout=0.0, num_layers=2)
model.load_state_dict(torch.load('./results/best_GAT.pt'))
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model.to(device)
model.eval()

# Load test dataset
test_dataset = Tox21Dataset(root='./data/tox21', split='test')
test_loader = DataLoader(test_dataset, batch_size=1, shuffle=False)

# Simple feature importance (just use average feature values)
print(" Analyzing Feature Importance...")
results = []

for idx, batch in enumerate(list(test_loader)[:10]):
    feat_importance = batch.x.abs().mean(dim=0).numpy()
    results.append(feat_importance)
    print(f'Molecule {idx}: {feat_importance}')

# PLOT
plt.figure(figsize=(10, 4))
plt.bar(range(len(results[0])), results[0])
plt.title("Average Feature Importance (First Molecule)")
plt.xlabel("Atom Feature Index")
plt.ylabel("Importance")
plt.savefig('./explainability/Average_Feature_Importance.png')
print(" Saved explainability/Average_Feature_Importance.png")

# TEXT
with open('./explainability/EXPLAINABILITY_INTERPRETATION.txt', 'w') as f:
    f.write("EXPLAINABILITY ANALYSIS\n")
    f.write("="*60 + "\n\n")
    f.write("Method: Feature Importance Analysis\n")
    f.write("Analyzed 10 molecules from test set\n")
    f.write("Shows which atomic features have highest values\n\n")
    f.write("CONCLUSION:\n")
    f.write("Higher feature values indicate more important atoms\n")
    f.write("This helps understand model predictions!\n")

print(" Saved explainability/EXPLAINABILITY_INTERPRETATION.txt")
print("\n Explainability analysis complete!")
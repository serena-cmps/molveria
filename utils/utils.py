import torch
import numpy as np
from sklearn.metrics import precision_recall_fscore_support, roc_auc_score, precision_recall_curve, auc

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
    
    # Already probabilities from model
    probs = all_preds
    predictions = (probs > 0.5).astype(int)
    
    # Calculate metrics
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


def test(model, test_loader, device):
    """Test function"""
    model.eval()
    with torch.no_grad():
        total_correct = 0
        total_sample = 0
        for batch in test_loader:
            batch = batch.to(device)
            out = model(batch.x, batch.edge_index, batch.batch)
            prediction = (out.squeeze() > 0.5).int()
            total_correct += (prediction == batch.y).sum()
            total_sample += len(batch.y)
    
    accuracy = int(total_correct) / total_sample
    return accuracy
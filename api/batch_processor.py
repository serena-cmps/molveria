import threading
import asyncio
import csv
import os
from pathlib import Path
from datetime import datetime
from sqlalchemy.orm import Session
import sys
import torch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from .database import BatchJob, BatchJobMolecule, Molecule, Prediction, SessionLocal
from models.multitask_gat_tox21 import Tox21MultiTaskGAT
from models.multitask_gat_esol import ESOLRegression
from models.multitask_gat_chembl import ChEMBLMultiTaskGAT
from utils.smiles_to_graph import smiles_to_graph

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Device: {device}")

# ============================================================================
# GLOBAL MODEL CACHE (OPTIMIZATION - Phase 2)
# ============================================================================

_models_cache = None

def get_models():
    """Load models ONCE and cache them globally"""
    global _models_cache
    if _models_cache is not None:
        return _models_cache
    
    print(" Loading models...")
    
    tox21 = Tox21MultiTaskGAT(input_dim=8, hidden_dim=64, heads=4, dropout=0.0, num_tasks=12)
    tox21.load_state_dict(torch.load('./results/best_tox21_multitask.pt', map_location=device))
    tox21.to(device).eval()
    
    esol = ESOLRegression(input_dim=8, hidden_dim=64, heads=4, dropout=0.0)
    esol.load_state_dict(torch.load('./results/best_esol.pt', map_location=device))
    esol.to(device).eval()
    
    chembl = ChEMBLMultiTaskGAT(input_dim=8, hidden_dim=64, heads=4, dropout=0.0, num_tasks=3)
    chembl.load_state_dict(torch.load('./results/best_chembl_multitask.pt', map_location=device))
    chembl.to(device).eval()
    
    _models_cache = (tox21, esol, chembl)
    print(" Models loaded and cached!")
    return _models_cache

# ============================================================================
# BATCH PROCESSING (Phase 2 + Optimization)
# ============================================================================

async def process_batch_job(job_id: int):
    """Process batch job with model optimization"""
    db = None
    try:
        db = SessionLocal()
        print(f"\n Starting batch processing for job_id={job_id}")
        
        # Get cached models (OPTIMIZATION - loaded once!)
        tox21_model, esol_model, chembl_model = get_models()
        
        batch_job = db.query(BatchJob).filter(BatchJob.job_id == job_id).first()
        if not batch_job:
            print(f" Job {job_id} not found")
            return
        
        molecules_to_process = db.query(BatchJobMolecule).filter(
            BatchJobMolecule.job_id == job_id,
            BatchJobMolecule.status == "pending"
        ).all()
        
        total = len(molecules_to_process)
        print(f" Processing {total} molecules for job {job_id}")
        
        results = []
        batch_size = 4  # OPTIMIZATION - process 4 molecules at a time
        
        for batch_idx in range(0, total, batch_size):
            batch_mols = molecules_to_process[batch_idx:batch_idx + batch_size]
            print(f"\n  [Batch {batch_idx//batch_size + 1}] Processing {len(batch_mols)} molecules...")
            
            graphs = []
            mol_data = []
            
            # Convert SMILES to graphs
            for batch_mol in batch_mols:
                molecule = db.query(Molecule).filter(Molecule.molecule_id == batch_mol.molecule_id).first()
                if not molecule:
                    batch_mol.status = "failed"
                    batch_mol.error = "Molecule not found"
                    batch_job.failed_molecules += 1
                    db.commit()
                    continue
                
                smiles = molecule.smiles
                graph = smiles_to_graph(smiles)
                
                if graph is None:
                    batch_mol.status = "failed"
                    batch_mol.error = "Invalid SMILES"
                    batch_job.failed_molecules += 1
                    db.commit()
                    continue
                
                graph = graph.to(device)
                graphs.append(graph)
                mol_data.append({
                    'smiles': smiles,
                    'batch_mol': batch_mol,
                    'molecule': molecule,
                    'graph': graph
                })
            
            if not mol_data:
                continue
            
            # OPTIMIZATION - Use torch.no_grad() for faster inference
            with torch.no_grad():
                for data in mol_data:
                    graph = data['graph']
                    smiles = data['smiles']
                    batch_mol = data['batch_mol']
                    molecule = data['molecule']
                    
                    try:
                        # Run predictions on all 3 models
                        tox_pred = tox21_model(graph.x, graph.edge_index, graph.batch)
                        esol_pred = esol_model(graph.x, graph.edge_index, graph.batch)
                        chembl_pred = chembl_model(graph.x, graph.edge_index, graph.batch)
                        
                        # Convert to numpy
                        tox_vals = tox_pred.cpu().numpy()[0] if tox_pred.dim() > 1 else tox_pred.cpu().numpy()
                        esol_val = esol_pred.cpu().numpy()[0, 0] if esol_pred.dim() > 1 else esol_pred.cpu().numpy()[0]
                        chembl_vals = chembl_pred.cpu().numpy()[0] if chembl_pred.dim() > 1 else chembl_pred.cpu().numpy()
                        
                        # Create prediction record
                        # tox_vals order matches Tox21MultiTaskGAT.forward()'s concatenation
                        # order exactly: [ahr, ar, are, aromatase, ar_lbd, atad5, er, er_lbd,
                        # hse, mmp, p53, ppar_gamma]. Do not reorder without re-checking that.
                        prediction = Prediction(
                            molecule_id=molecule.molecule_id,
                            user_id=batch_job.user_id,
                            tox_ahr=float(tox_vals[0]),
                            tox_ar=float(tox_vals[1]),
                            tox_are=float(tox_vals[2]),
                            tox_aromatase=float(tox_vals[3]),
                            tox_ar_lbd=float(tox_vals[4]),
                            tox_atad5=float(tox_vals[5]),
                            tox_er=float(tox_vals[6]),
                            tox_er_lbd=float(tox_vals[7]),
                            tox_hse=float(tox_vals[8]),
                            tox_mmp=float(tox_vals[9]),
                            tox_p53=float(tox_vals[10]),
                            tox_ppar_gamma=float(tox_vals[11]),
                            esol_log_solubility=float(esol_val),
                            chembl_prothrombin=float(chembl_vals[0]),
                            chembl_cannabinoid_r1=float(chembl_vals[1]),
                            chembl_voltage_gated=float(chembl_vals[2]),
                        )
                        
                        db.add(prediction)
                        db.flush()
                        
                        # Update batch molecule status
                        batch_mol.prediction_id = prediction.prediction_id
                        batch_mol.status = "processed"
                        batch_mol.processed_at = datetime.now()
                        batch_job.processed_molecules += 1
                        
                        # Store results for CSV
                        results.append({
                            'smiles': smiles,
                            'tox_ahr': float(tox_vals[0]),
                            'esol': float(esol_val),
                            'chembl_target1': float(chembl_vals[0])
                        })
                        
                        db.commit()
                        print(f"     {smiles}")
                        
                    except Exception as e:
                        print(f"     {smiles}: {str(e)}")
                        batch_mol.status = "failed"
                        batch_mol.error = str(e)
                        batch_job.failed_molecules += 1
                        db.commit()
                        continue
        
        # Save results to CSV with ABSOLUTE PATH (FIX)
        if results:
            results_dir = os.path.abspath('./results')
            os.makedirs(results_dir, exist_ok=True)
            csv_path = os.path.join(results_dir, f"batch_{job_id}.csv")
            
            with open(csv_path, 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=results[0].keys())
                writer.writeheader()
                writer.writerows(results)
            
            print(f"\n✓ Results saved to {csv_path}")
            batch_job.output_csv_path = csv_path  # Store ABSOLUTE path
        
        batch_job.status = "completed"
        batch_job.completed_at = datetime.now()
        db.commit()
        
        print(f"\n Batch job {job_id} completed!")
        print(f"   Processed: {batch_job.processed_molecules}")
        print(f"   Failed: {batch_job.failed_molecules}")
        
    except Exception as e:
        print(f" Batch job {job_id} failed: {str(e)}")
        # Deliberately a fresh session, not the `db` from the try block above:
        # that session (or its objects) may be unusable — e.g. if
        # SessionLocal() itself failed, or the exception left the original
        # session's transaction in a broken state. Re-querying fresh here
        # means this error path doesn't depend on anything the failed run did.
        error_db = SessionLocal()
        try:
            failed_job = error_db.query(BatchJob).filter(BatchJob.job_id == job_id).first()
            if failed_job:
                failed_job.status = "failed"
                failed_job.error_message = f"Batch processing failed: {str(e)}"
                failed_job.completed_at = datetime.now()
                error_db.commit()
        finally:
            error_db.close()
    finally:
        if db is not None:
            db.close()

def run_sync_batch(job_id: int):
    """Run batch in async context"""
    try:
        asyncio.run(process_batch_job(job_id))
    except Exception as e:
        # process_batch_job() catches its own exceptions and marks the job
        # failed in the DB already — this only fires for something outside
        # that (e.g. asyncio.run() itself failing to launch the coroutine).
        # Last-resort net, so the job doesn't die silently with no reason.
        print(f" Error in run_sync_batch: {str(e)}")
        try:
            error_db = SessionLocal()
            try:
                failed_job = error_db.query(BatchJob).filter(BatchJob.job_id == job_id).first()
                if failed_job and failed_job.status == "processing":
                    failed_job.status = "failed"
                    failed_job.error_message = f"Batch processing failed to start: {str(e)}"
                    failed_job.completed_at = datetime.now()
                    error_db.commit()
            finally:
                error_db.close()
        except Exception as db_error:
            print(f" Could not record run_sync_batch failure for job {job_id}: {str(db_error)}")

def start_background_task(job_id: int):
    """Start background thread for batch processing"""
    print(f" Starting background thread for job {job_id}")
    thread = threading.Thread(target=run_sync_batch, args=(job_id,), daemon=True)
    thread.start()
    print(f" Background thread started")
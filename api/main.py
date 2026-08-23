"""
FastAPI Batch Processing API for Drug Discovery
ENHANCED: 9 Endpoints total (5 existing + 4 new for Phase 3)
Complete Error Handling & Swagger Documentation
"""

from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, BackgroundTasks, Body, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import csv
import os
from datetime import datetime
from sqlalchemy.orm import Session
import asyncio
import traceback
import torch
from rdkit import Chem
from rdkit.Chem import Descriptors, Crippen
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import our custom modules
from .database import engine, Base, SessionLocal, get_db, BatchJob, BatchJobMolecule, Molecule, User, Prediction
from .schemas import (
    BatchUploadRequest, BatchJobResponse, BatchJobListResponse,
    UploadResponse, DownloadResponse, ErrorResponse, PredictionResponse,
    SinglePredictRequest, SinglePredictResponse, BatchPredictRequest, BatchPredictResponse,
    BatchResultsResponse, ExplainResponse, LipinskiResponse
)
from .batch_processor import start_background_task
from .atom_importance import compute_explanation
from .molecule_3d import compute_structure
from utils.smiles_to_graph import smiles_to_graph
from models.multitask_gat_tox21 import Tox21MultiTaskGAT
from models.multitask_gat_esol import ESOLRegression
from models.multitask_gat_chembl import ChEMBLMultiTaskGAT

# ============================================================================
# INITIALIZE FASTAPI APP
# ============================================================================

app = FastAPI(
    title="Drug Discovery Batch Processing API",
    description="Process 100+ molecules with Tox21, ESOL, ChEMBL predictions. Phase 2 + Phase 3 endpoints.",
    version="2.0.0"
)

# Dev frontend (Vite) runs on a different origin/port than this API, so the
# browser blocks fetch() calls without explicit CORS headers.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# There is no authentication or rate limiting on this API, so a per-request
# batch size cap is the only thing standing between a single submission and
# an unbounded amount of CPU/DB work. 1,000 molecules is ~10x the "100+
# molecules" scale the frontend advertises as typical real usage, so it
# stays generous for real batch scoring while bounding the worst case a
# single request can impose. The upload file-size cap is a coarse, cheap
# pre-parse rejection for /batch/upload — 5 MB comfortably covers a CSV of
# thousands of rows (a bare SMILES column runs only tens of bytes per row),
# while still refusing obviously-oversized uploads before any parsing work.
MAX_BATCH_MOLECULES = 1000
MAX_UPLOAD_FILE_SIZE_BYTES = 5 * 1024 * 1024

# Create tables (if they don't exist)
try:
    Base.metadata.create_all(bind=engine)
    print(" Database tables initialized")
except Exception as e:
    print(f" Error creating tables: {str(e)}")


@app.on_event("startup")
async def mark_orphaned_batch_jobs_failed():
    """
    A BatchJob's actual work happens on a background thread. Threads don't
    survive their process dying — so any job still `status == "processing"`
    when this API starts up was, unambiguously, abandoned by whatever
    process was running it before (a crash, or — very likely in dev, since
    this runs under `uvicorn --reload` — a restart triggered by a file save
    while a job was mid-run). There's no live thread anywhere that could
    still finish it. Mark it failed with a readable reason rather than
    leaving it to poll as "processing" forever.
    """
    db = SessionLocal()
    try:
        orphaned = db.query(BatchJob).filter(BatchJob.status == "processing").all()
        for job in orphaned:
            job.status = "failed"
            job.error_message = (
                "This job was interrupted before it finished (the prediction "
                "service restarted while it was still running). Please submit "
                "it again."
            )
            job.completed_at = datetime.now()
        if orphaned:
            db.commit()
            print(f" Marked {len(orphaned)} orphaned batch job(s) as failed on startup: "
                  f"{[job.job_id for job in orphaned]}")
    except Exception as e:
        print(f" Error cleaning up orphaned batch jobs: {str(e)}")
    finally:
        db.close()

# ============================================================================
# LOAD MODELS ONCE (cached globally)
# ============================================================================

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Device: {device}")

_models_cache = None

def get_models():
    """Load models once and cache them"""
    global _models_cache
    if _models_cache is not None:
        return _models_cache
    
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
    print(" Models loaded and cached")
    return _models_cache

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def calculate_confidence(pred):
    """Calculate confidence (0-1) based on distance from 0.5"""
    conf = abs(pred - 0.5) * 2
    return min(float(conf), 1.0)  # Cap at 100%

def calculate_uncertainty(confidences: list):
    """
    Calculate uncertainty as inverse of average confidence
    High confidence = low uncertainty
    Low confidence = high uncertainty
    
    Returns uncertainty in range [0, 1]
    """
    if not confidences:
        return 0.0
    
    avg_confidence = sum(confidences) / len(confidences)
    uncertainty = 1.0 - avg_confidence  # Inverse relationship
    return round(float(uncertainty), 4)

def calculate_lipinski(smiles: str):
    """Calculate Lipinski properties"""
    try:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return None
        
        mw = Descriptors.MolWt(mol)
        logp = Crippen.MolLogP(mol)
        hbd = Descriptors.NumHDonors(mol)
        hba = Descriptors.NumHAcceptors(mol)
        
        passes_all = (mw <= 500) and (logp <= 5) and (hbd <= 5) and (hba <= 10)
        
        return {
            "molecular_weight": float(mw),
            "logp": float(logp),
            "h_donors": int(hbd),
            "h_acceptors": int(hba),
            "passes_all": passes_all
        }
    except Exception as e:
        print(f" Error calculating Lipinski: {str(e)}")
        return None

def predict_single_molecule(smiles: str):
    """Make prediction for single molecule"""
    try:
        graph = smiles_to_graph(smiles)
        if graph is None:
            return None
        
        tox21_model, esol_model, chembl_model = get_models()
        graph = graph.to(device)
        
        with torch.no_grad():
            tox_pred = tox21_model(graph.x, graph.edge_index, graph.batch)
            esol_pred = esol_model(graph.x, graph.edge_index, graph.batch)
            chembl_pred = chembl_model(graph.x, graph.edge_index, graph.batch)
        
        tox_vals = tox_pred.cpu().numpy()[0] if tox_pred.dim() > 1 else tox_pred.cpu().numpy()
        esol_val = esol_pred.cpu().numpy()[0, 0] if esol_pred.dim() > 1 else esol_pred.cpu().numpy()[0]
        chembl_vals = chembl_pred.cpu().numpy()[0] if chembl_pred.dim() > 1 else chembl_pred.cpu().numpy()
        
        return {
            'tox21': [float(x) for x in tox_vals],
            'esol': float(esol_val),
            'chembl': [float(x) for x in chembl_vals]
        }
    except Exception as e:
        print(f" Error predicting: {str(e)}")
        return None

# ============================================================================
# ROUTE ORDER IS CRITICAL!
# SPECIFIC routes MUST come BEFORE generic routes with path parameters
# ============================================================================

# HEALTH CHECK ENDPOINT

@app.get("/health", tags=["System"])
async def health_check():
    """Check if API is running"""
    return {"status": "healthy", "message": "API is running"}

# ============================================================================
# PHASE 3 NEW ENDPOINTS (Days 61-70)
# ============================================================================

# ENDPOINT 5: POST /predict (NEW - SINGLE MOLECULE)

@app.post("/predict", response_model=SinglePredictResponse, tags=["Prediction"])
async def predict_molecule(request: SinglePredictRequest):
    """
    Make a single molecule prediction (instant, no background task)
    
    **Input:** SMILES string
    
    **Output:** 16 predictions (12 Tox21 + 1 ESOL + 3 ChEMBL) + confidence + uncertainty + drug-likeness
    
    **Example:**
    - Request: {"smiles": "CCO"}
    - Response: predictions + confidence + uncertainty + lipinski analysis
    """
    
    try:
        # CHECK 1: Is SMILES valid?
        smiles = request.smiles.strip()
        if not smiles:
            raise HTTPException(
                status_code=400,
                detail="SMILES cannot be empty"
            )
        
        # CHECK 2: Can RDKit parse it?
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid SMILES: {smiles}"
            )
        
        # CHECK 3: Make prediction
        predictions = predict_single_molecule(smiles)
        if predictions is None:
            raise HTTPException(
                status_code=400,
                detail="Failed to convert SMILES to graph"
            )
        
        # CHECK 4: Calculate confidence for all 16 predictions
        all_confidences = []
        for tox_val in predictions['tox21']:
            all_confidences.append(calculate_confidence(tox_val))
        all_confidences.append(calculate_confidence(predictions['esol']))
        for chembl_val in predictions['chembl']:
            all_confidences.append(calculate_confidence(chembl_val))
        
        avg_confidence = sum(all_confidences) / len(all_confidences)

        # CHECK 4b: Calculate uncertainty
        uncertainty = calculate_uncertainty(all_confidences)

        # Per-task confidence, grouped the same way as `predictions`, so the
        # frontend can derive real per-property uncertainty (1 - avg(group))
        # instead of splitting the single overall figure into fake thirds.
        confidences = {
            "tox21": all_confidences[0:12],
            "esol": all_confidences[12],
            "chembl": all_confidences[13:16],
        }

        # CHECK 5: Calculate Lipinski properties
        lipinski = calculate_lipinski(smiles)
        if lipinski is None:
            raise HTTPException(
                status_code=400,
                detail="Could not calculate Lipinski properties"
            )
        
        drug_like = lipinski['passes_all']

        # CHECK 6: Per-atom importance for the 3D viewer (one gradient pass
        # per property, against that property's own driving/argmax task)
        tox21_model, esol_model, chembl_model = get_models()
        explanation = compute_explanation(
            smiles,
            tox21_model, esol_model, chembl_model, device,
            predictions['tox21'], predictions['chembl'],
        )

        # CHECK 7: 3D coordinates for the same molecule (same atom indices
        # as `explanation` — see molecule_3d.py for why that holds)
        structure = compute_structure(smiles)

        # SUCCESS: Return prediction
        return SinglePredictResponse(
            smiles=smiles,
            predictions=predictions,
            confidence=avg_confidence,
            uncertainty=uncertainty,
            confidences=confidences,
            drug_like=drug_like,
            lipinski=lipinski,
            explanation=explanation,
            structure=structure
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f" Unexpected error in predict_molecule: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Prediction error: {str(e)}"
        )

# ENDPOINT 6: POST /batch_predict (NEW - BATCH WITHOUT FILE)

@app.post("/batch_predict", response_model=BatchPredictResponse, tags=["Prediction"])
async def batch_predict(
    request: BatchPredictRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Start batch prediction for multiple molecules (async, background processing)
    
    **Input:** List of SMILES strings + optional job name
    
    **Output:** Job ID to track progress
    
    **Example:**
    - Request: {"smiles_list": ["CCO", "CC(C)O"], "job_name": "My Batch"}
    - Response: {"job_id": 5, "status": "processing", ...}
    """
    
    try:
        # CHECK 1: Is list not empty?
        if not request.smiles_list or len(request.smiles_list) == 0:
            raise HTTPException(
                status_code=400,
                detail="SMILES list cannot be empty"
            )

        # CHECK 1b: Under the per-job cap? (checked before the per-molecule
        # RDKit validation loop below, so an oversized submission fails fast)
        if len(request.smiles_list) > MAX_BATCH_MOLECULES:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Batch too large: submitted {len(request.smiles_list)} molecules, "
                    f"maximum is {MAX_BATCH_MOLECULES} per job."
                )
            )

        # CHECK 2: Validate all SMILES
        smiles_list = []
        for idx, smiles in enumerate(request.smiles_list):
            smiles = smiles.strip()
            if not smiles:
                raise HTTPException(
                    status_code=400,
                    detail=f"Row {idx}: SMILES cannot be empty"
                )
            mol = Chem.MolFromSmiles(smiles)
            if mol is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Row {idx}: Invalid SMILES: {smiles}"
                )
            smiles_list.append(smiles)
        
        total_molecules = len(smiles_list)
        
        # CHECK 3: Get or create user
        try:
            user = db.query(User).filter(User.user_id == 1).first()
            if not user:
                user = User(user_id=1, username="default", email="default@example.com")
                db.add(user)
                db.commit()
            user_id = user.user_id
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Database error (user): {str(e)}"
            )
        
        # CHECK 4: Create batch job
        try:
            batch_job = BatchJob(
                user_id=user_id,
                job_name=request.job_name or "Batch Job",
                status="processing",
                total_molecules=total_molecules,
                processed_molecules=0,
                failed_molecules=0,
                input_csv_path=f"./uploads/batch_{datetime.now().timestamp()}.csv"
            )
            db.add(batch_job)
            db.flush()
            job_id = batch_job.job_id
            
            # Save input file
            os.makedirs("./uploads", exist_ok=True)
            with open(batch_job.input_csv_path, 'w') as f:
                f.write("smiles\n")
                for smiles in smiles_list:
                    f.write(f"{smiles}\n")
            
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Database error (batch_job): {str(e)}"
            )
        
        # CHECK 5: Create molecules & batch_job_molecules
        try:
            for smiles in smiles_list:
                molecule = db.query(Molecule).filter(Molecule.smiles == smiles).first()
                if not molecule:
                    molecule = Molecule(smiles=smiles)
                    db.add(molecule)
                    db.flush()
                
                batch_mol = BatchJobMolecule(
                    job_id=job_id,
                    molecule_id=molecule.molecule_id,
                    status="pending"
                )
                db.add(batch_mol)
            
            db.commit()
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Database error (molecules): {str(e)}"
            )
        
        # CHECK 6: Start background processing
        try:
            background_tasks.add_task(start_background_task, job_id)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error starting background task: {str(e)}"
            )
        
        # SUCCESS
        return BatchPredictResponse(
            job_id=job_id,
            status="processing",
            total_molecules=total_molecules,
            message=f"Job {job_id} started, processing {total_molecules} molecules"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f" Unexpected error in batch_predict: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Batch prediction error: {str(e)}"
        )

# ENDPOINT 7: GET /results/{job_id} (NEW - JSON RESULTS)

@app.get("/results/{job_id}", response_model=BatchResultsResponse, tags=["Results"])
async def get_results(job_id: int, db: Session = Depends(get_db)):
    """
    Get batch job results as JSON (alternative to CSV download)
    
    **Input:** Job ID
    
    **Output:** All predictions in JSON format with confidence scores
    
    **Example:** GET /results/1
    """
    
    try:
        # CHECK 1: Does job exist?
        batch_job = db.query(BatchJob).filter(BatchJob.job_id == job_id).first()
        if not batch_job:
            raise HTTPException(
                status_code=404,
                detail=f"Job {job_id} not found"
            )
        
        # CHECK 2: Get all batch_job_molecules with predictions
        try:
            batch_mols = db.query(BatchJobMolecule).filter(
                BatchJobMolecule.job_id == job_id
            ).all()
            
            results = []
            for batch_mol in batch_mols:
                if batch_mol.prediction_id is None:
                    continue
                
                prediction = db.query(Prediction).filter(
                    Prediction.prediction_id == batch_mol.prediction_id
                ).first()
                
                if prediction is None:
                    continue
                
                molecule = db.query(Molecule).filter(
                    Molecule.molecule_id == prediction.molecule_id
                ).first()
                
                if molecule is None:
                    continue
                
                # Get predictions
                tox_vals = [
                    prediction.tox_ahr, prediction.tox_ar, prediction.tox_are,
                    prediction.tox_aromatase, prediction.tox_ar_lbd, prediction.tox_atad5,
                    prediction.tox_er, prediction.tox_er_lbd, prediction.tox_hse,
                    prediction.tox_mmp, prediction.tox_p53, prediction.tox_ppar_gamma
                ]
                
                preds = {
                    'tox21': tox_vals,
                    'esol': prediction.esol_log_solubility,
                    'chembl': [prediction.chembl_prothrombin, prediction.chembl_cannabinoid_r1, prediction.chembl_voltage_gated]
                }
                
                # Calculate confidence
                all_confs = [calculate_confidence(v) for v in tox_vals]
                all_confs.append(calculate_confidence(prediction.esol_log_solubility))
                all_confs.extend([calculate_confidence(v) for v in [prediction.chembl_prothrombin, prediction.chembl_cannabinoid_r1, prediction.chembl_voltage_gated]])
                avg_conf = sum(all_confs) / len(all_confs)
                
                # Calculate uncertainty
                uncertainty = calculate_uncertainty(all_confs)
                
                # Drug-like
                lipinski = calculate_lipinski(molecule.smiles)
                drug_like = lipinski['passes_all'] if lipinski else False
                
                results.append({
                    'smiles': molecule.smiles,
                    'predictions': preds,
                    'confidence': avg_conf,
                    'uncertainty': uncertainty,
                    'drug_like': drug_like
                })
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Database error: {str(e)}"
            )
        
        # SUCCESS
        return BatchResultsResponse(
            job_id=batch_job.job_id,
            status=batch_job.status,
            total_molecules=batch_job.total_molecules,
            processed_molecules=batch_job.processed_molecules,
            failed_molecules=batch_job.failed_molecules,
            results=results
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f" Error in get_results: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Results error: {str(e)}"
        )

# ENDPOINT 8: GET /explain/{molecule_id} (NEW - EXPLANATIONS)

@app.get("/explain/{molecule_id}", response_model=ExplainResponse, tags=["Explanation"])
async def explain_prediction(molecule_id: int, db: Session = Depends(get_db)):
    """
    Get model explanation for a molecule (predictions + confidence + drug-likeness)
    
    **Input:** Molecule ID
    
    **Output:** Full explanation with confidence scores for all 16 predictions
    
    **Example:** GET /explain/1
    """
    
    try:
        # CHECK 1: Does molecule exist?
        molecule = db.query(Molecule).filter(Molecule.molecule_id == molecule_id).first()
        if not molecule:
            raise HTTPException(
                status_code=404,
                detail=f"Molecule {molecule_id} not found"
            )
        
        # CHECK 2: Get latest prediction for this molecule
        try:
            prediction = db.query(Prediction).filter(
                Prediction.molecule_id == molecule_id
            ).order_by(Prediction.created_at.desc()).first()
            
            if prediction is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"No predictions found for molecule {molecule_id}"
                )
            
            # Get all prediction values
            tox_vals = [
                prediction.tox_ahr, prediction.tox_ar, prediction.tox_are,
                prediction.tox_aromatase, prediction.tox_ar_lbd, prediction.tox_atad5,
                prediction.tox_er, prediction.tox_er_lbd, prediction.tox_hse,
                prediction.tox_mmp, prediction.tox_p53, prediction.tox_ppar_gamma
            ]
            
            preds = {
                'tox21': tox_vals,
                'esol': prediction.esol_log_solubility,
                'chembl': [prediction.chembl_prothrombin, prediction.chembl_cannabinoid_r1, prediction.chembl_voltage_gated]
            }
            
            # Calculate confidence for each prediction
            confidence_tox = {f'tox_{i}': calculate_confidence(v) for i, v in enumerate(tox_vals)}
            confidence_esol = {'esol': calculate_confidence(prediction.esol_log_solubility)}
            confidence_chembl = {f'chembl_{i}': calculate_confidence(v) for i, v in enumerate([prediction.chembl_prothrombin, prediction.chembl_cannabinoid_r1, prediction.chembl_voltage_gated])}
            
            all_confs_dict = {**confidence_tox, **confidence_esol, **confidence_chembl}
            
            all_confs = list(all_confs_dict.values())
            avg_conf = sum(all_confs) / len(all_confs)
            
            # Calculate Lipinski
            lipinski = calculate_lipinski(molecule.smiles)
            if lipinski is None:
                raise HTTPException(
                    status_code=400,
                    detail="Could not calculate Lipinski properties"
                )
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Database error: {str(e)}"
            )
        
        # SUCCESS
        return ExplainResponse(
            molecule_id=molecule.molecule_id,
            smiles=molecule.smiles,
            predictions=preds,
            confidence_scores=all_confs_dict,
            average_confidence=avg_conf,
            lipinski=LipinskiResponse(**lipinski),
            created_at=prediction.created_at
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f" Error in explain_prediction: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Explanation error: {str(e)}"
        )

# ============================================================================
# PHASE 2 EXISTING ENDPOINTS (kept unchanged)
# ============================================================================

# ENDPOINT 1: POST /batch/upload

@app.post("/batch/upload", response_model=UploadResponse, tags=["Batch"])
async def upload_batch(
    request: Request,
    file: UploadFile = File(...),
    job_name: str = "Batch Job",
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    """
    Upload CSV file with SMILES column and start batch job
    Returns job_id to track progress
    """

    try:
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="File must be CSV format (.csv)")

        # Fast rejection from the Content-Length header, before reading the
        # body into memory at all — falls back silently to the post-read
        # check below if the header is absent (e.g. chunked transfer).
        content_length = request.headers.get("content-length")
        if content_length is not None and int(content_length) > MAX_UPLOAD_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"File too large: {int(content_length):,} bytes, "
                    f"maximum is {MAX_UPLOAD_FILE_SIZE_BYTES:,} bytes ({MAX_UPLOAD_FILE_SIZE_BYTES // (1024*1024)} MB)."
                )
            )

        try:
            contents = await file.read()
            if len(contents) > MAX_UPLOAD_FILE_SIZE_BYTES:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"File too large: {len(contents):,} bytes, "
                        f"maximum is {MAX_UPLOAD_FILE_SIZE_BYTES:,} bytes ({MAX_UPLOAD_FILE_SIZE_BYTES // (1024*1024)} MB)."
                    )
                )
            file_text = contents.decode('utf-8')
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Cannot read file: {str(e)}")

        try:
            lines = file_text.strip().split('\n')
            if len(lines) < 2:
                raise HTTPException(status_code=400, detail="CSV must have header row and at least 1 data row")

            reader = csv.DictReader(lines)
            rows = list(reader)

            if not rows:
                raise HTTPException(status_code=400, detail="CSV has no data rows")

            if len(rows) > MAX_BATCH_MOLECULES:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Batch too large: submitted {len(rows)} molecules, "
                        f"maximum is {MAX_BATCH_MOLECULES} per job."
                    )
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid CSV format: {str(e)}")

        if 'smiles' not in reader.fieldnames:
            raise HTTPException(status_code=400, detail="CSV must have 'smiles' column")
        
        try:
            smiles_list = []
            for row_idx, row in enumerate(rows):
                smiles = row.get('smiles', '').strip()
                if not smiles:
                    raise HTTPException(status_code=400, detail=f"Row {row_idx + 2}: SMILES cannot be empty")
                smiles_list.append(smiles)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error reading SMILES: {str(e)}")
        
        total_molecules = len(smiles_list)
        
        try:
            user = db.query(User).filter(User.user_id == 1).first()
            if not user:
                user = User(user_id=1, username="default", email="default@example.com")
                db.add(user)
                db.commit()
            user_id = user.user_id
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error (user): {str(e)}")
        
        try:
            batch_job = BatchJob(
                user_id=user_id,
                job_name=job_name,
                status="processing",
                total_molecules=total_molecules,
                processed_molecules=0,
                failed_molecules=0,
                input_csv_path=f"./uploads/batch_{datetime.now().timestamp()}.csv"
            )
            db.add(batch_job)
            db.flush()
            job_id = batch_job.job_id
            
            os.makedirs("./uploads", exist_ok=True)
            with open(batch_job.input_csv_path, 'w') as f:
                f.write(file_text)
            
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error (batch_job): {str(e)}")
        
        try:
            for smiles in smiles_list:
                molecule = db.query(Molecule).filter(Molecule.smiles == smiles).first()
                if not molecule:
                    molecule = Molecule(smiles=smiles)
                    db.add(molecule)
                    db.flush()
                
                batch_mol = BatchJobMolecule(
                    job_id=job_id,
                    molecule_id=molecule.molecule_id,
                    status="pending"
                )
                db.add(batch_mol)
            
            db.commit()
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error (molecules): {str(e)}")
        
        try:
            background_tasks.add_task(start_background_task, job_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error starting background task: {str(e)}")
        
        return UploadResponse(
            job_id=job_id,
            status="processing",
            total_molecules=total_molecules,
            message=f"Job {job_id} started, processing {total_molecules} molecules"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f" Unexpected error in upload_batch: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

# ENDPOINT 4: GET /batch/jobs (SPECIFIC ROUTE - BEFORE /batch/{job_id})

@app.get("/batch/jobs", response_model=BatchJobListResponse, tags=["Batch"])
async def list_jobs(db: Session = Depends(get_db)):
    """List all batch jobs and their status"""
    
    try:
        jobs = db.query(BatchJob).order_by(BatchJob.job_id.desc()).all()
        
        if not jobs:
            return BatchJobListResponse(jobs=[], total_count=0)
        
        job_responses = []
        for job in jobs:
            try:
                job_response = BatchJobResponse(
                    job_id=job.job_id,
                    user_id=job.user_id,
                    job_name=job.job_name,
                    status=job.status,
                    total_molecules=job.total_molecules,
                    processed_molecules=job.processed_molecules,
                    failed_molecules=job.failed_molecules,
                    error_message=job.error_message,
                    output_csv_path=job.output_csv_path,
                    started_at=job.started_at,
                    completed_at=job.completed_at
                )
                job_responses.append(job_response)
            except Exception as e:
                print(f" Warning: Could not convert job {job.job_id}: {str(e)}")
                continue
        
        return BatchJobListResponse(
            jobs=job_responses,
            total_count=len(job_responses)
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f" Error in list_jobs: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ENDPOINT 2: GET /batch/{job_id} (GENERIC ROUTE - AFTER /batch/jobs)

@app.get("/batch/{job_id}", response_model=BatchJobResponse, tags=["Batch"])
async def get_job_status(job_id: int, db: Session = Depends(get_db)):
    """Get status of a batch job"""
    
    try:
        batch_job = db.query(BatchJob).filter(BatchJob.job_id == job_id).first()
        if not batch_job:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        
        return BatchJobResponse(
            job_id=batch_job.job_id,
            user_id=batch_job.user_id,
            job_name=batch_job.job_name,
            status=batch_job.status,
            total_molecules=batch_job.total_molecules,
            processed_molecules=batch_job.processed_molecules,
            failed_molecules=batch_job.failed_molecules,
            error_message=batch_job.error_message,
            output_csv_path=batch_job.output_csv_path,
            started_at=batch_job.started_at,
            completed_at=batch_job.completed_at
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f" Error in get_job_status: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ENDPOINT 3: GET /batch/{job_id}/download (FIXED - USES STREAMING RESPONSE)

@app.get("/batch/{job_id}/download", tags=["Batch"])
async def download_results(job_id: int, db: Session = Depends(get_db)):
    """Download results CSV file when job is completed"""
    
    try:
        batch_job = db.query(BatchJob).filter(BatchJob.job_id == job_id).first()
        if not batch_job:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        
        if batch_job.status != "completed":
            raise HTTPException(status_code=400, detail=f"Job {job_id} is still {batch_job.status}. Cannot download yet.")
        
        if not batch_job.output_csv_path:
            raise HTTPException(status_code=404, detail=f"Output file not found for job {job_id}")
        
        if not os.path.exists(batch_job.output_csv_path):
            raise HTTPException(status_code=404, detail=f"Output file doesn't exist: {batch_job.output_csv_path}")
        
        def iterfile():
            with open(batch_job.output_csv_path, 'rb') as f:
                yield from f
        
        return StreamingResponse(
            iterfile(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=batch_{job_id}_results.csv"}
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f" Error in download_results: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Download error: {str(e)}")

# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions"""
    # Must return a Response (not a plain dict) — a dict return value fails
    # ASGI serialization deep in Starlette, which loses the CORS headers
    # CORSMiddleware would otherwise attach, and the browser sees a bare
    # network error instead of the real status code and message.
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error": exc.detail, "status_code": exc.status_code},
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle unexpected exceptions"""
    print(f" Unhandled exception: {traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": "Internal server error", "details": str(exc), "status_code": 500},
    )

# ============================================================================
# RUN THE SERVER
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    print(" Starting FastAPI server...")
    print(" API docs available at: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)

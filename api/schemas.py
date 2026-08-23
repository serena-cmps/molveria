"""
Pydantic schemas for request/response validation
Enhanced for Phase 3 with new single prediction and explanation endpoints

"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ============================================================================
# REQUEST MODELS (what client sends to API)
# ============================================================================

class BatchUploadRequest(BaseModel):
    """Upload CSV file request"""
    job_name: Optional[str] = "Batch Job"


class SinglePredictRequest(BaseModel):
    """Single molecule prediction request"""
    smiles: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "smiles": "CCO"
            }
        }


class BatchPredictRequest(BaseModel):
    """Batch prediction request (without file upload)"""
    smiles_list: List[str]
    job_name: Optional[str] = "Batch Job"
    
    class Config:
        json_schema_extra = {
            "example": {
                "smiles_list": ["CCO", "CC(C)O", "c1ccccc1"],
                "job_name": "Quick Batch"
            }
        }


# ============================================================================
# RESPONSE MODELS (what API sends back to client)
# ============================================================================

class BatchJobResponse(BaseModel):
    """Single batch job response"""
    job_id: int
    user_id: int
    job_name: str
    status: str
    total_molecules: int
    processed_molecules: int
    failed_molecules: int
    error_message: Optional[str] = None
    output_csv_path: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BatchJobListResponse(BaseModel):
    """Response for list of jobs"""
    jobs: list[BatchJobResponse]
    total_count: int


class UploadResponse(BaseModel):
    """Response after file upload"""
    job_id: int
    status: str
    total_molecules: int
    message: str


class DownloadResponse(BaseModel):
    """Response for download ready"""
    job_id: int
    status: str
    output_csv_path: str
    message: str


class ErrorResponse(BaseModel):
    """Error response"""
    error: str
    details: Optional[str] = None


class PredictionResponse(BaseModel):
    """Single prediction response"""
    prediction_id: int
    molecule_id: int
    smiles: str
    
    # Toxicity (12)
    tox_ar: Optional[float] = None
    tox_ar_lbd: Optional[float] = None
    tox_are: Optional[float] = None
    tox_aromatase: Optional[float] = None
    tox_atad5: Optional[float] = None
    tox_ahr: Optional[float] = None
    tox_er: Optional[float] = None
    tox_er_lbd: Optional[float] = None
    tox_hse: Optional[float] = None
    tox_mmp: Optional[float] = None
    tox_p53: Optional[float] = None
    tox_ppar_gamma: Optional[float] = None
    
    # Solubility (1)
    esol_log_solubility: Optional[float] = None
    
    # Activity (3)
    chembl_prothrombin: Optional[float] = None
    chembl_cannabinoid_r1: Optional[float] = None
    chembl_voltage_gated: Optional[float] = None
    
    # Uncertainty
    avg_uncertainty: Optional[float] = None
    max_uncertainty: Optional[float] = None

    class Config:
        from_attributes = True


# ============================================================================
# NEW RESPONSE MODELS FOR DAYS 61-70 ENDPOINTS
# ============================================================================

class SinglePredictResponse(BaseModel):
    """Response for single molecule prediction (POST /predict)"""
    smiles: str
    predictions: dict  # Contains tox21, esol, chembl
    confidence: float  # Average confidence (0-1)
    uncertainty: float  # Uncertainty (0-1, inverse of confidence) - FIXED: ADDED
    confidences: dict  # Per-task confidence, grouped like `predictions`: {tox21: [12], esol: 1, chembl: [3]}
    drug_like: bool
    lipinski: dict  # MW, LogP, H-donors, H-acceptors
    explanation: dict  # {toxicity_atoms, solubility_atoms, activity_atoms}: [{index, symbol, weight}]
    structure: dict  # {atoms: [{index, symbol, x, y, z}], bonds: [{begin, end, order}]}

    class Config:
        json_schema_extra = {
            "example": {
                "smiles": "CCO",
                "predictions": {
                    "tox21": [0.0036, 0.0069, 0.0179, 0.0021, 0.0022, 0.0001, 0.0316, 0.0052, 0.0084, 0.0033, 0.0003, 0.0004],
                    "esol": 0.6328,
                    "chembl": [0.0000, 0.0032, 0.0000]
                },
                "confidence": 0.9435,
                "uncertainty": 0.0565,
                "confidences": {
                    "tox21": [0.99, 0.99, 0.96, 0.99, 0.99, 1.0, 0.94, 0.99, 0.98, 0.99, 1.0, 1.0],
                    "esol": 0.73,
                    "chembl": [1.0, 0.99, 1.0]
                },
                "drug_like": True,
                "lipinski": {
                    "molecular_weight": 46.07,
                    "logp": -0.00,
                    "h_donors": 1,
                    "h_acceptors": 1,
                    "passes_all": True
                },
                "explanation": {
                    "toxicity_atoms": [{"index": 0, "symbol": "C", "weight": 0.12}],
                    "solubility_atoms": [{"index": 0, "symbol": "C", "weight": 0.87}],
                    "activity_atoms": [{"index": 0, "symbol": "C", "weight": 0.34}]
                }
            }
        }


class BatchPredictionResult(BaseModel):
    """Single result in batch predictions"""
    smiles: str
    predictions: dict
    confidence: float
    uncertainty: float  # FIXED: ADDED
    drug_like: bool


class BatchPredictResponse(BaseModel):
    """Response for batch prediction request (POST /batch_predict)"""
    job_id: int
    status: str
    total_molecules: int
    message: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "job_id": 1,
                "status": "processing",
                "total_molecules": 3,
                "message": "Batch job 1 started, processing 3 molecules"
            }
        }


class BatchResultsResponse(BaseModel):
    """Response for getting batch results as JSON (GET /results/{job_id})"""
    job_id: int
    status: str
    total_molecules: int
    processed_molecules: int
    failed_molecules: int
    results: List[BatchPredictionResult]
    
    class Config:
        json_schema_extra = {
            "example": {
                "job_id": 1,
                "status": "completed",
                "total_molecules": 3,
                "processed_molecules": 3,
                "failed_molecules": 0,
                "results": []
            }
        }


class LipinskiResponse(BaseModel):
    """Lipinski's Rule of 5 analysis"""
    molecular_weight: float
    logp: float
    h_donors: int
    h_acceptors: int
    passes_all: bool


class ExplainResponse(BaseModel):
    """Response for model explanation (GET /explain/{molecule_id})"""
    molecule_id: int
    smiles: str
    
    # Predictions (16 total)
    predictions: dict  # tox21, esol, chembl
    
    # Confidence for each prediction
    confidence_scores: dict  # Confidence for each of 16 predictions
    average_confidence: float
    
    # Drug-likeness
    lipinski: LipinskiResponse

    # Metadata
    created_at: Optional[datetime] = None

    class Config:
        json_schema_extra = {
            "example": {
                "molecule_id": 1,
                "smiles": "CCO",
                "predictions": {
                    "tox21": [0.0036, 0.0069, 0.0179, 0.0021, 0.0022, 0.0001, 0.0316, 0.0052, 0.0084, 0.0033, 0.0003, 0.0004],
                    "esol": 0.6328,
                    "chembl": [0.0000, 0.0032, 0.0000]
                },
                "confidence_scores": {},
                "average_confidence": 0.9435,
                "lipinski": {
                    "molecular_weight": 46.07,
                    "logp": -0.00,
                    "h_donors": 1,
                    "h_acceptors": 1,
                    "passes_all": True
                }
            }
        }
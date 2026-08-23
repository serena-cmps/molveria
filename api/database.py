"""
Connect Python to PostgreSQL database and define table structures.
It's the bridge between Python code and the database!
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

load_dotenv()

# PostgreSQL connection — set in .env (see .env.example for the format).
# Fails loudly at import time if missing, rather than silently falling back
# to a wrong default.
DATABASE_URL = os.environ["DATABASE_URL"]


engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ============================================================================
# DATABASE MODELS (using SQLAlchemy ORM)
# ============================================================================

class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.now)


class Molecule(Base):
    __tablename__ = "molecules"
    molecule_id = Column(Integer, primary_key=True)
    smiles = Column(String(500), unique=True, nullable=False)
    molecular_weight = Column(Float)
    logp = Column(Float)
    h_donors = Column(Integer)
    h_acceptors = Column(Integer)
    created_at = Column(DateTime, default=datetime.now)


class Prediction(Base):
    __tablename__ = "predictions"
    prediction_id = Column(Integer, primary_key=True)
    molecule_id = Column(Integer, ForeignKey("molecules.molecule_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    experiment_id = Column(Integer)
    
    # Toxicity (12)
    tox_ar = Column(Float)
    tox_ar_lbd = Column(Float)
    tox_are = Column(Float)
    tox_aromatase = Column(Float)
    tox_atad5 = Column(Float)
    tox_ahr = Column(Float)
    tox_er = Column(Float)
    tox_er_lbd = Column(Float)
    tox_hse = Column(Float)
    tox_mmp = Column(Float)
    tox_p53 = Column(Float)
    tox_ppar_gamma = Column(Float)
    
    # Solubility (1)
    esol_log_solubility = Column(Float)
    
    # Activity (3)
    chembl_prothrombin = Column(Float)
    chembl_cannabinoid_r1 = Column(Float)
    chembl_voltage_gated = Column(Float)
    
    # Uncertainty
    avg_uncertainty = Column(Float)
    max_uncertainty = Column(Float)
    
    created_at = Column(DateTime, default=datetime.now)


class BatchJob(Base):
    __tablename__ = "batch_jobs"
    job_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    job_name = Column(String(255))
    status = Column(String(50), nullable=False, default="processing")
    total_molecules = Column(Integer)
    processed_molecules = Column(Integer, default=0)
    failed_molecules = Column(Integer, default=0)
    error_message = Column(String)
    input_csv_path = Column(String(500))
    output_csv_path = Column(String(500))
    started_at = Column(DateTime, default=datetime.now)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.now)


class BatchJobMolecule(Base):
    __tablename__ = "batch_job_molecules"
    batch_mol_id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("batch_jobs.job_id"), nullable=False)
    molecule_id = Column(Integer, ForeignKey("molecules.molecule_id"), nullable=False)
    prediction_id = Column(Integer, ForeignKey("predictions.prediction_id"))
    status = Column(String(50), nullable=False, default="pending")
    error = Column(String)
    processed_at = Column(DateTime)


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

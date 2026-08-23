-- ============================================================================
-- DRUG DISCOVERY AI TOOL - PostgreSQL Schema
-- Phase 2 Days 51-60: Database & Batch Processing
-- Production-Ready Schema with Full Constraints & Indexes
-- ============================================================================

-- ============================================================================
-- TABLE 1: users
-- Purpose: Track who's using the system
-- ============================================================================

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- ============================================================================
-- TABLE 2: molecules
-- Purpose: Store unique molecular structures (SMILES)
-- ============================================================================

CREATE TABLE molecules (
    molecule_id SERIAL PRIMARY KEY,
    smiles VARCHAR(500) UNIQUE NOT NULL,
    molecular_weight FLOAT,
    logp FLOAT,
    h_donors INTEGER,
    h_acceptors INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_molecules_smiles ON molecules(smiles);

-- ============================================================================
-- TABLE 3: predictions
-- Purpose: Store all 16 predictions per molecule
-- Contains: 12 Tox21 + 1 ESOL + 3 ChEMBL
-- ============================================================================

CREATE TABLE predictions (
    prediction_id SERIAL PRIMARY KEY,
    molecule_id INTEGER NOT NULL REFERENCES molecules(molecule_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    experiment_id INTEGER,
    
    -- TOXICITY (12 assays from Tox21)
    tox_ar FLOAT,
    tox_ar_lbd FLOAT,
    tox_are FLOAT,
    tox_aromatase FLOAT,
    tox_atad5 FLOAT,
    tox_ahr FLOAT,
    tox_er FLOAT,
    tox_er_lbd FLOAT,
    tox_hse FLOAT,
    tox_mmp FLOAT,
    tox_p53 FLOAT,
    tox_ppar_gamma FLOAT,
    
    -- SOLUBILITY (1 from ESOL)
    esol_log_solubility FLOAT,
    
    -- ACTIVITY (3 from ChEMBL)
    chembl_prothrombin FLOAT,
    chembl_cannabinoid_r1 FLOAT,
    chembl_voltage_gated FLOAT,
    
    -- UNCERTAINTY
    avg_uncertainty FLOAT,
    max_uncertainty FLOAT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_predictions_molecule ON predictions(molecule_id);
CREATE INDEX idx_predictions_user ON predictions(user_id);
CREATE INDEX idx_predictions_experiment ON predictions(experiment_id);

-- ============================================================================
-- TABLE 4: lipinski_properties
-- Purpose: Store Lipinski Rule of 5 compliance per molecule
-- ============================================================================

CREATE TABLE lipinski_properties (
    lipinski_id SERIAL PRIMARY KEY,
    molecule_id INTEGER NOT NULL UNIQUE REFERENCES molecules(molecule_id) ON DELETE CASCADE,
    molecular_weight FLOAT,
    logp FLOAT,
    h_donors INTEGER,
    h_acceptors INTEGER,
    violations INTEGER CHECK (violations >= 0 AND violations <= 4),
    is_drug_like BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lipinski_molecule ON lipinski_properties(molecule_id);
CREATE INDEX idx_lipinski_druglike ON lipinski_properties(is_drug_like);

-- ============================================================================
-- TABLE 5: interpretability_data
-- Purpose: Store bond importance / attention weights per prediction
-- ============================================================================

CREATE TABLE interpretability_data (
    interp_id SERIAL PRIMARY KEY,
    prediction_id INTEGER NOT NULL REFERENCES predictions(prediction_id) ON DELETE CASCADE,
    molecule_id INTEGER NOT NULL REFERENCES molecules(molecule_id) ON DELETE CASCADE,
    num_atoms INTEGER,
    num_bonds INTEGER,
    tox21_avg_bond_importance FLOAT,
    tox21_max_bond_importance FLOAT,
    esol_avg_bond_importance FLOAT,
    esol_max_bond_importance FLOAT,
    chembl_avg_bond_importance FLOAT,
    chembl_max_bond_importance FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_interp_prediction ON interpretability_data(prediction_id);
CREATE INDEX idx_interp_molecule ON interpretability_data(molecule_id);

-- ============================================================================
-- TABLE 6: experiments
-- Purpose: Group related predictions into experiments
-- ============================================================================

CREATE TABLE experiments (
    experiment_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    molecules_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_experiments_user ON experiments(user_id);
CREATE INDEX idx_experiments_created ON experiments(created_at);

-- ============================================================================
-- TABLE 7: batch_jobs
-- Purpose: Track batch processing jobs
-- ============================================================================

CREATE TABLE batch_jobs (
    job_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    job_name VARCHAR(255),
    status VARCHAR(50) NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
    total_molecules INTEGER,
    processed_molecules INTEGER DEFAULT 0,
    failed_molecules INTEGER DEFAULT 0,
    error_message TEXT,
    input_csv_path VARCHAR(500),
    output_csv_path VARCHAR(500),
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_batch_jobs_user ON batch_jobs(user_id);
CREATE INDEX idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX idx_batch_jobs_created ON batch_jobs(created_at);

-- ============================================================================
-- TABLE 8: batch_job_molecules
-- Purpose: Link molecules to batch jobs (many-to-many relationship)
-- ============================================================================

CREATE TABLE batch_job_molecules (
    batch_mol_id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES batch_jobs(job_id) ON DELETE CASCADE,
    molecule_id INTEGER NOT NULL REFERENCES molecules(molecule_id) ON DELETE CASCADE,
    prediction_id INTEGER REFERENCES predictions(prediction_id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'processed', 'failed')),
    error TEXT,
    processed_at TIMESTAMP
);

CREATE INDEX idx_batch_mol_job ON batch_job_molecules(job_id);
CREATE INDEX idx_batch_mol_molecule ON batch_job_molecules(molecule_id);
CREATE INDEX idx_batch_mol_status ON batch_job_molecules(status);

-- ============================================================================
-- TABLE COMMENTS (for documentation)
-- ============================================================================

COMMENT ON TABLE users IS 'System users - tracks who submitted predictions';
COMMENT ON TABLE molecules IS 'Unique molecular structures (SMILES)';
COMMENT ON TABLE predictions IS 'All 16 predictions (12 Tox21 + 1 ESOL + 3 ChEMBL) per molecule';
COMMENT ON TABLE lipinski_properties IS 'Drug-likeness analysis (Lipinski Rule of 5)';
COMMENT ON TABLE interpretability_data IS 'Bond importance/attention weights for predictions';
COMMENT ON TABLE experiments IS 'Groups of related predictions';
COMMENT ON TABLE batch_jobs IS 'Batch processing jobs (process 100+ molecules)';
COMMENT ON TABLE batch_job_molecules IS 'Links between batch jobs and molecules';

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify schema is correct)
-- ============================================================================

-- Check all tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check indexes:
-- SELECT * FROM pg_indexes WHERE schemaname = 'public';

-- Check constraints:
-- SELECT * FROM information_schema.table_constraints WHERE table_schema = 'public';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

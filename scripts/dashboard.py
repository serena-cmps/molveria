import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import streamlit as st
import torch
import numpy as np
import pandas as pd
import requests
import time
from rdkit import Chem
from rdkit.Chem import Descriptors, Crippen
from utils.smiles_to_graph import smiles_to_graph
from models.multitask_gat_tox21 import Tox21MultiTaskGAT
from models.multitask_gat_esol import ESOLRegression
from models.multitask_gat_chembl import ChEMBLMultiTaskGAT

# ============================================================================
# PAGE CONFIG
# ============================================================================

st.set_page_config(page_title="Drug Discovery AI", layout="wide")
st.title(' Drug Discovery AI Dashboard')

# ============================================================================
# LOAD MODELS (CACHED)
# ============================================================================

@st.cache_resource
def load_models():
    """Load all 3 models once and cache them"""
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    # Load Tox21
    tox21_model = Tox21MultiTaskGAT(input_dim=8, hidden_dim=64, heads=4, dropout=0.0, num_tasks=12)
    tox21_model.load_state_dict(torch.load('./results/best_tox21_multitask.pt', map_location=device))
    tox21_model.to(device).eval()

    # Load ESOL
    esol_model = ESOLRegression(input_dim=8, hidden_dim=64, heads=4, dropout=0.0)
    esol_model.load_state_dict(torch.load('./results/best_esol.pt', map_location=device))
    esol_model.to(device).eval()    
    
    # Load ChEMBL
    chembl_model = ChEMBLMultiTaskGAT(input_dim=8, hidden_dim=64, heads=4, dropout=0.0, num_tasks=3)
    chembl_model.load_state_dict(torch.load('./results/best_chembl_multitask.pt', map_location=device))
    chembl_model.to(device).eval()

    return tox21_model, esol_model, chembl_model, device

tox21_model, esol_model, chembl_model, device = load_models()

# ============================================================================
# FASTAPI CONFIGURATION
# ============================================================================

API_BASE_URL = "http://localhost:8000"

def check_api_connection():
    """Check if FastAPI backend is running"""
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=2)
        return response.status_code == 200
    except:
        return False

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_confidence(pred):
    """Calculate confidence score (0-1), capped at 100%"""
    conf = abs(pred - 0.5) * 2
    return min(conf, 1.0)

def predict_local(smiles):
    """Run prediction locally using loaded models"""
    try:
        graph = smiles_to_graph(smiles)
        if graph is None:
            return None
        
        graph = graph.to(device)
        
        with torch.no_grad():
            tox_pred = tox21_model(graph.x, graph.edge_index, graph.batch)
            esol_pred = esol_model(graph.x, graph.edge_index, graph.batch)
            chembl_pred = chembl_model(graph.x, graph.edge_index, graph.batch)
        
        return {
            'tox21': tox_pred.cpu().numpy(),
            'esol': esol_pred.cpu().numpy(),
            'chembl': chembl_pred.cpu().numpy()
        }
    except Exception as e:
        st.error(f" Error: {str(e)}")
        return None

def analyze_drug_likeness(smiles):
    """Calculate Lipinski's Rule of 5 properties"""
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    
    mw = Descriptors.MolWt(mol)
    logp = Crippen.MolLogP(mol)
    hbd = Descriptors.NumHDonors(mol)
    hba = Descriptors.NumHAcceptors(mol)
    
    return {
        'mw': mw,
        'logp': logp,
        'hbd': hbd,
        'hba': hba,
        'mw_pass': mw <= 500,
        'logp_pass': logp <= 5,
        'hbd_pass': hbd <= 5,
        'hba_pass': hba <= 10,
        'is_drug_like': (mw <= 500) and (logp <= 5) and (hbd <= 5) and (hba <= 10)
    }

# ============================================================================
# API FUNCTIONS (Phase 3)
# ============================================================================

def api_predict_single(smiles):
    """Call POST /predict endpoint"""
    try:
        response = requests.post(f"{API_BASE_URL}/predict", json={"smiles": smiles}, timeout=30)
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f" Prediction failed: {response.json().get('detail', 'Unknown error')}")
            return None
    except Exception as e:
        st.error(f" Error: {str(e)}")
        return None

def api_batch_predict(smiles_list, job_name):
    """Call POST /batch_predict endpoint"""
    try:
        response = requests.post(f"{API_BASE_URL}/batch_predict", json={"smiles_list": smiles_list, "job_name": job_name}, timeout=30)
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f" Batch prediction failed: {response.json().get('detail', 'Unknown error')}")
            return None
    except Exception as e:
        st.error(f" Error: {str(e)}")
        return None

def api_get_results(job_id):
    """Call GET /results/{job_id} endpoint"""
    try:
        response = requests.get(f"{API_BASE_URL}/results/{job_id}", timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f" Failed to get results: {response.json().get('detail', 'Unknown error')}")
            return None
    except Exception as e:
        st.error(f" Error: {str(e)}")
        return None

def api_explain(molecule_id):
    """Call GET /explain/{molecule_id} endpoint"""
    try:
        response = requests.get(f"{API_BASE_URL}/explain/{molecule_id}", timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f" Failed to get explanation: {response.json().get('detail', 'Unknown error')}")
            return None
    except Exception as e:
        st.error(f" Error: {str(e)}")
        return None

def upload_batch_csv(csv_file, job_name):
    """Upload CSV to FastAPI"""
    try:
        files = {'file': (csv_file.name, csv_file, 'text/csv')}
        data = {'job_name': job_name}
        response = requests.post(f"{API_BASE_URL}/batch/upload", files=files, data=data, timeout=30)
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f" Upload failed: {response.json().get('detail', 'Unknown error')}")
            return None
    except Exception as e:
        st.error(f" Error uploading file: {str(e)}")
        return None

def get_job_status(job_id):
    """Get job status"""
    try:
        response = requests.get(f"{API_BASE_URL}/batch/{job_id}", timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            return None
    except:
        return None

def download_results(job_id):
    """Download results CSV from API"""
    try:
        response = requests.get(f"{API_BASE_URL}/batch/{job_id}/download", timeout=30)
        if response.status_code == 200:
            return response.content
        else:
            st.error(f" Failed to download: {response.status_code}")
            return None
    except Exception as e:
        st.error(f" Download error: {str(e)}")
        return None

def list_all_jobs():
    """List all jobs"""
    try:
        response = requests.get(f"{API_BASE_URL}/batch/jobs", timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            return None
    except:
        return None

# ============================================================================
# TABS SETUP
# ============================================================================

tab1, tab2, tab3, tab4, tab5, tab6, tab7 = st.tabs([
    " Local Single",
    " Local Batch",
    " Job History",
    " API Single",
    " API Batch",
    " API Results",
    " API Explain"
])

# ============================================================================
# TAB 1: LOCAL SINGLE MOLECULE (Phase 2)
# ============================================================================

with tab1:
    st.header(' Local Single Molecule Prediction')
    
    smiles = st.text_input("Enter SMILES string:", key="tab1_smiles")
    
    if st.button(" Predict", key="tab1_predict_btn"):
        if not smiles:
            st.warning(" Please enter a SMILES string!")
        else:
            predictions = predict_local(smiles)
            
            if predictions is None:
                st.error(" Invalid SMILES or prediction failed!")
            else:
                st.success(" Prediction Complete!")
                
                # Results
                st.header(' Results')
                col1, col2, col3 = st.columns(3)
                
                tox_names = ['ahr', 'ar', 'are', 'aromatase', 'ar_lbd', 'atad5', 'er', 'er_lbd', 'hse', 'mmp', 'p53', 'ppar_gamma']
                chembl_names = ['prothrombin', 'cannabinoid_receptor', 'voltage_gated']
                
                with col1:
                    st.write(" **Toxicity (Tox21)**")
                    for i, name in enumerate(tox_names):
                        score = predictions['tox21'][0][i]
                        conf = get_confidence(score)
                        conf_emoji = "✅" if conf > 0.6 else "⚠️"
                        st.write(f"{name}: {score:.4f} {conf_emoji}")
                
                with col2:
                    st.write(" **Solubility (ESOL)**")
                    esol_score = predictions['esol'][0][0]
                    esol_conf = get_confidence(esol_score)
                    esol_emoji = "✅" if esol_conf > 0.6 else "⚠️"
                    st.write(f"Solubility: {esol_score:.4f} {esol_emoji}")
                
                with col3:
                    st.write(" **Activity (ChEMBL)**")
                    for i, name in enumerate(chembl_names):
                        score = predictions['chembl'][0][i]
                        conf = get_confidence(score)
                        conf_emoji = "✅" if conf > 0.6 else "⚠️"
                        st.write(f"{name}: {score:.4f} {conf_emoji}")
                
                # Drug-Likeness
                st.subheader(' Drug-Likeness (Lipinski)')
                lipinski = analyze_drug_likeness(smiles)
                
                if lipinski:
                    col1, col2 = st.columns(2)
                    with col1:
                        st.write(f"Molecular Weight: {lipinski['mw']:.2f} {'✅' if lipinski['mw_pass'] else '❌'}")
                        st.write(f"LogP: {lipinski['logp']:.2f} {'✅' if lipinski['logp_pass'] else '❌'}")
                    with col2:
                        st.write(f"H-Donors: {lipinski['hbd']} {'✅' if lipinski['hbd_pass'] else '❌'}")
                        st.write(f"H-Acceptors: {lipinski['hba']} {'✅' if lipinski['hba_pass'] else '❌'}")
                    
                    if lipinski['is_drug_like']:
                        st.success("✅ DRUG-LIKE MOLECULE")
                    else:
                        st.warning("⚠️ NOT DRUG-LIKE")
                
                # Confidence
                st.subheader("⚠️ Prediction Confidence")
                
                all_confs = []
                for i in range(12):
                    conf = get_confidence(predictions['tox21'][0][i])
                    all_confs.append((tox_names[i], min(conf, 1.0)))
                
                esol_conf = get_confidence(predictions['esol'][0][0])
                all_confs.append(("ESOL Solubility", min(esol_conf, 1.0)))
                
                for i in range(3):
                    conf = get_confidence(predictions['chembl'][0][i])
                    all_confs.append((chembl_names[i], min(conf, 1.0)))
                
                low_conf_list = [(name, conf) for name, conf in all_confs if conf < 0.6]
                avg_conf = np.mean([conf for _, conf in all_confs])
                
                if low_conf_list:
                    st.warning(f"⚠️ {len(low_conf_list)} predictions have LOW confidence")
                    with st.expander(" Show low confidence predictions"):
                        for pred_name, conf_val in low_conf_list:
                            st.write(f"• {pred_name}: {conf_val:.2%}")
                else:
                    st.success("✅ All predictions are CONFIDENT")
                
                st.metric("Average Confidence", f"{avg_conf*100:.2f}%")

# ============================================================================
# TAB 2: LOCAL BATCH (Phase 2)
# ============================================================================

with tab2:
    st.header(' Local Batch Processing')
    st.write("*Uploads CSV, processes on FastAPI backend*")
    
    api_running = check_api_connection()
    
    if not api_running:
        st.error(" FastAPI backend not running! Start it with: python api/main.py")
    else:
        st.success(" FastAPI backend connected!")
        
        st.subheader('Upload CSV File')
        st.write("CSV must have 'smiles' column with SMILES strings")
        
        uploaded_file = st.file_uploader("Choose CSV file", type="csv", key="tab2_csv_upload")
        job_name = st.text_input("Job name (optional)", value="Batch Job", key="tab2_job_name")
        
        if st.button(" Upload & Start Processing", key="tab2_upload_btn"):
            if uploaded_file is None:
                st.warning(" Please upload a CSV file!")
            else:
                st.info(" Uploading file to API...")
                result = upload_batch_csv(uploaded_file, job_name)
                
                if result:
                    st.success(f" Job {result['job_id']} created! Processing {result['total_molecules']} molecules...")
                    st.info(result['message'])
                    st.session_state.current_job_id = result['job_id']
        
        st.divider()
        st.subheader('Monitor Job Progress')
        
        job_id = st.number_input("Job ID", value=st.session_state.get('current_job_id', 1), min_value=1, key="tab2_job_id_input")
        
        if st.button(" Start Monitoring", key="tab2_check_status_btn"):
            status_container = st.empty()
            status = get_job_status(job_id)
            
            if status is None:
                st.error(f" Job ID {job_id} not found!")
            else:
                while True:
                    if status is None:
                        with status_container.container():
                            st.error(" Lost connection to job!")
                        break
                    
                    with status_container.container():
                        col1, col2, col3 = st.columns(3)
                        
                        with col1:
                            if status['status'] == 'completed':
                                st.metric("Status", " COMPLETED")
                            elif status['status'] == 'processing':
                                st.metric("Status", " PROCESSING")
                            else:
                                st.metric("Status", " FAILED")
                        
                        with col2:
                            st.metric("Progress", f"{status['processed_molecules']}/{status['total_molecules']}")
                        
                        with col3:
                            st.metric("Failed", status['failed_molecules'])
                        
                        progress = status['processed_molecules'] / status['total_molecules'] if status['total_molecules'] > 0 else 0
                        st.progress(progress)
                    
                    if status['status'] == 'completed':
                        with status_container.container():
                            st.success(" Job Completed!")
                            
                            csv_data = download_results(job_id)
                            if csv_data:
                                st.download_button(
                                    label="💾 Download CSV to Your Computer",
                                    data=csv_data,
                                    file_name=f"batch_{job_id}_results.csv",
                                    mime="text/csv",
                                    key=f"tab2_dl_{job_id}"
                                )
                                st.success(f" Click above to save results!")
                            else:
                                st.warning(" Results not available for download")
                        break
                    
                    elif status['status'] == 'failed':
                        with status_container.container():
                            st.error(f" Job failed: {status.get('error_message', 'Unknown error')}")
                        break
                    
                    time.sleep(2)
                    status = get_job_status(job_id)

# ============================================================================
# TAB 3: JOB HISTORY (Phase 2)
# ============================================================================

with tab3:
    st.header(' Job History')
    st.write("*View all batch processing jobs*")
    
    api_running = check_api_connection()
    
    if not api_running:
        st.error(" FastAPI backend not running!")
    else:
        if st.button(" Refresh Job List", key="tab3_refresh_btn"):
            try:
                jobs_data = list_all_jobs()
                
                if jobs_data is None:
                    st.error(" Failed to fetch jobs from API")
                elif not jobs_data.get('jobs'):
                    st.info("No jobs found yet.")
                else:
                    jobs_list = jobs_data['jobs']
                    st.write(f"**Total Jobs:** {len(jobs_list)}")
                    
                    for job in jobs_list:
                        if job['status'] == 'completed':
                            st.success(f" Job {job['job_id']}: {job['job_name']} - COMPLETED")
                        elif job['status'] == 'processing':
                            st.info(f" Job {job['job_id']}: {job['job_name']} - PROCESSING")
                        else:
                            st.error(f" Job {job['job_id']}: {job['job_name']} - FAILED")
            except Exception as e:
                st.error(f" Error loading jobs: {str(e)}")

# ============================================================================
# TAB 4: API SINGLE MOLECULE (Phase 3)
# ============================================================================

with tab4:
    st.header(' API Single Molecule Prediction')
    
    api_running = check_api_connection()
    
    if not api_running:
        st.error(" FastAPI backend not running!")
    else:
        st.success(" FastAPI connected!")
        
        smiles = st.text_input("Enter SMILES string:", key="tab4_smiles")
        
        if st.button(" Predict via API", key="tab4_predict_btn"):
            if not smiles:
                st.warning(" Please enter a SMILES string!")
            else:
                st.info(" Sending to API...")
                result = api_predict_single(smiles)
                
                if result:
                    st.success(" Prediction Complete!")
                    st.write(f"**SMILES:** {result['smiles']}")
                    st.write(f"**Confidence:** {result['confidence']:.2%}")
                    st.write(f"**Drug-like:** {' YES' if result['drug_like'] else ' NO'}")
                    
                    st.subheader(" Predictions")
                    st.json(result['predictions'])

# ============================================================================
# TAB 5: API BATCH (Phase 3)
# ============================================================================

with tab5:
    st.header(' API Batch Prediction')
    st.write("*Uses FastAPI endpoint: POST /batch_predict*")
    
    api_running = check_api_connection()
    
    if not api_running:
        st.error(" FastAPI backend not running!")
    else:
        st.success(" FastAPI connected!")
        
        smiles_input = st.text_area("Enter SMILES (one per line):", key="tab5_smiles_input")
        job_name = st.text_input("Job name:", value="API Batch", key="tab5_job_name")
        
        if st.button(" Start Batch via API", key="tab5_batch_btn"):
            smiles_list = [s.strip() for s in smiles_input.split('\n') if s.strip()]
            
            if not smiles_list:
                st.warning(" Please enter SMILES strings!")
            else:
                st.info(f" Sending {len(smiles_list)} molecules to API...")
                result = api_batch_predict(smiles_list, job_name)
                
                if result:
                    st.success(f" Batch Job {result['job_id']} Created!")
                    st.write(f"**Total molecules:** {result['total_molecules']}")
                    st.write(f"**Status:** {result['status']}")
                    st.write(f"**Message:** {result['message']}")
                    st.session_state.api_batch_job_id = result['job_id']

# ============================================================================
# TAB 6: API RESULTS (Phase 3)
# ============================================================================

with tab6:
    st.header(' API Results')

    api_running = check_api_connection()

    if not api_running:
        st.error(" FastAPI backend not running!")
    else:
        st.success(" FastAPI connected!")

        job_id = st.number_input("Enter Job ID:", value=st.session_state.get('api_batch_job_id', 1), min_value=1, key="tab6_job_id")

        if st.button(" Get Results", key="tab6_get_btn"):
            results = api_get_results(job_id)

            if results is None:
                st.error(f" Job {job_id} not found!")
            elif 'status' not in results:
                st.error(" API returned an error:")
                st.json(results)
            else:
                # Status metrics
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("Status", results['status'].upper())
                with col2:
                    st.metric("Progress", f"{results['processed_molecules']}/{results['total_molecules']}")
                with col3:
                    st.metric("Failed", results['failed_molecules'])

                # Show results
                if results['status'] == 'completed':
                    st.success(" Job Completed!")

                    if results.get('results'):
                        st.subheader(" Results:")
                        for i, r in enumerate(results['results']):
                            st.markdown(f"**Molecule {i+1}: {r['smiles']}**")
                            st.write(f"Confidence: {r['confidence']:.2%} | Drug-like: {' YES' if r['drug_like'] else ' NO'}")
                            st.json(r['predictions'])
                            st.divider()
                        
                        # Download button
                        import json
                        json_str = json.dumps(results['results'], indent=2)
                        st.download_button(
                            label="💾 Download Results as JSON",
                            data=json_str,
                            file_name=f"batch_{job_id}_results.json",
                            mime="application/json"
                        )

                elif results['status'] == 'processing':
                    st.warning(" Still processing. Click **Get Results** again in a moment.")

                else:
                    st.error(" Job failed.")
# ============================================================================
# TAB 7: API EXPLAIN (Phase 3)
# ============================================================================

with tab7:
    st.header(' API Explanation')
    
    api_running = check_api_connection()
    
    if not api_running:
        st.error(" FastAPI backend not running!")
    else:
        st.success(" FastAPI connected!")
        
        molecule_id = st.number_input("Enter Molecule ID:", value=1, min_value=1, key="tab7_molecule_id")
        
        if st.button(" Get Explanation", key="tab7_explain_btn"):
            st.info(" Fetching explanation...")
            explanation = api_explain(molecule_id)
            
            if explanation:
                st.success(" Explanation Retrieved!")
                
                st.subheader("Molecule Info")
                st.write(f"**Molecule ID:** {explanation['molecule_id']}")
                st.write(f"**SMILES:** {explanation['smiles']}")
                
                st.subheader("Average Confidence")
                st.metric("Average Confidence", f"{explanation['average_confidence']:.2%}")
                
                st.subheader("Drug-Likeness (Lipinski)")
                lipinski = explanation['lipinski']
                col1, col2 = st.columns(2)
                
                with col1:
                    st.write(f"MW: {lipinski['molecular_weight']:.2f}")
                    st.write(f"LogP: {lipinski['logp']:.2f}")
                
                with col2:
                    st.write(f"H-Donors: {lipinski['h_donors']}")
                    st.write(f"H-Acceptors: {lipinski['h_acceptors']}")
                
                st.write(f"Passes All: {' YES' if lipinski['passes_all'] else ' NO'}")
                
                st.subheader("Predictions")
                st.json(explanation['predictions'])
                
                if explanation.get('uncertainty'):
                    st.subheader("Uncertainty")
                    st.write(f"Average Uncertainty: {explanation['uncertainty']['avg_uncertainty']}")
                    st.write(f"Max Uncertainty: {explanation['uncertainty']['max_uncertainty']}")
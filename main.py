import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from pdfparser import extract_financial_dict_from_pdf
from analyse import run_financial_analysis_pipeline

load_dotenv() 

app = FastAPI(title="CureForFinancialInsomnia API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/analyse")
def analyze_endpoint(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Invalid file type.")

    # Save incoming file to a temporary disk location for processing
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        buffer.write(file.file.read())

    try:
        # Step 1: Execute Parser
        raw_data_dict = extract_financial_dict_from_pdf(temp_path)
        
        # Step 2: Run Analytical Engine
        original_data, analysis_data = run_financial_analysis_pipeline(raw_data_dict)

        return {
            "status": "success",
            "filename": file.filename,
            "original_metrics": original_data,
            "analysis_results": analysis_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # Always clean up disk space by wiping temp assets
        if os.path.exists(temp_path):
            os.remove(temp_path)
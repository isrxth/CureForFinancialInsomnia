import os
import io
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from pdfparser import (
    extract_raw_text_from_pdf,
    extract_candidates_from_text,
    parse_metrics_with_mappings
)
from analyse import run_financial_analysis_pipeline

load_dotenv() 

app = FastAPI(title="CureForFinancialInsomnia API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyseRequest(BaseModel):
    raw_text: str
    target_years: list[str]
    column_indices: list[int] = []
    selected_mappings: dict[str, int]

class ExportExcelRequest(BaseModel):
    filename: str = "Financial_Analysis.xlsx"
    original_metrics: list[dict]
    analysis_results: list[dict]

@app.post("/api/parse-pdf")
def parse_pdf_endpoint(file: UploadFile = File(...)):
    """
    Step 1: Upload PDF, parse layout with LLMWhisperer, and return candidate rows,
    candidate years, column guides, default mappings, and raw_text for interactive configuration.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF file.")

    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        buffer.write(file.file.read())

    try:
        raw_text = extract_raw_text_from_pdf(temp_path)
        candidate_years, candidate_rows, guide_rows, default_mappings = extract_candidates_from_text(raw_text)

        return {
            "status": "success",
            "filename": file.filename,
            "raw_text": raw_text,
            "candidate_years": candidate_years,
            "candidate_rows": candidate_rows,
            "guide_rows": guide_rows,
            "default_mappings": default_mappings
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/api/analyse")
def analyze_endpoint(request_data: AnalyseRequest):
    """
    Step 2: Take user-selected line mappings, target years, column indices, and raw_text,
    parse the financial dictionary, and run the analytical calculations pipeline.
    """
    try:
        raw_data_dict = parse_metrics_with_mappings(
            raw_text=request_data.raw_text,
            target_yrs=request_data.target_years,
            col_indices=request_data.column_indices,
            selected_mappings=request_data.selected_mappings
        )
        
        original_data, analysis_data = run_financial_analysis_pipeline(raw_data_dict)

        return {
            "status": "success",
            "original_metrics": original_data,
            "analysis_results": analysis_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/export-excel")
def export_excel_endpoint(request_data: ExportExcelRequest):
    """
    Step 3: Convert original metrics and computed analysis results into a multi-sheet
    Excel (.xlsx) file and stream it back for direct download.
    """
    try:
        orig_df = pd.DataFrame(request_data.original_metrics)
        anal_df = pd.DataFrame(request_data.analysis_results)

        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            orig_df.to_excel(writer, sheet_name='Original Metrics', index=False)
            anal_df.to_excel(writer, sheet_name='Analysis Results', index=False)

        buffer.seek(0)
        out_filename = request_data.filename if request_data.filename else "Financial_Analysis.xlsx"

        return Response(
            content=buffer.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{out_filename}"'}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
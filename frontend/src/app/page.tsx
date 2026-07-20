"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/file-uploader";
import { MetricTable } from "@/components/metric-table";
import { ThemeToggle } from "@/components/theme-toggle";

interface CandidateRow {
  display: string;
  line_idx: number;
  label: string;
  numbers_preview: string[];
}

interface GuideRow {
  line_idx: number;
  label: string;
  columns: string[];
}

const TARGET_KEYS_CONFIG = [
  { key: "revenue", label: "Revenue", description: "Topline operational revenue / income" },
  { key: "pbt", label: "Profit/(Loss) before taxation", description: "Pre-tax earnings / operating profit" },
  { key: "total_equity", label: "Total Equity", description: "Shareholders' equity & reserves" },
  { key: "total_borrowings", label: "Total Borrowings", description: "Short & long-term debt liabilities" },
  { key: "current_assets", label: "Current Assets", description: "Liquid short-term assets" },
  { key: "total_assets", label: "Total Assets Employed", description: "Aggregate balance sheet assets" },
  { key: "current_ratio", label: "Current Ratio", description: "Liquidity ratio (No. of times)" },
  { key: "quick_ratio", label: "Quick Asset Ratio", description: "Acid-test liquidity multiplier" },
  { key: "gearing_ratio", label: "Gearing Ratio (%)", description: "Financial leverage percentage" },
];

export default function AnalyticsDashboard() {
  const [currentView, setCurrentView] = useState("landing"); // "landing" | "workspace"
  const [workflowStep, setWorkflowStep] = useState<"upload" | "mapping" | "results">("upload");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Raw data from Step 1 (/api/parse-pdf)
  const [rawText, setRawText] = useState<string>("");
  const [candidateYears, setCandidateYears] = useState<string[]>([]);
  const [candidateRows, setCandidateRows] = useState<CandidateRow[]>([]);
  const [guideRows, setGuideRows] = useState<GuideRow[]>([]);
  
  // Interactive User Selections
  const [targetYearsInput, setTargetYearsInput] = useState<string>("");
  const [columnIndicesInput, setColumnIndicesInput] = useState<string>("");
  const [selectedMappings, setSelectedMappings] = useState<Record<string, number>>({});

  // Final Results
  const [originalData, setOriginalData] = useState<any[]>([]);
  const [analysisData, setAnalyzedData] = useState<any[]>([]);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  // 1. STEP 1: Upload & Extract Layout Candidates
  const executePdfParse = async (selectedfile: File) => {
    if (selectedfile.type !== "application/pdf") {
      setError("Invalid file type. Please upload a PDF file.");
      return;
    }

    setFileName(selectedfile.name);
    setLoading(true);
    setError(null);

    const dataPayload = new FormData();
    dataPayload.append("file", selectedfile);

    try {
      const response = await fetch(`${API_BASE_URL}/api/parse-pdf`, {
        method: "POST",
        body: dataPayload,
      });

      if (!response.ok) {
        const errorDetails = (await response.json()) as any;
        throw new Error(errorDetails?.detail || "PDF layout parsing failed.");
      }

      const result = await response.json();
      setRawText(result.raw_text || "");
      setCandidateYears(result.candidate_years || []);
      setCandidateRows(result.candidate_rows || []);
      setGuideRows(result.guide_rows || []);

      // Pre-fill user inputs
      setTargetYearsInput((result.candidate_years || []).slice(0, 6).join(", "));
      setColumnIndicesInput(""); // Default blank
      setSelectedMappings(result.default_mappings || {});

      setWorkflowStep("mapping");
    } catch (err: any) {
      setError(err.message || "A runtime network error occurred during PDF parsing.");
    } finally {
      setLoading(false);
    }
  };

  // 2. STEP 2: Submit Interactive Mappings & Calculate Reports
  const executeAnalysePipeline = async () => {
    setLoading(true);
    setError(null);

    const targetYears = targetYearsInput
      .split(",")
      .map((y) => y.trim())
      .filter((y) => y.length > 0);

    if (targetYears.length === 0) {
      setError("Please specify at least one target year.");
      setLoading(false);
      return;
    }

    const colIndices = columnIndicesInput
      .split(",")
      .map((idx) => idx.trim())
      .filter((idx) => idx.length > 0 && !isNaN(Number(idx)))
      .map((idx) => Number(idx));

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_text: rawText,
          target_years: targetYears,
          column_indices: colIndices,
          selected_mappings: selectedMappings,
        }),
      });

      if (!response.ok) {
        const errorDetails = (await response.json()) as any;
        throw new Error(errorDetails?.detail || "Financial analysis execution failed.");
      }

      const result = await response.json();
      setOriginalData(result.original_metrics || []);
      setAnalyzedData(result.analysis_results || []);
      setWorkflowStep("results");
    } catch (err: any) {
      setError(err.message || "An error occurred while running financial analysis.");
    } finally {
      setLoading(false);
    }
  };

  // Export State
  const [exporting, setExporting] = useState<boolean>(false);

  const exportExcelSpreadsheet = async () => {
    setExporting(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/export-excel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: fileName ? fileName.replace(/\.pdf$/i, "_analysis.xlsx") : "Financial_Analysis.xlsx",
          original_metrics: originalData,
          analysis_results: analysisData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate Excel file.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName ? fileName.replace(/\.pdf$/i, "_analysis.xlsx") : "Financial_Analysis.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || "Failed to download Excel spreadsheet.");
    } finally {
      setExporting(false);
    }
  };

  const getRiskBadge = (zone: string) => {
    switch (zone) {
      case "Safe Zone":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">Safe Zone</Badge>;
      case "Grey Zone":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">Grey Zone</Badge>;
      case "Distress Zone":
        return <Badge variant="destructive" className="border-red-300 dark:border-red-800">Distress Zone</Badge>;
      default:
        return <Badge variant="outline">{zone}</Badge>;
    }
  };

  const rawHeaders = [
    { label: "Year", key: "Year" },
    { label: "Revenue", key: "revenue" },
    { label: "PBT", key: "pbt" },
    { label: "Total Equity", key: "total_equity" },
    { label: "Total Borrowings", key: "total_borrowings" },
    { label: "Current Assets", key: "current_assets" },
    { label: "Total Assets", key: "total_assets" },
    { label: "Current Ratio", key: "current_ratio" },
    { label: "Quick Ratio", key: "quick_ratio" },
  ];

  const analysisHeaders = [
    { label: "Year", key: "Year" },
    { label: "Net Working Cap (Abs)", key: "net_working_capital_abs" },
    { label: "Rev Growth YoY", key: "revenue_horizontal_growth_%" },
    { label: "Rev Trend Index", key: "revenue_trend_index" },
    { label: "Debt / Equity Multiplier", key: "debt_to_equity_ratio" },
    { label: "ROA", key: "return_on_assets_roa_%" },
    { label: "ROE", key: "return_on_equity_roe_%" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 dark:bg-slate-950/20 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      
      {/* 🧭 1. GLOBAL NAVIGATION BAR */}
      <nav className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-6 py-4 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            className="flex items-center space-x-2 cursor-pointer" 
            onClick={() => setCurrentView("landing")}
          >
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
              CureForFinancialInsomnia
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-slate-500 dark:text-slate-400 dark:border-slate-800">v2.0 Interactive</Badge>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setCurrentView("landing")} 
              className={`text-sm font-medium transition-colors cursor-pointer ${currentView === "landing" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"}`}
            >
              Home
            </button>
            <button 
              onClick={() => setCurrentView("workspace")} 
              className={`text-sm font-medium transition-colors cursor-pointer ${currentView === "workspace" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"}`}
            >
              Workspace
            </button>
            <ThemeToggle />
            <Button 
              size="sm" 
              className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              onClick={() => setCurrentView("workspace")}
            >
              Launch Platform
            </Button>
          </div>
        </div>
      </nav>

      {/* 💻 2. MAIN INTERFACE CONTENT */}
      <main className="flex-grow">
        {currentView === "landing" ? (
          
          /* 🚀 HERO LANDING PAGE VIEW */
          <div className="max-w-5xl mx-auto px-6 py-20 text-center space-y-8 animate-in fade-in duration-300">
            <div className="inline-flex items-center gap-2 rounded-full border bg-white dark:bg-slate-900 px-3 py-1 text-xs shadow-sm text-slate-600 dark:text-slate-300 dark:border-slate-800">
              <span className="flex h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
              Next-Gen Layout-Agnostic Corporate Diagnostics Engine
            </div>
            
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-950 dark:text-slate-50 max-w-3xl mx-auto leading-tight">
              Turn Raw Annual Reports Into{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
                Instant Intelligence
              </span>
            </h1>
            
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Upload complex financial statement PDFs. Interactively map rows and column structures to handle any layout shifts or nameless totals effortlessly.
            </p>
            
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button 
                size="lg" 
                className="bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white px-8 shadow-md hover:scale-[1.03] active:scale-[0.97] transition-all duration-200"
                onClick={() => setCurrentView("workspace")}
              >
                Go to Workspace
              </Button>
            </div>
          </div>

        ) : (

          /* 🛠️ WORKSPACE INTERFACE VIEW */
          <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8 animate-in fade-in-50 duration-200">
            <header className="flex flex-col gap-1 border-b dark:border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-50">Financial Analytics Workspace</h1>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Industrial-grade tool with dynamic row & column mapping controls.</p>
                </div>
                {workflowStep !== "upload" && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setWorkflowStep("upload")}
                    className="border-slate-300 dark:border-slate-800"
                  >
                    Upload New Document
                  </Button>
                )}
              </div>
            </header>

            {/* ERROR ALERT */}
            {error && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm font-medium">
                ⚠️ {error}
              </div>
            )}

            {/* STEP 1: FILE UPLOAD */}
            {workflowStep === "upload" && (
              <FileUploader 
                onUpload={executePdfParse} 
                loading={loading} 
                error={null} 
                activeFileName={fileName} 
              />
            )}

            {/* STEP 2: INTERACTIVE MAPPING PANEL */}
            {workflowStep === "mapping" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                
                {/* 📋 COLUMN INDEX GUIDE */}
                {guideRows.length > 0 && (
                  <Card className="bg-white dark:bg-slate-900 border dark:border-slate-800 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>🔍</span> Column Index Guide (First 4 rows with numbers)
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                        Use this guide to identify which column index holds your yearly figures (e.g. if percentage columns are between years, enter indices like 0, 2, 4...).
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      <table className="w-full text-xs font-mono border-collapse border dark:border-slate-800">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300">
                            <th className="p-2 text-left border dark:border-slate-800">Row Source</th>
                            {[0, 1, 2, 3, 4, 5, 6, 7].map((c) => (
                              <th key={c} className="p-2 text-center border dark:border-slate-800 font-bold text-indigo-600 dark:text-indigo-400">Col {c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {guideRows.map((row) => (
                            <tr key={row.line_idx} className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                              <td className="p-2 font-sans font-medium text-slate-800 dark:text-slate-200 border dark:border-slate-800 whitespace-nowrap">
                                Row {row.line_idx + 1}: {row.label}
                              </td>
                              {[0, 1, 2, 3, 4, 5, 6, 7].map((c) => (
                                <td key={c} className="p-2 text-center text-slate-600 dark:text-slate-400 border dark:border-slate-800 whitespace-nowrap">
                                  {row.columns[c] || "-"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                )}

                {/* ⚙️ CONFIGURATION INPUTS & METRIC MAPPINGS */}
                <Card className="bg-white dark:bg-slate-900 border dark:border-slate-800 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      Configure Structural Parameters & Metrics Mapping
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400">
                      Map each financial hook to its corresponding line in the PDF table. Rows without explicit labels can be identified by their row number and values preview.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    {/* General Setup Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border dark:border-slate-800">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Target Years (Comma Separated, Column Order)
                        </label>
                        <input 
                          type="text" 
                          value={targetYearsInput}
                          onChange={(e) => setTargetYearsInput(e.target.value)}
                          placeholder="e.g. 2025/26, 2024/25, 2023/24..."
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-3.5 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Ordering must match the column sequence in your report table.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Column Indices to Extract (Optional)
                        </label>
                        <input 
                          type="text" 
                          value={columnIndicesInput}
                          onChange={(e) => setColumnIndicesInput(e.target.value)}
                          placeholder="e.g. 0, 2, 4 (Leave blank for consecutive 0, 1, 2...)"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-3.5 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Specify column numbers to extract absolute values and skip percentage change columns.</p>
                      </div>
                    </div>

                    {/* 9 Metric Select Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {TARGET_KEYS_CONFIG.map((cfg) => (
                        <div key={cfg.key} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {cfg.label}
                            </label>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{cfg.key}</span>
                          </div>
                          <select
                            value={selectedMappings[cfg.key] ?? -1}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setSelectedMappings((prev) => ({ ...prev, [cfg.key]: val }));
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                          >
                            <option value={-1}>-- Select Unmapped Row --</option>
                            {candidateRows.map((r) => (
                              <option key={r.line_idx} value={r.line_idx}>
                                {r.display}
                              </option>
                            ))}
                          </select>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">{cfg.description}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-800">
                      <Button
                        variant="outline"
                        onClick={() => setWorkflowStep("upload")}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={executeAnalysePipeline}
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white font-medium shadow-md transition-all"
                      >
                        {loading ? "Calculating Analysis..." : "Run Financial Analysis ✨"}
                      </Button>
                    </div>

                  </CardContent>
                </Card>
              </div>
            )}

            {/* STEP 3: RESULTS REPORT DASHBOARD */}
            {workflowStep === "results" && originalData.length > 0 && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                
                <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800 shadow-sm">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Financial Intelligence Results</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Analysis completed for {fileName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setWorkflowStep("mapping")}
                    >
                      Adjust Mappings ⚙️
                    </Button>
                    <Button
                      size="sm"
                      onClick={exportExcelSpreadsheet}
                      disabled={exporting}
                      className="bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white shadow-sm transition-all"
                    >
                      {exporting ? "Generating Excel..." : "Export Spreadsheet (.xlsx) 📊"}
                    </Button>
                  </div>
                </div>

                <Tabs defaultValue="executive" className="w-full space-y-4">
                  <TabsList className="bg-slate-100 dark:bg-slate-900 p-1 rounded-lg max-w-md grid grid-cols-3 shadow-inner border dark:border-slate-800">
                    <TabsTrigger value="executive" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm text-slate-700 dark:text-slate-300 dark:data-[state=active]:text-slate-50 cursor-pointer">Executive Profile</TabsTrigger>
                    <TabsTrigger value="reported" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm text-slate-700 dark:text-slate-300 dark:data-[state=active]:text-slate-50 cursor-pointer">Raw Baseline</TabsTrigger>
                    <TabsTrigger value="computed" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm text-slate-700 dark:text-slate-300 dark:data-[state=active]:text-slate-50 cursor-pointer">Computed Trends</TabsTrigger>
                  </TabsList>

                  {/* TAB 1: EXECUTIVE PROFILE MAP */}
                  <TabsContent value="executive" className="space-y-4 animate-in fade-in-50 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="bg-white dark:bg-slate-900 shadow-sm border dark:border-slate-800 transition-all duration-300 hover:shadow-md hover:border-indigo-500/20 dark:hover:border-indigo-400/20">
                        <CardHeader>
                          <CardTitle className="text-lg font-bold text-slate-950 dark:text-slate-50">Corporate Survival Diagnostic</CardTitle>
                          <CardDescription className="text-slate-500 dark:text-slate-400">Altman Z-Score index tracking credit distress classifications.</CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="border-b dark:border-slate-800 text-slate-500 dark:text-slate-400 text-left text-xs uppercase tracking-wider">
                                <th className="pb-3 font-semibold">Financial Year</th>
                                <th className="pb-3 text-center font-semibold">Z-Score Value</th>
                                <th className="pb-3 text-right font-semibold">Status Rating</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-slate-800 font-mono">
                              {analysisData.map((row) => (
                                <tr key={row.Year} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                  <td className="py-3.5 font-sans font-semibold text-slate-700 dark:text-slate-300">{row.Year}</td>
                                  <td className="py-3.5 text-center text-sm font-medium text-slate-800 dark:text-slate-200">{row.altman_z_score}</td>
                                  <td className="py-3.5 text-right">{getRiskBadge(row.altman_risk_classification)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* TAB 2: RAW BASELINE */}
                  <TabsContent value="reported" className="animate-in fade-in-50 duration-200">
                    <MetricTable data={originalData} headers={rawHeaders} />
                  </TabsContent>

                  {/* TAB 3: COMPUTED TRENDS */}
                  <TabsContent value="computed" className="animate-in fade-in-50 duration-200">
                    <MetricTable data={analysisData} headers={analysisHeaders} />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 📋 3. GLOBAL FOOTER */}
      <footer className="w-full border-t dark:border-slate-800 bg-white dark:bg-slate-950 px-6 py-6 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 CureForFinancialInsomnia. Built for advanced financial diagnostic evaluations.</p>
          <div className="flex space-x-4">
            <span className="hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer transition-colors">Documentation</span>
            <span className="hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer transition-colors">Privacy Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

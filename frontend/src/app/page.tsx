"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/file-uploader";
import { MetricTable } from "@/components/metric-table";

export default function AnalyticsDashboard() {
  const [currentView, setCurrentView] = useState("landing");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const [originalData, setOriginalData] = useState<any[]>([]);
  const [analysisData, setAnalyzedData] = useState<any[]>([]);

  const executePipelineUpload = async (selectedfile: File) => {
    if (selectedfile.type !== "application/pdf") {
      setError("Invalid file type. Please upload a PDF file.");
      return;
    }

    setFile(selectedfile);
    setFileName(selectedfile.name);
    setLoading(true);
    setError(null);

    const dataPayload = new FormData();
    dataPayload.append("file", selectedfile);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/analyse", {
        method: "POST",
        body: dataPayload,
      });

      if (!response.ok) {
        const errorDetails = (await response.json()) as any;
        throw new Error(errorDetails?.detail || "Analysis processing failed.");
      }

      const result = await response.json();
      setOriginalData(result.original_metrics || []);
      setAnalyzedData(result.analysis_results || []);
    } catch (err: any) {
      setError(err.message || "A runtime network communication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (zone: string) => {
    switch (zone) {
      case "Safe Zone":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100">Safe Zone</Badge>;
      case "Grey Zone":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100">Grey Zone</Badge>;
      case "Distress Zone":
        return <Badge variant="destructive" className="border-red-300">Distress Zone</Badge>;
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
    <div className="flex flex-col min-h-screen bg-slate-50/50 text-slate-900 font-sans">
      
      {/* 🧭 1. GLOBAL NAVIGATION BAR */}
      <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            className="flex items-center space-x-2 cursor-pointer" 
            onClick={() => setCurrentView("landing")}
          >
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              CureForFinancialInsomnia
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-slate-500">v1.0</Badge>
          </div>
          
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => setCurrentView("landing")} 
              className={`text-sm font-medium transition-colors ${currentView === "landing" ? "text-indigo-600" : "text-slate-600 hover:text-slate-900"}`}
            >
              Home
            </button>
            <button 
              onClick={() => setCurrentView("workspace")} 
              className={`text-sm font-medium transition-colors ${currentView === "workspace" ? "text-indigo-600" : "text-slate-600 hover:text-slate-900"}`}
            >
              Workspace
            </button>
            <Button 
              size="sm" 
              className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
              onClick={() => setCurrentView("workspace")}
            >
              Launch Platform
            </Button>
          </div>
        </div>
      </nav>

      {/* 💻 2. CONDITIONALLY RENDERED INTERFACES */}
      <main className="flex-grow">
        {currentView === "landing" ? (
          
          /* 🚀 HERO LANDING PAGE VIEW */
          <div className="max-w-5xl mx-auto px-6 py-20 text-center space-y-8 animate-in fade-in duration-300">
            <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs shadow-sm text-slate-600">
              <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
              Next-Gen Corporate Diagnostics Engine
            </div>
            
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-950 max-w-3xl mx-auto leading-tight">
              Turn Raw Annual Reports Into{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Instant Intelligence
              </span>
            </h1>
            
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Upload complex financial statement PDFs. Automatically extract line parameters, map structural horizontal trends, and compute Altman Z-Score health indexes instantly.
            </p>
            
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button 
                size="lg" 
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 shadow-md"
                onClick={() => setCurrentView("workspace")}
              >
                Go to Workspace
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="bg-white shadow-sm"
                onClick={() => {
                  const el = document.getElementById("features");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Learn More
              </Button>
            </div>

            {/* Simple Value Cards Block */}
            <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-20 text-left">
              <Card className="bg-white border shadow-sm">
                <CardHeader className="space-y-1">
                  <div className="text-2xl">⚡</div>
                  <CardTitle className="text-base font-bold">Cloud Layout Parsing</CardTitle>
                  <CardDescription>Structured tokenization handles layout shifts and complex negative number tables cleanly.</CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-white border shadow-sm">
                <CardHeader className="space-y-1">
                  <div className="text-2xl">📊</div>
                  <CardTitle className="text-base font-bold">Computed Trends Matrix</CardTitle>
                  <CardDescription>Instant baseline trend indexes, common-size scales, and horizontal growth metrics.</CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-white border shadow-sm">
                <CardHeader className="space-y-1">
                  <div className="text-2xl">🛡️</div>
                  <CardTitle className="text-base font-bold">Altman Risk Tracking</CardTitle>
                  <CardDescription>Automated parametric distress zones mapping corporate survival zones effortlessly.</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

        ) : (

          /* 🛠️ WORKSPACE INTERFACE VIEW */
          <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8 animate-in fade-in-50 duration-200">
            <header className="flex flex-col gap-1 border-b pb-4">
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">Financial Analytics Workspace</h1>
              <p className="text-slate-500 text-sm">Industrial-grade tool for dynamic corporate performance analysis.</p>
            </header>

            <FileUploader 
              onUpload={executePipelineUpload} 
              loading={loading} 
              error={error} 
              activeFileName={fileName} 
            />

            {originalData.length > 0 && (
              <Tabs defaultValue="executive" className="w-full space-y-4">
                <TabsList className="bg-slate-100 p-1 rounded-lg max-w-md grid grid-cols-3 shadow-inner">
                  <TabsTrigger value="executive" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Executive Profile</TabsTrigger>
                  <TabsTrigger value="reported" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Raw Baseline</TabsTrigger>
                  <TabsTrigger value="computed" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Computed Trends</TabsTrigger>
                </TabsList>

                {/* TAB 1: EXECUTIVE PROFILE MAP */}
                <TabsContent value="executive" className="space-y-4 animate-in fade-in-50 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-white shadow-sm border">
                      <CardHeader>
                        <CardTitle className="text-lg font-bold">Corporate Survival Diagnostic</CardTitle>
                        <CardDescription>Altman Z-Score index tracking credit distress classifications.</CardDescription>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="border-b text-slate-500 text-left text-xs uppercase tracking-wider">
                              <th className="pb-3 font-semibold">Financial Year</th>
                              <th className="pb-3 text-center font-semibold">Z-Score Value</th>
                              <th className="pb-3 text-right font-semibold">Status Rating</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y font-mono">
                            {analysisData.map((row) => (
                              <tr key={row.Year} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3.5 font-sans font-semibold text-slate-700">{row.Year}</td>
                                <td className="py-3.5 text-center text-sm font-medium text-slate-800">{row.altman_z_score}</td>
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
            )}
          </div>
        )}
      </main>

      {/* 📋 3. GLOBAL FOOTER */}
      <footer className="w-full border-t bg-white px-6 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 CureForFinancialInsomnia. Built for advanced financial diagnostic evaluations.</p>
          <div className="flex space-x-4">
            <span className="hover:text-slate-900 cursor-pointer transition-colors">Documentation</span>
            <span className="hover:text-slate-900 cursor-pointer transition-colors">Privacy Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

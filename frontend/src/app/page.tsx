"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/file-uploader";
import { MetricTable } from "@/components/metric-table";
import { ThemeToggle } from "@/components/theme-toggle";

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
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-slate-500 dark:text-slate-400 dark:border-slate-800">v1.0</Badge>
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

      {/* 💻 2. CONDITIONALLY RENDERED INTERFACES */}
      <main className="flex-grow">
        {currentView === "landing" ? (
          
          /* 🚀 HERO LANDING PAGE VIEW */
          <div className="max-w-5xl mx-auto px-6 py-20 text-center space-y-8 animate-in fade-in duration-300">
            <div className="inline-flex items-center gap-2 rounded-full border bg-white dark:bg-slate-900 px-3 py-1 text-xs shadow-sm text-slate-600 dark:text-slate-300 dark:border-slate-800">
              <span className="flex h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
              Next-Gen Corporate Diagnostics Engine
            </div>
            
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-950 dark:text-slate-50 max-w-3xl mx-auto leading-tight">
              Turn Raw Annual Reports Into{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
                Instant Intelligence
              </span>
            </h1>
            
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Upload complex financial statement PDFs. Automatically extract line parameters, map structural horizontal trends, and compute Altman Z-Score health indexes instantly.
            </p>
            
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button 
                size="lg" 
                className="bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white px-8 shadow-md hover:scale-[1.03] active:scale-[0.97] hover:shadow-lg hover:shadow-indigo-500/20 dark:hover:shadow-indigo-400/20 transition-all duration-200"
                onClick={() => setCurrentView("workspace")}
              >
                Go to Workspace
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="bg-white dark:bg-slate-900 dark:text-slate-100 shadow-sm hover:scale-[1.03] active:scale-[0.97] hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200"
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
              <Card className="bg-white dark:bg-slate-900 border dark:border-slate-800 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1.5 hover:border-indigo-500/20 dark:hover:border-indigo-400/20">
                <CardHeader className="space-y-1">
                  <div className="text-2xl">⚡</div>
                  <CardTitle className="text-base font-bold text-slate-950 dark:text-slate-50">Cloud Layout Parsing</CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400">Structured tokenization handles layout shifts and complex negative number tables cleanly.</CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border dark:border-slate-800 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1.5 hover:border-indigo-500/20 dark:hover:border-indigo-400/20">
                <CardHeader className="space-y-1">
                  <div className="text-2xl">📊</div>
                  <CardTitle className="text-base font-bold text-slate-950 dark:text-slate-50">Computed Trends Matrix</CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400">Instant baseline trend indexes, common-size scales, and horizontal growth metrics.</CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-white dark:bg-slate-900 border dark:border-slate-800 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1.5 hover:border-indigo-500/20 dark:hover:border-indigo-400/20">
                <CardHeader className="space-y-1">
                  <div className="text-2xl">🛡️</div>
                  <CardTitle className="text-base font-bold text-slate-950 dark:text-slate-50">Altman Risk Tracking</CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400">Automated parametric distress zones mapping corporate survival zones effortlessly.</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

        ) : (

          /* 🛠️ WORKSPACE INTERFACE VIEW */
          <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8 animate-in fade-in-50 duration-200">
            <header className="flex flex-col gap-1 border-b dark:border-slate-800 pb-4">
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-50">Financial Analytics Workspace</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Industrial-grade tool for dynamic corporate performance analysis.</p>
            </header>

            <FileUploader 
              onUpload={executePipelineUpload} 
              loading={loading} 
              error={error} 
              activeFileName={fileName} 
            />

            {originalData.length > 0 && (
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

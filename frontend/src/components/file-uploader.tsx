"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FileUploaderProps {
    onUpload: (file: File) => void;
    loading: boolean;
    error: string | null;
    activeFileName: String | null;
}

export function FileUploader({ onUpload, loading, error, activeFileName }: FileUploaderProps) {
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if(event.target.files && event.target.files.length > 0) {
            onUpload(event.target.files[0]);
        }
    }


return (
    <Card className="border-dashed border-2 bg-slate-50/50 transition-all hover:bg-slate-50">
      <CardContent className="flex flex-col items-center justify-center p-10 text-center space-y-4">
        <div className="space-y-2 text-sm text-muted-foreground">
          <label htmlFor="pdf-upload" className="relative cursor-pointer font-medium">
            <Button 
              variant="outline" 
              type="button" 
              disabled={loading} 
              onClick={() => document.getElementById("pdf-upload")?.click()}
            >
              {loading ? "Parsing Data Pipeline..." : "Select Annual Report PDF"}
            </Button>
            <input 
              id="pdf-upload" 
              type="file" 
              accept=".pdf" 
              className="sr-only" 
              onChange={handleFileChange} 
              disabled={loading}
            />
          </label>
        </div>
        
        {activeFileName && (
          <p className="text-xs font-medium text-slate-600 animate-pulse">
            Active Target: {activeFileName}
          </p>
        )}
        
        {error && (
          <p className="text-xs font-semibold text-destructive bg-destructive/10 p-2 rounded-md">
            ⚠️ {error}
          </p>
        )}
      </CardContent>
    </Card>
    );
}
"use client";

import React from "react";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface MetricTableProps {
    data: Array<Record<string, any>>;
    headers: Array<{ label: string; key: string }>;
}

export function MetricTable({ data, headers }: MetricTableProps) {
    const formatCellData = (value: any, key: string) => {
        if (value === null || value === undefined) return "-";
        if (typeof value === "string") return value;

        if (["revenue", "pbt", "total_equity", "total_borrowings", "current_assets", "total_assets", "net_working_capital_abs"].includes(key)) {
            return value.toLocaleString();
        }

        if (key.endsWith("_%") || key.includes("growth") || key.includes("vertical") || key.includes("margin")) {
            return `${value}%`;
        }

        return value;
    };

    return (
    <div className="rounded-md border dark:border-slate-800 overflow-x-auto bg-white dark:bg-slate-900 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-950 border-b dark:border-slate-800">
            {headers.map((h) => (
              <TableHead 
                key={h.key} 
                className={`font-bold text-slate-900 dark:text-slate-100 ${h.key === "Year" ? "w-[120px]" : "text-right"}`}
              >
                {h.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={row.Year || index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors border-b dark:border-slate-800">
              {headers.map((h) => {
                const isNegativeNum = typeof row[h.key] === "number" && row[h.key] < 0;
                return (
                  <TableCell 
                    key={h.key} 
                    className={`${h.key === "Year" ? "font-semibold text-slate-700 dark:text-slate-300" : "text-right font-mono text-sm dark:text-slate-300"} ${isNegativeNum ? "text-red-600 dark:text-red-400 font-medium" : ""}`}
                  >
                    {formatCellData(row[h.key], h.key)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
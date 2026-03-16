"use client";

import { useEffect, useState } from "react";
import { FolderOpen, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Clock, RefreshCw } from "lucide-react";
import Link from "next/link";
import { timeAgo, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

interface ImportedFile {
  id: string;
  filename: string;
  originalName: string;
  fileType: string;
  sheetName: string | null;
  rowCount: number;
  importedCount: number;
  skippedCount: number;
  status: string;
  mappingNotes: string | null;
  errorLog: string | null;
  importedAt: string;
  importedBy: string;
}

export default function FileImportsPage() {
  const [files, setFiles] = useState<ImportedFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/files").then((r) => r.json()).then((d) => setFiles(d.files ?? [])).finally(() => setLoading(false));
  }, []);

  const totalRecords = files.reduce((sum, f) => sum + f.importedCount, 0);

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-brand-500" />
            File Import History
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {files.length} files imported • {totalRecords.toLocaleString()} total records
          </p>
        </div>
        <Link href="/upload" className="btn-primary">
          <Upload className="w-4 h-4" /> Import New File
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : files.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No files imported yet"
          description="Upload your first Excel or CSV file to get started."
          action={{ label: "Upload File", href: "/upload" }}
        />
      ) : (
        <div className="space-y-3">
          {files.map((f) => (
            <div key={f.id} className="card p-4">
              <div className="flex items-start gap-4">
                {/* File type icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${f.fileType === "xlsx" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                  <FileSpreadsheet className="w-5 h-5" />
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{f.originalName}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {f.fileType.toUpperCase()} • {timeAgo(f.importedAt)} • by {f.importedBy}
                      </div>
                    </div>
                    <StatusBadge status={f.status} />
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-6 mt-3">
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className="w-2 h-2 bg-brand-400 rounded-full" />
                      <span className="text-gray-600">{f.importedCount} imported</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className="w-2 h-2 bg-gray-300 rounded-full" />
                      <span className="text-gray-500">{f.skippedCount} skipped</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className="w-2 h-2 bg-gray-200 rounded-full" />
                      <span className="text-gray-400">{f.rowCount} total rows</span>
                    </div>
                    {f.sheetName && (
                      <div className="text-xs text-gray-400">Sheet: {f.sheetName}</div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-400 rounded-full"
                      style={{ width: f.rowCount > 0 ? `${Math.round((f.importedCount / f.rowCount) * 100)}%` : "0%" }}
                    />
                  </div>
                </div>
              </div>

              {/* Error log */}
              {f.errorLog && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-yellow-600 mt-0.5 shrink-0" />
                    <div className="text-xs text-yellow-800 space-y-0.5">
                      {f.errorLog.split("\n").slice(0, 3).map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {f.mappingNotes && (
                <div className="mt-2 text-xs text-gray-400">{f.mappingNotes}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

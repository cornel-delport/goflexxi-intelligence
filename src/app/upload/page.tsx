"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, ChevronDown, ChevronUp, ArrowRight, RefreshCw } from "lucide-react";
import { cn, truncate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";

type Step = "upload" | "preview" | "mapping" | "importing" | "done";
type EntityType = "event" | "supporter_club" | "contact" | "travel_agent" | "club_department" | "opportunity" | "unknown";

interface SheetPreview {
  sheetName: string;
  headers: string[];
  rowCount: number;
  sample: Record<string, unknown>[];
  detectedType: EntityType;
  typeConfidence: number;
  mappings: Array<{ sourceColumn: string; targetField: string; confidence: string }>;
  unmappedColumns: string[];
}

interface PreviewResult {
  filename: string;
  fileType: string;
  sheets: SheetPreview[];
}

interface ImportResult {
  success: boolean;
  filename: string;
  totalImported: number;
  totalSkipped: number;
  errors: string[];
}

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  event:          "Events / Fixtures",
  supporter_club: "Supporter Clubs",
  contact:        "Contacts",
  travel_agent:   "Travel Agents",
  club_department: "Club Travel Departments",
  opportunity:    "Opportunities",
  unknown:        "Unknown — Please Select",
};

const ENTITY_TYPES: EntityType[] = [
  "event", "supporter_club", "contact", "travel_agent", "club_department", "opportunity"
];

export default function UploadPage() {
  const [step, setStep] = useState<Step>("upload");
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [sheetTypes, setSheetTypes] = useState<Record<string, EntityType>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSheets, setExpandedSheets] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }, []);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setError(null);
    setStep("preview");

    const formData = new FormData();
    formData.append("file", f);
    formData.append("preview", "true");

    try {
      const res = await fetch("/api/import", { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json()).error ?? "Preview failed");
      const data: PreviewResult = await res.json();
      setPreview(data);

      // Set detected types
      const types: Record<string, EntityType> = {};
      data.sheets.forEach((s) => { types[s.sheetName] = s.detectedType; });
      setSheetTypes(types);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not preview file");
      setStep("upload");
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!file || !preview) return;
    setImporting(true);
    setStep("importing");

    // Import each sheet sequentially
    let totalImported = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    for (const sheet of preview.sheets) {
      const entityType = sheetTypes[sheet.sheetName];
      if (!entityType || entityType === "unknown") continue;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", entityType);
      formData.append("sheetName", sheet.sheetName);

      try {
        const res = await fetch("/api/import", { method: "POST", body: formData });
        if (!res.ok) throw new Error((await res.json()).error ?? "Import failed");
        const r = await res.json();
        totalImported += r.totalImported ?? 0;
        totalSkipped += r.totalSkipped ?? 0;
        if (r.errors?.length) errors.push(...r.errors);
      } catch (err) {
        errors.push(`Sheet "${sheet.sheetName}": ${err instanceof Error ? err.message : "Failed"}`);
      }
    }

    setResult({ success: true, filename: file.name, totalImported, totalSkipped, errors });
    setImporting(false);
    setStep("done");
  }, [file, preview, sheetTypes]);

  const reset = () => {
    setStep("upload");
    setFile(null);
    setPreview(null);
    setSheetTypes({});
    setResult(null);
    setError(null);
    setExpandedSheets(new Set());
    if (fileRef.current) fileRef.current.value = "";
  };

  const toggleSheet = (name: string) => {
    setExpandedSheets((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Upload & Import Data</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Import Excel or CSV files — supporter clubs, events, contacts, travel agents
          </p>
        </div>
        {step !== "upload" && (
          <button onClick={reset} className="btn-secondary">
            <RefreshCw className="w-4 h-4" /> Start Over
          </button>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {(["upload", "preview", "importing", "done"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="w-6 h-px bg-gray-300" />}
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full font-medium",
              step === s ? "bg-brand-100 text-brand-700" :
              ["done", "importing"].indexOf(step) > ["done", "importing"].indexOf(s)
                ? "bg-gray-100 text-gray-400 line-through"
                : "text-gray-400"
            )}>
              <span className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center text-xs",
                step === s ? "bg-brand-500 text-white" : "bg-gray-200"
              )}>{i + 1}</span>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* STEP 1: Upload zone */}
      {step === "upload" && (
        <div
          className={cn(
            "card border-2 border-dashed p-12 text-center transition-all cursor-pointer",
            dragging ? "border-brand-400 bg-brand-50" : "border-gray-300 hover:border-brand-300 hover:bg-gray-50"
          )}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />

          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Upload className="w-8 h-8 text-brand-500" />
          </div>

          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            {dragging ? "Drop your file here" : "Drop or click to upload"}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Supports .xlsx, .xls, and .csv files. Multi-sheet Excel files supported.
          </p>

          <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center">
                <FileSpreadsheet className="w-3 h-3 text-green-600" />
              </div>
              Excel (.xlsx)
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center">
                <FileSpreadsheet className="w-3 h-3 text-blue-600" />
              </div>
              CSV
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 text-left max-w-lg mx-auto">
            {[
              "Supporter clubs", "Events & fixtures", "Human contacts",
              "Travel agents", "Club departments", "Priority sheets",
            ].map((label) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                <CheckCircle2 className="w-3 h-3 text-brand-400" />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: Preview & type mapping */}
      {(step === "preview" || step === "mapping") && preview && (
        <div className="space-y-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">{preview.filename}</div>
              <div className="text-xs text-gray-500">
                {preview.sheets.length} sheet{preview.sheets.length !== 1 ? "s" : ""} •{" "}
                {preview.sheets.reduce((s, sh) => s + sh.rowCount, 0)} total rows
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className={`badge ${preview.fileType === "xlsx" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                {preview.fileType.toUpperCase()}
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-600 font-medium">
            Review detected sheets and confirm import type for each:
          </p>

          {preview.sheets.map((sheet) => (
            <div key={sheet.sheetName} className="card overflow-hidden">
              {/* Sheet header */}
              <div className="p-4 flex items-center gap-3">
                <button
                  onClick={() => toggleSheet(sheet.sheetName)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                  <span className="font-medium text-gray-900 text-sm">{sheet.sheetName}</span>
                  <span className="text-xs text-gray-400">{sheet.rowCount} rows</span>
                  {expandedSheets.has(sheet.sheetName)
                    ? <ChevronUp className="w-4 h-4 text-gray-400 ml-auto" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />}
                </button>

                {/* Entity type selector */}
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 whitespace-nowrap">Import as:</label>
                  <select
                    value={sheetTypes[sheet.sheetName] ?? "unknown"}
                    onChange={(e) => setSheetTypes((prev) => ({
                      ...prev,
                      [sheet.sheetName]: e.target.value as EntityType,
                    }))}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  >
                    {ENTITY_TYPES.map((t) => (
                      <option key={t} value={t}>{ENTITY_TYPE_LABELS[t]}</option>
                    ))}
                    <option value="unknown">— Skip this sheet —</option>
                  </select>
                  {sheet.typeConfidence >= 60 && (
                    <span className="text-xs text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                      {sheet.typeConfidence}% match
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded: mappings + sample */}
              {expandedSheets.has(sheet.sheetName) && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  {/* Column mappings */}
                  <div>
                    <div className="text-xs font-semibold text-gray-600 mb-2">
                      Column Mappings ({sheet.mappings.length} of {sheet.headers.length} mapped)
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                      {sheet.mappings.map((m) => (
                        <div key={m.sourceColumn} className="flex items-center gap-1.5 text-xs bg-gray-50 rounded px-2 py-1.5">
                          <span className="text-gray-500 truncate max-w-20">{m.sourceColumn}</span>
                          <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
                          <span className="text-brand-700 font-medium truncate">{m.targetField}</span>
                          <span className={`ml-auto text-xs ${m.confidence === "high" ? "text-green-500" : m.confidence === "medium" ? "text-yellow-500" : "text-gray-400"}`}>
                            {m.confidence === "high" ? "●" : m.confidence === "medium" ? "◐" : "○"}
                          </span>
                        </div>
                      ))}
                    </div>
                    {sheet.unmappedColumns.length > 0 && (
                      <div className="mt-2 text-xs text-gray-400">
                        Unmapped: {sheet.unmappedColumns.join(", ")}
                      </div>
                    )}
                  </div>

                  {/* Sample rows */}
                  {sheet.sample.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-600 mb-2">
                        Preview (first {sheet.sample.length} rows)
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="text-xs w-full">
                          <thead>
                            <tr className="bg-gray-50">
                              {sheet.headers.slice(0, 6).map((h) => (
                                <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap border-b border-gray-200">
                                  {truncate(h, 20)}
                                </th>
                              ))}
                              {sheet.headers.length > 6 && (
                                <th className="px-3 py-2 text-gray-400 border-b border-gray-200">
                                  +{sheet.headers.length - 6} more
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {sheet.sample.map((row, i) => (
                              <tr key={i} className="border-b border-gray-100 last:border-0">
                                {sheet.headers.slice(0, 6).map((h) => (
                                  <td key={h} className="px-3 py-1.5 text-gray-700 whitespace-nowrap max-w-32 truncate">
                                    {truncate(String(row[h] ?? ""), 25)}
                                  </td>
                                ))}
                                {sheet.headers.length > 6 && <td className="px-3 py-1.5 text-gray-300">…</td>}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Import button */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-gray-500">
              {Object.values(sheetTypes).filter((t) => t !== "unknown").length} sheet(s) ready to import
            </div>
            <button
              onClick={handleImport}
              disabled={Object.values(sheetTypes).every((t) => t === "unknown")}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              Confirm Import
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Importing */}
      {step === "importing" && (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin" style={{ borderWidth: 3 }} />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Importing data…</h2>
          <p className="text-sm text-gray-500">
            Parsing rows, mapping columns, and saving to database. This may take a moment for large files.
          </p>
        </div>
      )}

      {/* STEP 4: Done */}
      {step === "done" && result && (
        <div className="card p-8 text-center">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5",
            result.errors.length === 0 ? "bg-green-50" : "bg-yellow-50"
          )}>
            {result.errors.length === 0
              ? <CheckCircle2 className="w-8 h-8 text-green-500" />
              : <AlertCircle className="w-8 h-8 text-yellow-500" />
            }
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">
            {result.errors.length === 0 ? "Import Complete!" : "Import Complete with Warnings"}
          </h2>
          <p className="text-sm text-gray-500 mb-6">{result.filename}</p>

          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-6">
            <div className="card p-3">
              <div className="text-2xl font-bold text-brand-600">{result.totalImported}</div>
              <div className="text-xs text-gray-500">Imported</div>
            </div>
            <div className="card p-3">
              <div className="text-2xl font-bold text-gray-400">{result.totalSkipped}</div>
              <div className="text-xs text-gray-500">Skipped</div>
            </div>
            <div className="card p-3">
              <div className="text-2xl font-bold text-red-400">{result.errors.length}</div>
              <div className="text-xs text-gray-500">Errors</div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="text-left bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 max-w-lg mx-auto">
              <div className="text-sm font-semibold text-yellow-800 mb-2">Warnings:</div>
              <ul className="space-y-1">
                {result.errors.map((err, i) => (
                  <li key={i} className="text-xs text-yellow-700">{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            <button onClick={reset} className="btn-secondary">
              <Upload className="w-4 h-4" /> Import Another File
            </button>
            <a href="/" className="btn-primary">
              View Dashboard
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

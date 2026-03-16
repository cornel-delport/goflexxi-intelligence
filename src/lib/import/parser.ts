import * as XLSX from "xlsx";
import Papa from "papaparse";
import { normalizeString } from "@/lib/utils";

export interface ParsedRow {
  [key: string]: unknown;
}

export interface ParseResult {
  sheets: SheetData[];
  fileType: "xlsx" | "csv";
}

export interface SheetData {
  sheetName: string;
  headers: string[];
  rows: ParsedRow[];
  rowCount: number;
}

// ─── Parse any uploaded file buffer ──────────────────────────────────────────

export async function parseFile(
  buffer: Buffer,
  filename: string
): Promise<ParseResult> {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (ext === "csv") {
    return parseCSV(buffer);
  } else if (ext === "xlsx" || ext === "xls") {
    return parseExcel(buffer);
  } else {
    throw new Error(`Unsupported file type: ${ext}. Use .xlsx or .csv`);
  }
}

// ─── Parse Excel ─────────────────────────────────────────────────────────────

function parseExcel(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    dateNF: "YYYY-MM-DD",
  });

  const sheets: SheetData[] = [];

  for (const sheetName of workbook.SheetNames) {
    // Skip metadata sheets that don't contain useful data rows
    const skipSheets = ["readme", "executive_summary", "data_gaps", "original_import"];
    if (skipSheets.some((s) => sheetName.toLowerCase().includes(s))) {
      continue;
    }

    const worksheet = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json<ParsedRow>(worksheet, {
      defval: null,
      raw: false,
      dateNF: "YYYY-MM-DD",
    });

    if (raw.length === 0) continue;

    const headers = Object.keys(raw[0] || {});
    sheets.push({
      sheetName,
      headers,
      rows: raw,
      rowCount: raw.length,
    });
  }

  return { sheets, fileType: "xlsx" };
}

// ─── Parse CSV ───────────────────────────────────────────────────────────────

function parseCSV(buffer: Buffer): ParseResult {
  const text = buffer.toString("utf-8");
  const result = Papa.parse<ParsedRow>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h) => normalizeString(h),
  });

  const headers = result.meta.fields ?? [];
  const rows = result.data;

  return {
    sheets: [
      {
        sheetName: "Sheet1",
        headers,
        rows,
        rowCount: rows.length,
      },
    ],
    fileType: "csv",
  };
}

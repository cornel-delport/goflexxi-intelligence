/**
 * Unified import pipeline for GoFlexxi Intelligence.
 *
 * Used by:
 *   - Manual file upload  (/api/import)
 *   - Google Drive import (/api/drive/import)
 *   - Startup auto-sync   (instrumentation.ts)
 *
 * Takes a Buffer (Excel/CSV content) + metadata, parses every sheet,
 * maps columns to entity types, and writes records to the database.
 */

import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

// ─── Utility helpers ─────────────────────────────────────────────────────────

function str(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s === "" || s === "N/A" || s === "TBC" || s === "n/a" ? null : s;
}

function num(val: unknown): number | null {
  const n = parseInt(String(val), 10);
  return isNaN(n) ? null : n;
}

function bool_(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  return ["yes", "true", "1", "y", "x", "✓"].includes(
    String(val).toLowerCase().trim()
  );
}

function parseDate_(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const s = String(val).trim();
  if (!s || s === "TBC" || s === "N/A") return null;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  const n = Number(val);
  if (!isNaN(n) && n > 40000) {
    const parsed = new Date(new Date(1899, 11, 30).getTime() + n * 86400000);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function priority_(val: unknown): number | null {
  if (!val) return null;
  if (typeof val === "number") return Math.min(5, Math.max(1, Math.round(val)));
  const s = String(val).toLowerCase();
  if (s === "a" || s.includes("critical") || s.includes("very high")) return 5;
  if (s === "b" || s.includes("high")) return 4;
  if (s === "c" || s.includes("med")) return 3;
  if (s === "d" || s.includes("low")) return 2;
  const n = parseInt(s, 10);
  return isNaN(n) ? null : Math.min(5, Math.max(1, n));
}

function normalizeKeys(row: Record<string, unknown>) {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    r[k.toLowerCase().replace(/[\s\-\(\)\/]/g, "_").replace(/_+/g, "_")] = v;
  }
  return r;
}

// ─── Text date parser (for sports schedule sheets) ───────────────────────────

function parseTextDate(text: string | null): Date | null {
  if (!text) return null;
  const cleaned = text.split(/[-–]/)[0].trim();
  const months: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
    jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const match = cleaned.match(/([a-zA-Z]+)\s+(\d{1,2})/i);
  if (match) {
    const month = months[match[1].toLowerCase()];
    const day = parseInt(match[2]);
    if (month !== undefined && !isNaN(day)) return new Date(2026, month, day);
  }
  const my = cleaned.match(/([a-zA-Z]+)\s+(\d{4})/i);
  if (my) {
    const month = months[my[1].toLowerCase()];
    const year = parseInt(my[2]);
    if (month !== undefined) return new Date(year, month, 1);
  }
  return null;
}

function categoryToTransport(cat: string | null): string {
  if (!cat) return "mixed";
  const c = cat.toLowerCase();
  if (c.includes("grand prix") || c.includes("motorsport")) return "charter";
  return "mixed";
}

function eventPriority(name: string, stage: string | null, cat: string | null): number {
  const n = (name + " " + (stage ?? "") + " " + (cat ?? "")).toLowerCase();
  if (n.includes("final") && !n.includes("quarter") && !n.includes("semi")) return 5;
  if (n.includes("semi-final") || n.includes("semi final")) return 4;
  if (n.includes("quarter")) return 3;
  if (n.includes("world cup") || n.includes("champions league")) return 4;
  return 3;
}

function isCharterWorthy(cat: string | null, stage: string | null): boolean {
  const s = ((cat ?? "") + " " + (stage ?? "")).toLowerCase();
  return s.includes("final") || s.includes("champions") || s.includes("world cup") || s.includes("grand prix");
}

function isBusWorthy(cat: string | null): boolean {
  const c = (cat ?? "").toLowerCase();
  return c.includes("football") || c.includes("rugby") || c.includes("basketball");
}

function isFlightWorthy(cat: string | null, loc: string | null): boolean {
  const l = (loc ?? "").toLowerCase();
  return l.includes("europe") || l.includes("various") || (cat ?? "").toLowerCase().includes("world cup");
}

// ─── Sheet type detection ────────────────────────────────────────────────────

const SHEET_TYPE_MAP: Record<string, string> = {
  sports_schedule_export_to_csv: "sports_schedule",
  master_events:    "event",
  planning_targets: "event",
  priority_sheet:   "supporter_club",
  supporter_clubs:  "supporter_club",
  human_contacts:   "contact",
  master_companies: "travel_agent",
  priority_targets: "club_department",
  clubs_teams:      "club_department",
  internal_contacts: "contact",
  external_partners: "travel_agent",
};

const SKIP_SHEETS = new Set([
  "readme", "executive_summary", "data_gaps", "original_import",
]);

/**
 * Detect entity type from sheet name or headers.
 * Returns null if sheet should be skipped.
 */
function detectEntityType(sheetName: string, headers: string[]): string | null {
  const norm = sheetName.toLowerCase().replace(/[\s\-]/g, "_");
  if (SKIP_SHEETS.has(norm)) return null;
  if (SHEET_TYPE_MAP[norm]) return SHEET_TYPE_MAP[norm];

  // Fallback: detect from column headers
  const h = headers.map((x) => x.toLowerCase());
  if (h.some((x) => x.includes("event") || x.includes("fixture") || x.includes("match"))) return "event";
  if (h.some((x) => x.includes("supporter") || x.includes("fan club") || x.includes("supporter_group"))) return "supporter_club";
  if (h.some((x) => x.includes("travel agent") || x.includes("agency"))) return "travel_agent";
  if (h.some((x) => x.includes("department") || x.includes("club dept"))) return "club_department";
  if (h.some((x) => x.includes("first_name") || x.includes("email") || x.includes("full_name"))) return "contact";

  return null;
}

// ─── Row inserters ────────────────────────────────────────────────────────────

async function insertEvent_(r: Record<string, unknown>, fid: string, sheet: string) {
  const name = str(r.event_name ?? r.event ?? r.match ?? r.fixture ?? r.game);
  if (!name) return false;
  await prisma.event.create({ data: {
    eventName: name, competition: str(r.competition ?? r.league), stage: str(r.stage ?? r.round),
    category: str(r.category ?? r.sport), eventDate: parseDate_(r.start_date ?? r.date ?? r.event_date),
    dateText: str(r.date_text ?? r.date), homeTeamName: str(r.home_team ?? r.home),
    awayTeamName: str(r.away_team ?? r.away ?? r.traveling_team), venueName: str(r.venue ?? r.stadium),
    city: str(r.city), country: str(r.country),
    transportOpportunityType: str(r.transport_opportunity_type ?? r.transport_type ?? r.flex_type),
    closestDepartureAirport: str(r.closest_departure_airport ?? r.departure_airport),
    closestArrivalAirport: str(r.closest_arrival_airport ?? r.arrival_airport),
    priorityRating: priority_(r.priority ?? r.priority_rating ?? r.priority_bucket),
    charterWorthy: bool_(r.charter_worthy ?? r.charter), busWorthy: bool_(r.bus_worthy ?? r.bus),
    notes: str(r.notes), sourceFileId: fid, sourceSheetName: sheet,
  }});
  return true;
}

async function insertScheduleEvent_(r: Record<string, unknown>, fid: string, sheet: string): Promise<boolean> {
  const eventName = str(r.event);
  if (!eventName) return false;
  const category = str(r.category);
  const stage    = str(r.stage);
  const dateText = str(r["date_s_"] ?? r["date(s)"] ?? r.date ?? r["dates"]);
  const location = str(r.location);
  let city: string | null = null;
  let country: string | null = null;
  if (location) {
    const parts = location.split(",").map((s) => s.trim());
    if (parts.length >= 2) { city = parts.slice(0, -1).join(", "); country = parts[parts.length - 1]; }
    else { city = location; }
  }
  await prisma.event.create({ data: {
    eventName, competition: category, stage, category,
    eventDate: parseTextDate(dateText), dateText: dateText ?? undefined,
    city, country, transportOpportunityType: categoryToTransport(category),
    priorityRating: eventPriority(eventName, stage, category),
    charterWorthy: isCharterWorthy(category, stage),
    busWorthy: isBusWorthy(category), flightWorthy: isFlightWorthy(category, location),
    notes: location ? `Venue/Location: ${location}` : undefined,
    sourceFileId: fid, sourceSheetName: sheet,
  }});
  return true;
}

async function insertClub_(r: Record<string, unknown>, fid: string, sheet: string) {
  const name = str(r.supporter_group ?? r.club_name ?? r.name ?? r.group_name);
  if (!name) return false;
  await prisma.supporterClub.create({ data: {
    clubName: name, officialStatus: str(r.official ?? r.status),
    teamSupported: str(r.team_supported ?? r.team), scope: str(r.scope),
    city: str(r.city ?? r.club_base), country: str(r.country),
    members: num(r.members ?? r.member_count), followers: num(r.followers),
    primaryDepartureAirport: str(r.primary_departure_airport ?? r.airport),
    website: str(r.website ?? r.url), instagram: str(r.instagram ?? r.ig),
    facebook: str(r.facebook), x: str(r.x ?? r.twitter),
    email: str(r.email ?? r.public_contact), phone: str(r.phone ?? r.telephone),
    bestOutreachRoute: str(r.reach_method ?? r.best_outreach),
    travelCoordinatorFound: bool_(r.organized_travel_coordinator ?? r.travel_coordinator_found),
    travelCoordinatorName: str(r.organized_travel_coordinator ?? r.coordinator_name),
    travelCoordinatorContact: str(r.coordinator_contact_details),
    notes: str(r.notes), sourceFileId: fid, sourceSheetName: sheet, sourceUrl: str(r.source_url),
  }});
  return true;
}

async function insertContact_(r: Record<string, unknown>, fid: string, sheet: string) {
  const fn = str(r.first_name ?? r.given_name);
  const ln = str(r.last_name ?? r.surname);
  const combined = [fn, ln].filter(Boolean).join(" ") || null;
  const fullName = str(r.full_name ?? r.name ?? r.contact_name ?? r.contact_person) ?? combined;
  if (!fullName) return false;
  await prisma.contact.create({ data: {
    fullName, firstName: fn, lastName: ln,
    role: str(r.role ?? r.title ?? r.position ?? r.job_title),
    organizationType: str(r.org_type ?? r.organization_type),
    organization: str(r.organization ?? r.company ?? r.club),
    email: str(r.email ?? r.contact_email), phone: str(r.phone ?? r.telephone),
    linkedin: str(r.linkedin), instagram: str(r.instagram),
    city: str(r.city), country: str(r.country),
    confidenceLevel: str(r.confidence ?? r.confidence_level) ?? "low",
    isDecisionMaker: bool_(r.decision_maker),
    supporterTravelRelevance: bool_(r.supporter_travel),
    charterRelevance: bool_(r.charter),
    bestOutreachRoute: str(r.best_outreach ?? r.reach_method),
    notes: str(r.notes), sourceFileId: fid, sourceSheetName: sheet,
  }});
  return true;
}

async function insertAgent_(r: Record<string, unknown>, fid: string, sheet: string) {
  const name = str(r.company_name ?? r.company ?? r.name ?? r.agency);
  if (!name) return false;
  await prisma.travelAgent.create({ data: {
    companyName: name, specialization: str(r.specialization ?? r.specialty),
    country: str(r.country), city: str(r.city),
    website: str(r.website), email: str(r.email), phone: str(r.phone),
    groupTravel: bool_(r.group_travel), sportsTravel: bool_(r.sports_travel),
    supporterTravel: bool_(r.supporter_travel), footballTravel: bool_(r.football ?? r.soccer),
    charterRelevance: bool_(r.charter), hospitalityPackages: bool_(r.hospitality),
    bestContactPerson: str(r.best_contact ?? r.key_contact),
    bestOutreachRoute: str(r.best_outreach),
    priorityRating: priority_(r.priority ?? r.priority_rating),
    notes: str(r.notes), sourceFileId: fid, sourceSheetName: sheet,
  }});
  return true;
}

async function insertDept_(r: Record<string, unknown>, fid: string, sheet: string) {
  const name = str(r.club_name ?? r.club ?? r.team_name ?? r.team ?? r.organization);
  if (!name) return false;
  await prisma.clubDepartment.create({ data: {
    clubName: name, teamName: str(r.team_name ?? r.team),
    department: str(r.department ?? r.dept),
    country: str(r.country), city: str(r.city),
    email: str(r.email), phone: str(r.phone),
    supporterTravelRelevance: bool_(r.supporter_travel ?? r.fan_travel),
    charterRelevance: bool_(r.charter), hospitalityRelevance: bool_(r.hospitality),
    externalTravelPartner: str(r.travel_partner ?? r.external_partner),
    notes: str(r.notes), sourceFileId: fid, sourceSheetName: sheet,
  }});
  return true;
}

// ─── Main pipeline function ───────────────────────────────────────────────────

export interface PipelineInput {
  /** Raw file content */
  buffer: Buffer;
  /** Original filename (used for extension detection) */
  filename: string;
  /** Display name stored in ImportedFile */
  originalName?: string;
  /** Source type label */
  sourceType?: "local_upload" | "google_drive" | "seed";
  /** If from Drive, the driveFileId to link back */
  driveFileId?: string;
  /** File mtime — used for change detection on re-imports */
  fileMtime?: Date;
}

export interface PipelineResult {
  importedFileId: string;
  importedRows: number;
  skippedRows: number;
  totalRows: number;
  sheetsProcessed: number;
  log: string[];
  error?: string;
}

export async function runImportPipeline(input: PipelineInput): Promise<PipelineResult> {
  const log: string[] = [];
  let importedRows = 0;
  let skippedRows  = 0;
  let sheetsProcessed = 0;

  // Resolve the DriveFile DB record id (FK is to DriveFile.id, not the Google Drive file ID)
  let driveFileDbId: string | null = null;
  if (input.driveFileId) {
    const driveRec = await prisma.driveFile.findUnique({ where: { driveFileId: input.driveFileId } });
    driveFileDbId = driveRec?.id ?? null;
  }

  // Create a FileImportJob to track this run
  const job = await prisma.fileImportJob.create({
    data: {
      sourceType:  input.sourceType ?? "local_upload",
      driveFileId: driveFileDbId,
      status:      "running",
    },
  });

  // Create the ImportedFile record
  const ext = input.filename.split(".").pop()?.toLowerCase() ?? "xlsx";
  const fileRecord = await prisma.importedFile.create({
    data: {
      filename:     input.filename,
      originalName: input.originalName ?? input.filename,
      fileType:     ext,
      status:       "processing",
      importedAt:   input.fileMtime ?? new Date(),
    },
  });

  try {
    // Parse workbook
    const workbook = XLSX.read(input.buffer, { cellDates: true, dateNF: "YYYY-MM-DD" });

    for (const sheetName of workbook.SheetNames) {
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        workbook.Sheets[sheetName],
        { defval: null, raw: false, dateNF: "YYYY-MM-DD" }
      );

      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
      const entityType = detectEntityType(sheetName, headers);
      if (!entityType) continue;

      log.push(`  ${sheetName} → ${entityType} (${rows.length} rows)`);
      sheetsProcessed++;

      for (const rawRow of rows) {
        const r = normalizeKeys(rawRow);
        try {
          let ok = false;
          if (entityType === "event")           ok = await insertEvent_(r, fileRecord.id, sheetName);
          if (entityType === "sports_schedule") ok = await insertScheduleEvent_(r, fileRecord.id, sheetName);
          if (entityType === "supporter_club")  ok = await insertClub_(r, fileRecord.id, sheetName);
          if (entityType === "contact")         ok = await insertContact_(r, fileRecord.id, sheetName);
          if (entityType === "travel_agent")    ok = await insertAgent_(r, fileRecord.id, sheetName);
          if (entityType === "club_department") ok = await insertDept_(r, fileRecord.id, sheetName);
          if (ok) importedRows++; else skippedRows++;
        } catch { skippedRows++; }
      }
    }

    // Finalize ImportedFile
    await prisma.importedFile.update({
      where: { id: fileRecord.id },
      data: {
        importedCount: importedRows,
        skippedCount:  skippedRows,
        rowCount:      importedRows + skippedRows,
        status:        "complete",
      },
    });

    // Finalize job
    await prisma.fileImportJob.update({
      where: { id: job.id },
      data: {
        status:        "success",
        completedAt:   new Date(),
        importedRows,
        skippedRows,
        totalRows:     importedRows + skippedRows,
        importedFileId: fileRecord.id,
        log:           log.join("\n"),
      },
    });

    return {
      importedFileId: fileRecord.id,
      importedRows,
      skippedRows,
      totalRows: importedRows + skippedRows,
      sheetsProcessed,
      log,
    };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.push(`✗ Fatal: ${msg}`);

    await prisma.importedFile.update({
      where: { id: fileRecord.id },
      data: { status: "error", errorLog: msg },
    });

    await prisma.fileImportJob.update({
      where: { id: job.id },
      data: {
        status:       "failed",
        completedAt:  new Date(),
        errorMessage: msg,
        log:          log.join("\n"),
      },
    });

    return {
      importedFileId: fileRecord.id,
      importedRows,
      skippedRows,
      totalRows: importedRows + skippedRows,
      sheetsProcessed,
      log,
      error: msg,
    };
  }
}

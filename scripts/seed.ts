/**
 * GoFlexxi Intelligence — Seed Script
 *
 * Reads the uploaded reference Excel files and seeds the database.
 * Run: npm run db:seed
 *
 * File paths are relative to the project root. Update EXCEL_FILES
 * below to point to your actual files.
 */

import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const prisma = new PrismaClient();

// ─── Configure paths to your Excel files ─────────────────────────────────────
// These default to a sibling directory — adjust as needed.
const BASE_DIR = process.env.EXCEL_DIR ?? path.join(__dirname, "../../");

const EXCEL_FILES = [
  {
    filename: "2 GoFlexxi Supporter clubs with_priority_sheet.xlsx",
    description: "GoFlexxi Supporter Clubs with Priority Sheet",
  },
  {
    filename: "3 Perplexity GoFlexxi_Supporter Clubs With contacts.xlsx",
    description: "GoFlexxi Supporter Clubs With Contacts (Perplexity)",
  },
  {
    filename: "4 GoFlexxi Sports Travel Agents Database.xlsx",
    description: "GoFlexxi Sports Travel Agents Database",
  },
  {
    filename: "5 Actual Sports Club internal Travel departments.xlsx",
    description: "Actual Sports Club Internal Travel Departments",
  },
];

// ─── Sheet type mappings based on known structure ─────────────────────────────
const SHEET_TYPE_MAP: Record<string, "event" | "supporter_club" | "contact" | "travel_agent" | "club_department"> = {
  // File 1 sheets
  "master_events":    "event",
  "planning_targets": "event",
  "priority_sheet":   "supporter_club",
  "supporter_clubs":  "supporter_club",

  // File 2 sheets
  "human_contacts":   "contact",

  // File 3 sheets
  "master_companies": "travel_agent",

  // File 4 sheets
  "priority_targets": "club_department",
  "clubs_teams":      "club_department",
  "internal_contacts": "contact",
  "external_partners": "travel_agent",
};

// Sheets to always skip
const SKIP_SHEETS = new Set([
  "readme", "executive_summary", "data_gaps", "original_import"
]);

async function seedFromExcel(
  filepath: string,
  originalName: string,
  description: string
): Promise<{ imported: number; skipped: number }> {
  if (!fs.existsSync(filepath)) {
    console.warn(`  ⚠ File not found: ${filepath}`);
    return { imported: 0, skipped: 0 };
  }

  console.log(`\n  Reading: ${originalName}`);

  const workbook = XLSX.readFile(filepath, {
    cellDates: true,
    dateNF: "YYYY-MM-DD",
  });

  // Create file record
  const fileRecord = await prisma.importedFile.create({
    data: {
      filename:     originalName,
      originalName: description,
      fileType:     "xlsx",
      status:       "processing",
    },
  });

  let totalImported = 0;
  let totalSkipped = 0;

  for (const sheetName of workbook.SheetNames) {
    const normalizedSheet = sheetName.toLowerCase().replace(/[\s\-]/g, "_");

    if (SKIP_SHEETS.has(normalizedSheet)) {
      console.log(`    Skip: ${sheetName} (metadata)`);
      continue;
    }

    const entityType = SHEET_TYPE_MAP[normalizedSheet];
    if (!entityType) {
      console.log(`    Skip: ${sheetName} (no type mapping)`);
      continue;
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: null,
      raw: false,
      dateNF: "YYYY-MM-DD",
    });

    if (rows.length === 0) {
      console.log(`    Skip: ${sheetName} (empty)`);
      continue;
    }

    console.log(`    Import: ${sheetName} → ${entityType} (${rows.length} rows)`);

    const { imported, skipped } = await importRows(rows, entityType, fileRecord.id, sheetName);
    totalImported += imported;
    totalSkipped += skipped;
    console.log(`      ✓ ${imported} imported, ${skipped} skipped`);
  }

  // Update file record
  await prisma.importedFile.update({
    where: { id: fileRecord.id },
    data: {
      importedCount: totalImported,
      skippedCount: totalSkipped,
      rowCount: totalImported + totalSkipped,
      status: "complete",
    },
  });

  return { imported: totalImported, skipped: totalSkipped };
}

async function importRows(
  rows: Record<string, unknown>[],
  entityType: string,
  fileId: string,
  sheetName: string
): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    try {
      const normalized = normalizeKeys(row);

      switch (entityType) {
        case "event":
          if (await insertEvent(normalized, fileId, sheetName)) imported++;
          else skipped++;
          break;
        case "supporter_club":
          if (await insertSupporterClub(normalized, fileId, sheetName)) imported++;
          else skipped++;
          break;
        case "contact":
          if (await insertContact(normalized, fileId, sheetName)) imported++;
          else skipped++;
          break;
        case "travel_agent":
          if (await insertTravelAgent(normalized, fileId, sheetName)) imported++;
          else skipped++;
          break;
        case "club_department":
          if (await insertClubDept(normalized, fileId, sheetName)) imported++;
          else skipped++;
          break;
        default:
          skipped++;
      }
    } catch {
      skipped++;
    }
  }

  return { imported, skipped };
}

// ─── Key normalizer ───────────────────────────────────────────────────────────

function normalizeKeys(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const normalized = key.toLowerCase().replace(/[\s\-\(\)\/]/g, "_").replace(/_+/g, "_");
    result[normalized] = value;
  }
  return result;
}

function str(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s === "" || s === "N/A" || s === "TBC" || s === "n/a" ? null : s;
}

function num(val: unknown): number | null {
  const n = parseInt(String(val), 10);
  return isNaN(n) ? null : n;
}

function bool(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  const s = String(val).toLowerCase().trim();
  return ["yes", "true", "1", "y", "x", "✓"].includes(s);
}

function parseDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const s = String(val).trim();
  if (!s || s === "TBC" || s === "N/A") return null;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  // Excel serial
  const n = Number(val);
  if (!isNaN(n) && n > 40000) {
    const epoch = new Date(1899, 11, 30);
    const parsed = new Date(epoch.getTime() + n * 86400000);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function priorityFromString(val: unknown): number | null {
  if (!val) return null;
  if (typeof val === "number") return Math.min(5, Math.max(1, Math.round(val)));
  const s = String(val).toLowerCase().trim();
  if (s === "a" || s.includes("critical") || s.includes("very high")) return 5;
  if (s === "b" || s.includes("high")) return 4;
  if (s === "c" || s.includes("med")) return 3;
  if (s === "d" || s.includes("low")) return 2;
  const n = parseInt(s, 10);
  return isNaN(n) ? null : Math.min(5, Math.max(1, n));
}

// ─── Insert functions ─────────────────────────────────────────────────────────

async function insertEvent(r: Record<string, unknown>, fileId: string, sheet: string): Promise<boolean> {
  const name = str(r.event_name ?? r.event ?? r.match ?? r.fixture ?? r.game);
  if (!name) return false;

  const transportType = str(r.transport_opportunity_type ?? r.transport_type ?? r.flex_type ?? r.opportunity_type);

  await prisma.event.create({
    data: {
      eventName:      name,
      competition:    str(r.competition ?? r.league ?? r.tournament),
      stage:          str(r.stage ?? r.round ?? r.phase),
      category:       str(r.category ?? r.sport),
      eventDate:      parseDate(r.start_date ?? r.date ?? r.event_date ?? r.match_date),
      dateText:       str(r.date_text ?? r.date ?? r.start_date),
      homeTeamName:   str(r.home_team ?? r.home_club ?? r.home),
      awayTeamName:   str(r.away_team ?? r.away_club ?? r.away ?? r.traveling_team),
      venueName:      str(r.venue ?? r.stadium ?? r.arena),
      city:           str(r.city ?? r.location),
      country:        str(r.country ?? r.nation),
      transportOpportunityType: transportType,
      closestDepartureAirport:  str(r.closest_departure_airport ?? r.departure_airport),
      closestArrivalAirport:    str(r.closest_arrival_airport ?? r.arrival_airport),
      priorityRating:           priorityFromString(r.priority ?? r.priority_rating ?? r.priority_bucket),
      priorityBucket:           str(r.priority_bucket),
      charterWorthy:  bool(r.charter_worthy ?? r.charter),
      busWorthy:      bool(r.bus_worthy ?? r.bus),
      flightWorthy:   bool(r.flight_worthy ?? r.flight),
      notes:          str(r.notes ?? r.comments),
      sourceFileId:   fileId,
      sourceSheetName: sheet,
    },
  });

  return true;
}

async function insertSupporterClub(r: Record<string, unknown>, fileId: string, sheet: string): Promise<boolean> {
  const name = str(r.supporter_group ?? r.club_name ?? r.name ?? r.group_name ?? r.club);
  if (!name) return false;

  await prisma.supporterClub.create({
    data: {
      clubName:        name,
      officialStatus:  str(r.official ?? r.status ?? r.official_status),
      teamSupported:   str(r.team_supported ?? r.team ?? r.supports ?? r.supported_team),
      scope:           str(r.scope ?? r.coverage),
      city:            str(r.city ?? r.club_base ?? r.base_city),
      country:         str(r.country ?? r.nation ?? r.base_country),
      members:         num(r.members ?? r.member_count ?? r.membership),
      followers:       num(r.followers ?? r.social_followers),
      primaryDepartureAirport: str(r.primary_departure_airport ?? r.airport),
      website:         str(r.website ?? r.url ?? r.club_website),
      instagram:       str(r.instagram ?? r.ig),
      facebook:        str(r.facebook ?? r.fb),
      x:               str(r.x ?? r.twitter),
      email:           str(r.email ?? r.public_contact ?? r.contact_email),
      phone:           str(r.phone ?? r.telephone ?? r.contact_phone),
      bestOutreachRoute: str(r.reach_method ?? r.best_outreach ?? r.contact_route),
      travelCoordinatorFound:   bool(r.organized_travel_coordinator ?? r.travel_coordinator_found),
      travelCoordinatorName:    str(r.organized_travel_coordinator ?? r.travel_coordinator_name ?? r.coordinator_name),
      travelCoordinatorContact: str(r.coordinator_contact_details ?? r.coordinator_contact),
      notes:           str(r.notes ?? r.comments),
      sourceFileId:    fileId,
      sourceSheetName: sheet,
      sourceUrl:       str(r.source_url),
    },
  });

  return true;
}

async function insertContact(r: Record<string, unknown>, fileId: string, sheet: string): Promise<boolean> {
  const firstName = str(r.first_name ?? r.given_name);
  const lastName  = str(r.last_name ?? r.surname ?? r.family_name);
  const combinedName = [firstName, lastName].filter(Boolean).join(" ");
  const fullName  = str(r.full_name ?? r.name ?? r.contact_name ?? r.contact_person)
    ?? (combinedName || null);

  if (!fullName) return false;

  await prisma.contact.create({
    data: {
      fullName,
      firstName:    firstName,
      lastName:     lastName,
      role:         str(r.role ?? r.title ?? r.position ?? r.job_title),
      organizationType: str(r.org_type ?? r.organization_type ?? r.contact_type),
      organization: str(r.organization ?? r.company ?? r.club ?? r.employer),
      email:        str(r.email ?? r.contact_email ?? r.e_mail),
      phone:        str(r.phone ?? r.telephone ?? r.mobile ?? r.contact_phone),
      linkedin:     str(r.linkedin ?? r.linkedin_url),
      instagram:    str(r.instagram),
      facebook:     str(r.facebook),
      city:         str(r.city ?? r.location),
      country:      str(r.country ?? r.nation),
      confidenceLevel: str(r.confidence ?? r.confidence_level ?? r.data_quality) ?? "low",
      isDecisionMaker: bool(r.decision_maker ?? r.is_decision_maker),
      supporterTravelRelevance: bool(r.supporter_travel ?? r.fan_travel),
      charterRelevance: bool(r.charter ?? r.charter_relevance),
      bestOutreachRoute: str(r.best_outreach ?? r.outreach_route ?? r.reach_method),
      notes:        str(r.notes ?? r.comments),
      sourceFileId: fileId,
      sourceSheetName: sheet,
    },
  });

  return true;
}

async function insertTravelAgent(r: Record<string, unknown>, fileId: string, sheet: string): Promise<boolean> {
  const name = str(r.company_name ?? r.company ?? r.name ?? r.agency ?? r.agent_name);
  if (!name) return false;

  await prisma.travelAgent.create({
    data: {
      companyName:   name,
      specialization: str(r.specialization ?? r.specialty ?? r.focus ?? r.niche),
      country:       str(r.country ?? r.nation),
      city:          str(r.city ?? r.location),
      website:       str(r.website ?? r.url),
      email:         str(r.email ?? r.contact_email),
      phone:         str(r.phone ?? r.telephone),
      groupTravel:   bool(r.group_travel ?? r.groups),
      sportsTravel:  bool(r.sports_travel ?? r.sports),
      supporterTravel: bool(r.supporter_travel ?? r.fans),
      footballTravel: bool(r.football ?? r.soccer),
      rugbyTravel:   bool(r.rugby),
      charterRelevance: bool(r.charter ?? r.charter_relevance),
      hospitalityPackages: bool(r.hospitality ?? r.hospitality_packages),
      bestContactPerson: str(r.best_contact ?? r.key_contact ?? r.contact_person),
      bestOutreachRoute: str(r.best_outreach ?? r.outreach_route),
      priorityRating: priorityFromString(r.priority ?? r.priority_rating),
      notes:         str(r.notes ?? r.comments),
      sourceFileId:  fileId,
      sourceSheetName: sheet,
    },
  });

  return true;
}

async function insertClubDept(r: Record<string, unknown>, fileId: string, sheet: string): Promise<boolean> {
  const clubName = str(r.club_name ?? r.club ?? r.team_name ?? r.team ?? r.organization ?? r.org);
  if (!clubName) return false;

  await prisma.clubDepartment.create({
    data: {
      clubName,
      teamName:    str(r.team_name ?? r.team),
      department:  str(r.department ?? r.dept ?? r.division),
      country:     str(r.country ?? r.nation),
      city:        str(r.city ?? r.location),
      email:       str(r.email ?? r.contact_email),
      phone:       str(r.phone ?? r.telephone),
      supporterTravelRelevance: bool(r.supporter_travel ?? r.fan_travel),
      charterRelevance: bool(r.charter ?? r.charter_relevance),
      hospitalityRelevance: bool(r.hospitality ?? r.vip ?? r.packages),
      externalTravelPartner: str(r.travel_partner ?? r.external_partner ?? r.travel_agency),
      notes:       str(r.notes ?? r.comments),
      sourceFileId: fileId,
      sourceSheetName: sheet,
    },
  });

  return true;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 GoFlexxi Intelligence — Seeding database from Excel files\n");

  // Resolve Excel file paths
  // Look in the project directory first, then try the Claude Projects directory
  const searchPaths = [
    BASE_DIR,
    path.join(process.env.USERPROFILE ?? "", "OneDrive", "Documents", "Claude Projects"),
    path.join(process.env.HOME ?? "", "OneDrive", "Documents", "Claude Projects"),
    path.join(process.env.USERPROFILE ?? "", "OneDrive/Documents/2026 GoFlexxi/March Launch"),
    "/c/Users/corne/OneDrive/Documents/2026 GoFlexxi/March Launch",
    "/c/Users/corne/OneDrive/Documents/Claude Projects",
  ];

  let totalImported = 0;
  let totalSkipped = 0;
  let filesProcessed = 0;

  for (const fileConfig of EXCEL_FILES) {
    let found = false;

    for (const searchDir of searchPaths) {
      const fullPath = path.join(searchDir, fileConfig.filename);
      if (fs.existsSync(fullPath)) {
        console.log(`📂 Processing: ${fileConfig.filename}`);
        const { imported, skipped } = await seedFromExcel(
          fullPath,
          fileConfig.filename,
          fileConfig.description
        );
        totalImported += imported;
        totalSkipped += skipped;
        filesProcessed++;
        found = true;
        break;
      }
    }

    if (!found) {
      console.warn(`⚠  Not found: ${fileConfig.filename}`);
      console.warn(`   Searched in:\n   ${searchPaths.join("\n   ")}`);
      console.warn(`   Set EXCEL_DIR environment variable to the directory containing your Excel files.`);
    }
  }

  console.log(`\n✅ Seeding complete!`);
  console.log(`   Files processed: ${filesProcessed}`);
  console.log(`   Records imported: ${totalImported}`);
  console.log(`   Records skipped:  ${totalSkipped}`);

  if (filesProcessed === 0) {
    console.log(`\n💡 Tip: To seed with your Excel files, set the EXCEL_DIR environment variable:`);
    console.log(`   EXCEL_DIR="/path/to/your/excel/files" npm run db:seed`);
    console.log(`\n   Or copy your Excel files to the project root directory.`);
  }
}

main()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

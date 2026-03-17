/**
 * Unified import pipeline for GoFlexxi Intelligence.
 *
 * Handles all 5 Excel files:
 *  1. Sports Schedule Export (events)
 *  2. GoFlexxi Supporter Clubs with Priority Sheet (events + clubs)
 *  3. Perplexity Supporter Clubs With Contacts (events + clubs + contacts)
 *  4. Sports Travel Agents Database (travel agents + contacts)
 *  5. Sports Club Internal Travel Departments (club depts + contacts + external partners)
 */

import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

// ─── Utility helpers ─────────────────────────────────────────────────────────

function str(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s === "" || s === "N/A" || s === "TBC" || s === "n/a" || s === "nan" ? null : s;
}

function num(val: unknown): number | null {
  if (!val) return null;
  const s = String(val).replace(/[,\s]/g, "");
  const match = s.match(/[\d]+/);
  if (!match) return null;
  const n = parseInt(match[0], 10);
  return isNaN(n) ? null : n;
}

function bool_(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  return ["yes", "true", "1", "y", "x", "✓", "confirmed", "found"].includes(
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

/** Normalise column keys: lowercase, replace spaces/hyphens/parens/slashes/question marks/colons → underscores */
function normalizeKeys(row: Record<string, unknown>) {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const norm = k
      .toLowerCase()
      .replace(/[\s\-\(\)\/\?\:\#\&\*\.]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    r[norm] = v;
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
  if (c.includes("rugby") || c.includes("football")) return "bus";
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
  return c.includes("football") || c.includes("rugby") || c.includes("basketball") || c.includes("soccer");
}

function isFlightWorthy(cat: string | null, loc: string | null): boolean {
  const l = (loc ?? "").toLowerCase();
  return l.includes("europe") || l.includes("various") || (cat ?? "").toLowerCase().includes("world cup");
}

// ─── Sheet type detection ────────────────────────────────────────────────────

const SHEET_TYPE_MAP: Record<string, string> = {
  // File 1 - Sports Schedule
  sports_schedule_export_to_csv: "sports_schedule",

  // File 2 & 3 - Events/Planning
  master_events:    "event",
  planning_targets: "event",
  priority_sheet:   "event",   // has Game/Event + Traveling Team data

  // File 2 & 3 - Supporter Clubs & Contacts
  supporter_clubs:   "supporter_club",
  human_contacts:    "contact",

  // File 4 - Travel Agents
  master_companies: "travel_agent",
  // human_contacts: "contact" (already above)

  // File 5 - Club Departments & Contacts
  priority_targets:  "club_department",
  clubs_teams:       "club_department",
  internal_contacts: "contact",
  external_partners: "travel_agent",
};

const SKIP_SHEETS = new Set([
  "readme", "executive_summary", "data_gaps", "original_import",
]);

function detectEntityType(sheetName: string, headers: string[]): string | null {
  const norm = sheetName.toLowerCase().replace(/[\s\-]/g, "_");
  if (SKIP_SHEETS.has(norm)) return null;
  if (SHEET_TYPE_MAP[norm]) return SHEET_TYPE_MAP[norm];

  // Fallback: detect from column headers
  const h = headers.map((x) => x.toLowerCase());
  if (h.some((x) => x.includes("event") || x.includes("fixture") || x.includes("match"))) return "event";
  if (h.some((x) => x.includes("supporter") || x.includes("fan club") || x.includes("supporter_group"))) return "supporter_club";
  if (h.some((x) => x.includes("travel agent") || x.includes("agency") || x.includes("partner company"))) return "travel_agent";
  if (h.some((x) => x.includes("department") || x.includes("club dept"))) return "club_department";
  if (h.some((x) => x.includes("first_name") || x.includes("email") || x.includes("full_name") || x.includes("full name"))) return "contact";

  return null;
}

// ─── Row inserters ────────────────────────────────────────────────────────────

async function insertEvent_(r: Record<string, unknown>, fid: string, sheet: string) {
  // Handles: Master_Events (File 2&3), Planning_Targets (File 2), Priority_Sheet (File 2&3)
  // Column aliases cover both normalised forms from all files
  const name = str(
    r.event_name ?? r.event ?? r.match ?? r.fixture ?? r.game_event /* "Game/Event" */ ??
    r.game /* "Game" in File2 priority_sheet */ ?? r.fixture_match
  );
  if (!name) return false;

  await prisma.event.create({
    data: {
      eventName:   name,
      competition: str(r.competition ?? r.league ?? r.cup),
      stage:       str(r.stage ?? r.round ?? r.match_or_session),
      category:    str(r.category ?? r.sport ?? r.source_type),
      eventDate:   parseDate_(r.start_date ?? r.date ?? r.event_date),
      dateText:    str(r.date_text ?? r.date ?? r.date_s_ /* "Date(s)" */),
      homeTeamName: str(r.home_team ?? r.home),
      awayTeamName: str(
        r.away_team ?? r.away ?? r.traveling_team ?? r.away_traveling_team /* "Away/Traveling Team" */ ??
        r.travelling_team
      ),
      venueName:   str(r.venue ?? r.stadium),
      city:        str(r.city ?? r.host_city),
      regionState: str(r.region_state),
      country:     str(r.country),
      transportOpportunityType: str(
        r.transport_opportunity_type ?? r.transport_opportunity /* "Transport Opportunity" */ ??
        r.transport_type ?? r.flex_type
      ),
      closestDepartureAirport: str(
        r.closest_departure_airport ?? r.departure_airport
      ),
      closestArrivalAirport: str(
        r.closest_arrival_airport ?? r.arrival_airport ??
        r.nearest_airport ?? r.nearest_arrival_airport /* File2 schema */
      ),
      priorityRating: priority_(
        r.priority ?? r.priority_rating /* "Priority Rating" */ ?? r.priority_bucket
      ),
      charterWorthy:    bool_(r.charter_worthy ?? r.charter),
      busWorthy:        bool_(r.bus_worthy ?? r.bus),
      flightWorthy:     bool_(r.flight_worthy ?? r.flight),
      hospitalityWorthy: bool_(r.hospitality_worthy ?? r.hospitality),
      notes: str(r.notes ?? r.priority_reason /* "Priority Reason" */),
      sourceFileId:    fid,
      sourceSheetName: sheet,
    },
  });
  return true;
}

async function insertScheduleEvent_(r: Record<string, unknown>, fid: string, sheet: string): Promise<boolean> {
  // Handles: File 1 — Sports Schedule Export to CSV
  const eventName = str(r.event);
  if (!eventName) return false;
  const category = str(r.category);
  const stage    = str(r.stage);
  const dateText = str(r.date_s_ ?? r["date(s)"] ?? r.date ?? r.dates);
  const location = str(r.location);
  let city: string | null = null;
  let country: string | null = null;
  if (location) {
    const parts = location.split(",").map((s) => s.trim());
    if (parts.length >= 2) { city = parts.slice(0, -1).join(", "); country = parts[parts.length - 1]; }
    else { city = location; }
  }
  await prisma.event.create({
    data: {
      eventName, competition: category, stage, category,
      eventDate: parseTextDate(dateText), dateText: dateText ?? undefined,
      city, country,
      transportOpportunityType: categoryToTransport(category),
      priorityRating: eventPriority(eventName, stage, category),
      charterWorthy: isCharterWorthy(category, stage),
      busWorthy: isBusWorthy(category),
      flightWorthy: isFlightWorthy(category, location),
      notes: location ? `Venue/Location: ${location}` : undefined,
      sourceFileId: fid, sourceSheetName: sheet,
    },
  });
  return true;
}

async function insertClub_(r: Record<string, unknown>, fid: string, sheet: string) {
  // Handles: Supporter_Clubs (File 2 & 3)
  // File 3 columns (after normalise): supporter_group, official_status, team_supported, sport,
  //   city, country, region_market, website, email, phone, whatsapp, contact_form,
  //   facebook, twitter_x, instagram, estimated_members, organizes_travel, travel_evidence,
  //   key_contacts_names___roles_, contact_emails, contact_phones, best_outreach_method, notes, source_urls, confidence
  const name = str(
    r.supporter_group /* "Supporter Group" */ ?? r.club_name ?? r.name ?? r.group_name
  );
  if (!name) return false;

  // Combine contact info that may be multi-field in File 3
  const emailVal  = str(r.email ?? r.contact_emails /* "Contact Emails" */);
  const phoneVal  = str(r.phone ?? r.contact_phones /* "Contact Phones" */ ?? r.telephone);
  const notesVal  = str(r.notes ?? r.travel_evidence /* "Travel Evidence" */);

  await prisma.supporterClub.create({
    data: {
      clubName:       name,
      officialStatus: str(r.official ?? r.status ?? r.official_status /* "Official Status" */),
      teamSupported:  str(r.team_supported ?? r.team),
      sport:          str(r.sport),
      scope:          str(r.scope),
      city:           str(r.city ?? r.club_base ?? r.club_base_or_origin /* File2 */),
      country:        str(r.country),
      region:         str(r.region ?? r.region_market /* "Region/Market" */),
      members:        num(r.members ?? r.member_count ?? r.estimated_members /* "Estimated Members" */ ?? r.public_size),
      followers:      num(r.followers ?? r.estimated_followers),
      primaryDepartureAirport: str(r.primary_departure_airport ?? r.airport),
      website:        str(r.website ?? r.url),
      email:          emailVal,
      phone:          phoneVal,
      whatsapp:       str(r.whatsapp),
      instagram:      str(r.instagram),
      facebook:       str(r.facebook),
      x:              str(r.x ?? r.twitter ?? r.twitter_x /* "Twitter/X" */),
      linkedin:       str(r.linkedin),
      bestOutreachRoute: str(
        r.reach_method ?? r.best_outreach ?? r.best_outreach_method /* "Best Outreach Method" */ ??
        r.best_outreach_route
      ),
      travelCoordinatorFound: bool_(
        r.organized_travel_coordinator ?? r.travel_coordinator_found ??
        r.organizes_travel /* "Organizes Travel" */
      ),
      travelCoordinatorName: str(
        r.travelcoordinatorname ?? r.coordinator_name ?? r.travel_coordinator_name ??
        // File 3: key contacts field
        r.key_contacts_names___roles_
      ),
      travelCoordinatorContact: str(
        r.coordinator_contact_details ?? r.coordinator_contact
      ),
      supporterRelevance: priority_(r.confidence ?? r.priority_rating),
      notes:     notesVal,
      sourceFileId:    fid,
      sourceSheetName: sheet,
      sourceUrl:       str(r.source_url ?? r.source_urls),
    },
  });
  return true;
}

async function insertContact_(r: Record<string, unknown>, fid: string, sheet: string) {
  // Handles: Human_Contacts (File 3 & 4), Internal_Contacts (File 5)
  //
  // File 3 Human_Contacts columns (normalised): contact_id, full_name, role_title, supporter_club_organization,
  //   team_supported, city, country, direct_email, phone, linkedin, best_outreach_route,
  //   travel_decision_maker, communications_gatekeeper, source_urls
  //
  // File 4 Human_Contacts columns (normalised): contact_id, full_name, job_title, company, department,
  //   country, city, direct_email, direct_phone, linkedin_profile, general_company_phone,
  //   group_bookings_email, partnerships_email, charter_operations_email, best_outreach_route,
  //   decision_maker, operationally_relevant, confidence_level, why_this_person_matters,
  //   market_region, source_urls
  //
  // File 5 Internal_Contacts columns (normalised): contact_id, full_name, job_title, department,
  //   club_team, sport, league, country, city, direct_email, direct_phone, linkedin,
  //   influences_travel_decisions, influences_supporter_services, influences_commercial_partnerships,
  //   best_outreach_route, confidence_level, market, source_urls

  const fn = str(r.first_name ?? r.given_name);
  const ln = str(r.last_name ?? r.surname);
  const combined = [fn, ln].filter(Boolean).join(" ") || null;
  const fullName = str(
    r.full_name ?? r.name ?? r.contact_name ?? r.contact_person
  ) ?? combined;
  if (!fullName) return false;

  const emailVal = str(
    r.email ?? r.direct_email /* "Direct Email" */ ?? r.contact_email ??
    r.group_bookings_email ?? r.partnerships_email
  );
  const phoneVal = str(
    r.phone ?? r.direct_phone /* "Direct Phone" */ ?? r.telephone ?? r.general_company_phone
  );

  // Organization: club/company the contact belongs to
  const orgVal = str(
    r.organization ?? r.company ?? r.club ??
    r.club_team /* "Club/Team" in File5 */ ??
    r.supporter_club_organization /* "Supporter Club/Organization" File3 */
  );

  // Org type inference
  let orgType = str(r.org_type ?? r.organization_type) ?? null;
  if (!orgType && sheet.toLowerCase().includes("internal")) orgType = "club_dept";
  else if (!orgType && (sheet.toLowerCase().includes("human") || sheet.toLowerCase().includes("contact"))) {
    // Could be travel agent contacts (File 4) or supporter club contacts (File 3)
    orgType = null;
  }

  await prisma.contact.create({
    data: {
      fullName,
      firstName: fn,
      lastName:  ln,
      role: str(
        r.role ?? r.title ?? r.position ??
        r.job_title /* "Job Title" */ ?? r.role_title /* "Role/Title" File3 */
      ),
      organizationType: orgType,
      organization:     orgVal,
      email:    emailVal,
      phone:    phoneVal,
      linkedin: str(r.linkedin ?? r.linkedin_profile /* "LinkedIn Profile" File4 */),
      instagram: str(r.instagram),
      facebook:  str(r.facebook),
      city:    str(r.city),
      country: str(r.country),
      confidenceLevel: str(
        r.confidence ?? r.confidence_level /* "Confidence Level" */
      ) ?? "low",
      isDecisionMaker: bool_(
        r.decision_maker ?? r.travel_decision_maker /* File3 */ ??
        r.decision_maker_ /* normalised "Decision Maker?" */
      ),
      supporterTravelRelevance: bool_(
        r.supporter_travel ?? r.influences_travel_decisions /* "Influences Travel Decisions" File5 */ ??
        r.influences_supporter_services
      ),
      charterRelevance: bool_(
        r.charter ?? r.charter_operations_email
      ),
      bestOutreachRoute: str(
        r.best_outreach ?? r.reach_method ??
        r.best_outreach_route /* "Best Outreach Route" */ ??
        r.best_outreach_path
      ),
      notes: str(
        r.notes ??
        r.why_this_person_matters /* "Why This Person Matters" File4 */
      ),
      sourceFileId:    fid,
      sourceSheetName: sheet,
    },
  });
  return true;
}

async function insertAgent_(r: Record<string, unknown>, fid: string, sheet: string) {
  // Handles: Master_Companies (File 4), External_Partners (File 5)
  //
  // File 4 Master_Companies columns (normalised): company_id, company_name, market_region,
  //   country, city, website, company_type, does_group_travel, does_supporter_travel,
  //   does_football_travel, does_rugby_travel, does_charter, does_bus_travel, does_hospitality,
  //   services_summary, key_contacts_names___roles_, contact_emails, contact_phones,
  //   best_first_target, best_outreach_method, goflexxi_relevance, partnership_fit,
  //   priority_rating, source_urls
  //
  // File 5 External_Partners columns (normalised): partner_id, partner_company, partner_type,
  //   club_connected_to, relationship_evidence, contact_name, contact_title, contact_email,
  //   contact_phone, website, goflexxi_opportunity, confidence, source_urls

  const name = str(
    r.company_name /* "Company Name" */ ?? r.company ?? r.name ?? r.agency ??
    r.partner_company /* "Partner Company" File5 */
  );
  if (!name) return false;

  await prisma.travelAgent.create({
    data: {
      companyName:    name,
      specialization: str(
        r.specialization ?? r.specialty ?? r.company_type ?? r.partner_type /* File5 */
      ),
      country: str(r.country),
      city:    str(r.city),
      region:  str(r.region ?? r.market_region /* "Market/Region" */),
      website: str(r.website),
      email:   str(
        r.email ?? r.general_email ?? r.contact_email /* File5 */ ??
        r.group_bookings_email
      ),
      phone: str(
        r.phone ?? r.general_phone ?? r.contact_phone /* File5 */
      ),
      groupTravel:        bool_(r.group_travel ?? r.does_group_travel /* "Does Group Travel" */),
      sportsTravel:       bool_(r.sports_travel ?? r.sports_travel_relevance),
      supporterTravel:    bool_(r.supporter_travel ?? r.does_supporter_travel /* "Does Supporter Travel" */),
      footballTravel:     bool_(r.football ?? r.soccer ?? r.does_football_travel /* "Does Football Travel" */),
      rugbyTravel:        bool_(r.rugby ?? r.does_rugby_travel /* "Does Rugby Travel" */),
      charterRelevance:   bool_(r.charter ?? r.does_charter /* "Does Charter" */ ?? r.charter_capability),
      hospitalityPackages: bool_(r.hospitality ?? r.does_hospitality /* "Does Hospitality" */ ?? r.hospitality_capability),
      bestContactPerson: str(
        r.best_contact ?? r.key_contact ?? r.best_first_target ??
        r.key_contacts_names___roles_ /* "Key Contacts (Names & Roles)" */ ??
        r.contact_name /* File5 */
      ),
      bestOutreachRoute: str(
        r.best_outreach ?? r.best_outreach_method ?? r.best_outreach_route
      ),
      priorityRating: priority_(r.priority ?? r.priority_rating ?? r.rank),
      confidenceLevel: str(r.confidence ?? r.confidence_level),
      notes: str(
        r.notes ?? r.goflexxi_relevance /* "GoFlexxi Relevance" */ ??
        r.services_summary ?? r.goflexxi_opportunity /* File5 */
      ),
      sourceFileId:    fid,
      sourceSheetName: sheet,
    },
  });
  return true;
}

async function insertDept_(r: Record<string, unknown>, fid: string, sheet: string) {
  // Handles: Priority_Targets (File 5), Clubs_Teams (File 5)
  //
  // File 5 Clubs_Teams columns (normalised): club_id, club_team, sport, league, country, city,
  //   stadium, website, market, away_supporter_culture, has_official_away_travel,
  //   has_supporter_travel_page, has_hospitality_packages, uses_external_travel_partner,
  //   external_partner_name, suitable_for_bus, suitable_for_charter, suitable_for_scheduled_air,
  //   internal_contacts_summary, contact_emails, contact_phones, best_entry_point,
  //   goflexxi_relevance, supporter_travel_infrastructure, priority_rating, source_urls, notes
  //
  // File 5 Priority_Targets columns (normalised): rank, club_team, sport, league, country,
  //   best_internal_contact, internal_role, internal_email, internal_phone, internal_linkedin,
  //   external_travel_partner, external_contact, supporter_travel_relevance, charter_relevance,
  //   hospitality_relevance, best_outreach_route, priority_rating, why_this_is_a_priority, notes

  const name = str(
    r.club_name ?? r.club ?? r.team_name ?? r.team ?? r.organization ??
    r.club_team /* "Club/Team" File5 */
  );
  if (!name) return false;

  const emailVal = str(
    r.email ?? r.contact_emails ?? r.internal_email /* "Internal Email" */
  );
  const phoneVal = str(
    r.phone ?? r.contact_phones ?? r.internal_phone /* "Internal Phone" */
  );

  // Build notes combining multiple relevant fields
  const notesParts = [
    str(r.notes),
    str(r.away_supporter_culture) ? `Away culture: ${str(r.away_supporter_culture)}` : null,
    str(r.goflexxi_relevance) ? `GoFlexxi: ${str(r.goflexxi_relevance)}` : null,
    str(r.why_this_is_a_priority) ? `Priority reason: ${str(r.why_this_is_a_priority)}` : null,
  ].filter(Boolean);

  await prisma.clubDepartment.create({
    data: {
      clubName:   name,
      teamName:   str(r.team_name ?? r.team ?? r.club_team),
      sport:      str(r.sport),
      league:     str(r.league),
      department: str(r.department ?? r.dept ?? r.internal_role /* "Internal Role" */),
      country:    str(r.country),
      city:       str(r.city),
      website:    str(r.website),
      email:      emailVal,
      phone:      phoneVal,
      supporterTravelRelevance: bool_(
        r.supporter_travel ?? r.fan_travel ??
        r.has_official_away_travel /* "Has Official Away Travel" */ ??
        r.has_supporter_travel_page ?? r.supporter_travel_relevance /* "Supporter Travel Relevance" */
      ),
      charterRelevance: bool_(
        r.charter ?? r.charter_relevance /* "Charter Relevance" */ ?? r.suitable_for_charter
      ),
      hospitalityRelevance: bool_(
        r.hospitality ?? r.hospitality_relevance ?? r.has_hospitality_packages
      ),
      externalTravelPartner: str(
        r.travel_partner ?? r.external_partner ??
        r.external_partner_name /* "External Partner Name" */ ??
        r.external_travel_partner ?? r.uses_external_travel_partner
      ),
      priorityRating: priority_(r.priority ?? r.priority_rating ?? r.rank),
      bestOutreachRoute: str(
        r.best_outreach ?? r.best_entry_point /* "Best Entry Point" */ ??
        r.best_outreach_route
      ),
      notes: notesParts.join(" | ") || null,
      sourceFileId:    fid,
      sourceSheetName: sheet,
    },
  });
  return true;
}

// ─── Main pipeline function ───────────────────────────────────────────────────

export interface PipelineInput {
  buffer: Buffer;
  filename: string;
  originalName?: string;
  sourceType?: "local_upload" | "google_drive" | "seed";
  driveFileId?: string;
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
      if (!entityType) {
        log.push(`  ${sheetName} → skipped`);
        continue;
      }

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
        } catch (rowErr) {
          skippedRows++;
          const msg = rowErr instanceof Error ? rowErr.message : String(rowErr);
          log.push(`    ✗ row skipped: ${msg.slice(0, 120)}`);
        }
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
        status:         "success",
        completedAt:    new Date(),
        importedRows,
        skippedRows,
        totalRows:      importedRows + skippedRows,
        importedFileId: fileRecord.id,
        log:            log.join("\n"),
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

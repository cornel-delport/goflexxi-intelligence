// Smart column mapper — detects likely column matches for GoFlexxi entity types.
// Users can override via the UI; this is the suggested auto-mapping.

export type EntityType =
  | "event"
  | "supporter_club"
  | "contact"
  | "travel_agent"
  | "club_department"
  | "opportunity"
  | "unknown";

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  confidence: "high" | "medium" | "low";
}

export interface MappingResult {
  detectedType: EntityType;
  typeConfidence: number;
  mappings: ColumnMapping[];
  unmappedColumns: string[];
}

// ─── Entity field aliases ─────────────────────────────────────────────────────

const EVENT_FIELDS: Record<string, string[]> = {
  eventName:      ["event_name", "event", "match", "fixture", "game", "title", "name"],
  competition:    ["competition", "league", "tournament", "cup", "serie", "serie_a", "bundesliga"],
  stage:          ["stage", "round", "phase", "matchday"],
  category:       ["category", "sport", "type"],
  eventDate:      ["date", "start_date", "event_date", "match_date", "fixture_date", "date_text"],
  homeTeamName:   ["home_team", "home", "home_club", "team_home"],
  awayTeamName:   ["away_team", "away", "away_club", "traveling_team", "team_away"],
  venueName:      ["venue", "stadium", "ground", "arena"],
  city:           ["city", "town", "location_city"],
  country:        ["country", "nation"],
  transportOpportunityType: ["transport_type", "opportunity_type", "transport_opportunity_type", "flex_type"],
  closestDepartureAirport: ["departure_airport", "closest_departure_airport", "from_airport"],
  closestArrivalAirport:   ["arrival_airport", "closest_arrival_airport", "to_airport"],
  priorityRating: ["priority", "priority_rating", "priority_score", "priority_bucket"],
  charterWorthy:  ["charter", "charter_worthy", "charter_flight"],
  busWorthy:      ["bus", "bus_worthy", "bus_travel"],
  notes:          ["notes", "comments", "remarks"],
};

const SUPPORTER_CLUB_FIELDS: Record<string, string[]> = {
  clubName:       ["club_name", "supporter_group", "supporter_club", "name", "group_name", "club"],
  officialStatus: ["official", "status", "official_status", "affiliated"],
  teamSupported:  ["team_supported", "team", "supports", "club_supported", "supported_team"],
  scope:          ["scope", "coverage", "reach"],
  city:           ["city", "base_city", "club_base", "location"],
  country:        ["country", "nation", "base_country"],
  members:        ["members", "member_count", "membership", "size"],
  followers:      ["followers", "social_followers", "reach"],
  primaryDepartureAirport: ["airport", "departure_airport", "primary_departure_airport"],
  website:        ["website", "url", "web", "club_website"],
  instagram:      ["instagram", "ig", "insta"],
  facebook:       ["facebook", "fb"],
  x:              ["x", "twitter", "x_twitter"],
  email:          ["email", "contact_email", "public_contact", "e-mail"],
  phone:          ["phone", "telephone", "tel", "contact_phone"],
  bestOutreachRoute: ["reach_method", "best_outreach", "contact_route", "outreach_route"],
  travelCoordinatorFound: ["travel_coordinator", "coordinator_found", "has_coordinator"],
  travelCoordinatorName: ["coordinator_name", "travel_coordinator_name", "organized_travel_coordinator"],
  travelCoordinatorContact: ["coordinator_contact", "coordinator_contact_details"],
  notes:          ["notes", "comments"],
};

const CONTACT_FIELDS: Record<string, string[]> = {
  fullName:       ["full_name", "name", "contact_name", "person", "contact_person"],
  firstName:      ["first_name", "given_name", "forename"],
  lastName:       ["last_name", "surname", "family_name"],
  role:           ["role", "title", "position", "job_title", "job"],
  organization:   ["organization", "company", "club", "team", "employer"],
  organizationType: ["org_type", "organization_type", "contact_type", "type"],
  email:          ["email", "e-mail", "contact_email", "email_address"],
  phone:          ["phone", "telephone", "tel", "mobile", "contact_phone"],
  linkedin:       ["linkedin", "linked_in", "linkedin_url"],
  city:           ["city", "location"],
  country:        ["country", "nation"],
  confidenceLevel: ["confidence", "confidence_level", "data_quality"],
  isDecisionMaker: ["decision_maker", "is_decision_maker", "key_person"],
  bestOutreachRoute: ["best_outreach", "outreach_route", "reach_method"],
  notes:          ["notes", "comments"],
};

const TRAVEL_AGENT_FIELDS: Record<string, string[]> = {
  companyName:    ["company_name", "company", "name", "agency", "agent_name", "agent"],
  specialization: ["specialization", "specialty", "focus", "niche"],
  country:        ["country", "nation"],
  city:           ["city", "location"],
  website:        ["website", "url", "web"],
  email:          ["email", "contact_email"],
  phone:          ["phone", "telephone", "tel"],
  groupTravel:    ["group_travel", "groups"],
  sportsTravel:   ["sports_travel", "sports"],
  supporterTravel: ["supporter_travel", "fans"],
  footballTravel: ["football", "soccer", "football_travel"],
  charterRelevance: ["charter", "charter_relevance", "charter_flight"],
  priorityRating: ["priority", "priority_rating"],
  bestContactPerson: ["best_contact", "key_contact", "contact_person"],
  notes:          ["notes", "comments"],
};

const CLUB_DEPT_FIELDS: Record<string, string[]> = {
  clubName:       ["club_name", "club", "team_name", "team", "organization"],
  teamName:       ["team_name", "team"],
  department:     ["department", "dept", "division", "function"],
  country:        ["country"],
  city:           ["city"],
  email:          ["email", "contact_email"],
  phone:          ["phone", "telephone"],
  supporterTravelRelevance: ["supporter_travel", "fan_travel"],
  charterRelevance: ["charter", "charter_relevance"],
  hospitalityRelevance: ["hospitality", "vip", "packages"],
  externalTravelPartner: ["travel_partner", "external_partner", "travel_agency"],
  notes:          ["notes", "comments"],
};

const ALL_FIELD_MAPS: Record<EntityType, Record<string, string[]>> = {
  event:          EVENT_FIELDS,
  supporter_club: SUPPORTER_CLUB_FIELDS,
  contact:        CONTACT_FIELDS,
  travel_agent:   TRAVEL_AGENT_FIELDS,
  club_department: CLUB_DEPT_FIELDS,
  opportunity:    EVENT_FIELDS, // reuse event for now
  unknown:        {},
};

// ─── Type detection heuristics ────────────────────────────────────────────────

const TYPE_SIGNALS: Record<EntityType, string[]> = {
  event: ["event_name", "match", "fixture", "competition", "home_team", "away_team", "venue"],
  supporter_club: ["supporter_group", "supporter_club", "team_supported", "reach_method", "members"],
  contact: ["full_name", "first_name", "role", "linkedin", "job_title"],
  travel_agent: ["agency", "agent", "group_travel", "sports_travel"],
  club_department: ["department", "internal_contact", "supporter_travel_relevance"],
  opportunity: ["opportunity", "flex_type"],
  unknown: [],
};

export function detectEntityType(headers: string[]): { type: EntityType; confidence: number } {
  const normalizedHeaders = headers.map((h) =>
    h.toLowerCase().replace(/[\s\-]/g, "_")
  );

  const scores: Record<EntityType, number> = {
    event: 0,
    supporter_club: 0,
    contact: 0,
    travel_agent: 0,
    club_department: 0,
    opportunity: 0,
    unknown: 0,
  };

  for (const [type, signals] of Object.entries(TYPE_SIGNALS) as [EntityType, string[]][]) {
    for (const signal of signals) {
      if (normalizedHeaders.some((h) => h.includes(signal) || signal.includes(h))) {
        scores[type]++;
      }
    }
  }

  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const [topType, topScore] = sorted[0];
  const total = signals_total(TYPE_SIGNALS[topType as EntityType]);

  return {
    type: topScore > 0 ? (topType as EntityType) : "unknown",
    confidence: total > 0 ? Math.min(100, Math.round((topScore / total) * 100 * 2)) : 0,
  };
}

function signals_total(signals: string[]): number {
  return Math.max(signals.length, 1);
}

// ─── Column mapping ───────────────────────────────────────────────────────────

export function mapColumns(
  headers: string[],
  entityType: EntityType
): MappingResult {
  const fieldMap = ALL_FIELD_MAPS[entityType];
  const normalizedHeaders = headers.map((h) => ({
    original: h,
    normalized: h.toLowerCase().replace(/[\s\-\(\)]/g, "_"),
  }));

  const mappings: ColumnMapping[] = [];
  const mappedSources = new Set<string>();

  for (const [targetField, aliases] of Object.entries(fieldMap)) {
    for (const header of normalizedHeaders) {
      if (mappedSources.has(header.original)) continue;

      for (const alias of aliases) {
        if (
          header.normalized === alias ||
          header.normalized.includes(alias) ||
          alias.includes(header.normalized)
        ) {
          const exactMatch = header.normalized === alias;
          const partialMatch = header.normalized.includes(alias) || alias.includes(header.normalized);

          mappings.push({
            sourceColumn: header.original,
            targetField,
            confidence: exactMatch ? "high" : partialMatch ? "medium" : "low",
          });
          mappedSources.add(header.original);
          break;
        }
      }
      if (mappedSources.has(header.original)) break;
    }
  }

  const unmappedColumns = headers.filter((h) => !mappedSources.has(h));

  const { type: detectedType, confidence: typeConfidence } = detectEntityType(headers);

  return {
    detectedType: entityType !== "unknown" ? entityType : detectedType,
    typeConfidence,
    mappings,
    unmappedColumns,
  };
}

// ─── Apply mappings to a row ──────────────────────────────────────────────────

export function applyMappings(
  row: Record<string, unknown>,
  mappings: ColumnMapping[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const mapping of mappings) {
    const value = row[mapping.sourceColumn];
    if (value !== null && value !== undefined && value !== "") {
      result[mapping.targetField] = value;
    }
  }
  return result;
}

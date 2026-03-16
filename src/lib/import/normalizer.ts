// Normalizes mapped rows into Prisma-ready create inputs per entity type.
import { parseFlexibleDate, normalizeString, normalizeBoolean, normalizeInt } from "@/lib/utils";
import type { EntityType } from "./mapper";

export function normalizeRow(
  mapped: Record<string, unknown>,
  entityType: EntityType,
  sourceFileId: string,
  sourceSheetName: string
): Record<string, unknown> | null {
  switch (entityType) {
    case "event":
    case "opportunity":
      return normalizeEvent(mapped, sourceFileId, sourceSheetName);
    case "supporter_club":
      return normalizeSupporterClub(mapped, sourceFileId, sourceSheetName);
    case "contact":
      return normalizeContact(mapped, sourceFileId, sourceSheetName);
    case "travel_agent":
      return normalizeTravelAgent(mapped, sourceFileId, sourceSheetName);
    case "club_department":
      return normalizeClubDept(mapped, sourceFileId, sourceSheetName);
    default:
      return null;
  }
}

function normalizeEvent(m: Record<string, unknown>, fileId: string, sheet: string) {
  const eventName = normalizeString(m.eventName || m.event || m.match || m.fixture);
  if (!eventName) return null;

  const rawPriority = m.priorityRating ?? m.priority_bucket;
  let priorityRating: number | null = null;
  if (typeof rawPriority === "number") {
    priorityRating = Math.min(5, Math.max(1, Math.round(rawPriority)));
  } else if (typeof rawPriority === "string") {
    if (rawPriority.toLowerCase().includes("high") || rawPriority === "A") priorityRating = 5;
    else if (rawPriority.toLowerCase().includes("med") || rawPriority === "B") priorityRating = 3;
    else if (rawPriority.toLowerCase().includes("low") || rawPriority === "C") priorityRating = 2;
    else priorityRating = normalizeInt(rawPriority);
  }

  return {
    eventName,
    competition: normalizeString(m.competition) || null,
    stage: normalizeString(m.stage) || null,
    category: normalizeString(m.category) || null,
    eventDate: parseFlexibleDate(m.eventDate ?? m.date),
    dateText: normalizeString(m.eventDate ?? m.date ?? m.dateText) || null,
    homeTeamName: normalizeString(m.homeTeamName) || null,
    awayTeamName: normalizeString(m.awayTeamName) || null,
    venueName: normalizeString(m.venueName) || null,
    city: normalizeString(m.city) || null,
    country: normalizeString(m.country) || null,
    transportOpportunityType: normalizeString(m.transportOpportunityType) || null,
    closestDepartureAirport: normalizeString(m.closestDepartureAirport) || null,
    closestArrivalAirport: normalizeString(m.closestArrivalAirport) || null,
    priorityRating,
    charterWorthy: normalizeBoolean(m.charterWorthy ?? m.charter),
    busWorthy: normalizeBoolean(m.busWorthy ?? m.bus),
    flightWorthy: normalizeBoolean(m.flightWorthy ?? m.flight),
    notes: normalizeString(m.notes) || null,
    sourceFileId: fileId,
    sourceSheetName: sheet,
  };
}

function normalizeSupporterClub(m: Record<string, unknown>, fileId: string, sheet: string) {
  const clubName = normalizeString(m.clubName || m.supporter_group || m.name);
  if (!clubName) return null;

  return {
    clubName,
    officialStatus: normalizeString(m.officialStatus) || null,
    teamSupported: normalizeString(m.teamSupported) || null,
    scope: normalizeString(m.scope) || null,
    city: normalizeString(m.city) || null,
    country: normalizeString(m.country) || null,
    members: normalizeInt(m.members),
    followers: normalizeInt(m.followers),
    primaryDepartureAirport: normalizeString(m.primaryDepartureAirport) || null,
    website: normalizeString(m.website) || null,
    instagram: normalizeString(m.instagram) || null,
    facebook: normalizeString(m.facebook) || null,
    x: normalizeString(m.x) || null,
    linkedin: normalizeString(m.linkedin) || null,
    whatsapp: normalizeString(m.whatsapp) || null,
    email: normalizeString(m.email) || null,
    phone: normalizeString(m.phone) || null,
    bestOutreachRoute: normalizeString(m.bestOutreachRoute) || null,
    travelCoordinatorFound: normalizeBoolean(m.travelCoordinatorFound),
    travelCoordinatorName: normalizeString(m.travelCoordinatorName) || null,
    travelCoordinatorContact: normalizeString(m.travelCoordinatorContact) || null,
    notes: normalizeString(m.notes) || null,
    sourceFileId: fileId,
    sourceSheetName: sheet,
  };
}

function normalizeContact(m: Record<string, unknown>, fileId: string, sheet: string) {
  const fullName = normalizeString(
    m.fullName ?? `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim()
  );
  if (!fullName) return null;

  return {
    fullName,
    firstName: normalizeString(m.firstName) || null,
    lastName: normalizeString(m.lastName) || null,
    role: normalizeString(m.role) || null,
    organizationType: normalizeString(m.organizationType) || null,
    organization: normalizeString(m.organization) || null,
    email: normalizeString(m.email) || null,
    phone: normalizeString(m.phone) || null,
    linkedin: normalizeString(m.linkedin) || null,
    instagram: normalizeString(m.instagram) || null,
    city: normalizeString(m.city) || null,
    country: normalizeString(m.country) || null,
    confidenceLevel: normalizeString(m.confidenceLevel) || "low",
    isDecisionMaker: normalizeBoolean(m.isDecisionMaker),
    supporterTravelRelevance: normalizeBoolean(m.supporterTravelRelevance),
    charterRelevance: normalizeBoolean(m.charterRelevance),
    bestOutreachRoute: normalizeString(m.bestOutreachRoute) || null,
    notes: normalizeString(m.notes) || null,
    sourceFileId: fileId,
    sourceSheetName: sheet,
  };
}

function normalizeTravelAgent(m: Record<string, unknown>, fileId: string, sheet: string) {
  const companyName = normalizeString(m.companyName || m.company || m.name);
  if (!companyName) return null;

  return {
    companyName,
    specialization: normalizeString(m.specialization) || null,
    country: normalizeString(m.country) || null,
    city: normalizeString(m.city) || null,
    website: normalizeString(m.website) || null,
    email: normalizeString(m.email) || null,
    phone: normalizeString(m.phone) || null,
    groupTravel: normalizeBoolean(m.groupTravel),
    sportsTravel: normalizeBoolean(m.sportsTravel),
    supporterTravel: normalizeBoolean(m.supporterTravel),
    footballTravel: normalizeBoolean(m.footballTravel),
    charterRelevance: normalizeBoolean(m.charterRelevance),
    hospitalityPackages: normalizeBoolean(m.hospitalityPackages),
    bestContactPerson: normalizeString(m.bestContactPerson) || null,
    bestOutreachRoute: normalizeString(m.bestOutreachRoute) || null,
    priorityRating: normalizeInt(m.priorityRating),
    notes: normalizeString(m.notes) || null,
    sourceFileId: fileId,
    sourceSheetName: sheet,
  };
}

function normalizeClubDept(m: Record<string, unknown>, fileId: string, sheet: string) {
  const clubName = normalizeString(m.clubName || m.club || m.team);
  if (!clubName) return null;

  return {
    clubName,
    teamName: normalizeString(m.teamName) || null,
    department: normalizeString(m.department) || null,
    country: normalizeString(m.country) || null,
    city: normalizeString(m.city) || null,
    website: normalizeString(m.website) || null,
    email: normalizeString(m.email) || null,
    phone: normalizeString(m.phone) || null,
    supporterTravelRelevance: normalizeBoolean(m.supporterTravelRelevance),
    charterRelevance: normalizeBoolean(m.charterRelevance),
    hospitalityRelevance: normalizeBoolean(m.hospitalityRelevance),
    externalTravelPartner: normalizeString(m.externalTravelPartner) || null,
    notes: normalizeString(m.notes) || null,
    sourceFileId: fileId,
    sourceSheetName: sheet,
  };
}

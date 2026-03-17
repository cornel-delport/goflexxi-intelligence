import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";

    if (!q || q.length < 2) {
      return NextResponse.json({ results: {}, query: q, total: 0 });
    }

    const contains = { contains: q, mode: "insensitive" as const };

    const [events, supporterClubs, contacts, travelAgents, clubDepts, opportunities] =
      await Promise.all([
        prisma.event.findMany({
          where: {
            OR: [
              { eventName:    contains },
              { homeTeamName: contains },
              { awayTeamName: contains },
              { competition:  contains },
              { category:     contains },
              { stage:        contains },
              { city:         contains },
              { country:      contains },
              { venueName:    contains },
              { notes:        contains },
              { dateText:     contains },
            ],
          },
          orderBy: { eventDate: "asc" },
          take: 8,
        }),

        prisma.supporterClub.findMany({
          where: {
            OR: [
              { clubName:      contains },
              { teamSupported: contains },
              { city:          contains },
              { country:       contains },
              { region:        contains },
              { email:         contains },
              { phone:         contains },
              { notes:         contains },
              { travelCoordinatorName: contains },
              { bestOutreachRoute:     contains },
            ],
          },
          take: 8,
          include: { contacts: { take: 2, select: { fullName: true, email: true, role: true } } },
        }),

        prisma.contact.findMany({
          where: {
            OR: [
              { fullName:     contains },
              { email:        contains },
              { phone:        contains },
              { role:         contains },
              { organization: contains },
              { country:      contains },
              { city:         contains },
              { notes:        contains },
              { bestOutreachRoute: contains },
            ],
          },
          take: 8,
          include: {
            supporterClub:  { select: { clubName: true } },
            travelAgent:    { select: { companyName: true } },
            clubDepartment: { select: { clubName: true } },
          },
        }),

        prisma.travelAgent.findMany({
          where: {
            OR: [
              { companyName:      contains },
              { specialization:   contains },
              { country:          contains },
              { city:             contains },
              { region:           contains },
              { email:            contains },
              { phone:            contains },
              { bestContactPerson: contains },
              { notes:            contains },
            ],
          },
          take: 8,
        }),

        prisma.clubDepartment.findMany({
          where: {
            OR: [
              { clubName:   contains },
              { teamName:   contains },
              { department: contains },
              { country:    contains },
              { city:       contains },
              { email:      contains },
              { phone:      contains },
              { notes:      contains },
              { externalTravelPartner: contains },
            ],
          },
          take: 8,
        }),

        prisma.opportunity.findMany({
          where: {
            OR: [
              { title:         contains },
              { travelingTeam: contains },
              { targetMarket:  contains },
              { country:       contains },
              { city:          contains },
              { competition:   contains },
              { venue:         contains },
              { whyItMatters:  contains },
            ],
          },
          take: 8,
        }),
      ]);

    const total =
      events.length +
      supporterClubs.length +
      contacts.length +
      travelAgents.length +
      clubDepts.length +
      opportunities.length;

    return NextResponse.json({
      query: q,
      total,
      results: {
        events,
        supporterClubs,
        contacts,
        travelAgents,
        clubDepts,
        opportunities,
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

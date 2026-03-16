import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";

    if (!q || q.length < 2) {
      return NextResponse.json({ results: {}, query: q, total: 0 });
    }

    const contains = { contains: q };

    const [events, supporterClubs, contacts, travelAgents, clubDepts, opportunities] =
      await Promise.all([
        prisma.event.findMany({
          where: {
            OR: [
              { eventName:    contains },
              { homeTeamName: contains },
              { awayTeamName: contains },
              { competition:  contains },
              { city:         contains },
              { country:      contains },
              { venueName:    contains },
            ],
          },
          orderBy: { eventDate: "asc" },
          take: 5,
        }),

        prisma.supporterClub.findMany({
          where: {
            OR: [
              { clubName:      contains },
              { teamSupported: contains },
              { city:          contains },
              { country:       contains },
              { email:         contains },
            ],
          },
          take: 5,
          include: { contacts: { take: 1, select: { fullName: true, email: true } } },
        }),

        prisma.contact.findMany({
          where: {
            OR: [
              { fullName:     contains },
              { email:        contains },
              { role:         contains },
              { organization: contains },
              { country:      contains },
              { city:         contains },
            ],
          },
          take: 5,
          include: {
            supporterClub:  { select: { clubName: true } },
            travelAgent:    { select: { companyName: true } },
            clubDepartment: { select: { clubName: true } },
          },
        }),

        prisma.travelAgent.findMany({
          where: {
            OR: [
              { companyName:    contains },
              { specialization: contains },
              { country:        contains },
              { city:           contains },
            ],
          },
          take: 5,
        }),

        prisma.clubDepartment.findMany({
          where: {
            OR: [
              { clubName:   contains },
              { teamName:   contains },
              { department: contains },
              { country:    contains },
            ],
          },
          take: 5,
        }),

        prisma.opportunity.findMany({
          where: {
            OR: [
              { title:         contains },
              { travelingTeam: contains },
              { targetMarket:  contains },
              { country:       contains },
              { competition:   contains },
            ],
          },
          take: 5,
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

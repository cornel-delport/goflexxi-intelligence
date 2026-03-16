import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q           = searchParams.get("q") ?? "";
    const country     = searchParams.get("country") ?? "";
    const competition = searchParams.get("competition") ?? "";
    const transport   = searchParams.get("transport") ?? "";
    const status      = searchParams.get("status") ?? "";
    const priority    = searchParams.get("priority") ?? "";
    const page        = parseInt(searchParams.get("page") ?? "1");
    const limit       = parseInt(searchParams.get("limit") ?? "50");
    const skip        = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (q) {
      where.OR = [
        { title:          { contains: q } },
        { travelingTeam:  { contains: q } },
        { targetMarket:   { contains: q } },
        { competition:    { contains: q } },
        { country:        { contains: q } },
        { city:           { contains: q } },
      ];
    }

    if (country)   where.country   = { contains: country };
    if (competition) where.competition = { contains: competition };
    if (status)    where.status    = status;
    if (priority)  where.priorityRating = { gte: parseInt(priority) };
    if (transport) {
      const t = transport.toLowerCase();
      if (t === "bus")     where.busWorthy     = true;
      if (t === "charter") where.charterWorthy = true;
      if (t === "flight")  where.flightWorthy  = true;
      if (t === "hospitality") where.hospitalityWorthy = true;
      if (t === "mixed" || !["bus","charter","flight","hospitality"].includes(t)) {
        where.transportType = { contains: transport };
      }
    }

    const [opportunities, total] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        orderBy: [{ priorityRating: "desc" }, { eventDate: "asc" }],
        skip,
        take: limit,
        include: {
          event: { select: { eventName: true, homeTeamName: true, awayTeamName: true, venueName: true } },
          sourceFile: { select: { originalName: true } },
          notes_list: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      }),
      prisma.opportunity.count({ where }),
    ]);

    return NextResponse.json({ opportunities, total, page, limit });
  } catch (error) {
    console.error("Opportunities GET error:", error);
    return NextResponse.json({ error: "Failed to fetch opportunities" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const opp = await prisma.opportunity.create({ data });
    return NextResponse.json(opp, { status: 201 });
  } catch (error) {
    console.error("Opportunities POST error:", error);
    return NextResponse.json({ error: "Failed to create opportunity" }, { status: 500 });
  }
}

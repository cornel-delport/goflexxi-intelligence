import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q         = searchParams.get("q") ?? "";
    const country   = searchParams.get("country") ?? "";
    const competition = searchParams.get("competition") ?? "";
    const transport = searchParams.get("transport") ?? "";
    const priority  = searchParams.get("priority") ?? "";
    const dateFrom  = searchParams.get("dateFrom");
    const dateTo    = searchParams.get("dateTo");
    const page      = parseInt(searchParams.get("page") ?? "1");
    const limit     = parseInt(searchParams.get("limit") ?? "50");
    const skip      = (page - 1) * limit;

    const where: Record<string, unknown> = { status: "active" };

    if (q) {
      where.OR = [
        { eventName:     { contains: q } },
        { homeTeamName:  { contains: q } },
        { awayTeamName:  { contains: q } },
        { competition:   { contains: q } },
        { city:          { contains: q } },
        { country:       { contains: q } },
        { venueName:     { contains: q } },
      ];
    }

    if (country)     where.country     = { contains: country };
    if (competition) where.competition = { contains: competition };
    if (transport)   where.transportOpportunityType = { contains: transport };
    if (priority)    where.priorityRating = { gte: parseInt(priority) };
    if (dateFrom || dateTo) {
      where.eventDate = {};
      if (dateFrom) (where.eventDate as Record<string,unknown>).gte = new Date(dateFrom);
      if (dateTo)   (where.eventDate as Record<string,unknown>).lte = new Date(dateTo);
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: [{ eventDate: "asc" }, { priorityRating: "desc" }],
        skip,
        take: limit,
        include: { sourceFile: { select: { originalName: true } } },
      }),
      prisma.event.count({ where }),
    ]);

    return NextResponse.json({ events, total, page, limit });
  } catch (error) {
    console.error("Events GET error:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const event = await prisma.event.create({ data });
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Events POST error:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}

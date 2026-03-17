import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q       = searchParams.get("q") ?? "";
    const country = searchParams.get("country") ?? "";
    const team    = searchParams.get("team") ?? "";
    const sport   = searchParams.get("sport") ?? "";
    const page    = parseInt(searchParams.get("page") ?? "1");
    const limit   = parseInt(searchParams.get("limit") ?? "50");
    const skip    = (page - 1) * limit;

    const where: Record<string, unknown> = { status: "active" };

    if (q) {
      where.OR = [
        { clubName:      { contains: q, mode: "insensitive" } },
        { teamSupported: { contains: q, mode: "insensitive" } },
        { sport:         { contains: q, mode: "insensitive" } },
        { city:          { contains: q, mode: "insensitive" } },
        { country:       { contains: q, mode: "insensitive" } },
        { email:         { contains: q, mode: "insensitive" } },
        { notes:         { contains: q, mode: "insensitive" } },
      ];
    }

    if (country) where.country       = { contains: country, mode: "insensitive" };
    if (team)    where.teamSupported  = { contains: team,    mode: "insensitive" };
    if (sport)   where.sport          = { contains: sport,   mode: "insensitive" };

    const [clubs, total] = await Promise.all([
      prisma.supporterClub.findMany({
        where,
        orderBy: [{ supporterRelevance: "desc" }, { clubName: "asc" }],
        skip,
        take: limit,
        include: {
          contacts: { take: 3, select: { id: true, fullName: true, role: true, email: true } },
          sourceFile: { select: { originalName: true } },
        },
      }),
      prisma.supporterClub.count({ where }),
    ]);

    return NextResponse.json({ clubs, total, page, limit });
  } catch (error) {
    console.error("Supporter clubs GET error:", error);
    return NextResponse.json({ error: "Failed to fetch supporter clubs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const club = await prisma.supporterClub.create({ data });
    return NextResponse.json(club, { status: 201 });
  } catch (error) {
    console.error("Supporter clubs POST error:", error);
    return NextResponse.json({ error: "Failed to create supporter club" }, { status: 500 });
  }
}

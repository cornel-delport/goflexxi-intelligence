import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q       = searchParams.get("q") ?? "";
    const country = searchParams.get("country") ?? "";
    const page    = parseInt(searchParams.get("page") ?? "1");
    const limit   = parseInt(searchParams.get("limit") ?? "50");
    const skip    = (page - 1) * limit;

    const where: Record<string, unknown> = { status: "active" };

    if (q) {
      where.OR = [
        { companyName:    { contains: q } },
        { specialization: { contains: q } },
        { country:        { contains: q } },
        { city:           { contains: q } },
      ];
    }

    if (country) where.country = { contains: country };

    const [agents, total] = await Promise.all([
      prisma.travelAgent.findMany({
        where,
        orderBy: [{ priorityRating: "desc" }, { companyName: "asc" }],
        skip,
        take: limit,
        include: {
          contacts: { take: 2, select: { id: true, fullName: true, role: true, email: true } },
          sourceFile: { select: { originalName: true } },
        },
      }),
      prisma.travelAgent.count({ where }),
    ]);

    return NextResponse.json({ agents, total, page, limit });
  } catch (error) {
    console.error("Travel agents GET error:", error);
    return NextResponse.json({ error: "Failed to fetch travel agents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const agent = await prisma.travelAgent.create({ data });
    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error("Travel agents POST error:", error);
    return NextResponse.json({ error: "Failed to create travel agent" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q    = searchParams.get("q") ?? "";
    const type = searchParams.get("type") ?? "";
    const country = searchParams.get("country") ?? "";
    const org  = searchParams.get("org") ?? "";
    const confidence = searchParams.get("confidence") ?? "";
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { status: "active" };

    if (q) {
      where.OR = [
        { fullName:     { contains: q } },
        { email:        { contains: q } },
        { role:         { contains: q } },
        { organization: { contains: q } },
        { country:      { contains: q } },
        { city:         { contains: q } },
      ];
    }

    if (type)       where.organizationType = { contains: type };
    if (country)    where.country          = { contains: country };
    if (org)        where.organization     = { contains: org };
    if (confidence) where.confidenceLevel  = confidence;

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: [{ confidenceLevel: "asc" }, { fullName: "asc" }],
        skip,
        take: limit,
        include: {
          supporterClub:   { select: { id: true, clubName: true } },
          travelAgent:     { select: { id: true, companyName: true } },
          clubDepartment:  { select: { id: true, clubName: true, department: true } },
          sourceFile:      { select: { originalName: true } },
        },
      }),
      prisma.contact.count({ where }),
    ]);

    return NextResponse.json({ contacts, total, page, limit });
  } catch (error) {
    console.error("Contacts GET error:", error);
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const contact = await prisma.contact.create({ data });
    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error("Contacts POST error:", error);
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }
}

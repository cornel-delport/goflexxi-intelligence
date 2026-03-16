import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q       = searchParams.get("q") ?? "";
    const country = searchParams.get("country") ?? "";
    const dept    = searchParams.get("dept") ?? "";
    const page    = parseInt(searchParams.get("page") ?? "1");
    const limit   = parseInt(searchParams.get("limit") ?? "50");
    const skip    = (page - 1) * limit;

    const where: Record<string, unknown> = { status: "active" };

    if (q) {
      where.OR = [
        { clubName:   { contains: q } },
        { teamName:   { contains: q } },
        { department: { contains: q } },
        { country:    { contains: q } },
        { city:       { contains: q } },
      ];
    }

    if (country) where.country    = { contains: country };
    if (dept)    where.department = { contains: dept };

    const [departments, total] = await Promise.all([
      prisma.clubDepartment.findMany({
        where,
        orderBy: [{ priorityRating: "desc" }, { clubName: "asc" }],
        skip,
        take: limit,
        include: {
          contacts: { take: 2, select: { id: true, fullName: true, role: true, email: true } },
          sourceFile: { select: { originalName: true } },
        },
      }),
      prisma.clubDepartment.count({ where }),
    ]);

    return NextResponse.json({ departments, total, page, limit });
  } catch (error) {
    console.error("Club departments GET error:", error);
    return NextResponse.json({ error: "Failed to fetch club departments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const dept = await prisma.clubDepartment.create({ data });
    return NextResponse.json(dept, { status: 201 });
  } catch (error) {
    console.error("Club departments POST error:", error);
    return NextResponse.json({ error: "Failed to create club department" }, { status: 500 });
  }
}

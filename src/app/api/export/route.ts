import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "contacts";
    const q    = searchParams.get("q") ?? "";

    let rows: Record<string, unknown>[] = [];

    const contains = q ? { contains: q } : undefined;

    if (type === "contacts") {
      rows = await prisma.contact.findMany({
        where: { status: "active", ...(contains ? { OR: [{ fullName: contains }, { organization: contains }] } : {}) },
        orderBy: { fullName: "asc" },
      }) as Record<string, unknown>[];
    } else if (type === "supporter-clubs") {
      rows = await prisma.supporterClub.findMany({
        where: { status: "active" },
        orderBy: { clubName: "asc" },
      }) as Record<string, unknown>[];
    } else if (type === "opportunities") {
      rows = await prisma.opportunity.findMany({
        orderBy: [{ priorityRating: "desc" }, { eventDate: "asc" }],
      }) as Record<string, unknown>[];
    } else if (type === "events") {
      rows = await prisma.event.findMany({
        where: { status: "active" },
        orderBy: { eventDate: "asc" },
      }) as Record<string, unknown>[];
    }

    if (!rows.length) {
      return NextResponse.json({ error: "No data" }, { status: 404 });
    }

    // Build CSV
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers.map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          const str = String(val);
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(",")
      ),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="goflexxi-${type}-export.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

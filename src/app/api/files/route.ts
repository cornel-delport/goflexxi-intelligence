import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const files = await prisma.importedFile.findMany({
      orderBy: { importedAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ files });
  } catch (error) {
    console.error("Files GET error:", error);
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
  }
}

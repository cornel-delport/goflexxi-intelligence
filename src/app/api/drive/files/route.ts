import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/drive/files — list all discovered Drive files with their status */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // optional filter

  const where = status ? { importStatus: status } : {};

  const files = await prisma.driveFile.findMany({
    where,
    orderBy: { modifiedAtDrive: "desc" },
    include: {
      importJobs: {
        orderBy: { startedAt: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json({ files });
}

/** PATCH /api/drive/files — update a file's status (e.g. mark as ignored) */
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { driveFileId, importStatus, notes } = body as {
    driveFileId: string;
    importStatus?: string;
    notes?: string;
  };

  if (!driveFileId) {
    return NextResponse.json({ error: "driveFileId required" }, { status: 400 });
  }

  const updated = await prisma.driveFile.update({
    where: { driveFileId },
    data: {
      ...(importStatus && { importStatus }),
      ...(notes        && { notes }),
    },
  });

  return NextResponse.json({ file: updated });
}

import { NextResponse } from "next/server";
import { checkDriveConnection, DRIVE_FOLDER_ID } from "@/lib/drive";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [connection, stats] = await Promise.all([
      checkDriveConnection(),
      prisma.driveFile.groupBy({
        by: ["importStatus"],
        _count: { _all: true },
      }),
    ]);

    const counts: Record<string, number> = {};
    for (const row of stats) {
      counts[row.importStatus] = row._count._all;
    }

    const lastScan = await prisma.driveFile.findFirst({
      orderBy: { lastSyncedAt: "desc" },
      select: { lastSyncedAt: true },
    });

    return NextResponse.json({
      ...connection,
      folderId: DRIVE_FOLDER_ID,
      lastScanAt: lastScan?.lastSyncedAt ?? null,
      counts: {
        total:         Object.values(counts).reduce((a, b) => a + b, 0),
        pending:       counts["pending"]   ?? 0,
        imported:      counts["imported"]  ?? 0,
        updated:       counts["updated"]   ?? 0,
        failed:        counts["failed"]    ?? 0,
        ignored:       counts["ignored"]   ?? 0,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

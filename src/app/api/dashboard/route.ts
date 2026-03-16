import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays, startOfDay } from "date-fns";

// Read folder ID from env — no drive.ts import to avoid webpack bundling googleapis
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID ?? "1g2XoVq-kZ2_70dkRcfN-JFovWyyjycdC";

export async function GET() {
  try {
    const now  = new Date();
    const in30 = addDays(now, 30);
    const in60 = addDays(now, 60);
    const in90 = addDays(now, 90);

    const [
      totalEvents,
      totalOpportunities,
      totalSupporterClubs,
      totalContacts,
      totalTravelAgents,
      totalClubDepts,
      totalFiles,
      events30,
      events60,
      events90,
      highPriorityOpps,
      recentFiles,
      missingEmail,
      missingPhone,
      opportunitiesByType,
      opportunitiesByCountry,
      upcomingEvents,
      driveFileCounts,
      driveLastScan,
    ] = await Promise.all([
      prisma.event.count({ where: { status: "active" } }),
      prisma.opportunity.count(),
      prisma.supporterClub.count({ where: { status: "active" } }),
      prisma.contact.count({ where: { status: "active" } }),
      prisma.travelAgent.count({ where: { status: "active" } }),
      prisma.clubDepartment.count({ where: { status: "active" } }),
      prisma.importedFile.count(),

      prisma.event.count({ where: { eventDate: { gte: startOfDay(now), lte: in30 } } }),
      prisma.event.count({ where: { eventDate: { gte: startOfDay(now), lte: in60 } } }),
      prisma.event.count({ where: { eventDate: { gte: startOfDay(now), lte: in90 } } }),

      prisma.opportunity.findMany({
        where: { priorityRating: { gte: 4 } },
        orderBy: [{ priorityRating: "desc" }, { eventDate: "asc" }],
        take: 8,
      }),

      prisma.importedFile.findMany({
        orderBy: { importedAt: "desc" },
        take: 5,
      }),

      prisma.contact.count({ where: { email: null, status: "active" } }),
      prisma.contact.count({ where: { phone: null, status: "active" } }),

      prisma.opportunity.groupBy({
        by: ["transportType"],
        _count: true,
        where: { transportType: { not: null } },
      }),

      prisma.opportunity.groupBy({
        by: ["country"],
        _count: true,
        where: { country: { not: null } },
        orderBy: { _count: { country: "desc" } },
        take: 8,
      }),

      prisma.event.findMany({
        where: { eventDate: { gte: startOfDay(now), lte: in30 }, status: "active" },
        orderBy: { eventDate: "asc" },
        take: 10,
      }),

      // Drive file status counts — pure DB query, no googleapis import needed
      prisma.driveFile.groupBy({ by: ["importStatus"], _count: { _all: true } }),

      prisma.driveFile.findFirst({
        orderBy: { lastSyncedAt: "desc" },
        select: { lastSyncedAt: true },
      }),
    ]);

    // Drive is "configured" if we have the env var; connection status comes from /api/drive/status
    const driveConfigured = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    const driveCounts: Record<string, number> = {};
    for (const row of driveFileCounts) {
      driveCounts[row.importStatus] = row._count._all;
    }
    const driveNewFiles     = (driveCounts["pending"] ?? 0) + (driveCounts["updated"] ?? 0);
    const driveImported     = driveCounts["imported"] ?? 0;
    const driveFailed       = driveCounts["failed"]   ?? 0;
    const driveTotalTracked = Object.values(driveCounts).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      stats: {
        totalEvents,
        totalOpportunities,
        totalSupporterClubs,
        totalContacts,
        totalTravelAgents,
        totalClubDepts,
        totalFiles,
      },
      upcoming: { events30, events60, events90 },
      highPriorityOpps,
      recentFiles,
      dataQuality: { missingEmail, missingPhone },
      charts: {
        byType: opportunitiesByType.map((r) => ({
          name: r.transportType ?? "Unknown",
          value: r._count,
        })),
        byCountry: opportunitiesByCountry.map((r) => ({
          name: r.country ?? "Unknown",
          value: r._count,
        })),
      },
      upcomingEvents,
      drive: {
        configured:   driveConfigured,
        connected:    null, // fetched separately by /api/drive/status
        error:        null,
        folderId:     DRIVE_FOLDER_ID,
        lastScanAt:   driveLastScan?.lastSyncedAt ?? null,
        newFiles:     driveNewFiles,
        imported:     driveImported,
        failed:       driveFailed,
        totalTracked: driveTotalTracked,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}

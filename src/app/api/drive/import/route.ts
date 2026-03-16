import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { downloadDriveFile } from "@/lib/drive";
import { runImportPipeline } from "@/lib/import-pipeline";

/**
 * POST /api/drive/import
 * Body: { driveFileId: string } — import a single file from Drive
 *       { driveFileIds: string[] } — import multiple files
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  // Support single or batch import
  const ids: string[] = body.driveFileIds
    ?? (body.driveFileId ? [body.driveFileId] : []);

  if (ids.length === 0) {
    return NextResponse.json(
      { error: "driveFileId or driveFileIds required" },
      { status: 400 }
    );
  }

  const results = [];

  for (const driveFileId of ids) {
    const driveFile = await prisma.driveFile.findUnique({
      where: { driveFileId },
    });

    if (!driveFile) {
      results.push({ driveFileId, error: "File not found in database. Run a scan first." });
      continue;
    }

    // Mark as importing
    await prisma.driveFile.update({
      where: { driveFileId },
      data: { importStatus: "importing" },
    });

    try {
      // Download file content from Google Drive
      const buffer = await downloadDriveFile(driveFileId);

      // Delete old records if this is a re-import
      if (driveFile.importedFileId) {
        await deleteRecordsForFile(driveFile.importedFileId);
        await prisma.importedFile.delete({
          where: { id: driveFile.importedFileId },
        }).catch(() => {});
      }

      // Run the unified import pipeline
      const result = await runImportPipeline({
        buffer,
        filename:   driveFile.name,
        originalName: driveFile.name,
        sourceType: "google_drive",
        driveFileId,
        fileMtime:  driveFile.modifiedAtDrive ?? undefined,
      });

      // Update DriveFile with success
      await prisma.driveFile.update({
        where: { driveFileId },
        data: {
          importStatus:    result.error ? "failed" : "imported",
          alreadyImported: !result.error,
          lastImportedAt:  new Date(),
          importedFileId:  result.importedFileId,
          lastSyncedAt:    new Date(),
        },
      });

      results.push({
        driveFileId,
        filename:     driveFile.name,
        importedRows: result.importedRows,
        skippedRows:  result.skippedRows,
        error:        result.error ?? null,
        status:       result.error ? "failed" : "imported",
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      await prisma.driveFile.update({
        where: { driveFileId },
        data: { importStatus: "failed", notes: msg },
      });

      results.push({ driveFileId, error: msg, status: "failed" });
    }
  }

  const anyFailed  = results.some((r) => r.status === "failed");
  const anySuccess = results.some((r) => r.status === "imported");

  return NextResponse.json({
    results,
    summary: {
      total:   results.length,
      success: results.filter((r) => r.status === "imported").length,
      failed:  results.filter((r) => r.status === "failed").length,
    },
    status: anyFailed && !anySuccess ? "failed" : anyFailed ? "partial" : "success",
  });
}

async function deleteRecordsForFile(fileId: string) {
  await Promise.all([
    prisma.event.deleteMany({ where: { sourceFileId: fileId } }),
    prisma.opportunity.deleteMany({ where: { sourceFileId: fileId } }),
    prisma.supporterClub.deleteMany({ where: { sourceFileId: fileId } }),
    prisma.contact.deleteMany({ where: { sourceFileId: fileId } }),
    prisma.travelAgent.deleteMany({ where: { sourceFileId: fileId } }),
    prisma.clubDepartment.deleteMany({ where: { sourceFileId: fileId } }),
  ]);
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseFile } from "@/lib/import/parser";
import { mapColumns, applyMappings, detectEntityType } from "@/lib/import/mapper";
import { normalizeRow } from "@/lib/import/normalizer";
import type { EntityType } from "@/lib/import/mapper";

// POST /api/import — receives multipart form with file + options
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const entityTypeOverride = (formData.get("entityType") as EntityType) ?? undefined;
    const sheetName = (formData.get("sheetName") as string) ?? undefined;
    const mappingsJson = formData.get("mappings") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse the file
    const parseResult = await parseFile(buffer, file.name);

    // If just a preview request (no confirm), return structure
    if (formData.get("preview") === "true") {
      const sheets = parseResult.sheets.map((s) => {
        const { type, confidence } = detectEntityType(s.headers);
        const mapping = mapColumns(s.headers, type);
        return {
          sheetName: s.sheetName,
          headers: s.headers,
          rowCount: s.rowCount,
          sample: s.rows.slice(0, 5),
          detectedType: type,
          typeConfidence: confidence,
          mappings: mapping.mappings,
          unmappedColumns: mapping.unmappedColumns,
        };
      });

      return NextResponse.json({
        filename: file.name,
        fileType: parseResult.fileType,
        sheets,
      });
    }

    // Full import
    // Create ImportedFile record first
    const importedFile = await prisma.importedFile.create({
      data: {
        filename: file.name,
        originalName: file.name,
        fileType: parseResult.fileType,
        sheetName: sheetName,
        status: "processing",
      },
    });

    let totalImported = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    // Process each sheet (or just the requested one)
    const sheetsToProcess = sheetName
      ? parseResult.sheets.filter((s) => s.sheetName === sheetName)
      : parseResult.sheets;

    for (const sheet of sheetsToProcess) {
      // Determine entity type
      const entityType: EntityType =
        entityTypeOverride ??
        detectEntityType(sheet.headers).type;

      if (entityType === "unknown") {
        errors.push(`Sheet "${sheet.sheetName}": Could not determine entity type`);
        continue;
      }

      // Build mappings (use provided or auto-detect)
      let columnMappings;
      if (mappingsJson) {
        const parsed = JSON.parse(mappingsJson);
        columnMappings = parsed[sheet.sheetName] ?? mapColumns(sheet.headers, entityType).mappings;
      } else {
        columnMappings = mapColumns(sheet.headers, entityType).mappings;
      }

      // Process rows
      for (const row of sheet.rows) {
        try {
          const mapped = applyMappings(row as Record<string, unknown>, columnMappings);
          const normalized = normalizeRow(mapped, entityType, importedFile.id, sheet.sheetName);

          if (!normalized) {
            totalSkipped++;
            continue;
          }

          // Insert based on entity type
          switch (entityType) {
            case "event":
            case "opportunity":
              await prisma.event.create({ data: normalized as Parameters<typeof prisma.event.create>[0]["data"] });
              break;
            case "supporter_club":
              await prisma.supporterClub.create({ data: normalized as Parameters<typeof prisma.supporterClub.create>[0]["data"] });
              break;
            case "contact":
              await prisma.contact.create({ data: normalized as Parameters<typeof prisma.contact.create>[0]["data"] });
              break;
            case "travel_agent":
              await prisma.travelAgent.create({ data: normalized as Parameters<typeof prisma.travelAgent.create>[0]["data"] });
              break;
            case "club_department":
              await prisma.clubDepartment.create({ data: normalized as Parameters<typeof prisma.clubDepartment.create>[0]["data"] });
              break;
          }

          totalImported++;
        } catch (rowError) {
          totalSkipped++;
          // Don't surface individual row errors unless debugging
        }
      }
    }

    // Update the imported file record
    await prisma.importedFile.update({
      where: { id: importedFile.id },
      data: {
        rowCount: sheetsToProcess.reduce((sum, s) => sum + s.rowCount, 0),
        importedCount: totalImported,
        skippedCount: totalSkipped,
        status: errors.length > 0 ? (totalImported > 0 ? "complete" : "error") : "complete",
        errorLog: errors.length > 0 ? errors.join("\n") : null,
      },
    });

    return NextResponse.json({
      success: true,
      fileId: importedFile.id,
      filename: file.name,
      totalImported,
      totalSkipped,
      errors,
    });
  } catch (error) {
    console.error("Import error:", error);
    const message = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

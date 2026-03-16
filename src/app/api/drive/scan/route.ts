import { NextResponse } from "next/server";
import { scanDriveFolder, DRIVE_FOLDER_ID } from "@/lib/drive";

/** POST /api/drive/scan — refresh file list from Google Drive */
export async function POST() {
  try {
    const result = await scanDriveFolder(DRIVE_FOLDER_ID);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scan failed" },
      { status: 500 }
    );
  }
}

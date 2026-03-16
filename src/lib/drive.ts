/**
 * Google Drive integration service for GoFlexxi Intelligence.
 *
 * SETUP REQUIRED:
 * ─────────────────────────────────────────────────────────────
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a project → Enable the "Google Drive API"
 * 3. Create a Service Account → Download the JSON key file
 * 4. In your .env file set:
 *      GOOGLE_DRIVE_FOLDER_ID=1g2XoVq-kZ2_70dkRcfN-JFovWyyjycdC
 *      GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":...}
 *    (paste the entire JSON key file contents as one line)
 * 5. Share the Google Drive folder with the service account email
 *    (found in the JSON as "client_email") — give it "Viewer" access
 * ─────────────────────────────────────────────────────────────
 *
 * NOTE: googleapis is loaded via dynamic import() inside each function so that
 * Next.js / webpack does not attempt to bundle it for the client or Edge runtime.
 * This keeps the Node.js-only network stack out of the webpack dependency graph.
 */

import { prisma } from "@/lib/prisma";

// ─── Configuration ────────────────────────────────────────────────────────────

export const DRIVE_FOLDER_ID =
  process.env.GOOGLE_DRIVE_FOLDER_ID ?? "1g2XoVq-kZ2_70dkRcfN-JFovWyyjycdC";

const SUPPORTED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

const SUPPORTED_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
]);

// ─── Auth helper (lazy — avoids static googleapis import) ────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getDriveClient(): Promise<any | null> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    // Dynamic import keeps googleapis out of the webpack bundle graph
    const { google } = await import("googleapis");
    const credentials = JSON.parse(raw);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    return google.drive({ version: "v3", auth });
  } catch {
    return null;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DriveFileInfo {
  driveFileId: string;
  name: string;
  mimeType: string | null;
  extension: string | null;
  webViewLink: string | null;
  createdAtDrive: Date | null;
  modifiedAtDrive: Date | null;
  checksum: string | null;
}

export interface DriveConnectionStatus {
  configured: boolean;
  connected: boolean;
  folderId: string;
  error?: string;
}

// ─── Connection check ─────────────────────────────────────────────────────────

export async function checkDriveConnection(): Promise<DriveConnectionStatus> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    return {
      configured: false,
      connected: false,
      folderId: DRIVE_FOLDER_ID,
      error: "GOOGLE_SERVICE_ACCOUNT_JSON not set in .env",
    };
  }

  const drive = await getDriveClient();
  if (!drive) {
    return {
      configured: true,
      connected: false,
      folderId: DRIVE_FOLDER_ID,
      error: "Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON",
    };
  }

  try {
    await drive.files.get({ fileId: DRIVE_FOLDER_ID, fields: "id,name" });
    return { configured: true, connected: true, folderId: DRIVE_FOLDER_ID };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      configured: true,
      connected: false,
      folderId: DRIVE_FOLDER_ID,
      error: `Cannot access folder: ${msg}`,
    };
  }
}

// ─── List files in folder ─────────────────────────────────────────────────────

export async function listDriveFiles(folderId = DRIVE_FOLDER_ID): Promise<DriveFileInfo[]> {
  const drive = await getDriveClient();
  if (!drive) return [];

  const results: DriveFileInfo[] = [];
  let pageToken: string | undefined;

  do {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, webViewLink, createdTime, modifiedTime, md5Checksum)",
      pageSize: 100,
      pageToken,
    });

    const files = res.data.files ?? [];
    for (const f of files) {
      const name: string = f.name ?? "";
      const ext = name.includes(".") ? "." + name.split(".").pop()!.toLowerCase() : null;
      const supported =
        (ext && SUPPORTED_EXTENSIONS.includes(ext)) ||
        (f.mimeType && SUPPORTED_MIME_TYPES.has(f.mimeType));
      if (!supported) continue;

      results.push({
        driveFileId:     f.id,
        name,
        mimeType:        f.mimeType ?? null,
        extension:       ext,
        webViewLink:     f.webViewLink ?? null,
        createdAtDrive:  f.createdTime  ? new Date(f.createdTime)  : null,
        modifiedAtDrive: f.modifiedTime ? new Date(f.modifiedTime) : null,
        checksum:        f.md5Checksum ?? null,
      });
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return results;
}

// ─── Download file content ────────────────────────────────────────────────────

export async function downloadDriveFile(driveFileId: string): Promise<Buffer> {
  const drive = await getDriveClient();
  if (!drive) throw new Error("Google Drive not configured");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta: any = await drive.files.get({
    fileId: driveFileId,
    fields: "id,name,mimeType",
  });
  const mimeType: string = meta.data.mimeType ?? "";

  if (mimeType === "application/vnd.google-apps.spreadsheet") {
    const res = await drive.files.export(
      { fileId: driveFileId, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
      { responseType: "arraybuffer" }
    );
    return Buffer.from(res.data as ArrayBuffer);
  }

  const res = await drive.files.get(
    { fileId: driveFileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data as ArrayBuffer);
}

// ─── Scan folder — discover files and update DriveFile records ───────────────

export interface ScanResult {
  configured: boolean;
  connected: boolean;
  newFiles: number;
  updatedFiles: number;
  alreadyImported: number;
  total: number;
  error?: string;
  scannedAt: Date;
}

export async function scanDriveFolder(folderId = DRIVE_FOLDER_ID): Promise<ScanResult> {
  const status = await checkDriveConnection();
  if (!status.connected) {
    return {
      configured: status.configured,
      connected: false,
      newFiles: 0,
      updatedFiles: 0,
      alreadyImported: 0,
      total: 0,
      error: status.error,
      scannedAt: new Date(),
    };
  }

  const files = await listDriveFiles(folderId);
  let newFiles = 0;
  let updatedFiles = 0;
  let alreadyImported = 0;

  for (const f of files) {
    const existing = await prisma.driveFile.findUnique({
      where: { driveFileId: f.driveFileId },
    });

    if (!existing) {
      await prisma.driveFile.create({
        data: {
          driveFileId:     f.driveFileId,
          folderId,
          name:            f.name,
          mimeType:        f.mimeType,
          extension:       f.extension,
          webViewLink:     f.webViewLink,
          createdAtDrive:  f.createdAtDrive,
          modifiedAtDrive: f.modifiedAtDrive,
          checksum:        f.checksum,
          lastSyncedAt:    new Date(),
          importStatus:    "pending",
          alreadyImported: false,
        },
      });
      newFiles++;
    } else {
      const fileModified = f.modifiedAtDrive ?? new Date(0);
      const lastImported = existing.lastImportedAt ?? new Date(0);
      const checksumChanged = !!(f.checksum && existing.checksum && f.checksum !== existing.checksum);

      let importStatus = existing.importStatus;
      if (existing.alreadyImported && (fileModified > lastImported || checksumChanged)) {
        importStatus = "updated";
        updatedFiles++;
      } else if (existing.alreadyImported) {
        alreadyImported++;
      }

      await prisma.driveFile.update({
        where: { driveFileId: f.driveFileId },
        data: {
          name:            f.name,
          mimeType:        f.mimeType,
          extension:       f.extension,
          webViewLink:     f.webViewLink,
          modifiedAtDrive: f.modifiedAtDrive,
          checksum:        f.checksum,
          lastSyncedAt:    new Date(),
          importStatus,
        },
      });
    }
  }

  return {
    configured: true,
    connected: true,
    newFiles,
    updatedFiles,
    alreadyImported,
    total: files.length,
    scannedAt: new Date(),
  };
}

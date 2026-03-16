/**
 * Next.js Instrumentation hook — runs once when the server starts.
 *
 * On startup this does two things:
 *  1. Scans the configured Google Drive folder for new/updated Excel files
 *     and updates the DriveFile table with discovery metadata.
 *     (Does NOT auto-import — the user reviews and triggers import from the UI.)
 *
 *  2. Logs the scan result so you can see it in the terminal on startup.
 *
 * To enable auto-import on startup (not recommended — prefer manual review),
 * set AUTO_IMPORT_DRIVE_FILES=true in your .env.
 */

export async function register() {
  // Only run in the Node.js runtime (not in the Edge runtime)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Delay slightly to let the database connection warm up
  await new Promise((resolve) => setTimeout(resolve, 1500));

  try {
    // webpackIgnore: true prevents webpack from bundling this Node.js-only
    // module into the Edge runtime build — it will be resolved at runtime only
    const { scanDriveFolder, DRIVE_FOLDER_ID } = await import(
      /* webpackIgnore: true */ "@/lib/drive"
    );

    console.log("[GoFlexxi] Scanning Google Drive folder on startup…");
    const result = await scanDriveFolder(DRIVE_FOLDER_ID);

    if (!result.configured) {
      console.log("[GoFlexxi] Google Drive not configured (GOOGLE_SERVICE_ACCOUNT_JSON not set) — skipping scan");
      return;
    }

    if (!result.connected) {
      console.warn(`[GoFlexxi] Google Drive scan failed: ${result.error}`);
      return;
    }

    console.log(
      `[GoFlexxi] Drive scan complete: ${result.total} files tracked, ` +
      `${result.newFiles} new, ${result.updatedFiles} updated, ${result.alreadyImported} already imported`
    );

    if (result.newFiles > 0 || result.updatedFiles > 0) {
      console.log(
        `[GoFlexxi] ⚡ ${result.newFiles + result.updatedFiles} files ready to import — visit /drive-imports`
      );
    }

  } catch (err) {
    // Never crash the app on startup due to Drive issues
    console.warn("[GoFlexxi] Drive startup scan failed (non-fatal):", err instanceof Error ? err.message : err);
  }
}

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Cloud, RefreshCw, Download, AlertCircle, CheckCircle2,
  Clock, XCircle, Eye, EyeOff, ExternalLink, Info, Wifi, WifiOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DriveFile {
  id: string;
  driveFileId: string;
  name: string;
  extension: string | null;
  mimeType: string | null;
  webViewLink: string | null;
  modifiedAtDrive: string | null;
  discoveredAt: string;
  lastSyncedAt: string | null;
  importStatus: string;
  alreadyImported: boolean;
  lastImportedAt: string | null;
  notes: string | null;
  checksum: string | null;
}

interface DriveStatus {
  configured: boolean;
  connected: boolean;
  folderId: string;
  error?: string;
  lastScanAt: string | null;
  counts: {
    total: number;
    pending: number;
    imported: number;
    updated: number;
    failed: number;
    ignored: number;
  };
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: "New",              color: "bg-blue-100 text-blue-800",   icon: <Clock size={12} /> },
  importing: { label: "Importing…",       color: "bg-yellow-100 text-yellow-800", icon: <RefreshCw size={12} className="animate-spin" /> },
  imported:  { label: "Imported",         color: "bg-green-100 text-green-800", icon: <CheckCircle2 size={12} /> },
  updated:   { label: "Updated",          color: "bg-orange-100 text-orange-800", icon: <RefreshCw size={12} /> },
  failed:    { label: "Failed",           color: "bg-red-100 text-red-800",     icon: <XCircle size={12} /> },
  ignored:   { label: "Ignored",          color: "bg-gray-100 text-gray-600",   icon: <EyeOff size={12} /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-gray-100 text-gray-700", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function ExtBadge({ ext }: { ext: string | null }) {
  const colors: Record<string, string> = {
    xlsx: "bg-emerald-100 text-emerald-700",
    xls:  "bg-teal-100 text-teal-700",
    csv:  "bg-sky-100 text-sky-700",
  };
  const e = (ext ?? "").replace(".", "");
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${colors[e] ?? "bg-gray-100 text-gray-600"}`}>
      {e.toUpperCase() || "?"}
    </span>
  );
}

// ─── Connection Banner ────────────────────────────────────────────────────────

function ConnectionBanner({ status }: { status: DriveStatus | null }) {
  if (!status) return null;

  if (!status.configured) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3">
        <Info size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-900 text-sm">Google Drive not configured</p>
          <p className="text-amber-700 text-sm mt-1">
            Add your service account credentials to <code className="bg-amber-100 px-1 rounded">.env</code> to enable Drive sync.
            See the setup guide below.
          </p>
        </div>
      </div>
    );
  }

  if (!status.connected) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3">
        <WifiOff size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-900 text-sm">Cannot connect to Google Drive</p>
          <p className="text-red-700 text-sm mt-1">{status.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-3 flex items-center gap-3">
      <Wifi size={16} className="text-green-600" />
      <span className="text-green-800 text-sm font-medium">Connected to Google Drive</span>
      <span className="text-green-600 text-xs ml-auto">
        Folder ID: <code>{status.folderId}</code>
      </span>
    </div>
  );
}

// ─── Setup Guide ──────────────────────────────────────────────────────────────

function SetupGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2">
          <Info size={15} className="text-gray-400" />
          How to set up Google Drive sync
        </span>
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-gray-700 space-y-3 border-t border-gray-100 pt-3">
          <ol className="space-y-2 list-decimal list-inside">
            <li>Go to <strong>console.cloud.google.com</strong> → Create or select a project</li>
            <li>Enable the <strong>Google Drive API</strong> for your project</li>
            <li>Go to <strong>IAM &amp; Admin → Service Accounts</strong> → Create a service account</li>
            <li>Under the service account → <strong>Keys → Add Key → JSON</strong> → download the file</li>
            <li>
              Add these two lines to your <code className="bg-gray-100 px-1 rounded">.env</code> file:
              <pre className="bg-gray-100 rounded p-2 mt-1 text-xs overflow-x-auto">{`GOOGLE_DRIVE_FOLDER_ID=1g2XoVq-kZ2_70dkRcfN-JFovWyyjycdC
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...entire JSON on one line..."}`}</pre>
            </li>
            <li>
              Share the Google Drive folder with the service account email address
              (found in the JSON as <code className="bg-gray-100 px-1 rounded">client_email</code>) — give it <strong>Viewer</strong> access
            </li>
            <li>Restart the dev server and click <strong>Refresh Drive Files</strong></li>
          </ol>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DriveImportsPage() {
  const [status, setStatus]     = useState<DriveStatus | null>(null);
  const [files, setFiles]       = useState<DriveFile[]>([]);
  const [filter, setFilter]     = useState<string>("all");
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState<Set<string>>(new Set());
  const [toast, setToast]       = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/drive/status");
    if (res.ok) setStatus(await res.json());
  }, []);

  const loadFiles = useCallback(async () => {
    const url = filter === "all" ? "/api/drive/files" : `/api/drive/files?status=${filter}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setFiles(data.files);
    }
  }, [filter]);

  useEffect(() => {
    loadStatus();
    loadFiles();
  }, [loadStatus, loadFiles]);

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/drive/scan", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        showToast(data.error, "err");
      } else {
        showToast(
          `Scan complete: ${data.newFiles} new, ${data.updatedFiles} updated, ${data.alreadyImported} already imported`,
          "ok"
        );
        await loadStatus();
        await loadFiles();
      }
    } catch {
      showToast("Scan failed", "err");
    } finally {
      setScanning(false);
    }
  };

  const handleSyncAndImportAll = async () => {
    setScanning(true);
    try {
      // Step 1: scan Drive for new/updated files
      const scanRes = await fetch("/api/drive/scan", { method: "POST" });
      const scanData = await scanRes.json();
      if (scanData.error || !scanData.connected) {
        showToast(scanData.error ?? "Cannot connect to Google Drive", "err");
        return;
      }
      await loadStatus();
      await loadFiles();

      // Step 2: fetch all pending + updated file IDs
      const [pendingRes, updatedRes] = await Promise.all([
        fetch("/api/drive/files?status=pending"),
        fetch("/api/drive/files?status=updated"),
      ]);
      const [pendingData, updatedData] = await Promise.all([
        pendingRes.json(),
        updatedRes.json(),
      ]);
      const ids = [
        ...(pendingData.files ?? []).map((f: { driveFileId: string }) => f.driveFileId),
        ...(updatedData.files ?? []).map((f: { driveFileId: string }) => f.driveFileId),
      ];

      if (ids.length === 0) {
        showToast("All files already up to date", "ok");
        return;
      }

      // Step 3: import all
      for (const id of ids) setImporting((s) => new Set(s).add(id));
      const importRes = await fetch("/api/drive/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveFileIds: ids }),
      });
      const importData = await importRes.json();
      showToast(
        `Imported ${importData.summary?.success ?? 0} file(s)${importData.summary?.failed ? `, ${importData.summary.failed} failed` : ""}`,
        importData.summary?.failed > 0 ? "err" : "ok"
      );
      await loadStatus();
      await loadFiles();
    } catch {
      showToast("Sync failed", "err");
    } finally {
      setScanning(false);
      setImporting(new Set());
    }
  };

  const handleImport = async (driveFileId: string) => {
    setImporting((s) => new Set(s).add(driveFileId));
    try {
      const res = await fetch("/api/drive/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveFileId }),
      });
      const data = await res.json();
      const r = data.results?.[0];
      if (r?.error) {
        showToast(`Import failed: ${r.error}`, "err");
      } else {
        showToast(`Imported ${r?.importedRows ?? 0} rows from ${r?.filename}`, "ok");
      }
      await loadStatus();
      await loadFiles();
    } catch {
      showToast("Import failed", "err");
    } finally {
      setImporting((s) => { const n = new Set(s); n.delete(driveFileId); return n; });
    }
  };

  const handleImportAll = async () => {
    const toImport = files
      .filter((f) => f.importStatus === "pending" || f.importStatus === "updated")
      .map((f) => f.driveFileId);

    if (toImport.length === 0) {
      showToast("No new files to import", "ok");
      return;
    }

    for (const id of toImport) {
      setImporting((s) => new Set(s).add(id));
    }

    try {
      const res = await fetch("/api/drive/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveFileIds: toImport }),
      });
      const data = await res.json();
      showToast(
        `Batch import: ${data.summary?.success ?? 0} succeeded, ${data.summary?.failed ?? 0} failed`,
        data.summary?.failed > 0 ? "err" : "ok"
      );
      await loadStatus();
      await loadFiles();
    } catch {
      showToast("Batch import failed", "err");
    } finally {
      setImporting(new Set());
    }
  };

  const handleIgnore = async (driveFileId: string) => {
    await fetch("/api/drive/files", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driveFileId, importStatus: "ignored" }),
    });
    await loadFiles();
    await loadStatus();
  };

  const pendingCount = status?.counts.pending ?? 0;
  const updatedCount = status?.counts.updated ?? 0;
  const actionable = pendingCount + updatedCount;

  const FILTERS = [
    { key: "all",      label: "All files" },
    { key: "pending",  label: "New" },
    { key: "updated",  label: "Updated" },
    { key: "imported", label: "Imported" },
    { key: "failed",   label: "Failed" },
    { key: "ignored",  label: "Ignored" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Cloud size={24} className="text-brand-500" />
            Drive Imports
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Google Drive folder sync — monitor and import Excel &amp; CSV files automatically
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSyncAndImportAll}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            <Download size={15} className={scanning ? "animate-pulse" : ""} />
            {scanning ? "Syncing…" : actionable > 0 ? `Import from Drive (${actionable})` : "Import from Drive"}
          </button>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={scanning ? "animate-spin" : ""} />
            {scanning ? "Scanning…" : "Refresh Drive"}
          </button>
        </div>
      </div>

      {/* Connection status */}
      <ConnectionBanner status={status} />

      {/* Summary stats */}
      {status?.counts && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: "Total",    value: status.counts.total,    color: "text-gray-900" },
            { label: "New",      value: status.counts.pending,  color: "text-blue-700" },
            { label: "Imported", value: status.counts.imported, color: "text-green-700" },
            { label: "Updated",  value: status.counts.updated,  color: "text-orange-700" },
            { label: "Failed",   value: status.counts.failed,   color: "text-red-700" },
            { label: "Ignored",  value: status.counts.ignored,  color: "text-gray-500" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {status?.lastScanAt && (
        <p className="text-xs text-gray-400">
          Last scanned {formatDistanceToNow(new Date(status.lastScanAt), { addSuffix: true })}
        </p>
      )}

      {/* Setup guide (collapsed by default) */}
      {!status?.configured && <SetupGuide />}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* File list */}
      {files.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
          <Cloud size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-500">
            {status?.configured && !status?.connected
              ? "Cannot connect to Google Drive"
              : !status?.configured
              ? "Configure Google Drive credentials to see files here"
              : filter === "all"
              ? 'No files found. Click "Refresh Drive" to scan the folder.'
              : `No files with status "${filter}"`}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">File</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Modified</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Last imported</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {files.map((file) => {
                const isImporting = importing.has(file.driveFileId);
                const canImport   = ["pending", "updated", "failed"].includes(file.importStatus);
                return (
                  <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ExtBadge ext={file.extension} />
                        <span className="font-medium text-gray-900 truncate max-w-xs" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                      {file.notes && (
                        <p className="text-xs text-red-600 mt-0.5 ml-8">{file.notes}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {file.modifiedAtDrive
                        ? formatDistanceToNow(new Date(file.modifiedAtDrive), { addSuffix: true })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={file.importStatus} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {file.lastImportedAt
                        ? formatDistanceToNow(new Date(file.lastImportedAt), { addSuffix: true })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                            title="View in Google Drive"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                        {file.importStatus !== "ignored" && (
                          <button
                            onClick={() => handleIgnore(file.driveFileId)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Mark as ignored"
                          >
                            <EyeOff size={14} />
                          </button>
                        )}
                        {canImport && (
                          <button
                            onClick={() => handleImport(file.driveFileId)}
                            disabled={isImporting}
                            className="flex items-center gap-1 px-3 py-1.5 bg-brand-500 text-white rounded-md text-xs font-medium hover:bg-brand-600 transition-colors disabled:opacity-60"
                          >
                            {isImporting ? (
                              <><RefreshCw size={11} className="animate-spin" /> Importing…</>
                            ) : (
                              <><Download size={11} /> Import</>
                            )}
                          </button>
                        )}
                        {file.importStatus === "imported" && (
                          <button
                            onClick={() => handleImport(file.driveFileId)}
                            disabled={isImporting}
                            className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-600 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
                          >
                            <RefreshCw size={11} /> Re-import
                          </button>
                        )}
                        {file.importStatus === "ignored" && (
                          <button
                            onClick={() => handleImport(file.driveFileId)}
                            disabled={isImporting}
                            className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-600 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
                          >
                            <Eye size={11} /> Import anyway
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Setup guide (always visible if configured but not connected) */}
      {status?.configured && <SetupGuide />}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 ${
            toast.type === "ok"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "ok" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

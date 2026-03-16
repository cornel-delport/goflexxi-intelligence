"use client";

import { useState } from "react";
import { MessageSquare, Plus, Tag } from "lucide-react";
import { timeAgo } from "@/lib/utils";

interface Note {
  id: string;
  content: string;
  noteType: string;
  status?: string | null;
  createdAt: string;
  createdBy: string;
}

interface NotesPanelProps {
  entityType: "event" | "opportunity" | "supporter_club" | "contact" | "travel_agent" | "club_department";
  entityId: string;
  notes: Note[];
  onNoteAdded?: () => void;
}

const NOTE_TYPES = [
  { value: "general", label: "General" },
  { value: "status", label: "Status Update" },
  { value: "follow_up", label: "Follow Up" },
  { value: "contacted", label: "Contacted" },
  { value: "research", label: "Research" },
];

const NOTE_TYPE_COLORS: Record<string, string> = {
  general:   "bg-gray-100 text-gray-600",
  status:    "bg-blue-100 text-blue-700",
  follow_up: "bg-yellow-100 text-yellow-700",
  contacted: "bg-green-100 text-green-700",
  research:  "bg-purple-100 text-purple-700",
};

export function NotesPanel({ entityType, entityId, notes, onNoteAdded }: NotesPanelProps) {
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState("general");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    setError("");

    try {
      const body: Record<string, string> = {
        content: content.trim(),
        noteType,
        [`${entityType}Id`]: entityId,
      };

      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save note");
      setContent("");
      onNoteAdded?.();
    } catch (err) {
      setError("Could not save note. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <MessageSquare className="w-4 h-4" />
        <span>Notes & Outreach ({notes.length})</span>
      </div>

      {/* Add note form */}
      <form onSubmit={handleSubmit} className="card p-3 space-y-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note, status update, or outreach log…"
          className="input resize-none text-sm"
          rows={2}
        />
        <div className="flex items-center gap-2">
          <select
            value={noteType}
            onChange={(e) => setNoteType(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-600"
          >
            {NOTE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={saving || !content.trim()}
            className="ml-auto btn-primary py-1 text-xs"
          >
            <Plus className="w-3 h-3" />
            {saving ? "Saving…" : "Add Note"}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </form>

      {/* Notes list */}
      <div className="space-y-2">
        {notes.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No notes yet</p>
        )}
        {notes.map((note) => (
          <div key={note.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <div className="flex items-start gap-2">
              <span
                className={`badge mt-0.5 ${NOTE_TYPE_COLORS[note.noteType] ?? "bg-gray-100 text-gray-600"}`}
              >
                <Tag className="w-2.5 h-2.5 mr-1" />
                {NOTE_TYPES.find((t) => t.value === note.noteType)?.label ?? note.noteType}
              </span>
              <span className="text-xs text-gray-400 ml-auto">{timeAgo(note.createdAt)}</span>
            </div>
            <p className="text-sm text-gray-700 mt-2 leading-relaxed">{note.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar, Zap, Users, UserCheck, Briefcase, Building2,
  FolderOpen, AlertTriangle, TrendingUp, Clock, Upload,
  ArrowRight, MapPin, Plane, Bus, Cloud, CloudOff, RefreshCw, Download
} from "lucide-react";
import { formatDate, daysUntil, timeAgo } from "@/lib/utils";
import { TransportBadge, PriorityBadge, StatusBadge } from "@/components/ui/Badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

const COLORS = ["#0fb374", "#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4", "#f97316", "#ec4899", "#10b981"];

interface DashboardData {
  stats: {
    totalEvents: number;
    totalOpportunities: number;
    totalSupporterClubs: number;
    totalContacts: number;
    totalTravelAgents: number;
    totalClubDepts: number;
    totalFiles: number;
  };
  upcoming: { events30: number; events60: number; events90: number };
  highPriorityOpps: Array<{
    id: string; title: string; travelingTeam: string | null;
    country: string | null; eventDate: string | null;
    transportType: string | null; priorityRating: number | null;
    status: string;
  }>;
  recentFiles: Array<{
    id: string; originalName: string; importedCount: number;
    fileType: string; status: string; importedAt: string;
  }>;
  dataQuality: { missingEmail: number; missingPhone: number };
  charts: {
    byType: Array<{ name: string; value: number }>;
    byCountry: Array<{ name: string; value: number }>;
  };
  upcomingEvents: Array<{
    id: string; eventName: string; homeTeamName: string | null;
    awayTeamName: string | null; eventDate: string | null;
    country: string | null; competition: string | null;
    transportOpportunityType: string | null;
  }>;
  drive: {
    configured: boolean;
    connected: boolean;
    error: string | null;
    folderId: string;
    lastScanAt: string | null;
    newFiles: number;
    imported: number;
    failed: number;
    totalTracked: number;
  } | null;
}

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-gray-500">Loading dashboard…</div>;
  if (!data) return <div className="text-sm text-red-500">Failed to load dashboard</div>;

  const { stats, upcoming, highPriorityOpps, recentFiles, dataQuality, charts, upcomingEvents, drive } = data;
  const hasData = stats.totalEvents > 0 || stats.totalContacts > 0;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GoFlexxi Intelligence</h1>
          <p className="text-sm text-gray-500 mt-0.5">Sports travel opportunity dashboard</p>
        </div>
        {!hasData && (
          <Link href="/upload" className="btn-primary">
            <Upload className="w-4 h-4" />
            Import Data to Get Started
          </Link>
        )}
      </div>

      {/* Google Drive alert banner */}
      {drive && drive.newFiles > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Cloud size={18} className="text-blue-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-blue-900 text-sm">
                {drive.newFiles} new {drive.newFiles === 1 ? "file" : "files"} available in Google Drive
              </p>
              <p className="text-blue-700 text-xs mt-0.5">
                {drive.imported} already imported · {drive.failed > 0 ? `${drive.failed} failed · ` : ""}
                {drive.totalTracked} total tracked
              </p>
            </div>
          </div>
          <Link
            href="/drive-imports"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Download size={12} />
            Review &amp; Import
          </Link>
        </div>
      )}

      {/* Drive not configured hint (only show when no data) */}
      {drive && !drive.configured && !hasData && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 flex items-center gap-3">
          <CloudOff size={16} className="text-gray-400" />
          <span className="text-gray-600 text-sm">
            Google Drive sync not configured.{" "}
            <Link href="/drive-imports" className="text-brand-600 font-medium hover:underline">
              Set it up
            </Link>{" "}
            to auto-ingest Excel files.
          </span>
        </div>
      )}

      {/* Drive failed badge */}
      {drive && drive.failed > 0 && drive.newFiles === 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-600" />
            <span className="text-red-800 text-sm font-medium">{drive.failed} Drive import{drive.failed !== 1 ? "s" : ""} failed</span>
          </div>
          <Link href="/drive-imports" className="text-red-700 text-xs font-medium hover:underline flex items-center gap-1">
            View <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {!hasData && (
        <div className="card p-8 text-center border-dashed border-2 border-gray-300 bg-white">
          <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Upload className="w-7 h-7 text-brand-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Upload your Excel files to get started</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            Import supporter clubs, events, travel agents, and contact data from your Excel files.
            GoFlexxi will automatically parse and organize everything into a searchable intelligence database.
          </p>
          <Link href="/upload" className="btn-primary mx-auto inline-flex">
            <Upload className="w-4 h-4" />
            Upload Excel or CSV Files
          </Link>
        </div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Events" value={stats.totalEvents} href="/events" color="blue" />
        <StatCard icon={Zap}      label="Opportunities" value={stats.totalOpportunities} href="/opportunities" color="brand" />
        <StatCard icon={Users}    label="Supporter Clubs" value={stats.totalSupporterClubs} href="/supporter-clubs" color="purple" />
        <StatCard icon={UserCheck} label="Contacts" value={stats.totalContacts} href="/contacts" color="teal" />
        <StatCard icon={Briefcase} label="Travel Agents" value={stats.totalTravelAgents} href="/travel-agents" color="orange" />
        <StatCard icon={Building2} label="Club Depts" value={stats.totalClubDepts} href="/club-departments" color="pink" />
        <StatCard icon={FolderOpen} label="Files Imported" value={stats.totalFiles} href="/file-imports" color="gray" />
        <div className="card p-4 bg-gradient-to-br from-brand-500 to-brand-700 text-white">
          <div className="text-xs font-medium opacity-80 mb-2">Upcoming Events</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold">{upcoming.events30}</div>
              <div className="text-xs opacity-70">30 days</div>
            </div>
            <div>
              <div className="text-lg font-bold">{upcoming.events60}</div>
              <div className="text-xs opacity-70">60 days</div>
            </div>
            <div>
              <div className="text-lg font-bold">{upcoming.events90}</div>
              <div className="text-xs opacity-70">90 days</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Upcoming events */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-500" />
              <span className="font-semibold text-gray-900">Upcoming Events (30 days)</span>
            </div>
            <Link href="/events" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No upcoming events. Import event data to see opportunities here.
            </p>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((ev) => {
                const days = daysUntil(ev.eventDate);
                return (
                  <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-12 text-center shrink-0">
                      <div className={`text-lg font-bold ${days !== null && days <= 7 ? "text-red-600" : days !== null && days <= 14 ? "text-orange-500" : "text-gray-700"}`}>
                        {days !== null ? days : "—"}
                      </div>
                      <div className="text-xs text-gray-400">days</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{ev.eventName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {ev.competition && <span>{ev.competition} • </span>}
                        {ev.country && <span className="flex items-center gap-1 inline-flex"><MapPin className="w-2.5 h-2.5" />{ev.country}</span>}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {ev.transportOpportunityType && (
                        <TransportBadge type={ev.transportOpportunityType} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* High priority opps */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-500" />
              <span className="font-semibold text-gray-900">High Priority</span>
            </div>
            <Link href="/opportunities?priority=4" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {highPriorityOpps.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No high priority opportunities yet</p>
          ) : (
            <div className="space-y-2">
              {highPriorityOpps.slice(0, 6).map((opp) => (
                <div key={opp.id} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium text-gray-900 leading-tight truncate">{opp.title}</div>
                    <PriorityBadge rating={opp.priorityRating} />
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                    {opp.travelingTeam && <span>{opp.travelingTeam}</span>}
                    {opp.country && <span>• {opp.country}</span>}
                  </div>
                  {opp.transportType && (
                    <div className="mt-1.5">
                      <TransportBadge type={opp.transportType} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts row */}
      {(charts.byType.length > 0 || charts.byCountry.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {charts.byType.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Plane className="w-4 h-4 text-brand-500" />
                <span className="font-semibold text-gray-900">Opportunities by Transport Type</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={charts.byType}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                    fontSize={11}
                  >
                    {charts.byType.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {charts.byCountry.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-brand-500" />
                <span className="font-semibold text-gray-900">Opportunities by Country</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={charts.byCountry} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0fb374" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Bottom row: Recent Files + Data Quality */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent file imports */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-brand-500" />
              <span className="font-semibold text-gray-900">Recent File Imports</span>
            </div>
            <Link href="/file-imports" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
              All imports <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentFiles.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400">No files imported yet</p>
              <Link href="/upload" className="btn-primary mt-3 mx-auto inline-flex text-xs">
                <Upload className="w-3 h-3" /> Import Now
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentFiles.map((f) => (
                <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${f.fileType === "xlsx" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                    {f.fileType.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{f.originalName}</div>
                    <div className="text-xs text-gray-500">{f.importedCount} records • {timeAgo(f.importedAt)}</div>
                  </div>
                  <StatusBadge status={f.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Data quality */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="font-semibold text-gray-900">Data Quality</span>
          </div>
          <div className="space-y-3">
            <QualityItem
              label="Contacts missing email"
              count={dataQuality.missingEmail}
              href="/data-review"
              total={stats.totalContacts}
            />
            <QualityItem
              label="Contacts missing phone"
              count={dataQuality.missingPhone}
              href="/data-review"
              total={stats.totalContacts}
            />
            {dataQuality.missingEmail === 0 && dataQuality.missingPhone === 0 && (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm text-green-700 font-medium">Contact data looks complete!</span>
              </div>
            )}
            <Link href="/data-review" className="btn-secondary w-full justify-center text-xs mt-2">
              View Full Data Review
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, href, color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  href: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue:   "bg-blue-50 text-blue-600",
    brand:  "bg-brand-50 text-brand-600",
    purple: "bg-purple-50 text-purple-600",
    teal:   "bg-teal-50 text-teal-600",
    orange: "bg-orange-50 text-orange-600",
    pink:   "bg-pink-50 text-pink-600",
    gray:   "bg-gray-100 text-gray-500",
  };

  return (
    <Link href={href} className="stat-card hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-0.5">{label}</div>
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorClasses[color] ?? colorClasses.gray}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}

function QualityItem({
  label, count, href, total,
}: {
  label: string; count: number; href: string; total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const isGood = count === 0;

  return (
    <Link href={href} className="block p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-gray-700">{label}</span>
        <span className={`text-sm font-semibold ${isGood ? "text-green-600" : count > 20 ? "text-red-600" : "text-orange-500"}`}>
          {count}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isGood ? "bg-green-400" : "bg-orange-400"}`}
          style={{ width: `${Math.max(pct, isGood ? 0 : 2)}%` }}
        />
      </div>
    </Link>
  );
}

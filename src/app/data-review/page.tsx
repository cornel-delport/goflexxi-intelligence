"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, AlertTriangle, CheckCircle2, Mail, Phone, Users, Building2, Calendar } from "lucide-react";
import Link from "next/link";

interface ReviewItem {
  id: string;
  [key: string]: unknown;
}

interface ReviewSection<T extends ReviewItem> {
  items: T[];
  count: number;
}

interface DataReviewData {
  contactsMissingEmail: ReviewSection<{ id: string; fullName: string; role: string | null; organization: string | null; organizationType: string | null }>;
  contactsMissingPhone: ReviewSection<{ id: string; fullName: string; role: string | null; organization: string | null }>;
  contactsMissingOrg:   ReviewSection<{ id: string; fullName: string; role: string | null; email: string | null }>;
  supporterClubsNoContact: ReviewSection<{ id: string; clubName: string; teamSupported: string | null; country: string | null }>;
  supporterClubsNoEmail:   ReviewSection<{ id: string; clubName: string; teamSupported: string | null; country: string | null }>;
  eventsNoDate:        ReviewSection<{ id: string; eventName: string; competition: string | null; country: string | null }>;
  eventsNoPriority:    ReviewSection<{ id: string; eventName: string; competition: string | null; eventDate: string | null }>;
  travelAgentsNoContact: ReviewSection<{ id: string; companyName: string; country: string | null; specialization: string | null }>;
  oppsNoContact:       ReviewSection<{ id: string; title: string; travelingTeam: string | null; country: string | null; eventDate: string | null }>;
  summary: { contactsTotal: number; clubsTotal: number; totalIssues: number };
}

export default function DataReviewPage() {
  const [data, setData] = useState<DataReviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/data-review").then((r) => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-gray-500 p-8">Loading data review…</div>;
  if (!data) return <div className="text-sm text-red-500 p-8">Failed to load review</div>;

  const { summary } = data;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-brand-500" />
            Data Review & Quality
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Identify missing information and improve data quality</p>
        </div>
      </div>

      {/* Summary scores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreCard
          label="Total Issues Found"
          value={summary.totalIssues}
          icon={AlertTriangle}
          color={summary.totalIssues === 0 ? "green" : summary.totalIssues > 50 ? "red" : "orange"}
        />
        <ScoreCard label="Contacts Missing Email" value={data.contactsMissingEmail.count} icon={Mail} color={data.contactsMissingEmail.count === 0 ? "green" : "orange"} />
        <ScoreCard label="Clubs Without Contacts" value={data.supporterClubsNoContact.count} icon={Users} color={data.supporterClubsNoContact.count === 0 ? "green" : "yellow"} />
        <ScoreCard label="Events Without Date" value={data.eventsNoDate.count} icon={Calendar} color={data.eventsNoDate.count === 0 ? "green" : "red"} />
      </div>

      {summary.totalIssues === 0 && (
        <div className="card p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-800">Your data looks great!</h2>
          <p className="text-sm text-gray-500 mt-1">No obvious data quality issues found.</p>
        </div>
      )}

      {/* Issues sections */}
      <div className="space-y-4">
        <ReviewSection
          title="Contacts Missing Email"
          icon={Mail}
          count={data.contactsMissingEmail.count}
          items={data.contactsMissingEmail.items.map((c) => ({
            id: c.id,
            primary: c.fullName,
            secondary: [c.role, c.organization, c.organizationType].filter(Boolean).join(" • "),
            href: "/contacts",
          }))}
        />

        <ReviewSection
          title="Contacts Missing Phone"
          icon={Phone}
          count={data.contactsMissingPhone.count}
          items={data.contactsMissingPhone.items.map((c) => ({
            id: c.id,
            primary: c.fullName,
            secondary: [c.role, c.organization].filter(Boolean).join(" • "),
            href: "/contacts",
          }))}
        />

        <ReviewSection
          title="Contacts Without Organization"
          icon={Building2}
          count={data.contactsMissingOrg.count}
          items={data.contactsMissingOrg.items.map((c) => ({
            id: c.id,
            primary: c.fullName,
            secondary: [c.role, c.email].filter(Boolean).join(" • "),
            href: "/contacts",
          }))}
        />

        <ReviewSection
          title="Supporter Clubs Without Contacts"
          icon={Users}
          count={data.supporterClubsNoContact.count}
          items={data.supporterClubsNoContact.items.map((c) => ({
            id: c.id,
            primary: c.clubName,
            secondary: [c.teamSupported, c.country].filter(Boolean).join(" • "),
            href: "/supporter-clubs",
          }))}
        />

        <ReviewSection
          title="Supporter Clubs Without Email"
          icon={Mail}
          count={data.supporterClubsNoEmail.count}
          items={data.supporterClubsNoEmail.items.map((c) => ({
            id: c.id,
            primary: c.clubName,
            secondary: [c.teamSupported, c.country].filter(Boolean).join(" • "),
            href: "/supporter-clubs",
          }))}
        />

        <ReviewSection
          title="Events Without Date"
          icon={Calendar}
          count={data.eventsNoDate.count}
          items={data.eventsNoDate.items.map((e) => ({
            id: e.id,
            primary: e.eventName,
            secondary: [e.competition, e.country].filter(Boolean).join(" • "),
            href: "/events",
          }))}
        />

        <ReviewSection
          title="Events Without Priority Rating"
          icon={AlertTriangle}
          count={data.eventsNoPriority.count}
          items={data.eventsNoPriority.items.map((e) => ({
            id: e.id,
            primary: e.eventName,
            secondary: e.competition ?? "",
            href: "/events",
          }))}
        />

        <ReviewSection
          title="Travel Agents Without Contacts"
          icon={Building2}
          count={data.travelAgentsNoContact.count}
          items={data.travelAgentsNoContact.items.map((a) => ({
            id: a.id,
            primary: a.companyName,
            secondary: [a.specialization, a.country].filter(Boolean).join(" • "),
            href: "/travel-agents",
          }))}
        />

        <ReviewSection
          title="Opportunities Without Contact Path"
          icon={AlertTriangle}
          count={data.oppsNoContact.count}
          items={data.oppsNoContact.items.map((o) => ({
            id: o.id,
            primary: o.title,
            secondary: [o.travelingTeam, o.country].filter(Boolean).join(" • "),
            href: "/opportunities",
          }))}
        />
      </div>
    </div>
  );
}

function ScoreCard({
  label, value, icon: Icon, color,
}: {
  label: string; value: number; icon: React.ElementType; color: "green" | "orange" | "red" | "yellow";
}) {
  const colors = {
    green:  "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    red:    "bg-red-50 text-red-600",
    yellow: "bg-yellow-50 text-yellow-600",
  };
  const textColors = {
    green:  "text-green-600",
    orange: "text-orange-600",
    red:    "text-red-600",
    yellow: "text-yellow-600",
  };

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className={`text-2xl font-bold ${textColors[color]}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function ReviewSection({
  title, icon: Icon, count, items,
}: {
  title: string;
  icon: React.ElementType;
  count: number;
  items: Array<{ id: string; primary: string; secondary: string; href: string }>;
}) {
  const [expanded, setExpanded] = useState(false);
  if (count === 0) return null;

  const displayItems = expanded ? items : items.slice(0, 5);

  return (
    <div className="card overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
            <Icon className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">{title}</div>
            <div className="text-xs text-gray-400">{count} record{count !== 1 ? "s" : ""} affected</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge bg-orange-50 text-orange-700 border border-orange-200">{count}</span>
          <span className="text-xs text-gray-400">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {displayItems.map((item) => (
            <div key={item.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50">
              <div>
                <div className="text-sm text-gray-800 font-medium">{item.primary}</div>
                {item.secondary && <div className="text-xs text-gray-400">{item.secondary}</div>}
              </div>
            </div>
          ))}
          {items.length > 5 && !expanded && (
            <div className="px-4 py-2 text-xs text-gray-400">+ {items.length - 5} more</div>
          )}
          {items.length > 5 && expanded && (
            <div className="px-4 py-2 text-xs text-gray-400">Showing all {items.length}</div>
          )}
        </div>
      )}
    </div>
  );
}

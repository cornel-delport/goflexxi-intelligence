"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Calendar, Users, UserCheck, Briefcase, Building2, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatDate, truncate } from "@/lib/utils";
import { TransportBadge, ConfidenceBadge } from "@/components/ui/Badge";

interface SearchResults {
  query: string;
  total: number;
  results: {
    events: Array<{
      id: string; eventName: string; competition: string | null;
      eventDate: string | null; country: string | null;
      transportOpportunityType: string | null; homeTeamName: string | null; awayTeamName: string | null;
    }>;
    supporterClubs: Array<{
      id: string; clubName: string; teamSupported: string | null;
      country: string | null; city: string | null;
      contacts: Array<{ fullName: string; email: string | null }>;
    }>;
    contacts: Array<{
      id: string; fullName: string; role: string | null;
      email: string | null; country: string | null;
      confidenceLevel: string | null;
      supporterClub: { clubName: string } | null;
      travelAgent: { companyName: string } | null;
      clubDepartment: { clubName: string } | null;
    }>;
    travelAgents: Array<{
      id: string; companyName: string; specialization: string | null;
      country: string | null; charterRelevance: boolean; sportsTravel: boolean;
    }>;
    clubDepts: Array<{
      id: string; clubName: string; department: string | null; country: string | null;
      supporterTravelRelevance: boolean; charterRelevance: boolean;
    }>;
    opportunities: Array<{
      id: string; title: string; travelingTeam: string | null;
      country: string | null; eventDate: string | null; transportType: string | null;
    }>;
  };
}

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then(setResults)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [q]);

  if (!q) {
    return (
      <div className="text-center py-16">
        <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-gray-600">Use the search bar above</h2>
        <p className="text-sm text-gray-400 mt-1">Search across all clubs, contacts, events, agents, and opportunities</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!results || results.total === 0) {
    return (
      <div className="text-center py-16">
        <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-gray-700">No results for &quot;{q}&quot;</h2>
        <p className="text-sm text-gray-400 mt-1">
          Try searching with different keywords — a team name, country, competition, or contact name.
        </p>
      </div>
    );
  }

  const { events, supporterClubs, contacts, travelAgents, clubDepts, opportunities } = results.results;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Search className="w-4 h-4" />
        <span>{results.total} results for <strong className="text-gray-800">&quot;{q}&quot;</strong></span>
      </div>

      {/* Events */}
      {events.length > 0 && (
        <SearchSection title="Events & Fixtures" icon={Calendar} count={events.length} href="/events">
          {events.map((e) => (
            <SearchRow
              key={e.id}
              primary={e.eventName}
              secondary={[e.competition, e.homeTeamName && e.awayTeamName ? `${e.homeTeamName} vs ${e.awayTeamName}` : null, e.country, formatDate(e.eventDate)].filter(Boolean).join(" • ")}
              badge={<TransportBadge type={e.transportOpportunityType} />}
            />
          ))}
        </SearchSection>
      )}

      {/* Opportunities */}
      {opportunities.length > 0 && (
        <SearchSection title="Opportunities" icon={Zap} count={opportunities.length} href="/opportunities">
          {opportunities.map((o) => (
            <SearchRow
              key={o.id}
              primary={o.title}
              secondary={[o.travelingTeam, o.country, formatDate(o.eventDate)].filter(Boolean).join(" • ")}
              badge={<TransportBadge type={o.transportType} />}
            />
          ))}
        </SearchSection>
      )}

      {/* Supporter Clubs */}
      {supporterClubs.length > 0 && (
        <SearchSection title="Supporter Clubs" icon={Users} count={supporterClubs.length} href="/supporter-clubs">
          {supporterClubs.map((c) => (
            <SearchRow
              key={c.id}
              primary={c.clubName}
              secondary={[c.teamSupported, c.city, c.country].filter(Boolean).join(" • ")}
              extra={c.contacts[0] ? (
                <span className="text-xs text-brand-600">{c.contacts[0].fullName}</span>
              ) : undefined}
            />
          ))}
        </SearchSection>
      )}

      {/* Contacts */}
      {contacts.length > 0 && (
        <SearchSection title="Contacts" icon={UserCheck} count={contacts.length} href="/contacts">
          {contacts.map((c) => {
            const org = c.supporterClub?.clubName ?? c.travelAgent?.companyName ?? c.clubDepartment?.clubName;
            return (
              <SearchRow
                key={c.id}
                primary={c.fullName}
                secondary={[c.role, org, c.country].filter(Boolean).join(" • ")}
                badge={<ConfidenceBadge level={c.confidenceLevel} />}
                extra={c.email ? (
                  <span className="text-xs text-gray-500">{c.email}</span>
                ) : undefined}
              />
            );
          })}
        </SearchSection>
      )}

      {/* Travel Agents */}
      {travelAgents.length > 0 && (
        <SearchSection title="Travel Agents" icon={Briefcase} count={travelAgents.length} href="/travel-agents">
          {travelAgents.map((a) => (
            <SearchRow
              key={a.id}
              primary={a.companyName}
              secondary={[a.specialization, a.country].filter(Boolean).join(" • ")}
              badge={
                <div className="flex gap-1">
                  {a.sportsTravel && <span className="badge bg-blue-50 text-blue-700">Sports</span>}
                  {a.charterRelevance && <span className="badge bg-purple-50 text-purple-700">Charter</span>}
                </div>
              }
            />
          ))}
        </SearchSection>
      )}

      {/* Club Departments */}
      {clubDepts.length > 0 && (
        <SearchSection title="Club Departments" icon={Building2} count={clubDepts.length} href="/club-departments">
          {clubDepts.map((d) => (
            <SearchRow
              key={d.id}
              primary={d.clubName}
              secondary={[d.department, d.country].filter(Boolean).join(" • ")}
              badge={
                <div className="flex gap-1">
                  {d.supporterTravelRelevance && <span className="badge bg-purple-50 text-purple-700">Fan Travel</span>}
                  {d.charterRelevance && <span className="badge bg-orange-50 text-orange-700">Charter</span>}
                </div>
              }
            />
          ))}
        </SearchSection>
      )}
    </div>
  );
}

function SearchSection({
  title, icon: Icon, count, href, children,
}: {
  title: string; icon: React.ElementType; count: number; href: string; children: React.ReactNode;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-brand-500" />
          <span className="font-semibold text-sm text-gray-800">{title}</span>
          <span className="badge bg-white text-gray-600 border border-gray-200">{count}</span>
        </div>
        <Link href={href} className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  );
}

function SearchRow({
  primary, secondary, badge, extra,
}: {
  primary: string; secondary?: string; badge?: React.ReactNode; extra?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900">{primary}</div>
          {secondary && <div className="text-xs text-gray-400 mt-0.5">{secondary}</div>}
          {extra && <div className="mt-1">{extra}</div>}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Search className="w-5 h-5 text-brand-500" />
          Search Results
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Results from all data sources</p>
      </div>
      <Suspense fallback={<div className="text-sm text-gray-500">Loading…</div>}>
        <SearchContent />
      </Suspense>
    </div>
  );
}

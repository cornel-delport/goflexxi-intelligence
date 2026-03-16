"use client";

import { useState, useEffect, useCallback } from "react";
import { Zap, Filter, Download, Search, MapPin, Plane, Bus, Users, Star, MessageSquare } from "lucide-react";
import { formatDate, daysUntil, truncate } from "@/lib/utils";
import { TransportBadge, PriorityBadge, ConfidenceBadge, StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

interface Opportunity {
  id: string;
  title: string;
  travelingTeam: string | null;
  targetMarket: string | null;
  country: string | null;
  city: string | null;
  competition: string | null;
  eventDate: string | null;
  venue: string | null;
  transportType: string | null;
  busWorthy: boolean;
  charterWorthy: boolean;
  flightWorthy: boolean;
  hospitalityWorthy: boolean;
  priorityRating: number | null;
  confidenceLevel: string | null;
  supporterSize: number | null;
  travelAgentAvailable: boolean;
  clubContactAvailable: boolean;
  supporterCoordinatorFound: boolean;
  bestOutreachPath: string | null;
  whyItMatters: string | null;
  departureAirport: string | null;
  arrivalAirport: string | null;
  status: string;
  notes_list: Array<{ content: string; createdAt: string }>;
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [competition, setCompetition] = useState("");
  const [transport, setTransport] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<"cards" | "table">("cards");

  const fetchOpps = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ q, country, competition, transport, status, priority });
    try {
      const res = await fetch(`/api/opportunities?${params}`);
      const data = await res.json();
      setOpportunities(data.opportunities ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [q, country, competition, transport, status, priority]);

  useEffect(() => { fetchOpps(); }, [fetchOpps]);

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Zap className="w-5 h-5 text-brand-500" />
            Opportunities
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total opportunities</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button onClick={() => setView("cards")} className={`px-3 py-1.5 text-sm ${view === "cards" ? "bg-brand-500 text-white" : "text-gray-600 hover:bg-gray-50"}`}>Cards</button>
            <button onClick={() => setView("table")} className={`px-3 py-1.5 text-sm ${view === "table" ? "bg-brand-500 text-white" : "text-gray-600 hover:bg-gray-50"}`}>Table</button>
          </div>
          <button onClick={() => setShowFilters((v) => !v)} className="btn-secondary">
            <Filter className="w-4 h-4" /> Filters
          </button>
          <a href="/api/export?type=opportunities" className="btn-secondary">
            <Download className="w-4 h-4" /> Export
          </a>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search opportunities, teams, markets, competitions…" className="input pl-9" />
      </div>

      {showFilters && (
        <div className="filter-panel grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="label">Country</label>
            <input className="input" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" />
          </div>
          <div>
            <label className="label">Competition</label>
            <input className="input" value={competition} onChange={(e) => setCompetition(e.target.value)} placeholder="e.g. MLS" />
          </div>
          <div>
            <label className="label">Transport</label>
            <select className="select" value={transport} onChange={(e) => setTransport(e.target.value)}>
              <option value="">All</option>
              <option value="bus">Bus</option>
              <option value="charter">Charter</option>
              <option value="flight">Scheduled Air</option>
              <option value="hospitality">Hospitality</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="identified">Identified</option>
              <option value="researching">Researching</option>
              <option value="contacted">Contacted</option>
              <option value="active">Active</option>
            </select>
          </div>
          <div>
            <label className="label">Min Priority</label>
            <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">Any</option>
              <option value="4">High (4+)</option>
              <option value="3">Medium (3+)</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No opportunities found"
          description="Upload data with events and priority information to generate opportunities."
          action={{ label: "Upload Data", href: "/upload" }}
        />
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {opportunities.map((opp) => (
            <OpportunityCard key={opp.id} opp={opp} />
          ))}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Opportunity</th>
                <th>Team</th>
                <th>Date</th>
                <th>Market</th>
                <th>Transport</th>
                <th>Status</th>
                <th>Outreach</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opp) => (
                <tr key={opp.id}>
                  <td><PriorityBadge rating={opp.priorityRating} /></td>
                  <td>
                    <div className="font-medium text-gray-900 text-sm">{truncate(opp.title, 50)}</div>
                    {opp.competition && <div className="text-xs text-gray-400">{opp.competition}</div>}
                  </td>
                  <td className="text-sm text-gray-700">{opp.travelingTeam ?? "—"}</td>
                  <td className="whitespace-nowrap text-sm text-gray-600">{formatDate(opp.eventDate)}</td>
                  <td>
                    {opp.country && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {opp.country}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {opp.transportType && <TransportBadge type={opp.transportType} />}
                      {opp.busWorthy && <span className="badge bg-green-50 text-green-700">Bus</span>}
                      {opp.charterWorthy && <span className="badge bg-purple-50 text-purple-700">Charter</span>}
                    </div>
                  </td>
                  <td><StatusBadge status={opp.status} /></td>
                  <td>
                    <div className="flex gap-1 text-xs">
                      {opp.travelAgentAvailable && <span className="badge bg-blue-50 text-blue-600">Agent</span>}
                      {opp.supporterCoordinatorFound && <span className="badge bg-teal-50 text-teal-600">Coord.</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OpportunityCard({ opp }: { opp: Opportunity }) {
  const days = daysUntil(opp.eventDate);

  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-sm leading-tight">{opp.title}</div>
          {opp.competition && <div className="text-xs text-gray-400 mt-0.5">{opp.competition}</div>}
        </div>
        <PriorityBadge rating={opp.priorityRating} />
      </div>

      {/* Key info row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3 text-xs text-gray-600">
        {opp.travelingTeam && (
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-gray-400" />
            <span className="font-medium">{opp.travelingTeam}</span>
          </div>
        )}
        {opp.eventDate && (
          <div className="flex items-center gap-1">
            <span>{formatDate(opp.eventDate)}</span>
            {days !== null && days >= 0 && (
              <span className={`${days <= 7 ? "text-red-500 font-semibold" : days <= 30 ? "text-orange-500" : "text-gray-400"}`}>
                ({days}d)
              </span>
            )}
          </div>
        )}
        {opp.country && (
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-gray-400" />
            <span>{opp.country}</span>
          </div>
        )}
        {opp.supporterSize && (
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-gray-400" />
            <span>~{opp.supporterSize.toLocaleString()} supporters</span>
          </div>
        )}
      </div>

      {/* Transport badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {opp.transportType && <TransportBadge type={opp.transportType} />}
        {opp.busWorthy && <span className="badge bg-green-50 text-green-700 border border-green-200"><Bus className="w-2.5 h-2.5 mr-1" />Bus</span>}
        {opp.charterWorthy && <span className="badge bg-purple-50 text-purple-700 border border-purple-200"><Plane className="w-2.5 h-2.5 mr-1" />Charter</span>}
        {opp.flightWorthy && <span className="badge bg-blue-50 text-blue-700 border border-blue-200"><Plane className="w-2.5 h-2.5 mr-1" />Flight</span>}
        {opp.hospitalityWorthy && <span className="badge bg-yellow-50 text-yellow-700 border border-yellow-200"><Star className="w-2.5 h-2.5 mr-1" />Hospitality</span>}
      </div>

      {/* Why it matters */}
      {opp.whyItMatters && (
        <p className="text-xs text-gray-600 italic mb-3 bg-gray-50 rounded-lg px-2.5 py-1.5">
          {truncate(opp.whyItMatters, 120)}
        </p>
      )}

      {/* Intelligence flags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {opp.travelAgentAvailable && (
          <span className="badge bg-blue-50 text-blue-700 border border-blue-200">Travel Agent ✓</span>
        )}
        {opp.clubContactAvailable && (
          <span className="badge bg-teal-50 text-teal-700 border border-teal-200">Club Contact ✓</span>
        )}
        {opp.supporterCoordinatorFound && (
          <span className="badge bg-green-50 text-green-700 border border-green-200">Coordinator ✓</span>
        )}
      </div>

      {/* Best outreach */}
      {opp.bestOutreachPath && (
        <div className="text-xs text-gray-500 mb-3">
          <span className="font-medium text-gray-700">Best outreach: </span>
          {opp.bestOutreachPath}
        </div>
      )}

      {/* Latest note */}
      {opp.notes_list[0] && (
        <div className="flex items-start gap-1.5 p-2.5 bg-yellow-50 rounded-lg">
          <MessageSquare className="w-3 h-3 text-yellow-600 mt-0.5 shrink-0" />
          <p className="text-xs text-yellow-800">{truncate(opp.notes_list[0].content, 80)}</p>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <StatusBadge status={opp.status} />
        {opp.confidenceLevel && <ConfidenceBadge level={opp.confidenceLevel} />}
      </div>
    </div>
  );
}

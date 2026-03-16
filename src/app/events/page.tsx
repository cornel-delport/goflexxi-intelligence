"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Filter, Download, Search, MapPin, Plane, Bus, Star } from "lucide-react";
import { formatDate, daysUntil, truncate } from "@/lib/utils";
import { TransportBadge, PriorityBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

interface Event {
  id: string;
  eventName: string;
  competition: string | null;
  stage: string | null;
  category: string | null;
  eventDate: string | null;
  homeTeamName: string | null;
  awayTeamName: string | null;
  venueName: string | null;
  city: string | null;
  country: string | null;
  transportOpportunityType: string | null;
  closestDepartureAirport: string | null;
  closestArrivalAirport: string | null;
  priorityRating: number | null;
  charterWorthy: boolean;
  busWorthy: boolean;
  flightWorthy: boolean;
  notes: string | null;
  sourceFile: { originalName: string } | null;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [competition, setCompetition] = useState("");
  const [transport, setTransport] = useState("");
  const [priority, setPriority] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ q, country, competition, transport, priority });
    try {
      const res = await fetch(`/api/events?${params}`);
      const data = await res.json();
      setEvents(data.events ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [q, country, competition, transport, priority]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-500" />
            Events & Fixtures
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} events in database</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters((v) => !v)} className="btn-secondary">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <a href="/api/export?type=events" className="btn-secondary">
            <Download className="w-4 h-4" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search events, teams, competitions, venues, countries…"
          className="input pl-9"
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="filter-panel grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="label">Country</label>
            <input className="input" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. USA" />
          </div>
          <div>
            <label className="label">Competition</label>
            <input className="input" value={competition} onChange={(e) => setCompetition(e.target.value)} placeholder="e.g. MLS, UEFA" />
          </div>
          <div>
            <label className="label">Transport Type</label>
            <select className="select" value={transport} onChange={(e) => setTransport(e.target.value)}>
              <option value="">All types</option>
              <option value="bus">Bus</option>
              <option value="charter">Charter</option>
              <option value="scheduled_air">Scheduled Air</option>
              <option value="hospitality">Hospitality</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <div>
            <label className="label">Min Priority</label>
            <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">Any</option>
              <option value="4">High (4+)</option>
              <option value="3">Medium (3+)</option>
              <option value="2">Low (2+)</option>
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No events found"
          description="Upload an events spreadsheet or adjust your filters to see matches."
          action={{ label: "Upload Event Data", href: "/upload" }}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Event</th>
                <th>Teams</th>
                <th>Competition</th>
                <th>Location</th>
                <th>Airports</th>
                <th>Transport</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => {
                const days = daysUntil(ev.eventDate);
                const isImminent = days !== null && days <= 14 && days >= 0;

                return (
                  <tr key={ev.id} className={isImminent ? "bg-orange-50/50" : ""}>
                    <td className="whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatDate(ev.eventDate)}</div>
                      {days !== null && days >= 0 && (
                        <div className={`text-xs ${days <= 7 ? "text-red-500 font-semibold" : days <= 14 ? "text-orange-500" : "text-gray-400"}`}>
                          {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d away`}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="text-sm font-medium text-gray-900">{truncate(ev.eventName, 45)}</div>
                      {ev.stage && <div className="text-xs text-gray-400">{ev.stage}</div>}
                    </td>
                    <td>
                      <div className="text-sm text-gray-700">
                        {ev.homeTeamName && <span className="font-medium">{ev.homeTeamName}</span>}
                        {ev.homeTeamName && ev.awayTeamName && <span className="text-gray-400 mx-1">vs</span>}
                        {ev.awayTeamName && <span>{ev.awayTeamName}</span>}
                      </div>
                      {ev.venueName && <div className="text-xs text-gray-400">{ev.venueName}</div>}
                    </td>
                    <td>
                      <div className="text-sm text-gray-700">{ev.competition ?? "—"}</div>
                    </td>
                    <td>
                      {(ev.city || ev.country) && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                          {[ev.city, ev.country].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="space-y-0.5 text-xs text-gray-500">
                        {ev.closestDepartureAirport && (
                          <div className="flex items-center gap-1">
                            <Plane className="w-2.5 h-2.5" />
                            <span>{ev.closestDepartureAirport}</span>
                          </div>
                        )}
                        {ev.closestArrivalAirport && ev.closestArrivalAirport !== ev.closestDepartureAirport && (
                          <div className="text-gray-400">{ev.closestArrivalAirport}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {ev.transportOpportunityType && (
                          <TransportBadge type={ev.transportOpportunityType} />
                        )}
                        {ev.busWorthy && !ev.transportOpportunityType?.includes("bus") && (
                          <span className="badge bg-green-50 text-green-700"><Bus className="w-2.5 h-2.5 mr-1" />Bus</span>
                        )}
                        {ev.charterWorthy && !ev.transportOpportunityType?.includes("charter") && (
                          <span className="badge bg-purple-50 text-purple-700"><Plane className="w-2.5 h-2.5 mr-1" />Charter</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <PriorityBadge rating={ev.priorityRating} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

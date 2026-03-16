"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Filter, Download, Search, Globe, Mail, Phone, Instagram, Facebook, MessageCircle, CheckCircle } from "lucide-react";
import { truncate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

interface SupporterClub {
  id: string;
  clubName: string;
  officialStatus: string | null;
  teamSupported: string | null;
  scope: string | null;
  city: string | null;
  country: string | null;
  members: number | null;
  followers: number | null;
  primaryDepartureAirport: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  x: string | null;
  email: string | null;
  phone: string | null;
  bestOutreachRoute: string | null;
  travelCoordinatorFound: boolean;
  travelCoordinatorName: string | null;
  travelCoordinatorContact: string | null;
  notes: string | null;
  contacts: Array<{ id: string; fullName: string; role: string | null; email: string | null }>;
  sourceFile: { originalName: string } | null;
}

export default function SupporterClubsPage() {
  const [clubs, setClubs] = useState<SupporterClub[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [team, setTeam] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<"cards" | "table">("table");

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ q, country, team });
    try {
      const res = await fetch(`/api/supporter-clubs?${params}`);
      const data = await res.json();
      setClubs(data.clubs ?? []);
      setTotal(data.total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [q, country, team]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-500" />
            Supporter Clubs
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} clubs in database</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button onClick={() => setView("table")} className={`px-3 py-1.5 text-sm ${view === "table" ? "bg-brand-500 text-white" : "text-gray-600 hover:bg-gray-50"}`}>Table</button>
            <button onClick={() => setView("cards")} className={`px-3 py-1.5 text-sm ${view === "cards" ? "bg-brand-500 text-white" : "text-gray-600 hover:bg-gray-50"}`}>Cards</button>
          </div>
          <button onClick={() => setShowFilters((v) => !v)} className="btn-secondary"><Filter className="w-4 h-4" /> Filters</button>
          <a href="/api/export?type=supporter-clubs" className="btn-secondary"><Download className="w-4 h-4" /> Export</a>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clubs, teams, cities, countries…" className="input pl-9" />
      </div>

      {showFilters && (
        <div className="filter-panel grid grid-cols-3 gap-3">
          <div>
            <label className="label">Country</label>
            <input className="input" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. USA" />
          </div>
          <div>
            <label className="label">Team Supported</label>
            <input className="input" value={team} onChange={(e) => setTeam(e.target.value)} placeholder="e.g. Inter Miami" />
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}</div>
      ) : clubs.length === 0 ? (
        <EmptyState icon={Users} title="No supporter clubs found" description="Upload supporter club data to populate this page." action={{ label: "Upload Data", href: "/upload" }} />
      ) : view === "table" ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Club Name</th>
                <th>Team</th>
                <th>Location</th>
                <th>Reach</th>
                <th>Contact Routes</th>
                <th>Travel Coord.</th>
                <th>Best Outreach</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {clubs.map((club) => (
                <tr key={club.id}>
                  <td>
                    <div className="font-medium text-gray-900 text-sm">{club.clubName}</div>
                    {club.officialStatus && (
                      <span className={`badge mt-0.5 ${club.officialStatus.toLowerCase().includes("official") ? "bg-brand-50 text-brand-700" : "bg-gray-100 text-gray-500"}`}>
                        {club.officialStatus}
                      </span>
                    )}
                  </td>
                  <td className="text-sm text-gray-700 font-medium">{club.teamSupported ?? "—"}</td>
                  <td>
                    <div className="text-sm text-gray-700">{[club.city, club.country].filter(Boolean).join(", ") || "—"}</div>
                    {club.primaryDepartureAirport && <div className="text-xs text-gray-400">✈ {club.primaryDepartureAirport}</div>}
                  </td>
                  <td>
                    <div className="text-xs space-y-0.5">
                      {club.members && <div className="text-gray-700">{club.members.toLocaleString()} members</div>}
                      {club.followers && <div className="text-gray-400">{club.followers.toLocaleString()} followers</div>}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {club.email && <Mail className="w-3.5 h-3.5 text-brand-500" aria-label={club.email} />}
                      {club.phone && <Phone className="w-3.5 h-3.5 text-green-500" aria-label={club.phone} />}
                      {club.instagram && <Instagram className="w-3.5 h-3.5 text-pink-500" aria-label={club.instagram} />}
                      {club.facebook && <Facebook className="w-3.5 h-3.5 text-blue-500" aria-label={club.facebook} />}
                      {club.website && <Globe className="w-3.5 h-3.5 text-gray-400" aria-label={club.website} />}
                    </div>
                    {club.contacts.length > 0 && (
                      <div className="text-xs text-brand-600 mt-1">{club.contacts[0].fullName}</div>
                    )}
                  </td>
                  <td>
                    {club.travelCoordinatorFound ? (
                      <div>
                        <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <CheckCircle className="w-3 h-3" /> Found
                        </div>
                        {club.travelCoordinatorName && (
                          <div className="text-xs text-gray-600 mt-0.5">{club.travelCoordinatorName}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Not found</span>
                    )}
                  </td>
                  <td>
                    {club.bestOutreachRoute ? (
                      <span className="badge bg-teal-50 text-teal-700">{club.bestOutreachRoute}</span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="text-xs text-gray-400">{truncate(club.sourceFile?.originalName ?? "", 20)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clubs.map((club) => (
            <div key={club.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{club.clubName}</div>
                  {club.teamSupported && <div className="text-xs text-brand-600 font-medium mt-0.5">{club.teamSupported}</div>}
                </div>
                {club.officialStatus && (
                  <span className="badge bg-gray-100 text-gray-600 text-xs">{club.officialStatus}</span>
                )}
              </div>
              <div className="text-xs text-gray-500 mb-3">
                {[club.city, club.country].filter(Boolean).join(", ") || "Location unknown"}
              </div>
              <div className="flex items-center gap-2 mb-3">
                {club.email && <Mail className="w-3.5 h-3.5 text-brand-500" />}
                {club.phone && <Phone className="w-3.5 h-3.5 text-green-500" />}
                {club.instagram && <Instagram className="w-3.5 h-3.5 text-pink-500" />}
                {club.facebook && <Facebook className="w-3.5 h-3.5 text-blue-500" />}
                {club.website && <Globe className="w-3.5 h-3.5 text-gray-400" />}
              </div>
              {club.travelCoordinatorFound && (
                <div className="text-xs text-green-600 bg-green-50 rounded px-2 py-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> {club.travelCoordinatorName ?? "Travel Coordinator Found"}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

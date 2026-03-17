"use client";

import { useState, useEffect, useCallback } from "react";
import { Briefcase, Filter, Search, CheckCircle } from "lucide-react";
import { PriorityBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContactLink } from "@/components/ui/ContactLink";

interface TravelAgent {
  id: string;
  companyName: string;
  specialization: string | null;
  country: string | null;
  city: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  groupTravel: boolean;
  sportsTravel: boolean;
  supporterTravel: boolean;
  footballTravel: boolean;
  rugbyTravel: boolean;
  charterRelevance: boolean;
  hospitalityPackages: boolean;
  bestContactPerson: string | null;
  bestOutreachRoute: string | null;
  priorityRating: number | null;
  contacts: Array<{ id: string; fullName: string; role: string | null; email: string | null }>;
  sourceFile: { originalName: string } | null;
}

export default function TravelAgentsPage() {
  const [agents, setAgents] = useState<TravelAgent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ q, country });
    try {
      const res = await fetch(`/api/travel-agents?${params}`);
      const data = await res.json();
      setAgents(data.agents ?? []);
      setTotal(data.total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [q, country]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const Capability = ({ active, label, color }: { active: boolean; label: string; color: string }) => {
    if (!active) return null;
    return <span className={`badge ${color}`}>{label}</span>;
  };

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-brand-500" />
            Sports Travel Agents
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} travel agents in database</p>
        </div>
        <button onClick={() => setShowFilters((v) => !v)} className="btn-secondary">
          <Filter className="w-4 h-4" /> Filters
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search agencies, specializations, countries…" className="input pl-9" />
      </div>

      {showFilters && (
        <div className="filter-panel grid grid-cols-2 gap-3">
          <div>
            <label className="label">Country</label>
            <input className="input" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. UK" />
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : agents.length === 0 ? (
        <EmptyState icon={Briefcase} title="No travel agents found" description="Import travel agent data to populate this page." action={{ label: "Upload Data", href: "/upload" }} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((a) => (
            <div key={a.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{a.companyName}</div>
                  {a.specialization && <div className="text-xs text-gray-500 mt-0.5">{a.specialization}</div>}
                </div>
                <PriorityBadge rating={a.priorityRating} />
              </div>

              <div className="text-xs text-gray-500 mb-3">
                {[a.city, a.country].filter(Boolean).join(", ") || "Location unknown"}
              </div>

              {/* Capabilities */}
              <div className="flex flex-wrap gap-1 mb-3">
                <Capability active={a.sportsTravel}   label="Sports"    color="bg-blue-50 text-blue-700" />
                <Capability active={a.supporterTravel} label="Supporter" color="bg-purple-50 text-purple-700" />
                <Capability active={a.footballTravel} label="Football"  color="bg-brand-50 text-brand-700" />
                <Capability active={a.charterRelevance} label="Charter" color="bg-orange-50 text-orange-700" />
                <Capability active={a.groupTravel}    label="Groups"    color="bg-teal-50 text-teal-700" />
                <Capability active={a.hospitalityPackages} label="Hospitality" color="bg-yellow-50 text-yellow-700" />
              </div>

              {/* Contact details */}
              <div className="space-y-1 mb-3">
                <ContactLink type="email"   value={a.email}   maxLen={30} />
                <ContactLink type="phone"   value={a.phone}   />
                <ContactLink type="website" value={a.website} maxLen={30} />
              </div>

              {/* Best contact */}
              {a.bestContactPerson && (
                <div className="text-xs bg-brand-50 text-brand-700 rounded px-2 py-1.5 mb-2">
                  Key contact: {a.bestContactPerson}
                </div>
              )}

              {/* Linked contacts */}
              {a.contacts.length > 0 && (
                <div className="pt-2 border-t border-gray-100 space-y-1">
                  {a.contacts.map((c) => (
                    <div key={c.id} className="text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-2.5 h-2.5 text-brand-400 shrink-0" />
                        <span>{c.fullName}{c.role && ` • ${c.role}`}</span>
                      </div>
                      {c.email && <ContactLink type="email" value={c.email} maxLen={28} className="ml-3.5" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { Building2, Filter, Search, CheckCircle } from "lucide-react";
import { PriorityBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContactLink } from "@/components/ui/ContactLink";

interface ClubDepartment {
  id: string;
  clubName: string;
  teamName: string | null;
  department: string | null;
  country: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  supporterTravelRelevance: boolean;
  charterRelevance: boolean;
  hospitalityRelevance: boolean;
  externalTravelPartner: string | null;
  priorityRating: number | null;
  bestOutreachRoute: string | null;
  notes: string | null;
  contacts: Array<{ id: string; fullName: string; role: string | null; email: string | null }>;
  sourceFile: { originalName: string } | null;
}

const DEPT_LABELS: Record<string, string> = {
  supporter_travel: "Supporter Travel",
  ticketing: "Ticketing",
  commercial: "Commercial",
  operations: "Operations",
  partnerships: "Partnerships",
};

export default function ClubDepartmentsPage() {
  const [departments, setDepartments] = useState<ClubDepartment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [dept, setDept] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ q, country, dept });
    try {
      const res = await fetch(`/api/club-departments?${params}`);
      const data = await res.json();
      setDepartments(data.departments ?? []);
      setTotal(data.total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [q, country, dept]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-500" />
            Club Travel Departments
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} club departments in database</p>
        </div>
        <button onClick={() => setShowFilters((v) => !v)} className="btn-secondary"><Filter className="w-4 h-4" /> Filters</button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clubs, teams, departments, countries…" className="input pl-9" />
      </div>

      {showFilters && (
        <div className="filter-panel grid grid-cols-3 gap-3">
          <div>
            <label className="label">Country</label>
            <input className="input" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. England" />
          </div>
          <div>
            <label className="label">Department Type</label>
            <input className="input" value={dept} onChange={(e) => setDept(e.target.value)} placeholder="e.g. supporter travel" />
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
      ) : departments.length === 0 ? (
        <EmptyState icon={Building2} title="No club departments found" description="Import club internal travel department data." action={{ label: "Upload Data", href: "/upload" }} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Club / Team</th>
                <th>Department</th>
                <th>Location</th>
                <th>Contact Details</th>
                <th>Relevance</th>
                <th>External Partner</th>
                <th>Key Contacts</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="font-medium text-gray-900 text-sm">{d.clubName}</div>
                    {d.teamName && d.teamName !== d.clubName && (
                      <div className="text-xs text-brand-600">{d.teamName}</div>
                    )}
                  </td>
                  <td>
                    {d.department ? (
                      <span className="badge bg-gray-100 text-gray-700">
                        {DEPT_LABELS[d.department] ?? d.department}
                      </span>
                    ) : <span className="text-gray-400 text-sm">—</span>}
                  </td>
                  <td className="text-sm text-gray-600">
                    {[d.city, d.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td>
                    <div className="space-y-0.5">
                      <ContactLink type="email" value={d.email} maxLen={25} />
                      <ContactLink type="phone" value={d.phone} />
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {d.supporterTravelRelevance && (
                        <span className="badge bg-purple-50 text-purple-700">Fan Travel</span>
                      )}
                      {d.charterRelevance && (
                        <span className="badge bg-orange-50 text-orange-700">Charter</span>
                      )}
                      {d.hospitalityRelevance && (
                        <span className="badge bg-yellow-50 text-yellow-700">Hospitality</span>
                      )}
                    </div>
                  </td>
                  <td className="text-xs text-gray-600">
                    {d.externalTravelPartner ? (
                      <span className="text-brand-700 font-medium">{truncate(d.externalTravelPartner, 25)}</span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td>
                    <div className="space-y-1">
                      {d.contacts.map((c) => (
                        <div key={c.id} className="text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-2.5 h-2.5 text-brand-400 shrink-0" />
                            <span>{c.fullName}{c.role && ` • ${c.role}`}</span>
                          </div>
                          {c.email && <ContactLink type="email" value={c.email} maxLen={26} className="ml-3.5" />}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td><PriorityBadge rating={d.priorityRating} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

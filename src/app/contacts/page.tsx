"use client";

import { useState, useEffect, useCallback } from "react";
import { UserCheck, Filter, Download, Search } from "lucide-react";
import { ConfidenceBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContactLink } from "@/components/ui/ContactLink";

interface Contact {
  id: string;
  fullName: string;
  role: string | null;
  organizationType: string | null;
  organization: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  instagram: string | null;
  city: string | null;
  country: string | null;
  confidenceLevel: string | null;
  isDecisionMaker: boolean;
  supporterTravelRelevance: boolean;
  charterRelevance: boolean;
  bestOutreachRoute: string | null;
  notes: string | null;
  markedForFollowUp: boolean;
  contacted: boolean;
  supporterClub: { id: string; clubName: string } | null;
  travelAgent: { id: string; companyName: string } | null;
  clubDepartment: { id: string; clubName: string; department: string | null } | null;
  sourceFile: { originalName: string } | null;
}

const ORG_TYPE_LABELS: Record<string, string> = {
  supporter_club: "Supporter Club",
  travel_agent: "Travel Agent",
  club_dept: "Club Dept",
  other: "Other",
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [country, setCountry] = useState("");
  const [confidence, setConfidence] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ q, type, country, confidence });
    try {
      const res = await fetch(`/api/contacts?${params}`);
      const data = await res.json();
      setContacts(data.contacts ?? []);
      setTotal(data.total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [q, type, country, confidence]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const linkedOrg = (c: Contact) => {
    if (c.supporterClub) return { label: c.supporterClub.clubName, type: "Club" };
    if (c.travelAgent) return { label: c.travelAgent.companyName, type: "Agent" };
    if (c.clubDepartment) return { label: `${c.clubDepartment.clubName} – ${c.clubDepartment.department ?? "Travel"}`, type: "Dept" };
    return c.organization ? { label: c.organization, type: c.organizationType ?? "" } : null;
  };

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-brand-500" />
            Contacts Intelligence
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} contacts across all organizations</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters((v) => !v)} className="btn-secondary"><Filter className="w-4 h-4" /> Filters</button>
          <a href="/api/export?type=contacts" className="btn-secondary"><Download className="w-4 h-4" /> Export</a>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search names, emails, roles, organizations, countries…" className="input pl-9" />
      </div>

      {showFilters && (
        <div className="filter-panel grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="label">Organization Type</label>
            <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All types</option>
              <option value="supporter_club">Supporter Club</option>
              <option value="travel_agent">Travel Agent</option>
              <option value="club_dept">Club Department</option>
            </select>
          </div>
          <div>
            <label className="label">Country</label>
            <input className="input" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. USA" />
          </div>
          <div>
            <label className="label">Confidence</label>
            <select className="select" value={confidence} onChange={(e) => setConfidence(e.target.value)}>
              <option value="">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>
      ) : contacts.length === 0 ? (
        <EmptyState icon={UserCheck} title="No contacts found" description="Import contact data from your Excel files." action={{ label: "Upload Data", href: "/upload" }} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Organization</th>
                <th>Location</th>
                <th>Contact Details</th>
                <th>Outreach</th>
                <th>Confidence</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => {
                const org = linkedOrg(c);
                return (
                  <tr key={c.id} className={c.markedForFollowUp ? "bg-yellow-50/30" : ""}>
                    <td>
                      <div className="font-medium text-gray-900 text-sm">{c.fullName}</div>
                      {c.isDecisionMaker && (
                        <span className="badge bg-brand-50 text-brand-700 text-xs mt-0.5">Decision Maker</span>
                      )}
                    </td>
                    <td className="text-sm text-gray-600">{c.role ?? "—"}</td>
                    <td>
                      {org ? (
                        <div>
                          <div className="text-sm text-gray-800 font-medium">{truncate(org.label, 35)}</div>
                          <span className="text-xs text-gray-400">{org.type}</span>
                        </div>
                      ) : <span className="text-gray-400 text-sm">—</span>}
                    </td>
                    <td className="text-sm text-gray-600">
                      {[c.city, c.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td>
                      <div className="space-y-0.5">
                        <ContactLink type="email"    value={c.email}    maxLen={28} />
                        <ContactLink type="phone"    value={c.phone}    />
                        <ContactLink type="linkedin" value={c.linkedin} />
                        <ContactLink type="instagram" value={c.instagram} />
                      </div>
                    </td>
                    <td>
                      {c.bestOutreachRoute ? (
                        <span className="badge bg-teal-50 text-teal-700">{c.bestOutreachRoute}</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td><ConfidenceBadge level={c.confidenceLevel} /></td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {c.supporterTravelRelevance && (
                          <span className="badge bg-purple-50 text-purple-700">Fan Travel</span>
                        )}
                        {c.charterRelevance && (
                          <span className="badge bg-blue-50 text-blue-700">Charter</span>
                        )}
                        {c.contacted && (
                          <span className="badge bg-green-50 text-green-700">Contacted</span>
                        )}
                        {c.markedForFollowUp && (
                          <span className="badge bg-yellow-50 text-yellow-700">Follow Up</span>
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
    </div>
  );
}

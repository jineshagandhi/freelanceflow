import React, { useState, useEffect } from "react";
import { useApp } from "../AppContext";
import {
  Search, MapPin, Wifi, Globe, AlertCircle, Briefcase,
  CheckCircle, AlertTriangle, Clock, Users, ChevronDown, X
} from "lucide-react";
import { BidModal } from "./BidModal";

interface Project {
  id:          string;
  title:       string;
  summary:     string;
  location:    string;
  budget:      number;
  skills:      string[] | string | null | undefined;
  clientRisk:  "Low" | "Medium" | "High";
  clientName:  string;
  clientScore: number;
  paymentType: string;
  postedDate:  string;
  endDate:     string;
  bidCount:    number;
  category:    string;
}

// ── Safely normalize skills regardless of what the backend sends ──────────────
function toSkillsArray(skills: string[] | string | null | undefined): string[] {
  if (Array.isArray(skills)) return skills;
  if (typeof skills === "string" && skills.trim() !== "")
    return skills.split(",").map(s => s.trim()).filter(Boolean);
  return [];
}

const riskBadge = (risk: string) => {
  if (risk === "Low")    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (risk === "Medium") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-600 border-red-200";
};

const scoreDot = (score: number) => {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
};

const scoreText = (score: number) => {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
};

const CATEGORIES = ["All", "Design", "Development", "Marketing", "Writing", "Video", "Finance"];

export function FreelancerMarketplace() {
  const { user } = useApp();

  const [projects,   setProjects]   = useState<Project[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [search,     setSearch]     = useState("");
  const [category,   setCategory]   = useState("All");
  const [sortBy,     setSortBy]     = useState("Newest First");
  const [bidProject, setBidProject] = useState<Project | null>(null);

  const load = (q: string) => {
    setLoading(true); setError(null);
    fetch(`/api/marketplace?search=${encodeURIComponent(q)}`)
      .then(r => { if (!r.ok) throw new Error(r.status.toString()); return r.json(); })
      .then(d  => { setProjects(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { load(search); }, [search]);

  const displayed = projects
    .filter(p => category === "All" || (p.category ?? "").toLowerCase() === category.toLowerCase())
    .sort((a, b) => {
      if (sortBy === "Budget High") return b.budget - a.budget;
      if (sortBy === "Budget Low")  return a.budget - b.budget;
      if (sortBy === "Most Bids")   return (b.bidCount ?? 0) - (a.bidCount ?? 0);
      return (b.postedDate ?? "").localeCompare(a.postedDate ?? "");
    });

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Project Marketplace</h1>
        {!loading && (
          <p className="text-sm text-gray-500 mt-0.5">
            {displayed.length} open project{displayed.length !== 1 ? "s" : ""} · Showing {displayed.length} results
          </p>
        )}
      </div>

      {/* Search + filters bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, skills, keywords..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="relative">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-white text-gray-700 focus:ring-2 focus:ring-indigo-400 cursor-pointer">
              {["Newest First", "Budget High", "Budget Low", "Most Bids"].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                category === cat ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Risk legend */}
        <div className="flex gap-5 pt-0.5">
          {[["bg-emerald-500","Low Risk (80–100)"],["bg-amber-500","Medium Risk (60–79)"],["bg-red-500","High Risk (<60)"]].map(([c,l]) => (
            <div key={l} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`w-2 h-2 rounded-full ${c}`} /> {l}
            </div>
          ))}
        </div>
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center gap-3 text-gray-400 text-sm py-8">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          Loading marketplace...
        </div>
      )}

      {!loading && error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm max-w-lg">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Failed to load marketplace</p>
            <p className="text-xs text-red-400 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && displayed.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <Briefcase size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">No projects found</p>
          <p className="text-sm mt-1">{search ? "Try a different search." : "No open projects yet."}</p>
        </div>
      )}

      {/* Cards grid */}
      {!loading && !error && displayed.length > 0 && (
        <div className="grid md:grid-cols-2 gap-5">
          {displayed.map(p => {
            // Normalize skills once per card — safe regardless of backend format
            const skills = toSkillsArray(p.skills);

            return (
              <div key={p.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">

                {/* Row 1 — badges */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {p.category && (
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[11px] font-bold">{p.category}</span>
                  )}
                  {p.location && (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-500 rounded-lg text-[11px]">
                      {p.location.toLowerCase() === "remote"
                        ? <><Wifi size={11} className="text-indigo-400" /> Remote</>
                        : <><MapPin size={11} className="text-gray-400" /> {p.location}</>
                      }
                    </span>
                  )}
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold ml-auto ${riskBadge(p.clientRisk)}`}>
                    {p.clientRisk === "Low" ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                    {p.clientRisk} Risk
                  </span>
                </div>

                {/* Budget */}
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-xl font-black text-gray-900">${p.budget?.toLocaleString()}</span>
                  {p.paymentType && <span className="text-xs text-gray-400">{p.paymentType}</span>}
                </div>

                {/* Title + summary */}
                <h3 className="font-bold text-gray-900 text-[15px] leading-snug mb-1">{p.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{p.summary}</p>

                {/* Skills — uses normalized array, never crashes */}
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {skills.slice(0, 4).map(s => (
                      <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px] font-medium">{s}</span>
                    ))}
                    {skills.length > 4 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded text-[11px]">+{skills.length - 4}</span>
                    )}
                  </div>
                )}

                {/* Client row */}
                <div className="flex items-center justify-between py-3 border-t border-gray-50 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold shrink-0">
                      {(p.clientName ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{p.clientName ?? "Unknown"}</p>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1">
                        <MapPin size={9} /> {p.location ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <span className={`w-2 h-2 rounded-full ${scoreDot(p.clientScore ?? 50)}`} />
                      <span className={`text-xs font-bold ${scoreText(p.clientScore ?? 50)}`}>{p.clientScore ?? "—"}/100</span>
                    </div>
                    <p className="text-[10px] text-gray-400">Client score</p>
                  </div>
                </div>

                {/* Score bar */}
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div className={`h-full rounded-full transition-all ${scoreDot(p.clientScore ?? 50)}`}
                    style={{ width: `${Math.min(100, p.clientScore ?? 50)}%` }} />
                </div>

                {/* Footer meta */}
                <div className="flex items-center justify-between text-[11px] text-gray-400 mb-4">
                  <span className="flex items-center gap-1"><Users size={11} /> {p.bidCount ?? 0} bids</span>
                  {p.postedDate && <span>Posted {p.postedDate}</span>}
                  {p.endDate    && <span className="flex items-center gap-1"><Clock size={11} /> Due {p.endDate}</span>}
                </div>

                {/* CTA */}
                <button onClick={() => setBidProject(p)}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                  🏷️ Place Bid →
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Bid modal */}
      {bidProject && (
        <BidModal
          project={bidProject}
          freelancerId={user?.id ?? ""}
          freelancerName={user?.name ?? ""}
          onClose={() => setBidProject(null)}
          onSuccess={() => { setBidProject(null); load(search); }}
        />
      )}
    </div>
  );
}

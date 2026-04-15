import React, { useState, useEffect } from "react";
import { useApp } from "../AppContext";
import {
  AlertCircle, ChevronDown, ChevronUp, CheckCircle,
  Gavel, Trophy, User, TrendingUp, Settings, Save, Loader
} from "lucide-react";

interface ScoreBreakdown {
  reliability:     number;
  budgetFit:       number;
  experienceMatch: number;
  completionRate:  number;
  proposalQuality: number;
}

interface Bid {
  id:              string;
  freelancerId:    string;
  freelancerName:  string;
  bidAmount:       number;
  proposal:        string;
  proposalQuality: number;
  submittedAt:     string;
  status:          string;
  score:           number;
  scoreBreakdown:  ScoreBreakdown;
}

interface ClientProject {
  id:     string;
  title:  string;
  budget: number;
  status: string;
}

interface Weights {
  reliability:     number;
  budgetFit:       number;
  experienceMatch: number;
  completionRate:  number;
  proposalQuality: number;
}

const DEFAULT_WEIGHTS: Weights = {
  reliability: 30, budgetFit: 25, experienceMatch: 20, completionRate: 15, proposalQuality: 10,
};

const METRIC_LABELS: Record<keyof Weights, string> = {
  reliability:     "Reliability",
  budgetFit:       "Budget Fit",
  experienceMatch: "Experience Match",
  completionRate:  "Completion Rate",
  proposalQuality: "Proposal Quality",
};

const scoreColor  = (s: number) => s >= 70 ? "text-emerald-600" : s >= 45 ? "text-amber-600" : "text-red-500";
const scoreBg     = (s: number) => s >= 70 ? "bg-emerald-50 border-emerald-100" : s >= 45 ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100";
const barColor    = (s: number) => s >= 70 ? "bg-emerald-500" : s >= 45 ? "bg-amber-500" : "bg-red-400";
const statusStyle = (s: string) => s === "Accepted" ? "bg-emerald-50 text-emerald-700" : s === "Rejected" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700";

export function ProjectBidding() {
  const { user } = useApp();

  const [projects,        setProjects]        = useState<ClientProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<ClientProject | null>(null);
  const [bids,            setBids]            = useState<Bid[]>([]);
  const [weights,         setWeights]         = useState<Weights>({ ...DEFAULT_WEIGHTS });
  const [expandedBid,     setExpandedBid]     = useState<string | null>(null);
  const [showWeights,     setShowWeights]     = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingBids,     setLoadingBids]     = useState(false);
  const [savingWeights,   setSavingWeights]   = useState(false);
  const [accepting,       setAccepting]       = useState<string | null>(null);
  const [error,           setError]           = useState<string | null>(null);
  const [successMsg,      setSuccessMsg]      = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/client/projects?clientId=${user.id}`)
      .then(r => { if (!r.ok) throw new Error(r.status.toString()); return r.json(); })
      .then(d  => { setProjects(Array.isArray(d) ? d : []); setLoadingProjects(false); })
      .catch(e => { setError("Failed to load projects: " + e.message); setLoadingProjects(false); });
  }, [user?.id]);

  const loadBids = (project: ClientProject) => {
    setSelectedProject(project); setLoadingBids(true);
    setBids([]); setSuccessMsg(null); setError(null); setShowWeights(false);

    fetch(`/api/bids/project?projectId=${project.id}`)
      .then(r => { if (!r.ok) throw new Error(r.status.toString()); return r.json(); })
      .then(d  => { setBids(Array.isArray(d) ? d : []); setLoadingBids(false); })
      .catch(e => { setError("Failed to load bids: " + e.message); setLoadingBids(false); });

    fetch(`/api/bids/weights?projectId=${project.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d  => {
        if (d) {
          setWeights({
            reliability:     Math.round((d.reliability     ?? 0.30) * 100),
            budgetFit:       Math.round((d.budgetFit       ?? 0.25) * 100),
            experienceMatch: Math.round((d.experienceMatch ?? 0.20) * 100),
            completionRate:  Math.round((d.completionRate  ?? 0.15) * 100),
            proposalQuality: Math.round((d.proposalQuality ?? 0.10) * 100),
          });
        }
      })
      .catch(() => setWeights({ ...DEFAULT_WEIGHTS }));
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  const saveWeights = async () => {
    if (!selectedProject) return;
    if (Math.abs(totalWeight - 100) > 1) { setError("Weights must sum to 100%"); return; }
    setSavingWeights(true); setError(null);

    const normalised: Record<string, number> = {};
    for (const [k, v] of Object.entries(weights)) normalised[k] = v / 100;

    try {
      const res = await fetch("/api/bids/weights", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject.id, weights: normalised }),
      });
      if (!res.ok) throw new Error();
      setSuccessMsg("Weights saved. All bids have been rescored.");
      loadBids(selectedProject);
    } catch { setError("Failed to save weights"); }
    finally { setSavingWeights(false); }
  };

  const handleAccept = async (bid: Bid) => {
    if (!selectedProject) return;
    setAccepting(bid.id); setError(null);
    try {
      const res = await fetch("/api/bids/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidId: bid.id, projectId: selectedProject.id, freelancerId: bid.freelancerId }),
      });
      if (!res.ok) throw new Error();
      setSuccessMsg(`✓ Bid accepted! ${bid.freelancerName} has been assigned.`);
      loadBids(selectedProject);
    } catch { setError("Failed to accept bid"); }
    finally { setAccepting(null); }
  };

  const projectAlreadyAwarded = bids.some(b => b.status === "Accepted");

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Project Bids</h1>
        <p className="text-sm text-gray-500 mt-0.5">Select a project to view and compare freelancer bids.</p>
      </div>

      {error    && <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm max-w-lg mb-5"><AlertCircle size={18} className="mt-0.5 shrink-0" /><p>{error}</p></div>}
      {successMsg && <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl p-4 text-sm max-w-lg mb-5"><CheckCircle size={18} className="mt-0.5 shrink-0" /><p>{successMsg}</p></div>}

      <div className="grid lg:grid-cols-3 gap-6">

        {/* Project list */}
        <div className="lg:col-span-1">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Your Projects</h2>
          {loadingProjects && <div className="flex items-center gap-2 text-gray-400 text-sm"><div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /> Loading...</div>}
          {!loadingProjects && projects.length === 0 && (
            <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-gray-100">
              <Gavel size={30} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No projects yet.</p>
            </div>
          )}
          <div className="space-y-2">
            {projects.map(p => (
              <button key={p.id} onClick={() => loadBids(p)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedProject?.id === p.id ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-100 hover:border-emerald-200 hover:bg-gray-50/50"
                }`}>
                <p className="text-sm font-semibold text-gray-900 truncate">{p.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400">Budget: ${p.budget?.toLocaleString()}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.status === "Open" ? "bg-sky-50 text-sky-700" : p.status?.includes("Progress") ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"}`}>{p.status}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Bids panel */}
        <div className="lg:col-span-2">

          {!selectedProject && (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 text-gray-400">
              <Gavel size={36} className="mb-3 opacity-20" />
              <p className="font-medium text-sm">Select a project to view bids</p>
            </div>
          )}

          {selectedProject && (
            <div className="space-y-4">

              {/* Scoring Weights Editor */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <button onClick={() => setShowWeights(w => !w)}
                  className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Settings size={16} className="text-indigo-500" />
                    Scoring Weights
                    <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${Math.abs(totalWeight - 100) <= 1 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                      Total: {totalWeight}%
                    </span>
                  </div>
                  {showWeights ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>
                <p className="text-xs text-gray-400 mt-1">Customise how each metric is weighted when scoring freelancers for this project.</p>

                {showWeights && (
                  <div className="mt-4 space-y-3">
                    {(Object.keys(weights) as (keyof Weights)[]).map(key => (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-medium text-gray-600">{METRIC_LABELS[key]}</label>
                          <div className="flex items-center gap-1.5">
                            <input type="number" min="0" max="100" value={weights[key]}
                              onChange={e => setWeights(w => ({ ...w, [key]: Math.max(0, Math.min(100, Number(e.target.value))) }))}
                              className="w-14 px-2 py-1 text-xs border border-gray-200 rounded-lg text-center outline-none focus:ring-2 focus:ring-indigo-400" />
                            <span className="text-xs text-gray-400">%</span>
                          </div>
                        </div>
                        <input type="range" min="0" max="100" value={weights[key]}
                          onChange={e => setWeights(w => ({ ...w, [key]: Number(e.target.value) }))}
                          className="w-full h-1.5 rounded-full accent-indigo-600" />
                      </div>
                    ))}

                    <div className={`text-xs px-3 py-2 rounded-lg ${Math.abs(totalWeight - 100) <= 1 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                      {Math.abs(totalWeight - 100) <= 1 ? "✓ Weights sum to 100%" : `⚠ Weights sum to ${totalWeight}% — must equal 100%`}
                    </div>

                    <button onClick={saveWeights} disabled={savingWeights || Math.abs(totalWeight - 100) > 1}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50">
                      {savingWeights ? <><Loader size={12} className="animate-spin" /> Rescoring bids...</> : <><Save size={12} /> Save & Rescore</>}
                    </button>
                  </div>
                )}
              </div>

              {loadingBids && <div className="flex items-center gap-2 text-gray-400 text-sm p-4"><div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /> Loading bids...</div>}

              {!loadingBids && bids.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-gray-100 text-gray-400">
                  <User size={32} className="mb-2 opacity-20" />
                  <p className="text-sm font-medium">No bids yet</p>
                </div>
              )}

              {!loadingBids && bids.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-700">{bids.length} bid{bids.length !== 1 ? "s" : ""}</p>
                    <span className="text-xs text-gray-400">Sorted by score ↓</span>
                  </div>

                  {bids.map((bid, index) => (
                    <div key={bid.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${index === 0 && !projectAlreadyAwarded ? "border-emerald-200" : "border-gray-100"}`}>
                      {index === 0 && !projectAlreadyAwarded && (
                        <div className="bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-1.5">
                          <Trophy size={12} /> Top Recommended
                        </div>
                      )}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                              {bid.freelancerName?.charAt(0).toUpperCase() ?? "?"}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{bid.freelancerName}</p>
                              <p className="text-xs text-gray-400">Submitted {bid.submittedAt}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="text-xs text-gray-400">Bid Amount</p>
                              <p className="font-bold text-gray-900">${bid.bidAmount?.toLocaleString()}</p>
                            </div>
                            <div className={`px-3 py-2 rounded-xl border text-center min-w-[60px] ${scoreBg(bid.score)}`}>
                              <p className={`text-xl font-black ${scoreColor(bid.score)}`}>{bid.score}</p>
                              <p className="text-[9px] text-gray-400">/ 100</p>
                            </div>
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mt-3 line-clamp-2">{bid.proposal}</p>

                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusStyle(bid.status)}`}>{bid.status}</span>
                            <button onClick={() => setExpandedBid(expandedBid === bid.id ? null : bid.id)}
                              className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                              Score breakdown {expandedBid === bid.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          </div>
                          {!projectAlreadyAwarded && bid.status === "Pending" && (
                            <button onClick={() => handleAccept(bid)} disabled={accepting === bid.id}
                              className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60">
                              {accepting === bid.id ? <><Loader size={12} className="animate-spin" /> Accepting...</> : <><CheckCircle size={13} /> Accept Bid</>}
                            </button>
                          )}
                        </div>
                      </div>

                      {expandedBid === bid.id && bid.scoreBreakdown && (
                        <div className="border-t border-gray-50 bg-gray-50/40 px-5 py-4">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <TrendingUp size={12} /> Score Breakdown
                          </p>
                          <div className="space-y-2.5">
                            {(Object.entries(bid.scoreBreakdown) as [keyof ScoreBreakdown, number][]).map(([key, value]) => {
                              const maxPts = weights[key];
                              const pct    = maxPts > 0 ? Math.min(100, (value / maxPts) * 100) : 0;
                              return (
                                <div key={key}>
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-600">
                                      {METRIC_LABELS[key]}
                                      <span className="text-gray-400 ml-1">({weights[key]}% weight)</span>
                                    </span>
                                    <span className="font-bold text-gray-800">{value.toFixed(1)} pts</span>
                                  </div>
                                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${barColor(bid.score)}`} style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-3">Scored by Java BidScoringEngine using project-specific weights.</p>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

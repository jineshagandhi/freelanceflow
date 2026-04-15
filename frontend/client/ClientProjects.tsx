import React, { useState, useEffect } from "react";
import { useApp } from "../AppContext";
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp, AlertCircle,
  FolderOpen, PlusCircle, MapPin, CreditCard, FileText, ThumbsUp, ThumbsDown
} from "lucide-react";
import { useNavigate } from "react-router";

interface Milestone {
  id:             string;
  title:          string;
  completed:      boolean;
  pendingApproval: boolean;
  approved:       boolean;
  dueDate:        string;
}

interface ClientProject {
  id:                  string;
  title:               string;
  status:              string;
  budget:              number;
  location:            string;
  paymentType:         string;
  endDate:             string;
  description:         string;
  progressPercent:     number;
  totalMilestones:     number;
  completedMilestones: number;
  milestones:          Milestone[];
  srsDocument:         string;
}

const statusColors: Record<string, string> = {
  Open:          "bg-sky-50 text-sky-700",
  "In Progress": "bg-indigo-50 text-indigo-700",
  Active:        "bg-indigo-50 text-indigo-700",
  Completed:     "bg-emerald-50 text-emerald-700",
};

export function ClientProjects() {
  const { user }   = useApp();
  const navigate   = useNavigate();
  const isTeamLeader = user?.orgRole === "team_leader";

  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toasting, setToasting] = useState<string | null>(null);

  const load = () => {
    if (!user?.id) return;
    setLoading(true);
    fetch(`/api/client/projects?clientId=${user.id}`)
      .then(r => { if (!r.ok) throw new Error(r.status.toString()); return r.json(); })
      .then(d  => { setProjects(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { load(); }, [user?.id]);

  const toast = (msg: string) => { setToasting(msg); setTimeout(() => setToasting(null), 2500); };

  const approveMilestone = async (project: ClientProject, milestone: Milestone, approved: boolean) => {
    try {
      const res = await fetch("/api/client/milestone/approve", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, milestoneId: milestone.id, approved }),
      });
      if (!res.ok) throw new Error();
      toast(approved ? "Milestone approved ✓" : "Milestone rejected");
      load();
    } catch { toast("Failed to update milestone"); }
  };

  return (
    <div className="p-6">
      {toasting && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">
          {toasting}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">My Projects</h1>
        <button onClick={() => navigate("/client/create-project")}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-emerald-700 transition-colors">
          <PlusCircle size={15} /> New Project
        </button>
      </div>

      {!isTeamLeader && (
        <div className="mb-4 text-xs text-gray-400 bg-gray-50 rounded-xl px-4 py-2 border border-gray-100">
          👤 You are viewing as <strong>Project Manager</strong>. Milestone approval requires a Team Leader.
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 text-gray-400 text-sm">
          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          Loading projects...
        </div>
      )}

      {!loading && error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm max-w-lg">
          <AlertCircle size={18} className="mt-0.5 shrink-0" /><p>{error}</p>
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No projects yet</p>
          <button onClick={() => navigate("/client/create-project")}
            className="mt-4 inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-emerald-700 transition-colors">
            <PlusCircle size={15} /> Post a Project
          </button>
        </div>
      )}

      {!loading && !error && projects.length > 0 && (
        <div className="space-y-4">
          {projects.map(project => (
            <div key={project.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">

              {/* Header */}
              <div className="p-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => setExpanded(expanded === project.id ? null : project.id)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[project.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {project.status}
                      </span>
                      {project.location && (
                        <span className="flex items-center gap-1 text-[10px] text-gray-400">
                          <MapPin size={9} /> {project.location}
                        </span>
                      )}
                      {project.paymentType && (
                        <span className="flex items-center gap-1 text-[10px] text-gray-400">
                          <CreditCard size={9} /> {project.paymentType}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 ml-auto">Due {project.endDate || "—"}</span>
                    </div>

                    <h3 className="font-bold text-gray-900">{project.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Budget: ${project.budget?.toLocaleString()}</p>

                    {/* Progress bar */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${project.progressPercent}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {project.completedMilestones}/{project.totalMilestones} · {project.progressPercent}%
                      </span>
                    </div>

                    {/* Milestone pills */}
                    {project.milestones?.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {project.milestones.map((m, i) => (
                          <div key={m.id} title={m.title}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                              m.completed && m.approved ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : m.pendingApproval       ? "bg-amber-50 text-amber-700 border-amber-200"
                              :                           "bg-gray-50 text-gray-500 border-gray-200"
                            }`}>
                            {m.completed && m.approved ? "✓" : m.pendingApproval ? "⏳" : `${i+1}`}
                            <span className="max-w-[80px] truncate">{m.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {expanded === project.id ? <ChevronUp size={18} className="text-gray-400 mt-1 shrink-0" /> : <ChevronDown size={18} className="text-gray-400 mt-1 shrink-0" />}
                </div>
              </div>

              {/* Expanded */}
              {expanded === project.id && (
                <div className="border-t border-gray-50 bg-gray-50/30 p-5 space-y-4">

                  {/* Milestones with approval */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Upcoming Milestones
                      {isTeamLeader && <span className="ml-2 text-[10px] text-emerald-600 font-medium">(Team Leader — can approve)</span>}
                    </h4>
                    {(!project.milestones || project.milestones.length === 0)
                      ? <p className="text-xs text-gray-400">No milestones defined.</p>
                      : (
                        <div className="space-y-2">
                          {project.milestones.map(m => (
                            <div key={m.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2 border border-gray-100">
                              {m.completed && m.approved
                                ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                : <Circle size={16} className="text-gray-300 shrink-0" />
                              }
                              <span className={`flex-1 text-sm ${m.completed && m.approved ? "line-through text-gray-400" : "text-gray-700"}`}>
                                {m.title}
                              </span>
                              <span className="text-xs text-gray-400">{m.dueDate}</span>

                              {/* Pending approval — only team leader can act */}
                              {m.pendingApproval && !m.approved && isTeamLeader && (
                                <div className="flex gap-1.5 ml-2">
                                  <button onClick={() => approveMilestone(project, m, true)}
                                    className="flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white text-[10px] rounded-lg hover:bg-emerald-700 transition-colors">
                                    <ThumbsUp size={10} /> Approve
                                  </button>
                                  <button onClick={() => approveMilestone(project, m, false)}
                                    className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-[10px] rounded-lg hover:bg-red-600 transition-colors">
                                    <ThumbsDown size={10} /> Reject
                                  </button>
                                </div>
                              )}
                              {m.pendingApproval && !m.approved && !isTeamLeader && (
                                <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Awaiting Team Leader</span>
                              )}
                              {m.completed && m.approved && (
                                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Approved</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    }
                  </div>

                  {/* SRS Document */}
                  {project.srsDocument && (
                    <div className="border-t border-gray-100 pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">SRS Document</h4>
                      <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 text-sm">
                        <FileText size={15} className="text-indigo-500 shrink-0" />
                        <span className="flex-1 truncate text-gray-700">{project.srsDocument}</span>
                        <span className="text-[10px] text-indigo-500 font-medium">Submitted by freelancer</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../AppContext";
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp, AlertCircle,
  FolderOpen, MapPin, CreditCard, Upload, FileText, Receipt, Loader
} from "lucide-react";

interface Milestone {
  id:             string;
  title:          string;
  completed:      boolean;
  pendingApproval: boolean;
  approved:       boolean;
  amount:         number;
  dueDate:        string;
}

interface Project {
  id:              string;
  title:           string;
  status:          string;
  progressPercent: number;
  location:        string;
  paymentType:     string;
  budget:          number;
  endDate:         string;
  milestones:      Milestone[];
  srsDocument:     string;
  canGenerateInvoice: boolean;
}

const statusColor = (s: string) => {
  const l = s.toLowerCase();
  if (l === "completed")              return "text-emerald-600 bg-emerald-50";
  if (l === "active" || l.includes("progress")) return "text-indigo-600 bg-indigo-50";
  if (l === "overdue")                return "text-red-600 bg-red-50";
  return "text-amber-600 bg-amber-50";
};

export function FreelancerProjects() {
  const { user } = useApp();
  const [projects,  setProjects]  = useState<Project[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [toasting,  setToasting]  = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileRefs   = useRef<Record<string, HTMLInputElement | null>>({});

  const load = () => {
    if (!user?.id) return;
    setLoading(true);
    fetch(`/api/freelancer/projects?id=${user.id}`)
      .then(r => { if (!r.ok) throw new Error(r.status.toString()); return r.json(); })
      .then(d  => { setProjects(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { load(); }, [user?.id]);

  const toast = (msg: string) => {
    setToasting(msg);
    setTimeout(() => setToasting(null), 2500);
  };

  const toggleMilestone = async (project: Project, milestone: Milestone) => {
    const newCompleted = !milestone.pendingApproval && !milestone.completed;
    try {
      const res = await fetch("/api/freelancer/milestone/complete", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, milestoneId: milestone.id, completed: newCompleted }),
      });
      if (!res.ok) throw new Error();
      toast(newCompleted ? "Milestone sent for client approval" : "Milestone unmarked");
      load();
    } catch { toast("Failed to update milestone"); }
  };

  const handleSrsUpload = async (project: Project, file: File) => {
    setUploading(project.id);
    const fd = new FormData();
    fd.append("projectId", project.id);
    fd.append("file", file);
    try {
      const res = await fetch("/api/freelancer/project/upload-srs", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      toast("SRS document uploaded successfully");
      load();
    } catch { toast("Upload failed"); }
    finally   { setUploading(null); }
  };

  const generateInvoice = async (project: Project, milestoneId?: string) => {
    try {
      const res = await fetch("/api/freelancer/invoice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, freelancerId: user?.id, milestoneId: milestoneId ?? null }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error ?? "Failed to generate invoice"); return; }
      toast(`Invoice generated for $${data.amount?.toLocaleString()}`);
    } catch { toast("Failed to generate invoice"); }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">My Projects</h1>

      {toasting && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50 animate-pulse">
          {toasting}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 text-gray-400 text-sm">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
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
        </div>
      )}

      {!loading && !error && projects.length > 0 && (
        <div className="space-y-4">
          {projects.map(project => {
            const approvedCount = project.milestones?.filter(m => m.completed && m.approved).length ?? 0;
            const total         = project.milestones?.length ?? 0;
            const isMilestone   = project.paymentType?.toLowerCase().includes("milestone");

            return (
              <div key={project.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">

                {/* Header */}
                <div className="p-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => setExpanded(expanded === project.id ? null : project.id)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColor(project.status)}`}>
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
                      </div>
                      <h3 className="font-bold text-gray-900">{project.title}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Budget: ${project.budget?.toLocaleString()} · Due {project.endDate || "—"}
                      </p>

                      {/* Progress bar */}
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${project.progressPercent}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {approvedCount}/{total} milestones · {project.progressPercent}%
                        </span>
                      </div>

                      {/* Milestone pills along bottom */}
                      {project.milestones?.length > 0 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {project.milestones.map((m, i) => (
                            <div key={m.id} title={m.title}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                m.completed && m.approved ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : m.pendingApproval      ? "bg-amber-50 text-amber-700 border-amber-200"
                                :                          "bg-gray-50 text-gray-500 border-gray-200"
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
                  <div className="border-t border-gray-50 bg-gray-50/30 p-5 space-y-5">

                    {/* Milestones */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Milestones</h4>
                      {(!project.milestones || project.milestones.length === 0)
                        ? <p className="text-xs text-gray-400">No milestones defined.</p>
                        : (
                          <div className="space-y-2">
                            {project.milestones.map(m => (
                              <div key={m.id} className="flex items-center gap-3">
                                <button onClick={() => toggleMilestone(project, m)}
                                  disabled={m.approved}
                                  className="shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
                                  {m.completed && m.approved
                                    ? <CheckCircle2 size={18} className="text-emerald-500" />
                                    : m.pendingApproval
                                    ? <div className="w-[18px] h-[18px] rounded-full border-2 border-amber-400 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-amber-400" /></div>
                                    : <Circle size={18} className="text-gray-300 hover:text-indigo-400 transition-colors" />
                                  }
                                </button>
                                <span className={`flex-1 text-sm ${m.completed && m.approved ? "line-through text-gray-400" : "text-gray-700"}`}>
                                  {m.title}
                                </span>
                                {m.pendingApproval && !m.approved && (
                                  <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">Pending approval</span>
                                )}
                                {m.completed && m.approved && (
                                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">Approved</span>
                                )}
                                <span className="text-xs font-mono text-gray-500 ml-auto">${m.amount?.toLocaleString()}</span>

                                {/* Generate invoice for this milestone */}
                                {isMilestone && m.completed && m.approved && (
                                  <button onClick={() => generateInvoice(project, m.id)}
                                    className="flex items-center gap-1 text-[10px] px-2 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors ml-1">
                                    <Receipt size={10} /> Invoice
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      }
                    </div>

                    {/* SRS Upload */}
                    <div className="border-t border-gray-100 pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">SRS Document</h4>
                      {project.srsDocument
                        ? (
                          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">
                            <FileText size={15} />
                            <span className="flex-1 truncate">{project.srsDocument}</span>
                            <span className="text-[10px] text-emerald-500 font-medium">Uploaded</span>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 mb-2">No SRS uploaded yet.</p>
                        )
                      }
                      <input type="file" accept=".pdf,.doc,.docx" className="hidden"
                        ref={el => { fileRefs.current[project.id] = el; }}
                        onChange={e => { if (e.target.files?.[0]) handleSrsUpload(project, e.target.files[0]); }} />
                      <button onClick={() => fileRefs.current[project.id]?.click()}
                        disabled={uploading === project.id}
                        className="flex items-center gap-2 mt-2 px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                        {uploading === project.id
                          ? <><Loader size={13} className="animate-spin" /> Uploading...</>
                          : <><Upload size={13} /> {project.srsDocument ? "Replace SRS" : "Upload SRS"}</>
                        }
                      </button>
                    </div>

                    {/* Fixed-price invoice generation */}
                    {!isMilestone && (
                      <div className="border-t border-gray-100 pt-4">
                        {project.canGenerateInvoice
                          ? (
                            <button onClick={() => generateInvoice(project)}
                              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
                              <Receipt size={15} /> Generate Final Invoice
                            </button>
                          ) : (
                            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl p-3 text-xs">
                              <AlertCircle size={14} className="mt-0.5 shrink-0" />
                              All milestones must be approved by the client before generating the final invoice.
                            </div>
                          )
                        }
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

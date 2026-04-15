import React, { useState, useEffect } from "react";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, AlertCircle, FolderOpen } from "lucide-react";
import { useApp } from "../AppContext";

interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  amount: number;
}

interface Project {
  id: string;
  title: string;
  status: string;
  progressPercent: number;
  milestones: Milestone[];
}

const statusColor = (status: string) => {
  const s = status.toLowerCase();
  if (s === "completed") return "text-emerald-500";
  if (s === "active" || s === "in progress") return "text-indigo-500";
  if (s === "overdue") return "text-red-500";
  return "text-amber-500";
};

export function FreelancerProjects() {
  const { user } = useApp();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    fetch(`/api/freelancer/projects?id=${user.id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setProjects(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err: Error) => {
        console.error("Projects fetch failed:", err.message);
        setError(err.message);
        setLoading(false);
      });
  }, [user?.id]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">My Projects</h1>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 text-gray-400 text-sm">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          Loading projects...
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm max-w-lg">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Failed to load projects</p>
            <p className="text-red-400 mt-0.5 text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && projects.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No projects yet</p>
          <p className="text-sm mt-1">Projects assigned to you will appear here.</p>
        </div>
      )}

      {/* Project List */}
      {!loading && !error && projects.length > 0 && (
        <div className="space-y-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Project Header Row */}
              <div
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() =>
                  setExpanded(expanded === project.id ? null : project.id)
                }
              >
                <div className="flex-1">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${statusColor(
                      project.status
                    )}`}
                  >
                    {project.status}
                  </span>
                  <h3 className="font-bold text-gray-900">{project.title}</h3>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${project.progressPercent}%` }}
                      />
                    </div>
                    <span>{project.progressPercent}% Complete</span>
                  </div>
                </div>
                {expanded === project.id ? (
                  <ChevronUp size={18} className="text-gray-400" />
                ) : (
                  <ChevronDown size={18} className="text-gray-400" />
                )}
              </div>

              {/* Milestones Drawer */}
              {expanded === project.id && (
                <div className="p-5 border-t border-gray-50 bg-gray-50/30">
                  <h4 className="text-sm font-semibold mb-3 text-gray-700">Milestones</h4>

                  {/* Guard: milestones might be empty */}
                  {(!project.milestones || project.milestones.length === 0) ? (
                    <p className="text-xs text-gray-400">No milestones defined for this project.</p>
                  ) : (
                    <div className="space-y-2">
                      {project.milestones.map((m) => (
                        <div key={m.id} className="flex items-center gap-3 text-sm">
                          {m.completed ? (
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                          ) : (
                            <Circle size={16} className="text-gray-300 shrink-0" />
                          )}
                          <span
                            className={
                              m.completed ? "text-gray-400 line-through" : "text-gray-700"
                            }
                          >
                            {m.title}
                          </span>
                          <span className="ml-auto font-mono text-xs text-gray-500">
                            ${m.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
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

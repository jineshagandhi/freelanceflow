import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Briefcase,
  FileText,
  Clock,
  CheckCircle2,
  ArrowRight,
  PlusCircle,
  AlertCircle,
} from "lucide-react";
import { useApp } from "../AppContext";

// ── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  projectCount: number;
  activeCount: number;
  pendingAmount: number;
  totalSpent: number;
}

interface ClientProject {
  id: string;
  title: string;
  status: string;
  budget: number;
  progressPercent: number;
  completedMilestones: number;
  totalMilestones: number;
  endDate: string;
}

interface ClientInvoice {
  id: string;
  description: string;
  amount: number;
  status: string;
  dueDate: string;
}

interface ClientDashboardData {
  stats: DashboardStats;
  projects: ClientProject[];
  invoices: ClientInvoice[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  Open:          "bg-sky-50 text-sky-700",
  "In-Progress": "bg-indigo-50 text-indigo-700",
  "In Progress": "bg-indigo-50 text-indigo-700",
  Active:        "bg-indigo-50 text-indigo-700",
  Completed:     "bg-emerald-50 text-emerald-700",
};

const invoiceStatusColor = (status: string) => {
  if (status === "Paid")    return "bg-emerald-500";
  if (status === "Overdue") return "bg-red-500";
  return "bg-amber-500";
};

const invoiceTextColor = (status: string) => {
  if (status === "Paid")    return "text-emerald-600";
  if (status === "Overdue") return "text-red-600";
  return "text-amber-600";
};

const EMPTY_DATA: ClientDashboardData = {
  stats:    { projectCount: 0, activeCount: 0, pendingAmount: 0, totalSpent: 0 },
  projects: [],
  invoices: [],
};

// ── Component ─────────────────────────────────────────────────────────────────

export function ClientDashboard() {
  const { user } = useApp();
  const navigate = useNavigate();

  const [data, setData] = useState<ClientDashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    fetch(`/api/client/dashboard-summary?clientId=${user.id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then((json: ClientDashboardData) => {
        setData({
          stats:    json.stats    ?? EMPTY_DATA.stats,
          projects: Array.isArray(json.projects) ? json.projects : [],
          invoices: Array.isArray(json.invoices) ? json.invoices : [],
        });
        setLoading(false);
      })
      .catch((err: Error) => {
        console.error("Client dashboard fetch failed:", err.message);
        setError(err.message);
        setLoading(false);
      });
  }, [user?.id]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="p-6 flex items-center gap-3 text-gray-400">
        <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        Loading dashboard...
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm max-w-lg">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Failed to load dashboard</p>
            <p className="text-red-400 mt-0.5 text-xs">{error}</p>
            <p className="text-red-400 mt-1 text-xs">Check your Eclipse console for backend errors.</p>
          </div>
        </div>
      </div>
    );
  }

  const hasOverdue = data.invoices.some((i) => i.status === "Overdue");

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Welcome, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Overview processed by Java Analytics Engine.
          </p>
        </div>
        <button
          onClick={() => navigate("/client/create-project")}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-emerald-700 transition-colors"
        >
          <PlusCircle size={15} /> New Project
        </button>
      </div>

      {/* Session notice */}
      <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
        <AlertCircle size={15} className="text-emerald-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-emerald-700">
          <span className="font-semibold">Java-Secured Session:</span> Your AuthController
          has filtered this data from the database. Only projects for Client ID{" "}
          <span className="font-mono">{user?.id}</span> are visible.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "My Projects",   value: data.stats.projectCount,                              icon: Briefcase,   color: "bg-indigo-50 text-indigo-600" },
          { label: "Active",        value: data.stats.activeCount,                               icon: Clock,       color: "bg-amber-50 text-amber-600"   },
          { label: "Amount Due",    value: `$${data.stats.pendingAmount.toLocaleString()}`,      icon: FileText,    color: "bg-rose-50 text-rose-600"     },
          { label: "Total Spent",   value: `$${data.stats.totalSpent.toLocaleString()}`,         icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon size={17} />
            </div>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Recent Projects */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Projects</h3>
            <button
              onClick={() => navigate("/client/projects")}
              className="text-xs text-emerald-600 hover:text-emerald-800 transition-colors flex items-center gap-0.5"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>

          {data.projects.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No projects yet.</p>
          ) : (
            <div className="space-y-4">
              {data.projects.slice(0, 3).map((project) => (
                <div
                  key={project.id}
                  className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium inline-block mb-1 ${
                          statusColors[project.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {project.status}
                      </span>
                      <h4 className="text-sm font-semibold text-gray-900">{project.title}</h4>
                    </div>
                    <p className="text-sm font-bold text-gray-900 flex-shrink-0">
                      ${project.budget.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${project.progressPercent}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{project.progressPercent}%</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {project.completedMilestones}/{project.totalMilestones} milestones complete · Due {project.endDate}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Invoices</h3>
            <button
              onClick={() => navigate("/client/invoices")}
              className="text-xs text-emerald-600 hover:text-emerald-800 transition-colors flex items-center gap-0.5"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>

          {data.invoices.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No invoices yet.</p>
          ) : (
            <div className="space-y-3">
              {data.invoices.slice(0, 5).map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${invoiceStatusColor(inv.status)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{inv.description}</p>
                    <p className="text-xs text-gray-400">Due {inv.dueDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">${inv.amount.toLocaleString()}</p>
                    <span className={`text-xs font-medium ${invoiceTextColor(inv.status)}`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasOverdue && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
              <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700">
                Overdue payments detected. Please settle these to maintain your reliability score.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

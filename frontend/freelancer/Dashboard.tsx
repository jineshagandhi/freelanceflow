import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  TrendingUp,
  DollarSign,
  Briefcase,
  Clock,
  ArrowUpRight,
  AlertCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useApp } from "../AppContext";

// ── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalEarnings: number;
  activeCount: number;
  pendingCount: number;
  avgReliability: number;
}

interface EarningsPoint {
  month: string;
  earnings: number;
}

interface RiskAlert {
  id: string;
  name: string;
  riskLevel: "High" | "Medium" | "Low";
  reliabilityScore: number;
  activeProjectCount: number;
}

interface DashboardData {
  stats: DashboardStats;
  earningsHistory: EarningsPoint[];
  riskAlerts: RiskAlert[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const getRiskColor = (level: string) => {
  if (level === "Low") return "text-emerald-600 bg-emerald-50";
  if (level === "Medium") return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
};

// Safe fallback so the page never crashes even if the API returns nothing
const EMPTY_DATA: DashboardData = {
  stats: { totalEarnings: 0, activeCount: 0, pendingCount: 0, avgReliability: 0 },
  earningsHistory: [],
  riskAlerts: [],
};

// ── Component ─────────────────────────────────────────────────────────────────

export function FreelancerDashboard() {
  const { user } = useApp();
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Guard: don't fetch if user isn't set yet
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    fetch(`/api/freelancer/dashboard?id=${user.id}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Server error: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then((json: DashboardData) => {
        // Merge with EMPTY_DATA so partial responses never crash the UI
        setData({
          stats: json.stats ?? EMPTY_DATA.stats,
          earningsHistory: json.earningsHistory ?? [],
          riskAlerts: json.riskAlerts ?? [],
        });
        setLoading(false);
      })
      .catch((err: Error) => {
        console.error("Dashboard fetch failed:", err.message);
        setError(err.message);
        setLoading(false);
      });
  }, [user?.id]); // Re-fetch only if user id changes

  // ── Loading state ──
  if (loading) {
    return (
      <div className="p-6 flex items-center gap-3 text-gray-400">
        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        Processing Analytics...
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Failed to load dashboard</p>
            <p className="text-red-500 mt-0.5">{error}</p>
            <p className="text-red-400 mt-1 text-xs">
              Check your Eclipse console for backend errors.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Stat card definitions ──
  const statCards = [
    {
      label: "Total Earnings",
      value: `$${data.stats.totalEarnings.toLocaleString()}`,
      icon: DollarSign,
      trend: "+12%",
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Active Projects",
      value: data.stats.activeCount,
      icon: Briefcase,
      trend: "Stable",
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Pending Invoices",
      value: data.stats.pendingCount,
      icon: Clock,
      trend: "-2",
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Reliability Score",
      value: `${data.stats.avgReliability}%`,
      icon: TrendingUp,
      trend: "+5%",
      color: "text-sky-600 bg-sky-50",
    },
  ];

  // ── Render ──
  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Freelancer Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Welcome back, {user?.name} · Real-time insights from Java Backend
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-xl ${stat.color}`}>
                <stat.icon size={18} />
              </div>
              <span className="text-xs font-medium text-emerald-600 flex items-center gap-0.5">
                {stat.trend} <ArrowUpRight size={10} />
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* Earnings Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-6">Earnings Analytics</h3>

          {data.earningsHistory.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">
              No earnings data yet — completed projects will appear here.
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.earningsHistory}>
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Earnings"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="earnings"
                    stroke="#6366f1"
                    fillOpacity={1}
                    fill="url(#colorEarnings)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Risk Alerts */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">Priority Risk Alerts</h3>

          {data.riskAlerts.length === 0 ? (
            <div className="text-sm text-gray-400 text-center mt-8">
              🎉 No risk alerts — all clients look good!
            </div>
          ) : (
            <div className="space-y-4">
              {data.riskAlerts.map((client) => (
                <div
                  key={client.id}
                  className="p-3 rounded-xl border border-gray-50 bg-gray-50/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getRiskColor(
                        client.riskLevel
                      )}`}
                    >
                      {client.riskLevel} Risk
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Score: {client.reliabilityScore}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{client.name}</p>
                  <p className="text-[11px] text-gray-500">
                    {client.activeProjectCount} active project(s)
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

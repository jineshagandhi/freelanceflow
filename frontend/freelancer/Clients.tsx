import React, { useState, useEffect } from "react";
import { Shield, Search, MapPin, AlertCircle, Users } from "lucide-react";

interface Client {
  id: string;
  name: string;
  location: string;
  reliabilityScore: number;
  riskLevel: "Low" | "Medium" | "High";
  totalProjects: number;
}

const riskStyle = (risk: string) => {
  if (risk === "Low")    return "text-emerald-500";
  if (risk === "Medium") return "text-amber-500";
  return "text-red-500";
};

const scoreBarColor = (score: number) => {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
};

export function FreelancerClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/freelancer/my-clients?search=${encodeURIComponent(search)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setClients(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err: Error) => {
        console.error("Clients fetch failed:", err.message);
        setError(err.message);
        setLoading(false);
      });
  }, [search]);

  return (
    <div className="p-6">
      {/* Header + Search */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold text-gray-900">Partner Clients</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Filter clients..."
            className="pl-9 pr-4 py-2 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 text-gray-400 text-sm">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          Loading clients...
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm max-w-lg">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Failed to load clients</p>
            <p className="text-red-400 mt-0.5 text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && clients.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No clients found</p>
          <p className="text-sm mt-1">
            {search ? "Try a different search term." : "Clients you work with will appear here."}
          </p>
        </div>
      )}

      {/* Client Cards */}
      {!loading && !error && clients.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <div
              key={client.id}
              className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Client Avatar + Info */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{client.name}</h3>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <MapPin size={10} /> {client.location}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Reliability Score Bar */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Shield size={10} /> Reliability Score
                    </span>
                    <span className="font-bold text-indigo-600">{client.reliabilityScore}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${scoreBarColor(client.reliabilityScore)}`}
                      style={{ width: `${client.reliabilityScore}%` }}
                    />
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex gap-4">
                  <div className="flex-1 p-3 bg-gray-50 rounded-xl text-center">
                    <p className="text-xs text-gray-400">Projects</p>
                    <p className="text-sm font-bold text-gray-900">{client.totalProjects}</p>
                  </div>
                  <div className="flex-1 p-3 bg-gray-50 rounded-xl text-center">
                    <p className="text-xs text-gray-400">Risk Level</p>
                    <p className={`text-sm font-bold ${riskStyle(client.riskLevel)}`}>
                      {client.riskLevel}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

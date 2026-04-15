import React, { useState, useEffect } from "react";
import { Download, AlertCircle, FileText } from "lucide-react";
import { useApp } from "../AppContext";

interface Invoice {
  id: string;
  description: string;
  amount: number;
  status: string;
  dueDate: string;
}

interface InvoiceData {
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  list: Invoice[];
}

// Safe fallback so the page never crashes before data loads
const EMPTY_DATA: InvoiceData = {
  totalPaid: 0,
  totalPending: 0,
  totalOverdue: 0,
  list: [],
};

const statusStyle = (status: string) => {
  if (status === "Paid") return "bg-emerald-50 text-emerald-600";
  if (status === "Overdue") return "bg-red-50 text-red-600";
  return "bg-amber-50 text-amber-600";
};

export function FreelancerInvoices() {
  const { user } = useApp();
  const [financeData, setFinanceData] = useState<InvoiceData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    fetch(`/api/freelancer/invoices?id=${user.id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then((data: InvoiceData) => {
        // Merge with EMPTY_DATA so partial/missing fields never crash the UI
        setFinanceData({
          totalPaid:    data.totalPaid    ?? 0,
          totalPending: data.totalPending ?? 0,
          totalOverdue: data.totalOverdue ?? 0,
          list:         Array.isArray(data.list) ? data.list : [],
        });
        setLoading(false);
      })
      .catch((err: Error) => {
        console.error("Invoices fetch failed:", err.message);
        setError(err.message);
        setLoading(false);
      });
  }, [user?.id]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Invoices</h1>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 text-gray-400 text-sm mb-6">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          Loading invoices...
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm max-w-lg mb-6">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Failed to load invoices</p>
            <p className="text-red-400 mt-0.5 text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* Summary Cards — always show (will show $0 while loading or on error) */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400">Total Paid</p>
          <p className="text-xl font-bold text-emerald-600">
            ${financeData.totalPaid.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400">Total Pending</p>
          <p className="text-xl font-bold text-amber-600">
            ${financeData.totalPending.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400">Overdue</p>
          <p className="text-xl font-bold text-red-600">
            ${financeData.totalOverdue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Empty state */}
      {!loading && !error && financeData.list.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No invoices yet</p>
          <p className="text-sm mt-1">Your invoices will appear here once created.</p>
        </div>
      )}

      {/* Invoice Table */}
      {!loading && financeData.list.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-4">Invoice</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {financeData.list.map((inv) => (
                <tr key={inv.id} className="text-sm hover:bg-gray-50/40 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900">#{inv.id.slice(-6).toUpperCase()}</p>
                    <p className="text-xs text-gray-400">{inv.description}</p>
                  </td>
                  <td className="px-6 py-4 font-bold">${inv.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-500 text-xs">{inv.dueDate}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] font-bold ${statusStyle(
                        inv.status
                      )}`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Download">
                      <Download size={16} className="text-gray-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

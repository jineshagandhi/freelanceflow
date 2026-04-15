import React, { useState, useEffect } from "react";
import { useApp } from "../AppContext";
import { AlertCircle, FileText, ThumbsUp, ThumbsDown, CreditCard, Loader } from "lucide-react";

interface Invoice {
  id:            string;
  projectName:   string;
  description:   string;
  freelancerName: string;
  amount:        number;
  status:        string;
  paymentStatus: string;
  dateIssued:    string;
  dueDate:       string;
  paymentType:   string;
}

interface InvoiceData {
  totalPaid:    number;
  totalPending: number;
  totalOverdue: number;
  list:         Invoice[];
}

const EMPTY: InvoiceData = { totalPaid: 0, totalPending: 0, totalOverdue: 0, list: [] };

const statusStyle = (s: string) => {
  if (s === "Paid")     return "bg-emerald-50 text-emerald-700";
  if (s === "Approved") return "bg-indigo-50 text-indigo-700";
  if (s === "Rejected") return "bg-red-50 text-red-600";
  if (s === "Overdue")  return "bg-red-50 text-red-600";
  return "bg-amber-50 text-amber-700";
};

export function ClientPaymentHistory() {
  const { user } = useApp();
  const isTeamLeader     = user?.orgRole === "team_leader";
  const isProjectManager = user?.orgRole === "project_manager";

  const [data,     setData]     = useState<InvoiceData>(EMPTY);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [acting,   setActing]   = useState<string | null>(null);
  const [toasting, setToasting] = useState<string | null>(null);

  const toast = (msg: string) => { setToasting(msg); setTimeout(() => setToasting(null), 2500); };

  const load = () => {
    if (!user?.id) return;
    setLoading(true);
    fetch(`/api/client/invoices?clientId=${user.id}`)
      .then(r => { if (!r.ok) throw new Error(r.status.toString()); return r.json(); })
      .then(d => {
        setData({
          totalPaid:    d.totalPaid    ?? 0,
          totalPending: d.totalPending ?? 0,
          totalOverdue: d.totalOverdue ?? 0,
          list:         Array.isArray(d.list) ? d.list : [],
        });
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { load(); }, [user?.id]);

  const handleApprove = async (invoiceId: string, approved: boolean) => {
    setActing(invoiceId);
    try {
      const res = await fetch("/api/client/invoice/approve", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, approved }),
      });
      if (!res.ok) throw new Error();
      toast(approved ? "Invoice approved — awaiting payment" : "Invoice rejected");
      load();
    } catch { toast("Failed to update invoice"); }
    finally { setActing(null); }
  };

  const handlePay = async (invoiceId: string) => {
    setActing(invoiceId);
    try {
      const res = await fetch("/api/client/invoice/pay", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const data = await res.json();
      if (!res.ok) { toast(typeof data === "string" ? data : "Payment failed"); return; }
      toast("Payment processed ✓");
      load();
    } catch { toast("Payment failed"); }
    finally { setActing(null); }
  };

  return (
    <div className="p-6">
      {toasting && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">
          {toasting}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Payment History</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          {isTeamLeader ? "👑 Team Leader — you can approve or reject invoices"
           : isProjectManager ? "💳 Project Manager — you can process approved payments"
           : "View your payment history"}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400">Total Paid</p>
          <p className="text-xl font-bold text-emerald-600">${data.totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400">Pending</p>
          <p className="text-xl font-bold text-amber-600">${data.totalPending.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400">Overdue</p>
          <p className="text-xl font-bold text-red-600">${data.totalOverdue.toLocaleString()}</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-gray-400 text-sm mb-6">
          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          Loading payment history...
        </div>
      )}

      {!loading && error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm max-w-lg mb-6">
          <AlertCircle size={18} className="mt-0.5 shrink-0" /><p>{error}</p>
        </div>
      )}

      {!loading && !error && data.list.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No invoices yet</p>
        </div>
      )}

      {!loading && data.list.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-4">Invoice / Project</th>
                <th className="px-5 py-4">From</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">Date Issued</th>
                <th className="px-5 py-4">Due Date</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.list.map(inv => (
                <tr key={inv.id} className="text-sm hover:bg-gray-50/40 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-bold text-gray-900">#{inv.id.slice(-6).toUpperCase()}</p>
                    <p className="text-xs text-gray-400">{inv.projectName || inv.description}</p>
                  </td>
                  <td className="px-5 py-4 text-gray-600 text-xs">{inv.freelancerName || "—"}</td>
                  <td className="px-5 py-4 font-bold">${inv.amount?.toLocaleString()}</td>
                  <td className="px-5 py-4 text-gray-500 text-xs">{inv.dateIssued || "—"}</td>
                  <td className="px-5 py-4 text-gray-500 text-xs">{inv.dueDate || "—"}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${statusStyle(inv.status)}`}>
                      {inv.paymentStatus || inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1.5 justify-end">

                      {/* Team Leader: approve/reject pending invoices */}
                      {isTeamLeader && inv.status === "Pending" && (
                        <>
                          <button onClick={() => handleApprove(inv.id, true)} disabled={acting === inv.id}
                            className="flex items-center gap-1 px-2 py-1.5 bg-emerald-600 text-white text-[10px] rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
                            {acting === inv.id ? <Loader size={10} className="animate-spin" /> : <ThumbsUp size={10} />} Approve
                          </button>
                          <button onClick={() => handleApprove(inv.id, false)} disabled={acting === inv.id}
                            className="flex items-center gap-1 px-2 py-1.5 bg-red-500 text-white text-[10px] rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50">
                            <ThumbsDown size={10} /> Reject
                          </button>
                        </>
                      )}

                      {/* Project Manager: pay approved invoices */}
                      {isProjectManager && inv.status === "Approved" && (
                        <button onClick={() => handlePay(inv.id)} disabled={acting === inv.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-[10px] rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 font-semibold">
                          {acting === inv.id
                            ? <><Loader size={10} className="animate-spin" /> Processing...</>
                            : <><CreditCard size={10} /> Pay Now</>
                          }
                        </button>
                      )}

                      {/* Team Leader sees "Awaiting Payment" note for approved ones */}
                      {isTeamLeader && inv.status === "Approved" && (
                        <span className="text-[10px] text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg">Awaiting PM</span>
                      )}
                    </div>
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

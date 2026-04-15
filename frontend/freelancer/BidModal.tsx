import React, { useState } from "react";
import { X, AlertCircle, CheckCircle, Loader, Star } from "lucide-react";

interface Project {
  id: string; title: string; budget: number; clientName: string;
}

interface Props {
  project:       Project;
  freelancerId:  string;
  freelancerName: string;
  onClose:       () => void;
  onSuccess:     () => void;
}

export function BidModal({ project, freelancerId, freelancerName, onClose, onSuccess }: Props) {
  const [bidAmount,      setBidAmount]      = useState("");
  const [proposal,       setProposal]       = useState("");
  const [proposalQuality, setProposalQuality] = useState(3);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");
  const [success,        setSuccess]        = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bidAmount || isNaN(Number(bidAmount)) || Number(bidAmount) <= 0) {
      setError("Please enter a valid bid amount."); return;
    }
    if (!proposal.trim()) { setError("Please write a proposal."); return; }

    setLoading(true); setError("");
    try {
      const res = await fetch("/api/bids/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId:      project.id,
          freelancerId,
          freelancerName,
          bidAmount:      Number(bidAmount),
          proposal,
          proposalQuality,
        }),
      });
      const data = await res.json();
      if (res.ok) { setSuccess(true); setTimeout(onSuccess, 1500); }
      else setError(data.error ?? "Failed to submit bid.");
    } catch { setError("Could not reach the server."); }
    finally   { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">Place a Bid</h2>
            <p className="text-xs text-gray-400 mt-0.5">{project.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center">
              <CheckCircle size={28} className="text-emerald-500" />
            </div>
            <p className="font-bold text-gray-900">Bid Submitted!</p>
            <p className="text-sm text-gray-400">The client will review your proposal.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Project budget reference */}
            <div className="bg-indigo-50 rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs text-indigo-600 font-medium">Client's Budget</span>
              <span className="font-bold text-indigo-700">${project.budget?.toLocaleString()}</span>
            </div>

            {/* Bid amount */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Your Bid (USD) <span className="text-red-400">*</span>
              </label>
              <input type="number" min="1" value={bidAmount}
                onChange={e => setBidAmount(e.target.value)}
                placeholder="e.g. 4200"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            {/* Proposal */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Proposal <span className="text-red-400">*</span>
              </label>
              <textarea value={proposal} onChange={e => setProposal(e.target.value)}
                rows={4} placeholder="Describe your relevant experience, approach, and why you're the best fit for this project..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>

            {/* Proposal quality self-rating */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Proposal Quality (self-rated)
              </label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setProposalQuality(n)}
                    className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                      proposalQuality >= n
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-400 border-gray-200 hover:border-indigo-300"
                    }`}>
                    <Star size={11} fill={proposalQuality >= n ? "white" : "none"} />
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">This affects your bid score. Be honest.</p>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 text-sm">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <><Loader size={14} className="animate-spin" /> Submitting...</> : "Submit Bid"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { useApp } from "../AppContext";

// ── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  title: string;
  summary: string; // Updated to match Marketplace.tsx
  budget: number;
  skills?: string; // Updated to match Marketplace.tsx (string instead of string[])
}

interface BidModalProps {
  project: Project;
  onClose: () => void;
  onBidSubmitted?: () => void; 
}

// ── Component ────────────────────────────────────────────────────────────────

export function BidModal({ project, onClose, onBidSubmitted }: BidModalProps) {
  const { user } = useApp();
  const [bidAmount, setBidAmount] = useState<string>(
    project.budget ? String(project.budget) : ""
  );
  const [proposal, setProposal] = useState("");
  const [proposalQuality, setProposalQuality] = useState<number>(3);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const budgetDiff = project.budget && bidAmount
    ? parseFloat(bidAmount) - project.budget
    : null;

  async function handleSubmit() {
    setError(null);

    if (!bidAmount || isNaN(parseFloat(bidAmount)) || parseFloat(bidAmount) <= 0) {
      setError("Please enter a valid bid amount.");
      return;
    }
    if (proposal.trim().length < 20) {
      setError("Your proposal must be at least 20 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bids/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          freelancerId: user?.id,
          freelancerName: user?.name ?? "Unknown",
          bidAmount: parseFloat(bidAmount),
          proposal: proposal.trim(),
          proposalQuality,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        if (onBidSubmitted) onBidSubmitted();
      } else {
        setError(data.error ?? "Failed to submit bid. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 16,
          padding: "28px 32px",
          width: "100%",
          maxWidth: 520,
          boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          color: "#e2e8f0",
        }}
      >
        {success ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700 }}>Bid Submitted!</h2>
            <p style={{ color: "#64748b", margin: "0 0 24px", fontSize: 14 }}>
              Your bid on <strong style={{ color: "#60a5fa" }}>{project.title}</strong> has been submitted.
            </p>
            <button
              onClick={onClose}
              style={{
                background: "linear-gradient(135deg, #1d4ed8, #7c3aed)",
                border: "none",
                borderRadius: 10,
                padding: "12px 28px",
                color: "#fff",
                fontWeight: 600,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Place a Bid</h2>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
                  {project.title}
                </p>
              </div>
              <button
                onClick={onClose}
                style={{ background: "transparent", border: "none", color: "#64748b", fontSize: 20, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "#64748b" }}>Client's budget</span>
              <span style={{ color: "#60a5fa", fontWeight: 600 }}>
                ${project.budget?.toLocaleString() ?? "Not specified"}
              </span>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#94a3b8" }}>
                Your Bid Amount ($)
              </label>
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px", color: "#e2e8f0", outline: "none" }}
              />
              {budgetDiff !== null && !isNaN(budgetDiff) && (
                <div style={{ marginTop: 6, fontSize: 12, color: budgetDiff > 0 ? "#f87171" : budgetDiff < 0 ? "#86efac" : "#94a3b8" }}>
                  {budgetDiff === 0 ? "✓ Matches budget" : budgetDiff > 0 ? `⚠ $${budgetDiff} over` : `✓ $${Math.abs(budgetDiff)} under`}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#94a3b8" }}>
                Your Proposal
              </label>
              <textarea
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                rows={4}
                style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px", color: "#e2e8f0", resize: "none", outline: "none" }}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                width: "100%",
                background: submitting ? "#334155" : "linear-gradient(135deg, #1d4ed8, #7c3aed)",
                border: "none",
                borderRadius: 10,
                padding: "13px",
                color: "#fff",
                fontWeight: 700,
                cursor: submitting ? "default" : "pointer",
              }}
            >
              {submitting ? "Submitting…" : "Submit Bid"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
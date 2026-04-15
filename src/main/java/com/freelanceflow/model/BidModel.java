package com.freelanceflow.model;

import java.util.Map;

/**
 * Data model representing a bid submitted by a freelancer on a project.
 * Matches the structure stored in the MongoDB 'bids' collection.
 */
public class BidModel {

    private String id;
    private String projectId;
    private String freelancerId;
    private String freelancerName;
    private double bidAmount;
    private String proposal;
    private int    proposalQuality;   // 1–5 self-rated by freelancer
    private String submittedAt;       // ISO date string e.g. "2026-03-29"
    private String status;            // "Pending", "Accepted", "Rejected"
    private double score;             // Calculated by BidScoringEngine (0–100)
    private Map<String, Double> scoreBreakdown; // Per-metric weighted scores

    // ── Getters and Setters ──────────────────────────────────────────────────

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }

    public String getFreelancerId() { return freelancerId; }
    public void setFreelancerId(String freelancerId) { this.freelancerId = freelancerId; }

    public String getFreelancerName() { return freelancerName; }
    public void setFreelancerName(String freelancerName) { this.freelancerName = freelancerName; }

    public double getBidAmount() { return bidAmount; }
    public void setBidAmount(double bidAmount) { this.bidAmount = bidAmount; }

    public String getProposal() { return proposal; }
    public void setProposal(String proposal) { this.proposal = proposal; }

    public int getProposalQuality() { return proposalQuality; }
    public void setProposalQuality(int proposalQuality) { this.proposalQuality = proposalQuality; }

    public String getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(String submittedAt) { this.submittedAt = submittedAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public double getScore() { return score; }
    public void setScore(double score) { this.score = score; }

    public Map<String, Double> getScoreBreakdown() { return scoreBreakdown; }
    public void setScoreBreakdown(Map<String, Double> scoreBreakdown) { this.scoreBreakdown = scoreBreakdown; }
}

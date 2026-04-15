package com.freelanceflow.scoring;

import com.freelanceflow.model.BidModel;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import org.bson.Document;
import org.bson.types.ObjectId;

import java.util.*;

/**
 * Scoring engine with configurable per-project weights.
 * Default weights: Reliability 30%, BudgetFit 25%, Experience 20%,
 *                  CompletionRate 15%, ProposalQuality 10%
 *
 * Client can override weights per project via the ProjectBidding UI.
 * Weights are stored in MongoDB on the project document under "scoringWeights".
 */
public class BidScoringEngine {

    private static final String DB_NAME = "freelanceflow";
    private static final MongoClient mongoClient = MongoClients.create(
        System.getenv().getOrDefault("MONGODB_URI", "mongodb://localhost:27017"));

    // Default weights (used when project has no custom weights)
    private static final double DEFAULT_RELIABILITY  = 0.30;
    private static final double DEFAULT_BUDGET_FIT   = 0.25;
    private static final double DEFAULT_EXPERIENCE   = 0.20;
    private static final double DEFAULT_COMPLETION   = 0.15;
    private static final double DEFAULT_PROPOSAL     = 0.10;

    public double calculateScore(BidModel bid, String projectId) {
        Map<String, Double> breakdown = getScoreBreakdown(bid, projectId);
        double total = 0;
        for (double v : breakdown.values()) total += v;
        return Math.round(total * 10.0) / 10.0;
    }

    public Map<String, Double> getScoreBreakdown(BidModel bid, String projectId) {
        Document project = getProjectById(projectId);
        double[] w = resolveWeights(project);

        double raw1 = calculateReliabilityScore(bid.getFreelancerId());
        double raw2 = calculateBudgetFitScore(bid.getBidAmount(), project);
        double raw3 = calculateExperienceScore(bid.getFreelancerId(), project);
        double raw4 = calculateCompletionRateScore(bid.getFreelancerId());
        double raw5 = calculateProposalQualityScore(bid.getProposalQuality());

        Map<String, Double> breakdown = new LinkedHashMap<>();
        breakdown.put("reliability",     round(raw1 * w[0] * 100));
        breakdown.put("budgetFit",       round(raw2 * w[1] * 100));
        breakdown.put("experienceMatch", round(raw3 * w[2] * 100));
        breakdown.put("completionRate",  round(raw4 * w[3] * 100));
        breakdown.put("proposalQuality", round(raw5 * w[4] * 100));
        return breakdown;
    }

    /**
     * Reads per-project custom weights from MongoDB.
     * Falls back to defaults if not set or if they don't sum to ~1.0.
     */
    private double[] resolveWeights(Document project) {
        if (project == null) return new double[]{DEFAULT_RELIABILITY, DEFAULT_BUDGET_FIT, DEFAULT_EXPERIENCE, DEFAULT_COMPLETION, DEFAULT_PROPOSAL};

        Document w = (Document) project.get("scoringWeights");
        if (w == null) return new double[]{DEFAULT_RELIABILITY, DEFAULT_BUDGET_FIT, DEFAULT_EXPERIENCE, DEFAULT_COMPLETION, DEFAULT_PROPOSAL};

        double r  = w.get("reliability")     != null ? num(w, "reliability")     : DEFAULT_RELIABILITY;
        double bf = w.get("budgetFit")        != null ? num(w, "budgetFit")        : DEFAULT_BUDGET_FIT;
        double ex = w.get("experienceMatch")  != null ? num(w, "experienceMatch")  : DEFAULT_EXPERIENCE;
        double cr = w.get("completionRate")   != null ? num(w, "completionRate")   : DEFAULT_COMPLETION;
        double pq = w.get("proposalQuality")  != null ? num(w, "proposalQuality")  : DEFAULT_PROPOSAL;

        double sum = r + bf + ex + cr + pq;
        if (sum <= 0) return new double[]{DEFAULT_RELIABILITY, DEFAULT_BUDGET_FIT, DEFAULT_EXPERIENCE, DEFAULT_COMPLETION, DEFAULT_PROPOSAL};

        // Normalise so weights always sum to 1.0
        return new double[]{r/sum, bf/sum, ex/sum, cr/sum, pq/sum};
    }

    private double calculateReliabilityScore(String freelancerId) {
        try {
            MongoCollection<Document> invoices = mongoClient.getDatabase(DB_NAME).getCollection("invoices");
            long total   = invoices.countDocuments(Filters.eq("freelancerId", freelancerId));
            long overdue = invoices.countDocuments(Filters.and(Filters.eq("freelancerId", freelancerId), Filters.eq("status", "Overdue")));
            if (total == 0) return 0.7;
            return Math.max(0.0, 1.0 - ((double) overdue / total));
        } catch (Exception e) { return 0.5; }
    }

    private double calculateBudgetFitScore(double bidAmount, Document project) {
        if (project == null) return 0.5;
        Object bo = project.get("budget");
        if (bo == null) return 0.5;
        double budget;
        try { budget = Double.parseDouble(bo.toString()); } catch (NumberFormatException e) { return 0.5; }
        if (budget <= 0) return 0.5;
        double ratio = bidAmount / budget;
        if (ratio <= 1.0) return 0.6 + (ratio * 0.4);
        return Math.max(0.0, 1.0 - ((ratio - 1.0) * 1.5));
    }

    private double calculateExperienceScore(String freelancerId, Document targetProject) {
        try {
            if (targetProject == null) return 0.5;
            List<String> targetSkills = targetProject.getList("skills", String.class);
            if (targetSkills == null || targetSkills.isEmpty()) return 0.5;
            MongoCollection<Document> projects = mongoClient.getDatabase(DB_NAME).getCollection("projects");
            List<Document> completed = new ArrayList<>();
            projects.find(Filters.and(Filters.eq("freelancerId", freelancerId), Filters.eq("status", "Completed"))).into(completed);
            if (completed.isEmpty()) return 0.2;
            long matching = completed.stream().filter(p -> {
                List<String> ps = p.getList("skills", String.class);
                if (ps == null) return false;
                return ps.stream().anyMatch(s -> targetSkills.stream().anyMatch(ts -> ts.equalsIgnoreCase(s)));
            }).count();
            return Math.min(1.0, matching / 5.0);
        } catch (Exception e) { return 0.3; }
    }

    private double calculateCompletionRateScore(String freelancerId) {
        try {
            MongoCollection<Document> projects = mongoClient.getDatabase(DB_NAME).getCollection("projects");
            long total     = projects.countDocuments(Filters.eq("freelancerId", freelancerId));
            if (total == 0) return 0.5;
            long completed = projects.countDocuments(Filters.and(Filters.eq("freelancerId", freelancerId), Filters.eq("status", "Completed")));
            return (double) completed / total;
        } catch (Exception e) { return 0.5; }
    }

    private double calculateProposalQualityScore(int rating) {
        if (rating < 1) return 0.0;
        if (rating > 5) return 1.0;
        return (rating - 1) / 4.0;
    }

    private Document getProjectById(String projectId) {
        try {
            return mongoClient.getDatabase(DB_NAME).getCollection("projects")
                .find(Filters.eq("_id", new ObjectId(projectId))).first();
        } catch (Exception e) { return null; }
    }

    private double round(double v) { return Math.round(v * 10.0) / 10.0; }

    // Safely read any numeric BSON field (Int32/Int64/Double/String) as a double.
    private static double num(Document doc, String key) {
        Object v = doc.get(key);
        if (v == null) return 0.0;
        if (v instanceof Number) return ((Number) v).doubleValue();
        try { return Double.parseDouble(v.toString()); } catch (Exception e) { return 0.0; }
    }
}
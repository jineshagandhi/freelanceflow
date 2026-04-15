package com.freelanceflow.controller;

import com.freelanceflow.dao.BidDAO;
import com.freelanceflow.model.BidModel;
import com.freelanceflow.scoring.BidScoringEngine;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Updates;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/bids")
@CrossOrigin(origins = "*")
public class BidController {

    private static final MongoClient mongoClient = MongoClients.create(
        System.getenv().getOrDefault("MONGODB_URI", "mongodb://localhost:27017"));
    private static final String DB_NAME = "freelanceflow";

    private final BidDAO bidDAO = new BidDAO();
    private final BidScoringEngine scoringEngine = new BidScoringEngine();

    @PostMapping("/submit")
    public ResponseEntity<?> submitBid(@RequestBody Map<String, Object> body) {
        try {
            String projectId      = (String) body.get("projectId");
            String freelancerId   = (String) body.get("freelancerId");
            String freelancerName = (String) body.get("freelancerName");
            double bidAmount      = Double.parseDouble(body.get("bidAmount").toString());
            String proposal       = (String) body.get("proposal");
            int proposalQuality   = Integer.parseInt(body.get("proposalQuality").toString());

            if (projectId == null || freelancerId == null || proposal == null)
                return ResponseEntity.badRequest().body(Map.of("error", "Missing required fields"));
            if (proposalQuality < 1 || proposalQuality > 5)
                return ResponseEntity.badRequest().body(Map.of("error", "Proposal quality must be 1–5"));
            if (bidDAO.hasFreelancerBid(projectId, freelancerId))
                return ResponseEntity.badRequest().body(Map.of("error", "You have already bid on this project"));

            BidModel bid = new BidModel();
            bid.setProjectId(projectId); bid.setFreelancerId(freelancerId);
            bid.setFreelancerName(freelancerName); bid.setBidAmount(bidAmount);
            bid.setProposal(proposal); bid.setProposalQuality(proposalQuality);
            bid.setSubmittedAt(LocalDate.now().toString()); bid.setStatus("Pending");

            double score = scoringEngine.calculateScore(bid, projectId);
            bid.setScore(score);
            bid.setScoreBreakdown(scoringEngine.getScoreBreakdown(bid, projectId));
            bidDAO.saveBid(bid);

            return ResponseEntity.ok(Map.of("message", "Bid submitted successfully", "score", score));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to submit bid"));
        }
    }

    @GetMapping("/project")
    public ResponseEntity<?> getBidsForProject(@RequestParam String projectId) {
        try {
            List<Document> bids = bidDAO.getBidsForProject(projectId);
            bids.sort((a, b) -> Double.compare(num(b, "score"), num(a, "score")));
            return ResponseEntity.ok(bids);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to fetch bids"));
        }
    }

    // Safely read any numeric BSON field (Int32/Int64/Double/String) as a double.
    private static double num(Document doc, String key) {
        Object v = doc.get(key);
        if (v == null) return 0.0;
        if (v instanceof Number) return ((Number) v).doubleValue();
        try { return Double.parseDouble(v.toString()); } catch (Exception e) { return 0.0; }
    }

    @GetMapping("/count")
    public ResponseEntity<?> getBidCount(@RequestParam String projectId) {
        try {
            return ResponseEntity.ok(Map.of("count", bidDAO.getBidCount(projectId)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to count bids"));
        }
    }

    @PostMapping("/accept")
    public ResponseEntity<?> acceptBid(@RequestBody Map<String, Object> body) {
        try {
            String bidId        = (String) body.get("bidId");
            String projectId    = (String) body.get("projectId");
            String freelancerId = (String) body.get("freelancerId");

            if (bidId == null || projectId == null || freelancerId == null)
                return ResponseEntity.badRequest().body(Map.of("error", "Missing fields"));

            bidDAO.acceptBid(bidId, projectId);

            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            db.getCollection("projects").updateOne(
                Filters.eq("_id", new ObjectId(projectId)),
                Updates.combine(Updates.set("freelancerId", freelancerId), Updates.set("status", "In Progress"))
            );

            return ResponseEntity.ok(Map.of("message", "Bid accepted. Project is now In Progress."));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to accept bid"));
        }
    }

    /**
     * PUT /api/bids/weights
     * Client saves custom scoring weights for a specific project.
     * Body: { projectId, weights: { reliability, budgetFit, experienceMatch, completionRate, proposalQuality } }
     */
    @PutMapping("/weights")
    public ResponseEntity<?> saveWeights(@RequestBody Map<String, Object> body) {
        try {
            String projectId = (String) body.get("projectId");
            Object weightsObj = body.get("weights");
            if (projectId == null || weightsObj == null)
                return ResponseEntity.badRequest().body(Map.of("error", "projectId and weights required"));

            @SuppressWarnings("unchecked")
            Map<String, Object> weightsMap = (Map<String, Object>) weightsObj;

            Document weightsDoc = new Document();
            for (Map.Entry<String, Object> entry : weightsMap.entrySet()) {
                weightsDoc.put(entry.getKey(), Double.parseDouble(entry.getValue().toString()));
            }

            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            db.getCollection("projects").updateOne(
                Filters.eq("_id", new ObjectId(projectId)),
                Updates.set("scoringWeights", weightsDoc)
            );

            // Rescore all existing bids for this project with new weights
            List<Document> bids = bidDAO.getBidsForProject(projectId);
            for (Document bidDoc : bids) {
                BidModel bid = new BidModel();
                bid.setProjectId(projectId);
                bid.setFreelancerId(bidDoc.getString("freelancerId"));
                bid.setBidAmount(num(bidDoc, "bidAmount"));
                bid.setProposalQuality(bidDoc.getInteger("proposalQuality") != null ? bidDoc.getInteger("proposalQuality") : 3);
                bid.setProposal(bidDoc.getString("proposal") != null ? bidDoc.getString("proposal") : "");

                double newScore = scoringEngine.calculateScore(bid, projectId);
                Map<String, Double> newBreakdown = scoringEngine.getScoreBreakdown(bid, projectId);

                Document breakdown = new Document(newBreakdown);
                db.getCollection("bids").updateOne(
                    Filters.eq("_id", bidDoc.getObjectId("_id")),
                    Updates.combine(Updates.set("score", newScore), Updates.set("scoreBreakdown", breakdown))
                );
            }

            return ResponseEntity.ok(Map.of("message", "Weights saved and bids rescored"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to save weights"));
        }
    }

    /**
     * GET /api/bids/weights?projectId={}
     * Returns current scoring weights for a project.
     */
    @GetMapping("/weights")
    public ResponseEntity<?> getWeights(@RequestParam String projectId) {
        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            Document project = db.getCollection("projects")
                .find(Filters.eq("_id", new ObjectId(projectId))).first();

            if (project == null) return ResponseEntity.notFound().build();

            Document w = (Document) project.get("scoringWeights");
            if (w == null) {
                // Return defaults
                return ResponseEntity.ok(Map.of(
                    "reliability",     0.30,
                    "budgetFit",       0.25,
                    "experienceMatch", 0.20,
                    "completionRate",  0.15,
                    "proposalQuality", 0.10
                ));
            }
            return ResponseEntity.ok(w);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to get weights"));
        }
    }
}
package com.freelanceflow.dao;

import com.freelanceflow.model.BidModel;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Updates;
import org.bson.Document;
import org.bson.types.ObjectId;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Data Access Object for the MongoDB 'bids' collection.
 * Handles all database operations related to project bids.
 */
public class BidDAO {

    private static final MongoClient mongoClient = MongoClients.create(
        System.getenv().getOrDefault("MONGODB_URI", "mongodb://localhost:27017"));
    private static final String DB_NAME    = "freelanceflow";
    private static final String COLLECTION = "bids";

    /**
     * Saves a new bid document to the 'bids' collection.
     * Converts BidModel into a MongoDB Document.
     */
    public void saveBid(BidModel bid) {
        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> col = db.getCollection(COLLECTION);

            Document doc = new Document();
            doc.put("projectId",       bid.getProjectId());
            doc.put("freelancerId",    bid.getFreelancerId());
            doc.put("freelancerName",  bid.getFreelancerName());
            doc.put("bidAmount",       bid.getBidAmount());
            doc.put("proposal",        bid.getProposal());
            doc.put("proposalQuality", bid.getProposalQuality());
            doc.put("submittedAt",     bid.getSubmittedAt());
            doc.put("status",          bid.getStatus());
            doc.put("score",           bid.getScore());

            // Store score breakdown as a nested document
            if (bid.getScoreBreakdown() != null) {
                Document breakdown = new Document();
                for (Map.Entry<String, Double> entry : bid.getScoreBreakdown().entrySet()) {
                    breakdown.put(entry.getKey(), entry.getValue());
                }
                doc.put("scoreBreakdown", breakdown);
            }

            col.insertOne(doc);
            System.out.println("LOG: Bid saved for freelancer " + bid.getFreelancerId()
                + " on project " + bid.getProjectId());

        } catch (Exception e) {
            System.err.println("BidDAO.saveBid error: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Returns all bids for a given project as raw MongoDB Documents.
     * Each document includes all bid fields including scoreBreakdown.
     */
    public List<Document> getBidsForProject(String projectId) {
        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> col = db.getCollection(COLLECTION);

            List<Document> bids = new ArrayList<>();
            col.find(Filters.eq("projectId", projectId)).into(bids);

            // Convert ObjectId _id to string so frontend can use it
            for (Document doc : bids) {
                if (doc.getObjectId("_id") != null) {
                    doc.put("id", doc.getObjectId("_id").toString());
                }
            }

            return bids;

        } catch (Exception e) {
            System.err.println("BidDAO.getBidsForProject error: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * Returns the number of bids on a project.
     * Used for the bid count badge on project cards.
     */
    public long getBidCount(String projectId) {
        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> col = db.getCollection(COLLECTION);
            return col.countDocuments(Filters.eq("projectId", projectId));
        } catch (Exception e) {
            System.err.println("BidDAO.getBidCount error: " + e.getMessage());
            return 0;
        }
    }

    /**
     * Checks if a freelancer has already submitted a bid on a project.
     * Prevents duplicate bids.
     */
    public boolean hasFreelancerBid(String projectId, String freelancerId) {
        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> col = db.getCollection(COLLECTION);

            return col.countDocuments(Filters.and(
                Filters.eq("projectId",    projectId),
                Filters.eq("freelancerId", freelancerId)
            )) > 0;

        } catch (Exception e) {
            System.err.println("BidDAO.hasFreelancerBid error: " + e.getMessage());
            return false;
        }
    }

    /**
     * Accepts a specific bid and rejects all other bids on the same project.
     * Called when a client clicks "Accept Bid".
     */
    public void acceptBid(String bidId, String projectId) {
        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> col = db.getCollection(COLLECTION);

            // Mark the chosen bid as Accepted
            col.updateOne(
                Filters.eq("_id", new ObjectId(bidId)),
                Updates.set("status", "Accepted")
            );

            // Mark all other bids on this project as Rejected
            col.updateMany(
                Filters.and(
                    Filters.eq("projectId", projectId),
                    Filters.ne("_id", new ObjectId(bidId))
                ),
                Updates.set("status", "Rejected")
            );

            System.out.println("LOG: Bid " + bidId + " accepted. Others on project "
                + projectId + " rejected.");

        } catch (Exception e) {
            System.err.println("BidDAO.acceptBid error: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Returns all bids submitted by a specific freelancer.
     * Used to show a freelancer their own bid history.
     */
    public List<Document> getBidsByFreelancer(String freelancerId) {
        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> col = db.getCollection(COLLECTION);

            List<Document> bids = new ArrayList<>();
            col.find(Filters.eq("freelancerId", freelancerId)).into(bids);

            for (Document doc : bids) {
                if (doc.getObjectId("_id") != null) {
                    doc.put("id", doc.getObjectId("_id").toString());
                }
            }

            return bids;

        } catch (Exception e) {
            System.err.println("BidDAO.getBidsByFreelancer error: " + e.getMessage());
            return new ArrayList<>();
        }
    }
}
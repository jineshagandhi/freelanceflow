package com.freelanceflow.dao;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Updates;
import org.bson.Document;
import org.bson.types.ObjectId;

/**
 * Data Access Object for the 'projects' MongoDB collection.
 * Used by BidController to assign a freelancer once a bid is accepted.
 */
public class ProjectDAO {

    private static final MongoClient mongoClient = MongoClients.create(
        System.getenv().getOrDefault("MONGODB_URI", "mongodb://localhost:27017"));
    private static final String DB_NAME    = "freelanceflow";
    private static final String COLLECTION = "projects";

    /**
     * Assigns a freelancer to a project and sets its status to "In Progress".
     * Called when a client accepts a bid.
     */
    public void assignFreelancerToProject(String projectId, String freelancerId) {
        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> col = db.getCollection(COLLECTION);

            col.updateOne(
                Filters.eq("_id", new ObjectId(projectId)),
                Updates.combine(
                    Updates.set("freelancerId", freelancerId),
                    Updates.set("status", "In Progress")
                )
            );

            System.out.println("LOG: Project " + projectId + " assigned to freelancer " + freelancerId);

        } catch (Exception e) {
            System.err.println("ProjectDAO.assignFreelancerToProject error: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Fetches a single project document by its MongoDB ObjectId string.
     * Used by BidScoringEngine to read budget and skills for scoring.
     */
    public Document getProjectById(String projectId) {
        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> col = db.getCollection(COLLECTION);

            return col.find(Filters.eq("_id", new ObjectId(projectId))).first();

        } catch (Exception e) {
            System.err.println("ProjectDAO.getProjectById error: " + e.getMessage());
            return null;
        }
    }
}
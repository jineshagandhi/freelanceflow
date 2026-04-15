package com.freelanceflow.controller;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import org.bson.Document;

import java.util.ArrayList;
import java.util.List;

/**
 * Handles invoice data retrieval from MongoDB.
 * Previously used MySQL (JDBC) — now correctly uses the same
 * MongoDB 'freelanceflow' database as the rest of the application.
 *
 * MongoDB collection expected: "invoices"
 * Each document should have fields:
 *   freelancerId : String
 *   clientId     : String
 *   clientName   : String
 *   amount       : Double
 *   status       : String  ("Paid", "Pending", "Overdue")
 *   dueDate      : String  (e.g. "2025-06-30")
 *   paidDate     : Date    (only present when status is "Paid")
 */
public class InvoiceDAO {

    // Singleton client — shared across all InvoiceDAO instances
    private static final MongoClient mongoClient = MongoClients.create(
        System.getenv().getOrDefault("MONGODB_URI", "mongodb://localhost:27017"));
    private static final String DB_NAME = "freelanceflow";
    private static final String COLLECTION = "invoices";

    // ─────────────────────────────────────────────
    // Get total amount of all PAID invoices for a client
    // Replaces: myInvoices.filter(i => i.status === 'Paid').reduce(...)
    // ─────────────────────────────────────────────
    public double getTotalPaidByClient(String clientId) {
        return sumByClientAndStatus(clientId, "Paid");
    }

    // ─────────────────────────────────────────────
    // Get total amount of all PENDING + OVERDUE invoices for a client
    // Replaces: myInvoices.filter(i => i.status === 'Pending').reduce(...)
    // ─────────────────────────────────────────────
    public double getTotalPendingByClient(String clientId) {
        double pending = sumByClientAndStatus(clientId, "Pending");
        double overdue = sumByClientAndStatus(clientId, "Overdue");
        return pending + overdue;
    }

    // ─────────────────────────────────────────────
    // Get total amount of all PAID invoices for a freelancer
    // Used by the dashboard to calculate total earnings
    // ─────────────────────────────────────────────
    public double getTotalEarningsByFreelancer(String freelancerId) {
        return sumByFreelancerAndStatus(freelancerId, "Paid");
    }

    // ─────────────────────────────────────────────
    // Count pending/overdue invoices for a freelancer
    // Used by dashboard stats card
    // ─────────────────────────────────────────────
    public int countPendingByFreelancer(String freelancerId) {
        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> col = db.getCollection(COLLECTION);

            long count = col.countDocuments(
                Filters.and(
                    Filters.eq("freelancerId", freelancerId),
                    Filters.in("status", "Pending", "Overdue")
                )
            );
            return (int) count;

        } catch (Exception e) {
            System.err.println("InvoiceDAO.countPendingByFreelancer error: " + e.getMessage());
            e.printStackTrace();
            return 0;
        }
    }

    // ─────────────────────────────────────────────
    // Get all invoices for a given freelancer as raw Documents
    // Used by UserRestController /api/invoices endpoint
    // ─────────────────────────────────────────────
    public List<Document> getInvoicesByFreelancer(String freelancerId) {
        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> col = db.getCollection(COLLECTION);

            return col
                .find(Filters.eq("freelancerId", freelancerId))
                .into(new ArrayList<>());

        } catch (Exception e) {
            System.err.println("InvoiceDAO.getInvoicesByFreelancer error: " + e.getMessage());
            e.printStackTrace();
            return new ArrayList<>();
        }
    }

    // ─────────────────────────────────────────────
    // Get all invoices for a given client as raw Documents
    // ─────────────────────────────────────────────
    public List<Document> getInvoicesByClient(String clientId) {
        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> col = db.getCollection(COLLECTION);

            return col
                .find(Filters.eq("clientId", clientId))
                .into(new ArrayList<>());

        } catch (Exception e) {
            System.err.println("InvoiceDAO.getInvoicesByClient error: " + e.getMessage());
            e.printStackTrace();
            return new ArrayList<>();
        }
    }

    // ─────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────

    private double sumByClientAndStatus(String clientId, String status) {
        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> col = db.getCollection(COLLECTION);

            List<Document> docs = col
                .find(Filters.and(
                    Filters.eq("clientId", clientId),
                    Filters.eq("status", status)
                ))
                .into(new ArrayList<>());

            double total = 0;
            for (Document doc : docs) {
                if (doc.get("amount") != null) total += num(doc, "amount");
            }
            return total;

        } catch (Exception e) {
            System.err.println("InvoiceDAO.sumByClientAndStatus error: " + e.getMessage());
            e.printStackTrace();
            return 0.0;
        }
    }

    // Safely read any numeric BSON field (Int32/Int64/Double/String) as a double.
    private static double num(Document doc, String key) {
        Object v = doc.get(key);
        if (v == null) return 0.0;
        if (v instanceof Number) return ((Number) v).doubleValue();
        try { return Double.parseDouble(v.toString()); } catch (Exception e) { return 0.0; }
    }

    private double sumByFreelancerAndStatus(String freelancerId, String status) {
        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> col = db.getCollection(COLLECTION);

            List<Document> docs = col
                .find(Filters.and(
                    Filters.eq("freelancerId", freelancerId),
                    Filters.eq("status", status)
                ))
                .into(new ArrayList<>());

            double total = 0;
            for (Document doc : docs) {
                if (doc.get("amount") != null) total += num(doc, "amount");
            }
            return total;

        } catch (Exception e) {
            System.err.println("InvoiceDAO.sumByFreelancerAndStatus error: " + e.getMessage());
            e.printStackTrace();
            return 0.0;
        }
    }
}
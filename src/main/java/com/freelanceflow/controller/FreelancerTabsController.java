package com.freelanceflow.controller;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * REST Controller for all freelancer tab endpoints:
 *   GET /api/marketplace           — Marketplace tab
 *   GET /api/freelancer/projects   — My Projects tab
 *   GET /api/freelancer/invoices   — Invoices tab
 *   GET /api/freelancer/my-clients — Clients tab
 */
@RestController
@CrossOrigin(origins = "*")
public class FreelancerTabsController {

    private static final MongoClient mongoClient = MongoClients.create(
        System.getenv().getOrDefault("MONGODB_URI", "mongodb://localhost:27017"));
    private static final String DB_NAME = "freelanceflow";
    private final AnalyticsEngine analytics = new AnalyticsEngine();

    // ── MARKETPLACE ───────────────────────────────────────────────────────────
    @GetMapping("/api/marketplace")
    public ResponseEntity<?> getMarketplace(
            @RequestParam(required = false, defaultValue = "") String search) {

        System.out.println(">>> MARKETPLACE REQUEST | search: " + search);

        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> col = db.getCollection("projects");

            // Fetch all open projects — no status filter so newly posted ones always appear
            List<Document> docs = col.find().into(new ArrayList<>());

            System.out.println(">>> Total projects in DB: " + docs.size());

            List<Map<String, Object>> result = new ArrayList<>();

            for (Document doc : docs) {
                // Only show open/available projects in marketplace
                String status = safe(doc.getString("status"));
                if (!status.isEmpty()
                    && !status.equalsIgnoreCase("Open")
                    && !status.equalsIgnoreCase("Posted")
                    && !status.equalsIgnoreCase("Available")) {
                    continue;
                }

                String title   = safe(doc.getString("title"));
                String location = safe(doc.getString("location"));
                // summary field may be stored as "description" from the create form
                String summary = doc.getString("summary") != null && !doc.getString("summary").isEmpty()
                    ? doc.getString("summary")
                    : safe(doc.getString("description"));
                String skillsStr = "";
                List<String> skillsList = doc.getList("skills", String.class);
                if (skillsList != null) skillsStr = String.join(" ", skillsList);

                // Apply search filter
                if (!search.isEmpty()) {
                    String q = search.toLowerCase();
                    boolean matches = title.toLowerCase().contains(q)
                        || location.toLowerCase().contains(q)
                        || skillsStr.toLowerCase().contains(q)
                        || summary.toLowerCase().contains(q);
                    if (!matches) continue;
                }

                // ── Look up client info safely ──
                String clientId    = safe(doc.getString("clientId"));
                String clientName  = "Unknown Client";
                int    clientScore = 70;
                String clientRisk  = "Low";

                if (!clientId.isEmpty()) {
                    MongoCollection<Document> usersCol = db.getCollection("users");
                    Document clientDoc = null;

                    // Try ObjectId lookup first
                    try {
                        clientDoc = usersCol.find(Filters.eq("_id", new ObjectId(clientId))).first();
                    } catch (Exception ignored) {
                        // clientId is not a valid ObjectId (e.g. "c6") — try email or string match
                        try {
                            clientDoc = usersCol.find(Filters.eq("email", clientId)).first();
                        } catch (Exception ignored2) {}
                    }

                    if (clientDoc != null) {
                        String biz = clientDoc.getString("businessName");
                        clientName = (biz != null && !biz.isEmpty())
                            ? biz : safe(clientDoc.getString("name"));
                    }

                    // Calculate client reliability from invoices
                    try {
                        MongoCollection<Document> invCol = db.getCollection("invoices");
                        long total   = invCol.countDocuments(Filters.eq("clientId", clientId));
                        long overdue = invCol.countDocuments(Filters.and(
                            Filters.eq("clientId", clientId),
                            Filters.eq("status", "Overdue")
                        ));
                        if (total > 0) {
                            clientScore = (int) Math.max(0, 100 - (overdue * 100.0 / total));
                        }
                        clientRisk = clientScore >= 80 ? "Low" : clientScore >= 60 ? "Medium" : "High";
                    } catch (Exception ignored) {}
                }

                // ── Bid count ──
                long bidCount = 0;
                try {
                    bidCount = db.getCollection("bids").countDocuments(
                        Filters.eq("projectId", doc.getObjectId("_id").toString()));
                } catch (Exception ignored) {}

                // ── Posted date — handle both Date and String storage ──
                String postedDate = "";
                Object createdAtObj = doc.get("createdAt");
                if (createdAtObj instanceof Date) {
                    // Format Date as yyyy-MM-dd string
                    java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd");
                    postedDate = sdf.format((Date) createdAtObj);
                } else if (createdAtObj instanceof String) {
                    postedDate = (String) createdAtObj;
                }

                Map<String, Object> project = new HashMap<>();
                project.put("id",          doc.getObjectId("_id").toString());
                project.put("title",       title);
                project.put("summary",     summary);
                project.put("location",    location);
                project.put("budget",      num(doc, "budget"));
                project.put("skills",      skillsList != null ? skillsList : new ArrayList<>());
                project.put("clientRisk",  clientRisk);
                project.put("clientName",  clientName);
                project.put("clientScore", clientScore);
                project.put("paymentType", safe(doc.getString("paymentType")));
                project.put("postedDate",  postedDate);
                project.put("endDate",     safe(doc.getString("endDate")));
                project.put("bidCount",    bidCount);
                project.put("category",    safe(doc.getString("category")));

                result.add(project);
                System.out.println(">>> Added to marketplace: " + title);
            }

            System.out.println(">>> MARKETPLACE returning " + result.size() + " projects");
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            System.err.println(">>> MARKETPLACE ERROR: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.ok(new ArrayList<>());
        }
    }

    // ── FREELANCER PROJECTS ───────────────────────────────────────────────────
    @GetMapping("/api/freelancer/projects")
    public ResponseEntity<?> getFreelancerProjects(@RequestParam String id) {
        System.out.println(">>> FREELANCER PROJECTS for: " + id);
        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            List<Document> docs = db.getCollection("projects")
                .find(Filters.eq("freelancerId", id)).into(new ArrayList<>());

            List<Map<String, Object>> result = new ArrayList<>();

            for (Document doc : docs) {
                List<Document> msDocs = (List<Document>) doc.get("milestones");
                List<Map<String, Object>> milestones = new ArrayList<>();
                int total = 0, completed = 0;

                double budget   = num(doc, "budget");
                int    msCount  = msDocs != null ? msDocs.size() : 1;
                double msAmount = msCount > 0 ? budget / msCount : 0;

                if (msDocs != null) {
                    for (Document m : msDocs) {
                        total++;
                        boolean done     = Boolean.TRUE.equals(m.getBoolean("completed"));
                        boolean pending  = Boolean.TRUE.equals(m.getBoolean("pendingApproval"));
                        boolean approved = Boolean.TRUE.equals(m.getBoolean("approved"));
                        if (done && approved) completed++;

                        String mid;
                        try { mid = m.getObjectId("_id").toString(); }
                        catch (Exception e) { mid = m.getString("id") != null ? m.getString("id") : UUID.randomUUID().toString(); }

                        Map<String, Object> ms = new HashMap<>();
                        ms.put("id",              mid);
                        ms.put("title",           safe(m.getString("title")));
                        ms.put("completed",       done);
                        ms.put("pendingApproval", pending);
                        ms.put("approved",        approved);
                        ms.put("amount",          m.get("amount") != null ? num(m, "amount") : msAmount);
                        ms.put("dueDate",         safe(m.getString("dueDate")));
                        milestones.add(ms);
                    }
                }

                int     progressPercent = total > 0 ? (int) ((completed * 100.0) / total) : 0;
                String  paymentType     = safe(doc.getString("paymentType"));
                boolean isMilestone     = paymentType.toLowerCase().contains("milestone");
                boolean canGenInvoice   = !isMilestone && total > 0 && completed == total;

                Map<String, Object> project = new HashMap<>();
                project.put("id",                 doc.getObjectId("_id").toString());
                project.put("title",              safe(doc.getString("title")));
                project.put("status",             safe(doc.getString("status")));
                project.put("progressPercent",    progressPercent);
                project.put("location",           safe(doc.getString("location")));
                project.put("paymentType",        paymentType);
                project.put("budget",             budget);
                project.put("endDate",            safe(doc.getString("endDate")));
                project.put("milestones",         milestones);
                project.put("srsDocument",        safe(doc.getString("srsDocument")));
                project.put("canGenerateInvoice", canGenInvoice);
                result.add(project);
            }

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(new ArrayList<>());
        }
    }

    // ── FREELANCER INVOICES ───────────────────────────────────────────────────
    @GetMapping("/api/freelancer/invoices")
    public ResponseEntity<?> getFreelancerInvoices(@RequestParam String id) {
        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            List<Document> docs = db.getCollection("invoices")
                .find(Filters.eq("freelancerId", id)).into(new ArrayList<>());

            double totalPaid = 0, totalPending = 0, totalOverdue = 0;
            List<Map<String, Object>> list = new ArrayList<>();

            for (Document doc : docs) {
                String status = safe(doc.getString("status"));
                double amount = num(doc, "amount");
                if ("Paid".equalsIgnoreCase(status))         totalPaid    += amount;
                else if ("Pending".equalsIgnoreCase(status)) totalPending += amount;
                else if ("Overdue".equalsIgnoreCase(status)) totalOverdue += amount;

                Map<String, Object> inv = new HashMap<>();
                inv.put("id",          doc.getObjectId("_id").toString());
                inv.put("description", safe(doc.getString("description")));
                inv.put("amount",      amount);
                inv.put("status",      status);
                inv.put("dueDate",     safe(doc.getString("dueDate")));
                list.add(inv);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("totalPaid",    totalPaid);
            response.put("totalPending", totalPending);
            response.put("totalOverdue", totalOverdue);
            response.put("list",         list);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> empty = new HashMap<>();
            empty.put("totalPaid", 0); empty.put("totalPending", 0);
            empty.put("totalOverdue", 0); empty.put("list", new ArrayList<>());
            return ResponseEntity.ok(empty);
        }
    }

    // ── FREELANCER CLIENTS ────────────────────────────────────────────────────
    @GetMapping("/api/freelancer/my-clients")
    public ResponseEntity<?> getMyClients(
            @RequestParam(required = false, defaultValue = "") String search) {
        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            List<Document> docs = db.getCollection("clients").find().into(new ArrayList<>());
            List<Map<String, Object>> result = new ArrayList<>();

            for (Document doc : docs) {
                String name     = safe(doc.getString("name"));
                String location = safe(doc.getString("location"));

                if (!search.isEmpty()) {
                    String q = search.toLowerCase();
                    if (!name.toLowerCase().contains(q) && !location.toLowerCase().contains(q)) continue;
                }

                int avgDelay = doc.getInteger("avgPaymentDelayDays") != null ? doc.getInteger("avgPaymentDelayDays") : 0;
                int overdue  = doc.getInteger("overdueInvoiceCount")  != null ? doc.getInteger("overdueInvoiceCount")  : 0;
                int score    = analytics.calculateReliabilityScore(avgDelay, overdue);
                String risk  = score < 50 ? "High" : score < 70 ? "Medium" : "Low";

                Map<String, Object> client = new HashMap<>();
                client.put("id",               doc.getObjectId("_id").toString());
                client.put("name",             name);
                client.put("location",         location);
                client.put("reliabilityScore", score);
                client.put("riskLevel",        risk);
                client.put("totalProjects",    doc.getInteger("totalProjects") != null ? doc.getInteger("totalProjects") : 0);
                result.add(client);
            }

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(new ArrayList<>());
        }
    }

    private String safe(String s) { return s != null ? s : ""; }

    /**
     * Safely reads any numeric BSON field (Int32, Int64, Double or String)
     * as a double. Prevents ClassCastException when seed data mixes types.
     */
    private double num(Document doc, String key) {
        Object v = doc.get(key);
        if (v == null) return 0.0;
        if (v instanceof Number) return ((Number) v).doubleValue();
        try { return Double.parseDouble(v.toString()); } catch (Exception e) { return 0.0; }
    }
}
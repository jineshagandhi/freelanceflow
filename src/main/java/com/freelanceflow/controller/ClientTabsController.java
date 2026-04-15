package com.freelanceflow.controller;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * REST Controller for all client portal endpoints.
 * All project and invoice queries are team-aware:
 * users sharing the same teamLeaderName see the same projects.
 */
@RestController
@CrossOrigin(origins = "*")
public class ClientTabsController {

    private static final MongoClient mongoClient = MongoClients.create(
        System.getenv().getOrDefault("MONGODB_URI", "mongodb://localhost:27017"));
    private static final String DB_NAME = "freelanceflow";

    // ── Resolve team member IDs for a given user ──────────────────────────────
    private List<String> resolveTeamIds(String userId) {
        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> users = db.getCollection("users");

            Document me = findUserById(users, userId);
            if (me == null) {
                System.out.println(">>> resolveTeamIds: user not found for id=" + userId + " — returning self only");
                return List.of(userId);
            }

            // Use the real MongoDB ObjectId as the canonical ID for this user
            String myRealId       = me.getObjectId("_id").toString();
            String teamLeaderName = safe(me.getString("teamLeaderName"));
            String myOrgRole      = safe(me.getString("orgRole"));

            Set<String> ids = new LinkedHashSet<>();
            ids.add(myRealId); // always include self by real ID

            // ── Strategy 1: match by shared teamLeaderName ──────────────────
            if (!teamLeaderName.isEmpty()) {
                String escaped = teamLeaderName.replaceAll("[.*+?^${}()|\\[\\]\\\\]", "\\\\$0");

                // Find all users who share the same teamLeaderName
                List<Document> sameTeam = users.find(
                    Filters.regex("teamLeaderName", "(?i)^" + escaped + "$")
                ).into(new ArrayList<>());
                for (Document d : sameTeam) ids.add(d.getObjectId("_id").toString());

                // Also find the team leader user themselves (name == teamLeaderName)
                List<Document> leaders = users.find(
                    Filters.and(
                        Filters.in("role", "Client", "client"),
                        Filters.regex("name", "(?i)^" + escaped + "$")
                    )
                ).into(new ArrayList<>());
                for (Document d : leaders) ids.add(d.getObjectId("_id").toString());
            }

            // ── Strategy 2: if I am a team_leader, also include teamMemberIds ──
            if ("team_leader".equalsIgnoreCase(myOrgRole)) {
                List<String> memberIds = me.getList("teamMemberIds", String.class);
                if (memberIds != null) ids.addAll(memberIds);
            }

            // ── Strategy 3: find anyone whose teamMemberIds contains my real ID ──
            List<Document> leadersLinkingMe = users.find(
                Filters.eq("teamMemberIds", myRealId)
            ).into(new ArrayList<>());
            for (Document leader : leadersLinkingMe) {
                ids.add(leader.getObjectId("_id").toString());
                // Also grab their team members
                List<String> memberIds = leader.getList("teamMemberIds", String.class);
                if (memberIds != null) ids.addAll(memberIds);
            }

            System.out.println(">>> Team IDs for " + userId + " (" + myOrgRole + "): " + ids);
            return new ArrayList<>(ids);

        } catch (Exception e) {
            e.printStackTrace();
            return List.of(userId);
        }
    }

    // ── Build a Bson filter that matches any of the team's clientIds ──────────
    private Bson teamFilter(List<String> teamIds) {
        if (teamIds.size() == 1) return Filters.eq("clientId", teamIds.get(0));
        return Filters.in("clientId", teamIds);
    }

    // ── DASHBOARD ─────────────────────────────────────────────────────────────
    @GetMapping("/api/client/dashboard-summary")
    public ResponseEntity<?> getClientDashboard(@RequestParam String clientId) {
        try {
            MongoDatabase db   = mongoClient.getDatabase(DB_NAME);
            List<String> teamIds = resolveTeamIds(clientId);
            Bson         tf      = teamFilter(teamIds);

            List<Document> projectDocs = db.getCollection("projects").find(tf).into(new ArrayList<>());
            int projectCount = projectDocs.size(), activeCount = 0;
            List<Map<String, Object>> projects = new ArrayList<>();

            for (Document doc : projectDocs) {
                String status = safe(doc.getString("status"));
                if ("Active".equalsIgnoreCase(status) || status.contains("Progress")) activeCount++;

                List<Document> msDocs = (List<Document>) doc.get("milestones");
                int total = 0, comp = 0;
                if (msDocs != null) {
                    total = msDocs.size();
                    for (Document m : msDocs)
                        if (Boolean.TRUE.equals(m.getBoolean("completed")) && Boolean.TRUE.equals(m.getBoolean("approved"))) comp++;
                }
                int progress = total > 0 ? (int) ((comp * 100.0) / total) : 0;

                Map<String, Object> p = new HashMap<>();
                p.put("id",                  doc.getObjectId("_id").toString());
                p.put("title",               safe(doc.getString("title")));
                p.put("status",              status);
                p.put("budget",              num(doc, "budget"));
                p.put("progressPercent",     progress);
                p.put("totalMilestones",     total);
                p.put("completedMilestones", comp);
                p.put("endDate",             safe(doc.getString("endDate")));
                projects.add(p);
            }

            List<Document> invoiceDocs = db.getCollection("invoices").find(tf).into(new ArrayList<>());
            double pendingAmount = 0, totalSpent = 0;
            List<Map<String, Object>> invoices = new ArrayList<>();

            for (Document doc : invoiceDocs) {
                String status = safe(doc.getString("status"));
                double amount = num(doc, "amount");
                if ("Paid".equalsIgnoreCase(status))         totalSpent    += amount;
                if ("Pending".equalsIgnoreCase(status) || "Overdue".equalsIgnoreCase(status)) pendingAmount += amount;

                Map<String, Object> inv = new HashMap<>();
                inv.put("id",          doc.getObjectId("_id").toString());
                inv.put("description", safe(doc.getString("description")));
                inv.put("amount",      amount);
                inv.put("status",      status);
                inv.put("dueDate",     safe(doc.getString("dueDate")));
                invoices.add(inv);
            }

            Map<String, Object> stats = new HashMap<>();
            stats.put("projectCount",  projectCount);
            stats.put("activeCount",   activeCount);
            stats.put("pendingAmount", pendingAmount);
            stats.put("totalSpent",    totalSpent);

            Map<String, Object> response = new HashMap<>();
            response.put("stats",    stats);
            response.put("projects", projects);
            response.put("invoices", invoices);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> stats = new HashMap<>();
            stats.put("projectCount", 0); stats.put("activeCount", 0);
            stats.put("pendingAmount", 0); stats.put("totalSpent", 0);
            Map<String, Object> empty = new HashMap<>();
            empty.put("stats", stats); empty.put("projects", new ArrayList<>()); empty.put("invoices", new ArrayList<>());
            return ResponseEntity.ok(empty);
        }
    }

    // ── CREATE PROJECT ────────────────────────────────────────────────────────
    @PostMapping("/api/client/create-project")
    public ResponseEntity<?> createProject(@RequestBody Map<String, Object> body) {
        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            Document doc = new Document();
            doc.put("clientId",            safe((String) body.get("clientId")));
            doc.put("title",               safe((String) body.get("title")));
            doc.put("description",         safe((String) body.get("description")));
            doc.put("objectives",          safe((String) body.get("objectives")));
            doc.put("scope",               safe((String) body.get("scope")));
            doc.put("skills",              body.getOrDefault("skills",       new ArrayList<>()));
            doc.put("deliverables",        body.getOrDefault("deliverables", new ArrayList<>()));
            doc.put("experienceLevel",     safe((String) body.get("experienceLevel")));
            doc.put("budget",              body.get("budget") != null ? Double.parseDouble(body.get("budget").toString()) : 0);
            doc.put("paymentType",         safe((String) body.get("paymentType")));
            doc.put("location",            safe((String) body.get("location")));
            doc.put("startDate",           safe((String) body.get("startDate")));
            doc.put("endDate",             safe((String) body.get("endDate")));
            doc.put("availability",        safe((String) body.get("availability")));
            doc.put("communicationMethod", safe((String) body.get("communicationMethod")));
            doc.put("additionalNotes",     safe((String) body.get("additionalNotes")));
            doc.put("status",              "Open");
            doc.put("createdAt",           new Date());

            // Build milestone documents
            List<Object> rawMs = body.get("milestones") instanceof List ? (List<Object>) body.get("milestones") : new ArrayList<>();
            List<Document> msDocs = new ArrayList<>();
            for (Object m : rawMs) {
                if (m instanceof Map) {
                    Map<?,?> mm = (Map<?,?>) m;
                    Document ms = new Document();
                    ms.put("_id",            new ObjectId());
                    ms.put("title",          safe((String) mm.get("title")));
                    ms.put("completed",      false);
                    ms.put("pendingApproval", false);
                    ms.put("approved",       false);
                    msDocs.add(ms);
                }
            }
            doc.put("milestones", msDocs);

            db.getCollection("projects").insertOne(doc);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("id",      doc.getObjectId("_id").toString());
            response.put("message", "Project posted successfully");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to create project");
        }
    }

    // ── CLIENT PROJECTS (team-aware) ──────────────────────────────────────────
    @GetMapping("/api/client/projects")
    public ResponseEntity<?> getClientProjects(@RequestParam String clientId) {
        try {
            MongoDatabase db     = mongoClient.getDatabase(DB_NAME);
            List<String> teamIds = resolveTeamIds(clientId);
            Bson         tf      = teamFilter(teamIds);

            List<Document> docs = db.getCollection("projects").find(tf).into(new ArrayList<>());
            List<Map<String, Object>> result = new ArrayList<>();

            for (Document doc : docs) {
                List<Document> msDocs = (List<Document>) doc.get("milestones");
                List<Map<String, Object>> milestones = new ArrayList<>();
                int total = 0, comp = 0;

                if (msDocs != null) {
                    for (Document m : msDocs) {
                        total++;
                        boolean done     = Boolean.TRUE.equals(m.getBoolean("completed"));
                        boolean pending  = Boolean.TRUE.equals(m.getBoolean("pendingApproval"));
                        boolean approved = Boolean.TRUE.equals(m.getBoolean("approved"));
                        if (done && approved) comp++;

                        String mid;
                        try { mid = m.getObjectId("_id").toString(); }
                        catch (Exception e) { mid = m.getString("id") != null ? m.getString("id") : UUID.randomUUID().toString(); }

                        Map<String, Object> ms = new HashMap<>();
                        ms.put("id",              mid);
                        ms.put("title",           safe(m.getString("title")));
                        ms.put("completed",       done);
                        ms.put("pendingApproval", pending);
                        ms.put("approved",        approved);
                        ms.put("dueDate",         safe(m.getString("dueDate")));
                        milestones.add(ms);
                    }
                }
                int progress = total > 0 ? (int) ((comp * 100.0) / total) : 0;

                Map<String, Object> project = new HashMap<>();
                project.put("id",                  doc.getObjectId("_id").toString());
                project.put("title",               safe(doc.getString("title")));
                project.put("status",              safe(doc.getString("status")));
                project.put("budget",              num(doc, "budget"));
                project.put("location",            safe(doc.getString("location")));
                project.put("paymentType",         safe(doc.getString("paymentType")));
                project.put("endDate",             safe(doc.getString("endDate")));
                project.put("description",         safe(doc.getString("description")));
                project.put("progressPercent",     progress);
                project.put("totalMilestones",     total);
                project.put("completedMilestones", comp);
                project.put("milestones",          milestones);
                project.put("srsDocument",         safe(doc.getString("srsDocument")));
                result.add(project);
            }

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(new ArrayList<>());
        }
    }

    // ── CLIENT INVOICES / PAYMENT HISTORY (team-aware) ────────────────────────
    @GetMapping("/api/client/invoices")
    public ResponseEntity<?> getClientInvoices(@RequestParam String clientId) {
        try {
            MongoDatabase db     = mongoClient.getDatabase(DB_NAME);
            List<String> teamIds = resolveTeamIds(clientId);
            Bson         tf      = teamFilter(teamIds);

            List<Document> docs = db.getCollection("invoices").find(tf).into(new ArrayList<>());
            double totalPaid = 0, totalPending = 0, totalOverdue = 0;
            List<Map<String, Object>> list = new ArrayList<>();

            for (Document doc : docs) {
                String status = safe(doc.getString("status"));
                double amount = num(doc, "amount");

                if ("Paid".equalsIgnoreCase(status))         totalPaid    += amount;
                else if ("Pending".equalsIgnoreCase(status)) totalPending += amount;
                else if ("Overdue".equalsIgnoreCase(status)) totalOverdue += amount;

                // Look up freelancer name
                String freelancerName = "Freelancer";
                String fid = doc.getString("freelancerId");
                if (fid != null && !fid.isEmpty()) {
                    try {
                        Document fu = db.getCollection("users")
                            .find(Filters.eq("_id", new ObjectId(fid))).first();
                        if (fu != null) freelancerName = safe(fu.getString("name"));
                    } catch (Exception ignored) {}
                }

                Map<String, Object> inv = new HashMap<>();
                inv.put("id",            doc.getObjectId("_id").toString());
                inv.put("projectName",   safe(doc.getString("projectName")));
                inv.put("description",   safe(doc.getString("description")));
                inv.put("freelancerName", freelancerName);
                inv.put("amount",        amount);
                inv.put("status",        status);
                inv.put("paymentStatus", safe(doc.getString("paymentStatus")));
                inv.put("dateIssued",    safe(doc.getString("dateIssued")));
                inv.put("dueDate",       safe(doc.getString("dueDate")));
                inv.put("paymentType",   safe(doc.getString("paymentType")));
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

    // ── Helpers ───────────────────────────────────────────────────────────────
    private Document findUserById(MongoCollection<Document> col, String id) {
        // Try ObjectId first
        try {
            Document doc = col.find(Filters.eq("_id", new ObjectId(id))).first();
            if (doc != null) return doc;
        } catch (Exception ignored) {}
        // Fallback: email match
        try {
            Document doc = col.find(Filters.eq("email", id)).first();
            if (doc != null) return doc;
        } catch (Exception ignored) {}
        return null;
    }

    private String safe(String s) { return s != null ? s : ""; }

    /**
     * Safely reads any numeric field (Integer, Long, Double, or string)
     * from a BSON Document and returns it as a double.
     * Prevents ClassCastException when seed data stores numbers as Int32.
     */
    private double num(Document doc, String key) {
        Object v = doc.get(key);
        if (v == null) return 0.0;
        if (v instanceof Number) return ((Number) v).doubleValue();
        try { return Double.parseDouble(v.toString()); } catch (Exception e) { return 0.0; }
    }
}
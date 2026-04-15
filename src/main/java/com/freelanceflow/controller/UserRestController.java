package com.freelanceflow.controller;

import com.freelanceflow.model.LoginRequest;
import com.freelanceflow.model.UserModel;
import com.freelanceflow.dao.ClientDAO;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import org.bson.Document;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * REST Controller — handles all API requests from the React frontend.
 * Exposes: POST /api/auth/login
 *          GET  /api/freelancer/dashboard
 *          GET  /api/invoices
 */
@RestController
@CrossOrigin(origins = "*") // Allows React (localhost:5173) to talk to Spring (localhost:8080)
public class UserRestController {

    // Shared MongoDB client — created once, reused for every request
    private static final MongoClient mongoClient = MongoClients.create(
        System.getenv().getOrDefault("MONGODB_URI", "mongodb://localhost:27017"));
    private static final String DB_NAME = "freelanceflow";

    // Auth logic delegate
    private final AuthController authLogic = new AuthController();

    // ─────────────────────────────────────────────
    // POST /api/auth/login
    // Called by Auth.tsx when user submits login form
    // ─────────────────────────────────────────────
    @PostMapping("/api/auth/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        System.out.println(">>> LOGIN REQUEST for: " + request.getEmail() + " | Role: " + request.getRole());

        UserModel user = authLogic.login(
            request.getEmail(),
            request.getPassword(),
            request.getRole()
        );

        if (user != null) {
            System.out.println(">>> LOGIN SUCCESS: " + user.getName());

            // Fetch extra client fields (orgRole, teamLeaderName) from MongoDB
            // and merge them into the response so Auth.tsx can store them in AppContext
            try {
                MongoDatabase db = mongoClient.getDatabase(DB_NAME);
                Document userDoc = db.getCollection("users")
                    .find(com.mongodb.client.model.Filters.eq("email", request.getEmail()))
                    .first();
                if (userDoc != null) {
                    Map<String, Object> response = new java.util.HashMap<>();
                    response.put("id",             user.getId());
                    response.put("name",           user.getName());
                    response.put("email",          user.getEmail());
                    response.put("role",           user.getRole());
                    response.put("orgRole",        userDoc.getString("orgRole")        != null ? userDoc.getString("orgRole")        : "");
                    response.put("teamLeaderName", userDoc.getString("teamLeaderName") != null ? userDoc.getString("teamLeaderName") : "");
                    return ResponseEntity.ok(response);
                }
            } catch (Exception e) {
                System.err.println(">>> Could not fetch extra user fields: " + e.getMessage());
            }

            return ResponseEntity.ok(user);
        } else {
            System.out.println(">>> LOGIN FAILED for: " + request.getEmail());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Authentication failed");
        }
    }

    // ─────────────────────────────────────────────
    // GET /api/freelancer/dashboard?id={userId}
    // Called by Dashboard.tsx on load
    // Pulls real data from MongoDB and calculates stats
    // ─────────────────────────────────────────────
    @GetMapping("/api/freelancer/dashboard")
    public ResponseEntity<?> getFreelancerDashboard(@RequestParam String id) {
        System.out.println(">>> DASHBOARD REQUEST for user id: " + id);

        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);

            // ── Fetch projects for this freelancer ──
            MongoCollection<Document> projectsCol = db.getCollection("projects");
            List<Document> projects = projectsCol
                .find(Filters.eq("freelancerId", id))
                .into(new ArrayList<>());

            int activeCount = 0;
            double totalEarnings = 0;
            for (Document p : projects) {
                String status = p.getString("status");
                if ("Active".equalsIgnoreCase(status) || "In Progress".equalsIgnoreCase(status)) {
                    activeCount++;
                }
                if ("Completed".equalsIgnoreCase(status)) {
                    if (p.get("amount") != null) totalEarnings += num(p, "amount");
                }
            }

            // ── Fetch invoices for this freelancer ──
            MongoCollection<Document> invoicesCol = db.getCollection("invoices");
            List<Document> invoices = invoicesCol
                .find(Filters.eq("freelancerId", id))
                .into(new ArrayList<>());

            int pendingCount = 0;
            for (Document inv : invoices) {
                String status = inv.getString("status");
                if ("Pending".equalsIgnoreCase(status) || "Overdue".equalsIgnoreCase(status)) {
                    pendingCount++;
                }
            }

            // ── Fetch clients and build risk alerts ──
            MongoCollection<Document> clientsCol = db.getCollection("clients");
            List<Document> clients = clientsCol
                .find(Filters.eq("freelancerId", id))
                .into(new ArrayList<>());

            AnalyticsEngine analytics = new AnalyticsEngine();
            List<Map<String, Object>> riskAlerts = new ArrayList<>();
            int totalReliability = 0;

            for (Document client : clients) {
                int avgDelay = client.getInteger("avgPaymentDelayDays") != null
                    ? client.getInteger("avgPaymentDelayDays") : 0;
                int overdueCount = client.getInteger("overdueInvoiceCount") != null
                    ? client.getInteger("overdueInvoiceCount") : 0;

                int score = analytics.calculateReliabilityScore(avgDelay, overdueCount);
                totalReliability += score;

                // Only surface Medium or High risk clients as alerts
                String riskLevel = score < 50 ? "High" : score < 70 ? "Medium" : "Low";
                if (!"Low".equals(riskLevel)) {
                    Map<String, Object> alert = new HashMap<>();
                    alert.put("id", client.getObjectId("_id").toString());
                    alert.put("name", client.getString("name"));
                    alert.put("riskLevel", riskLevel);
                    alert.put("reliabilityScore", score);
                    alert.put("activeProjectCount",
                        client.getInteger("activeProjectCount") != null
                            ? client.getInteger("activeProjectCount") : 0);
                    riskAlerts.add(alert);
                }
            }

            int avgReliability = clients.isEmpty() ? 100 : totalReliability / clients.size();

            // ── Build earnings history (last 6 months from invoices) ──
            // Groups paid invoices by month label — simple bucketing
            String[] monthLabels = {"Jan", "Feb", "Mar", "Apr", "May", "Jun",
                                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
            Map<Integer, Double> earningsByMonth = new LinkedHashMap<>();
            Calendar now = Calendar.getInstance();
            // Initialise last 6 months with 0
            for (int i = 5; i >= 0; i--) {
                Calendar c = Calendar.getInstance();
                c.add(Calendar.MONTH, -i);
                earningsByMonth.put(c.get(Calendar.MONTH), 0.0);
            }
            for (Document inv : invoices) {
                if ("Paid".equalsIgnoreCase(inv.getString("status"))) {
                    Date paidDate = inv.getDate("paidDate");
                    if (paidDate != null && inv.get("amount") != null) {
                        double amount = num(inv, "amount");
                        Calendar c = Calendar.getInstance();
                        c.setTime(paidDate);
                        int month = c.get(Calendar.MONTH);
                        if (earningsByMonth.containsKey(month)) {
                            earningsByMonth.put(month, earningsByMonth.get(month) + amount);
                        }
                    }
                }
            }

            List<Map<String, Object>> earningsHistory = new ArrayList<>();
            for (Map.Entry<Integer, Double> entry : earningsByMonth.entrySet()) {
                Map<String, Object> point = new HashMap<>();
                point.put("month", monthLabels[entry.getKey()]);
                point.put("earnings", entry.getValue());
                earningsHistory.add(point);
            }

            // ── Assemble final response ──
            Map<String, Object> stats = new HashMap<>();
            stats.put("totalEarnings", totalEarnings);
            stats.put("activeCount", activeCount);
            stats.put("pendingCount", pendingCount);
            stats.put("avgReliability", avgReliability);

            Map<String, Object> response = new HashMap<>();
            response.put("stats", stats);
            response.put("earningsHistory", earningsHistory);
            response.put("riskAlerts", riskAlerts);

            System.out.println(">>> DASHBOARD RESPONSE built successfully for: " + id);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println(">>> DASHBOARD ERROR: " + e.getMessage());
            e.printStackTrace();

            // Return safe fallback data so the frontend never crashes
            Map<String, Object> stats = new HashMap<>();
            stats.put("totalEarnings", 0);
            stats.put("activeCount", 0);
            stats.put("pendingCount", 0);
            stats.put("avgReliability", 0);

            Map<String, Object> response = new HashMap<>();
            response.put("stats", stats);
            response.put("earningsHistory", new ArrayList<>());
            response.put("riskAlerts", new ArrayList<>());
            return ResponseEntity.ok(response);
        }
    }

    // ─────────────────────────────────────────────
    // GET /api/invoices?freelancerId={id}
    // Called by Invoices.tsx to list all invoices
    // ─────────────────────────────────────────────
    @GetMapping("/api/invoices")
    public ResponseEntity<?> getInvoices(@RequestParam String freelancerId) {
        System.out.println(">>> INVOICES REQUEST for: " + freelancerId);
        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> col = db.getCollection("invoices");

            List<Document> docs = col
                .find(Filters.eq("freelancerId", freelancerId))
                .into(new ArrayList<>());

            List<Map<String, Object>> invoices = new ArrayList<>();
            for (Document doc : docs) {
                Map<String, Object> inv = new HashMap<>();
                inv.put("id", doc.getObjectId("_id").toString());
                inv.put("clientName", doc.getString("clientName"));
                inv.put("amount", num(doc, "amount"));
                inv.put("status", doc.getString("status"));
                inv.put("dueDate", doc.getString("dueDate"));
                invoices.add(inv);
            }

            return ResponseEntity.ok(invoices);
        } catch (Exception e) {
            System.err.println(">>> INVOICES ERROR: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Failed to fetch invoices");
        }
    }

    // Safely read any numeric BSON field (Int32/Int64/Double/String) as a double.
    private static double num(Document doc, String key) {
        Object v = doc.get(key);
        if (v == null) return 0.0;
        if (v instanceof Number) return ((Number) v).doubleValue();
        try { return Double.parseDouble(v.toString()); } catch (Exception e) { return 0.0; }
    }
}
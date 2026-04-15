package com.freelanceflow.controller;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Updates;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.*;

/**
 * Handles all milestone, invoice, document upload, and payment endpoints.
 *
 * Freelancer endpoints:
 *   PUT  /api/freelancer/milestone/complete      — mark milestone done (pending approval)
 *   POST /api/freelancer/project/upload-srs      — upload SRS document
 *   POST /api/freelancer/invoice/generate        — generate invoice after milestone(s) approved
 *
 * Client endpoints:
 *   PUT  /api/client/milestone/approve           — team_leader approves or rejects milestone
 *   GET  /api/client/project/srs?projectId={}    — view SRS document path
 *   PUT  /api/client/invoice/approve             — team_leader approves or rejects invoice
 *   PUT  /api/client/invoice/pay                 — project_manager marks invoice as paid
 */
@RestController
@CrossOrigin(origins = "*")
public class MilestoneInvoiceController {

    private static final MongoClient mongoClient = MongoClients.create(
        System.getenv().getOrDefault("MONGODB_URI", "mongodb://localhost:27017"));
    private static final String DB_NAME = "freelanceflow";
    private static final String UPLOAD_DIR = "uploads/srs/";

    // ── FREELANCER: Mark milestone as completed (pending client approval) ──────
    @PutMapping("/api/freelancer/milestone/complete")
    public ResponseEntity<?> completeMilestone(@RequestBody Map<String, Object> body) {
        String projectId   = (String) body.get("projectId");
        String milestoneId = (String) body.get("milestoneId");
        boolean completed  = Boolean.parseBoolean(body.getOrDefault("completed", "true").toString());

        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> col = db.getCollection("projects");

            Document project = col.find(Filters.eq("_id", new ObjectId(projectId))).first();
            if (project == null) return ResponseEntity.notFound().build();

            List<Document> milestones = (List<Document>) project.get("milestones");
            if (milestones == null) return ResponseEntity.badRequest().body("No milestones found");

            for (Document m : milestones) {
                String mid = m.get("_id") != null ? m.getObjectId("_id").toString() : m.getString("id");
                if (milestoneId.equals(mid)) {
                    // Mark as pending approval (not yet approved)
                    m.put("pendingApproval", completed);
                    m.put("completed", false); // stays false until client approves
                    break;
                }
            }

            col.updateOne(Filters.eq("_id", new ObjectId(projectId)),
                Updates.set("milestones", milestones));

            return ResponseEntity.ok(Map.of("message", "Milestone marked as pending approval"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Failed to update milestone");
        }
    }

    // ── FREELANCER: Upload SRS document ─────────────────────────────────────
    @PostMapping("/api/freelancer/project/upload-srs")
    public ResponseEntity<?> uploadSrs(
            @RequestParam("projectId") String projectId,
            @RequestParam("file") MultipartFile file) {
        try {
            // Create upload directory if needed
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) Files.createDirectories(uploadPath);

            String filename = projectId + "_" + file.getOriginalFilename();
            Path filePath   = uploadPath.resolve(filename);
            file.transferTo(filePath.toFile());

            // Save reference in project document
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            db.getCollection("projects").updateOne(
                Filters.eq("_id", new ObjectId(projectId)),
                Updates.set("srsDocument", filename)
            );

            return ResponseEntity.ok(Map.of("message", "SRS uploaded", "filename", filename));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Upload failed: " + e.getMessage());
        }
    }

    // ── FREELANCER: Generate invoice ─────────────────────────────────────────
    @PostMapping("/api/freelancer/invoice/generate")
    public ResponseEntity<?> generateInvoice(@RequestBody Map<String, Object> body) {
        String projectId   = (String) body.get("projectId");
        String freelancerId = (String) body.get("freelancerId");
        String milestoneId = (String) body.get("milestoneId"); // null for fixed-price

        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> projectsCol = db.getCollection("projects");
            MongoCollection<Document> invoicesCol = db.getCollection("invoices");

            Document project = projectsCol.find(Filters.eq("_id", new ObjectId(projectId))).first();
            if (project == null) return ResponseEntity.notFound().build();

            String paymentType = project.getString("paymentType") != null
                ? project.getString("paymentType") : "Fixed Price";
            double budget      = num(project, "budget");
            String clientId    = project.getString("clientId");

            double amount;
            String description;

            if ("Milestone-based".equalsIgnoreCase(paymentType) && milestoneId != null) {
                // Calculate per-milestone amount = total / number of milestones
                List<Document> milestones = (List<Document>) project.get("milestones");
                int milestoneCount = milestones != null ? milestones.size() : 1;
                amount = budget / milestoneCount;

                // Find milestone title
                String msTitle = "Milestone";
                if (milestones != null) {
                    for (Document m : milestones) {
                        String mid = m.get("_id") != null ? m.getObjectId("_id").toString() : m.getString("id");
                        if (milestoneId.equals(mid)) { msTitle = m.getString("title"); break; }
                    }
                }
                description = "Milestone Payment: " + msTitle;
            } else {
                // Fixed price — full amount
                amount = budget;
                description = "Final Payment: " + project.getString("title");
            }

            // Check no duplicate invoice for this milestone
            if (milestoneId != null) {
                long existing = invoicesCol.countDocuments(Filters.and(
                    Filters.eq("projectId", projectId),
                    Filters.eq("milestoneId", milestoneId)
                ));
                if (existing > 0)
                    return ResponseEntity.badRequest().body("Invoice already generated for this milestone");
            }

            Document invoice = new Document();
            invoice.put("projectId",      projectId);
            invoice.put("projectName",    project.getString("title"));
            invoice.put("freelancerId",   freelancerId);
            invoice.put("clientId",       clientId);
            invoice.put("milestoneId",    milestoneId);
            invoice.put("description",    description);
            invoice.put("amount",         amount);
            invoice.put("status",         "Pending");           // awaiting team_leader approval
            invoice.put("paymentStatus",  "Awaiting Approval");
            invoice.put("dateIssued",     LocalDate.now().toString());
            invoice.put("dueDate",        LocalDate.now().toString());
            invoice.put("paymentType",    paymentType);

            invoicesCol.insertOne(invoice);

            System.out.println("LOG: Invoice generated for project " + projectId + " amount $" + amount);
            return ResponseEntity.ok(Map.of(
                "message", "Invoice generated successfully",
                "amount",  amount,
                "id",      invoice.getObjectId("_id").toString()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Failed to generate invoice");
        }
    }

    // ── CLIENT (TEAM LEADER): Approve or reject milestone ───────────────────
    @PutMapping("/api/client/milestone/approve")
    public ResponseEntity<?> approveMilestone(@RequestBody Map<String, Object> body) {
        String projectId   = (String) body.get("projectId");
        String milestoneId = (String) body.get("milestoneId");
        boolean approved   = Boolean.parseBoolean(body.getOrDefault("approved", "true").toString());

        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> col = db.getCollection("projects");

            Document project = col.find(Filters.eq("_id", new ObjectId(projectId))).first();
            if (project == null) return ResponseEntity.notFound().build();

            List<Document> milestones = (List<Document>) project.get("milestones");
            if (milestones == null) return ResponseEntity.badRequest().body("No milestones");

            for (Document m : milestones) {
                String mid = m.get("_id") != null ? m.getObjectId("_id").toString() : m.getString("id");
                if (milestoneId.equals(mid)) {
                    m.put("completed",       approved);
                    m.put("pendingApproval", false);
                    m.put("approved",        approved);
                    break;
                }
            }

            col.updateOne(Filters.eq("_id", new ObjectId(projectId)),
                Updates.set("milestones", milestones));

            return ResponseEntity.ok(Map.of("message", approved ? "Milestone approved" : "Milestone rejected"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Failed to approve milestone");
        }
    }

    // ── CLIENT (TEAM LEADER): Approve or reject invoice ─────────────────────
    @PutMapping("/api/client/invoice/approve")
    public ResponseEntity<?> approveInvoice(@RequestBody Map<String, Object> body) {
        String invoiceId = (String) body.get("invoiceId");
        boolean approved = Boolean.parseBoolean(body.getOrDefault("approved", "true").toString());

        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> col = db.getCollection("invoices");

            String newStatus = approved ? "Approved" : "Rejected";
            col.updateOne(
                Filters.eq("_id", new ObjectId(invoiceId)),
                Updates.combine(
                    Updates.set("status",        newStatus),
                    Updates.set("paymentStatus", approved ? "Awaiting Payment" : "Rejected")
                )
            );

            return ResponseEntity.ok(Map.of("message", "Invoice " + newStatus.toLowerCase()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Failed to update invoice");
        }
    }

    // ── CLIENT (PROJECT MANAGER): Make payment ───────────────────────────────
    @PutMapping("/api/client/invoice/pay")
    public ResponseEntity<?> payInvoice(@RequestBody Map<String, Object> body) {
        String invoiceId = (String) body.get("invoiceId");

        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> col = db.getCollection("invoices");

            // Verify it's in "Approved" state before paying
            Document inv = col.find(Filters.eq("_id", new ObjectId(invoiceId))).first();
            if (inv == null) return ResponseEntity.notFound().build();
            if (!"Approved".equals(inv.getString("status")))
                return ResponseEntity.badRequest().body("Invoice must be approved by Team Leader before payment");

            col.updateOne(
                Filters.eq("_id", new ObjectId(invoiceId)),
                Updates.combine(
                    Updates.set("status",        "Paid"),
                    Updates.set("paymentStatus", "Paid"),
                    Updates.set("paidDate",       LocalDate.now().toString())
                )
            );

            System.out.println("LOG: Invoice " + invoiceId + " marked as Paid");
            return ResponseEntity.ok(Map.of("message", "Payment processed successfully"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Payment failed");
        }
    }

    // ── CLIENT: Get SRS document info for a project ──────────────────────────
    @GetMapping("/api/client/project/srs")
    public ResponseEntity<?> getSrs(@RequestParam String projectId) {
        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            Document project = db.getCollection("projects")
                .find(Filters.eq("_id", new ObjectId(projectId))).first();
            if (project == null) return ResponseEntity.notFound().build();

            String srs = project.getString("srsDocument");
            if (srs == null || srs.isEmpty())
                return ResponseEntity.ok(Map.of("srsDocument", ""));
            return ResponseEntity.ok(Map.of("srsDocument", srs));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to get SRS info");
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
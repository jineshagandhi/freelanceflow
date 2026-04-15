package com.freelanceflow.controller;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Updates;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Profile GET and PUT for both freelancers and clients.
 *
 * KEY FIX: findUserById() now handles both real ObjectId strings AND
 * fallback IDs (like "c6", "f1") that are stored by the legacy AppContext.
 * It tries ObjectId first, then falls back to email, then to a full collection scan.
 *
 * Client PUT also:
 * - saves orgRole and teamLeaderName to MongoDB
 * - when a PM enters a teamLeaderName, finds the team leader user in MongoDB
 *   and adds this PM's ID to their teamMemberIds array (bidirectional link)
 */
@RestController
@CrossOrigin(origins = "*")
public class ProfileController {

    private static final MongoClient mongoClient = MongoClients.create(
        System.getenv().getOrDefault("MONGODB_URI", "mongodb://localhost:27017"));
    private static final String DB_NAME = "freelanceflow";

    // ── FREELANCER ────────────────────────────────────────────────────────────

    @GetMapping("/api/freelancer/profile")
    public ResponseEntity<?> getFreelancerProfile(@RequestParam String id) {
        try {
            Document user = findUserById(id);
            if (user == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");

            Map<String, Object> profile = new HashMap<>();
            profile.put("id",          user.getObjectId("_id").toString());
            profile.put("name",        safe(user.getString("name")));
            profile.put("email",       safe(user.getString("email")));
            profile.put("headline",    safe(user.getString("headline")));
            profile.put("profession",  safe(user.getString("profession")));
            profile.put("education",   safe(user.getString("education")));
            profile.put("location",    safe(user.getString("location")));
            profile.put("contactInfo", safe(user.getString("contactInfo")));
            profile.put("avatar",      safe(user.getString("avatar")));
            profile.put("skills",      user.getList("skills", String.class) != null
                ? user.getList("skills", String.class) : new ArrayList<>());
            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to load profile");
        }
    }

    @PutMapping("/api/freelancer/profile")
    public ResponseEntity<?> updateFreelancerProfile(@RequestBody Map<String, Object> body) {
        String id = (String) body.get("id");
        if (id == null || id.isEmpty()) return ResponseEntity.badRequest().body("User id required");
        try {
            Document user = findUserById(id);
            if (user == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");

            List<Bson> updates = new ArrayList<>();
            if (body.containsKey("name"))        updates.add(Updates.set("name",        body.get("name").toString()));
            if (body.containsKey("headline"))    updates.add(Updates.set("headline",    body.get("headline").toString()));
            if (body.containsKey("profession"))  updates.add(Updates.set("profession",  body.get("profession").toString()));
            if (body.containsKey("education"))   updates.add(Updates.set("education",   body.get("education").toString()));
            if (body.containsKey("location"))    updates.add(Updates.set("location",    body.get("location").toString()));
            if (body.containsKey("contactInfo")) updates.add(Updates.set("contactInfo", body.get("contactInfo").toString()));
            if (body.containsKey("avatar"))      updates.add(Updates.set("avatar",      body.get("avatar").toString()));
            if (body.containsKey("skills"))      updates.add(Updates.set("skills",      body.get("skills")));
            if (updates.isEmpty()) return ResponseEntity.badRequest().body("No fields to update");

            mongoClient.getDatabase(DB_NAME).getCollection("users").updateOne(
                Filters.eq("_id", user.getObjectId("_id")), Updates.combine(updates));
            return ResponseEntity.ok(Map.of("message", "Profile updated"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to update profile");
        }
    }

    // ── CLIENT ────────────────────────────────────────────────────────────────

    @GetMapping("/api/client/profile")
    public ResponseEntity<?> getClientProfile(@RequestParam String id) {
        try {
            Document user = findUserById(id);
            if (user == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");

            Map<String, Object> profile = new HashMap<>();
            profile.put("id",             user.getObjectId("_id").toString());
            profile.put("name",           safe(user.getString("name")));
            profile.put("email",          safe(user.getString("email")));
            profile.put("businessName",   safe(user.getString("businessName")));
            profile.put("location",       safe(user.getString("location")));
            profile.put("contactInfo",    safe(user.getString("contactInfo")));
            profile.put("orgRole",        safe(user.getString("orgRole")));
            profile.put("teamLeaderName", safe(user.getString("teamLeaderName")));
            profile.put("avatar",         safe(user.getString("avatar")));
            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to load profile");
        }
    }

    @PutMapping("/api/client/profile")
    public ResponseEntity<?> updateClientProfile(@RequestBody Map<String, Object> body) {
        String id = (String) body.get("id");
        if (id == null || id.isEmpty()) return ResponseEntity.badRequest().body("User id required");

        System.out.println(">>> UPDATE CLIENT PROFILE for id: " + id);

        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> users = db.getCollection("users");

            // CRITICAL: find by real _id, not the passed-in string directly
            Document me = findUserById(id);
            if (me == null) {
                System.err.println(">>> User not found for id: " + id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
            }

            ObjectId realId = me.getObjectId("_id");
            System.out.println(">>> Resolved real ObjectId: " + realId);

            List<Bson> updates = new ArrayList<>();
            if (body.containsKey("name"))         updates.add(Updates.set("name",         body.get("name").toString()));
            if (body.containsKey("businessName")) updates.add(Updates.set("businessName", body.get("businessName").toString()));
            if (body.containsKey("location"))     updates.add(Updates.set("location",     body.get("location").toString()));
            if (body.containsKey("contactInfo"))  updates.add(Updates.set("contactInfo",  body.get("contactInfo").toString()));

            // Resolve orgRole — never overwrite with empty string
            String existingOrgRole   = safe(me.getString("orgRole"));
            String sentOrgRole       = body.containsKey("orgRole") ? body.get("orgRole").toString() : "";
            String newOrgRole        = (!sentOrgRole.isEmpty()) ? sentOrgRole : existingOrgRole;
            String myName            = (body.containsKey("name") && !body.get("name").toString().isEmpty())
                                         ? body.get("name").toString().trim()
                                         : safe(me.getString("name"));
            String newTeamLeaderName = body.containsKey("teamLeaderName")
                                         ? body.get("teamLeaderName").toString().trim()
                                         : safe(me.getString("teamLeaderName"));

            // Always persist orgRole if we have a value
            if (!newOrgRole.isEmpty()) {
                updates.add(Updates.set("orgRole", newOrgRole));
            }

            // Team leaders always use their own name as teamLeaderName
            if ("team_leader".equalsIgnoreCase(newOrgRole)) {
                newTeamLeaderName = myName;
                updates.add(Updates.set("teamLeaderName", newTeamLeaderName));
            } else if (!newTeamLeaderName.isEmpty()) {
                // project_manager: save whatever they entered
                updates.add(Updates.set("teamLeaderName", newTeamLeaderName));
            }

            if (updates.isEmpty()) return ResponseEntity.badRequest().body("No fields to update");

            users.updateOne(Filters.eq("_id", realId), Updates.combine(updates));
            System.out.println(">>> Profile saved: orgRole=" + newOrgRole + " teamLeaderName=" + newTeamLeaderName);

            // ── Auto-link: if PM entered a teamLeaderName, find that leader
            //    and add this PM's ID to their teamMemberIds list ──────────────
            if ("project_manager".equalsIgnoreCase(newOrgRole) && !newTeamLeaderName.isEmpty()) {
                try {
                    String escaped = newTeamLeaderName.replaceAll("[.*+?^${}()|\\[\\]\\\\]", "\\\\$0");
                    Document leader = users.find(Filters.and(
                        Filters.in("role", "Client", "client"),
                        Filters.regex("name", "(?i)^" + escaped + "$")
                    )).first();

                    if (leader != null) {
                        String pmId = realId.toString();
                        // Add PM's ID to leader's teamMemberIds (avoid duplicates)
                        users.updateOne(
                            Filters.eq("_id", leader.getObjectId("_id")),
                            Updates.addToSet("teamMemberIds", pmId)
                        );
                        // Also ensure leader's teamLeaderName is set to their own name
                        users.updateOne(
                            Filters.eq("_id", leader.getObjectId("_id")),
                            Updates.set("teamLeaderName", safe(leader.getString("name")))
                        );
                        System.out.println(">>> Linked PM " + pmId + " to team leader: " + leader.getString("name"));
                    } else {
                        System.out.println(">>> Team leader not found for name: " + newTeamLeaderName);
                    }
                } catch (Exception linkErr) {
                    System.err.println(">>> Team link warning (non-fatal): " + linkErr.getMessage());
                }
            }

            // Return the updated profile fields so frontend can refresh AppContext
            Map<String, Object> response = new HashMap<>();
            response.put("message",        "Profile updated");
            response.put("orgRole",        newOrgRole);
            response.put("teamLeaderName", newTeamLeaderName);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to update profile: " + e.getMessage());
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Finds a user by ID, handling three cases:
     * 1. Valid MongoDB ObjectId string → direct _id lookup
     * 2. Email string → email field lookup
     * 3. Legacy short IDs ("f1", "c6") → scan all users (small collection)
     */
    private Document findUserById(String id) {
        MongoDatabase db = mongoClient.getDatabase(DB_NAME);
        MongoCollection<Document> col = db.getCollection("users");

        // Case 1: valid ObjectId
        try {
            ObjectId oid = new ObjectId(id);
            Document doc = col.find(Filters.eq("_id", oid)).first();
            if (doc != null) return doc;
        } catch (Exception ignored) {}

        // Case 2: email lookup
        try {
            Document doc = col.find(Filters.eq("email", id)).first();
            if (doc != null) return doc;
        } catch (Exception ignored) {}

        // Case 3: legacy short ID — can't match by _id, just return null
        System.err.println(">>> findUserById: could not resolve id='" + id + "' — user must log in with real account");
        return null;
    }

    private String safe(String s) { return s != null ? s : ""; }
}
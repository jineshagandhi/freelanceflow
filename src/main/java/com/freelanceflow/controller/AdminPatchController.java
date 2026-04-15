package com.freelanceflow.controller;

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

import java.util.*;

/**
 * Admin utility endpoint to patch existing user documents.
 * Use this to add orgRole and teamLeaderName to users
 * who were created before those fields existed.
 *
 * POST /api/admin/patch-user
 * Body: {
 *   "email": "sam@gmail.com",
 *   "orgRole": "team_leader",
 *   "teamLeaderName": "Sam Smith"
 * }
 */
@RestController
@CrossOrigin(origins = "*")
public class AdminPatchController {

    private static final MongoClient mongoClient = MongoClients.create(
        System.getenv().getOrDefault("MONGODB_URI", "mongodb://localhost:27017"));
    private static final String DB_NAME = "freelanceflow";

    @PostMapping("/api/admin/patch-user")
    public ResponseEntity<?> patchUser(@RequestBody Map<String, Object> body) {
        String email = (String) body.get("email");
        if (email == null || email.isEmpty())
            return ResponseEntity.badRequest().body("email is required");

        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> users = db.getCollection("users");

            Document user = users.find(Filters.eq("email", email)).first();
            if (user == null)
                return ResponseEntity.status(404).body("No user found with email: " + email);

            List<org.bson.conversions.Bson> updates = new ArrayList<>();

            if (body.containsKey("orgRole") && !body.get("orgRole").toString().isEmpty())
                updates.add(Updates.set("orgRole", body.get("orgRole").toString()));

            if (body.containsKey("teamLeaderName") && !body.get("teamLeaderName").toString().isEmpty())
                updates.add(Updates.set("teamLeaderName", body.get("teamLeaderName").toString().trim()));

            if (body.containsKey("name"))
                updates.add(Updates.set("name", body.get("name").toString()));

            if (updates.isEmpty())
                return ResponseEntity.badRequest().body("No fields to update");

            users.updateOne(Filters.eq("_id", user.getObjectId("_id")), Updates.combine(updates));

            // If this is a team_leader, also ensure their teamLeaderName = their name
            String newOrgRole = body.getOrDefault("orgRole", user.getString("orgRole") != null ? user.getString("orgRole") : "").toString();
            if ("team_leader".equalsIgnoreCase(newOrgRole)) {
                String name = body.containsKey("name") ? body.get("name").toString() : user.getString("name");
                users.updateOne(Filters.eq("_id", user.getObjectId("_id")),
                    Updates.set("teamLeaderName", name != null ? name.trim() : ""));
            }

            // If this is a project_manager with a teamLeaderName, auto-link to leader
            String tlName = body.containsKey("teamLeaderName") ? body.get("teamLeaderName").toString().trim() : "";
            if ("project_manager".equalsIgnoreCase(newOrgRole) && !tlName.isEmpty()) {
                String escaped = tlName.replaceAll("[.*+?^${}()|\\[\\]\\\\]", "\\\\$0");
                Document leader = users.find(Filters.and(
                    Filters.in("role", "Client", "client"),
                    Filters.regex("name", "(?i)^" + escaped + "$")
                )).first();

                if (leader != null) {
                    String pmId = user.getObjectId("_id").toString();
                    users.updateOne(Filters.eq("_id", leader.getObjectId("_id")),
                        Updates.addToSet("teamMemberIds", pmId));
                    users.updateOne(Filters.eq("_id", leader.getObjectId("_id")),
                        Updates.set("teamLeaderName", leader.getString("name")));
                    System.out.println(">>> Patched: linked PM " + email + " to leader " + leader.getString("name"));
                }
            }

            // Return updated user data
            Document updated = users.find(Filters.eq("_id", user.getObjectId("_id"))).first();
            Map<String, Object> resp = new HashMap<>();
            resp.put("id",             updated.getObjectId("_id").toString());
            resp.put("name",           updated.getString("name"));
            resp.put("email",          updated.getString("email"));
            resp.put("orgRole",        updated.getString("orgRole"));
            resp.put("teamLeaderName", updated.getString("teamLeaderName"));
            resp.put("message",        "User patched successfully");
            return ResponseEntity.ok(resp);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Patch failed: " + e.getMessage());
        }
    }

    /**
     * GET /api/admin/user-info?email={}
     * Returns the current orgRole, teamLeaderName and _id for any user.
     * Use to verify what's actually stored in MongoDB.
     */
    @GetMapping("/api/admin/user-info")
    public ResponseEntity<?> getUserInfo(@RequestParam String email) {
        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            Document user = db.getCollection("users").find(Filters.eq("email", email)).first();
            if (user == null) return ResponseEntity.status(404).body("User not found");

            Map<String, Object> info = new HashMap<>();
            info.put("id",             user.getObjectId("_id").toString());
            info.put("name",           user.getString("name"));
            info.put("email",          user.getString("email"));
            info.put("role",           user.getString("role"));
            info.put("orgRole",        user.getString("orgRole"));
            info.put("teamLeaderName", user.getString("teamLeaderName"));
            info.put("teamMemberIds",  user.getList("teamMemberIds", String.class));
            return ResponseEntity.ok(info);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }
}
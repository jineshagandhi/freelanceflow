package com.freelanceflow.controller;

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

@RestController
@CrossOrigin(origins = "*")
public class SignupController {

    private static final MongoClient mongoClient = MongoClients.create(
        System.getenv().getOrDefault("MONGODB_URI", "mongodb://localhost:27017"));
    private static final String DB_NAME = "freelanceflow";

    @PostMapping("/api/auth/signup")
    public ResponseEntity<?> signup(@RequestBody Map<String, Object> body) {
        try {
            String email    = (String) body.get("email");
            String password = (String) body.get("password");
            String name     = (String) body.get("name");
            String role     = (String) body.get("role");

            if (email == null || email.isEmpty())    return ResponseEntity.badRequest().body("Email is required");
            if (password == null || password.isEmpty()) return ResponseEntity.badRequest().body("Password is required");
            if (name == null || name.isEmpty())      return ResponseEntity.badRequest().body("Name is required");
            if (role == null || role.isEmpty())      return ResponseEntity.badRequest().body("Role is required");

            MongoDatabase db  = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> col = db.getCollection("users");

            if (col.find(Filters.eq("email", email)).first() != null)
                return ResponseEntity.status(HttpStatus.CONFLICT).body("An account with this email already exists");

            Document user = new Document();
            user.put("name",     name);
            user.put("email",    email);
            user.put("password", password);
            user.put("role",     role.substring(0,1).toUpperCase() + role.substring(1).toLowerCase());
            user.put("createdAt", new Date());
            user.put("avatar",   name.substring(0, Math.min(2, name.length())).toUpperCase());

            if ("freelancer".equalsIgnoreCase(role)) {
                user.put("profession",  body.getOrDefault("profession",  "").toString());
                user.put("education",   body.getOrDefault("education",   "").toString());
                user.put("location",    body.getOrDefault("location",    "").toString());
                user.put("contactInfo", body.getOrDefault("contactInfo", "").toString());
                user.put("skills",      body.getOrDefault("skills",      new ArrayList<>()));
                user.put("headline",    body.getOrDefault("headline",    "").toString());
            }

            if ("client".equalsIgnoreCase(role)) {
                user.put("businessName",    body.getOrDefault("businessName",    "").toString());
                user.put("location",        body.getOrDefault("location",        "").toString());
                user.put("contactInfo",     body.getOrDefault("contactInfo",     "").toString());
                // orgRole: "team_leader" or "project_manager"
                user.put("orgRole",         body.getOrDefault("orgRole",         "team_leader").toString());
                // teamLeaderName: used to group teammates together
                // If user IS a team leader, their own name IS the team leader name
                String orgRole         = body.getOrDefault("orgRole", "team_leader").toString();
                String teamLeaderName  = body.getOrDefault("teamLeaderName", "").toString().trim();
                if ("team_leader".equalsIgnoreCase(orgRole)) {
                    // Team leaders anchor the team — their teamLeaderName is their own name
                    user.put("teamLeaderName", name.trim());
                } else {
                    // Project managers register under their team leader's name
                    user.put("teamLeaderName", teamLeaderName);
                }
            }

            col.insertOne(user);

            Map<String, Object> response = new HashMap<>();
            response.put("id",             user.getObjectId("_id").toString());
            response.put("name",           name);
            response.put("email",          email);
            response.put("role",           user.getString("role"));
            response.put("orgRole",        user.getString("orgRole"));
            response.put("teamLeaderName", user.getString("teamLeaderName"));

            System.out.println(">>> SIGNUP: " + email + " | role: " + role + " | orgRole: " + user.getString("orgRole") + " | team: " + user.getString("teamLeaderName"));
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Registration failed");
        }
    }
}
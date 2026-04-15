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
 * Resolves team membership so users from the same company see the same projects.
 *
 * Team matching rule:
 *   All client users who share the same teamLeaderName (case-insensitive trim)
 *   are considered part of the same team.
 *
 * GET /api/team/members?userId={}
 *   Returns list of all user IDs in the same team as the given user.
 *
 * GET /api/team/client-ids?userId={}
 *   Returns a flat list of clientId strings to use in project/invoice queries.
 */
@RestController
@CrossOrigin(origins = "*")
public class TeamController {

    private static final MongoClient mongoClient = MongoClients.create(
        System.getenv().getOrDefault("MONGODB_URI", "mongodb://localhost:27017"));
    private static final String DB_NAME = "freelanceflow";

    /**
     * Returns all user IDs that belong to the same team as the requesting user.
     * Includes the requesting user themselves.
     */
    @GetMapping("/api/team/client-ids")
    public ResponseEntity<?> getTeamClientIds(@RequestParam String userId) {
        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> users = db.getCollection("users");

            // Find the requesting user
            Document me = findUserById(users, userId);
            if (me == null) return ResponseEntity.ok(List.of(userId)); // fallback: just self

            String myTeamLeader = me.getString("teamLeaderName");
            String myRole       = me.getString("orgRole");

            // If no teamLeaderName set, only see own projects
            if (myTeamLeader == null || myTeamLeader.trim().isEmpty()) {
                return ResponseEntity.ok(List.of(userId));
            }

            String myName = me.getString("name") != null ? me.getString("name").trim() : "";

            // Find all client users with the same teamLeaderName
            List<Document> teammates = users.find(Filters.and(
                Filters.in("role", "Client", "client"),
                Filters.regex("teamLeaderName", "(?i)^" + escapeRegex(myTeamLeader.trim()) + "$")
            )).into(new ArrayList<>());

            // Also find the team leader themselves (their name matches teamLeaderName)
            List<Document> leaders = users.find(Filters.and(
                Filters.in("role", "Client", "client"),
                Filters.regex("name", "(?i)^" + escapeRegex(myTeamLeader.trim()) + "$")
            )).into(new ArrayList<>());

            Set<String> ids = new LinkedHashSet<>();
            ids.add(userId); // always include self

            for (Document d : teammates) {
                ids.add(d.getObjectId("_id").toString());
            }
            for (Document d : leaders) {
                ids.add(d.getObjectId("_id").toString());
            }

            System.out.println(">>> TEAM IDs for " + userId + ": " + ids);
            return ResponseEntity.ok(new ArrayList<>(ids));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(List.of(userId));
        }
    }

    private Document findUserById(MongoCollection<Document> col, String id) {
        try { return col.find(Filters.eq("_id", new ObjectId(id))).first(); }
        catch (Exception e) { return col.find(Filters.eq("email", id)).first(); }
    }

    private String escapeRegex(String s) {
        return s.replaceAll("[.*+?^${}()|\\[\\]\\\\]", "\\\\$0");
    }
}
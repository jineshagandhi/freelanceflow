package com.freelanceflow.dao;

import com.freelanceflow.model.UserModel;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import org.bson.Document;

/**
 * Data Access Object for MongoDB.
 * Connects to the 'freelanceflow' database to fetch user credentials.
 * Uses a singleton MongoClient to avoid opening a new connection on every request.
 */
public class ClientDAO {

    private static final String URI = System.getenv().getOrDefault("MONGODB_URI", "mongodb://localhost:27017");
    private static final String DATABASE_NAME = "freelanceflow";
    private static final String COLLECTION_NAME = "users";

    // Singleton: one shared connection for the entire application lifetime
    private static final MongoClient mongoClient = MongoClients.create(URI);

    public UserModel validateAndGetUser(String email) {
        try {
            MongoDatabase database = mongoClient.getDatabase(DATABASE_NAME);
            MongoCollection<Document> collection = database.getCollection(COLLECTION_NAME);

            // Searches the 'users' collection for the email entered in the UI
            Document doc = collection.find(Filters.eq("email", email)).first();

            if (doc != null) {
                UserModel user = new UserModel();
                // Extracting values from the MongoDB Document
                user.setId(doc.getObjectId("_id").toString());
                user.setName(doc.getString("name"));
                user.setEmail(doc.getString("email"));
                user.setRole(doc.getString("role"));
                // CRITICAL: We MUST fetch the password to compare it in AuthController
                user.setPassword(doc.getString("password"));

                System.out.println("LOG: User found in DB - " + user.getEmail() + " | Role: " + user.getRole());
                return user;
            } else {
                System.out.println("LOG: No document found in MongoDB for email: " + email);
            }

        } catch (Exception e) {
            System.err.println("MongoDB Query Error: " + e.getMessage());
            e.printStackTrace();
        }

        return null;
    }
}
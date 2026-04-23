package com.freelanceflow.controller;

import com.freelanceflow.service.EmailService;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Updates;
import org.bson.Document;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * Handles the email-OTP verification flow:
 *   POST /api/auth/verify-otp  — confirms the code the user received
 *   POST /api/auth/resend-otp  — issues a fresh code if the old one expired
 */
@RestController
@CrossOrigin(origins = "*")
public class VerificationController {

    private static final MongoClient mongoClient = MongoClients.create("mongodb://localhost:27017");
    private static final String DB_NAME = "freelanceflow";

    private final EmailService emailService;

    public VerificationController(EmailService emailService) {
        this.emailService = emailService;
    }

    @PostMapping("/api/auth/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String otp   = body.get("otp");

        if (email == null || email.isEmpty()) return ResponseEntity.badRequest().body("Email is required");
        if (otp   == null || otp.isEmpty())   return ResponseEntity.badRequest().body("OTP is required");

        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> col = db.getCollection("users");

            Document user = col.find(Filters.eq("email", email)).first();
            if (user == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("No account found for this email");

            Boolean already = user.getBoolean("emailVerified");
            if (already != null && already) {
                // Idempotent — verifying an already-verified account is fine.
                return ResponseEntity.ok(Map.of("verified", true, "message", "Email already verified"));
            }

            String storedOtp = user.getString("verificationOtp");
            Date   expiresAt = user.getDate("otpExpiresAt");

            if (storedOtp == null || expiresAt == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("No OTP on record. Please request a new code.");
            }
            if (new Date().after(expiresAt)) {
                return ResponseEntity.status(HttpStatus.GONE)
                    .body("This OTP has expired. Please request a new code.");
            }
            if (!storedOtp.equals(otp.trim())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Incorrect OTP");
            }

            col.updateOne(
                Filters.eq("email", email),
                Updates.combine(
                    Updates.set("emailVerified", true),
                    Updates.unset("verificationOtp"),
                    Updates.unset("otpExpiresAt")
                )
            );

            System.out.println(">>> VERIFIED: " + email);

            Map<String, Object> response = new HashMap<>();
            response.put("verified", true);
            response.put("id",             user.getObjectId("_id").toString());
            response.put("name",           user.getString("name"));
            response.put("email",          user.getString("email"));
            response.put("role",           user.getString("role"));
            response.put("orgRole",        user.getString("orgRole")        != null ? user.getString("orgRole")        : "");
            response.put("teamLeaderName", user.getString("teamLeaderName") != null ? user.getString("teamLeaderName") : "");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Verification failed");
        }
    }

    @PostMapping("/api/auth/resend-otp")
    public ResponseEntity<?> resendOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isEmpty()) return ResponseEntity.badRequest().body("Email is required");

        try {
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> col = db.getCollection("users");

            Document user = col.find(Filters.eq("email", email)).first();
            if (user == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("No account found for this email");

            Boolean already = user.getBoolean("emailVerified");
            if (already != null && already) {
                return ResponseEntity.ok(Map.of("message", "Email already verified"));
            }

            String otp        = emailService.generateOtp();
            Date   otpExpires = emailService.computeExpiry();

            col.updateOne(
                Filters.eq("email", email),
                Updates.combine(
                    Updates.set("verificationOtp", otp),
                    Updates.set("otpExpiresAt",    otpExpires)
                )
            );

            emailService.sendOtpEmail(email, user.getString("name"), otp);

            Map<String, Object> response = new HashMap<>();
            response.put("sent",          true);
            response.put("email",         email);
            response.put("expiryMinutes", emailService.getOtpExpiryMinutes());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Could not resend OTP. Check SMTP settings.");
        }
    }
}

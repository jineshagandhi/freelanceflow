package com.freelanceflow.controller;

import com.freelanceflow.dao.ClientDAO;
import com.freelanceflow.model.UserModel;

public class AuthController {
    private ClientDAO clientDAO;

    public AuthController() {
        this.clientDAO = new ClientDAO();
    }

    public UserModel login(String email, String password, String role) {
        // Basic validation
        if (email == null || password == null || role == null || email.isEmpty()) {
            return null;
        }

        // 1. Fetch user document from MongoDB via DAO
        UserModel user = clientDAO.validateAndGetUser(email);

        // 2. Strict Comparison with Trim (to handle hidden spaces)
        if (user != null) {
            // Role is case-insensitive (Freelancer vs freelancer)
            boolean roleMatch = user.getRole().trim().equalsIgnoreCase(role.trim());
            // Password is case-sensitive (john123 vs John123)
            boolean passMatch = user.getPassword().trim().equals(password.trim());

            if (roleMatch && passMatch) {
                System.out.println("LOG: Authentication Successful for " + user.getName());
                return user;
            } else {
                System.out.println("LOG: Auth Failed. Role Match: " + roleMatch + " | Pass Match: " + passMatch);
            }
        } else {
            System.out.println("LOG: No user found with email: " + email);
        }

        return null;
    }
}
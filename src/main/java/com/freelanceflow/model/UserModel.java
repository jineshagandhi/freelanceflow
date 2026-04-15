package com.freelanceflow.model;

/**
 * Data Model for a User in the FreelanceFlow system.
 * This class matches the structure of your MongoDB 'users' collection.
 */
public class UserModel {
    private String id;
    private String name;
    private String email;
    private String password;
    private String role;
    private String avatar;

    // Default Constructor
    public UserModel() {}

    // Getters and Setters (Required for the DAO to work)
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }
}
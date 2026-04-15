package com.freelanceflow.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;
import java.util.Date;

@Document(collection = "projects")
public class Project {
    @Id
    private String id;
    private String title;
    private String summary;
    private String objectives;
    private String clientId;
    private String freelancerId;
    private String status; // Open, In-Progress, Completed
    private String category;
    private double budget;
    private String paymentType; // Fixed, Hourly
    private Date startDate;
    private Date endDate;
    private List<String> skills;
    private String location;
    private boolean remote;
    
    // Detailed Scope fields
    private List<String> deliverables;
    private List<String> tasks;
    private List<String> outOfScope;
    
    // Milestone sub-objects
    private List<Milestone> milestones;
    
    // Communication & Reporting
    private List<String> channels;
    private String frequency;

    public Project() {}

    // --- GETTERS AND SETTERS ---

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public double getBudget() { return budget; }
    public void setBudget(double budget) { this.budget = budget; }

    public Date getStartDate() { return startDate; }
    public void setStartDate(Date startDate) { this.startDate = startDate; }

    public Date getEndDate() { return endDate; }
    public void setEndDate(Date endDate) { this.endDate = endDate; }

    public List<String> getDeliverables() { return deliverables; }
    public void setDeliverables(List<String> deliverables) { this.deliverables = deliverables; }

    public List<Milestone> getMilestones() { return milestones; }
    public void setMilestones(List<Milestone> milestones) { this.milestones = milestones; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    // Inner class for Milestones
    public static class Milestone {
        private String id;
        private String title;
        private Date dueDate;
        private boolean completed;
        private double amount;

        public boolean isCompleted() { return completed; }
        public void setCompleted(boolean completed) { this.completed = completed; }
        public double getAmount() { return amount; }
        public void setAmount(double amount) { this.amount = amount; }
        
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
    }
}
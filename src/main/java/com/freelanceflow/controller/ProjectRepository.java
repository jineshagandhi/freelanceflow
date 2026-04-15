package com.freelanceflow.controller;

import com.freelanceflow.model.Project;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface ProjectRepository extends MongoRepository<Project, String> {
    
    // Used for the Freelancer Marketplace to see local projects
    List<Project> findByLocation(String location);

    // Used for the Client Portal to see their specific dashboard
    List<Project> findByClientId(String clientId);

    // Used for filtering by status (e.g., "In-Progress")
    List<Project> findByClientIdAndStatus(String clientId, String status);
}
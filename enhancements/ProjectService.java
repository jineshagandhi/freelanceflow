package com.freelanceflow.controller;

import com.freelanceflow.model.Project;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProjectService {

    /**
     * Calculates the percentage of completed milestones.
     * Uses the Milestone inner class from Project model.
     */
    public int calculateProgress(Project project) {
        if (project.getMilestones() == null || project.getMilestones().isEmpty()) {
            return 0;
        }

        // We use project.getMilestones().size() to avoid division by zero
        int totalMilestones = project.getMilestones().size();
        
        long completedCount = project.getMilestones().stream()
                .filter(Project.Milestone::isCompleted)
                .count();

        return (int) ((completedCount * 100) / totalMilestones);
    }

    /**
     * Filters a list to return only projects that are not yet completed.
     */
    public List<Project> getIncompleteProjects(List<Project> projects) {
        if (projects == null) {
            return List.of();
        }
        
        return projects.stream()
                .filter(p -> !"Completed".equalsIgnoreCase(p.getStatus()))
                .collect(Collectors.toList());
    }
}
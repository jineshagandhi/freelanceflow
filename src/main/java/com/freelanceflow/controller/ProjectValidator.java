package com.freelanceflow.controller;

import com.freelanceflow.model.Project;

/**
 * Full implementation of project submission validation.
 * Replaces the 'isStepValid' logic in CreateProject.tsx.
 */
public class ProjectValidator {

    public boolean validateProjectSubmission(Project project) {
        if (project == null) return false;

        // Step 1: Core Details Validation
        if (project.getTitle() == null || project.getTitle().length() < 5) return false;
        if (project.getSummary() == null || project.getSummary().length() < 20) return false;

        // Step 2: Scope Validation
        if (project.getDeliverables() == null || project.getDeliverables().isEmpty()) return false;

        // Step 3: Timeline & Budget
        if (project.getStartDate() == null || project.getEndDate() == null) return false;
        if (project.getBudget() <= 0) return false;

        // Ensure end date is after start date
        if (project.getEndDate().before(project.getStartDate())) return false;

        return true;
    }
}
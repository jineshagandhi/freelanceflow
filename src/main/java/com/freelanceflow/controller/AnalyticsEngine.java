package com.freelanceflow.controller;

import com.freelanceflow.model.Project;
import java.util.Date;
import java.util.concurrent.TimeUnit;
import java.util.List;

/**
 * Implements rule-based intelligence inspired by AI systems.
 * Pure Core Java logic without external frameworks.
 */
public class AnalyticsEngine {

    /**
     * Logic: Score = 100 - (Average payment delay × 2) - (Overdue invoices × 5)
     */
    public int calculateReliabilityScore(int avgDelayDays, int overdueCount) {
        int score = 100 - (avgDelayDays * 2) - (overdueCount * 5);
        return Math.max(0, Math.min(100, score));
    }

    /**
     * Rule-Based Risk Prediction:
     * If clientScore < 50 and daysLeft < 7 → High Risk
     */
    public String predictDeadlineRisk(int clientScore, Date endDate) {
        if (endDate == null) return "Low";

        long diffInMillies = endDate.getTime() - new Date().getTime();
        long daysLeft = TimeUnit.DAYS.convert(diffInMillies, TimeUnit.MILLISECONDS);

        if (clientScore < 50 && daysLeft < 7) {
            return "High Risk";
        } else if (clientScore < 70) {
            return "Medium Risk";
        } else {
            return "Low Risk";
        }
    }

    /**
     * Predicts next month's income based on project averages.
     */
    public double predictNextMonthIncome(List<Double> lastThreeMonths) {
        if (lastThreeMonths == null || lastThreeMonths.isEmpty()) return 0.0;
        
        double sum = 0;
        for (double val : lastThreeMonths) {
            sum += val;
        }
        return sum / lastThreeMonths.size();
    }
}
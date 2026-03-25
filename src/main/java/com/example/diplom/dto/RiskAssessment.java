package com.example.diplom.dto;

public record RiskAssessment(
    ExtractedItem item,
    double marketPrice,
    double deviationPercentage,
    boolean isHighRisk
) {}

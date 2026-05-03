package com.example.diplom.dto;

import java.util.List;

public record RiskAssessment(
    ExtractedItem item,
    double marketPrice,
    String marketSource,
    double deviationPercentage,
    boolean isHighRisk,
    List<MarketComparison> allIndicators
) {}

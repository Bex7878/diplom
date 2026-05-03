package com.example.diplom.dto;

import java.math.BigDecimal;
import java.util.List;

public record LotAnalysisResult(
    String lotId,
    String truName,
    String customerBin,
    BigDecimal unitPrice,
    BigDecimal quantity,
    String unit,
    BigDecimal totalSum,
    double marketPrice,
    String marketSource,
    double deviationPercentage,
    boolean isHighRisk,
    List<MarketComparison> allIndicators
) {}

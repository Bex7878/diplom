package com.example.diplom.dto;

public record MarketComparison(
    double price,
    String source,
    double deviation,
    boolean isHighRisk
) {}

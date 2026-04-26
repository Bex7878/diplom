package com.example.diplom.dto;

public record AnalysisRequest(String text, Double threshold) {
    public AnalysisRequest(String text) {
        this(text, null);
    }
}

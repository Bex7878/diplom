package com.example.diplom.service;

import com.example.diplom.dto.AnalysisRequest;
import com.example.diplom.dto.ExtractedItem;
import com.example.diplom.dto.RiskAssessment;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Service
public class AnalysisService {

    private final RestTemplate restTemplate;
    // URL for the Python NLP Microservice
    private final String nlpServiceUrl = "http://localhost:8000/extract";

    public AnalysisService() {
        this.restTemplate = new RestTemplate();
    }

    public List<RiskAssessment> analyzeContract(String contractText) {
        // 1. Call Python FastAPI /extract endpoint
        AnalysisRequest request = new AnalysisRequest(contractText);
        
        ResponseEntity<ExtractedItem[]> response;
        try {
            response = restTemplate.postForEntity(nlpServiceUrl, request, ExtractedItem[].class);
        } catch (Exception e) {
            System.err.println("Failed to connect to NLP service: " + e.getMessage());
            return Collections.emptyList();
        }

        //something
        ExtractedItem[] items = response.getBody();
        if (items == null) {
            return Collections.emptyList();
        }

        // 2. Mock comparison with database for market price
        // In a real application, you would query the market_indicators table here
        return Arrays.stream(items).map(item -> {
            // Mocking a baseline market price
            double marketPrice = 950.00; 
            
            // Calculate deviation: ((contract_price - market_price) / market_price) * 100
            double deviation = ((item.price() - marketPrice) / marketPrice) * 100;
            boolean isHighRisk = deviation > 20.0; // 20% threshold
            
            return new RiskAssessment(item, marketPrice, deviation, isHighRisk);
        }).toList();
    }
}

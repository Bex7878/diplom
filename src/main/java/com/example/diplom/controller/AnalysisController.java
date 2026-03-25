package com.example.diplom.controller;

import com.example.diplom.dto.AnalysisRequest;
import com.example.diplom.dto.RiskAssessment;
import com.example.diplom.service.AnalysisService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/analysis")
@CrossOrigin(origins = "*") // Allow React frontend to connect locally
public class AnalysisController {

    private final AnalysisService analysisService;

    public AnalysisController(AnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    @PostMapping("/spot-check")
    public List<RiskAssessment> spotCheck(@RequestBody AnalysisRequest request) {
        return analysisService.analyzeContract(request.text());
    }
}

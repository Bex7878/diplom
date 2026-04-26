package com.example.diplom.controller;

import com.example.diplom.service.AnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminController {

    private final AnalysisService analysisService;

    @PostMapping("/trigger-scraper")
    public Map<String, Object> triggerScraper(@RequestBody(required = false) Map<String, String> body) {
        String cookie = (body != null) ? body.get("cookie") : null;
        return analysisService.triggerScraper(cookie);
    }
}

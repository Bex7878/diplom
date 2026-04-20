package com.example.diplom.controller;

import com.example.diplom.service.DataIngestionScheduler;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/scheduler")
@RequiredArgsConstructor
public class SchedulerController {

    private final DataIngestionScheduler scheduler;

//    @PostMapping("/ingest-contracts")
//    public ResponseEntity<?> triggerIngestContracts() {
//        scheduler.ingestGoszakupContracts();
//        return ResponseEntity.ok(Map.of("message", "Goszakup contracts ingestion triggered successfully"));
//    }
//
//    @PostMapping("/ingest-prices")
//    public ResponseEntity<?> triggerIngestPrices() {
//        scheduler.ingestMarketplacePrices();
//        return ResponseEntity.ok(Map.of("message", "Marketplace prices ingestion triggered successfully"));
//    }

    @PostMapping("/run-scraper")
    public ResponseEntity<?> triggerRunScraper() {
        scheduler.runGoszakupScraper();
        return ResponseEntity.ok(Map.of("message", "Goszakup scraper triggered successfully"));
    }
}

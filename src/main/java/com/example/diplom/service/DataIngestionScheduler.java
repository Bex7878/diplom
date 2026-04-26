package com.example.diplom.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class DataIngestionScheduler {

    private static final Logger logger = LoggerFactory.getLogger(DataIngestionScheduler.class);
    private final RestTemplate restTemplate;
    private final AnalysisService analysisService;

    @Value("${PYTHON_BASE_URL:http://localhost:8000}")
    private String pythonBaseUrl;

    public DataIngestionScheduler(RestTemplate restTemplate, AnalysisService analysisService) {
        this.restTemplate = restTemplate;
        this.analysisService = analysisService;
    }

    /**
     * Task 1: Fetch data from the Mock Goszakup API every 60 seconds.
     * Extracts entities using NLP and saves them to the database.
     */
//    @Scheduled(fixedRate = 60000)
//    public void ingestGoszakupContracts() {
//        logger.info("Starting scheduled ingestion from Goszakup API...");
//        String url = pythonBaseUrl + "/mock-api/goszakup/v3/contracts/recent";
//
//        try {
//            List<Map<String, Object>> contracts = restTemplate.getForObject(url, List.class);
//
//            if (contracts != null) {
//                logger.info("Received {} contracts from Goszakup Mock API", contracts.size());
//                for (Map<String, Object> contract : contracts) {
//                    String spec = (String) contract.get("contract_specification");
//                    String bin = (String) contract.get("supplier_bin");
//
//                    logger.info("Ingesting contract {} (BIN: {}). Specification: {}",
//                            contract.get("id"), bin, spec);
//
//                    // Call AnalysisService to perform NLP extraction and save everything to DB
//                    analysisService.analyzeAndSaveContract(spec, bin);
//                }
//                logger.info("Successfully processed and saved {} contracts.", contracts.size());
//            }
//        } catch (Exception e) {
//            logger.error("Error during Goszakup data ingestion: {}", e.getMessage());
//        }
//    }

    /**
     * Task 2: Fetch market prices from the Mock Marketplace API every 120 seconds.
     * Updates market_indicators table with latest prices.
     */
//    @Scheduled(fixedRate = 120000)
//    public void ingestMarketplacePrices() {
//        logger.info("Starting scheduled ingestion from Marketplace API...");
//        String[] keywords = {"Бумага", "Ноутбук", "Принтер", "Кресло"};
//
//        for (String keyword : keywords) {
//            String url = pythonBaseUrl + "/mock-api/marketplace/search?q=" + keyword;
//            try {
//                Map<String, Object> response = restTemplate.getForObject(url, Map.class);
//                if (response != null && response.containsKey("data")) {
//                    List<Map<String, Object>> dataList = (List<Map<String, Object>>) response.get("data");
//                    if (!dataList.isEmpty()) {
//                        Object priceObj = dataList.getFirst().get("average_market_price");
//                        double price;
//                        if (priceObj instanceof Integer) {
//                            price = ((Integer) priceObj).doubleValue();
//                        } else {
//                            price = (Double) priceObj;
//                        }
//
//                        logger.info("Updating market price for '{}': {} KZT (Source: {})",
//                                keyword, price, response.get("source"));
//
//                        // Update market_indicators table using AnalysisService
//                        analysisService.updateMarketPrice(keyword, price);
//                    }
//                }
//            } catch (Exception e) {
//                logger.error("Error fetching market price for '{}': {}", keyword, e.getMessage());
//            }
//        }
//        logger.info("Marketplace price ingestion completed.");
//    }

    /**
     * Task 3: Trigger the Goszakup Scraper every 5 minutes.
     * Fetches real lot data from the Python Scraper service.
     */
    @Scheduled(fixedRate = 300000) // 5 minutes
    public void runGoszakupScraper() {
        logger.info("Starting scheduled Goszakup Scraper...");
        analysisService.triggerScraper(null);
    }
}

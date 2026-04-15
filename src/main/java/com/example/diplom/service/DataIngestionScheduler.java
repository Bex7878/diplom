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

    @Value("${PYTHON_BASE_URL}")
    private String pythonBaseUrl;

    public DataIngestionScheduler(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Task 1: Fetch data from the Mock Goszakup API every 60 seconds.
     */
    @Scheduled(fixedRate = 60000)
    public void ingestGoszakupContracts() {
        logger.info("Starting scheduled ingestion from Goszakup API...");
        String url = pythonBaseUrl + "/mock-api/goszakup/v3/contracts/recent";
        
        try {
            List<Map<String, Object>> contracts = restTemplate.getForObject(url, List.class);
            
            if (contracts != null) {
                logger.info("Received {} contracts from Goszakup Mock API", contracts.size());
                for (Map<String, Object> contract : contracts) {
                    logger.info("Contract ID: {}, Specification: {}", contract.get("id"), contract.get("contract_specification"));
                    
                    // TODO: Implement NLP extraction logic calling python-nlp:8000/extract
                    // TODO: Save extracted items to the database using ExtractedItemRepository
                }
            }
        } catch (Exception e) {
            logger.error("Error during Goszakup data ingestion: {}", e.getMessage());
        }
    }

    /**
     * Task 2: Fetch market prices from the Mock Marketplace API every 120 seconds.
     */
    @Scheduled(fixedRate = 120000)
    public void ingestMarketplacePrices() {
        logger.info("Starting scheduled ingestion from Marketplace API...");
        String[] keywords = {"Бумага", "Ноутбук", "Принтер", "Кресло"};
        
        for (String keyword : keywords) {
            String url = pythonBaseUrl + "/mock-api/marketplace/search?q=" + keyword;
            try {
                Map<String, Object> response = restTemplate.getForObject(url, Map.class);
                if (response != null && response.containsKey("data")) {
                    List<Map<String, Object>> dataList = (List<Map<String, Object>>) response.get("data");
                    if (!dataList.isEmpty()) {
                        Double price = (Double) dataList.get(0).get("average_market_price");
                        logger.info("Market price for '{}': {} KZT (Source: {})", 
                                keyword, price, response.get("source"));
                        
                        // TODO: Update market_indicators table with the latest price for the keyword
                    }
                }
            } catch (Exception e) {
                logger.error("Error fetching market price for '{}': {}", keyword, e.getMessage());
            }
        }
    }
}

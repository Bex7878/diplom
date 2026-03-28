package com.example.diplom.service;

import com.example.diplom.dto.AnalysisRequest;
import com.example.diplom.dto.ExtractedItem;
import com.example.diplom.dto.RiskAssessment;
import com.example.diplom.model.*;
import com.example.diplom.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AnalysisService {

    private final RestTemplate restTemplate;
    private final ContractRepository contractRepository;
    private final ExtractedItemRepository extractedItemRepository;
    private final MarketIndicatorRepository marketIndicatorRepository;
    private final BenchmarkLogRepository benchmarkLogRepository;
    
    private final String nlpServiceUrl = "http://localhost:8000/extract";

    @Transactional
    public List<RiskAssessment> analyzeAndSaveContract(String contractText, String bin) {
        // 1. Извлечение данных через Python NLP сервис
        AnalysisRequest request = new AnalysisRequest(contractText);
        ResponseEntity<ExtractedItem[]> response;
        try {
            response = restTemplate.postForEntity(nlpServiceUrl, request, ExtractedItem[].class);
        } catch (Exception e) {
            throw new RuntimeException("NLP service unavailable: " + e.getMessage());
        }

        ExtractedItem[] items = response.getBody();
        if (items == null) return Collections.emptyList();

        // 2. Создание и сохранение записи о контракте
        Contract contract = Contract.builder()
                .bin(bin)
                .date(LocalDate.now())
                .extractedItems(new ArrayList<>())
                .build();
        contract = contractRepository.save(contract);

        List<RiskAssessment> assessments = new ArrayList<>();

        for (ExtractedItem item : items) {
            ExtractedItemEntity itemEntity = ExtractedItemEntity.builder()
                    .contract(contract)
                    .itemName(item.itemName())
                    .qty(BigDecimal.valueOf(item.qty()))
                    .unit(item.unit())
                    .price(BigDecimal.valueOf(item.price()))
                    .build();
            itemEntity = extractedItemRepository.save(itemEntity);
            
            Optional<MarketIndicator> indicatorOpt = marketIndicatorRepository
                    .findFirstByItemNameIgnoreCaseOrderByTimestampDesc(item.itemName());

            BigDecimal marketPrice = indicatorOpt.map(MarketIndicator::getBaselinePrice)
                    .orElse(BigDecimal.valueOf(1000.00));

            BigDecimal contractPrice = BigDecimal.valueOf(item.price());
            BigDecimal deviation = contractPrice.subtract(marketPrice)
                    .divide(marketPrice, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));

            boolean isHighRisk = deviation.compareTo(BigDecimal.valueOf(20)) > 0;

            BenchmarkLog log = BenchmarkLog.builder()
                    .extractedItem(itemEntity)
                    .marketIndicator(indicatorOpt.orElse(null))
                    .deviationPercentage(deviation)
                    .similarityScore(BigDecimal.ONE)
                    .build();
            
            benchmarkLogRepository.save(log);

            assessments.add(new RiskAssessment(item, marketPrice.doubleValue(), deviation.doubleValue(), isHighRisk));
        }

        return assessments;
    }

    public List<Contract> getAllContracts() {
        return contractRepository.findAll();
    }

    public List<BenchmarkLog> getHighRiskOperations() {
        return benchmarkLogRepository.findByDeviationPercentageGreaterThan(BigDecimal.valueOf(20));
    }
    
    @Transactional
    public MarketIndicator updateMarketPrice(String itemName, double price) {
        MarketIndicator indicator = MarketIndicator.builder()
                .itemName(itemName)
                .baselinePrice(BigDecimal.valueOf(price))
                .build();
        return marketIndicatorRepository.save(indicator);
    }
}

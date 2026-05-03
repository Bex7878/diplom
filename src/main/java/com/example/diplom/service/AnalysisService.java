package com.example.diplom.service;

import com.example.diplom.dto.*;
import com.example.diplom.model.*;
import com.example.diplom.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(AnalysisService.class);
    private final RestTemplate restTemplate;
    private final ContractRepository contractRepository;
    private final ExtractedItemRepository extractedItemRepository;
    private final MarketIndicatorRepository marketIndicatorRepository;
    private final BenchmarkLogRepository benchmarkLogRepository;
    private final ParsedLotRepository parsedLotRepository;

    @Value("${NLP_SERVICE_URL:http://localhost:8000/extract}")
    private String nlpServiceUrl;

    @Value("${PYTHON_BASE_URL:http://localhost:8000}")
    private String pythonBaseUrl;

    @Transactional
    public Map<String, Object> triggerScraper(String sessionCookie) {
        String url = pythonBaseUrl + "/api/scrape";
        if (sessionCookie != null && !sessionCookie.isBlank()) {
            url += "?session_cookie=" + sessionCookie;
        }

        try {
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response != null && "success".equals(response.get("status"))) {
                List<Map<String, Object>> data = (List<Map<String, Object>>) response.get("data");
                if (data != null) {
                    logger.info("Scraper found {} lots. Saving to database...", data.size());
                    for (Map<String, Object> lot : data) {
                        try {
                            saveParsedLot(lot);
                        } catch (Exception e) {
                            logger.error("Не удалось сохранить лот: " + lot.get("lot_id") + ". Ошибка: " + e.getMessage());
                        }
                    }
                    return Map.of("status", "success", "count", data.size());
                }
            }
            return Map.of("status", "error", "message", "Scraper returned non-success status");
        } catch (Exception e) {
            logger.error("Error running Goszakup Scraper: {}", e.getMessage());
            return Map.of("status", "error", "message", e.getMessage());
        }
    }

    private Optional<MarketIndicator> findIndicatorByName(String name) {
        if (name == null || name.isBlank()) return Optional.empty();
        String cleanName = name.trim().toLowerCase();
        Optional<MarketIndicator> found;
        found = marketIndicatorRepository.findFirstByItemNameRuOrderByTimestampDesc(cleanName);
        if (found.isPresent()) return found;
        found = marketIndicatorRepository.findFirstByItemNameKkOrderByTimestampDesc(cleanName);
        if (found.isPresent()) return found;
        return marketIndicatorRepository.findFirstByItemNameEnOrderByTimestampDesc(cleanName);
    }

    private List<MarketIndicator> findAllIndicators(String name) {
        if (name == null || name.isBlank()) return List.of();
        String cleanName = name.trim().toLowerCase();
        List<MarketIndicator> exact = marketIndicatorRepository.findAllByExactName(cleanName);
        if (!exact.isEmpty()) return exact;
        return marketIndicatorRepository.findMatchingByNameContainedIn(cleanName);
    }

    private List<MarketComparison> buildComparisons(
            List<MarketIndicator> indicators, BigDecimal contractPrice, BigDecimal riskThreshold) {
        return indicators.stream().map(ind -> {
            BigDecimal mp = ind.getBaselinePrice();
            BigDecimal dev = contractPrice.subtract(mp)
                    .divide(mp, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            return new MarketComparison(
                    mp.doubleValue(),
                    ind.getSource() != null ? ind.getSource().name() : "UNKNOWN",
                    dev.doubleValue(),
                    dev.compareTo(riskThreshold) > 0
            );
        }).toList();
    }

    private BigDecimal calculateAverageMarketPrice(String itemName) {
        if (itemName == null || itemName.isBlank()) {
            return BigDecimal.valueOf(1000.00);
        }

        List<ParsedLot> historicalLots = parsedLotRepository.findByTruNameContainingIgnoreCase(itemName.trim());

        if (historicalLots.isEmpty()) {
            return BigDecimal.valueOf(1000.00);
        }

        List<BigDecimal> prices = historicalLots.stream()
                .map(ParsedLot::getUnitPrice)
                .filter(Objects::nonNull)
                .toList();

        if (prices.isEmpty()) {
            return BigDecimal.valueOf(1000.00);
        }

        BigDecimal sum = prices.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return sum.divide(BigDecimal.valueOf(prices.size()), 2, RoundingMode.HALF_UP);
    }

    @Transactional
    public List<RiskAssessment> analyzeAndSaveContract(String contractText, String bin, Double threshold) {
        // 1. Извлечение данных через Python NLP сервис
        AnalysisRequest nlpRequest = new AnalysisRequest(contractText);
        ResponseEntity<ExtractedItem[]> response;
        try {
            response = restTemplate.postForEntity(nlpServiceUrl, nlpRequest, ExtractedItem[].class);
        } catch (Exception e) {
            throw new RuntimeException("NLP service unavailable: " + e.getMessage());
        }

        ExtractedItem[] items = response.getBody();
        if (items == null) return Collections.emptyList();

        // Порог риска по умолчанию
        BigDecimal riskThreshold = (threshold != null) ? BigDecimal.valueOf(threshold) : BigDecimal.valueOf(20);

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

            // 3. Поиск всех подходящих market_indicators, иначе историческое среднее
            List<MarketIndicator> indicators = findAllIndicators(item.itemName());
            BigDecimal contractPrice = BigDecimal.valueOf(item.price());
            BigDecimal marketPrice;
            String marketSource;
            List<MarketComparison> allComparisons;

            if (!indicators.isEmpty()) {
                marketPrice = indicators.get(0).getBaselinePrice();
                marketSource = "market_indicator";
                allComparisons = buildComparisons(indicators, contractPrice, riskThreshold);
            } else {
                marketPrice = calculateAverageMarketPrice(item.itemName());
                marketSource = "historical_average";
                allComparisons = List.of();
            }

            if (marketPrice.compareTo(BigDecimal.valueOf(0.01)) < 0) {
                marketPrice = BigDecimal.valueOf(0.01);
            }

            // 4. Вычисление отклонения по основной цене
            BigDecimal deviation = contractPrice.subtract(marketPrice)
                    .divide(marketPrice, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));

            boolean isHighRisk = deviation.compareTo(riskThreshold) > 0;

            // 5. Сохранение лога бенчмарка
            BenchmarkLog log = BenchmarkLog.builder()
                    .extractedItem(itemEntity)
                    .marketIndicator(null)
                    .deviationPercentage(deviation)
                    .similarityScore(BigDecimal.ONE)
                    .build();
            benchmarkLogRepository.save(log);

            assessments.add(new RiskAssessment(item, marketPrice.doubleValue(), marketSource, deviation.doubleValue(), isHighRisk, allComparisons));
        }

        return assessments;
    }

    @Transactional(readOnly = true)
    public LotAnalysisResult analyzeByLotId(String lotId, Double threshold) {
        ParsedLot lot = parsedLotRepository.findByLotId(lotId)
                .orElseThrow(() -> new RuntimeException("Лот не найден: " + lotId));

        BigDecimal riskThreshold = threshold != null
                ? BigDecimal.valueOf(threshold)
                : BigDecimal.valueOf(20);

        // 1. Найти все подходящие market_indicators
        List<MarketIndicator> indicators = findAllIndicators(lot.getTruName());

        BigDecimal lotPrice = lot.getUnitPrice() != null ? lot.getUnitPrice() : BigDecimal.ZERO;
        BigDecimal marketPrice;
        String marketSource;
        List<MarketComparison> allComparisons;

        if (!indicators.isEmpty()) {
            marketPrice = indicators.get(0).getBaselinePrice();
            marketSource = "market_indicator";
            allComparisons = buildComparisons(indicators, lotPrice, riskThreshold);
        } else {
            marketPrice = calculateAverageMarketPrice(lot.getTruName());
            marketSource = "historical_average";
            allComparisons = List.of();
        }

        if (marketPrice.compareTo(BigDecimal.valueOf(0.01)) < 0) {
            marketPrice = BigDecimal.valueOf(0.01);
        }

        BigDecimal deviation = lotPrice.subtract(marketPrice)
                .divide(marketPrice, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));

        boolean isHighRisk = deviation.compareTo(riskThreshold) > 0;

        return new LotAnalysisResult(
                lot.getLotId(),
                lot.getTruName(),
                lot.getCustomerBin(),
                lotPrice,
                lot.getQuantity(),
                lot.getUnit(),
                lot.getTotalSum(),
                marketPrice.doubleValue(),
                marketSource,
                deviation.doubleValue(),
                isHighRisk,
                allComparisons
        );
    }

    public List<Contract> getAllContracts() {
        return contractRepository.findAll();
    }

    public List<BenchmarkLog> getHighRiskOperations(Double threshold) {
        BigDecimal riskThreshold = (threshold != null) ? BigDecimal.valueOf(threshold) : BigDecimal.valueOf(20);
        return benchmarkLogRepository.findByDeviationPercentageGreaterThan(riskThreshold);
    }
    
    @Transactional
    public MarketIndicator updateMarketPrice(String itemName, double price) {
        Optional<MarketIndicator> existingOpt = findIndicatorByName(itemName);

        MarketIndicator indicator;
        if (existingOpt.isPresent()) {
            indicator = existingOpt.get();
            indicator.setBaselinePrice(BigDecimal.valueOf(price));
        } else {
            indicator = MarketIndicator.builder()
                    .itemNameRu(itemName != null ? itemName.trim().toLowerCase() : null)
                    .itemNameKk(null)
                    .itemNameEn(null)
                    .baselinePrice(BigDecimal.valueOf(price))
                    .source(com.example.diplom.enums.MarketSource.MANUAL)
                    .build();
        }

        return marketIndicatorRepository.save(indicator);
    }

    @Transactional
    public void saveParsedLot(Map<String, Object> lotData) {
        String lotId = (String) lotData.get("lot_id");
        if (lotId == null || parsedLotRepository.existsByLotId(lotId)) {
            return;
        }

        ParsedLot lot = ParsedLot.builder()
                .lotId(lotId)
                .customerBin((String) lotData.get("customer_bin"))
                .truName((String) lotData.get("tru_name"))
                .description((String) lotData.get("description"))
                .unitPrice(toBigDecimal(lotData.get("unit_price")))
                .unit((String) lotData.get("unit"))
                .quantity(toBigDecimal(lotData.get("quantity")))
                .totalSum(toBigDecimal(lotData.get("total_sum")))
                .build();

        parsedLotRepository.save(lot);
    }

    private BigDecimal toBigDecimal(Object val) {
        if (val == null) return BigDecimal.ZERO;
        if (val instanceof Number) {
            return BigDecimal.valueOf(((Number) val).doubleValue());
        }
        try {
            return new BigDecimal(val.toString());
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }
}

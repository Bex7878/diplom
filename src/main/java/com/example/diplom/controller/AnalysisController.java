package com.example.diplom.controller;

import com.example.diplom.dto.AnalysisRequest;
import com.example.diplom.dto.LotAnalysisResult;
import com.example.diplom.dto.RiskAssessment;
import com.example.diplom.model.BenchmarkLog;
import com.example.diplom.model.Contract;
import com.example.diplom.model.MarketIndicator;
import com.example.diplom.service.AnalysisService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analysis")
@CrossOrigin(origins = "*")
public class AnalysisController {

    private final AnalysisService analysisService;

    public AnalysisController(AnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    // Проверка текста контракта и сохранение в БД
    @PostMapping("/spot-check")
    public List<RiskAssessment> spotCheck(@RequestBody AnalysisRequest request, 
                                          @RequestParam(defaultValue = "000000000000") String bin) {
        return analysisService.analyzeAndSaveContract(request.text(), bin, request.threshold());
    }

    // Получить историю всех проверенных контрактов
    @GetMapping("/contracts")
    public List<Contract> getHistory() {
        return analysisService.getAllContracts();
    }

    // Получить детальные результаты конкретного анализа по его ID
    @GetMapping("/contracts/{id}")
    public List<RiskAssessment> getContractDetails(@PathVariable Long id) {
        return analysisService.getContractResults(id);
    }

    // Получить только рискованные операции
    @GetMapping("/risks")
    public List<BenchmarkLog> getRisks(@RequestParam(required = false) Double threshold) {
        return analysisService.getHighRiskOperations(threshold);
    }

    // Получить топ-10 рисков
    @GetMapping("/top-risks")
    public List<BenchmarkLog> getTopRisks() {
        return analysisService.getTop10Risks();
    }

    // Анализ лота из parsed_lots по lot_id с сравнением с market_indicators
    @GetMapping("/analyze-lot")
    public ResponseEntity<?> analyzeLot(
            @RequestParam String lotId,
            @RequestParam(required = false) Double threshold) {
        try {
            LotAnalysisResult result = analysisService.analyzeByLotId(lotId, threshold);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Обновить или добавить рыночную цену для товара
    @PostMapping("/market-data")
    public MarketIndicator updateMarketData(@RequestParam String itemName, @RequestParam double price) {
        return analysisService.updateMarketPrice(itemName, price);
    }
}

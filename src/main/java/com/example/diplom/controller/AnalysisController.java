package com.example.diplom.controller;

import com.example.diplom.dto.AnalysisRequest;
import com.example.diplom.dto.RiskAssessment;
import com.example.diplom.model.BenchmarkLog;
import com.example.diplom.model.Contract;
import com.example.diplom.model.MarketIndicator;
import com.example.diplom.service.AnalysisService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
        return analysisService.analyzeAndSaveContract(request.text(), bin);
    }

    // Получить историю всех проверенных контрактов
    @GetMapping("/contracts")
    public List<Contract> getHistory() {
        return analysisService.getAllContracts();
    }

    // Получить только рискованные операции
    @GetMapping("/risks")
    public List<BenchmarkLog> getRisks() {
        return analysisService.getHighRiskOperations();
    }

    // Обновить или добавить рыночную цену для товара
    @PostMapping("/market-data")
    public MarketIndicator updateMarketData(@RequestParam String itemName, @RequestParam double price) {
        return analysisService.updateMarketPrice(itemName, price);
    }
}

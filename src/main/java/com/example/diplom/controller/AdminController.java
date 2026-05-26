package com.example.diplom.controller;

import com.example.diplom.dto.ExcelImportResult;
import com.example.diplom.enums.MarketSource;
import com.example.diplom.service.AnalysisService;
import com.example.diplom.service.ExcelImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminController {

    private final AnalysisService analysisService;
    private final ExcelImportService excelImportService;
    private final com.example.diplom.repository.UserRepository userRepository;

    @PostMapping(value = "/import-excel", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ExcelImportResult importExcel(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "source", defaultValue = "IMPORT") String source) throws IOException {
        MarketSource marketSource;
        try {
            marketSource = MarketSource.valueOf(source.toUpperCase());
        } catch (IllegalArgumentException e) {
            marketSource = MarketSource.IMPORT;
        }
        return excelImportService.importFromExcel(file, marketSource);
    }

    @PostMapping("/trigger-scraper")
    public Map<String, Object> triggerScraper(@RequestBody(required = false) Map<String, Object> body) {
        String cookie = (body != null) ? (String) body.get("cookie") : null;
        Integer pages = (body != null && body.get("pages") instanceof Number n) ? n.intValue() : 3;
        Integer records = (body != null && body.get("records_per_page") instanceof Number n) ? n.intValue() : 50;
        return analysisService.triggerScraper(cookie, pages, records);
    }

    @PostMapping("/goszakup-login")
    public Map<String, Object> goszakupLogin(@RequestBody Map<String, String> body) {
        String iin      = body.get("iin");
        String password = body.get("password");
        if (iin == null || password == null) {
            return Map.of("status", "error", "message", "iin and password required");
        }
        return analysisService.loginToGoszakup(iin, password);
    }

    @GetMapping("/users")
    public java.util.List<com.example.diplom.model.User> getAllUsers() {
        return userRepository.findAll().stream()
                .peek(user -> user.setPassword(null)) // Hide hashed passwords
                .toList();
    }

    @PutMapping("/users/{id}/role")
    public com.example.diplom.model.User updateUserRole(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String newRole = body.get("role");
        com.example.diplom.model.User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setRole(newRole);
        return userRepository.save(user);
    }

    @DeleteMapping("/users/{id}")
    public Map<String, String> deleteUser(@PathVariable Long id) {
        userRepository.deleteById(id);
        return Map.of("message", "User deleted successfully");
    }
}

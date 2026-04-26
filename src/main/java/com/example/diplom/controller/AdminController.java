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
    private final com.example.diplom.repository.UserRepository userRepository;

    @PostMapping("/trigger-scraper")
    public Map<String, Object> triggerScraper(@RequestBody(required = false) Map<String, String> body) {
        String cookie = (body != null) ? body.get("cookie") : null;
        return analysisService.triggerScraper(cookie);
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

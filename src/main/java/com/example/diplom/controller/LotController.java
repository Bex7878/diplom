package com.example.diplom.controller;

import com.example.diplom.model.ParsedLot;
import com.example.diplom.repository.ParsedLotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lots")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LotController {

    private final ParsedLotRepository parsedLotRepository;

    @GetMapping("/search")
    public List<ParsedLot> searchLots(@RequestParam(value = "query", required = false) String query) {
        if (query == null || query.isBlank()) {
            return parsedLotRepository.findAll();
        }
        return parsedLotRepository.searchLots(query);
    }
}

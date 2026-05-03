package com.example.diplom.controller;

import com.example.diplom.model.ParsedLot;
import com.example.diplom.repository.ParsedLotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/lots")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LotController {

    private final ParsedLotRepository parsedLotRepository;

    @GetMapping("/search")
    public Page<ParsedLot> searchLots(
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        if (query == null || query.isBlank()) {
            return parsedLotRepository.findAll(pageable);
        }
        return parsedLotRepository.searchLots(query, pageable);
    }
}

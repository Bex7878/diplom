package com.example.diplom.repository;

import com.example.diplom.model.ParsedLot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ParsedLotRepository extends JpaRepository<ParsedLot, Long> {
    Optional<ParsedLot> findByLotId(String lotId);
    boolean existsByLotId(String lotId);
}

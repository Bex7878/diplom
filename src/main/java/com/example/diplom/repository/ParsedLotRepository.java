package com.example.diplom.repository;

import com.example.diplom.model.ParsedLot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParsedLotRepository extends JpaRepository<ParsedLot, Long> {
    Optional<ParsedLot> findByLotId(String lotId);
    boolean existsByLotId(String lotId);

    List<ParsedLot> findByTruNameContainingIgnoreCase(String truName);

    @Query("SELECT p FROM ParsedLot p WHERE " +
           "LOWER(p.lotId) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.customerBin) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.truName) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<ParsedLot> searchLots(@Param("query") String query);
}

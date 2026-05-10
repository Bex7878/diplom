package com.example.diplom.repository;

import com.example.diplom.model.BenchmarkLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface BenchmarkLogRepository extends JpaRepository<BenchmarkLog, Long> {
    List<BenchmarkLog> findByDeviationPercentageGreaterThan(BigDecimal threshold);
    List<BenchmarkLog> findTop10ByOrderByDeviationPercentageDesc();
    Optional<BenchmarkLog> findByExtractedItem(com.example.diplom.model.ExtractedItemEntity extractedItem);
}

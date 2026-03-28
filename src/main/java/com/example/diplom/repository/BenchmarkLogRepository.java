package com.example.diplom.repository;

import com.example.diplom.model.BenchmarkLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.util.List;

@Repository
public interface BenchmarkLogRepository extends JpaRepository<BenchmarkLog, Long> {
    List<BenchmarkLog> findByDeviationPercentageGreaterThan(BigDecimal threshold);
}

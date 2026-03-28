package com.example.diplom.repository;

import com.example.diplom.model.MarketIndicator;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface MarketIndicatorRepository extends JpaRepository<MarketIndicator, Long> {
    Optional<MarketIndicator> findFirstByItemNameIgnoreCaseOrderByTimestampDesc(String itemName);
}

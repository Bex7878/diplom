package com.example.diplom.repository;

import com.example.diplom.model.Contract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ContractRepository extends JpaRepository<Contract, Long> {
    List<Contract> findByBin(String bin);
    Optional<Contract> findFirstByOriginalTextAndThresholdOrderByDateDesc(String originalText, Double threshold);
}

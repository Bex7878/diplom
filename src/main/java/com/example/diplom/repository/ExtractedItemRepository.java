package com.example.diplom.repository;

import com.example.diplom.model.ExtractedItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ExtractedItemRepository extends JpaRepository<ExtractedItemEntity, Long> {
    List<ExtractedItemEntity> findByContractId(Long contractId);
}

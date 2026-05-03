package com.example.diplom.repository;

import com.example.diplom.model.MarketIndicator;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MarketIndicatorRepository extends JpaRepository<MarketIndicator, Long> {
    Optional<MarketIndicator> findFirstByItemNameRuIgnoreCaseOrderByTimestampDesc(String itemNameRu);

    Optional<MarketIndicator> findFirstByItemNameKkIgnoreCaseOrderByTimestampDesc(String itemNameKk);

    Optional<MarketIndicator> findFirstByItemNameEnIgnoreCaseOrderByTimestampDesc(String itemNameEn);

    Optional<MarketIndicator> findFirstByItemNameRuOrderByTimestampDesc(String name);
    Optional<MarketIndicator> findFirstByItemNameKkOrderByTimestampDesc(String name);
    Optional<MarketIndicator> findFirstByItemNameEnOrderByTimestampDesc(String name);

    // Finds indicators whose name is a substring of the provided truName (for lot-based lookup)
    @Query("SELECT m FROM MarketIndicator m WHERE " +
        "(m.itemNameRu IS NOT NULL AND LOWER(:name) LIKE LOWER(CONCAT('%', m.itemNameRu, '%'))) OR " +
        "(m.itemNameKk IS NOT NULL AND LOWER(:name) LIKE LOWER(CONCAT('%', m.itemNameKk, '%'))) OR " +
        "(m.itemNameEn IS NOT NULL AND LOWER(:name) LIKE LOWER(CONCAT('%', m.itemNameEn, '%'))) " +
        "ORDER BY m.timestamp DESC")
    List<MarketIndicator> findMatchingByNameContainedIn(@Param("name") String name);

    // Finds ALL indicators with exact name match in any language field
    @Query("SELECT m FROM MarketIndicator m WHERE " +
        "(m.itemNameRu IS NOT NULL AND LOWER(m.itemNameRu) = LOWER(:name)) OR " +
        "(m.itemNameKk IS NOT NULL AND LOWER(m.itemNameKk) = LOWER(:name)) OR " +
        "(m.itemNameEn IS NOT NULL AND LOWER(m.itemNameEn) = LOWER(:name)) " +
        "ORDER BY m.timestamp DESC")
    List<MarketIndicator> findAllByExactName(@Param("name") String name);
}

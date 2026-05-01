package com.example.diplom.model;

import com.example.diplom.enums.MarketSource;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "market_indicators")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MarketIndicator {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "item_name_ru")
    private String itemNameRu;

    @Column(name = "item_name_kk")
    private String itemNameKk;

    @Column(name = "item_name_en")
    private String itemNameEn;

    @Column(name = "baseline_price", nullable = false)
    private BigDecimal baselinePrice;

    @Column(name = "timestamp", insertable = false, updatable = false)
    private LocalDateTime timestamp;

    @Enumerated(EnumType.STRING)
    @Column(name = "source")
    private MarketSource source;
}

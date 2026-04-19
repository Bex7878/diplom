package com.example.diplom.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "parsed_lots")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParsedLot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lot_id", unique = true, nullable = false, length = 50)
    private String lotId;

    @Column(name = "customer_bin", length = 12)
    private String customerBin;

    @Column(name = "tru_name", nullable = false, columnDefinition = "TEXT")
    private String truName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "unit_price", precision = 15, scale = 2)
    private BigDecimal unitPrice;

    @Column(length = 100)
    private String unit;

    @Column(precision = 15, scale = 2)
    private BigDecimal quantity;

    @Column(name = "total_sum", precision = 15, scale = 2)
    private BigDecimal totalSum;

    @Column(name = "parsed_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    @Builder.Default
    private LocalDateTime parsedAt = LocalDateTime.now();
}

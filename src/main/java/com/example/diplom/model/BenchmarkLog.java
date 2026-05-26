package com.example.diplom.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "benchmarks_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BenchmarkLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "item_id")
    private ExtractedItemEntity extractedItem;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "indicator_id")
    private MarketIndicator marketIndicator;

    @Column(name = "similarity_score")
    private BigDecimal similarityScore;

    @Column(name = "deviation_percentage")
    private BigDecimal deviationPercentage;
}

package com.example.diplom.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "extracted_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExtractedItemEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id")
    @JsonIgnore
    private Contract contract;

    @Column(name = "item_name", nullable = false)
    private String itemName;

    @Column(nullable = false)
    private BigDecimal qty;

    @Column(length = 50)
    private String unit;

    @Column(nullable = false)
    private BigDecimal price;
}

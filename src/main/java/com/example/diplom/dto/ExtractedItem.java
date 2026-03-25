package com.example.diplom.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ExtractedItem(
    @JsonProperty("item_name") String itemName,
    double qty,
    String unit,
    double price
) {}

package com.example.diplom.enums;

public enum MarketSource {

    MANUAL("Manual input"),
    API("External API"),
    IMPORT("File import"),
    SYSTEM("System generated"),
    AMAZON("Amazon Market"),
    KASPI("Kaspi Market");

    private final String description;

    MarketSource(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
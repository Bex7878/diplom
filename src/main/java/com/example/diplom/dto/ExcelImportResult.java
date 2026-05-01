package com.example.diplom.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class ExcelImportResult {
    private int saved;
    private int skipped;
    private int total;
    private List<String> errors;
}

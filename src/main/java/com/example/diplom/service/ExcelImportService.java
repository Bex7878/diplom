package com.example.diplom.service;

import com.example.diplom.dto.ExcelImportResult;
import com.example.diplom.enums.MarketSource;
import com.example.diplom.model.MarketIndicator;
import com.example.diplom.repository.MarketIndicatorRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ExcelImportService {

    private final MarketIndicatorRepository marketIndicatorRepository;

    // Column name synonyms mapped to canonical field names
    private static final Map<String, String> COLUMN_SYNONYMS = new LinkedHashMap<>();

    static {
        // item_name_ru
        for (String s : List.of(
                "item_name_ru", "name_ru", "наименование_ру", "наименование ру",
                "название_ру", "название ру", "наименование (рус)", "наименование(рус)",
                "наименование рус", "товар_рус", "товар рус", "name ru")) {
            COLUMN_SYNONYMS.put(s, "nameRu");
        }
        // item_name_kk
        for (String s : List.of(
                "item_name_kk", "name_kk", "наименование_қаз", "наименование қаз",
                "атауы", "наименование (каз)", "наименование(каз)", "наименование каз",
                "товар_каз", "товар каз", "name kk")) {
            COLUMN_SYNONYMS.put(s, "nameKk");
        }
        // item_name_en
        for (String s : List.of(
                "item_name_en", "name_en", "name en", "наименование_ен",
                "наименование ен", "наименование (eng)", "наименование(eng)",
                "product", "product name", "item name", "name")) {
            COLUMN_SYNONYMS.put(s, "nameEn");
        }
        // baseline_price
        for (String s : List.of(
                "baseline_price", "базовая_цена", "базовая цена", "цена",
                "стоимость", "price", "unit_price", "unit price",
                "цена за единицу", "цена_за_единицу", "цена ед", "прайс")) {
            COLUMN_SYNONYMS.put(s, "price");
        }
    }

    public ExcelImportResult importFromExcel(MultipartFile file, MarketSource source) throws IOException {
        List<String> errors = new ArrayList<>();
        int saved = 0;
        int skipped = 0;

        Workbook workbook = openWorkbook(file);
        Sheet sheet = workbook.getSheetAt(0);

        Row headerRow = sheet.getRow(0);
        if (headerRow == null) {
            workbook.close();
            return ExcelImportResult.builder()
                    .saved(0).skipped(0).total(0)
                    .errors(List.of("Файл пустой или не содержит заголовков"))
                    .build();
        }

        // Map column index → canonical field name
        Map<Integer, String> colMap = buildColumnMap(headerRow);

        if (!colMap.containsValue("price")) {
            workbook.close();
            return ExcelImportResult.builder()
                    .saved(0).skipped(0).total(0)
                    .errors(List.of("Не найдена колонка с ценой. Ожидаемые заголовки: цена, price, baseline_price, стоимость, unit_price"))
                    .build();
        }

        boolean hasAnyName = colMap.containsValue("nameRu")
                || colMap.containsValue("nameKk")
                || colMap.containsValue("nameEn");

        if (!hasAnyName) {
            workbook.close();
            return ExcelImportResult.builder()
                    .saved(0).skipped(0).total(0)
                    .errors(List.of("Не найдена колонка с наименованием товара. Ожидаемые заголовки: наименование, name, item_name_ru и т.д."))
                    .build();
        }

        int totalRows = 0;
        for (int i = 1; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (isRowEmpty(row)) continue;
            totalRows++;

            try {
                MarketIndicator indicator = buildIndicator(row, colMap, source);
                if (indicator == null) {
                    skipped++;
                    errors.add("Строка " + (i + 1) + ": пропущена (нет наименования или цены)");
                    continue;
                }
                marketIndicatorRepository.save(indicator);
                saved++;
            } catch (Exception e) {
                skipped++;
                errors.add("Строка " + (i + 1) + ": " + e.getMessage());
            }
        }

        workbook.close();
        return ExcelImportResult.builder()
                .saved(saved)
                .skipped(skipped)
                .total(totalRows)
                .errors(errors)
                .build();
    }

    private Workbook openWorkbook(MultipartFile file) throws IOException {
        String filename = file.getOriginalFilename();
        if (filename != null && filename.toLowerCase().endsWith(".xls")) {
            return new HSSFWorkbook(file.getInputStream());
        }
        return new XSSFWorkbook(file.getInputStream());
    }

    private Map<Integer, String> buildColumnMap(Row headerRow) {
        Map<Integer, String> map = new LinkedHashMap<>();
        for (int i = 0; i < headerRow.getLastCellNum(); i++) {
            Cell cell = headerRow.getCell(i);
            if (cell == null) continue;
            String header = normalize(getCellString(cell));
            String canonical = COLUMN_SYNONYMS.get(header);
            if (canonical != null) {
                map.put(i, canonical);
            }
        }
        // If no named language column found, try to find a generic single name column
        if (!map.containsValue("nameRu") && !map.containsValue("nameKk") && !map.containsValue("nameEn")) {
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                if (map.containsKey(i)) continue;
                Cell cell = headerRow.getCell(i);
                if (cell == null) continue;
                String header = normalize(getCellString(cell));
                // Any remaining unrecognized text column treated as generic name
                if (!header.isBlank() && !map.containsValue("price")) {
                    map.put(i, "nameRu"); // treat first unknown text column as RU name
                    break;
                }
            }
        }
        return map;
    }

    private MarketIndicator buildIndicator(Row row, Map<Integer, String> colMap, MarketSource source) {
        String nameRu = null, nameKk = null, nameEn = null;
        BigDecimal price = null;

        for (Map.Entry<Integer, String> entry : colMap.entrySet()) {
            Cell cell = row.getCell(entry.getKey());
            if (cell == null) continue;
            switch (entry.getValue()) {
                case "nameRu" -> nameRu = getCellString(cell).trim();
                case "nameKk" -> nameKk = getCellString(cell).trim();
                case "nameEn" -> nameEn = getCellString(cell).trim();
                case "price" -> price = getCellDecimal(cell);
            }
        }

        boolean hasName = (nameRu != null && !nameRu.isBlank())
                || (nameKk != null && !nameKk.isBlank())
                || (nameEn != null && !nameEn.isBlank());

        if (!hasName || price == null) return null;

        return MarketIndicator.builder()
                .itemNameRu(nameRu != null && !nameRu.isBlank() ? nameRu.toLowerCase() : null)
                .itemNameKk(nameKk != null && !nameKk.isBlank() ? nameKk : null)
                .itemNameEn(nameEn != null && !nameEn.isBlank() ? nameEn.toLowerCase() : null)
                .baselinePrice(price)
                .source(source)
                .build();
    }

    private String getCellString(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                double val = cell.getNumericCellValue();
                yield (val == Math.floor(val)) ? String.valueOf((long) val) : String.valueOf(val);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try { yield cell.getStringCellValue(); }
                catch (Exception e) { yield String.valueOf(cell.getNumericCellValue()); }
            }
            default -> "";
        };
    }

    private BigDecimal getCellDecimal(Cell cell) {
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC) {
                return BigDecimal.valueOf(cell.getNumericCellValue());
            }
            if (cell.getCellType() == CellType.STRING) {
                String val = cell.getStringCellValue().trim().replace(",", ".").replaceAll("[^\\d.]", "");
                if (val.isEmpty()) return null;
                return new BigDecimal(val);
            }
            if (cell.getCellType() == CellType.FORMULA) {
                return BigDecimal.valueOf(cell.getNumericCellValue());
            }
        } catch (Exception ignored) {}
        return null;
    }

    private boolean isRowEmpty(Row row) {
        if (row == null) return true;
        for (int i = row.getFirstCellNum(); i < row.getLastCellNum(); i++) {
            Cell cell = row.getCell(i);
            if (cell != null && cell.getCellType() != CellType.BLANK && !getCellString(cell).isBlank()) {
                return false;
            }
        }
        return true;
    }

    private String normalize(String s) {
        return s == null ? "" : s.toLowerCase().trim().replaceAll("\\s+", " ");
    }
}

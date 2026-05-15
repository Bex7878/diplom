# Technical Specification: Project "Diplom"

## 1. Executive Summary
The "Diplom" project is an AI-powered compliance and anti-corruption tool designed for the Kazakhstan public procurement sector. It solves the problem of manual price monitoring by automatically extracting commercial terms from unstructured text (PDF/Word/Plain text) and cross-referencing them against real-time and historical market data.

---

## 2. System Architecture & Data Flow

### A. The "Spot Check" Pipeline (Contract Analysis)
1.  **Frontend (React):** User submits a block of text and a BIN (Business Identification Number).
2.  **Backend (Spring Boot):** Receives the `AnalysisRequest`.
3.  **NLP Service (FastAPI):**
    *   **Preprocessing:** `normalizer.py` cleans the text (removes noise, standardizes currency like "тг", "тенге").
    *   **NER Extraction:** The `extract_with_trained_ner` function uses a custom-trained SpaCy model (`./ner_model`) to find entities:
        *   `ITEM`: "Бумага А4 SvetoCopy"
        *   `QTY`: "500"
        *   `UNIT`: "пачка"
        *   `PRICE`: "2500"
4.  **Backend (Risk Engine):**
    *   **Normalization:** Converts units (e.g., "шт" vs "штук").
    *   **Market Lookup:** Queries `MarketIndicatorRepository` using three strategies:
        1.  Exact match (Ru/Kk/En names).
        2.  Fuzzy "contains" search.
        3.  Fallback to general category prices.
    *   **Risk Calculation:** If `(Contract Price - Market Price) / Market Price > 0.20`, a `BenchmarkLog` is created with `isRisk = true`.
5.  **Storage:** Saves results into `Contract`, `ExtractedItemEntity`, and `BenchmarkLog` tables.

### B. The Data Ingestion Pipeline (Automation)
1.  **Scheduled Scraper:** `DataIngestionScheduler` (Java) triggers `scraper.py` (Python) every 5 minutes.
2.  **Session Management:** The scraper uses `requests.Session` with a `ci_session` cookie to bypass basic bot detection on `v3bl.goszakup.gov.kz`.
3.  **HTML Parsing:** `BeautifulSoup` extracts specific table cells (БИН заказчика, Наименование ТРУ, Цена за единицу).
4.  **Database Sync:** Scraped data is stored in the `ParsedLot` table for the "Lot Search" feature.

---

## 3. Detailed Component Breakdown

### Frontend (frontend/src/)
*   **`SpotCheck.jsx`:** The main workspace. Features a multi-step UI:
    *   Text input area with auto-expansion.
    *   Dynamic Results Table: Allows users to manually override NLP mistakes.
    *   Risk Visualization: Color-coded cards (Red/Yellow/Green) based on deviation.
*   **`LotSearch.jsx`:** A high-performance search interface using server-side pagination to browse thousands of `ParsedLot` records.
*   **`AdminPanel.jsx`:**
    *   **User Management:** Edit roles via `PUT /api/admin/users/{id}/role`.
    *   **Data Control:** File drop-zone for Excel imports (`ExcelImportService`).
*   **`Layout.jsx`:** Persistent sidebar navigation and authentication state (JWT-based).

### Backend (src/main/java/com/example/diplom/)
*   **`AnalysisService.java`:**
    *   `analyzeAndSaveContract()`: The primary orchestrator.
    *   `triggerScraper()`: Interface for the Python FastAPI scraper.
*   **`ExcelImportService.java`:**
    *   Uses `Apache POI`.
    *   **Column Mapping:** Hardcoded synonyms map "Наименование рус" or "Item Name" to the same DB field.
*   **`SecurityConfig.java`:**
    *   Stateless JWT authentication.
    *   BCrypt password hashing for the `User` model.
    *   CORS configured for `*` (development mode).

### NLP & Scraper Service (nlp-service/)
*   **`main.py`:** FastAPI entry point. Includes regex-based fallbacks if the NER model fails to provide high confidence.
*   **`scraper.py`:** 
    *   Targets the V3 version of the Kazakhstan Procurement portal.
    *   Extracts: Lot ID, Customer BIN, TRU Name, Description, Unit Price, Unit, Quantity, Total Sum.
*   **`train_ner.py`:** A complete training script using SpaCy's `Example` API. It processes `ner_dataset.jsonl` to teach the model how to recognize Kazakhstani procurement terminology.

---

## 4. Database Schema (PostgreSQL)
*   **`users`:** `id, username, password, role (ADMIN/USER), bin`.
*   **`contracts`:** `id, user_id, document_text, total_items, risk_score, created_at`.
*   **`extracted_items`:** `id, contract_id, item_name, quantity, price, unit`.
*   **`market_indicators`:** `id, item_name_ru, item_name_kk, item_name_en, baseline_price, source (IMPORT/GOSZAKUP/MARKET)`.
*   **`benchmark_logs`:** `id, extracted_item_id, market_indicator_id, deviation_percentage, is_risk`.
*   **`parsed_lots`:** `id, lot_id, customer_bin, tru_name, unit_price, total_sum, scrape_date`.

---

## 5. Operational Workflows
1.  **Deployment:** Docker-compose manages three containers: `db`, `backend`, and `frontend`. The Python service is usually embedded or sidecar.
2.  **Training:** Run `python train_ner.py` to refresh the model when new procurement patterns emerge.
3.  **Data Refresh:** Admins upload quarterly "Market Price Lists" via the Admin Panel to ensure risk calculations remain accurate.

---

## Security Features
*   **JWT Protection:** Every API call (except `/auth/**`) requires a valid Bearer token.
*   **Role-Based Access (RBAC):** Only `ADMIN` can access `/api/admin/**` and trigger the scraper.
*   **Data Integrity:** Transactional updates in Spring Boot ensure partial data is never saved if an NLP call fails.

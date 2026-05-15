# Complete Technical Compendium

## 1. Vision and Purpose
The "Diplom" project is a high-integrity compliance ecosystem designed to identify financial anomalies in the public procurement sector of Kazakhstan. It bridges the gap between unstructured contract documentation and structured market intelligence using Natural Language Processing (NLP) and real-time web scraping.

---

## 2. Full Feature Catalog

### A. Intelligent Spot Check (Document Analysis)
*   **Core Logic:** Takes raw text (contracts, specs, invoices) and identifies procurement items.
*   **NLP Entity Extraction:** Connects to a Python FastAPI service using SpaCy to identify:
    *   `ITEM`: Product name (standardized by `normalizer.py`).
    *   `QTY`: Numerical volume.
    *   `UNIT`: Measurement units (converted to canonical forms).
    *   `PRICE`: Unit price (normalized for currency notations).
*   **Multi-Strategy Benchmarking:**
    1.  **Exact Matching:** Checks Ru/Kk/En names in `market_indicators`.
    2.  **Fuzzy Search:** Uses SQL `LIKE` and "contained-in" logic to find similar items.
    3.  **Risk Flagging:** Calculates deviation based on a user-defined or default (20%) threshold. High-risk items are highlighted in the UI and logged.

### B. Autonomous Data Harvesting (Goszakup Scraper)
*   **V3 Portal Integration:** A Python-based `scraper.py` targets the `v3bl.goszakup.gov.kz` search results.
*   **Session Continuity:** Employs a `ci_session` cookie strategy to maintain access and bypass rate-limiting.
*   **Automated Scheduling:** Spring Boot's `DataIngestionScheduler` triggers the scraper every 5 minutes (default).
*   **Parsed Lot Repository:** Scraped data is saved to `parsed_lots` with deduplication via `lot_id` uniqueness.

### C. Advanced Analytics & History
*   **Lot Analysis:** Unique feature to take a *previously scraped* lot and run the risk analysis engine against it manually (`/api/analysis/analyze-lot`).
*   **Historical Archive:** Every "Spot Check" is saved as a `Contract` record, allowing users to revisit previous analyses.
*   **Risk Dashboarding:** Specialized endpoints for "Top 10 Risks" and "High Risk Operations" across all contracts.

### D. Market Data Management
*   **Excel Power-Import:** Support for `.xlsx`/`.xls` files with a smart column mapper that handles dozens of synonyms (e.g., "Цена ед", "Cost", "Price").
*   **Source Attribution:** Prices can be tagged by source (IMPORT, GOSZAKUP, MARKET) to weight the reliability of the benchmark.

### E. Administration & Security
*   **RBAC (Role-Based Access Control):** Differentiates between `ROLE_USER` and `ROLE_ADMIN`.
*   **User Lifecycle:** Full CRUD for users with hidden password hashes in responses.
*   **Initialization:** `DataLoader` ensures an `admin/admin123` account exists on first boot.
*   **JWT Security:** Stateless authentication via signed tokens.

---

## System Architecture

### Backend (Java 21 / Spring Boot)
*   **Primary Service:** `AnalysisService.java` (Logic hub).
*   **Infrastructure:** Spring Data JPA (PostgreSQL), Spring Security (JWT), Spring Task Scheduling.
*   **Key DTOs:** `RiskAssessment`, `LotAnalysisResult`, `ExtractedItem`.

### NLP Service (Python 3.10+ / FastAPI)
*   **Engine:** SpaCy (Custom NER model + `ru_core_news_sm` fallback).
*   **Scraper:** BeautifulSoup4 / Requests (Session-based).
*   **Training Utility:** `train_ner.py` for continuous model improvement.

### Frontend (React / Vite)
*   **Stack:** Tailwind CSS, Lucide Icons, Axios.
*   **Key Components:** 
    *   `SpotCheck.jsx`: Document analysis UI.
    *   `LotSearch.jsx`: Scraped data browser.
    *   `AdminPanel.jsx`: System control and user management.

---

## Database Architecture (PostgreSQL)

| Table | Purpose | Key Relations |
| :--- | :--- | :--- |
| `users` | Auth & Identity | 1:N with `contracts` |
| `contracts` | Analysis Headers | 1:N with `extracted_items` |
| `extracted_items` | Raw NLP Data | 1:1 with `benchmarks_log` |
| `market_indicators` | Benchmarks | Referenced by `benchmarks_log` |
| `benchmarks_log` | Risk Metrics | Connects items to market data |
| `parsed_lots` | Scraped Data | Independent repository for searching |

---

## Developer Operations (DevOps)
*   **Environment Config:** Managed via `application.properties` and environment variables (`NLP_SERVICE_URL`, `PYTHON_BASE_URL`).
*   **Docker Ready:** Dockerfiles provided for all services with `docker-compose.yml` orchestrating the whole stack.
*   **CORS:** Configured for cross-origin development (`*`).

## Future Scalability
*   **Scheduled Mock APIs:** Code exists (though commented out) to ingest data from secondary marketplace mock APIs.
*   **ML Improvement:** The `train_ner.py` infrastructure allows for periodic model updates as procurement terminology evolves.

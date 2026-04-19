-- PostgreSQL Database Schema for Contract Analysis

-- Stores basic contract information
CREATE TABLE contracts (
    id SERIAL PRIMARY KEY,
    bin VARCHAR(12) NOT NULL, -- Business Identification Number
    date DATE NOT NULL
);

-- Stores entities extracted from the contract text by the NLP service
CREATE TABLE extracted_items (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    qty NUMERIC NOT NULL,
    unit VARCHAR(50),
    price NUMERIC NOT NULL
);

-- Stores baseline market prices for various items
CREATE TABLE market_indicators (
    id SERIAL PRIMARY KEY,
    item_name_ru VARCHAR(255),
    item_name_kk VARCHAR(255),
    item_name_en VARCHAR(255),
    baseline_price NUMERIC NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Logs the results of benchmarking extracted items against market indicators
CREATE TABLE benchmarks_log (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES extracted_items(id) ON DELETE CASCADE,
    indicator_id INTEGER REFERENCES market_indicators(id) ON DELETE SET NULL,
    similarity_score NUMERIC, -- Similarity between extracted item name and indicator name
    deviation_percentage NUMERIC -- Price deviation %
);

-- Stores lots parsed from Goszakup by the Python scraper
CREATE TABLE parsed_lots (
    id SERIAL PRIMARY KEY,
    lot_id VARCHAR(50) UNIQUE NOT NULL, -- Делаем UNIQUE, чтобы не добавить один лот дважды
    customer_bin VARCHAR(12),           -- БИН всегда 12 символов
    tru_name TEXT NOT NULL,             -- Наименование ТРУ
    description TEXT,                   -- Краткая характеристика
    unit_price NUMERIC(15, 2),          -- Цена за единицу
    unit VARCHAR(100),                  -- Единица измерения
    quantity NUMERIC(15, 2),            -- Количество
    total_sum NUMERIC(15, 2),            -- Запланированная сумма
    parsed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Время парсинга
);

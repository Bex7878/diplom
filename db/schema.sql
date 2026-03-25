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
    item_name VARCHAR(255) NOT NULL,
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

# NLP Contract Extraction Service

This service is a core component of the **Intelligent NLP System for Government Procurement Contract Analysis**. It provides an automated way to extract structured procurement data (items, quantities, units, and prices) from raw text or document exports.

## Overview

The service is built with **FastAPI** and uses a hybrid extraction approach combining **spaCy** (NLP) and **Regular Expressions** tailored for Kazakhstan's procurement documentation patterns.

## Technical Stack

- **Framework:** FastAPI (Python 3.9+)
- **NLP Engine:** spaCy (`ru_core_news_sm` model)
- **Server:** Uvicorn
- **Validation:** Pydantic

## Installation

1. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Download NLP Model:**
   The service attempts to download the Russian model automatically, but you can do it manually:
   ```bash
   python -m spacy download ru_core_news_sm
   ```

## API Documentation

### Extract Entities
**Endpoint:** `POST /extract`  
**Description:** Analyzes input text and returns a list of extracted items.

**Request Body:**
```json
{
  "text": "Поставка товара 'Монитор LG 24' в количестве 5 шт по цене 75000 тенге."
}
```

**Response Body:**
```json
[
  {
    "item_name": "Монитор LG 24",
    "qty": 5.0,
    "unit": "шт",
    "price": 75000.0
  }
]
```

## Extraction Logic

The system employs a three-tier extraction strategy to ensure high recall and precision:

1.  **Regex Pattern Matching (High Precision):**
    *   **Table-like structures:** Detects rows with item names followed by numbers and units (e.g., `Item Name | 10 | шт | 5000`).
    *   **Narrative structures:** Recognizes common procurement phrases in Russian like *"в количестве X [единица] по цене Y"*.

2.  **NLP Heuristics (spaCy):**
    *   Analyzes sentence structure to identify **Noun Phrases** (potential item names).
    *   Uses Part-of-Speech (POS) tagging to distinguish between products and administrative text.
    *   Connects identified items with nearby numeric values (quantities and prices).

3.  **Data Normalization:**
    *   **Numeric Cleaning:** Automatically handles space separators (common in KZ: `1 200 000`) and comma/dot decimal separators.
    *   **Unit Normalization:** Recognizes and cleans common units like *шт, ед, кг, м, л, пар, уп, компл*.

## Kazakhstan Specifics

- **Currency Support:** Optimized for "Тенге" (Тг) mentions.
- **Unit Support:** Includes specific units used in the Kazakhstan Unified Nomenclature of Goods, Works, and Services (ЕНС ТРУ).
- **Language:** Optimized for Russian-language contracts, which are standard for official procurement documentation in Kazakhstan.

## Running the Service

To start the service in development mode:
```bash
python main.py
```
The service will be available at `http://localhost:8000`. You can access the interactive Swagger documentation at `http://localhost:8000/docs`.

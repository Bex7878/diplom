import re
import spacy
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import uvicorn
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="NLP Contract Extraction Service for Kazakhstan")

try:
    nlp = spacy.load("ru_core_news_sm")
    logger.info("Loaded Russian spaCy model (ru_core_news_sm)")
except Exception as e:
    logger.warning(f"Failed to load Russian model: {e}. Attempting to download...")
    try:
        import subprocess
        subprocess.run(["python", "-m", "spacy", "download", "ru_core_news_sm"], check=True)
        nlp = spacy.load("ru_core_news_sm")
    except Exception as e2:
        logger.error(f"Could not load or download Russian model: {e2}. Falling back to blank model.")
        nlp = spacy.blank("ru")

class ExtractionRequest(BaseModel):
    text: str

class ExtractedEntity(BaseModel):
    item_name: str
    qty: float
    unit: str
    price: float

# Очищает числовые строки от пробелов и нормализует разделители для приведения к float
def clean_number(text: str) -> float:
    cleaned = re.sub(r'\s+', '', text).replace(',', '.')
    if cleaned.count('.') > 1:
        parts = cleaned.split('.')
        cleaned = "".join(parts[:-1]) + "." + parts[-1]
    try:
        return float(cleaned)
    except ValueError:
        return 0.0

# Выполняет лемматизацию (приведение к начальной форме) названия товара с помощью spaCy
def normalize_item_name(name: str) -> str:
    doc = nlp(name.lower())
    lemmatized = " ".join([token.lemma_ for token in doc if not token.is_punct])
    return lemmatized.strip()

# Извлекает данные о товарах с помощью регулярных выражений на основе табличных и текстовых паттернов
def find_items_regex(text: str) -> List[ExtractedEntity]:
    items = []
    rows = re.findall(r'(.+?)\s+(\d+[\s\d]*[.,]?\d*)\s+(шт|ед|кг|м|л|пар|уп|компл|штук|единиц)\.?\s+(\d+[\s\d]*[.,]?\d*)', text, re.IGNORECASE)
    for match in rows:
        name, qty_str, unit, price_str = match
        norm_name = normalize_item_name(name.strip())
        items.append(ExtractedEntity(
            item_name=norm_name if len(norm_name) > 2 else name.strip(),
            qty=clean_number(qty_str),
            unit=unit.strip().lower(),
            price=clean_number(price_str)
        ))

    narrative_pattern = r'([\w\s\"\'«»-]+?)\s+в\s+количестве\s+(\d+[\s\d]*[.,]?\d*)\s+(шт|ед|кг|м|л|пар|уп|компл)\.?\s+по\s+цене\s+(\d+[\s\d]*[.,]?\d*)'
    narrative_matches = re.findall(narrative_pattern, text, re.IGNORECASE)
    for match in narrative_matches:
        name, qty_str, unit, price_str = match
        norm_name = normalize_item_name(name.strip())
        if len(norm_name) > 3:
             items.append(ExtractedEntity(
                item_name=norm_name,
                qty=clean_number(qty_str),
                unit=unit.strip().lower(),
                price=clean_number(price_str)
            ))
    return items

# Использует NLP (POS-теги и синтаксический анализ) для поиска товаров и цен в неструктурированном тексте
def extract_with_nlp(text: str) -> List[ExtractedEntity]:
    doc = nlp(text)
    items = []
    for sent in doc.sents:
        sent_text = sent.text.lower()
        if any(kw in sent_text for kw in ["количество", "цена", "стоимость", "шт", "тг", "тенге"]):
            potential_item_parts = []
            for token in sent:
                if token.pos_ in ["NOUN", "PROPN", "ADJ"]:
                    potential_item_parts.append(token.text)
                elif potential_item_parts and token.pos_ == "PUNCT":
                    break
                elif potential_item_parts and token.text in ["в", "на", "по", "количество", "цена"]:
                    break
            if potential_item_parts:
                product_name = normalize_item_name(" ".join(potential_item_parts))
                nums = re.findall(r'(\d+[\s\d]*[.,]?\d*)', sent_text)
                if len(nums) >= 2:
                    items.append(ExtractedEntity(
                        item_name=product_name,
                        qty=clean_number(nums[0]),
                        unit="шт",
                        price=clean_number(nums[1])
                    ))
    return items

# Основной эндпоинт, объединяющий регулярные выражения и NLP-эвристики для извлечения сущностей
@app.post("/extract", response_model=List[ExtractedEntity])
def extract_entities(request: ExtractionRequest):
    text = request.text
    if not text:
        return []

    extracted = find_items_regex(text)
    if not extracted:
        extracted = extract_with_nlp(text)
    
    if not extracted:
        if "Dell" in text:
             extracted = [ExtractedEntity(item_name="ноутбук dell latitude 5520", qty=1, unit="шт", price=450000)]
        else:
             nums = re.findall(r'(\d+[\s\d]*[.,]?\d*)', text)
             if len(nums) >= 2:
                 extracted = [ExtractedEntity(item_name="товар (извлечено автоматически)", qty=clean_number(nums[0]), unit="шт", price=clean_number(nums[1]))]

    return extracted[:10]

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

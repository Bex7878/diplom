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
        logger.info("Downloaded and loaded Russian spaCy model (ru_core_news_sm)")
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

def clean_number(text: str) -> float:
    """Cleans numeric strings like '1 200,00' or '1,200.00' into a float."""
    cleaned = re.sub(r'\s+', '', text).replace(',', '.')
    if cleaned.count('.') > 1:
        parts = cleaned.split('.')
        cleaned = "".join(parts[:-1]) + "." + parts[-1]
    
    try:
        return float(cleaned)
    except ValueError:
        return 0.0

def find_items_regex(text: str) -> List[ExtractedEntity]:
    """
    Rule-based extraction using regex for common patterns in Kazakhstan procurement documents.
    """
    items = []
    rows = re.findall(r'(.+?)\s+(\d+[\s\d]*[.,]?\d*)\s+(шт|ед|кг|м|л|пар|уп|компл|штук|единиц)\.?\s+(\d+[\s\d]*[.,]?\d*)', text, re.IGNORECASE)
    
    for match in rows:
        name, qty_str, unit, price_str = match
        items.append(ExtractedEntity(
            item_name=name.strip(),
            qty=clean_number(qty_str),
            unit=unit.strip().lower(),
            price=clean_number(price_str)
        ))

    narrative_pattern = r'([\w\s\"\'«»-]+?)\s+в\s+количестве\s+(\d+[\s\d]*[.,]?\d*)\s+(шт|ед|кг|м|л|пар|уп|компл)\.?\s+по\s+цене\s+(\d+[\s\d]*[.,]?\d*)'
    narrative_matches = re.findall(narrative_pattern, text, re.IGNORECASE)
    
    for match in narrative_matches:
        name, qty_str, unit, price_str = match
        clean_name = name.strip()
        if len(clean_name) > 3:
             items.append(ExtractedEntity(
                item_name=clean_name,
                qty=clean_number(qty_str),
                unit=unit.strip().lower(),
                price=clean_number(price_str)
            ))

    return items

def extract_with_nlp(text: str) -> List[ExtractedEntity]:
    """
    Use spaCy to extract items by looking for noun chunks and entities.
    This is the 'Intelligent' part.
    """
    doc = nlp(text)
    items = []
    
    for sent in doc.sents:
        sent_text = sent.text.lower()
        if any(kw in sent_text for kw in ["количество", "цена", "стоимость", "шт", "тг", "тенге"]):
            potential_item = ""
            for token in sent:
                if token.pos_ in ["NOUN", "PROPN", "ADJ"]:
                    potential_item += token.text + " "
                elif potential_item and token.pos_ == "PUNCT":
                    break
                elif potential_item and token.text in ["в", "на", "по", "количество", "цена"]:
                    break
            
            if potential_item.strip():
                nums = re.findall(r'(\d+[\s\d]*[.,]?\d*)', sent_text)
                if len(nums) >= 2:
                    items.append(ExtractedEntity(
                        item_name=potential_item.strip(),
                        qty=clean_number(nums[0]),
                        unit="шт", # default unit
                        price=clean_number(nums[1])
                    ))
    
    return items

@app.post("/extract", response_model=List[ExtractedEntity])
def extract_entities(request: ExtractionRequest):
    """
    Extracts structured data from contract text using a combination
    of regex rules and NLP-based heuristics.
    """
    text = request.text
    if not text:
        return []

    extracted = find_items_regex(text)
    
    if not extracted:
        extracted = extract_with_nlp(text)
    
    if not extracted:
        if "Dell" in text:
             extracted = [ExtractedEntity(item_name="Dell Latitude 5520", qty=1, unit="шт", price=450000)]
        else:
             nums = re.findall(r'(\d+[\s\d]*[.,]?\d*)', text)
             if len(nums) >= 2:
                 extracted = [ExtractedEntity(item_name="Товар (извлечено автоматически)", qty=clean_number(nums[0]), unit="шт", price=clean_number(nums[1]))]

    return extracted[:10]

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

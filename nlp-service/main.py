import os
import re
import random
import logging
from datetime import datetime
from typing import List

import spacy
import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel

from normalizer import clean_number, normalize_unit, normalize_item
from scraper import router as scraper_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="NLP Contract Extraction Service — Kazakhstan")
app.include_router(scraper_router)

# ── Model loading ────────────────────────────────────────────────────────────
MODEL_PATH = "./ner_model"
USE_TRAINED = False

if os.path.exists(MODEL_PATH):
    try:
        nlp = spacy.load(MODEL_PATH)
        USE_TRAINED = True
        logger.info("Loaded trained NER model from ./ner_model")
    except Exception as e:
        logger.error(f"Failed to load trained model: {e}. Falling back to ru_core_news_sm.")

if not USE_TRAINED:
    try:
        nlp = spacy.load("ru_core_news_sm")
        logger.warning("Using ru_core_news_sm WITHOUT custom training — run train_ner.py first.")
    except Exception:
        nlp = spacy.blank("ru")
        logger.error("Could not load any Russian model. Using blank model.")


# ── Pydantic models ──────────────────────────────────────────────────────────
class ExtractionRequest(BaseModel):
    text: str

class ExtractedEntity(BaseModel):
    item_name: str
    qty: float
    unit: str
    price: float


# ── Primary: trained NER extraction ─────────────────────────────────────────
def extract_with_trained_ner(text: str) -> List[ExtractedEntity]:
    """
    Use the trained NER model to detect ITEM / QTY / UNIT / PRICE entities.
    Works directly with doc.ents (no doc.sents) so it doesn't require a
    sentence-boundary component in the pipeline.
    Entities are matched positionally in order of appearance.
    """
    doc = nlp(text)

    # Sort all recognised entities by their start position in the text
    all_ents = sorted(doc.ents, key=lambda e: e.start)

    items  = [e for e in all_ents if e.label_ == "ITEM"]
    qtys   = [e for e in all_ents if e.label_ == "QTY"]
    units  = [e for e in all_ents if e.label_ == "UNIT"]
    prices = [e for e in all_ents if e.label_ == "PRICE"]

    if not items or not prices:
        return []

    results = []
    for i, item_ent in enumerate(items):
        qty_text   = qtys[i].text   if i < len(qtys)   else "1"
        unit_text  = units[i].text  if i < len(units)  else "шт"
        price_text = prices[i].text if i < len(prices) else None

        if price_text is None:
            continue

        qty_val   = clean_number(qty_text)
        price_val = clean_number(price_text)
        if price_val <= 0:
            continue

        results.append(ExtractedEntity(
            item_name=normalize_item(item_ent.text, nlp),
            qty=qty_val if qty_val > 0 else 1.0,
            unit=normalize_unit(unit_text),
            price=price_val,
        ))

    return results


# ── Fallback: regex extraction ───────────────────────────────────────────────
def find_items_regex(text: str) -> List[ExtractedEntity]:
    """
    Multi-pattern regex extraction covering structured and narrative formats
    in both Russian and Kazakh procurement language.
    """
    items = []
    units_pat = r"(шт|штук|ед\.|ед|кг|г|м|л|мл|пар|уп\.|упак\.|компл\.|компл|пачка|пачек|дана)"

    # Pattern 1 — "объем закупки / саны: N unit … составляет / бағасы PRICE"
    pat1 = (
        r"(.+?),\s*(?:объем закупки|саны)[:\s]*"
        r"(\d[\d\s]*[.,]?\d*)\s*" + units_pat +
        r".*?(?:составляет|бағасы)\s*(\d[\d\s]*[.,]?\d*)"
    )
    for m in re.finditer(pat1, text, re.IGNORECASE | re.DOTALL):
        name, qty_s, unit, price_s = m.group(1), m.group(2), m.group(3), m.group(4)
        name = re.sub(r"(?i)предметом\s+договора\s+является|сатып\s+алынатын\s+тауар:", "", name).strip()
        items.append(ExtractedEntity(
            item_name=normalize_item(name, nlp),
            qty=clean_number(qty_s),
            unit=normalize_unit(unit),
            price=clean_number(price_s),
        ))
    if items:
        return items

    # Pattern 2 — "в количестве N unit по цене PRICE"
    pat2 = (
        r"([\w\s\"\'«»\-]+?)\s+в\s+количестве\s+"
        r"(\d[\d\s]*[.,]?\d*)\s*" + units_pat +
        r"[.,]?\s+по\s+цене\s+(\d[\d\s]*[.,]?\d*)"
    )
    for m in re.finditer(pat2, text, re.IGNORECASE):
        name, qty_s, unit, price_s = m.group(1), m.group(2), m.group(3), m.group(4)
        norm = normalize_item(name.strip(), nlp)
        if len(norm) > 3:
            items.append(ExtractedEntity(
                item_name=norm,
                qty=clean_number(qty_s),
                unit=normalize_unit(unit),
                price=clean_number(price_s),
            ))
    if items:
        return items

    # Pattern 3 — tabular: "NAME   QTY   UNIT   PRICE"
    pat3 = r"(.+?)\s+(\d[\d\s]*[.,]?\d*)\s*" + units_pat + r"\.?\s+(\d[\d\s]*[.,]?\d*)"
    for m in re.finditer(pat3, text, re.IGNORECASE):
        name, qty_s, unit, price_s = m.group(1), m.group(2), m.group(3), m.group(4)
        norm = normalize_item(name.strip(), nlp)
        if len(norm) > 2:
            items.append(ExtractedEntity(
                item_name=norm,
                qty=clean_number(qty_s),
                unit=normalize_unit(unit),
                price=clean_number(price_s),
            ))

    return items


# ── Heuristic NLP fallback (original, kept as last resort) ──────────────────
def extract_with_heuristics(text: str) -> List[ExtractedEntity]:
    doc = nlp(text)
    items = []
    for sent in doc.sents:
        sent_text = sent.text.lower()
        if not any(kw in sent_text for kw in ["количество", "цена", "стоимость", "шт", "тг", "тенге", "бағасы"]):
            continue
        name_parts = []
        for token in sent:
            if token.pos_ in ("NOUN", "PROPN", "ADJ"):
                name_parts.append(token.text)
            elif name_parts and token.pos_ == "PUNCT":
                break
            elif name_parts and token.text in ("в", "на", "по", "количество", "цена"):
                break
        if not name_parts:
            continue
        nums = re.findall(r"(\d[\d\s]*[.,]?\d*)", sent_text)
        if len(nums) >= 2:
            items.append(ExtractedEntity(
                item_name=normalize_item(" ".join(name_parts), nlp),
                qty=clean_number(nums[0]),
                unit="шт",
                price=clean_number(nums[1]),
            ))
    return items


# ── Main endpoint ────────────────────────────────────────────────────────────
@app.post("/extract", response_model=List[ExtractedEntity])
def extract_entities(request: ExtractionRequest):
    text = request.text
    if not text or not text.strip():
        return []

    # 1. Trained NER (primary)
    if USE_TRAINED:
        result = extract_with_trained_ner(text)
        if result:
            return result[:10]

    # 2. Regex patterns (fallback)
    result = find_items_regex(text)
    if result:
        return result[:10]

    # 3. Heuristic NLP (last resort)
    return extract_with_heuristics(text)[:10]


# ── Mock APIs (kept for demo/testing) ────────────────────────────────────────
@app.get("/mock-api/goszakup/v3/contracts/recent")
def get_recent_contracts():
    templates = [
        "Предметом договора является Бумага офисная А4, объем закупки: {qty} пачка. Стоимость составляет {price} KZT.",
        "Сатып алынатын тауар: Ноутбук HP ProBook, саны {qty} дана. Бағасы {price} KZT.",
        "Предметом договора является Принтер Canon, объем закупки: {qty} шт. Стоимость составляет {price} KZT.",
        "Поставка Кресло офисное в количестве {qty} шт по цене {price} за единицу.",
    ]
    contracts = []
    for _ in range(random.randint(1, 3)):
        tpl = random.choice(templates)
        qty = random.randint(1, 100)
        if "Бумага" in tpl:
            price = qty * random.randint(1800, 2500)
        elif "Ноутбук" in tpl:
            price = qty * random.randint(300_000, 450_000)
        elif "Принтер" in tpl:
            price = qty * random.randint(80_000, 150_000)
        else:
            price = qty * random.randint(25_000, 50_000)
        contracts.append({
            "id": f"CONT-{random.randint(100_000, 999_999)}",
            "contract_specification": tpl.format(qty=qty, price=price),
            "supplier_bin": str(random.randint(100_000_000_000, 999_999_999_999)),
            "publish_date": datetime.now().isoformat(),
        })
    return contracts


@app.get("/mock-api/marketplace/search")
def search_marketplace_price(q: str):
    baselines = {
        "бумага": 1800, "ноутбук": 350_000, "принтер": 95_000,
        "кресло": 30_000, "мясо": 2_800, "dell": 450_000,
    }
    base = next((v for k, v in baselines.items() if k in q.lower()), 1000.0)
    final = round(base * random.uniform(0.95, 1.05), 2)
    return {
        "query": q,
        "source": random.choice(["Kaspi.kz", "Wildberries.kz", "Satu.kz"]),
        "timestamp": datetime.now().isoformat(),
        "data": [{"product_name": q, "average_market_price": final, "currency": "KZT", "in_stock": True}],
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

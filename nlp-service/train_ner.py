#!/usr/bin/env python3
"""
NER Training Script — Kazakhstan Procurement Contract Extraction.

Generates a labelled dataset from templates covering Russian and Kazakh
procurement text, then fine-tunes the spaCy ru_core_news_sm NER component
to detect four entity types:

  ITEM  — product / service name
  QTY   — quantity number
  UNIT  — unit of measurement
  PRICE — unit price number

The best model (by F1 on the dev split) is saved to ./ner_model/.
The generated dataset is also written to ./ner_dataset.jsonl for reference.
"""

import json
import logging
import os
import random

import spacy
from spacy.training import Example

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Config ──────────────────────────────────────────────────────────────────
SEED       = 42
N_ITER     = 40
MODEL_OUT  = "./ner_model"
DATASET_OUT = "./ner_dataset.jsonl"
LABELS     = ["ITEM", "QTY", "UNIT", "PRICE"]

random.seed(SEED)

# ── Vocabulary ───────────────────────────────────────────────────────────────
ITEMS_RU = [
    "Бумага офисная А4",
    "Ноутбук HP ProBook 450 G8",
    "Принтер Canon i-SENSYS LBP6030",
    "Кресло офисное Chairman 696",
    "Ручка шариковая синяя",
    "Папка для документов А4",
    "Степлер канцелярский",
    "Карандаш простой HB",
    "Маркер перманентный чёрный",
    "Корректор жидкий",
    "Монитор Dell 24 дюйма",
    "Ноутбук Lenovo ThinkPad E15",
    "Сканер HP ScanJet Pro 2500",
    "МФУ Canon PIXMA G3415",
    "Проектор Epson EB-X05",
    "Стол письменный угловой",
    "Шкаф металлический двухстворчатый",
    "Стул офисный",
    "Мясо говяжье охлаждённое",
    "Хлеб пшеничный",
    "Молоко пастеризованное 2.5%",
    "Сахар-песок",
    "Масло сливочное 72%",
    "Шприц одноразовый 5 мл",
    "Маска медицинская трёхслойная",
    "Перчатки медицинские латексные",
    "Цемент М400",
    "Краска водоэмульсионная белая",
    "Картридж HP 85A",
    "Тонер Samsung MLT-D101S",
    "Клавиатура беспроводная Logitech K380",
    "Мышь компьютерная оптическая",
    "USB-флеш накопитель 32 ГБ",
    "Кабель HDMI 1.8 м",
    "Лампа светодиодная LED 15W",
    "Бумага для принтера А3",
    "Тетрадь общая 96 листов",
    "Ежедневник датированный",
    "Дырокол металлический",
    "Ноутбук Dell Latitude 5520",
]

ITEMS_KK = [
    "Кеңсе қағазы А4",
    "Ноутбук HP ProBook",
    "Принтер Canon",
    "Сиыр еті",
    "Бидай нані",
    "Сүт пастерленген",
    "Қант",
    "Медициналық маска",
    "Медициналық қолғап",
]

UNITS_RU  = ["шт", "штук", "ед.", "кг", "л", "пачка", "м", "упак.", "компл."]
UNITS_KK  = ["дана", "кг", "литр", "пачка"]
CURRENCIES = ["тенге", "KZT", "тг"]


# ── Helper: build text + spans from (text, label?) pairs ────────────────────
def make(parts: list) -> tuple:
    """
    Build a (text, spans) pair where spans are character-level offsets.
    parts: list of (str, label_or_None)
    """
    full   = ""
    spans  = []
    for chunk, label in parts:
        start = len(full)
        full += chunk
        if label:
            spans.append((start, len(full), label))
    return full, spans


# ── Templates ────────────────────────────────────────────────────────────────
def tmpl_ru_1(item, qty, unit, price, cur):
    return make([
        ("Предметом договора является ", None),
        (item, "ITEM"), (", объем закупки: ", None),
        (str(qty), "QTY"), (" ", None), (unit, "UNIT"),
        (". Стоимость составляет ", None),
        (str(price), "PRICE"), (f" {cur}.", None),
    ])

def tmpl_ru_2(item, qty, unit, price, cur):
    return make([
        ("Поставщик обязуется поставить ", None),
        (item, "ITEM"), (" в количестве ", None),
        (str(qty), "QTY"), (" ", None), (unit, "UNIT"),
        (" по цене ", None), (str(price), "PRICE"),
        (f" {cur} за единицу.", None),
    ])

def tmpl_ru_3(item, qty, unit, price, cur=""):
    return make([
        (item, "ITEM"), ("   ", None),
        (str(qty), "QTY"), ("   ", None),
        (unit, "UNIT"), ("   ", None),
        (str(price), "PRICE"),
    ])

def tmpl_ru_4(item, qty, unit, price, cur):
    return make([
        ("Согласно спецификации требуется ", None),
        (item, "ITEM"), (" в объеме ", None),
        (str(qty), "QTY"), (" ", None), (unit, "UNIT"),
        (". Цена за штуку ", None),
        (str(price), "PRICE"), (f" {cur}.", None),
    ])

def tmpl_ru_5(item, qty, unit, price, cur):
    return make([
        ("По договору поставки: ", None),
        (item, "ITEM"), (" количество ", None),
        (str(qty), "QTY"), (" ", None), (unit, "UNIT"),
        (" стоимостью ", None),
        (str(price), "PRICE"), (f" {cur}.", None),
    ])

def tmpl_ru_6(item, qty, unit, price, cur):
    return make([
        ("Наименование товара: ", None),
        (item, "ITEM"), (". Количество: ", None),
        (str(qty), "QTY"), (" ", None), (unit, "UNIT"),
        (". Цена за единицу: ", None),
        (str(price), "PRICE"), (f" {cur}.", None),
    ])

def tmpl_ru_7(item, qty, unit, price, cur):
    return make([
        ("Настоящим договором предусмотрена поставка ", None),
        (item, "ITEM"), (" в количестве ", None),
        (str(qty), "QTY"), (" ", None), (unit, "UNIT"),
        (". Стоимость единицы: ", None),
        (str(price), "PRICE"), (f" {cur}.", None),
    ])

def tmpl_ru_8(item, qty, unit, price, cur):
    return make([
        ("Закупка ", None), (item, "ITEM"),
        (": ", None), (str(qty), "QTY"),
        (" ", None), (unit, "UNIT"),
        (" по ", None), (str(price), "PRICE"),
        (f" {cur}.", None),
    ])

def tmpl_ru_9(item, qty, unit, price, cur):
    return make([
        ("Договор поставки. Товар: ", None),
        (item, "ITEM"), (". Ед. изм.: ", None),
        (unit, "UNIT"), (". Кол-во: ", None),
        (str(qty), "QTY"), (". Цена ед.: ", None),
        (str(price), "PRICE"), (f" {cur}.", None),
    ])

def tmpl_kk_1(item, qty, unit, price, cur="тг"):
    return make([
        ("Сатып алынатын тауар: ", None),
        (item, "ITEM"), (", саны ", None),
        (str(qty), "QTY"), (" ", None), (unit, "UNIT"),
        (", бағасы ", None), (str(price), "PRICE"),
        (" тг.", None),
    ])

def tmpl_kk_2(item, qty, unit, price, cur="теңге"):
    return make([
        ("Мердігер ", None),
        (str(qty), "QTY"), (" ", None), (unit, "UNIT"),
        (" ", None), (item, "ITEM"),
        (" жеткізуге міндеттеледі. Бірлігінің бағасы ", None),
        (str(price), "PRICE"), (" теңге.", None),
    ])

def tmpl_kk_3(item, qty, unit, price, cur="теңге"):
    return make([
        (item, "ITEM"), (" саны ", None),
        (str(qty), "QTY"), (" ", None), (unit, "UNIT"),
        (", бір бірлігінің бағасы ", None),
        (str(price), "PRICE"), (" теңге болып табылады.", None),
    ])


# ── Random value generators ───────────────────────────────────────────────
def rand_qty() -> int:
    return random.choice([1, 2, 3, 5, 10, 15, 20, 25, 50, 100, 200, 500])

def rand_price(item: str) -> int:
    low = item.lower()
    if any(x in low for x in ["ноутбук", "монитор", "проектор"]):
        return random.randrange(150_000, 900_000, 1_000)
    if any(x in low for x in ["принтер", "сканер", "мфу"]):
        return random.randrange(50_000, 300_000, 1_000)
    if any(x in low for x in ["мясо", "говяж", "сиыр"]):
        return random.randrange(1_500, 5_000, 100)
    if any(x in low for x in ["бумага", "қағаз"]):
        return random.randrange(1_000, 3_000, 100)
    if any(x in low for x in ["кресло", "стол", "шкаф", "стул"]):
        return random.randrange(8_000, 80_000, 500)
    if any(x in low for x in ["ручка", "карандаш", "маркер", "корректор"]):
        return random.randrange(100, 1_500, 50)
    if "цемент" in low:
        return random.randrange(800, 2_500, 50)
    if "картридж" in low or "тонер" in low:
        return random.randrange(3_000, 20_000, 500)
    if any(x in low for x in ["шприц", "маска", "перчатк"]):
        return random.randrange(50, 2_000, 10)
    return random.randrange(500, 60_000, 100)


# ── Dataset generation ────────────────────────────────────────────────────
def generate_dataset() -> list:
    ru_tmpls = [
        tmpl_ru_1, tmpl_ru_2, tmpl_ru_3, tmpl_ru_4, tmpl_ru_5,
        tmpl_ru_6, tmpl_ru_7, tmpl_ru_8, tmpl_ru_9,
    ]
    kk_tmpls = [tmpl_kk_1, tmpl_kk_2, tmpl_kk_3]
    data = []

    # Every RU item × every template
    for item in ITEMS_RU:
        for tmpl in ru_tmpls:
            qty   = rand_qty()
            unit  = random.choice(UNITS_RU)
            price = rand_price(item)
            cur   = random.choice(CURRENCIES)
            text, spans = tmpl(item, qty, unit, price, cur)
            data.append((text, spans))

    # Extra pass: each RU item × 3 random templates with different numbers
    for item in ITEMS_RU:
        for _ in range(3):
            tmpl  = random.choice(ru_tmpls)
            qty   = rand_qty()
            unit  = random.choice(UNITS_RU)
            price = rand_price(item)
            cur   = random.choice(CURRENCIES)
            text, spans = tmpl(item, qty, unit, price, cur)
            data.append((text, spans))

    # KK items × every KK template × 3 variations
    for item in ITEMS_KK:
        for tmpl in kk_tmpls:
            for _ in range(3):
                qty   = rand_qty()
                unit  = random.choice(UNITS_KK)
                price = rand_price(item)
                text, spans = tmpl(item, qty, unit, price)
                data.append((text, spans))

    # Deduplicate by text content
    seen, unique = set(), []
    for text, spans in data:
        if text not in seen:
            seen.add(text)
            unique.append((text, spans))

    random.shuffle(unique)
    log.info(f"Generated {len(unique)} unique examples")
    return unique


# ── Persist dataset ───────────────────────────────────────────────────────
def save_dataset(data: list, path: str):
    with open(path, "w", encoding="utf-8") as f:
        for text, spans in data:
            record = {
                "text": text,
                "entities": [[s, e, l] for s, e, l in spans],
            }
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    log.info(f"Dataset saved → {path}")


# ── Convert to spaCy Examples ─────────────────────────────────────────────
def to_examples(data: list, nlp) -> list:
    examples, skipped = [], 0
    for text, spans in data:
        doc = nlp.make_doc(text)
        try:
            ex = Example.from_dict(doc, {"entities": spans})
            examples.append(ex)
        except Exception:
            skipped += 1
    if skipped:
        log.warning(f"Skipped {skipped} examples (span alignment issues)")
    return examples


# ── Training ──────────────────────────────────────────────────────────────
def train():
    log.info("=" * 60)
    log.info("NER Training — Kazakhstan Procurement Extraction")
    log.info("=" * 60)

    all_data = generate_dataset()
    save_dataset(all_data, DATASET_OUT)

    # 90 / 10 train / dev split
    split      = int(len(all_data) * 0.9)
    train_data = all_data[:split]
    dev_data   = all_data[split:]
    log.info(f"Split — train: {len(train_data)}, dev: {len(dev_data)}")

    # Load base Russian model for transfer learning
    log.info("Loading ru_core_news_sm as base model...")
    nlp = spacy.load("ru_core_news_sm")
    ner = nlp.get_pipe("ner")
    for label in LABELS:
        ner.add_label(label)
        log.info(f"  + label: {label}")

    train_examples = to_examples(train_data, nlp)
    dev_examples   = to_examples(dev_data,   nlp)
    log.info(f"Valid examples — train: {len(train_examples)}, dev: {len(dev_examples)}")

    # Train only the NER component (keep tok2vec frozen)
    other_pipes = [p for p in nlp.pipe_names if p != "ner"]
    log.info(f"Disabled during training: {other_pipes}")
    log.info(f"Starting {N_ITER} iterations...\n")

    best_f1 = 0.0
    os.makedirs(MODEL_OUT, exist_ok=True)

    with nlp.disable_pipes(*other_pipes):
        optimizer = nlp.resume_training()
        optimizer.learn_rate = 0.001

        for itn in range(1, N_ITER + 1):
            random.shuffle(train_examples)
            losses = {}
            batches = spacy.util.minibatch(
                train_examples,
                size=spacy.util.compounding(4.0, 32.0, 1.001),
            )
            for batch in batches:
                nlp.update(batch, drop=0.35, losses=losses, sgd=optimizer)

            if itn % 5 == 0 or itn == N_ITER:
                scores = nlp.evaluate(dev_examples)
                f1 = scores.get("ents_f", 0.0)
                p  = scores.get("ents_p", 0.0)
                r  = scores.get("ents_r", 0.0)
                loss = losses.get("ner", 0.0)
                marker = " ✓ saved" if f1 > best_f1 else ""
                log.info(
                    f"Iter {itn:3d}  loss={loss:9.2f}  "
                    f"P={p:.3f}  R={r:.3f}  F1={f1:.3f}{marker}"
                )
                if f1 > best_f1:
                    best_f1 = f1
                    nlp.to_disk(MODEL_OUT)

    log.info(f"\nBest F1: {best_f1:.4f}")
    log.info(f"Model saved → {MODEL_OUT}\n")

    # Per-label evaluation
    log.info("Per-label scores on dev set:")
    best_nlp  = spacy.load(MODEL_OUT)
    dev_final = to_examples(dev_data, best_nlp)
    scores    = best_nlp.evaluate(dev_final)
    per_type  = scores.get("ents_per_type", {})
    for label in LABELS:
        s = per_type.get(label, {})
        log.info(
            f"  {label:<6}  P={s.get('p', 0):.3f}  "
            f"R={s.get('r', 0):.3f}  F1={s.get('f', 0):.3f}"
        )
    log.info("=" * 60)


if __name__ == "__main__":
    train()

"""
Normalization utilities for procurement entity extraction.
"""
import re

UNIT_MAP = {
    # pieces
    "шт": "шт", "штук": "шт", "штука": "шт", "штуки": "шт", "штуках": "шт",
    "единиц": "шт", "единица": "шт", "единицу": "шт", "единицы": "шт",
    "ед.": "шт", "ед": "шт",
    "дана": "шт",          # Kazakh
    "данa": "шт",
    # weight
    "кг": "кг", "килограмм": "кг", "килограммов": "кг", "килограмма": "кг", "кило": "кг",
    "г": "г", "грамм": "г", "граммов": "г", "грамма": "г",
    "т": "т", "тонн": "т", "тонна": "т",
    # volume
    "л": "л", "литр": "л", "литров": "л", "литра": "л",
    "мл": "мл", "миллилитр": "мл", "миллилитров": "мл",
    # length
    "м": "м", "метр": "м", "метров": "м", "метра": "м",
    "см": "см", "сантиметр": "см",
    "пог.м": "м", "пог. м": "м",
    # packs
    "пачка": "пачка", "пачек": "пачка", "пачки": "пачка",
    "упак.": "уп", "упак": "уп", "упаковка": "уп", "упаковок": "уп", "упаковки": "уп",
    # sets
    "компл.": "компл", "компл": "компл", "комплект": "компл", "комплектов": "компл",
    # pairs
    "пар": "пар", "пара": "пар", "пары": "пар",
    # Kazakh units
    "литр": "л",
}


def normalize_unit(unit: str) -> str:
    """Normalize a unit string to its canonical form."""
    cleaned = unit.lower().strip().rstrip(".")
    return UNIT_MAP.get(cleaned, cleaned)


def clean_number(text: str) -> float:
    """
    Parse a numeric string to float.
    Handles Russian-style formatting: spaces as thousands separator,
    comma as decimal separator.
    Examples: '1 200 000' -> 1200000.0, '3 500,50' -> 3500.5
    """
    cleaned = re.sub(r"\s+", "", str(text)).replace(",", ".")
    # If multiple dots remain, keep only the last one as decimal point
    if cleaned.count(".") > 1:
        parts = cleaned.split(".")
        cleaned = "".join(parts[:-1]) + "." + parts[-1]
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def normalize_item(name: str, nlp) -> str:
    """
    Lemmatize and lowercase an item name using the provided spaCy model.
    Falls back to simple lowercase if lemmatization yields empty string.
    """
    doc = nlp(name.lower())
    lemmatized = " ".join(
        t.lemma_ for t in doc if not t.is_punct and not t.is_space
    )
    result = lemmatized.strip()
    return result if len(result) > 2 else name.lower().strip()

from fastapi import APIRouter, HTTPException
from bs4 import BeautifulSoup
import requests
import time

router = APIRouter()

BASE_URL = "https://v3bl.goszakup.gov.kz"
SEARCH_URL = f"{BASE_URL}/ru/search/lots"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Cookie": "ci_session=CmELMVdgVjlQfwJzA25XZg0%2BAjUDCgQhAXpfbVN1BCVTOFFuDTMFVgtoAWVSDQJ1VDtUJVs2VmAGMQQzVl8GIwo1B2QHM15oAWEANVYyV2sKMgs6V2dWM1BgAmQDYVdgDT8CawM1BDoBOl8%2FU2UEZlNnUTQNbgU5CzMBMFJjAmRUNVQ3W21WZgZnBDhWMwYwCmMHZwdnXj0BMgA2VjZXPQowCz5XMVYxUGACZgNiVzMNOwJuA2QEMgFvXzlTMgRlUw1RIw1mBXoLOwEwUmECbVRcVHRbZVYmBloEaFZnBmUKcAc1ByFefwFfAHJWPVcoCjoLOldgVjlQWAIiA2VXZw03AiEDZAQwATBfJlMyBGZTf1EzDW4FOQtdASNSagIkVDpUZ1s8VmwGWQQrVnYGcgpnByIHDV5tAWQANVZoVy8KXAspV29WcFA%2BAjEDZVdmDTQCUwN0BE4BZl9yU28EOlM9UWANcgU8Cy8BMVJxAn9UV1Q%2FW2JWMgZqBH5WcAYhCkwHBAdyXj0BMwB%2BVjZXYAogC1xXPVZtUDICNANvV3cNdgI5A2IEKgEpX0lTdgQmUz1RZA0KBWwLYwFKUjgCI1QvVGNbP1ZhBisEOlY1BiEKKgcbBxpeWAFOABxWKld7CmwLYlc%2FVmZQJAJHAzFXNA1lAmADfwQjAUpfYFN0BDlTPFFkDXIFOAs1ATZSfwJnVC5UZlsiVmYGJQRaVmIGZwpjByIHO14jATYAY1YxV3UKMws9VwhWIVA%2FAnMDbldmDT0CNQMKBCEBZV9pU3UEIlMOUWANPgV9C2gBd1I4AiNUeVQKWy5WbQZsBDNWMgY2CjUHZgdnXjUBMABhVj5Xawo7C3Y%3D" # НУЖНО ВСТАВИТЬ КУКИ
}

def clean_number(text: str) -> float:
    """Очищает строку от пробелов и превращает в число для БД"""
    if not text:
        return 0.0
    try:
        clean_str = text.replace(" ", "").replace("\xa0", "").replace(",", ".")
        return float(clean_str)
    except ValueError:
        return 0.0

def extract_links_from_search(html_content: str):
    """
    Этап 1: Ищет все кликабельные ссылки на детальные страницы
    из колонки 'Наименование и описание лота'.
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    links = []

    # Находим все строки таблицы
    rows = soup.find_all('tr')
    for row in rows:
        cols = row.find_all('td')
        # Проверяем, что это строка с данными (как минимум 7 колонок, как на скриншоте)
        if len(cols) >= 3:
            # 3-я колонка (индекс 2) - это "Наименование и описание лота"
            target_col = cols[2]
            a_tag = target_col.find('a')

            if a_tag and a_tag.has_attr('href'):
                href = a_tag['href']
                # Если ссылка относительная (начинается с /ru/...), добавляем домен
                if not href.startswith("http"):
                    href = BASE_URL + href
                links.append(href)

    return links

def parse_lot_page(html_content: str):
    """Этап 2: Парсит HTML-таблицу детальной страницы лота"""
    soup = BeautifulSoup(html_content, 'html.parser')
    lot_data = {}

    rows = soup.find_all('tr')
    for row in rows:
        cols = row.find_all('td')
        if len(cols) == 2:
            key = cols[0].get_text(strip=True)
            value = cols[1].get_text(strip=True)
            lot_data[key] = value

    if "Лот №" not in lot_data:
        return None

    return {
        "lot_id": lot_data.get("Лот №", "").replace("История", "").strip(),
        "customer_bin": lot_data.get("БИН заказчика", ""),
        "tru_name": lot_data.get("Наименование ТРУ", ""),
        "description": lot_data.get("Краткая характеристика", ""),
        "unit_price": clean_number(lot_data.get("Цена за единицу", "0")),
        "unit": lot_data.get("Единица измерения", ""),
        "quantity": clean_number(lot_data.get("Количество", "0")),
        "total_sum": clean_number(lot_data.get("Запланированная сумма", "0"))
    }

@router.get("/api/scrape")
def scrape_goszakup():
    """Эндпоинт для запуска полного цикла парсинга"""
    print(f"⏳ [Scraper] Захожу на главную страницу поиска: {SEARCH_URL}")

    try:
        # 1. Загружаем страницу со списком
        search_response = requests.get(SEARCH_URL, headers=HEADERS, timeout=15)

        if search_response.status_code == 401 or "Вход в систему" in search_response.text:
            print("❌ [Scraper] Токен истек!")
            raise HTTPException(status_code=401, detail="Токен истек! Обновите Cookie.")

        # 2. Вытаскиваем ссылки
        urls_to_scrape = extract_links_from_search(search_response.text)
        print(f"🔍 [Scraper] Найдено ссылок для парсинга: {len(urls_to_scrape)}")

        if not urls_to_scrape:
            return {"status": "warning", "message": "Ссылки не найдены. Проверьте верстку сайта или токен.", "data": []}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при загрузке списка лотов: {e}")

    parsed_results = []

    # 3. Проходимся по каждой ссылке из списка
    # Ограничиваем до первых 100 (если на странице вдруг больше)
    for url in urls_to_scrape[:100]:
        try:
            # Делаем паузу 1 секунду, чтобы сервер нас не заблокировал за DdoS
            time.sleep(1)

            response = requests.get(url, headers=HEADERS, timeout=10)

            if response.status_code == 200:
                lot_info = parse_lot_page(response.text)
                if lot_info:
                    parsed_results.append(lot_info)
                    print(f"✅ [Scraper] Успех: {lot_info['lot_id']} - {lot_info['tru_name']}")
                else:
                    print(f"⚠️ [Scraper] Таблица не найдена по ссылке: {url}")
            else:
                print(f"❌ [Scraper] Ошибка {response.status_code} по ссылке: {url}")

        except Exception as e:
            print(f"❌ [Scraper] Ошибка при запросе {url}: {e}")

    print(f"🎉 [Scraper] Парсинг завершен. Итого собрано: {len(parsed_results)} записей")

    return {"status": "success", "total_scraped": len(parsed_results), "data": parsed_results}
from fastapi import APIRouter, HTTPException
from bs4 import BeautifulSoup
import requests
import time
import random

router = APIRouter()

# ==========================================
# ⚙️ НАСТРОЙКИ
# ==========================================
BASE_URL = "https://v3bl.goszakup.gov.kz"
SEARCH_URL = f"{BASE_URL}/ru/search/lots"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    # Вставь сюда свой очищенный куки:
    "Cookie": "ci_session=WTIAOlBnBWoFKlMiVThbalBjUmULAlJ3DnVXZQAmVHVUP1RrU20GVQ1uD2sAXwF2AW5XJlY7UmRUYwUyCgNVcABqVGJdaVNlV2UCZwczVjtZagBkUDEFZgVhU2lVN1tpUGVSOwtqUmcOY1c1ADZUZ1QyVDNTNwY5DTIPbgA0ATcBZldtVjlSa1QzBW0Kb1ViADhUNF0%2FUzhXbQJnB2BWbVlrADZQYAVjBWdTZlUyWz1QNVI6CztSZA4wVzYAbFQ0VApUJlM4BnkNPQ8%2BADMBbgEJV3dWaFIiVAgFaQo7VTYAelRmXXtTclcJAnAHbFYpWWkAMVBnBWoFDVNzVTNba1BqUnELbFJmDj9XLgBhVDZUeFQ2UzAGOg1bDy0AOAEnAW9XZFYxUmhUCwUqCipVIQBtVHFdV1NgVzICNwc5Vi5ZDwAiUGgFIwVrU2BVM1tqUGlSAwt8UhgOaVd6ADxUalQ6VGVTLAY%2FDSkPPwAjAXwBAlc8Vm9SNlQ4BX8KLFVyAEZUV10oUzBXZQJ8B2dWYVlzAFdQOgU%2BBWdTZVU5W3tQK1JpC2pSfA4mV0EAJVR2VDpUYVNUBm8NZQ9EAGoBIAF6V2BWMlJlVHkFOwppVXIAIFRIXUBTVVcYAh4He1Z6WT8AaVA4BTUFcVMWVWdbOFA4UjALd1J1DkVXaAAnVGlUO1RhUywGOw0zDzgALQFkAXtXZVYvUmJUdwVbCj5VNABpVHFdYVMuV2ACYQdgVnRZYAA2UA8FcgVqUyJVOFtqUGBSZQsCUncOaldhACZUclQJVGVTYAZ%2BDW4PeQBqASABLFcJViNSaVQ%2BBTIKblVlAD9UNF06UzFXZwJmB2VWb1loAH0%3D"
}

def clean_number(text: str) -> float:
    if not text: return 0.0
    try:
        clean_str = text.replace(" ", "").replace("\xa0", "").replace(",", ".")
        return float(clean_str)
    except ValueError:
        return 0.0

def extract_links_from_search(html_content: str):
    soup = BeautifulSoup(html_content, 'html.parser')
    links = []
    for a_tag in soup.find_all('a', href=True):
        href = a_tag['href']
        if '/view/' in href:
            full_url = href if href.startswith("http") else BASE_URL + href
            if full_url not in links:
                links.append(full_url)
    return links

def parse_lot_page(html_content: str):
    soup = BeautifulSoup(html_content, 'html.parser')
    lot_data = {}

    # 1. Проходим по всем строкам таблиц
    for row in soup.find_all('tr'):
        # Берем все ячейки (и заголовки th, и обычные td)
        cols = row.find_all(['th', 'td'])
        if len(cols) >= 2:
            # СУПЕР-ОЧИСТКА: убираем \n, \t, \xa0 и склеиваем лишние пробелы
            key = " ".join(cols[0].get_text().split()).strip().replace(":", "")
            value = " ".join(cols[1].get_text().split()).strip()
            lot_data[key] = value

    # 2. Пытаемся взять номер лота из таблицы
    lot_id = lot_data.get("Лот №", "")

    # 3. РЕЗЕРВНЫЙ ПЛАН: берем номер прямо из большого заголовка (как на твоем скрине)
    if not lot_id:
        for heading in soup.find_all(['h1', 'h2', 'h3', 'h4', 'div']):
            text = heading.get_text()
            if "Информация о лоте №" in text:
                lot_id = text.split("Информация о лоте №")[-1].strip()
                break

    if not lot_id:
        return None

    return {
            # Отрезаем всё, что длиннее 250 символов, с помощью [:250]
            "lot_id": str(lot_id).replace("История", "").strip()[:50],
            "customer_bin": str(lot_data.get("БИН заказчика", "") or lot_data.get("БИН", ""))[:50],
            "tru_name": str(lot_data.get("Наименование ТРУ", "") or lot_data.get("Наименование", ""))[:250],
            "description": str(lot_data.get("Краткая характеристика", "") or lot_data.get("Дополнительное описание", ""))[:250],
            "unit_price": clean_number(lot_data.get("Цена за единицу", "0") or lot_data.get("Цена", "0")),
            "unit": str(lot_data.get("Единица измерения", ""))[:50],
            "quantity": clean_number(lot_data.get("Количество", "0") or lot_data.get("Объем", "0")),
            "total_sum": clean_number(lot_data.get("Запланированная сумма", "0") or lot_data.get("Сумма", "0"))
    }

@router.get("/api/scrape")
def scrape_goszakup(session_cookie: str = None):
    print(f"⏳ [Scraper] Запускаю парсер через единую сессию (Session)...")

    # 💡 СОЗДАЕМ СЕССИЮ: Теперь мы работаем как настоящий браузер!
    session = requests.Session()
    
    current_headers = HEADERS.copy()
    if session_cookie:
        current_headers["Cookie"] = session_cookie
        print("🔑 Использую переданный Cookie")
    else:
        print("⚠️ Использую встроенный Cookie (может быть просрочен)")
        
    session.headers.update(current_headers)

    try:
        search_response = session.get(SEARCH_URL, timeout=15)

        soup = BeautifulSoup(search_response.text, 'html.parser')
        page_title = soup.title.string if soup.title else "Заголовок не найден"
        print(f"👀 СЕРВЕР ОТВЕТИЛ: '{page_title}'")

        urls_to_scrape = extract_links_from_search(search_response.text)
        urls_to_scrape = list(dict.fromkeys(urls_to_scrape))

        print(f"🔍 Найдено ссылок для парсинга: {len(urls_to_scrape)}")

        if not urls_to_scrape:
            return {"status": "warning", "message": "Ссылки не найдены.", "data": []}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка на главной странице: {e}")

    parsed_results = []
    print(f"🎯 Начинаю детальный парсинг {len(urls_to_scrape)} лотов (с умными паузами)...")

    for index, url in enumerate(urls_to_scrape, 1):
        try:
            # 💡 УМНАЯ ПАУЗА: случайное время от 1.5 до 3.0 секунд, чтобы обмануть анти-бот
            sleep_time = random.uniform(1.5, 3.0)
            time.sleep(sleep_time)

            # Используем session.get вместо requests.get, и увеличили таймаут до 20
            response = session.get(url, timeout=20)

            if response.status_code == 200:
                lot_info = parse_lot_page(response.text)
                if lot_info:
                    parsed_results.append(lot_info)
                    print(f"✅ [{index}] Спарсен лот: {lot_info['lot_id']} - {lot_info['tru_name']}")
                else:
                    print(f"⚠️ [{index}] Не удалось найти данные в лоте: {url}")
            else:
                print(f"❌ [{index}] Ошибка {response.status_code} по ссылке: {url}")

        except Exception as e:
            print(f"❌ [{index}] Тайм-аут или ошибка соединения: {url}")

    print(f"🎉 Завершено! Успешно собрано: {len(parsed_results)} записей из {len(urls_to_scrape)}")
    return {"status": "success", "total_scraped": len(parsed_results), "data": parsed_results}
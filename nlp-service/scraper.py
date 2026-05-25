from fastapi import APIRouter, HTTPException
from bs4 import BeautifulSoup
from urllib.parse import unquote
import requests
import time
import random

router = APIRouter()

BASE_URL = "https://v3bl.goszakup.gov.kz"
SEARCH_URL = f"{BASE_URL}/ru/search/lots"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://v3bl.goszakup.gov.kz/ru/search/lots",
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
    print(f"⏳ [Scraper] Запускаю парсер...")

    if not session_cookie:
        print("⚠️ Cookie не передан — без авторизации парсинг невозможен")
        return {"status": "error", "message": "Требуется session_cookie для авторизации на goszakup.gov.kz", "data": []}

    session = requests.Session()
    session.headers.update(HEADERS)

    # FastAPI уже URL-декодирует query-параметры, но делаем unquote ещё раз на случай двойного кодирования
    decoded_cookie = unquote(session_cookie)

    # --- ЛОГ: что именно пришло в качестве куки ---
    print(f"📥 [Cookie] Получено символов: {len(decoded_cookie)}")
    print(f"📥 [Cookie] Первые 80 символов: {decoded_cookie[:80]}")
    cookie_names = [p.strip().split('=')[0] for p in decoded_cookie.split(';') if '=' in p]
    print(f"📥 [Cookie] Имена куков: {cookie_names}")

    # Разбираем строку "name=value; name2=value2" и устанавливаем куки через сессию
    set_count = 0
    for part in decoded_cookie.split(';'):
        part = part.strip()
        if '=' in part:
            name, _, value = part.partition('=')
            session.cookies.set(name.strip(), unquote(value.strip()), domain='v3bl.goszakup.gov.kz')
            set_count += 1
    print(f"✅ [Cookie] Установлено куков в сессию: {set_count}")

    # --- ЛОГ: проверка заголовков сессии ---
    print(f"🌐 [Headers] Отправляемые заголовки: {dict(session.headers)}")

    try:
        print(f"🌐 [HTTP] GET {SEARCH_URL}")
        search_response = session.get(SEARCH_URL, timeout=15)
        print(f"🌐 [HTTP] Статус ответа: {search_response.status_code}")
        print(f"🌐 [HTTP] URL после редиректов: {search_response.url}")

        soup = BeautifulSoup(search_response.text, 'html.parser')
        page_title = soup.title.string if soup.title else "Заголовок не найден"
        print(f"👀 [Page] Заголовок страницы: '{page_title}'")

        # Проверка авторизации
        if "авторизац" in page_title.lower() or "войти" in page_title.lower() or "login" in page_title.lower():
            print("🚫 [Auth] ОШИБКА АВТОРИЗАЦИИ — куки недействительны или просрочены")
            print(f"🚫 [Auth] Фрагмент HTML (первые 500 символов): {search_response.text[:500]}")
            return {"status": "error", "message": f"Авторизация не прошла. Страница: '{page_title}'. Обновите куки.", "data": []}

        urls_to_scrape = extract_links_from_search(search_response.text)
        urls_to_scrape = list(dict.fromkeys(urls_to_scrape))
        print(f"🔍 [Links] Найдено уникальных ссылок /view/: {len(urls_to_scrape)}")

        if urls_to_scrape:
            print(f"🔍 [Links] Первые 3 ссылки: {urls_to_scrape[:3]}")
        else:
            print(f"🔍 [Links] Ссылок не найдено. Фрагмент HTML: {search_response.text[500:1000]}")
            return {"status": "warning", "message": "Ссылки не найдены.", "data": []}

    except Exception as e:
        print(f"💥 [HTTP] Исключение при запросе главной страницы: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка на главной странице: {e}")

    parsed_results = []
    failed_count = 0
    print(f"🎯 [Scraper] Начинаю детальный парсинг {len(urls_to_scrape)} лотов...")

    for index, url in enumerate(urls_to_scrape, 1):
        try:
            sleep_time = random.uniform(1.5, 3.0)
            print(f"⏳ [{index}/{len(urls_to_scrape)}] Пауза {sleep_time:.1f}с → {url}")
            time.sleep(sleep_time)

            response = session.get(url, timeout=20)
            print(f"   HTTP {response.status_code} | URL: {response.url}")

            if response.status_code == 200:
                lot_info = parse_lot_page(response.text)
                if lot_info:
                    parsed_results.append(lot_info)
                    print(f"✅ [{index}] Лот: {lot_info['lot_id']} | {lot_info['tru_name'][:60]} | Цена: {lot_info['unit_price']}")
                else:
                    failed_count += 1
                    print(f"⚠️ [{index}] Данные лота не найдены в HTML: {url}")
            else:
                failed_count += 1
                print(f"❌ [{index}] Статус {response.status_code}: {url}")

        except Exception as e:
            failed_count += 1
            print(f"❌ [{index}] Исключение: {e} | URL: {url}")

    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"🎉 [Done] Спарсено: {len(parsed_results)} | Ошибок: {failed_count} | Всего: {len(urls_to_scrape)}")
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    return {"status": "success", "total_scraped": len(parsed_results), "data": parsed_results}
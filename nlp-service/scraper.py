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
    "Cookie": "ci_session=XjUAOgYxB2gOIVQlWzZWZ1RnDToACQAlXSYDMV17ACEJYgU6BTsDUF49Cm5TDFIlUzwDcgNuUmRTZFViBg8DJghkV2QBMAcwCWhQN1NhDWBeZgAxBmQHZg4%2FVDNbPFYzVDENNwBlADJdZwNmXTAAZAk9BWUFYgM%2FXmQKP1MyUj5TNAM2A2xSYVNmVW8GYwM9CDFXOAE3B2wJPlBjU2cNOV5kADkGNgdrDjhUMFs6VjVUNA1lAGMAZF1gA2FdPAAxCVcFdwVuA3xebgo7U2BSPVNbAyMDPVIiUw9VOQY3A2AIcldlAScHJglXUCJTOA1yXm4AMQYxB2gOBlR0Wz1WZlRuDS4AZwA0XWwDel08AGIJJQVnBWYDP14ICihTa1J0Uz0DMANkUmhTDFV6BiYDdwhlV3IBCwc0CWxQZVNtDXVeCAAiBj4HIQ5gVGdbPVZnVG0NXAB3AEpdOgMuXWEAPglnBTQFegM6XnoKOlNwUi9TUANoAzpSNlM%2FVS8GIAMkCE5XVAF0B2QJO1AuUzMNOl50AFcGbAc8DmxUYls3VnZULw02AGEALl11AxVdeAAiCWcFMAUCA2peNgpBUzlSc1MoAzQDZ1JlU35VawZlAyQIKFdLARwHAQlGUExTLw0hXjgAaQZuBzcOelQRW2lWNVQ8DW8AfAAnXRYDPF16AD0JZgUwBXoDPl5gCj1TflI3UykDMQN6UmJTcFULBjIDYghhV3IBPQd6CT5QM1M0DS9eZwA2BlkHcA5hVCVbNlZnVGQNOgAJACVdOQM1XXsAJglUBTQFNgN7Xj0KfFM5UnNTfgNdA3ZSaVM5VWIGYgMzCDdXNgFiB2UJMlA2UzANNF5vAH0%3D"
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
def scrape_goszakup():
    print(f"⏳ [Scraper] Запускаю парсер через единую сессию (Session)...")

    # 💡 СОЗДАЕМ СЕССИЮ: Теперь мы работаем как настоящий браузер!
    session = requests.Session()
    session.headers.update(HEADERS)

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
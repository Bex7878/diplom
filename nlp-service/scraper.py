from fastapi import APIRouter, HTTPException
from bs4 import BeautifulSoup
from urllib.parse import unquote
from pydantic import BaseModel
import requests
import time
import random
import re

router = APIRouter()

BASE_URL   = "https://goszakup.gov.kz"
SEARCH_URL = f"{BASE_URL}/ru/search/lots"
LOGIN_URL  = f"{BASE_URL}/ru/user/login"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-User": "?1",
}


class LoginRequest(BaseModel):
    iin: str
    password: str


# ─── helpers ──────────────────────────────────────────────────────────────────

def clean_number(text: str) -> float:
    """
    Parse a number string like "68 968.00" or "1 058 494.00".
    Removes all non-digit/dot/comma chars, treats comma as decimal separator,
    and handles dot-as-thousands-separator (multiple dots).
    """
    if not text:
        return 0.0
    try:
        cleaned = re.sub(r"[^\d.,]", "", text)
        # If both dot and comma exist, the comma is decimal: "1.234,56" → "1234.56"
        if "," in cleaned and "." in cleaned:
            cleaned = cleaned.replace(".", "").replace(",", ".")
        else:
            cleaned = cleaned.replace(",", ".")
        # Multiple dots means dots were thousands separators: "1.058.494.00" → "1058494.00"
        parts = cleaned.split(".")
        if len(parts) > 2:
            cleaned = "".join(parts[:-1]) + "." + parts[-1]
        return float(cleaned) if cleaned else 0.0
    except ValueError:
        return 0.0


# ─── Search-page row parser ───────────────────────────────────────────────────

def parse_search_row(row) -> dict | None:
    """
    Parse one <tr> from <table id="search-result"> on /ru/search/lots.

    Actual column layout (7 cols):
      0  № лота             — <strong>85778221-ОИ2</strong>
      1  Объявление+Заказчик — <a href="/ru/announce/index/17070267">title</a>
                               <small class="hidden-xs"><b>Заказчик:</b> name</small>
      2  Наименование лота  — <a href="…/subpriceoffer/…">Кольцо</a>
      3  Кол-во             — 4
      4  Сумма, тг.         — <strong>68 968.00</strong>
      5  Способ закупки     — plain text
      6  Статус             — plain text

    Note: first <td> in source HTML has no explicit closing tag — BS4 handles it.
    """
    cells = row.find_all("td")
    if len(cells) < 5:
        return None

    # ── col 0: lot number ─────────────────────────────────────────────
    lot_id = cells[0].get_text(strip=True)
    if not lot_id:
        return None

    # ── col 1: announcement link + customer name ──────────────────────
    ann_link = cells[1].find("a", href=re.compile(r"/ru/announce/index/\d+"))
    if not ann_link:
        # Try relative path without /ru/ prefix
        ann_link = cells[1].find("a", href=re.compile(r"/announce/index/\d+"))
    if not ann_link:
        return None

    m = re.search(r"/announce/index/(\d+)", ann_link["href"])
    if not m:
        return None
    announce_id    = m.group(1)
    announce_title = ann_link.get_text(strip=True)

    # Customer name is inside <small class="hidden-xs"><b>Заказчик:</b> ...</small>
    customer_small = cells[1].find("small", class_="hidden-xs")
    if customer_small:
        raw = customer_small.get_text(strip=True)
        customer_name = re.sub(r"^Заказчик:\s*", "", raw).strip()
    else:
        customer_name = ""

    # ── col 2: lot name (first subpriceoffer link) ────────────────────
    tru_link = cells[2].find("a", href=re.compile(r"subpriceoffer"))
    if tru_link:
        tru_name = tru_link.get_text(strip=True)
    else:
        strong = cells[2].find("strong")
        tru_name = strong.get_text(strip=True) if strong else cells[2].get_text(strip=True)

    # ── col 3: quantity ───────────────────────────────────────────────
    quantity = clean_number(cells[3].get_text(strip=True))

    # ── col 4: total amount ───────────────────────────────────────────
    total_sum = clean_number(cells[4].get_text(strip=True))

    # ── col 5: procurement method ─────────────────────────────────────
    method = cells[5].get_text(strip=True) if len(cells) > 5 else ""

    # ── col 6: status ─────────────────────────────────────────────────
    status = cells[6].get_text(strip=True) if len(cells) > 6 else ""

    unit_price = round(total_sum / quantity, 2) if quantity > 0 else 0.0

    return {
        "lot_id":         lot_id[:50],
        "announce_id":    announce_id,
        "announce_title": announce_title[:250],
        "customer_name":  customer_name[:300],
        "tru_name":       tru_name[:250],
        "quantity":       quantity,
        "total_sum":      total_sum,
        "unit_price":     unit_price,
        "method":         method[:100],
        "status":         status[:100],
    }


# ─── Announcement detail page parser ─────────────────────────────────────────

def parse_announce_page(soup: BeautifulSoup) -> dict:
    """
    Extract БИН and organizer name from /ru/announce/index/<id> (general tab).

    The organizer row looks like:
      <th>Организатор</th>
      <td>990240001722 Республиканское государственное предприятие...</td>
    """
    result = {"bin": "", "organizer_name": ""}

    for row in soup.find_all("tr"):
        th = row.find("th")
        td = row.find("td")
        if not th or not td:
            continue
        if "Организатор" in th.get_text(strip=True):
            td_text = td.get_text(" ", strip=True)
            # БИН is the leading 12-digit number
            m = re.match(r"^(\d{12})\s+(.*)", td_text, re.DOTALL)
            if m:
                result["bin"]            = m.group(1)
                result["organizer_name"] = re.sub(r"\s+", " ", m.group(2)).strip()[:300]
            else:
                m2 = re.search(r"\b(\d{12})\b", td_text)
                if m2:
                    result["bin"] = m2.group(1)
            break

    return result


# ─── Login endpoint (kept for backward compat) ────────────────────────────────

@router.post("/api/login")
def login_goszakup(req: LoginRequest):
    """Log in to goszakup.gov.kz and return ci_session cookie."""
    session = requests.Session()
    session.headers.update(HEADERS)

    print(f"🔐 [Login] GET {LOGIN_URL}")
    try:
        login_page = session.get(LOGIN_URL, timeout=15)
        print(f"🔐 [Login] status: {login_page.status_code}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cannot reach login page: {e}")

    soup = BeautifulSoup(login_page.text, "html.parser")
    form_data = {}
    form = soup.find("form")
    if form:
        for hidden in form.find_all("input", type="hidden"):
            if hidden.get("name"):
                form_data[hidden["name"]] = hidden.get("value", "")

    form_data["login"]    = req.iin
    form_data["password"] = req.password

    try:
        resp = session.post(LOGIN_URL, data=form_data, timeout=15, allow_redirects=True)
        print(f"🔐 [Login] POST status: {resp.status_code}, url: {resp.url}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login POST failed: {e}")

    title = BeautifulSoup(resp.text, "html.parser").title
    title_text = title.string if title else ""
    if "авторизац" in title_text.lower() or "login" in resp.url.lower():
        raise HTTPException(status_code=401, detail="Неверный ИИН или пароль")

    ci_session = (session.cookies.get("ci_session", domain="v3bl.goszakup.gov.kz")
                  or session.cookies.get("ci_session"))
    if not ci_session:
        raise HTTPException(status_code=500, detail="Login succeeded but no ci_session found")

    print(f"✅ [Login] Got ci_session ({len(ci_session)} chars)")
    return {"status": "success", "cookie": f"ci_session={ci_session}", "title": title_text}


# ─── Main scraper (no auth required) ─────────────────────────────────────────

@router.get("/api/scrape")
def scrape_goszakup(pages: int = 3, records_per_page: int = 50, session_cookie: str = None):
    """
    Scrape public lot data from goszakup.gov.kz without authentication.

    Flow:
      1. GET /ru/search/lots?count_record=N&page=P  → parse all lot rows (7 columns)
      2. GET /ru/announce/index/<id>                → parse БИН from organizer table row
      3. Merge: unit_price = total_sum / quantity (from search table)

    Returns list of records with fields:
      lot_id, announce_id, announce_title, customer_bin, customer_name,
      tru_name, quantity, unit_price, total_sum, method, status
    """
    print(f"⏳ [Scraper] Starting — {pages} pages × {records_per_page} = up to {pages * records_per_page} lots")

    session = requests.Session()
    session.headers.update(HEADERS)

    if session_cookie:
        decoded = unquote(unquote(session_cookie))
        for part in decoded.split(";"):
            part = part.strip()
            if "=" in part:
                name, _, value = part.partition("=")
                session.cookies.set(name.strip(), unquote(value.strip()), domain="goszakup.gov.kz")

    # announce_id → {"bin": str, "organizer_name": str}
    announce_cache: dict[str, dict] = {}
    collected: list[dict] = []

    for page_num in range(1, pages + 1):
        search_url = f"{SEARCH_URL}?count_record={records_per_page}&page={page_num}"
        print(f"\n📄 [Page {page_num}/{pages}] GET {search_url}")

        try:
            resp = session.get(
                search_url, timeout=20,
                headers={**HEADERS, "Referer": "https://goszakup.gov.kz/ru/search/lots"},
            )
            print(f"   HTTP {resp.status_code}")
        except Exception as e:
            print(f"   ❌ Request failed: {e}")
            break

        soup = BeautifulSoup(resp.text, "html.parser")
        table = soup.find("table", id="search-result")
        if not table:
            print("   ⚠️ #search-result table not found — stopping pagination")
            break

        rows = table.find_all("tr")[1:]  # skip <thead> row
        print(f"   Rows: {len(rows)}")
        if not rows:
            print("   ⚠️ Empty table — stopping")
            break

        page_lots: list[dict] = []
        for row in rows:
            parsed = parse_search_row(row)
            if parsed:
                page_lots.append(parsed)

        print(f"   Parsed: {len(page_lots)} lots")

        # Fetch only unseen announcement pages
        new_ids = [
            aid for aid in dict.fromkeys(p["announce_id"] for p in page_lots)
            if aid not in announce_cache
        ]
        print(f"   New announce pages to fetch: {len(new_ids)}")

        for ann_id in new_ids:
            delay = random.uniform(0.8, 2.0)
            ann_url = f"{BASE_URL}/ru/announce/index/{ann_id}"
            print(f"   ⏳ {delay:.1f}s → GET {ann_url}")
            time.sleep(delay)

            try:
                ann_resp = session.get(
                    ann_url, timeout=20,
                    headers={**HEADERS,
                             "Referer": search_url,
                             "Sec-Fetch-Site": "same-origin"},
                )
                ann_soup = BeautifulSoup(ann_resp.text, "html.parser")
                ann_info = parse_announce_page(ann_soup)
                announce_cache[ann_id] = ann_info
                print(f"   ✅ {ann_id}: БИН={ann_info['bin'] or '—'}")
            except Exception as e:
                print(f"   ❌ {ann_id}: {e}")
                announce_cache[ann_id] = {"bin": "", "organizer_name": ""}

        # Merge lot row data with announcement info
        for lot in page_lots:
            ann = announce_cache.get(lot["announce_id"], {})
            # Prefer customer_name from search row (short name); fall back to full organizer name
            customer_name = lot["customer_name"] or ann.get("organizer_name", "")

            collected.append({
                "lot_id":         lot["lot_id"],
                "announce_id":    lot["announce_id"],
                "announce_title": lot["announce_title"],
                "customer_bin":   ann.get("bin", ""),
                "customer_name":  customer_name,
                "tru_name":       lot["tru_name"],
                "quantity":       lot["quantity"],
                "unit_price":     lot["unit_price"],
                "total_sum":      lot["total_sum"],
                "method":         lot["method"],
                "status":         lot["status"],
            })

        print(f"   Running total: {len(collected)} lots")

        if page_num < pages:
            time.sleep(random.uniform(2.0, 4.0))

    print(f"\n{'━' * 50}")
    print(f"🎉 Done — {len(collected)} lots from {len(announce_cache)} announcements")
    print(f"{'━' * 50}")
    return {"status": "success", "total_scraped": len(collected), "data": collected}

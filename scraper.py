import hashlib
import requests
from bs4 import BeautifulSoup


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}


def fetch_content(url: str) -> tuple[str, str]:
    """
    Fetch a webpage and extract cleaned text.
    Returns (text_content, md5_hash).
    Raises on network / HTTP errors.
    """
    response = requests.get(url, headers=HEADERS, timeout=15)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "lxml")

    # Remove noise tags
    for tag in soup(["script", "style", "nav", "footer", "head",
                     "noscript", "iframe", "svg", "meta", "link"]):
        tag.decompose()

    text = soup.get_text(separator="\n", strip=True)

    # Collapse blank lines
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    clean_text = "\n".join(lines)

    content_hash = hashlib.md5(clean_text.encode("utf-8", errors="ignore")).hexdigest()
    return clean_text, content_hash

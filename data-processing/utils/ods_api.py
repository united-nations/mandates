import os

import requests
from dotenv import load_dotenv
from typing import Literal

from utils.cache import cache

load_dotenv()

# how to obtain UNDOCS token:
# - go to https://documents.un.org/ and login with your UN account
# - open the developer tools (F12)
# - go to the network tab
# - refresh the page
# - find the request to https://documents.un.org/api/search
# - copy the Authorization header
# - save it to the .env file as ODS_TOKEN

ODS_TOKEN = os.getenv("ODS_TOKEN")

languages = [
    "arabic",
    "chinese",
    "english",
    "french",
    "russian",
    "spanish",
]


@cache
def search(symbol: str, language: str = "english", limit: int = 1000):
    response = requests.post(
        "https://documents.un.org/api/search",
        headers={
            "Authorization": f"Bearer {ODS_TOKEN}",
        },
        json={
            "symbol": symbol,
            "jobNumber": "",
            "publicationDate": "* TO *",
            "releaseDate": "* TO *",
            "title": "",
            "subject": "",
            "session": "",
            "agenda": "",
            "truncation": "right",
            "fullTextSearch": {
                "language": "en",
                "searchText": "",
                "type": "Find this phrase",
                "exact": False,
            },
            "sortOptions": {"sortField": "Sort by relevance"},
            "pagination": {"currentPage": 1, "itemsPerPage": limit},
            "screenLanguage": "en",
            "tcodes": [],
        },
    )
    try:
        response.raise_for_status()
        results = response.json()["body"]["data"]
    except Exception as e:
        if response.status_code == 403:
            raise Exception(
                "403 Forbidden: Please check your UNDOCS_TOKEN, consider refreshing it"
            )
        else:
            raise e
    lang = languages.index(language)
    for result in results:
        id = result["id"]
        jobNumber = result["job_numbers"][lang]
        downloadUrl = f"https://documents.un.org/api/symbol/access?j={jobNumber}&i={id}"
        result["job_number"] = jobNumber
        result["release_date"] = result["release_dates"][lang]
        result["pdf_url"] = f"{downloadUrl}&t=pdf"
        result["docx_url"] = f"{downloadUrl}&t=docx"
    return results 

@cache
def get(symbol: str, doc_type: Literal["pdf", "docx"]):
    return requests.get(f"https://documents.un.org/api/symbol/access?s={symbol}&l=en&t={doc_type}")

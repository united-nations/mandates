import json
import re
from pathlib import Path

import pandas as pd
import pypandoc
from bs4 import BeautifulSoup

input_file = Path("data/downloads/ppb2026/docx/A_80_6_PLANOUTLINE.docx")
html = pypandoc.convert_file(input_file, "html", format="docx")
soup = BeautifulSoup(html, "html.parser")

priority_areas = [
    "Promotion of sustained economic growth and sustainable development",  # in accordance with the relevant resolutions of the General Assembly and recent United Nations conferences
    "Maintenance of international peace and security",
    "Development of Africa",
    "Promotion of human rights",
    "Effective coordination of humanitarian assistance efforts",
    "Promotion of justice and international law",
    "Disarmament",
    "Drug control, crime prevention and combating international terrorism in all its forms and manifestations",
]


def normalize(text):
    if text is None:
        return None
    text = re.sub(r"\s+|\n", " ", text)
    return text


links = []
priority_area = None
for element in soup.descendants:
    _priority_areas = [normalize(area) for area in priority_areas]
    if normalize(element.get_text()) in _priority_areas:
        priority_area = element.get_text()
    if normalize(element.get_text()) == normalize(
        "Effective functioning of the Organization"
    ):
        priority_area = None
    if element.name == "a":
        links.append(
            {
                "Priority Area": normalize(priority_area),
                "Mandate Symbol": element.get_text(),
                "Mandate Symbol Full": element.get("href").replace(
                    "https://docs.un.org/en/", ""
                ),
                "Link": element.get("href"),
            }
        )

df = pd.DataFrame(links)
df = df.dropna(subset=["Priority Area"])

# drug control ... ~~ in all its forms and manifestations ~~
df["Priority Area"] = df["Priority Area"].str.replace(
    "Drug control, crime prevention and combating international terrorism in all its forms and manifestations",
    "Drug control, crime prevention and combating international terrorism",
)

df.to_csv("data/processed/ppb2026/share/mandates_plan_outline.csv", index=False)
df.to_excel("data/processed/ppb2026/share/mandates_plan_outline.xlsx", index=False)

df["Priority Area"].value_counts(dropna=False)

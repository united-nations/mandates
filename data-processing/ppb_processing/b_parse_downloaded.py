import json
import os
import re
from copy import deepcopy
from dataclasses import dataclass
from pathlib import Path

import docx
from docx.table import Table
from natsort import natsorted
from tqdm import tqdm

from utils.docx_utils import extract_field_links_from_paragraph


def block_type(el):
    style = el.style.style_id
    text = el.text.strip()
    # Annex I, II
    if re.match(r"^Annex\s[IVXLCDM]+", text):
        return "annex"
    if style == "HCh":
        # roman numerals like I., XIV.
        if re.match(r"^[IVXL]+\.\s", text):
            return "entity-group"
        # 1., 2., 3.
        if re.match(r"^\d+\.\s", text):
            return "entity"
        # A., B., C.
        if re.match(r"^[A-Z]\.\s", text):
            return "a/b"
        return "heading"
    if style == "H1":
        # Subprogramme 1
        if re.match(r"^Subprogramme\s\d+", text):
            return "subprogramme"
        return "heading-sub"
    if style == "H23":
        # Table 1.54
        if re.match(r"^Table\s\d+[A-Z]?\.([IVXLCDM]+\.)?\d+", text):
            return "table"
        # Figure 1.55
        if re.match(r"^Figure\s\d+[A-Z]?\.[IVXLCDM]+", text):
            return "figure"
        # (a), (b), (c)
        if re.match(r"^\(\w\)\s", text):
            return "list-1"
        return "heading-sub-sub"
    if style == "H4":
        # (a), (b), (c); (1), (2), (3)
        if re.match(r"\((\w|\d+)\)\s", text):
            return "list-2"
        if el.style.font.italic:
            return "italic"
        return "heading-sub-sub-sub"
    # 1.53
    if re.match(r"^\d+[A-Z]?\.([IVXLCDM]+\.)?\d*\s", text) or style == "ListParagraph":
        return "paragraph-1"
    # (i), (ii), (iii)
    if re.match(r"^\([ivxl]+\)\s", text):
        return "paragraph-3"
    # (a), (b), (c)
    if re.match(r"\(\w\)\s", text):
        return "paragraph-2"
    # (in brackets)
    if re.match(r"^\(.*\)$", text):
        return "note"
    # catch entity groups that are not properly formatted (!!!)
    if re.match(r"^[IVXL]+\.\s", text):
        return "entity-group"
    # catch A/B headers that are not properly formatted
    if re.match(r"^[A-Z]\.\s", text):
        return "a/b"
    # catch subprogrammes that are not properly formatted
    if re.match(r"^Subprogramme\s\d+\s*$", text):
        return "subprogramme"
    if re.match(r"^Overall orientation|Programme of work$", text):
        return "heading"
    if re.match(
        r"^(Mandates and background|Objective|Strategy and external factors for \d+|Legislative mandates|Deliverables|Evaluation activities|Programme performance in \d+|Planned results for \d+|Overview|Explanation of variances by factor|Overall resource changes)$",
        text,
    ):
        return "heading-sub"
    if re.match(r"^.*resolutions?$", text):
        return "italic"
    # no punctuation
    if re.match(r"^[A-Za-z].*[A-Za-z0-9()]$", text):
        return "heading-x"
    # image
    if "graphicData" in el._p.xml:
        return "image"
    return "other"


headings = [
    "annex",
    "entity-group",
    "entity",
    "frontmatter",
    "a/b",
    "heading",
    "subprogramme",
    "heading-sub",
    "heading-sub-sub",
    "heading-sub-sub-sub",
    "heading-x",
    "table",
    "figure",
]

order = {
    "annex": 0,
    "entity-group": 0,
    "entity": 1,
    "frontmatter": 2,
    "a/b": 2,
    "heading": 3,
    "subprogramme": 4,
    "heading-sub": 5,
    "heading-sub-sub": 6,
    "list-1": 7,
    "italic": 8,
    "paragraph-1": 9,
    "paragraph-2": 10,
    "paragraph-3": 11,
    "table": 9,
    "figure": 9,
    "heading-sub-sub-sub": 10,
    "list-2": 10,
    "heading-x": 8,
    "table-content": 11,
    "image": 11,
    "note": 11,
    "other": 11,
}


@dataclass
class ParserState:
    position: list[tuple[str, str]]
    italic_env: bool = False

    @property
    def parent_type(self):
        if not self.position:
            return None
        return self.position[-1][0]

    @property
    def parent_type_order(self):
        return order.get(self.parent_type, -1)


@dataclass
class Element:
    position: list[tuple[str, str]]
    block_type: str
    text: str
    table_content: list[list[str]] | None
    hyperlinks: list[str] | None


def annotate_elements(doc: docx.Document):
    state = ParserState(position=[("frontmatter", "[Frontmatter]")])
    elements = [
        Element(
            position=[],
            block_type="frontmatter",
            text="[Frontmatter]",
            table_content=None,
            hyperlinks=None,
        )
    ]
    for i, element in enumerate(doc.iter_inner_content()):
        if isinstance(element, Table):
            block_type_ = "table-content"
            text = None
            table_content = [
                [
                    {
                        "text": cell.text,
                        "hyperlinks": [
                            (text, url)
                            for p in cell.paragraphs
                            for text, url in extract_field_links_from_paragraph(p)
                        ],
                    }
                    for cell in row.cells
                ]
                for row in element.rows
            ]
            hyperlinks = [
                link
                for row in table_content
                for cell in row
                for link in cell["hyperlinks"]
                if link
            ]
        else:
            block_type_ = block_type(element)
            text = element.text.strip()
            # include style info -- very useful for debugging!
            # if text:
            #     text = element.style.style_id + " // " + text
            table_content = None
            hyperlinks = [
                (text, url) for text, url in extract_field_links_from_paragraph(element)
            ]
        # headers are sometimes split over two lines, and we combine them
        if block_type_ in headings and elements[-1].block_type == block_type_:
            combined_text = elements[-1].text + " – " + element.text.strip()
            elements[-1].text = combined_text
            state.position[-1] = (block_type_, combined_text)
            continue
        # table/figure headers consist of two lines with different styles that we combine
        if (
            elements[-1].block_type in ("table", "figure")
            and block_type_ == "heading-sub"
        ):
            combined_text = elements[-1].text + " " + element.text.strip()
            elements[-1].text = combined_text
            state.position[-1] = (elements[-1].block_type, combined_text)
            continue
        # subprogramme headers consist of two lines with different styles that we combine
        if (
            elements[-1].block_type == "subprogramme"
            and block_type_ in ("heading-sub", "heading-x")
            and "–" not in elements[-1].text
        ):
            combined_text = elements[-1].text + " – " + element.text.strip()
            elements[-1].text = combined_text
            state.position[-1] = (elements[-1].block_type, combined_text)
            continue
        # annex headers consist of two lines with different styles that we combine
        if elements[-1].block_type == "annex" and block_type_ == "heading":
            combined_text = elements[-1].text + " " + element.text.strip()
            elements[-1].text = combined_text
            state.position[-1] = (elements[-1].block_type, combined_text)
            continue
        # subprogrammes should not exist within legislative mandates
        if block_type_ == "subprogramme" and any(
            h[1] == "Legislative mandates" for h in state.position
        ):
            block_type_ = "heading-sub-sub"
        # italic headers only apply to a single paragraph, plus sub-paragraphs
        if (
            state.italic_env
            and state.parent_type != "italic"
            and order[block_type_] <= order["paragraph-1"]
        ):
            while "italic" in [bt for bt, _ in state.position]:
                state.position.pop()
            state.italic_env = False
        if block_type_ == "italic":
            state.italic_env = True
        while order[block_type_] <= state.parent_type_order:
            state.position.pop()
        element = Element(
            position=deepcopy(state.position),
            block_type=block_type_,
            text=text,
            table_content=table_content,
            hyperlinks=hyperlinks,
        )
        if element.text or block_type_ in ("table-content", "image"):
            elements.append(element)
            state.position.append((block_type_, text))
    return elements


def make_hierarchy(elements: list[Element], level=0):
    if not elements:
        return []

    # Group elements by their level
    by_level = {}
    for el in elements:
        el_level = len(el.position)
        if el_level >= level:  # Only consider relevant levels
            if el_level not in by_level:
                by_level[el_level] = []
            by_level[el_level].append(el)

    # Build hierarchy for the target level - O(n) total
    if level not in by_level:
        return []

    # Create a mapping for quick child lookup - O(n)
    children_map = {}
    for current_level in range(level + 1, max(by_level.keys()) + 1):
        if current_level not in by_level:
            continue
        for el in by_level[current_level]:
            if len(el.position) > level:
                parent_key = el.position[level]
                if parent_key not in children_map:
                    children_map[parent_key] = []
                children_map[parent_key].append(el)

    # Build final hierarchy - O(n)
    hierarchy = []
    for el in by_level[level]:
        parent_key = (el.block_type, el.text)
        children = children_map.get(parent_key, [])

        hierarchy.append(
            {
                "block_type": el.block_type,
                "text": el.text,
                "table_content": el.table_content,
                "hyperlinks": el.hyperlinks,
                "children": make_hierarchy(children, level + 1) if children else [],
            }
        )

    return hierarchy

def parse_ppb_docs(year):
    files = Path(f"../data/downloads/ppb{year}").glob("*.docx")
    output_dir = Path(f"../data/processed/ppb{year}/json")
    output_dir.mkdir(parents=True, exist_ok=True)
    q = tqdm(natsorted(files))
    for input_file in q:
        q.set_description(f"Processing {input_file.stem}")
        doc = docx.Document(input_file)
        elements = annotate_elements(doc)
        hierarchy = make_hierarchy(elements, 0)
        output_file = output_dir / f"{input_file.stem.upper()}.json"
        output_file.parent.mkdir(parents=True, exist_ok=True)
        json.dump(hierarchy, output_file.open("w"), indent=2, ensure_ascii=False)
        q.update(1)

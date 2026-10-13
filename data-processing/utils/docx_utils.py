import re
from pathlib import Path
from typing import Generator, List

from docx.oxml.ns import qn
from lxml import etree
from natsort import natsorted, ns


HYPERLINK_RE = re.compile(r'HYPERLINK\s+"([^"]+)"', re.I)


def extract_field_links_from_paragraph(el) -> list[tuple[str, str]]:
    # normal method
    links_normal = [(link.text, link.url) for link in el.hyperlinks if link.url]
    # field-based method
    links_field = []
    p_xml = el._p
    url, display, in_field, after_sep = None, [], False, False
    for node in p_xml.iter():
        tag = etree.QName(node).localname
        if tag == "fldChar":
            fld_type = node.get(qn("w:fldCharType"))
            if fld_type == "begin":
                url, display, in_field, after_sep = None, [], True, False
            elif fld_type == "separate" and in_field:
                after_sep = True
            elif fld_type == "end" and in_field:
                if url and display:
                    if "http" in url:
                        links_field.append(("".join(display), url))
                in_field = after_sep = False
        elif tag == "instrText" and in_field:
            m = HYPERLINK_RE.search(node.text or "")
            if m:
                url = m.group(1)
        elif after_sep and tag == "t" and node.text:
            display.append(node.text)
    return sort_links(links_normal, links_field)


def sort_links(
    links_normal: list[tuple[str, str]], links_field: list[tuple[str, str]]
) -> list[tuple[str, str]]:
    links = []
    while links_normal or links_field:
        if links_normal and links_field:
            # link is found by both method
            if links_normal[0][1] == links_field[0][1]:
                links.append(links_normal.pop(0))
                links_field.pop(0)
            elif links_normal[0][1] not in [f[1] for f in links_field]:
                links.append(links_normal.pop(0))
            else:
                links.append(links_field.pop(0))
        elif links_normal:
            links.append(links_normal.pop(0))
        elif links_field:
            links.append(links_field.pop(0))
    return links


def test_sort_links():
    # test links
    links_normal = [
        ("apple", "https://www.apple.com"),
        ("cherry", "https://www.cherry.com"),
        ("date", "https://www.date.com"),
        ("elderberry", "https://www.elderberry.com"),
        ("fig", "https://www.fig.com"),
        ("grape", "https://www.grape.com"),
    ]
    links_field = [
        ("google", "https://www.google.com"),
        ("banana", "https://www.banana.com"),
        ("cherry", "https://www.cherry.com"),
        ("date", "https://www.date.com"),
        ("fig", "https://www.fig.com"),
    ]

    links = sort_links(links_normal, links_field)
    assert links == [
        ("apple", "https://www.apple.com"),
        ("google", "https://www.google.com"),
        ("banana", "https://www.banana.com"),
        ("cherry", "https://www.cherry.com"),
        ("date", "https://www.date.com"),
        ("elderberry", "https://www.elderberry.com"),
        ("fig", "https://www.fig.com"),
        ("grape", "https://www.grape.com"),
    ]


if __name__ == "__main__":
    test_sort_links()

"""Rebuild excerpt PDF locators from the archived page-delimited report text."""

import json
import re
from pathlib import Path

folder = Path(__file__).resolve().parent
repository = folder.parents[2]
corpus_path = folder / 'report-corpus.json'
fixture_path = repository / 'website/src/data/implementation-evidence-pilot.json'
corpus = json.loads(corpus_path.read_text())

for symbol, report in corpus.items():
    pages = re.split(r'=== PDF PAGE (\d+) ===', report['sourceText'])
    source = ''
    page_offsets = []
    for index in range(1, len(pages), 2):
        page = int(pages[index])
        body = pages[index + 1].split('__________________')[0]
        lines = [line for line in body.splitlines()
                 if line.strip() != symbol
                 and not re.fullmatch(r'[\d/\-– ()E*]+', line.strip())]
        start = len(source)
        source += '\n' + '\n'.join(lines) + '\n'
        page_offsets.append((start, len(source), page))

    markers = []
    expected = 1
    for marker in re.finditer(r'(?m)^(\d{1,3})\.\s+', source):
        if int(marker[1]) == expected:
            markers.append(marker)
            expected += 1
    assert len(markers) == len(report['paragraphs']), symbol
    for index, paragraph in enumerate(report['paragraphs']):
        marker = markers[index]
        stop = markers[index + 1].start() if index + 1 < len(markers) else len(source)
        raw = source[marker.end():stop]
        normalized = re.sub(r'\s+', ' ', raw).strip()
        assert normalized.startswith(paragraph['text']), (symbol, paragraph['number'])
        spans = []
        cursor = 0
        for token in re.finditer(r'\S+', raw):
            if cursor >= len(paragraph['text']):
                break
            absolute = marker.end() + token.start()
            page = next(page for start, end, page in page_offsets if start <= absolute < end)
            end = min(cursor + len(token[0]), len(paragraph['text']))
            if spans and spans[-1]['pdfPage'] == page:
                spans[-1]['end'] = end
            else:
                if spans:
                    spans[-1]['end'] = cursor
                spans.append({'start': cursor, 'end': end, 'pdfPage': page})
            cursor += len(token[0]) + 1
        assert spans and spans[-1]['end'] == len(paragraph['text'])
        paragraph['pageSpans'] = spans

cases = json.loads(fixture_path.read_text())
count = 0
for case in cases:
    paragraphs = {p['number']: p for p in corpus[case['report']['symbol']]['paragraphs']}
    for provision in case['paragraphs']:
        for passage in provision['passages']:
            source = paragraphs[passage['number']]
            assert source['text'] == passage['text']
            for mapping in passage['mappings']:
                for excerpt in mapping.get('excerpts', []):
                    assert passage['text'].count(excerpt['text']) == 1
                    start = passage['text'].index(excerpt['text'])
                    end = start + len(excerpt['text']) - 1
                    excerpt['pdfPage'] = next(s['pdfPage'] for s in source['pageSpans']
                                              if s['start'] <= start < s['end'])
                    last_page = next(s['pdfPage'] for s in source['pageSpans']
                                     if s['start'] <= end < s['end'])
                    if last_page != excerpt['pdfPage']:
                        excerpt['pdfPageEnd'] = last_page
                    else:
                        excerpt.pop('pdfPageEnd', None)
                    count += 1

corpus_path.write_text(json.dumps(corpus, ensure_ascii=False, indent=2) + '\n')
fixture_path.write_text(json.dumps(cases, ensure_ascii=False, indent=2) + '\n')
print(f'Located {count} excerpts across {len(corpus)} complete reports.')

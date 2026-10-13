-- 028_backfill_ppb_body.sql
--
-- Attribute PPB 2027 (and any other NULL-body) mandate documents to their organ.
--
-- Background: the PPB fascicles list mandates grouped under plain-text body
-- headers ("Commission on Narcotic Drugs resolutions", ...) and only hyperlink
-- the principal-organ families (A/RES, E/RES, S/RES). The extraction pipeline
-- therefore captures the header into source_documents.ppb_document_source but
-- leaves ppb_body NULL, so ~1,300 PPB-2027-cited docs (incl. CND, CCPCJ, CPD,
-- CSD, ECA, ECE, ECLAC, ESCAP, ESCWA, UNEA, UNTOC COP, UNCLOS, UN-Habitat, ...)
-- fall out of the organ facet. In the 2026 cycle a manual Airtable step assigned
-- these organs; this migration automates the same mapping.
--
-- The mapping mirrors data/references/ppb_body_source_map.tsv (canonical copy,
-- also read by the extraction pipeline). Keep the two in sync when editing.
-- Validated to reproduce 60/62 of the 2026 human organ assignments.

-- 1. Persistent body-header -> organ mapping (SQL source of truth; a future PPB
--    re-import can re-run the UPDATE in step 3 against this table to stay
--    correct without touching applied import migrations).
create table if not exists ppb2026.body_source_organ_map (
    priority     integer primary key,
    pattern      text    not null,
    organ_short  text    not null references ppb2026.organs (short)
);

insert into ppb2026.body_source_organ_map (priority, pattern, organ_short) values
    (10,  'UN-Habitat',                                                'UNHA and Other'),
    (20,  'Habitat Assembly',                                          'UNHA and Other'),
    (30,  'Committee of Permanent Representatives',                    'UNHA and Other'),
    (40,  'Executive Board',                                           'UNHA and Other'),
    (50,  'Governing Council of the United Nations Environment Programme', 'UNEA'),
    (60,  'Governing Council of UNEP',                                 'UNEA'),
    (70,  'Environment Assembly',                                      'UNEA'),
    (80,  'Environment Programme',                                     'UNEA'),
    (90,  'Commission on Narcotic Drugs',                              'CND'),
    (100, 'Crime Prevention and Criminal Justice',                    'CCPCJ'),
    (110, 'Commission on Population and Development',                  'CPD'),
    (120, 'Commission for Social Development',                         'CSD'),
    (130, 'Status of Women',                                          'CSW'),
    (140, 'Commission on Human Rights',                               'HRC'),
    (150, 'Economic Commission for Africa',                           'ECA'),
    (160, 'Economic Commission for Europe',                           'ECE'),
    (170, 'Economic Commission for Latin America',                    'ECLAC'),
    (180, 'ECLAC',                                                     'ECLAC'),
    (190, 'Economic and Social Commission for Asia',                  'ESCAP'),
    (200, 'Economic and Social Commission for Western Asia',          'ESCWA'),
    (210, 'Convention against Transnational Organized Crime',         'UNTOC COP'),
    (220, 'Law of the Sea',                                           'UNCLOS'),
    (230, 'Fish Stocks',                                              'UNCLOS'),
    (240, 'International Narcotics Control Board',                     'INCB'),
    (250, 'World Trade Organization',                                 'WTO'),
    (260, 'Trade and Development',                                     'UNCTAD'),
    (270, 'Convention against Corruption',                            'Other'),
    (280, 'transport agreements',                                     'Other'),
    (290, 'Escaz',                                                    'Other'),
    (300, 'Access to Information, Public Participation',              'Other'),
    (310, 'Covenant',                                                 'Other'),
    (320, 'Universal Declaration',                                    'Other'),
    (330, 'Conventions and',                                          'Other'),
    (340, 'Conference declarations',                                  'Other'),
    (350, 'Framework Convention on Climate Change',                   'Other'),
    (360, 'Conference on Disarmament',                                'Other'),
    (370, 'Governing Council',                                        'Other'),
    (380, 'Security Council',                                         'SC'),
    (390, 'Economic and Social Council',                              'ECOSOC'),
    (400, 'ECOSOC',                                                    'ECOSOC'),
    (410, 'Human Rights Council',                                     'HRC'),
    (420, 'General Assembly',                                         'GA'),
    (430, 'Charter of the United Nations',                            'Charter'),
    (440, 'Secretary-General',                                        'Other')
on conflict (priority) do update
    set pattern = excluded.pattern, organ_short = excluded.organ_short;

-- 2. Back-fill ppb_body for every source document that still lacks one, using
--    the lowest-priority (most specific) matching pattern per document.
update ppb2026.source_documents sd
set ppb_body = m.organ_short
from (
    select distinct on (s.ppb_full_document_symbol)
        s.ppb_full_document_symbol,
        map.organ_short
    from ppb2026.source_documents s
    join ppb2026.body_source_organ_map map
        on s.ppb_document_source ilike '%' || map.pattern || '%'
    where s.ppb_body is null
    order by s.ppb_full_document_symbol, map.priority
) m
where sd.ppb_full_document_symbol = m.ppb_full_document_symbol
  and sd.ppb_body is null;

-- 3. Surface the matview so the organ facet reflects the new attributions.
refresh materialized view public.unified_documents;

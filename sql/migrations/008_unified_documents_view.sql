-- Add organs from digitallibrary that are missing from ppb2026.organs
insert into ppb2026.organs (short, long, website, sort_order)
values
    ('HRB', 'Human Rights Bodies', 'https://www.ohchr.org/en/treaty-bodies', 14),
    ('PF', 'Programmes and Funds', null, 18),
    ('TC', 'Trusteeship Council', 'https://www.un.org/en/about-us/trusteeship-council', 20)
on conflict (short) do update
set long = excluded.long,
    website = excluded.website,
    sort_order = excluded.sort_order;

-- Renumber sort_order for existing organs shifted by the new entries
update ppb2026.organs set sort_order = 15 where short = 'HRC';
update ppb2026.organs set sort_order = 16 where short = 'INCB';
update ppb2026.organs set sort_order = 17 where short = 'Other';
update ppb2026.organs set sort_order = 19 where short = 'SC';
update ppb2026.organs set sort_order = 21 where short = 'UNCLOS';
update ppb2026.organs set sort_order = 22 where short = 'UNCTAD';
update ppb2026.organs set sort_order = 23 where short = 'UNEA';
update ppb2026.organs set sort_order = 24 where short = 'UNHA and Other';
update ppb2026.organs set sort_order = 25 where short = 'UNTOC COP';
update ppb2026.organs set sort_order = 26 where short = 'WTO';

-- Create unified view combining PPB source documents with Digital Library resolutions
create or replace view public.unified_documents as
-- PPB source documents
select
    ppb_full_document_symbol,
    ppb_description,
    ppb_link,
    ppb_year,
    ppb_body,
    ppb_type,
    true as is_ppb
from ppb2026.source_documents
union all
-- Digital Library resolutions not already in PPB
select
    dl.document_symbol as ppb_full_document_symbol,
    dl.title as ppb_description,
    null as ppb_link,
    extract(year from dl.date_publication)::smallint as ppb_year,
    coalesce(
        o.short,
        case dl.un_body
            when 'Other UN Bodies and Entities' then 'Other'
            else null
        end
    ) as ppb_body,
    'Resolutions' as ppb_type,
    false as is_ppb
from digitallibrary.documents dl
left join ppb2026.organs o on o.long = dl.un_body
where dl.document_symbol ~ '/RES/'
    and dl.deleted_at is null
    and not exists (
        select 1 from ppb2026.source_documents p
        where p.ppb_full_document_symbol = dl.document_symbol
    );

grant select on public.unified_documents to mandates_readonly;

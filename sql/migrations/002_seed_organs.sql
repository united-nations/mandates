-- Seed: ppb2026.organs
-- All UN organs/bodies available in the mandate registry.
-- Migrated from data/organs.json.
insert into ppb2026.organs (short, long, website, sort_order)
values (
        'CCPCJ',
        'Commission on Crime Prevention and Criminal Justice',
        'https://www.unodc.org/unodc/en/commissions/CCPCJ/index.html',
        1
    ),
    (
        'CND',
        'Commission on Narcotic Drugs',
        'https://www.unodc.org/unodc/commissions/CND/',
        2
    ),
    (
        'CPD',
        'Commission on Population and Development',
        'https://www.un.org/development/desa/pd/content/CPD',
        3
    ),
    (
        'CSD',
        'Commission on Sustainable Development',
        'https://sustainabledevelopment.un.org/csd.html',
        4
    ),
    (
        'CSW',
        'Commission on the Status of Women',
        'https://www.unwomen.org/en/how-we-work/commission-on-the-status-of-women',
        5
    ),
    (
        'Charter',
        'Charter of the United Nations',
        'https://www.un.org/about-us/un-charter/',
        6
    ),
    (
        'ECA',
        'Economic Commission for Africa',
        'https://www.uneca.org/',
        7
    ),
    (
        'ECE',
        'Economic Commission for Europe',
        'https://unece.org/',
        8
    ),
    (
        'ECLAC',
        'Economic Commission for Latin America and the Caribbean',
        'https://www.cepal.org/en',
        9
    ),
    (
        'ECOSOC',
        'Economic and Social Council',
        'https://ecosoc.un.org/',
        10
    ),
    (
        'ESCAP',
        'Economic and Social Commission for Asia and the Pacific',
        'https://www.unescap.org/',
        11
    ),
    (
        'ESCWA',
        'Economic and Social Commission for Western Asia',
        'https://www.unescwa.org/',
        12
    ),
    (
        'GA',
        'General Assembly',
        'https://www.un.org/ga',
        13
    ),
    (
        'HRB',
        'Human Rights Bodies',
        'https://www.ohchr.org/en/treaty-bodies',
        14
    ),
    (
        'HRC',
        'Human Rights Council',
        'https://www.ohchr.org/hrbodies/hrc/home',
        15
    ),
    (
        'INCB',
        'International Narcotics Control Board',
        'https://www.incb.org/',
        16
    ),
    (
        'Other',
        'Other United Nations Bodies',
        null,
        17
    ),
    (
        'PF',
        'Programmes and Funds',
        null,
        18
    ),
    (
        'SC',
        'Security Council',
        'https://main.un.org/securitycouncil/',
        19
    ),
    (
        'TC',
        'Trusteeship Council',
        'https://www.un.org/en/about-us/trusteeship-council',
        20
    ),
    (
        'UNCLOS',
        'United Nations Convention on the Law of the Sea',
        'https://www.imo.org/en/ourwork/legal/pages/unitednationsconventiononthelawofsea.aspx',
        21
    ),
    (
        'UNCTAD',
        'United Nations Conference on Trade and Development',
        null,
        22
    ),
    (
        'UNEA',
        'United Nations Environment Assembly',
        'https://www.unep.org/environmentassembly/',
        23
    ),
    (
        'UNHA and Other',
        'United Nations Habitat Assembly and Other Related Bodies',
        'https://unhabitat.org/governance/un-habitat-assembly',
        24
    ),
    (
        'UNTOC COP',
        'Conference of the Parties to the United Nations Convention against Transnational Organized Crime',
        'https://www.unodc.org/unodc/en/organized-crime/intro/conference-of-the-parties.html',
        25
    ),
    (
        'WTO',
        'World Trade Organization',
        'https://www.wto.org/',
        26
    ) on conflict (short) do
update
set long = excluded.long,
    website = excluded.website,
    sort_order = excluded.sort_order;
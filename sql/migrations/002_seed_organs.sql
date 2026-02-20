-- Seed: ppb2026.organs
-- All UN organs/bodies available in the mandate registry.
-- Migrated from data/organs.json.
-- sort_order: only set for primary organs (GA=1, SC=2, ECOSOC=3, HRC=4), NULL for all others.

-- Make sort_order nullable first
ALTER TABLE ppb2026.organs ALTER COLUMN sort_order DROP NOT NULL;

insert into ppb2026.organs (short, long, website, sort_order) values
    ('CCPCJ',          'Commission on Crime Prevention and Criminal Justice',                               'https://www.unodc.org/unodc/en/commissions/CCPCJ/index.html',                       null),
    ('CND',            'Commission on Narcotic Drugs',                                                     'https://www.unodc.org/unodc/commissions/CND/',                                      null),
    ('CPD',            'Commission on Population and Development',                                         'https://www.un.org/development/desa/pd/content/CPD',                                null),
    ('CSD',            'Commission on Sustainable Development',                                            'https://sustainabledevelopment.un.org/csd.html',                                    null),
    ('CSW',            'Commission on the Status of Women',                                                'https://www.unwomen.org/en/how-we-work/commission-on-the-status-of-women',          null),
    ('Charter',        'Charter of the United Nations',                                                    'https://www.un.org/about-us/un-charter/',                                           null),
    ('ECA',            'Economic Commission for Africa',                                                   'https://www.uneca.org/',                                                            null),
    ('ECE',            'Economic Commission for Europe',                                                   'https://unece.org/',                                                               null),
    ('ECLAC',          'Economic Commission for Latin America and the Caribbean',                          'https://www.cepal.org/en',                                                          null),
    ('ECOSOC',         'Economic and Social Council',                                                      'https://ecosoc.un.org/',                                                               3),
    ('ESCAP',          'Economic and Social Commission for Asia and the Pacific',                          'https://www.unescap.org/',                                                          null),
    ('ESCWA',          'Economic and Social Commission for Western Asia',                                  'https://www.unescwa.org/',                                                          null),
    ('GA',             'General Assembly',                                                                 'https://www.un.org/ga',                                                                1),
    ('HRC',            'Human Rights Council',                                                             'https://www.ohchr.org/hrbodies/hrc/home',                                              4),
    ('INCB',           'International Narcotics Control Board',                                            'https://www.incb.org/',                                                             null),
    ('Other',          'Other United Nations Bodies',                                                      null,                                                                                null),
    ('SC',             'Security Council',                                                                 'https://main.un.org/securitycouncil/',                                                 2),
    ('UNCLOS',         'United Nations Convention on the Law of the Sea',                                  'https://www.imo.org/en/ourwork/legal/pages/unitednationsconventiononthelawofsea.aspx', null),
    ('UNCTAD',         'United Nations Conference on Trade and Development',                               null,                                                                                null),
    ('UNEA',           'United Nations Environment Assembly',                                              'https://www.unep.org/environmentassembly/',                                         null),
    ('UNHA and Other', 'United Nations Habitat Assembly and Other Related Bodies',                        'https://unhabitat.org/governance/un-habitat-assembly',                              null),
    ('UNTOC COP',      'Conference of the Parties to the United Nations Convention against Transnational Organized Crime', 'https://www.unodc.org/unodc/en/organized-crime/intro/conference-of-the-parties.html', null),
    ('WTO',            'World Trade Organization',                                                         'https://www.wto.org/',                                                              null)
on conflict (short) do update
    set long       = excluded.long,
        website    = excluded.website,
        sort_order = excluded.sort_order;

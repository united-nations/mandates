# GA agenda allocations

Checked 12 October 2026 against the live `un_daily_mirror.igov_agenda_items`
GA 80 snapshot and the adopted agenda, [A/80/251](https://digitallibrary.un.org/record/4088117/files/A_80_251-EN.pdf).

The page reads `AG_Allocation` (falling back to `allocation`) from the iGov
mirror. It does not infer allocations from resolutions or from parent items.
Multiple allocations are separated by semicolons.

An allocation identifies the forum responsible for consideration. “GA Plenary”
means direct plenary consideration. Main Committees send reports and recommended
resolutions/decisions back to plenary for action; that final step does not make
every item a plenary allocation. See the UN Library guides on
[agenda allocation](https://research.un.org/en/docs/ga/agenda) and
[Main Committees](https://research.un.org/en/docs/ga/committees).

All 334 GA 80 mirror rows became 334 agenda nodes, with zero duplicates or
exclusions. Nine nodes have no allocation: 1, 2, 3, 3(a), 3(b), 4, 6, 7, 8.
These concern opening, silent prayer/meditation, credentials, elections of the
President and Vice-Presidents, organization of work, and general debate.
A/80/251 explicitly allocates the corresponding main items to plenary;
3(a) and 3(b) sit under plenary item 3. Their blank mirror allocations are
source omissions, not evidence of a separate procedural category. Item 5,
election of Main Committee officers, does have all six committee allocations.

The committee filter uses explicit mirror tags, and exposes blank ones through
“No committee tag”. Ancestors and headings remain visible as context; unrelated
children do not inherit their parent's allocation. Thus the plenary filter
currently excludes the nine missing tags. Correcting the mirror, or introducing
an independently verified allocation source with provenance, would resolve that
gap. Treating every blank as plenary would hide future source gaps.

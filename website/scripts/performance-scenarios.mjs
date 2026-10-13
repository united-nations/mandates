export const PERFORMANCE_SCENARIOS = [
  { id: 'default', path: '/performance/secretariat', query: {} },
  { id: 'cited-only', path: '/performance/secretariat', query: { cited: '1' } },
  { id: 'page-2', path: '/performance/secretariat', query: { page: '2' } },
  {
    id: 'sort-year',
    path: '/performance/secretariat',
    query: { sort_by: 'year_desc' },
  },
  {
    id: 'group-versions',
    path: '/performance/secretariat',
    query: { group: '1' },
  },
  {
    id: 'keyword-exact',
    path: '/performance/secretariat',
    query: { keyword: 'A/RES/70/1' },
  },
  {
    id: 'keyword-broad',
    path: '/performance/secretariat',
    query: { keyword: 'peace' },
  },
  {
    id: 'keyword-empty',
    path: '/performance/secretariat',
    query: { keyword: 'zz-no-document-zz' },
  },
  { id: 'organ', path: '/performance/secretariat', query: { organ: 'GA' } },
  {
    id: 'entity',
    path: '/performance/secretariat',
    query: { entity: 'OHCHR' },
  },
  {
    id: 'subject',
    path: '/performance/secretariat',
    query: { subject: 'Human Rights' },
  },
  {
    id: 'year',
    path: '/performance/secretariat',
    query: { start_year: '2008', end_year: '2008' },
  },
  {
    id: 'document-type',
    path: '/performance/secretariat',
    query: { document_type: 'Resolutions' },
  },
  {
    id: 'budget-section',
    path: '/performance/secretariat',
    query: { section: '3' },
  },
  {
    id: 'version-2026',
    path: '/performance/secretariat',
    query: { ppb_version: 'ppb2026' },
  },
  {
    id: 'combined',
    path: '/performance/secretariat',
    query: { cited: '1', entity: 'OHCHR' },
  },
  { id: 'mandate-detail', path: '/performance/mandate/A/RES/70/1', query: {} },
]

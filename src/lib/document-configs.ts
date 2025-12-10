import type { DocumentConfig, Resolution } from '@/types'

export const resolutionsConfig: DocumentConfig<Resolution> = {
  type: 'resolutions',
  title: 'All Resolutions',
  apiEndpoint: '/api/resolutions',
  dataFile: 'all_resolutions_dashboard.json',
  defaultOrgan: 'General Assembly',
  organOptions: [
    { value: 'all', label: 'All Organs' },
    { value: 'General Assembly', label: 'General Assembly' },
    {
      value: 'Economic and Social Council',
      label: 'Economic and Social Council',
    },
    { value: 'Security Council', label: 'Security Council' },
    { value: 'Human Rights Council', label: 'Human Rights Council' },
  ],
  columns: {
    symbol: true,
    year: true,
    title: true,
    length: true,
    recurrence: true,
    previous: true,
    similarity: true,
    withinResources: true,
  },
}

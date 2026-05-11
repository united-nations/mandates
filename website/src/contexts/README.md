# Contexts

React contexts for global state management.

In this app:
`FilterContext` lets any component read/update filters (entity, organ, keywords, etc.) without passing them through every component in between.

## FilterContext

Manages filter state across the application using URL query parameters.

**Key features:**

- Syncs filters with URL params (shareable links)
- Handles entity, organ, keyword, year range, and other filters
- Automatically clears filters when navigating between pages
- Provides `setFilter`, `setMultipleFilters`, `clearFilter`, and `clearAllFilters` methods

**Usage:**

```tsx
import { useFilter } from '@/contexts/FilterContext'

const { filters, setFilter, clearAllFilters } = useFilter()
```

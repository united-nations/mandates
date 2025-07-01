# Requirements

Input for AI. AI should not change this.

Pages:
- Main page
  - Data cards: counts of documents, organs, entities, citations; always adjust to current list of mandates
  - Main filters: Simple: keyword search (only in title field for now); advanced (collapsed by default): subjects, programme, budget_document, year
  - Below the filters there is a list with chips of currently active filters and a "clear all" button
  - Sidebars
    - Entity list (with doc counts bars) -> click on entity refers to entity page
    - Organs list (with doc counts bars) -> click on organ refers to organ page
  - Mandate document list -> click on mandate document refers to mandate detail popup
- Entity page
  - Data cards: same as on main page but without entity count card
  - Filters: same as on main page but since the title already makes clear that the list is filtered for this entity don't show a filter chip for the current entity; do show filter chips for other entities that are additionally filtered by
  - Sidebars:
    - Cross-citation list (with doc counts bars; counts only refer to documents of current entity) -> click on entity sets this entity as a filter that will be visible in the active filters list
    - Organs list (with doc counts bars; counts only refer to documents of current entity) -> click on organ sets this as filter that will be visible in the active filters list
- Organ page
  - Data cards: same as on main page but without organ count card
  - Filters: same as on main page but do not show filter for current organ
  - Sidebars:
    - Entity list -> sets filter that will be visible
    - NO second sidebar here
- Mandate detail page: popup that can be entered from the main/entity/organ page with details about a mandate document

# Todos

Scratchpad for AI. AI should change this at start and end of every activity: Keep a detailed list 
of todos and sub-todos and their progress. Do not modify this paragraph but use the space below.

## Completed
- ✅ Modified organ page to hide organs data card
- ✅ Removed cross-citations sidebar from organ page (no second sidebar)
- ✅ Kept entity list sidebar on organ page as required
- ✅ Updated MandateExplorer component to conditionally hide organs data card when `isOrganPage` is true
- ✅ Correctly configured organ page with entityListSidebar prop only (no crossCitationsSidebar)
- ✅ Fixed sidebar visibility logic to show entity sidebar on organ pages (both desktop and mobile)


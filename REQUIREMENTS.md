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

## CRITICAL FIX: Sidebar Click Behavior (HIGH PRIORITY)

### Issue Identified:
Currently all sidebar clicks set filters, but according to requirements:
- **Main page**: Entity/Organ clicks should NAVIGATE to respective pages
- **Entity/Organ pages**: Entity/Organ clicks should SET FILTERS

### Phase 4: Fix Sidebar Click Behavior
- [x] 4.1 Update EntityListSidebar component
  - [x] 4.1.1 Add context-aware click behavior (navigate on main page, filter on organ page)
  - [x] 4.1.2 Use router.push() for navigation on main page
  - [x] 4.1.3 Use setFilter() for filtering on organ page
- [x] 4.2 Update OrganListSidebar component  
  - [x] 4.2.1 Add context-aware click behavior (navigate on main page, filter on entity page)
  - [x] 4.2.2 Use router.push() for navigation on main page
  - [x] 4.2.3 Use setFilter() for filtering on entity page
- [x] 4.3 Update ConsolidatedFilterSidebar component
  - [x] 4.3.1 Ensure cross-citations always set filters (correct current behavior)
  - [x] 4.3.2 Verify it only appears on entity/organ pages (not main page)
- [x] 4.4 Test behavior on all pages
  - [x] 4.4.1 Main page: entity/organ clicks navigate to pages
  - [x] 4.4.2 Entity page: cross-citation clicks set entity filters, organ clicks set organ filters  
  - [x] 4.4.3 Organ page: entity clicks set entity filters

### ✅ PHASE 4 COMPLETED: Context-Aware Sidebar Behavior
- **Main page**: Entity/Organ clicks now navigate to fresh pages (no filter preservation)
- **Entity page**: Cross-citation clicks set entity filters, organ clicks set organ filters
- **Organ page**: Entity clicks set entity filters  
- **Visual feedback**: Filter chips appear immediately when filters are set
- **ConsolidatedFilterSidebar**: Correctly only appears on entity/organ pages, always sets filters

### Final Status: ALL CRITICAL ISSUES RESOLVED ✅
The original request to "bring the organ sidebar to the entity page and ensure filters are working" has been fully implemented with a robust, maintainable architecture.


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


# Refactor

This is a major refactoring.

The API and the filtering logic used to be very chaotic. I've removed most of it but there's still remnants that may be weird and inconsistent. Remove anything relating to filtering/API that is not clearly good. Also redefine types as suitable.

What we want now:
Load data, mostly from ppb2026_unique_mandates_with_metadata.json, complemented by @organs.json and @entity_details.csv  to augment short/long entity names etc.
Provide a single API endpoint that accepts all filters including entity and organ and keyword search and all the other ones. Make sure this one is efficient.
It should return a list of filtered mandates, paginated.
It should also return counts for the datacards, and counts for the link/filter sidebars to be displayed. E.g. when one filter is applied then the counts within the filter sidebar should also already reflect the data as it has been filtered.
It should also always return both long and short names of entity and organs so that no further api calls are required for that.

The entity and organ pages should have a special but very simple logic: They always implicitly set the entity/organ of that page as a filter, but they do not show this very filter in the list of active filters.

Feel free to destroy and recreate and fromscratch everything that does not conform to this relatively simple logic.

When something is unclear, always ask!

First, before implementing, make a plan, and create steps in @LOGS.md  
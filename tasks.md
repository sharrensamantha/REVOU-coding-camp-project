# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a zero-dependency, client-side SPA delivered as three static files (`index.html`, `css/styles.css`, `js/app.js`). State lives in a single `AppState` object, persisted to `localStorage`. Chart.js is loaded via CDN. Optional features included: Custom Categories, Sort Transactions, Spending Threshold Highlight.

## Tasks

- [x] 1. Project scaffold and test infrastructure
  - Create `index.html`, `css/styles.css`, `js/app.js` with skeleton structure
  - Add `package.json` with `vitest` and `fast-check` as dev dependencies
  - Create `vitest.config.js` with `jsdom` environment
  - Create `tests/app.test.js` placeholder
  - _Requirements: 6.3, 7.3_

- [x] 2. Core data model and storage module
  - [x] 2.1 Implement `AppState` singleton and `DEFAULT_CATEGORIES` constant in `js/app.js`
    - Define `AppState` with `transactions`, `categories`, `thresholds`, `sortKey`
    - Export pure functions: `calculateBalance`, `getCategoryTotals`, `getSortedTransactions`, `validateForm`
    - Implement `loadState` / `saveState` with try/catch and fallback to empty state
    - Implement `crypto.randomUUID` fallback for ID generation
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

  - [x] 2.2 Write property test for storage serialisation round-trip
    - **Property 8: Storage Serialisation Round-Trip**
    - **Validates: Requirements 5.4**

  - [x] 2.3 Write unit tests for `loadState` / `saveState`
    - `loadState` returns `null` when `localStorage` is empty
    - `loadState` returns `null` and does not throw on malformed JSON
    - _Requirements: 5.3, 5.5_

- [x] 3. Balance and transaction core logic
  - [x] 3.1 Implement `calculateBalance` and `getCategoryTotals` pure functions
    - `calculateBalance(transactions): number` — sum of all amounts
    - `getCategoryTotals(transactions): object` — amounts grouped by category
    - _Requirements: 3.1, 3.2, 3.3, 4.1_

  - [x] 3.2 Write property test for balance invariant
    - **Property 6: Balance Invariant**
    - **Validates: Requirements 3.2, 3.3, 3.4**

  - [x] 3.3 Write property test for category totals invariant
    - **Property 7: Category Totals Invariant**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

  - [x] 3.4 Write unit tests for `calculateBalance` and `getCategoryTotals`
    - `calculateBalance([])` returns `0`
    - Known set of transactions returns correct sum
    - `getCategoryTotals` returns correct per-category sums
    - _Requirements: 3.1, 4.1_

- [x] 4. Form validation logic
  - [x] 4.1 Implement `validateForm(name, amount, category): string[]` in `js/app.js`
    - Return error messages for empty name, empty/non-positive/non-numeric amount, missing category
    - _Requirements: 1.3, 1.4_

  - [x] 4.2 Write property test for invalid input rejection
    - **Property 2: Invalid Input Rejection**
    - **Validates: Requirements 1.3, 1.4**

  - [x] 4.3 Write unit tests for `validateForm`
    - Test each invalid input combination (empty name, zero amount, negative amount, non-numeric, missing category)
    - _Requirements: 1.3, 1.4_

- [x] 5. Sort logic
  - [x] 5.1 Implement `getSortedTransactions(transactions, sortKey): Transaction[]` in `js/app.js`
    - Support `'amount-asc'`, `'amount-desc'`, `'category-asc'`, and `null` (insertion order)
    - Must return a new array without mutating the input
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 5.2 Write property test for sort ordering correctness
    - **Property 12: Sort Ordering Correctness**
    - **Validates: Requirements 10.1, 10.2**

  - [x] 5.3 Write property test for sort does not mutate storage
    - **Property 13: Sort Does Not Mutate Storage**
    - **Validates: Requirements 10.3**

  - [x] 5.4 Write unit tests for `getSortedTransactions`
    - Known list returns expected order for each sort key
    - _Requirements: 10.1, 10.2_

- [x] 6. Checkpoint — Ensure all pure-function tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. HTML structure and CSS theme
  - [x] 7.1 Build `index.html` with all required sections and semantic markup
    - Sections: `#balance-display`, `#form-section`, `#transaction-list`, `#chart-canvas`, `#category-manager`, `#threshold-section`
    - Load Chart.js via CDN; include fallback text inside `<canvas>` for CDN failure
    - Link `css/styles.css` and `js/app.js`
    - _Requirements: 6.3, 7.1, 7.2, 7.3_

  - [x] 7.2 Implement `css/styles.css` with responsive layout and visual theme
    - Palette: `#F5F1EA` background, `#D6E8F2` cards, `#2C2F33` text
    - Two font families: one serif for headings, one sans-serif for body
    - `border-radius: 8px–12px`, subtle shadows, adequate whitespace
    - Responsive from 320px to 1920px; all components usable at 375px
    - Over-budget highlight class (`.over-budget`) for threshold feature
    - _Requirements: 6.1, 6.2, 11.2_

- [x] 8. Render functions — balance and transaction list
  - [x] 8.1 Implement `renderBalance(transactions)` targeting `#balance-display`
    - Display formatted currency sum; update on every `render()` call
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 8.2 Implement `renderTransactionList(transactions, thresholds, categoryTotals)` targeting `#transaction-list`
    - Render each row with name, amount, category, and delete button
    - Apply `.over-budget` class to rows whose category total meets or exceeds threshold
    - Wire delete button to remove transaction from `AppState`, persist, and re-render
    - _Requirements: 2.1, 2.2, 2.4, 11.2_

  - [x] 8.3 Write property test for transaction list renders all fields
    - **Property 4: Transaction List Renders All Fields**
    - **Validates: Requirements 2.1**

  - [x] 8.4 Write property test for delete removes from list and storage
    - **Property 5: Delete Removes From List and Storage**
    - **Validates: Requirements 2.4**

  - [x] 8.5 Write property test for threshold highlight invariant
    - **Property 14: Threshold Highlight Invariant**
    - **Validates: Requirements 11.2, 11.3**

- [x] 9. Render functions — chart
  - [x] 9.1 Implement `renderChart(transactions, thresholds)` targeting `#chart-canvas`
    - Destroy previous Chart.js instance before re-creating
    - Show placeholder text when no transactions exist
    - Visually distinguish over-threshold segments
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 11.3_

- [x] 10. Input form component
  - [x] 10.1 Implement `handleFormSubmit(event)` and form rendering in `js/app.js`
    - Call `validateForm`; display inline errors if invalid; do not add transaction
    - On valid submit: generate UUID, push to `AppState.transactions`, persist, re-render, reset form
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 10.2 Write property test for valid transaction submission round-trip
    - **Property 1: Valid Transaction Submission Round-Trip**
    - **Validates: Requirements 1.2, 5.4**

  - [x] 10.3 Write property test for form reset after successful submission
    - **Property 3: Form Reset After Successful Submission**
    - **Validates: Requirements 1.5**

- [x] 11. Sort controls UI
  - [x] 11.1 Add sort control buttons to the transaction list section in `index.html` and wire them in `js/app.js`
    - Buttons for amount-asc, amount-desc, category-asc; clicking sets `AppState.sortKey` and re-renders list
    - Sort must not modify `AppState.transactions` or trigger a `saveState` call
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 12. Custom category manager
  - [x] 12.1 Implement `handleAddCategory(name)` and `renderCategorySelector(categories)` in `js/app.js`
    - Case-insensitive duplicate check; show inline error on duplicate
    - Append to `AppState.categories`, persist, update category `<select>` immediately
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 12.2 Write property test for custom category addition
    - **Property 9: Custom Category Addition**
    - **Validates: Requirements 8.1, 8.2**

  - [x] 12.3 Write property test for custom category persistence
    - **Property 10: Custom Category Persistence**
    - **Validates: Requirements 8.3**

  - [x] 12.4 Write property test for duplicate category rejection
    - **Property 11: Duplicate Category Rejection**
    - **Validates: Requirements 8.4**

- [x] 13. Threshold manager
  - [x] 13.1 Implement `handleSetThreshold(category, value)` and `renderThresholdInputs(categories, thresholds)` in `js/app.js`
    - One numeric input per category; validate positive value; persist on change
    - _Requirements: 11.1, 11.4_

  - [x] 13.2 Write property test for threshold persistence
    - **Property 15: Threshold Persistence**
    - **Validates: Requirements 11.4**

- [x] 14. App initialisation and wiring
  - [x] 14.1 Implement top-level `render()` and `init()` in `js/app.js`
    - `init()`: call `loadState`, populate `AppState`, call `render()`
    - `render()`: call `renderBalance`, `renderTransactionList`, `renderChart`, `renderCategorySelector`, `renderThresholdInputs`
    - Show non-blocking storage warning banner when `loadState` signals unavailability
    - Wire all event listeners (form submit, delete, sort, add-category, set-threshold)
    - Call `init()` on `DOMContentLoaded`
    - _Requirements: 2.3, 3.4, 4.4, 5.3, 5.5_

- [x] 15. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with `numRuns: 100` minimum; each test carries a comment `// Feature: expense-budget-visualizer, Property N: <title>`
- Unit tests and property tests live in `tests/app.test.js` under a `jsdom` Vitest environment
- `sortKey` is intentionally not persisted — sort resets to default on reload

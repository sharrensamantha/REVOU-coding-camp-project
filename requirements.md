# Requirements Document

## Introduction

The Expense & Budget Visualizer is a standalone, mobile-friendly web application that helps users track daily spending. It provides a transaction input form, a scrollable transaction history, an auto-updating total balance, and a pie chart showing spending distribution by category. All data is persisted client-side using the browser's Local Storage API. No backend or build toolchain is required.

## Glossary

- **App**: The Expense & Budget Visualizer single-page web application.
- **Transaction**: A single spending record consisting of an item name, a monetary amount, and a category.
- **Category**: A label that classifies a transaction (e.g., Food, Transport, Fun, or a user-defined custom category).
- **Balance**: The running total of all transaction amounts currently stored.
- **Chart**: The pie chart rendered by Chart.js that visualises spending distribution across categories.
- **Storage**: The browser's Local Storage API used to persist transactions between sessions.
- **Transaction_List**: The scrollable UI component that displays all stored transactions.
- **Input_Form**: The UI component containing the item name, amount, and category fields plus the submit button.
- **Category_Manager**: The component responsible for managing the list of available categories, including user-defined ones.
- **Summary_View**: The optional monthly summary view component.
- **Threshold**: A user-configurable spending limit used to highlight over-budget categories.

---

## Requirements

### Requirement 1: Transaction Input

**User Story:** As a user, I want to add a new spending transaction through a form, so that I can record my daily expenses.

#### Acceptance Criteria

1. THE Input_Form SHALL contain a text field for item name, a numeric field for amount, and a category selector.
2. WHEN the user submits the Input_Form with all fields filled and a valid positive amount, THE App SHALL add the transaction to the Transaction_List and persist it to Storage.
3. IF the user submits the Input_Form with one or more empty fields, THEN THE Input_Form SHALL display an inline validation error identifying the missing field(s) and SHALL NOT add a transaction.
4. IF the user enters a non-positive or non-numeric value in the amount field, THEN THE Input_Form SHALL display an inline validation error and SHALL NOT add a transaction.
5. WHEN a transaction is successfully added, THE Input_Form SHALL reset all fields to their default empty/placeholder state.
6. THE amount SHALL be formatted and displayed in currency format (e.g., `$12.50` or `€24.00`) using `Intl.NumberFormat` before rendering to the list or balance.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see a scrollable list of all my transactions, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each transaction's item name, amount, and category.
2. THE Transaction_List SHALL be scrollable when the number of transactions exceeds the visible viewport area.
3. WHEN the App loads, THE Transaction_List SHALL render all transactions previously persisted in Storage.
4. WHEN the user activates the delete control for a transaction, THE App SHALL remove that transaction from the Transaction_List and from Storage.
5. IF the transaction list is empty, THE App SHALL display a centered, stylistically consistent placeholder message (e.g., "No expenses yet. Add your first one above.").


---

### Requirement 3: Total Balance

**User Story:** As a user, I want to see my total spending balance at the top of the page, so that I always know how much I have spent in total.

#### Acceptance Criteria

1. THE App SHALL display the current Balance prominently at the top of the page.
2. WHEN a transaction is added, THE App SHALL recalculate and update the Balance display without requiring a page reload.
3. WHEN a transaction is deleted, THE App SHALL recalculate and update the Balance display without requiring a page reload.
4. WHEN the App loads, THE App SHALL calculate the Balance from all transactions in Storage and display it immediately.

---

### Requirement 4: Spending Chart

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL render as a pie chart using Chart.js, showing each Category as a distinct segment proportional to its total spend.
2. WHEN a transaction is added, THE Chart SHALL update to reflect the new category totals without requiring a page reload.
3. WHEN a transaction is deleted, THE Chart SHALL update to reflect the revised category totals without requiring a page reload.
4. WHEN the App loads, THE Chart SHALL render based on all transactions currently in Storage.
5. IF no transactions exist, THEN THE Chart SHALL display a placeholder state indicating no data is available.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my transactions to be saved between browser sessions, so that I do not lose my spending history when I close the tab.

#### Acceptance Criteria

1. WHEN a transaction is added, THE App SHALL serialise and write the updated transaction list to Storage.
2. WHEN a transaction is deleted, THE App SHALL serialise and write the updated transaction list to Storage.
3. WHEN the App loads, THE App SHALL deserialise the transaction list from Storage and restore the previous session state.
4. FOR ALL valid transaction lists, serialising then deserialising SHALL produce an equivalent transaction list (round-trip property).
5. IF Storage is unavailable or returns a parse error, THEN THE App SHALL initialise with an empty transaction list and display a non-blocking warning to the user.
5. EACH transaction object SHALL include a `createdAt` timestamp (`Date.now()`) to enable future sorting/monthly grouping.
---

### Requirement 6: Mobile-Friendly Layout

**User Story:** As a user on a mobile device, I want the app to be usable on a small screen, so that I can track expenses on the go.

#### Acceptance Criteria

1. THE App SHALL use a responsive layout that adapts to viewport widths from 320px to 1920px.
2. THE Input_Form, Transaction_List, Chart, and Balance display SHALL each remain fully usable at a viewport width of 375px.
3. THE App SHALL be implemented using a single HTML file, a single CSS file under `css/`, and a single JavaScript file under `js/`.

---

### Requirement 7: Browser Compatibility

**User Story:** As a user, I want the app to work in any modern browser, so that I am not restricted to a specific browser.

#### Acceptance Criteria

1. THE App SHALL function correctly in the current stable releases of Chrome, Firefox, Edge, and Safari.
2. THE App SHALL use only standard HTML5, CSS3, and ES6+ JavaScript features available in the browsers listed in criterion 1.
3. THE App SHALL require no build step, transpilation, or server-side runtime to operate.

### Requirement 8: Visual Design & Theme ("Classy GenZ")

**User Story:** As a user, I want a calm, modern, and visually cohesive interface that feels curated and contemporary, so that tracking expenses feels pleasant rather than transactional.

#### Acceptance Criteria
1. THE App SHALL use a primary colour palette of `Beige (#F5F1EA)` for backgrounds, `Pale Blue (#D6E8F2)` for accents/cards, and `Charcoal (#2C2F33)` for primary text.
2. THE App SHALL strictly limit typography to **two (2) font families**: one for headings (serif or elegant sans-serif) and one for body/UI elements. Fallback stacks MUST be defined.
3. THE App SHALL implement consistent rounded corners (`8px–12px`), subtle shadows (`box-shadow: 0 2px 8px rgba(0,0,0,0.05)`), and adequate whitespace to achieve a clean, modern aesthetic.
4. ALL interactive elements (inputs, buttons, delete icons, sort controls) SHALL have visible `:focus` and `:active` states for keyboard and touch navigation.
5. COLOUR contrast ratios SHALL meet WCAG AA standards for all text and interactive components.
---

### Requirement 9: Custom Categories (Optional)

**User Story:** As a user, I want to create my own spending categories, so that I can tailor the app to my personal budget structure.

#### Acceptance Criteria

1. WHERE custom categories are enabled, THE Category_Manager SHALL allow the user to add a new category by entering a unique name.
2. WHERE custom categories are enabled, WHEN a custom category is added, THE Input_Form category selector SHALL include the new category immediately.
3. WHERE custom categories are enabled, THE Category_Manager SHALL persist custom categories to Storage so they are available after a page reload.
4. WHERE custom categories are enabled, IF the user attempts to add a category with a name that already exists (case-insensitive), THEN THE Category_Manager SHALL display an error and SHALL NOT add a duplicate.

---

### Requirement 10: Monthly Summary View (Optional)

**User Story:** As a user, I want to see a summary of my spending grouped by month, so that I can compare my expenses over time.

#### Acceptance Criteria

1. WHERE the monthly summary is enabled, THE Summary_View SHALL group transactions by calendar month and display the total spend per month.
2. WHERE the monthly summary is enabled, WHEN a transaction is added or deleted, THE Summary_View SHALL update to reflect the change.
3. WHERE the monthly summary is enabled, THE Summary_View SHALL display months in reverse-chronological order.

---

### Requirement 11: Sort Transactions (Optional)

**User Story:** As a user, I want to sort my transaction list by amount or category, so that I can find and analyse transactions more easily.

#### Acceptance Criteria

1. WHERE sorting is enabled, THE Transaction_List SHALL provide controls to sort transactions in ascending or descending order by amount.
2. WHERE sorting is enabled, THE Transaction_List SHALL provide a control to sort transactions alphabetically by category.
3. WHERE sorting is enabled, WHEN a sort control is activated, THE Transaction_List SHALL re-render in the selected order without modifying the underlying Storage data.

---

### Requirement 12: Spending Threshold Highlight (Optional)

**User Story:** As a user, I want to be alerted when spending in a category exceeds a limit I set, so that I can stay within my budget.

#### Acceptance Criteria

1. WHERE threshold highlighting is enabled, THE App SHALL allow the user to set a numeric spending limit per Category.
2. WHERE threshold highlighting is enabled, WHEN the total spend for a Category meets or exceeds its Threshold, THE Transaction_List SHALL visually distinguish all transactions belonging to that Category.
3. WHERE threshold highlighting is enabled, WHEN the total spend for a Category meets or exceeds its Threshold, THE Chart SHALL visually distinguish the corresponding segment.
4. WHERE threshold highlighting is enabled, THE App SHALL persist Threshold values to Storage.

---

### Requirement 13: Dark/Light Mode Toggle (Optional)

**User Story:** As a user, I want to switch between dark and light display modes, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. WHERE the mode toggle is enabled, THE App SHALL provide a control to switch between dark mode and light mode.
2. WHERE the mode toggle is enabled, WHEN the user activates the toggle, THE App SHALL apply the selected colour scheme to all visible UI components immediately.
3. WHERE the mode toggle is enabled, THE App SHALL persist the user's mode preference to Storage and restore it on the next page load.
// Feature: expense-budget-visualizer
// Placeholder test file — tests will be added in subsequent tasks.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

// ── localStorage mock (node environment has no DOM) ────────────────────────
const localStorageStore = {};
const localStorageMock = {
  getItem: (key) => (key in localStorageStore ? localStorageStore[key] : null),
  setItem: (key, value) => { localStorageStore[key] = String(value); },
  removeItem: (key) => { delete localStorageStore[key]; },
  clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); },
};
global.localStorage = localStorageMock;

// ── Minimal document stub (prevents DOMContentLoaded wiring error) ─────────
if (typeof global.document === 'undefined') {
  global.document = {
    addEventListener: () => {},
    getElementById: () => null,
    querySelector: () => null,
    createElement: (_tag) => ({
      textContent: '',
      get innerHTML() { return this.textContent; },
    }),
  };
}

import { loadState, saveState, calculateBalance, getCategoryTotals, validateForm, getSortedTransactions, DEFAULT_CATEGORIES } from '../js/app.js';

// ── Shared Arbitraries ─────────────────────────────────────────────────────
const transactionArb = fc.record({
  id: fc.string({ minLength: 1 }),
  name: fc.string({ minLength: 1 }),
  amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1e6), noNaN: true, noDefaultInfinity: true }),
  category: fc.constantFrom(...DEFAULT_CATEGORIES),
  date: fc.constant(new Date().toISOString()),
});

describe('expense-budget-visualizer', () => {
  it('test infrastructure is set up', () => {
    expect(true).toBe(true);
  });
});

// ── Property 6: Balance Invariant ──────────────────────────────────────────
// Feature: expense-budget-visualizer, Property 6: Balance Invariant
describe('Property 6: Balance Invariant', () => {
  it('calculateBalance equals arithmetic sum of all transaction amounts', () => {
    fc.assert(
      fc.property(fc.array(transactionArb), (txns) => {
        const expected = txns.reduce((s, t) => s + t.amount, 0);
        return Math.abs(calculateBalance(txns) - expected) < 0.001;
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 7: Category Totals Invariant ─────────────────────────────────
// Feature: expense-budget-visualizer, Property 7: Category Totals Invariant
describe('Property 7: Category Totals Invariant', () => {
  it('getCategoryTotals sums amounts correctly per category', () => {
    fc.assert(
      fc.property(fc.array(transactionArb), (txns) => {
        const totals = getCategoryTotals(txns);
        // Every category total must equal the manual sum for that category
        const categories = [...new Set(txns.map(t => t.category))];
        return categories.every(cat => {
          const expected = txns
            .filter(t => t.category === cat)
            .reduce((s, t) => s + t.amount, 0);
          return Math.abs((totals[cat] || 0) - expected) < 0.001;
        });
      }),
      { numRuns: 100 }
    );
  });

  it('sum of all category totals equals total balance', () => {
    fc.assert(
      fc.property(fc.array(transactionArb), (txns) => {
        const totals = getCategoryTotals(txns);
        const totalFromCategories = Object.values(totals).reduce((s, v) => s + v, 0);
        const balance = calculateBalance(txns);
        return Math.abs(totalFromCategories - balance) < 0.001;
      }),
      { numRuns: 100 }
    );
  });
});

// ── Unit Tests: calculateBalance ───────────────────────────────────────────
describe('calculateBalance unit tests', () => {
  it('returns 0 for an empty array', () => {
    expect(calculateBalance([])).toBe(0);
  });

  it('returns the correct sum for a known set of transactions', () => {
    const txns = [
      { id: '1', name: 'Coffee', amount: 3.50, category: 'Food', date: '' },
      { id: '2', name: 'Bus',    amount: 2.00, category: 'Transport', date: '' },
      { id: '3', name: 'Movie',  amount: 12.00, category: 'Fun', date: '' },
    ];
    expect(Math.abs(calculateBalance(txns) - 17.50)).toBeLessThan(0.001);
  });

  it('returns 0 for non-array input', () => {
    expect(calculateBalance(null)).toBe(0);
    expect(calculateBalance(undefined)).toBe(0);
  });
});

// ── Unit Tests: getCategoryTotals ──────────────────────────────────────────
describe('getCategoryTotals unit tests', () => {
  it('returns empty object for empty array', () => {
    expect(getCategoryTotals([])).toEqual({});
  });

  it('returns correct per-category sums for a known set', () => {
    const txns = [
      { id: '1', name: 'Lunch',   amount: 10.00, category: 'Food', date: '' },
      { id: '2', name: 'Dinner',  amount: 20.00, category: 'Food', date: '' },
      { id: '3', name: 'Bus',     amount: 2.50,  category: 'Transport', date: '' },
    ];
    const totals = getCategoryTotals(txns);
    expect(Math.abs(totals['Food'] - 30.00)).toBeLessThan(0.001);
    expect(Math.abs(totals['Transport'] - 2.50)).toBeLessThan(0.001);
    expect(totals['Fun']).toBeUndefined();
  });

  it('returns empty object for non-array input', () => {
    expect(getCategoryTotals(null)).toEqual({});
  });
});

// Feature: expense-budget-visualizer, Property 8: Storage Serialisation Round-Trip
describe('Property 8: Storage Serialisation Round-Trip', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('saveState then loadState returns equivalent state', () => {
    const stateArb = fc.record({
      transactions: fc.array(fc.record({
        id: fc.string({ minLength: 1 }),
        name: fc.string({ minLength: 1 }),
        amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1e6), noNaN: true, noDefaultInfinity: true }),
        category: fc.constantFrom('Food', 'Transport', 'Fun', 'Other'),
        date: fc.constant(new Date().toISOString()),
      })),
      categories: fc.array(fc.string({ minLength: 1 })),
      thresholds: fc.dictionary(fc.string({ minLength: 1 }), fc.float({ min: Math.fround(0.01), max: Math.fround(1e6), noNaN: true, noDefaultInfinity: true })),
    });

    fc.assert(
      fc.property(stateArb, (state) => {
        saveState(state);
        const loaded = loadState();
        expect(loaded).toEqual({
          transactions: state.transactions,
          categories: state.categories,
          thresholds: state.thresholds,
        });
      }),
      { numRuns: 100 }
    );
  });
});

describe('loadState / saveState unit tests', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('loadState returns null when localStorage is empty', () => {
    localStorage.clear();
    expect(loadState()).toBeNull();
  });

  it('loadState returns null and does not throw on malformed JSON', () => {
    localStorage.setItem('ebv_state', 'not-valid-json');
    expect(() => loadState()).not.toThrow();
    expect(loadState()).toBeNull();
  });
});

// ── Property 2: Invalid Input Rejection ───────────────────────────────────
// Feature: expense-budget-visualizer, Property 2: Invalid Input Rejection
describe('Property 2: Invalid Input Rejection', () => {
  // Arbitrary: empty name with otherwise valid fields
  const emptyNameArb = fc.record({
    name: fc.constant(''),
    amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1e6), noNaN: true, noDefaultInfinity: true }),
    category: fc.constantFrom(...DEFAULT_CATEGORIES),
  });

  // Arbitrary: non-positive amount (zero or negative)
  const nonPositiveAmountArb = fc.record({
    name: fc.string({ minLength: 1 }),
    amount: fc.oneof(fc.constant(0), fc.float({ min: Math.fround(-1e6), max: Math.fround(-0.01), noNaN: true, noDefaultInfinity: true })),
    category: fc.constantFrom(...DEFAULT_CATEGORIES),
  });

  // Arbitrary: non-numeric amount string
  const nonNumericAmountArb = fc.record({
    name: fc.string({ minLength: 1 }),
    amount: fc.string({ minLength: 1 }).filter(s => isNaN(Number(s)) && s.trim() !== ''),
    category: fc.constantFrom(...DEFAULT_CATEGORIES),
  });

  // Arbitrary: missing category
  const missingCategoryArb = fc.record({
    name: fc.string({ minLength: 1 }),
    amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1e6), noNaN: true, noDefaultInfinity: true }),
    category: fc.constant(''),
  });

  it('returns at least one error for empty name', () => {
    fc.assert(
      fc.property(emptyNameArb, ({ name, amount, category }) => {
        return validateForm(name, amount, category).length > 0;
      }),
      { numRuns: 100 }
    );
  });

  it('returns at least one error for non-positive amount', () => {
    fc.assert(
      fc.property(nonPositiveAmountArb, ({ name, amount, category }) => {
        return validateForm(name, amount, category).length > 0;
      }),
      { numRuns: 100 }
    );
  });

  it('returns at least one error for non-numeric amount', () => {
    fc.assert(
      fc.property(nonNumericAmountArb, ({ name, amount, category }) => {
        return validateForm(name, amount, category).length > 0;
      }),
      { numRuns: 100 }
    );
  });

  it('returns at least one error for missing category', () => {
    fc.assert(
      fc.property(missingCategoryArb, ({ name, amount, category }) => {
        return validateForm(name, amount, category).length > 0;
      }),
      { numRuns: 100 }
    );
  });
});

// ── Unit Tests: validateForm ───────────────────────────────────────────────
describe('validateForm unit tests', () => {
  it('returns no errors for valid input', () => {
    expect(validateForm('Coffee', '3.50', 'Food')).toEqual([]);
  });

  it('returns error for empty name', () => {
    const errors = validateForm('', '5.00', 'Food');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => /name/i.test(e))).toBe(true);
  });

  it('returns error for whitespace-only name', () => {
    const errors = validateForm('   ', '5.00', 'Food');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('returns error for zero amount', () => {
    const errors = validateForm('Coffee', '0', 'Food');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => /amount/i.test(e))).toBe(true);
  });

  it('returns error for negative amount', () => {
    const errors = validateForm('Coffee', '-5', 'Food');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => /amount/i.test(e))).toBe(true);
  });

  it('returns error for non-numeric amount', () => {
    const errors = validateForm('Coffee', 'abc', 'Food');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => /amount/i.test(e))).toBe(true);
  });

  it('returns error for empty amount', () => {
    const errors = validateForm('Coffee', '', 'Food');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => /amount/i.test(e))).toBe(true);
  });

  it('returns error for missing category', () => {
    const errors = validateForm('Coffee', '5.00', '');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => /category/i.test(e))).toBe(true);
  });

  it('returns multiple errors when multiple fields are invalid', () => {
    const errors = validateForm('', '', '');
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});

// ── Property 12: Sort Ordering Correctness ────────────────────────────────
// Feature: expense-budget-visualizer, Property 12: Sort Ordering Correctness
describe('Property 12: Sort Ordering Correctness', () => {
  it('sorted result is a permutation satisfying the ordering relation for all adjacent pairs', () => {
    const sortKeyArb = fc.constantFrom('amount-asc', 'amount-desc', 'category-asc');
    fc.assert(
      fc.property(fc.array(transactionArb, { minLength: 2 }), sortKeyArb, (txns, sortKey) => {
        const sorted = getSortedTransactions(txns, sortKey);
        // Must be same length (permutation)
        if (sorted.length !== txns.length) return false;
        // Check ordering for all adjacent pairs
        for (let i = 0; i < sorted.length - 1; i++) {
          const a = sorted[i];
          const b = sorted[i + 1];
          if (sortKey === 'amount-asc' && a.amount > b.amount + 0.0001) return false;
          if (sortKey === 'amount-desc' && a.amount < b.amount - 0.0001) return false;
          if (sortKey === 'category-asc' && (a.category || '').localeCompare(b.category || '') > 0) return false;
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 13: Sort Does Not Mutate Storage ─────────────────────────────
// Feature: expense-budget-visualizer, Property 13: Sort Does Not Mutate Storage
describe('Property 13: Sort Does Not Mutate Storage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('localStorage value is identical before and after sorting', () => {
    const sortKeyArb = fc.constantFrom('amount-asc', 'amount-desc', 'category-asc');
    fc.assert(
      fc.property(fc.array(transactionArb, { minLength: 1 }), sortKeyArb, (txns, sortKey) => {
        // Persist state before sort
        saveState({ transactions: txns, categories: DEFAULT_CATEGORIES, thresholds: {} });
        const before = localStorage.getItem('ebv_state');
        // Perform sort (view-only — does not call saveState)
        getSortedTransactions(txns, sortKey);
        const after = localStorage.getItem('ebv_state');
        return before === after;
      }),
      { numRuns: 100 }
    );
  });

  it('original array is not mutated by getSortedTransactions', () => {
    fc.assert(
      fc.property(fc.array(transactionArb, { minLength: 1 }), fc.constantFrom('amount-asc', 'amount-desc', 'category-asc'), (txns, sortKey) => {
        const snapshot = txns.map(t => ({ ...t }));
        getSortedTransactions(txns, sortKey);
        return txns.every((t, i) => t.id === snapshot[i].id && t.amount === snapshot[i].amount);
      }),
      { numRuns: 100 }
    );
  });
});

// ── Unit Tests: getSortedTransactions ─────────────────────────────────────
describe('getSortedTransactions unit tests', () => {
  const txns = [
    { id: '1', name: 'Movie',  amount: 15.00, category: 'Fun',       date: '' },
    { id: '2', name: 'Bus',    amount:  2.50, category: 'Transport', date: '' },
    { id: '3', name: 'Lunch',  amount:  8.00, category: 'Food',      date: '' },
    { id: '4', name: 'Coffee', amount:  3.50, category: 'Food',      date: '' },
  ];

  it('null sortKey returns insertion order', () => {
    const result = getSortedTransactions(txns, null);
    expect(result.map(t => t.id)).toEqual(['1', '2', '3', '4']);
  });

  it('amount-asc sorts from lowest to highest', () => {
    const result = getSortedTransactions(txns, 'amount-asc');
    const amounts = result.map(t => t.amount);
    expect(amounts).toEqual([2.50, 3.50, 8.00, 15.00]);
  });

  it('amount-desc sorts from highest to lowest', () => {
    const result = getSortedTransactions(txns, 'amount-desc');
    const amounts = result.map(t => t.amount);
    expect(amounts).toEqual([15.00, 8.00, 3.50, 2.50]);
  });

  it('category-asc sorts alphabetically by category', () => {
    const result = getSortedTransactions(txns, 'category-asc');
    const categories = result.map(t => t.category);
    for (let i = 0; i < categories.length - 1; i++) {
      expect(categories[i].localeCompare(categories[i + 1])).toBeLessThanOrEqual(0);
    }
  });

  it('does not mutate the original array', () => {
    const original = txns.map(t => ({ ...t }));
    getSortedTransactions(txns, 'amount-asc');
    expect(txns.map(t => t.id)).toEqual(original.map(t => t.id));
  });

  it('returns empty array for empty input', () => {
    expect(getSortedTransactions([], 'amount-asc')).toEqual([]);
  });

  it('returns empty array for non-array input', () => {
    expect(getSortedTransactions(null, 'amount-asc')).toEqual([]);
  });
});

// ── Property 4: Transaction List Renders All Fields ────────────────────────
// Feature: expense-budget-visualizer, Property 4: Transaction List Renders All Fields
import { renderTransactionList, renderBalance, AppState, handleDeleteTransaction, getCategoryTotals, formatCurrency } from '../js/app.js';

// Helper: create a minimal DOM element that tracks innerHTML and children
function makeMockElement() {
  const children = [];
  const el = {
    _html: '',
    _classList: new Set(),
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = v; children.length = 0; },
    get classList() {
      return {
        add: (cls) => el._classList.add(cls),
        has: (cls) => el._classList.has(cls),
        remove: (cls) => el._classList.delete(cls),
      };
    },
    appendChild(child) { children.push(child); this._html += child._html || ''; },
    _children: children,
  };
  return el;
}

// Helper: create a mock <li> element with classList support
function makeMockLi() {
  const classes = new Set();
  const childrenArr = [];
  const li = {
    _html: '',
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = v; },
    classList: {
      add: (cls) => classes.add(cls),
      has: (cls) => classes.has(cls),
      remove: (cls) => classes.delete(cls),
    },
    _classes: classes,
    dataset: {},
    setAttribute() {},
    appendChild(child) {
      childrenArr.push(child);
      this._html += child._html || child.textContent || '';
    },
    _children: childrenArr,
  };
  return li;
}

// Helper: create a mock button element
function makeMockButton() {
  return {
    _html: '',
    textContent: '',
    classList: { add() {}, has() { return false; } },
    dataset: {},
    setAttribute() {},
    get innerHTML() { return this.textContent; },
  };
}

// Setup a document mock that supports createElement and getElementById for render tests
function setupRenderMocks() {
  const elements = {};

  const origGetElementById = global.document.getElementById;
  const origCreateElement = global.document.createElement;

  global.document.getElementById = (id) => elements[id] || null;
  global.document.createElement = (tag) => {
    if (tag === 'li') return makeMockLi();
    if (tag === 'button') return makeMockButton();
    // Generic element: supports both innerHTML get/set and textContent
    // Used by escapeHtml (div) and renderThresholdInputs (label), etc.
    let _content = '';
    const el = {
      get textContent() { return _content; },
      set textContent(v) { _content = String(v); },
      get innerHTML() { return _content; },
      set innerHTML(v) { _content = String(v); },
      appendChild() {},
    };
    return el;
  };

  return {
    registerElement(id, el) { elements[id] = el; },
    restore() {
      global.document.getElementById = origGetElementById;
      global.document.createElement = origCreateElement;
    },
  };
}

describe('Property 4: Transaction List Renders All Fields', () => {
  // Validates: Requirements 2.1
  it('every transaction row contains the item name, amount, and category', () => {
    fc.assert(
      fc.property(fc.array(transactionArb, { minLength: 1 }), (txns) => {
        const mocks = setupRenderMocks();
        const container = makeMockElement();
        mocks.registerElement('transactions-ul', container);

        const categoryTotals = getCategoryTotals(txns);
        renderTransactionList(txns, {}, categoryTotals);

        // Collect all rendered HTML from appended children
        const renderedHtml = container._children.map(li => li._html).join('');

        const allFieldsPresent = txns.every(tx => {
          const namePresent = renderedHtml.includes(tx.name);
          const categoryPresent = renderedHtml.includes(tx.category);
          // Amount is formatted as currency — check the formatted value
          const formattedAmount = formatCurrency(tx.amount);
          const amountPresent = renderedHtml.includes(formattedAmount);
          return namePresent && categoryPresent && amountPresent;
        });

        mocks.restore();
        return allFieldsPresent;
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 5: Delete Removes From List and Storage ──────────────────────
// Feature: expense-budget-visualizer, Property 5: Delete Removes From List and Storage
describe('Property 5: Delete Removes From List and Storage', () => {
  // Validates: Requirements 2.4
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('deleting a transaction removes it from AppState and localStorage', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb, { minLength: 1 }),
        fc.integer({ min: 0, max: 99 }),
        (txns, indexSeed) => {
          // Reset AppState
          AppState.transactions = txns.map(t => ({ ...t }));
          AppState.thresholds = {};
          AppState.categories = [...DEFAULT_CATEGORIES];
          AppState.sortKey = null;

          // Persist initial state
          saveState(AppState);

          const idx = indexSeed % txns.length;
          const targetId = AppState.transactions[idx].id;

          // Set up a no-op render mock so handleDeleteTransaction doesn't fail on DOM
          const mocks = setupRenderMocks();
          const container = makeMockElement();
          mocks.registerElement('transactions-ul', container);
          mocks.registerElement('balance-display', makeMockElement());
          mocks.registerElement('chart-canvas', null);
          // threshold-inputs needs innerHTML setter and appendChild
          mocks.registerElement('threshold-inputs', {
            innerHTML: '',
            appendChild() {},
          });

          // Stub querySelector for renderCategorySelector
          const origQuerySelector = global.document.querySelector;
          global.document.querySelector = () => null;

          handleDeleteTransaction(targetId);

          global.document.querySelector = origQuerySelector;
          mocks.restore();

          // Check in-memory list
          const stillInMemory = AppState.transactions.some(t => t.id === targetId);

          // Check storage
          const stored = loadState();
          const stillInStorage = stored && stored.transactions.some(t => t.id === targetId);

          return !stillInMemory && !stillInStorage;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 14: Threshold Highlight Invariant ────────────────────────────
// Feature: expense-budget-visualizer, Property 14: Threshold Highlight Invariant
const categoryArb = fc.constantFrom(...DEFAULT_CATEGORIES);

describe('Property 14: Threshold Highlight Invariant', () => {
  // Validates: Requirements 11.2, 11.3
  it('every row for an over-budget category carries the over-budget CSS class', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb),
        fc.dictionary(categoryArb, fc.float({ min: 0, max: Math.fround(1e4), noNaN: true, noDefaultInfinity: true })),
        (txns, thresholds) => {
          const mocks = setupRenderMocks();

          // Track created li elements so we can inspect their classes
          const createdLis = [];
          const origCreateElement = global.document.createElement;
          global.document.createElement = (tag) => {
            if (tag === 'li') {
              const li = makeMockLi();
              createdLis.push(li);
              return li;
            }
            if (tag === 'button') return makeMockButton();
            // Generic element with read/write innerHTML and textContent
            let _content = '';
            return {
              get textContent() { return _content; },
              set textContent(v) { _content = String(v); },
              get innerHTML() { return _content; },
              set innerHTML(v) { _content = String(v); },
              appendChild() {},
            };
          };

          const container = makeMockElement();
          mocks.registerElement('transactions-ul', container);

          const categoryTotals = getCategoryTotals(txns);
          renderTransactionList(txns, thresholds, categoryTotals);

          global.document.createElement = origCreateElement;
          mocks.restore();

          if (txns.length === 0) return true;

          // For each transaction, check if its category is over budget
          // and verify the corresponding li has the over-budget class
          return txns.every((tx, i) => {
            const li = createdLis[i];
            if (!li) return true;
            const catTotal = categoryTotals[tx.category] || 0;
            const threshold = thresholds[tx.category];
            const isOverBudget = threshold !== undefined && catTotal >= threshold;
            if (isOverBudget) {
              return li._classes.has('over-budget');
            }
            return true;
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 1: Valid Transaction Submission Round-Trip ────────────────────
// Feature: expense-budget-visualizer, Property 1: Valid Transaction Submission Round-Trip
describe('Property 1: Valid Transaction Submission Round-Trip', () => {
  // Validates: Requirements 1.2, 5.4
  beforeEach(() => {
    localStorage.clear();
    // Reset AppState
    AppState.transactions = [];
    AppState.categories = [...DEFAULT_CATEGORIES];
    AppState.thresholds = {};
    AppState.sortKey = null;
  });
  afterEach(() => localStorage.clear());

  it('submitted transaction appears in AppState.transactions and loadState()', () => {
    const validArb = fc.record({
      name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
      amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1e6), noNaN: true, noDefaultInfinity: true }),
      category: fc.constantFrom(...DEFAULT_CATEGORIES),
    });

    fc.assert(
      fc.property(validArb, ({ name, amount, category }) => {
        // Reset state before each run
        AppState.transactions = [];
        AppState.categories = [...DEFAULT_CATEGORIES];
        AppState.thresholds = {};
        AppState.sortKey = null;
        localStorage.clear();

        // Build a minimal form DOM
        const formFields = {
          name: { value: name },
          amount: { value: String(amount) },
          category: { value: category },
        };
        const formEl = {
          querySelector: (sel) => {
            if (sel === 'input[name="name"]') return formFields.name;
            if (sel === 'input[name="amount"]') return formFields.amount;
            if (sel === 'select[name="category"]') return formFields.category;
            return null;
          },
          reset: () => {
            formFields.name.value = '';
            formFields.amount.value = '';
            formFields.category.value = DEFAULT_CATEGORIES[0];
          },
        };

        // Stub document.getElementById and document.querySelector for render()
        const origGetElementById = global.document.getElementById;
        const origQuerySelector = global.document.querySelector;
        const origCreateElement = global.document.createElement;

        const noopEl = {
          textContent: '',
          innerHTML: '',
          appendChild() {},
          classList: { add() {}, has() { return false; }, remove() {} },
        };

        global.document.getElementById = (id) => {
          if (id === 'transaction-form') return formEl;
          if (id === 'form-errors') return noopEl;
          return noopEl;
        };
        global.document.querySelector = () => null;
        global.document.createElement = (tag) => {
          const el = {
            textContent: '',
            get innerHTML() { return this.textContent; },
            set innerHTML(v) { this.textContent = v; },
            classList: { add() {}, has() { return false; }, remove() {} },
            dataset: {},
            setAttribute() {},
            appendChild() {},
          };
          return el;
        };

        // Simulate form submit
        const fakeEvent = { preventDefault: () => {} };
        handleFormSubmit(fakeEvent);

        global.document.getElementById = origGetElementById;
        global.document.querySelector = origQuerySelector;
        global.document.createElement = origCreateElement;

        // Check AppState contains the transaction (name is trimmed by handleFormSubmit)
        const trimmedName = name.trim();
        const inMemory = AppState.transactions.some(
          t => t.name === trimmedName && Math.abs(t.amount - amount) < 0.001 && t.category === category
        );

        // Check storage contains the transaction
        const stored = loadState();
        const inStorage = stored !== null && stored.transactions.some(
          t => t.name === trimmedName && Math.abs(t.amount - amount) < 0.001 && t.category === category
        );

        return inMemory && inStorage;
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 3: Form Reset After Successful Submission ─────────────────────
// Feature: expense-budget-visualizer, Property 3: Form Reset After Successful Submission
describe('Property 3: Form Reset After Successful Submission', () => {
  // Validates: Requirements 1.5
  beforeEach(() => {
    localStorage.clear();
    AppState.transactions = [];
    AppState.categories = [...DEFAULT_CATEGORIES];
    AppState.thresholds = {};
    AppState.sortKey = null;
  });
  afterEach(() => localStorage.clear());

  it('form fields are empty/default after a valid submission', () => {
    const validArb = fc.record({
      name: fc.string({ minLength: 1 }),
      amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1e6), noNaN: true, noDefaultInfinity: true }),
      category: fc.constantFrom(...DEFAULT_CATEGORIES),
    });

    fc.assert(
      fc.property(validArb, ({ name, amount, category }) => {
        // Reset state before each run
        AppState.transactions = [];
        AppState.categories = [...DEFAULT_CATEGORIES];
        AppState.thresholds = {};
        AppState.sortKey = null;
        localStorage.clear();

        // Build a minimal form DOM with mutable field values
        const formFields = {
          name: { value: name },
          amount: { value: String(amount) },
          category: { value: category },
        };
        const formEl = {
          querySelector: (sel) => {
            if (sel === 'input[name="name"]') return formFields.name;
            if (sel === 'input[name="amount"]') return formFields.amount;
            if (sel === 'select[name="category"]') return formFields.category;
            return null;
          },
          reset: () => {
            formFields.name.value = '';
            formFields.amount.value = '';
            formFields.category.value = DEFAULT_CATEGORIES[0];
          },
        };

        const origGetElementById = global.document.getElementById;
        const origQuerySelector = global.document.querySelector;
        const origCreateElement = global.document.createElement;

        const noopEl = {
          textContent: '',
          innerHTML: '',
          appendChild() {},
          classList: { add() {}, has() { return false; }, remove() {} },
        };

        global.document.getElementById = (id) => {
          if (id === 'transaction-form') return formEl;
          if (id === 'form-errors') return noopEl;
          return noopEl;
        };
        global.document.querySelector = () => null;
        global.document.createElement = (tag) => {
          const el = {
            textContent: '',
            get innerHTML() { return this.textContent; },
            set innerHTML(v) { this.textContent = v; },
            classList: { add() {}, has() { return false; }, remove() {} },
            dataset: {},
            setAttribute() {},
            appendChild() {},
          };
          return el;
        };

        const fakeEvent = { preventDefault: () => {} };
        handleFormSubmit(fakeEvent);

        global.document.getElementById = origGetElementById;
        global.document.querySelector = origQuerySelector;
        global.document.createElement = origCreateElement;

        // After submission, form.reset() is called, then category is set to categories[0]
        const nameCleared = formFields.name.value === '';
        const amountCleared = formFields.amount.value === '';
        const categoryDefault = formFields.category.value === DEFAULT_CATEGORIES[0];

        return nameCleared && amountCleared && categoryDefault;
      }),
      { numRuns: 100 }
    );
  });
});

// ── Unit Tests: handleAddCategory & renderCategorySelector ─────────────────
import { handleAddCategory, renderCategorySelector, handleFormSubmit } from '../js/app.js';

describe('handleAddCategory unit tests', () => {
  beforeEach(() => {
    localStorage.clear();
    AppState.transactions = [];
    AppState.categories = [...DEFAULT_CATEGORIES];
    AppState.thresholds = {};
    AppState.sortKey = null;
    // Stub querySelector so renderCategorySelector doesn't fail on DOM
    global.document.querySelector = () => null;
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('adds a new unique category to AppState.categories', () => {
    const result = handleAddCategory('Fitness');
    expect(result.success).toBe(true);
    expect(AppState.categories).toContain('Fitness');
  });

  it('persists the new category to localStorage', () => {
    handleAddCategory('Fitness');
    const stored = loadState();
    expect(stored.categories).toContain('Fitness');
  });

  it('returns error and does not add duplicate (exact match)', () => {
    const result = handleAddCategory('Food');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    // Length should not have changed
    expect(AppState.categories.filter(c => c === 'Food').length).toBe(1);
  });

  it('returns error and does not add duplicate (case-insensitive)', () => {
    const result = handleAddCategory('food');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(AppState.categories.includes('food')).toBe(false);
  });

  it('returns error and does not add duplicate (mixed case)', () => {
    const result = handleAddCategory('TRANSPORT');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns error for empty name', () => {
    const result = handleAddCategory('');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns error for whitespace-only name', () => {
    const result = handleAddCategory('   ');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('trims whitespace from category name before adding', () => {
    const result = handleAddCategory('  Fitness  ');
    expect(result.success).toBe(true);
    expect(AppState.categories).toContain('Fitness');
    expect(AppState.categories).not.toContain('  Fitness  ');
  });

  it('multiple unique categories can be added sequentially', () => {
    handleAddCategory('Fitness');
    handleAddCategory('Travel');
    expect(AppState.categories).toContain('Fitness');
    expect(AppState.categories).toContain('Travel');
  });
});

describe('renderCategorySelector unit tests', () => {
  let selectEl;
  let origCreateElement;

  beforeEach(() => {
    // Create a mock <select> element
    const options = [];
    selectEl = {
      value: '',
      _options: options,
      get innerHTML() { return ''; },
      set innerHTML(_v) { options.length = 0; }, // clearing innerHTML clears options
      appendChild(child) { options.push(child); },
    };
    // Stub querySelector to return our mock select
    global.document.querySelector = (sel) => {
      if (sel === '#transaction-form select[name="category"]') return selectEl;
      return null;
    };
    // Stub createElement to return option elements with value + textContent
    origCreateElement = global.document.createElement;
    global.document.createElement = (_tag) => {
      let _value = '';
      let _text = '';
      return {
        get value() { return _value; },
        set value(v) { _value = v; },
        get textContent() { return _text; },
        set textContent(v) { _text = v; },
      };
    };
  });

  afterEach(() => {
    global.document.querySelector = () => null;
    global.document.createElement = origCreateElement;
  });

  it('populates the select with one option per category', () => {
    renderCategorySelector(['Food', 'Transport', 'Fun']);
    expect(selectEl._options.length).toBe(3);
  });

  it('option values and text match the category names', () => {
    renderCategorySelector(['Food', 'Transport']);
    const values = selectEl._options.map(o => o.value);
    const texts = selectEl._options.map(o => o.textContent);
    expect(values).toContain('Food');
    expect(values).toContain('Transport');
    expect(texts).toContain('Food');
    expect(texts).toContain('Transport');
  });

  it('clears previous options before re-rendering', () => {
    renderCategorySelector(['Food', 'Transport']);
    renderCategorySelector(['Fun']);
    // After second call, only 'Fun' should be present
    expect(selectEl._options.length).toBe(1);
    expect(selectEl._options[0].value).toBe('Fun');
  });

  it('preserves current selection if it still exists in new categories', () => {
    selectEl.value = 'Transport';
    renderCategorySelector(['Food', 'Transport', 'Fun']);
    expect(selectEl.value).toBe('Transport');
  });

  it('does nothing when select element is not found', () => {
    global.document.querySelector = () => null;
    // Should not throw
    expect(() => renderCategorySelector(['Food'])).not.toThrow();
  });

  it('renders all DEFAULT_CATEGORIES correctly', () => {
    renderCategorySelector(DEFAULT_CATEGORIES);
    expect(selectEl._options.length).toBe(DEFAULT_CATEGORIES.length);
    DEFAULT_CATEGORIES.forEach(cat => {
      expect(selectEl._options.some(o => o.value === cat)).toBe(true);
    });
  });
});

// ── Property 9: Custom Category Addition ──────────────────────────────────
// Feature: expense-budget-visualizer, Property 9: Custom Category Addition
describe('Property 9: Custom Category Addition', () => {
  // Validates: Requirements 8.1, 8.2
  let selectEl;
  let origCreateElement;
  let origQuerySelector;

  beforeEach(() => {
    localStorage.clear();
    AppState.transactions = [];
    AppState.categories = [...DEFAULT_CATEGORIES];
    AppState.thresholds = {};
    AppState.sortKey = null;

    // Mock <select> element for renderCategorySelector
    const options = [];
    selectEl = {
      value: '',
      _options: options,
      get innerHTML() { return ''; },
      set innerHTML(_v) { options.length = 0; },
      appendChild(child) { options.push(child); },
    };

    origQuerySelector = global.document.querySelector;
    global.document.querySelector = (sel) => {
      if (sel === '#transaction-form select[name="category"]') return selectEl;
      return null;
    };

    origCreateElement = global.document.createElement;
    global.document.createElement = (_tag) => {
      let _value = '';
      let _text = '';
      return {
        get value() { return _value; },
        set value(v) { _value = v; },
        get textContent() { return _text; },
        set textContent(v) { _text = v; },
      };
    };
  });

  afterEach(() => {
    global.document.querySelector = origQuerySelector;
    global.document.createElement = origCreateElement;
    localStorage.clear();
  });

  it('adding a unique category name results in it appearing in AppState.categories and the category selector', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(name => {
          const trimmed = name.trim();
          return (
            trimmed.length > 0 &&
            !AppState.categories.some(c => c.toLowerCase() === trimmed.toLowerCase())
          );
        }),
        (name) => {
          // Reset state for each run
          AppState.categories = [...DEFAULT_CATEGORIES];
          selectEl._options.length = 0;

          const result = handleAddCategory(name);

          // Must succeed
          if (!result.success) return false;

          const trimmed = name.trim();

          // Must appear in AppState.categories
          const inState = AppState.categories.some(
            c => c.toLowerCase() === trimmed.toLowerCase()
          );

          // Must appear in the category selector options
          const inSelector = selectEl._options.some(
            o => o.value.toLowerCase() === trimmed.toLowerCase()
          );

          return inState && inSelector;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 10: Custom Category Persistence ──────────────────────────────
// Feature: expense-budget-visualizer, Property 10: Custom Category Persistence
describe('Property 10: Custom Category Persistence', () => {
  // Validates: Requirements 8.3
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('serialising and deserialising state restores all custom categories in the same order', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 1 }),
        (customNames) => {
          // Build categories list: defaults + custom
          const categories = [...DEFAULT_CATEGORIES, ...customNames];

          // Save state with these categories
          saveState({ transactions: [], categories, thresholds: {} });

          // Load state back
          const loaded = loadState();

          // All custom categories must be present in the same order
          const loadedCustom = loaded.categories.slice(DEFAULT_CATEGORIES.length);
          return (
            loadedCustom.length === customNames.length &&
            customNames.every((name, i) => loadedCustom[i] === name)
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 11: Duplicate Category Rejection ─────────────────────────────
// Feature: expense-budget-visualizer, Property 11: Duplicate Category Rejection
describe('Property 11: Duplicate Category Rejection', () => {
  // Validates: Requirements 8.4
  beforeEach(() => {
    localStorage.clear();
    AppState.transactions = [];
    AppState.categories = [...DEFAULT_CATEGORIES];
    AppState.thresholds = {};
    AppState.sortKey = null;
    global.document.querySelector = () => null;
  });
  afterEach(() => {
    localStorage.clear();
    global.document.querySelector = () => null;
  });

  it('attempting to add an existing category (with case variations) leaves categories list unchanged', () => {
    // Existing categories to pick from
    const existingCategories = [...DEFAULT_CATEGORIES];

    // Arbitrary: pick an existing category name and apply a random case variation
    const caseVariantArb = fc.constantFrom(...existingCategories).chain((name) =>
      fc.array(fc.boolean(), { minLength: name.length, maxLength: name.length }).map((flips) =>
        name
          .split('')
          .map((ch, i) => (flips[i] ? ch.toUpperCase() : ch.toLowerCase()))
          .join('')
      )
    );

    fc.assert(
      fc.property(caseVariantArb, (variant) => {
        // Reset categories to defaults before each run
        AppState.categories = [...DEFAULT_CATEGORIES];

        const before = [...AppState.categories];

        const result = handleAddCategory(variant);

        // Must fail
        if (result.success) return false;

        // Categories list must be unchanged
        const after = AppState.categories;
        return (
          after.length === before.length &&
          before.every((cat, i) => cat === after[i])
        );
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 15: Threshold Persistence ────────────────────────────────────
// Feature: expense-budget-visualizer, Property 15: Threshold Persistence
import { handleSetThreshold } from '../js/app.js';

describe('Property 15: Threshold Persistence', () => {
  // Validates: Requirements 11.4
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('serialising and deserialising state restores all threshold values exactly', () => {
    const categoryArb = fc.constantFrom(...DEFAULT_CATEGORIES);
    const thresholdMapArb = fc.dictionary(categoryArb, fc.float({ min: Math.fround(0.01), max: Math.fround(1e6), noNaN: true, noDefaultInfinity: true }));

    fc.assert(
      fc.property(thresholdMapArb, (thresholds) => {
        saveState({ transactions: [], categories: [...DEFAULT_CATEGORIES], thresholds });
        const loaded = loadState();
        if (!loaded) return false;
        // Every threshold key/value must be restored exactly
        return Object.entries(thresholds).every(([cat, limit]) =>
          loaded.thresholds[cat] === limit
        );
      }),
      { numRuns: 100 }
    );
  });
});

// ── Unit Tests: handleSetThreshold & renderThresholdInputs ─────────────────
import { renderThresholdInputs } from '../js/app.js';

describe('handleSetThreshold unit tests', () => {
  beforeEach(() => {
    localStorage.clear();
    AppState.transactions = [];
    AppState.categories = [...DEFAULT_CATEGORIES];
    AppState.thresholds = {};
    AppState.sortKey = null;
    // Stub DOM so render() doesn't fail
    global.document.getElementById = () => null;
    global.document.querySelector = () => null;
  });
  afterEach(() => {
    localStorage.clear();
    global.document.getElementById = () => null;
    global.document.querySelector = () => null;
  });

  it('sets a positive threshold and persists it', () => {
    const result = handleSetThreshold('Food', 200);
    expect(result).toBe(true);
    expect(AppState.thresholds['Food']).toBe(200);
    const stored = loadState();
    expect(stored.thresholds['Food']).toBe(200);
  });

  it('rejects zero value', () => {
    const result = handleSetThreshold('Food', 0);
    expect(result).toBe(false);
    expect(AppState.thresholds['Food']).toBeUndefined();
  });

  it('rejects negative value', () => {
    const result = handleSetThreshold('Food', -10);
    expect(result).toBe(false);
    expect(AppState.thresholds['Food']).toBeUndefined();
  });

  it('rejects non-numeric value', () => {
    const result = handleSetThreshold('Food', 'abc');
    expect(result).toBe(false);
    expect(AppState.thresholds['Food']).toBeUndefined();
  });

  it('updates an existing threshold', () => {
    handleSetThreshold('Food', 100);
    handleSetThreshold('Food', 250);
    expect(AppState.thresholds['Food']).toBe(250);
  });
});

describe('renderThresholdInputs unit tests', () => {
  let container;
  let origGetElementById;
  let origCreateElement;

  beforeEach(() => {
    const children = [];
    container = {
      _children: children,
      innerHTML: '',
      set innerHTML(v) { children.length = 0; },
      appendChild(child) { children.push(child); },
    };

    origGetElementById = global.document.getElementById;
    origCreateElement = global.document.createElement;

    global.document.getElementById = (id) => {
      if (id === 'threshold-inputs') return container;
      return null;
    };

    global.document.createElement = (tag) => {
      const children2 = [];
      let _html = '';
      return {
        get innerHTML() { return _html; },
        set innerHTML(v) { _html = v; },
        textContent: '',
        appendChild(child) { children2.push(child); },
        _children: children2,
      };
    };
  });

  afterEach(() => {
    global.document.getElementById = origGetElementById;
    global.document.createElement = origCreateElement;
  });

  it('renders one label per category', () => {
    renderThresholdInputs(['Food', 'Transport', 'Fun'], {});
    expect(container._children.length).toBe(3);
  });

  it('renders no inputs when categories is empty', () => {
    renderThresholdInputs([], {});
    expect(container._children.length).toBe(0);
  });

  it('does nothing when container is not found', () => {
    global.document.getElementById = () => null;
    expect(() => renderThresholdInputs(['Food'], {})).not.toThrow();
  });
});

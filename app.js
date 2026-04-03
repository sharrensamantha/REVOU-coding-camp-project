// Expense & Budget Visualizer — app.js

// ── Constants ──────────────────────────────────────────────────────────────
export const DEFAULT_CATEGORIES = [
  { name: 'Food', color: '#e74c3c' },
  { name: 'Transport', color: '#3498db' },
  { name: 'Fun', color: '#9b59b6' },
  { name: 'Other', color: '#95a5a6' }
];
const STORAGE_KEY = 'ebv_state';
let chartInstance = null;
let currentDate = new Date();
let selectedDate = null;

// ── AppState ──────────────────────────────────────────────────────────────
export const AppState = {
  transactions: [],
  categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
  thresholds: {},
  sortKey: null,
};

// ── Utilities ──────────────────────────────────────────────────────────────
export function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Tab / Sidebar Logic ────────────────────────────────────────────────────
function setupSidebar() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.content-section');
  const pageTitle = document.getElementById('page-title');

  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all
      navItems.forEach(b => b.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));

      // Add active to clicked
      btn.classList.add('active');
      const targetId = btn.dataset.target;
      document.getElementById(targetId).classList.add('active');
      
      // Update Title
      pageTitle.textContent = btn.textContent.trim();
      
      // If switching to chart, re-render to ensure size is correct
      if(targetId === 'chart-section') renderChart(getFilteredTransactions(), AppState.thresholds);
    });
  });
}

// ── Calendar Functions ─────────────────────────────────────────────────────
export function generateCalendar(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  days.push({ type: 'header', values: dayNames });

  for (let i = 0; i < firstDay.getDay(); i++) days.push({ type: 'empty' });
  
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const hasTx = AppState.transactions.some(t => t.date && t.date.startsWith(dateStr));
    days.push({ type: 'day', day, date: dateStr, hasTransactions: hasTx, isSelected: selectedDate === dateStr });
  }
  return days;
}

export function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  const monthDisplay = document.getElementById('current-month');
  if (!grid || !monthDisplay) return;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  monthDisplay.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  grid.innerHTML = '';
  generateCalendar(currentDate.getFullYear(), currentDate.getMonth()).forEach(item => {
    if (item.type === 'header') {
      item.values.forEach(d => {
        const el = document.createElement('div');
        el.className = 'calendar-day-header';
        el.textContent = d;
        grid.appendChild(el);
      });
    } else if (item.type === 'empty') {
      grid.appendChild(document.createElement('div'));
    } else {
      const btn = document.createElement('button');
      btn.className = `calendar-day ${item.hasTransactions ? 'has-transactions' : ''} ${item.isSelected ? 'selected' : ''}`;
      btn.textContent = item.day;
      btn.onclick = () => {
        selectedDate = item.date;
        renderCalendar();
        renderBreakdown(); // Update breakdown for selected date
      };
      grid.appendChild(btn);
    }
  });
}

function getFilteredTransactions() {
  return selectedDate 
    ? AppState.transactions.filter(t => t.date.startsWith(selectedDate))
    : AppState.transactions;
}

// ── NEW: Get Transactions for the Current Month ────────────────────────────
function getMonthlyTransactions() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  return AppState.transactions.filter(t => {
    const tDate = new Date(t.date);
    return tDate.getFullYear() === year && tDate.getMonth() === month;
  });
}
// ── Theme Toggle ───────────────────────────────────────────────────────────
export function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  document.getElementById('theme-text').textContent = isDark ? '🌙 Dark Mode' : '☀️ Light Mode';
  localStorage.setItem('ebv_theme', isDark ? 'light' : 'dark');
}

export function initTheme() {
  const saved = localStorage.getItem('ebv_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  document.getElementById('theme-text').textContent = saved === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
}

// ── Pure Functions ─────────────────────────────────────────────────────────
export function calculateBalance(transactions) {
  return transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
}

export function getCategoryTotals(transactions) {
  return transactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + (Number(t.amount) || 0);
    return acc;
  }, {});
}

// ── Render: Balance ────────────────────────────────────────────────────────
export function renderBalance() {
  const total = calculateBalance(getFilteredTransactions());
  document.getElementById('balance-display').textContent = formatCurrency(total);
}

// ── Render: Spending Breakdown (Progress Bars) ─────────────────────────────
export function renderBreakdown() {
  const container = document.getElementById('breakdown-list');
  const totals = getCategoryTotals(getFilteredTransactions());
  const grandTotal = calculateBalance(getFilteredTransactions());
  
  if (Object.keys(totals).length === 0) {
    container.innerHTML = '<p class="empty-state">No spending data for this period.</p>';
    return;
  }

  container.innerHTML = '';
  
  // Sort categories based on AppState.sortKey
  const sortedCategories = Object.keys(totals).sort((a, b) => {
    if (AppState.sortKey === 'category-asc') {
      return a.localeCompare(b); // Alphabetical A-Z
    }
    // Default: by amount descending (highest first)
    return totals[b] - totals[a];
  });

  sortedCategories.forEach(cat => {
    const amount = totals[cat];
    const percent = grandTotal > 0 ? ((amount / grandTotal) * 100).toFixed(1) : 0;
    const catObj = AppState.categories.find(c => c.name === cat) || { color: '#ccc' };

    const item = document.createElement('div');
    item.className = 'breakdown-item';
    item.innerHTML = `
      <div class="breakdown-header">
        <div class="cat-label">
          <span class="cat-dot" style="background:${catObj.color}"></span>
          ${escapeHtml(cat)}
        </div>
        <div class="breakdown-values">
          <span class="breakdown-percent">${percent}%</span>
          <span class="breakdown-amount">${formatCurrency(amount)}</span>
        </div>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width: ${percent}%; background: ${catObj.color}"></div>
      </div>
    `;
    container.appendChild(item);
  });
}

// ── Render: Chart (Donut Style) ────────────────────────────────────────────
export function renderChart(transactions, thresholds) {
  const canvas = document.getElementById('chart-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const totals = getCategoryTotals(transactions);
  const categoryTotals = getCategoryTotals(transactions)
  const categories = Object.keys(totals);
  const values = Object.values(totals);
  const colors = categories.map(c => (AppState.categories.find(x => x.name === c) || {}).color || '#ccc');

  if (chartInstance) chartInstance.destroy();
  if (categories.length === 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-primary');
    ctx.font = '16px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('No data to display', canvas.width / 2, canvas.height / 2);
    return;
  }

  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: categories,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 0,
        hoverOffset: 10
      }]
    },
    options: {
      cutout: '75%', // Makes it a thin ring like Image 6
      radius: '90%',
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { usePointStyle: true, padding: 20, font: { family: 'Inter', size: 12 } }
        },
        tooltip: { enabled: true }
      }
    },
    plugins: [{
      id: 'centerText',
      beforeDraw: (chart) => {
        const { ctx, width, height } = chart;
        ctx.restore();
        const total = calculateBalance(transactions);
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-primary');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 24px Inter';
        ctx.fillText(formatCurrency(total), width / 2, height / 2 - 10);
        ctx.font = '12px Inter';
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-secondary');
        ctx.fillText('Total Spent', width / 2, height / 2 + 15);
        ctx.save();
      }
    }]
  });
}

// ── Render: Category Selector ──────────────────────────────────────────────
export function renderCategorySelector() {
  const select = document.querySelector('#transaction-form select[name="category"]');
  if (!select) return;
  select.innerHTML = '<option value="">Category</option>';
  AppState.categories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = c.name;
    select.appendChild(opt);
  });
}

// ── Render: Threshold Inputs ───────────────────────────────────────────────
export function renderThresholdInputs() {
  const container = document.getElementById('threshold-inputs');
  if (!container) return;
  container.innerHTML = '';
  AppState.categories.forEach(c => {
    const label = document.createElement('label');
    label.innerHTML = `
      <span>${escapeHtml(c.name)}</span>
      <input type="number" data-category="${c.name}" value="${AppState.thresholds[c.name] || ''}" placeholder="Limit" />
    `;
    container.appendChild(label);
  });
}

// ── Render: Monthly Summary ────────────────────────────────────────────────
export function renderMonthlySummary() {
  const container = document.getElementById('monthly-cards');
  if (!container) return;
  
  // Group transactions by month
  const monthlyData = {};
  
  getFilteredTransactions().forEach(tx => {
    const date = new Date(tx.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        monthName,
        total: 0,
        categories: {},
        count: 0
      };
    }
    
    monthlyData[monthKey].total += tx.amount;
    monthlyData[monthKey].count++;
    monthlyData[monthKey].categories[tx.category] = 
      (monthlyData[monthKey].categories[tx.category] || 0) + tx.amount;
  });
  
  // Convert to array and sort by month (newest first)
  const sortedMonths = Object.entries(monthlyData)
    .sort(([a], [b]) => b.localeCompare(a));
  
  if (sortedMonths.length === 0) {
    container.innerHTML = '<div class="empty-state">No monthly data yet. Add some transactions!</div>';
    return;
  }
  
  container.innerHTML = '';
  
  sortedMonths.forEach(([monthKey, data]) => {
    // Find top category for this month
    const topCat = Object.entries(data.categories)
      .sort(([,a], [,b]) => b - a)[0];
    const topCategoryName = topCat ? topCat[0] : 'None';
    const topCategoryAmount = topCat ? topCat[1] : 0;
    
    // Check if over any threshold
    const isOverLimit = Object.entries(AppState.thresholds).some(([cat, limit]) => {
      return (data.categories[cat] || 0) >= limit;
    });
    
    const card = document.createElement('div');
    card.className = `monthly-card ${isOverLimit ? 'over-limit' : ''}`;
    
    card.innerHTML = `
      <div class="monthly-month">${data.monthName}</div>
      <div class="monthly-amount">${formatCurrency(data.total)}</div>
      <div class="monthly-details">${data.count} transaction${data.count !== 1 ? 's' : ''}</div>
      <div class="monthly-top-category">
        Top: ${escapeHtml(topCategoryName)} (${formatCurrency(topCategoryAmount)})
      </div>
    `;
    
    container.appendChild(card);
  });
}

// ── Highlight Over-Budget Inputs ───────────────────────────────────────────
function highlightOverBudgetInputs() {
  const categoryTotals = getCategoryTotals(getFilteredTransactions());
  
  // Highlight category selector in add form
  const categorySelect = document.querySelector('#transaction-form select[name="category"]');
  if (categorySelect?.value) {
    const threshold = AppState.thresholds[categorySelect.value];
    const total = categoryTotals[categorySelect.value] || 0;
    if (threshold && total >= threshold) {
      categorySelect.classList.add('over-budget');
    } else {
      categorySelect.classList.remove('over-budget');
    }
  }
  
  // Highlight threshold inputs that are exceeded
  document.querySelectorAll('#threshold-inputs input[type="number"]').forEach(input => {
    const cat = input.dataset.category;
    const limit = parseFloat(input.value);
    const total = categoryTotals[cat] || 0;
    if (limit > 0 && total >= limit) {
      input.classList.add('over-budget');
      input.parentElement?.classList.add('threshold-exceeded');
    } else {
      input.classList.remove('over-budget');
      input.parentElement?.classList.remove('threshold-exceeded');
    }
  });
}

// ── Render: Transaction List (Traditional View) ────────────────────────────
export function renderTransactionList(transactions, thresholds, categoryTotals) {
  const container = document.getElementById('transactions-ul');
  if (!container) return;
  
  if (transactions.length === 0) {
    container.innerHTML = '<li class="empty-state">No expenses yet. Add your first one above.</li>';
    return;
  }
  
  const overBudgetCats = new Set(
    Object.entries(thresholds)
      .filter(([cat, limit]) => (categoryTotals[cat] || 0) >= limit)
      .map(([cat]) => cat)
  );
  
  container.innerHTML = '';
  transactions.forEach(tx => {
    const li = document.createElement('li');
    if (overBudgetCats.has(tx.category)) li.classList.add('over-budget');
    
    const categoryObj = AppState.categories.find(c => c.name === tx.category);
    const color = categoryObj?.color || '#95a5a6';
    
    li.innerHTML = `
      <span class="tx-name">${escapeHtml(tx.name)}</span>
      <span class="tx-amount">${formatCurrency(tx.amount)}</span>
      <span class="tx-category" style="display:flex;align-items:center;gap:4px;">
        <span style="width:8px;height:8px;border-radius:50%;background:${color}"></span>
        ${escapeHtml(tx.category)}
      </span>
      <button class="delete-btn" data-id="${tx.id}">✕</button>
    `;
    
    const deleteBtn = li.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => handleDeleteTransaction(tx.id));
    
    container.appendChild(li);
  });
}

// ── Master Render ──────────────────────────────────────────────────────────
export function render() {
  renderCalendar();
  renderBalance();
  renderBreakdown();
  renderChart(getMonthlyTransactions(), AppState.thresholds); 
  renderCategorySelector();
  renderThresholdInputs();
  renderMonthlySummary();
  renderTransactionList(AppState.transactions, AppState.thresholds, getCategoryTotals(AppState.transactions)); // ← Add this line
  highlightOverBudgetInputs();
}

// ── Event Handlers ─────────────────────────────────────────────────────────
export function handleFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const name = form.querySelector('[name="name"]').value.trim();
  const amount = form.querySelector('[name="amount"]').value;
  const category = form.querySelector('[name="category"]').value;

  if (!name || !amount || !category) {
    document.getElementById('form-errors').textContent = 'Please fill all fields.';
    return;
  }

  AppState.transactions.push({
    id: generateId(),
    name,
    amount: Number(amount),
    category,
    date: selectedDate || new Date().toISOString().split('T')[0]
  });

  saveState(AppState);
  form.reset();
  render();
}

export function handleAddCategory(e) {
  e.preventDefault();
  const form = e.target;
  const name = form.querySelector('[name="new-category"]').value.trim();
  const color = form.querySelector('[name="category-color"]').value;
  if (!name) return;
  
  if (AppState.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    document.getElementById('category-errors').textContent = 'Category exists.';
    return;
  }

  AppState.categories.push({ name, color });
  saveState(AppState);
  form.reset();
  render();
}

export function handleSetThreshold(e) {
  if (e.target.tagName === 'INPUT') {
    AppState.thresholds[e.target.dataset.category] = Number(e.target.value);
    saveState(AppState);
  }
}

// ── Storage ────────────────────────────────────────────────────────────────
export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

// ── Init ───────────────────────────────────────────────────────────────────
export function init() {
  initTheme();
  const saved = loadState();
  if (saved) {
    AppState.transactions = saved.transactions || [];
    AppState.categories = saved.categories || DEFAULT_CATEGORIES;
    AppState.thresholds = saved.thresholds || {};
  }

  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  document.getElementById('prev-month').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); render(); });
  document.getElementById('next-month').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); render(); });
  document.getElementById('transaction-form').addEventListener('submit', handleFormSubmit);
  document.getElementById('add-category-form').addEventListener('submit', handleAddCategory);
  document.getElementById('threshold-inputs').addEventListener('input', handleSetThreshold);
  
  // ← ADD THIS LINE HERE (after threshold-inputs, before sort buttons):
  document.querySelector('#transaction-form select[name="category"]')
    ?.addEventListener('change', highlightOverBudgetInputs);

  document.getElementById('sort-amount-asc')?.addEventListener('click', () => {
    AppState.sortKey = 'amount-asc';
    renderBreakdown();
  });
  document.getElementById('sort-amount-desc')?.addEventListener('click', () => {
    AppState.sortKey = 'amount-desc';
    renderBreakdown();
  });
  document.getElementById('sort-category-asc')?.addEventListener('click', () => {
    AppState.sortKey = 'category-asc';
    renderBreakdown();
  });
  
  setupSidebar();
  render();
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', init);
}
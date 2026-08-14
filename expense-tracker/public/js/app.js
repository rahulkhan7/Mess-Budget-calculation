// ---------- Global state ----------
const state = {
  user: null,
  categories: [],
  currentView: 'dashboard',
  editingExpenseId: null,
  editingCategoryId: null
};

// ---------- Utilities ----------
function formatCurrency(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthStr() {
  return new Date().toISOString().slice(0, 7);
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

function showError(elId, message) {
  document.getElementById(elId).textContent = message;
}

// ---------- Auth screen logic ----------
const authTabs = document.querySelectorAll('.auth-tab');
authTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    authTabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.auth-form').forEach((f) => f.classList.remove('active'));
    document.getElementById(`${tab.dataset.tab}-form`).classList.add('active');
    showError('auth-error', '');
  });
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('auth-error', '');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const data = await api.login({ email, password });
    setToken(data.token);
    localStorage.setItem('ef_user', JSON.stringify(data.user));
    state.user = data.user;
    await enterApp();
  } catch (err) {
    showError('auth-error', err.message);
  }
});

document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('auth-error', '');
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  try {
    const data = await api.signup({ name, email, password });
    setToken(data.token);
    localStorage.setItem('ef_user', JSON.stringify(data.user));
    state.user = data.user;
    await enterApp();
  } catch (err) {
    showError('auth-error', err.message);
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  clearToken();
  state.user = null;
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
});

// ---------- Navigation ----------
document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

function switchView(viewName) {
  state.currentView = viewName;
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === viewName));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${viewName}`));

  if (viewName === 'dashboard') loadDashboard();
  if (viewName === 'expenses') loadExpenses();
  if (viewName === 'categories') loadCategories();
  if (viewName === 'budgets') loadBudgets();
}

// ---------- App entry ----------
async function enterApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');

  document.getElementById('user-name').textContent = state.user.name;
  document.getElementById('user-avatar').textContent = state.user.name.charAt(0).toUpperCase();

  document.getElementById('dashboard-month').value = currentMonthStr();
  document.getElementById('budget-month').value = currentMonthStr();

  await refreshCategories();
  switchView('dashboard');
}

async function refreshCategories() {
  state.categories = await api.getCategories();
  populateCategorySelects();
}

function populateCategorySelects() {
  const filterSel = document.getElementById('filter-category');
  const expenseSel = document.getElementById('expense-category');
  const budgetSel = document.getElementById('budget-category');

  const opts = state.categories
    .map((c) => `<option value="${c.id}">${c.icon} ${escapeHtml(c.name)}</option>`)
    .join('');

  filterSel.innerHTML = `<option value="">All Categories</option>${opts}`;
  expenseSel.innerHTML = `<option value="">No category</option>${opts}`;
  budgetSel.innerHTML = opts;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getCategoryById(id) {
  return state.categories.find((c) => c.id === Number(id));
}

// ---------- Initial load on page refresh ----------
(async function init() {
  const token = getToken();
  const storedUser = localStorage.getItem('ef_user');
  if (token && storedUser) {
    state.user = JSON.parse(storedUser);
    try {
      await enterApp();
    } catch (err) {
      clearToken();
    }
  }
})();

// =================================================================
// DASHBOARD
// =================================================================
document.getElementById('dashboard-month').addEventListener('change', loadDashboard);

async function loadDashboard() {
  const month = document.getElementById('dashboard-month').value || currentMonthStr();

  const [summary, trend] = await Promise.all([
    api.getMonthlySummary(month),
    api.getTrend(6)
  ]);

  document.getElementById('stat-total').textContent = formatCurrency(summary.total);
  document.getElementById('stat-count').textContent = summary.byDay.reduce((sum, d) => sum, 0) || 0;

  const txCount = summary.byDay.length
    ? (await api.getExpenses({ from: `${month}-01`, to: `${month}-31` })).length
    : 0;
  document.getElementById('stat-count').textContent = txCount;

  const daysInMonth = summary.byDay.length || 1;
  document.getElementById('stat-daily-avg').textContent = formatCurrency(summary.total / daysInMonth);

  if (summary.byCategory.length > 0) {
    const top = summary.byCategory[0];
    document.getElementById('stat-top-category').textContent = `${top.icon} ${top.name}`;
  } else {
    document.getElementById('stat-top-category').textContent = '—';
  }

  // Category donut chart
  const catCanvas = document.getElementById('chart-category');
  const catEmpty = document.getElementById('chart-category-empty');
  if (summary.byCategory.length === 0) {
    catEmpty.classList.remove('hidden');
    catCanvas.classList.add('hidden');
  } else {
    catEmpty.classList.add('hidden');
    catCanvas.classList.remove('hidden');
    drawDonutChart(catCanvas, summary.byCategory.map((c) => ({
      label: c.name, value: c.total, color: c.color
    })));
  }

  // Daily bar chart
  const dailyCanvas = document.getElementById('chart-daily');
  const dailyEmpty = document.getElementById('chart-daily-empty');
  if (summary.byDay.length === 0) {
    dailyEmpty.classList.remove('hidden');
    dailyCanvas.classList.add('hidden');
  } else {
    dailyEmpty.classList.add('hidden');
    dailyCanvas.classList.remove('hidden');
    const labels = summary.byDay.map((d) => d.date.slice(8, 10));
    const values = summary.byDay.map((d) => d.total);
    drawBarChart(dailyCanvas, labels, values);
  }

  // Trend line chart
  const trendCanvas = document.getElementById('chart-trend');
  const trendLabels = trend.map((t) => t.month.slice(2));
  const trendValues = trend.map((t) => t.total || 0);
  drawLineChart(trendCanvas, trendLabels, trendValues);
}

// =================================================================
// EXPENSES
// =================================================================
document.getElementById('add-expense-btn').addEventListener('click', () => openExpenseModal());
document.getElementById('expense-cancel').addEventListener('click', closeModals);

document.getElementById('filter-category').addEventListener('change', loadExpenses);
document.getElementById('filter-from').addEventListener('change', loadExpenses);
document.getElementById('filter-to').addEventListener('change', loadExpenses);
document.getElementById('filter-search').addEventListener('input', debounce(loadExpenses, 300));
document.getElementById('filter-clear').addEventListener('click', () => {
  document.getElementById('filter-category').value = '';
  document.getElementById('filter-from').value = '';
  document.getElementById('filter-to').value = '';
  document.getElementById('filter-search').value = '';
  loadExpenses();
});

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

async function loadExpenses() {
  const params = {
    category_id: document.getElementById('filter-category').value,
    from: document.getElementById('filter-from').value,
    to: document.getElementById('filter-to').value,
    search: document.getElementById('filter-search').value
  };

  const expenses = await api.getExpenses(params);
  const tbody = document.getElementById('expense-table-body');
  const emptyEl = document.getElementById('expense-empty');

  if (expenses.length === 0) {
    tbody.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  tbody.innerHTML = expenses.map((e) => `
    <tr>
      <td>${formatDate(e.date)}</td>
      <td>${e.category_name
        ? `<span class="cat-pill" style="background:${e.category_color}22; color:${e.category_color}">${e.category_icon} ${escapeHtml(e.category_name)}</span>`
        : '<span class="cat-pill" style="background:#2a2e3d; color:#9298a8">No category</span>'}</td>
      <td>${escapeHtml(e.note || '—')}</td>
      <td><strong>${formatCurrency(e.amount)}</strong></td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" onclick="openExpenseModal(${e.id})" title="Edit">✏️</button>
          <button class="icon-btn" onclick="handleDeleteExpense(${e.id})" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function openExpenseModal(id = null) {
  state.editingExpenseId = id;
  document.getElementById('expense-modal-title').textContent = id ? 'Edit Expense' : 'Add Expense';
  document.getElementById('expense-form').reset();
  document.getElementById('expense-date').value = todayStr();

  if (id) {
    api.getExpenses().then((all) => {
      const expense = all.find((e) => e.id === id);
      if (expense) {
        document.getElementById('expense-amount').value = expense.amount;
        document.getElementById('expense-category').value = expense.category_id || '';
        document.getElementById('expense-date').value = expense.date;
        document.getElementById('expense-note').value = expense.note || '';
      }
    });
  }

  openModal('modal-expense');
}

document.getElementById('expense-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    amount: document.getElementById('expense-amount').value,
    category_id: document.getElementById('expense-category').value || null,
    date: document.getElementById('expense-date').value,
    note: document.getElementById('expense-note').value
  };

  try {
    if (state.editingExpenseId) {
      await api.updateExpense(state.editingExpenseId, payload);
      showToast('Expense updated.');
    } else {
      await api.createExpense(payload);
      showToast('Expense added.');
    }
    closeModals();
    loadExpenses();
    if (state.currentView === 'dashboard') loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

async function handleDeleteExpense(id) {
  if (!confirm('Delete this expense? This cannot be undone.')) return;
  try {
    await api.deleteExpense(id);
    showToast('Expense deleted.');
    loadExpenses();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// =================================================================
// CATEGORIES
// =================================================================
document.getElementById('add-category-btn').addEventListener('click', () => openCategoryModal());
document.getElementById('category-cancel').addEventListener('click', closeModals);

async function loadCategories() {
  await refreshCategories();
  const grid = document.getElementById('category-grid');

  grid.innerHTML = state.categories.map((c) => `
    <div class="category-card" style="border-color:${c.color}55">
      <div class="cat-top">
        <span class="cat-icon">${c.icon}</span>
        <span class="cat-name">${escapeHtml(c.name)}</span>
      </div>
      <div class="cat-actions">
        <button class="icon-btn" onclick="openCategoryModal(${c.id})" title="Edit">✏️</button>
        <button class="icon-btn" onclick="handleDeleteCategory(${c.id})" title="Delete">🗑️</button>
      </div>
    </div>
  `).join('');
}

function openCategoryModal(id = null) {
  state.editingCategoryId = id;
  document.getElementById('category-modal-title').textContent = id ? 'Edit Category' : 'New Category';
  document.getElementById('category-form').reset();
  document.getElementById('category-color').value = '#6c5ce7';

  if (id) {
    const cat = getCategoryById(id);
    if (cat) {
      document.getElementById('category-name').value = cat.name;
      document.getElementById('category-icon').value = cat.icon;
      document.getElementById('category-color').value = cat.color;
    }
  }
  openModal('modal-category');
}

document.getElementById('category-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    name: document.getElementById('category-name').value.trim(),
    icon: document.getElementById('category-icon').value.trim() || '🏷️',
    color: document.getElementById('category-color').value
  };

  try {
    if (state.editingCategoryId) {
      await api.updateCategory(state.editingCategoryId, payload);
      showToast('Category updated.');
    } else {
      await api.createCategory(payload);
      showToast('Category created.');
    }
    closeModals();
    loadCategories();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

async function handleDeleteCategory(id) {
  if (!confirm('Delete this category? Expenses using it will become uncategorized.')) return;
  try {
    await api.deleteCategory(id);
    showToast('Category deleted.');
    loadCategories();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// =================================================================
// BUDGETS
// =================================================================
document.getElementById('add-budget-btn').addEventListener('click', () => {
  document.getElementById('budget-form').reset();
  document.getElementById('budget-form-month').value = document.getElementById('budget-month').value || currentMonthStr();
  openModal('modal-budget');
});
document.getElementById('budget-cancel').addEventListener('click', closeModals);
document.getElementById('budget-month').addEventListener('change', loadBudgets);

async function loadBudgets() {
  const month = document.getElementById('budget-month').value || currentMonthStr();
  const budgets = await api.getBudgets(month);
  const list = document.getElementById('budget-list');

  if (budgets.length === 0) {
    list.innerHTML = '<p style="color:var(--text-dim)">No budgets set for this month yet.</p>';
    return;
  }

  list.innerHTML = budgets.map((b) => {
    const pct = Math.min((b.spent / b.amount) * 100, 100);
    const isOver = b.spent > b.amount;
    const barColor = isOver ? 'var(--red)' : pct > 80 ? 'var(--yellow)' : 'var(--green)';

    return `
      <div class="budget-item">
        <div class="budget-top">
          <span class="budget-name">${b.category_icon} ${escapeHtml(b.category_name)}</span>
          <button class="icon-btn" onclick="handleDeleteBudget(${b.id})" title="Delete">🗑️</button>
        </div>
        <div class="budget-amounts ${isOver ? 'budget-over' : ''}">
          ${formatCurrency(b.spent)} of ${formatCurrency(b.amount)} spent
          ${isOver ? ' — over budget!' : ''}
        </div>
        <div class="budget-bar-bg">
          <div class="budget-bar-fill" style="width:${pct}%; background:${barColor}"></div>
        </div>
      </div>
    `;
  }).join('');
}

document.getElementById('budget-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    category_id: document.getElementById('budget-category').value,
    month: document.getElementById('budget-form-month').value,
    amount: document.getElementById('budget-amount').value
  };

  try {
    await api.createBudget(payload);
    showToast('Budget saved.');
    closeModals();
    loadBudgets();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

async function handleDeleteBudget(id) {
  if (!confirm('Delete this budget?')) return;
  try {
    await api.deleteBudget(id);
    showToast('Budget deleted.');
    loadBudgets();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// =================================================================
// MODAL HELPERS
// =================================================================
function openModal(modalId) {
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.querySelectorAll('.modal').forEach((m) => m.classList.add('hidden'));
  document.getElementById(modalId).classList.remove('hidden');
}

function closeModals() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.querySelectorAll('.modal').forEach((m) => m.classList.add('hidden'));
  state.editingExpenseId = null;
  state.editingCategoryId = null;
}

document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'modal-overlay') closeModals();
});

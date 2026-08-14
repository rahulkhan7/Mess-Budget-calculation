// ---------- API wrapper ----------
const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('ef_token');
}

function setToken(token) {
  localStorage.setItem('ef_token', token);
}

function clearToken() {
  localStorage.removeItem('ef_token');
  localStorage.removeItem('ef_user');
}

async function apiRequest(path, { method = 'GET', body = null, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong.');
    err.status = res.status;
    throw err;
  }

  return data;
}

const api = {
  signup: (payload) => apiRequest('/auth/signup', { method: 'POST', body: payload, auth: false }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload, auth: false }),

  getCategories: () => apiRequest('/categories'),
  createCategory: (payload) => apiRequest('/categories', { method: 'POST', body: payload }),
  updateCategory: (id, payload) => apiRequest(`/categories/${id}`, { method: 'PUT', body: payload }),
  deleteCategory: (id) => apiRequest(`/categories/${id}`, { method: 'DELETE' }),

  getExpenses: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
    return apiRequest(`/expenses${qs.toString() ? '?' + qs.toString() : ''}`);
  },
  createExpense: (payload) => apiRequest('/expenses', { method: 'POST', body: payload }),
  updateExpense: (id, payload) => apiRequest(`/expenses/${id}`, { method: 'PUT', body: payload }),
  deleteExpense: (id) => apiRequest(`/expenses/${id}`, { method: 'DELETE' }),
  getMonthlySummary: (month) => apiRequest(`/expenses/analytics/monthly-summary?month=${month}`),
  getTrend: (months = 6) => apiRequest(`/expenses/analytics/trend?months=${months}`),

  getBudgets: (month) => apiRequest(`/budgets?month=${month}`),
  createBudget: (payload) => apiRequest('/budgets', { method: 'POST', body: payload }),
  deleteBudget: (id) => apiRequest(`/budgets/${id}`, { method: 'DELETE' })
};

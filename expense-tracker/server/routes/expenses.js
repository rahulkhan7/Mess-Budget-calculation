const express = require('express');
const { db } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ---------- Get expenses (supports filters: category, from, to, search) ----------
router.get('/', (req, res) => {
  const { category_id, from, to, search } = req.query;

  let query = `
    SELECT e.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
    FROM expenses e
    LEFT JOIN categories c ON e.category_id = c.id
    WHERE e.user_id = ?
  `;
  const params = [req.userId];

  if (category_id) {
    query += ' AND e.category_id = ?';
    params.push(category_id);
  }
  if (from) {
    query += ' AND e.date >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND e.date <= ?';
    params.push(to);
  }
  if (search) {
    query += ' AND e.note LIKE ?';
    params.push(`%${search}%`);
  }

  query += ' ORDER BY e.date DESC, e.id DESC';

  const expenses = db.prepare(query).all(...params);
  res.json(expenses);
});

// ---------- Get single expense ----------
router.get('/:id', (req, res) => {
  const expense = db
    .prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!expense) return res.status(404).json({ error: 'Expense not found.' });
  res.json(expense);
});

// ---------- Create expense ----------
router.post('/', (req, res) => {
  const { amount, category_id, note, date } = req.body;

  if (amount === undefined || amount === null || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ error: 'A valid positive amount is required.' });
  }
  if (!date) {
    return res.status(400).json({ error: 'Date is required.' });
  }

  const insert = db.prepare(
    'INSERT INTO expenses (user_id, category_id, amount, note, date) VALUES (?, ?, ?, ?, ?)'
  );
  const result = insert.run(req.userId, category_id || null, Number(amount), note || '', date);

  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(expense);
});

// ---------- Update expense ----------
router.put('/:id', (req, res) => {
  const existing = db
    .prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Expense not found.' });

  const { amount, category_id, note, date } = req.body;

  db.prepare(
    'UPDATE expenses SET amount = ?, category_id = ?, note = ?, date = ? WHERE id = ?'
  ).run(
    amount !== undefined ? Number(amount) : existing.amount,
    category_id !== undefined ? category_id : existing.category_id,
    note !== undefined ? note : existing.note,
    date || existing.date,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// ---------- Delete expense ----------
router.delete('/:id', (req, res) => {
  const existing = db
    .prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Expense not found.' });

  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ---------- Analytics: summary for a given month (YYYY-MM) ----------
router.get('/analytics/monthly-summary', (req, res) => {
  const month = req.query.month; // e.g. "2026-06"
  if (!month) return res.status(400).json({ error: 'month query param (YYYY-MM) is required.' });

  const total = db
    .prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = ? AND date LIKE ?`)
    .get(req.userId, `${month}%`).total;

  const byCategory = db
    .prepare(`
      SELECT c.id AS category_id, c.name, c.color, c.icon, COALESCE(SUM(e.amount), 0) AS total
      FROM categories c
      LEFT JOIN expenses e ON e.category_id = c.id AND e.user_id = ? AND e.date LIKE ?
      WHERE c.user_id = ?
      GROUP BY c.id
      HAVING total > 0
      ORDER BY total DESC
    `)
    .all(req.userId, `${month}%`, req.userId);

  const byDay = db
    .prepare(`
      SELECT date, SUM(amount) AS total
      FROM expenses
      WHERE user_id = ? AND date LIKE ?
      GROUP BY date
      ORDER BY date ASC
    `)
    .all(req.userId, `${month}%`);

  res.json({ month, total, byCategory, byDay });
});

// ---------- Analytics: last N months trend ----------
router.get('/analytics/trend', (req, res) => {
  const months = parseInt(req.query.months) || 6;

  const rows = db
    .prepare(`
      SELECT strftime('%Y-%m', date) AS month, SUM(amount) AS total
      FROM expenses
      WHERE user_id = ?
      GROUP BY month
      ORDER BY month DESC
      LIMIT ?
    `)
    .all(req.userId, months);

  res.json(rows.reverse());
});

module.exports = router;

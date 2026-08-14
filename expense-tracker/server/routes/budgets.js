const express = require('express');
const { db } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ---------- Get budgets for a month, with amount spent so far ----------
router.get('/', (req, res) => {
  const month = req.query.month;
  if (!month) return res.status(400).json({ error: 'month query param (YYYY-MM) is required.' });

  const budgets = db
    .prepare(`
      SELECT b.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon,
        COALESCE((
          SELECT SUM(e.amount) FROM expenses e
          WHERE e.user_id = b.user_id AND e.category_id = b.category_id AND e.date LIKE ?
        ), 0) AS spent
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ? AND b.month = ?
      ORDER BY c.name
    `)
    .all(`${month}%`, req.userId, month);

  res.json(budgets);
});

// ---------- Create or update a budget (upsert by user+category+month) ----------
router.post('/', (req, res) => {
  const { category_id, month, amount } = req.body;

  if (!category_id || !month || amount === undefined || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ error: 'category_id, month, and a positive amount are required.' });
  }

  const existing = db
    .prepare('SELECT * FROM budgets WHERE user_id = ? AND category_id = ? AND month = ?')
    .get(req.userId, category_id, month);

  if (existing) {
    db.prepare('UPDATE budgets SET amount = ? WHERE id = ?').run(Number(amount), existing.id);
  } else {
    db.prepare(
      'INSERT INTO budgets (user_id, category_id, month, amount) VALUES (?, ?, ?, ?)'
    ).run(req.userId, category_id, month, Number(amount));
  }

  const budget = db
    .prepare('SELECT * FROM budgets WHERE user_id = ? AND category_id = ? AND month = ?')
    .get(req.userId, category_id, month);

  res.status(201).json(budget);
});

// ---------- Delete a budget ----------
router.delete('/:id', (req, res) => {
  const existing = db
    .prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Budget not found.' });

  db.prepare('DELETE FROM budgets WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;

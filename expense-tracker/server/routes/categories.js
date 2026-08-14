const express = require('express');
const { db } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ---------- Get all categories for the logged-in user ----------
router.get('/', (req, res) => {
  const categories = db
    .prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY name')
    .all(req.userId);
  res.json(categories);
});

// ---------- Create a new category ----------
router.post('/', (req, res) => {
  const { name, color, icon } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  try {
    const insert = db.prepare(
      'INSERT INTO categories (user_id, name, color, icon) VALUES (?, ?, ?, ?)'
    );
    const result = insert.run(
      req.userId,
      name.trim(),
      color || '#6c5ce7',
      icon || '💰'
    );
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(category);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'You already have a category with that name.' });
    }
    console.error('Create category error:', err);
    res.status(500).json({ error: 'Could not create category.' });
  }
});

// ---------- Update a category ----------
router.put('/:id', (req, res) => {
  const { name, color, icon } = req.body;
  const category = db
    .prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);

  if (!category) {
    return res.status(404).json({ error: 'Category not found.' });
  }

  db.prepare('UPDATE categories SET name = ?, color = ?, icon = ? WHERE id = ?').run(
    name || category.name,
    color || category.color,
    icon || category.icon,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// ---------- Delete a category ----------
router.delete('/:id', (req, res) => {
  const category = db
    .prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);

  if (!category) {
    return res.status(404).json({ error: 'Category not found.' });
  }

  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;

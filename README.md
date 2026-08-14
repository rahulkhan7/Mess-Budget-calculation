# ExpenseFlow — Daily Expense Tracker

A full-stack expense tracker with authentication, categories, budgets, and charts.

## Stack
- **Frontend:** Plain HTML/CSS/JavaScript (no frameworks, no build step)
- **Backend:** Node.js + Express
- **Database:** SQLite via Node's built-in `node:sqlite` module (no native compilation needed)
- **Auth:** JWT + bcrypt password hashing

## Requirements
- **Node.js 22.5.0 or higher** (required for the built-in `node:sqlite` module)

Check your version with `node --version`. If you're on an older version, either upgrade Node or swap the database layer to `better-sqlite3` (see "Using an older Node version" below).

## Setup

```bash
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

The first run automatically creates `server/db/expenses.db` and the necessary tables — no manual database setup required.

## Features

- **Auth** — sign up / log in with JWT-based sessions (7-day expiry)
- **Categories** — 8 default categories seeded per user, fully editable/deletable, custom icon + color
- **Expenses** — add/edit/delete, filter by category/date range/note search
- **Budgets** — set a monthly budget per category, see spend vs. budget with a progress bar
- **Dashboard** — total spent, top category, daily average, transaction count, plus:
  - Donut chart: spending by category
  - Bar chart: daily spending for the selected month
  - Line chart: 6-month spending trend

All charts are drawn with plain `<canvas>` — no chart library dependency.

## Project Structure

```
expense-tracker/
├── package.json
├── .env                  # JWT_SECRET and PORT — change JWT_SECRET before deploying
├── server/
│   ├── index.js           # Express app entry point
│   ├── db/
│   │   └── database.js    # Schema + default category seeding
│   ├── middleware/
│   │   └── auth.js         # JWT verification middleware
│   └── routes/
│       ├── auth.js         # /api/auth/signup, /api/auth/login
│       ├── categories.js   # /api/categories CRUD
│       ├── expenses.js     # /api/expenses CRUD + analytics endpoints
│       └── budgets.js      # /api/budgets CRUD
└── public/
    ├── index.html
    ├── css/style.css
    └── js/
        ├── api.js          # fetch wrapper for all API calls
        ├── charts.js       # canvas chart rendering (donut/bar/line)
        └── app.js          # all UI logic, event handlers, view switching
```

## API Overview

All routes except `/api/auth/*` require an `Authorization: Bearer <token>` header.

| Method | Path | Description |
|---|---|---|
| POST | /api/auth/signup | Create account, returns token |
| POST | /api/auth/login | Log in, returns token |
| GET/POST | /api/categories | List / create categories |
| PUT/DELETE | /api/categories/:id | Update / delete a category |
| GET/POST | /api/expenses | List (with filters) / create expenses |
| PUT/DELETE | /api/expenses/:id | Update / delete an expense |
| GET | /api/expenses/analytics/monthly-summary?month=YYYY-MM | Totals by category and by day |
| GET | /api/expenses/analytics/trend?months=6 | Spending trend over N months |
| GET/POST | /api/budgets?month=YYYY-MM | List (with spend) / set a budget |
| DELETE | /api/budgets/:id | Delete a budget |

## Using an older Node version

If you can't use Node 22.5+, swap `node:sqlite` for `better-sqlite3`:

```bash
npm install better-sqlite3
```

Then in `server/db/database.js`, replace:
```js
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(path.join(__dirname, 'expenses.db'));
```
with:
```js
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, 'expenses.db'));
```
The rest of the `.prepare()/.run()/.all()/.get()` API is identical between the two.

## Security notes before deploying

- Change `JWT_SECRET` in `.env` to a long random string
- This is a learning/portfolio project — for production use, add rate limiting on auth routes and HTTPS

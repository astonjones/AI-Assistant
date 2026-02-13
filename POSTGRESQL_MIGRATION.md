# PostgreSQL Migration Guide

This guide helps you migrate from SQLite (sql.js) to PostgreSQL for Railway deployment.

---

## Step 1: Install PostgreSQL Driver

```bash
npm install pg
```

---

## Step 2: Backup Current Database (Optional)

If you have important data in your SQLite database:

```bash
# Copy your database file
cp data/database.db data/database.backup.db
```

---

## Step 3: Switch to PostgreSQL Database Service

### Option A: Rename Files (Recommended)
```bash
# Backup current SQLite version
mv src/services/database.js src/services/database.sqlite.js

# Use PostgreSQL version
mv src/services/database.postgres.js src/services/database.js
```

### Option B: Manual Copy
Copy the contents of `database.postgres.js` into `database.js`

---

## Step 4: Test Locally (Optional)

If you want to test PostgreSQL locally before deploying:

### Install PostgreSQL locally:
- **Windows:** Download from https://www.postgresql.org/download/windows/
- **Mac:** `brew install postgresql`
- **Linux:** `sudo apt install postgresql`

### Create local database:
```bash
psql -U postgres
CREATE DATABASE ai_agent_dev;
\q
```

### Set DATABASE_URL in .env:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/ai_agent_dev
```

### Run your app:
```bash
npm start
```

---

## Step 5: Deploy to Railway

Railway will automatically provide `DATABASE_URL` when you add PostgreSQL service.

1. **Add PostgreSQL to Railway** (see RAILWAY_DEPLOYMENT.md Step 3)
2. **Deploy your app** - Railway will inject DATABASE_URL
3. **Database tables auto-create** on first connection

---

## Step 6: Verify Migration

After deploying to Railway:

1. **Check logs** for:
   ```
   ✅ PostgreSQL connected
   ✅ Database initialized and ready
   ```

2. **Make a test call** - should create records in PostgreSQL

3. **View data in Railway:**
   - Go to PostgreSQL service
   - Click "Data" tab
   - Browse `callers`, `conversations`, `messages` tables

---

## Differences Between SQLite and PostgreSQL Versions

| Feature | SQLite (sql.js) | PostgreSQL |
|---------|----------------|------------|
| Storage | In-memory + file | Server-based |
| Persistence | File-based (ephemeral on Railway) | Persistent database |
| Concurrent Access | Limited | High concurrency |
| Transactions | Yes | Yes |
| Data Types | Limited | Rich types |
| Auto-increment | rowid | SERIAL |
| Connection | File path | Connection string |

---

## Schema Comparison

### SQLite Schema (old):
```sql
CREATE TABLE callers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE,
  name TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### PostgreSQL Schema (new):
```sql
CREATE TABLE callers (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Changes:**
- `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`
- `TEXT` → `VARCHAR(n)` or `TEXT`
- `DATETIME` → `TIMESTAMP`
- `createdAt` → `created_at` (snake_case convention)

---

## Rollback Plan

If you need to rollback to SQLite:

```bash
# Restore SQLite version
mv src/services/database.sqlite.js src/services/database.js

# Uninstall pg (optional)
npm uninstall pg
```

---

## Performance Notes

PostgreSQL is **better for production** because:
- ✅ Persistent storage (survives container restarts)
- ✅ Better concurrent access
- ✅ ACID compliance
- ✅ Better for scaling
- ✅ Included free in Railway $5 plan

SQLite is only suitable for:
- ❌ Local development
- ❌ Single-user apps
- ❌ Temporary data

---

## Troubleshooting

### "DATABASE_URL is not defined"
- Make sure PostgreSQL service is added in Railway
- Check environment variables in Railway dashboard
- PostgreSQL service should be linked to your app

### "password authentication failed"
- Railway handles authentication automatically
- Don't manually set DATABASE_URL - let Railway inject it

### "relation does not exist"
- Tables are created automatically on first connect
- Check logs for schema creation errors
- Try restarting the service

### Data not persisting
- Make sure you're using PostgreSQL version, not SQLite
- Check `this.pool` is not null in database.js
- Verify `DATABASE_URL` environment variable exists

---

## Next Steps

1. ✅ Install `pg` package
2. ✅ Switch to PostgreSQL database.js
3. ✅ Deploy to Railway
4. ✅ Add PostgreSQL service in Railway
5. ✅ Verify database connection in logs
6. ✅ Test with a phone call

Questions? Check Railway logs or Railway's PostgreSQL documentation.

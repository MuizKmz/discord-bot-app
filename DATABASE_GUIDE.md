# Database Setup Guide for Railway

## Current Database Tables

Your bot uses **PostgreSQL** database with the following structure:

### 1. **Leaderboard Table**
Stores user scores from the word guessing game.

```sql
CREATE TABLE IF NOT EXISTS leaderboard (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  words TEXT[] DEFAULT '{}',
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**
- `user_id` - Discord user ID (unique identifier)
- `username` - Discord username
- `points` - Total points earned
- `words` - Array of words the user guessed correctly
- `last_updated` - Last time data was updated

---

### 2. **Word Meanings Table** (Optional - if using custom meanings)
Stores custom word definitions added by admins.

```sql
CREATE TABLE IF NOT EXISTS word_meanings (
  word TEXT PRIMARY KEY,
  meaning TEXT NOT NULL,
  added_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Adding Number Game Tracking (Optional Enhancement)

If you want to track number game statistics, you can add a new table:

### 3. **Number Game Stats Table**

```sql
CREATE TABLE IF NOT EXISTS number_game_stats (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  secret_number INTEGER NOT NULL,
  attempts INTEGER NOT NULL,
  won BOOLEAN DEFAULT false,
  played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**To add this in Railway:**
1. Go to Railway Dashboard
2. Click on your PostgreSQL database
3. Click "Query" tab
4. Paste the SQL above and execute

---

## Railway Setup Steps

### Step 1: Check Current Database
✅ Already set up! Your bot is using PostgreSQL with `DATABASE_URL` env variable.

### Step 2: View Database Connection
In Railway Dashboard:
1. Click your PostgreSQL service
2. Go to "Variables" tab
3. You'll see: `DATABASE_URL` (already connected to your bot)

### Step 3: Access Database Directly (Optional)
**Option A - Railway Dashboard:**
1. Click PostgreSQL service
2. Click "Query" tab
3. Run SQL queries directly

**Option B - External Tool (pgAdmin, DBeaver):**
Use the connection details from Railway:
- Host: Found in Railway
- Port: Usually 5432
- Database: Your database name
- User: From Railway
- Password: From Railway

---

## Current Data Safety Features

✅ **Auto-save** - Leaderboard saves after every game
✅ **Backup system** - JSON backups created automatically
✅ **Graceful shutdown** - Data saved when bot stops
✅ **Error recovery** - Data saved on errors

---

## Environment Variables Needed

Already configured in Railway `.env`:

```env
# Required
DISCORD_BOT_TOKEN=your_token_here
DATABASE_URL=postgresql://...  # Auto-set by Railway

# Optional
ADMIN_IDS=id1,id2,id3
ALLOWED_SERVERS=server_id
ALLOWED_CHANNELS=channel_id
```

---

## Data Migration Notes

**Your current setup:**
- ✅ 28 users already in database
- ✅ Leaderboard working perfectly
- ✅ No migration needed for number game (uses same points system)

**Number game will:**
- Use existing `addPoints()` function
- Award 5 points per win
- Track in same leaderboard table
- No separate database table needed (unless you want detailed stats)

---

## Monitoring Your Database

**Check database size:**
```sql
SELECT pg_size_pretty(pg_database_size('railway'));
```

**View all users:**
```sql
SELECT * FROM leaderboard ORDER BY points DESC;
```

**Check table info:**
```sql
\dt  -- List all tables
```

---

## Backup Strategy

**Current:**
- ✅ Railway automatically backs up PostgreSQL
- ✅ Bot creates JSON backups (for fallback)
- ✅ Git stores code (not data)

**Recommended:**
1. Railway handles database backups automatically
2. Keep the JSON backup system (already implemented)
3. Occasionally export data manually (optional):
   ```sql
   COPY leaderboard TO '/tmp/leaderboard_backup.csv' CSV HEADER;
   ```

---

## Adding to Railway (if needed)

**If you need a NEW database service:**
1. Railway Dashboard → "New" → "Database" → "PostgreSQL"
2. Railway auto-generates `DATABASE_URL`
3. Bot automatically detects and uses it
4. Tables create automatically on first run

**Current status:** ✅ Already set up! No action needed.

---

## Summary

**For Number Game:**
- ✅ No database changes required
- ✅ Uses existing leaderboard table
- ✅ Same points system
- ⚠️ Optional: Add `number_game_stats` table for detailed tracking

**All working automatically!** 🚀

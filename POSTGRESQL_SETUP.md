# 🐘 PostgreSQL Database Setup Guide

This guide will help you set up PostgreSQL on Railway to ensure your leaderboard data persists across all deployments.

---

## ✅ Step 1: Add PostgreSQL Plugin on Railway

1. **Go to Railway Dashboard**: https://railway.app/
2. **Open your project** (R2-D4 bot)
3. **Click "New Service"** → **"Database"** → **"Add PostgreSQL"**
4. Railway will automatically create a PostgreSQL database

---

## ✅ Step 2: Get Database Connection URL

1. Click on your **PostgreSQL service** in Railway
2. Go to **Variables** tab
3. You'll see `DATABASE_URL` - Railway automatically provides this
4. **Copy the DATABASE_URL value** (starts with `postgresql://...`)

---

## ✅ Step 3: Link Database to Your Bot

Railway automatically links the database to all services in the same project, so the `DATABASE_URL` environment variable will be available to your bot.

**Verify it:**
1. Go to your **bot service** (not the database)
2. Click **Variables** tab
3. You should see `DATABASE_URL` already listed (shared from PostgreSQL service)

If it's not there, manually add it:
- Variable Name: `DATABASE_URL`
- Value: (paste the PostgreSQL URL you copied)

---

## ✅ Step 4: Deploy Your Bot

1. **Commit and push your code:**
   ```bash
   git add .
   git commit -m "Add PostgreSQL support"
   git push
   ```

2. **Railway will automatically redeploy** with the new database!

---

## 🔄 How Migration Works

When your bot starts for the **first time** with PostgreSQL:

1. ✅ Creates the `leaderboard` table automatically
2. ✅ Checks if `leaderboard.json` exists
3. ✅ If found, **migrates all data** from JSON to PostgreSQL
4. ✅ Creates a backup of the JSON file (`.backup` extension)
5. ✅ Loads leaderboard from database

**After first run:**
- All data saves to PostgreSQL
- No more data loss on redeploys! 🎉
- Database survives all crashes and redeploys

---

## 📊 Database Schema

The `leaderboard` table structure:

```sql
CREATE TABLE leaderboard (
  user_id VARCHAR(255) PRIMARY KEY,     -- Discord User ID
  username VARCHAR(255) NOT NULL,        -- Discord Username
  points INTEGER DEFAULT 0,              -- Total Points
  words TEXT[] DEFAULT ARRAY[]::TEXT[],  -- Array of guessed words
  created_at TIMESTAMP DEFAULT NOW(),    -- When user first joined
  updated_at TIMESTAMP DEFAULT NOW()     -- Last activity time
);
```

---

## 🧪 Testing the Setup

After deployment, test with these commands:

1. **Check if database is working:**
   - Bot logs should show: `🔄 Using PostgreSQL database`
   - Should see: `✅ Database tables initialized`

2. **Play the game:**
   ```
   !teka
   !jawab [answer]
   ```

3. **Check leaderboard:**
   ```
   !skor
   ```

4. **Redeploy the bot** (to verify persistence):
   - Make any small change to code
   - Push to git
   - Wait for Railway to redeploy
   - Check `!skor` - your data should still be there! ✅

---

## 🛠️ Troubleshooting

### Bot shows "Using JSON file storage" instead of database
- ✅ Check that `DATABASE_URL` is set in Railway Variables
- ✅ Make sure PostgreSQL service is running (green light)
- ✅ Verify the connection string starts with `postgresql://`

### Bot crashes on startup with database error
- ✅ Wait 30 seconds and try again (database might be initializing)
- ✅ Check Railway logs for specific error message
- ✅ Bot will automatically fall back to JSON if database fails

### Migration didn't transfer my data
- ✅ Check if `leaderboard.json` was in the repository when deployed
- ✅ Look for backup file: `leaderboard.json.backup.[timestamp]`
- ✅ You can manually restore by running the migration again

---

## 🔄 Fallback Mode

If the database is unavailable, the bot **automatically falls back to JSON mode**:
- ⚠️ Displays: `Falling back to JSON file storage`
- Still works, but data won't persist on redeploys
- Fix the database issue and redeploy to enable persistence

---

## 🎯 Benefits of PostgreSQL

| Feature | JSON Files | PostgreSQL |
|---------|-----------|------------|
| Survives crashes | ✅ (with backups) | ✅ |
| Survives redeploys | ❌ | ✅ |
| Data persistence | ❌ | ✅ |
| Needs volume | ✅ | ❌ |
| Auto-recovery | ✅ | ✅ |
| Scalability | ❌ | ✅ |

---

## 📝 Commands Summary

**Local testing:**
```bash
# Set DATABASE_URL in your .env file
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
npm start
```

**Deployment:**
```bash
git add .
git commit -m "PostgreSQL migration"
git push
```

**Check bot logs on Railway:**
- Go to your bot service
- Click "Deployments" → Latest deployment
- Click "View Logs"

---

## 🎉 Done!

Once set up, you'll never lose leaderboard data again, even with thousands of redeploys! 🚀

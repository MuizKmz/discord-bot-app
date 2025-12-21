# ✅ Railway PostgreSQL Setup Checklist

Follow these steps **in order** to get your bot working with persistent storage:

---

## 📋 Step-by-Step Checklist

### ☐ 1. Push Code to GitHub
```bash
git push
```
**Wait for this to complete before proceeding!**

---

### ☐ 2. Add PostgreSQL on Railway

1. Go to: https://railway.app/dashboard
2. Click on your **R2-D4 project**
3. Click **"New"** button (top right)
4. Select **"Database"**
5. Choose **"Add PostgreSQL"**
6. Wait for it to deploy (takes ~30 seconds)

✅ You should see a new PostgreSQL service appear in your project!

---

### ☐ 3. Verify DATABASE_URL is Linked

1. Click on your **bot service** (not the database)
2. Go to **"Variables"** tab
3. **Check for `DATABASE_URL`** in the list

**If you see it:** ✅ Perfect! Railway auto-linked it.

**If you DON'T see it:**
1. Go to **PostgreSQL service** → **"Variables"** tab
2. Copy the `DATABASE_URL` value
3. Go back to **bot service** → **"Variables"** tab
4. Click **"New Variable"**
5. Name: `DATABASE_URL`
6. Value: (paste the PostgreSQL URL)
7. Click **"Add"**

---

### ☐ 4. Redeploy Your Bot

Railway should auto-redeploy after you pushed the code. If not:

1. Go to your **bot service**
2. Click **"Deployments"** tab
3. Click **"Deploy"** button
4. Select **"Redeploy"**

---

### ☐ 5. Check Logs

1. While deploying, click **"View Logs"**
2. Wait for deployment to complete
3. Look for these success messages:

```
✅ Bot logged in as R2-D4#1234
🔄 Using PostgreSQL database
✅ Database tables initialized
🔄 Found existing leaderboard.json, migrating to database...
✅ Migration completed successfully!
✅ Database connected and leaderboard loaded!
✅ Leaderboard loaded from database: 10 users
```

**If you see "Using JSON file storage":**
- DATABASE_URL is not set correctly
- Go back to Step 3

**If you see database error:**
- Wait 1 minute and check logs again (database might still be starting)
- PostgreSQL service might not be ready yet

---

### ☐ 6. Test in Discord

1. Go to your Discord server
2. Type: `!teka`
3. Play the game and earn points
4. Type: `!skor`
5. Check that your leaderboard shows all 10 users:
   - faizal08 (134 pts)
   - nuwaanemo (100 pts)
   - _caaaaa. (74 pts)
   - ... etc

✅ If you see the leaderboard → Migration successful!

---

### ☐ 7. Verify Persistence (Most Important!)

**This is the ultimate test:**

1. Make a small change to any file (add a comment)
   ```bash
   # In index.js, add a comment at the top
   git add .
   git commit -m "Test redeploy persistence"
   git push
   ```

2. Wait for Railway to redeploy (~1-2 minutes)

3. Check logs for:
   ```
   ✅ Leaderboard loaded from database: 10 users
   ```

4. Type `!skor` in Discord

**Expected result:** All 10 users with their points still there! ✅

**If data is lost:** Something is wrong with the setup. Check previous steps.

---

## 🎉 Success Criteria

You're done when:
- ✅ Bot shows "Using PostgreSQL database" in logs
- ✅ Migration message appears in logs
- ✅ `!skor` shows all 10 users
- ✅ **After redeploy, data is still there**

---

## 🛠️ Troubleshooting

### Problem: "Using JSON file storage"
**Solution:** DATABASE_URL not set. Go to Step 3.

### Problem: Database connection error
**Solution:** 
1. Check PostgreSQL service is running (green dot)
2. Wait 1 minute for database to initialize
3. Redeploy bot

### Problem: Migration didn't copy data
**Solution:**
1. Check if leaderboard.json is in your repository
2. Look for `leaderboard.json.backup.[timestamp]` file on Railway
3. If needed, manually add data via SQL

### Problem: Data lost after redeploy
**Solution:**
1. Verify `DATABASE_URL` is set
2. Check logs for "Using PostgreSQL database"
3. If it says "Using JSON file storage", database isn't connected

---

## 📞 Need Help?

If something doesn't work:
1. Copy the **full logs** from Railway
2. Copy the **error message** from Discord (if any)
3. Check `POSTGRESQL_SETUP.md` for detailed explanations

---

**Time to complete:** ~5 minutes
**Difficulty:** Easy ⭐

Good luck! 🚀

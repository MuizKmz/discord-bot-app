# 🛡️ Data Safety & Backup System

## What's Protected

Your bot now has **multiple layers of protection** to prevent data loss:

### 1. **Auto-Backup System** ✅
- Creates a timestamped backup every time data changes
- Stores in `backups/` folder
- Keeps last 20 backups automatically
- Format: `leaderboard_backup_YYYY-MM-DDTHH-MM-SS.json`

### 2. **Auto-Save** ✅
- Saves every 5 minutes automatically
- Saves after every game action (guess, complete word, etc.)
- Saves on errors
- Saves on shutdown

### 3. **Crash Protection** ✅
- Catches all errors to prevent crashes
- Emergency save on uncaught errors
- Graceful shutdown saves data properly
- Auto-recovery from latest backup if main file corrupts

### 4. **Error Handling** ✅
- Wrapped all game logic in try-catch
- Errors won't crash the bot
- Detailed error logging
- Data is saved before reporting errors

---

## How to Recover from Crash

If your bot crashes and leaderboard resets:

### Automatic Recovery
The bot will automatically try to load from the latest backup in `backups/` folder.

### Manual Recovery
1. Go to `backups/` folder
2. Find the most recent backup file: `leaderboard_backup_2025-12-21T...json`
3. Copy its content
4. Paste into `leaderboard.json`
5. Restart bot

---

## Backup Locations

```
Bot\R2-D4\
├── leaderboard.json          ← Main file (current data)
└── backups/                  ← Backup folder
    ├── leaderboard_backup_2025-12-21T05-13-19.json
    ├── leaderboard_backup_2025-12-21T05-15-42.json
    └── ... (keeps last 20 backups)
```

---

## Migrating to Database (Future)

When you're ready to use a database (MongoDB, PostgreSQL, MySQL), the code is structured for easy migration:

### Current Structure
```javascript
// Load from file
function loadLeaderboard() { ... }

// Save to file
function saveLeaderboard() { ... }

// Data structure
leaderboard = {
  "userId": {
    username: "...",
    points: 100,
    words: [...]
  }
}
```

### What to Change
Just replace these 2 functions with database queries:

```javascript
// Example with MongoDB
async function loadLeaderboard() {
  leaderboard = await db.collection('leaderboard').findOne({ _id: 'main' });
}

async function saveLeaderboard() {
  await db.collection('leaderboard').updateOne(
    { _id: 'main' }, 
    { $set: leaderboard }, 
    { upsert: true }
  );
}
```

The rest of your code stays the same! No changes needed to game logic.

---

## Tips for Safety

1. **Keep backups folder safe** - Don't delete it
2. **Check logs** - Look for `✅ Auto-save completed` messages
3. **Restart cleanly** - Use Ctrl+C, not force kill
4. **Monitor disk space** - Backups use minimal space but check occasionally
5. **Test recovery** - Try manually restoring from backup once to know how

---

## Monitoring

When bot starts, you'll see:
```
✅ Leaderboard loaded: 10 users
```

Every 5 minutes:
```
✅ Auto-save completed
```

On shutdown (Ctrl+C):
```
⚠️ Shutting down gracefully...
✅ Leaderboard saved!
```

On error:
```
❌ Error handling message: [error details]
✅ Emergency save completed!
```

---

## Questions?

- **Q: Where are backups?**  
  A: In `backups/` folder next to `index.js`

- **Q: How many backups kept?**  
  A: Last 20 backups automatically

- **Q: Can I disable auto-save?**  
  A: Yes, comment out the `setInterval` in `clientReady` event

- **Q: Will this slow down the bot?**  
  A: No, file operations are fast and async

- **Q: Can I backup to cloud?**  
  A: Yes! Copy `backups/` to Google Drive, Dropbox, etc.

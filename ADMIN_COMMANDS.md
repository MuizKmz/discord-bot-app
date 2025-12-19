# 🛠️ Admin Commands Guide

## Setup

1. **Get Your Discord User ID:**
   - Enable Developer Mode: Discord Settings > Advanced > Developer Mode (ON)
   - Right-click your name in Discord > Copy User ID
   - Add to `.env`: `ADMIN_IDS=your_user_id_here`

2. **Add to Railway:**
   - Go to Railway > Variables tab
   - Add variable: `ADMIN_IDS` with your User ID

---

## 📋 Available Commands

### **View Words**
```
!listwords  or  !lihat
```
Shows all words in a beautiful table format with separate sections for normal and exclusive words.

---

### **Add New Word**

**Add Normal Word:**
```
!addword kucing
```

**Add Exclusive Word:**
```
!addword istimewa exclusive
```
Exclusive words show a special diamond emoji when completed.

---

### **Edit Word**
```
!editword lama baru
```
Example: `!editword kucing kucing`

---

### **Delete Word**
```
!deleteword kucing
```
Removes the word from the list.

---

### **Search Word**
```
!searchword kata
```
Finds all words containing the search term.
Example: `!searchword mah` (finds: maharaja, mahkota, etc.)

---

### **Statistics**
```
!wordstats  or  !stats
```
Shows:
- Total word count
- Normal vs Exclusive word breakdown
- Game status
- Completed words count

---

### **Help**
```
!adminhelp  or  !bantuan
```
Shows all admin commands in Discord.

---

## 🎨 Features

✅ **Beautiful Table Display** - Words shown in organized columns
✅ **Color-Coded** - Different emojis for normal vs exclusive words
✅ **Search Function** - Quickly find words
✅ **Real-time Updates** - Changes apply immediately
✅ **Admin-Only** - Regular users can't access these commands
✅ **Statistics** - Track word counts and game status

---

## ⚠️ Important Notes

- Changes are **in-memory only** - they reset when bot restarts
- Only users with IDs in `ADMIN_IDS` can use these commands
- Multiple admins supported - separate IDs with commas: `ADMIN_IDS=123,456,789`
- Words are case-insensitive

---

## 🔒 Security

- All admin commands check user permissions
- Non-admin users get error message if they try to use admin commands
- Your User ID is required - cannot be bypassed

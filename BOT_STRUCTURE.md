# Bot Structure Documentation

## Current Project Structure

```
R2-D4/
├── index.js              # Main bot file - runs the bot and handles all commands
├── database.js           # PostgreSQL database module
├── games/                # Game modules folder
│   ├── bot-teka-huruf.js # Word guessing game logic (extracted)
│   └── bot-teka-no.js    # Number guessing game (placeholder - not implemented yet)
├── package.json
└── other files...
```

## How It Works

### Main Bot (index.js)
- **Runs the Discord bot** - connects to Discord and handles all messages
- **Contains all active game logic** - currently runs the word guessing game inline
- **Imports game modules** - references `games/bot-teka-huruf.js` and `games/bot-teka-no.js`
- **Handles commands**: !teka, !skor, !leaderboard, !makna, admin commands, etc.

### Game Modules (games/ folder)

#### bot-teka-huruf.js
- Contains **extracted word guessing game logic**
- Includes:
  - Word lists (ORIGINAL_WORDS, EXCLUSIVE_WORDS)
  - Word meanings dictionary (WORD_MEANINGS)
  - Helper functions (formatWordWithBackticks, renderBoard, etc.)
  - Game state management
- **Ready for future use** when fully migrating to modular structure

#### bot-teka-no.js  
- **Placeholder** for number guessing game
- **No implementation yet** - ready for you to add code
- Will handle commands like `!teka-no` when implemented

## Current Status

✅ **Working**: Bot runs normally from index.js (same as before)
✅ **Organized**: Game code is separated into `games/` folder
✅ **Ready**: Structure is prepared for adding new games

## How To Add New Game Commands

### Option 1: Add to index.js (Quick & Simple)
1. Add new command handler in the `client.on("messageCreate")` section
2. Use `if (content === "!your-command")` pattern
3. Implement game logic directly in index.js

### Option 2: Use Game Modules (Organized)
1. Write your game logic in `games/bot-your-game.js`
2. Export functions from your game module
3. Import in index.js: `const yourGame = require('./games/bot-your-game')`
4. Call the functions from your module in message handlers

## Example: Adding Number Guessing Game

1. **Edit games/bot-teka-no.js** - Add your game logic there
2. **Edit index.js** - Add command handler:
```javascript
// In client.on("messageCreate") handler
if (content === "!teka-no") {
  const result = gameTekaNo.startGame();
  message.channel.send(result);
  return;
}
```

## Benefits of This Structure

- ✅ **Same bot** - One bot token, one bot instance
- ✅ **Better organization** - Game logic separated from main bot code  
- ✅ **Easy to maintain** - Each game in its own file
- ✅ **Scalable** - Can add unlimited games without cluttering index.js
- ✅ **No performance impact** - Still one bot handling everything efficiently

## Questions?

- **Will this slow down my bot?** No! Same bot, just better organized
- **Do I need multiple bot tokens?** No! One token, one bot, multiple commands
- **Can I add more commands?** Yes! Add as many as you want in games/ folder or index.js
- **Is the current game still working?** Yes! Nothing changed in functionality

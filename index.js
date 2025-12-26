// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./database'); // PostgreSQL database module

// ===== IMPORT GAME MODULES =====
const gameTekaHuruf = require('./games/bot-teka-huruf');
const gameTekaNo = require('./games/bot-teka-no');

// Use database if DATABASE_URL is set, otherwise use JSON files
const USE_DATABASE = !!process.env.DATABASE_URL;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ===== LEADERBOARD SYSTEM =====
// NOTE: This uses JSON file storage for simplicity.
// To migrate to a database (MongoDB, PostgreSQL, etc.), replace these functions:
// - loadLeaderboard() -> fetch from database
// - saveLeaderboard() -> save to database
// - Keep the same leaderboard object structure for easy migration

// Use Railway volume if available, otherwise use current directory
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
let leaderboard = {};

// Create backup directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Load leaderboard from file or database
async function loadLeaderboard() {
  if (USE_DATABASE) {
    // Load from PostgreSQL
    leaderboard = await db.loadLeaderboardFromDB();
    console.log(`✅ Leaderboard loaded from database: ${Object.keys(leaderboard).length} users`);
  } else {
    // Load from JSON file
    try {
      if (fs.existsSync(LEADERBOARD_FILE)) {
        const data = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
        leaderboard = JSON.parse(data);
        console.log(`✅ Leaderboard loaded from file: ${Object.keys(leaderboard).length} users`);
      } else {
        console.log('⚠️ No leaderboard file found, starting fresh');
      }
    } catch (error) {
      console.error('❌ Error loading leaderboard:', error);
      // Try to load from latest backup
      tryLoadFromBackup();
    }
  }
}

// Try to load from latest backup
function tryLoadFromBackup() {
  try {
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('leaderboard_backup_'))
      .sort()
      .reverse();
    
    if (backups.length > 0) {
      const latestBackup = path.join(BACKUP_DIR, backups[0]);
      const data = fs.readFileSync(latestBackup, 'utf8');
      leaderboard = JSON.parse(data);
      console.log(`✅ Recovered from backup: ${backups[0]}`);
      // Save to main file
      fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
    } else {
      leaderboard = {};
      console.log('⚠️ No backups found, starting fresh');
    }
  } catch (error) {
    console.error('❌ Error loading backup:', error);
    leaderboard = {};
  }
}

// Save leaderboard to file or database with backup
async function saveLeaderboard() {
  if (USE_DATABASE) {
    // Save to PostgreSQL
    try {
      await db.saveLeaderboardToDB(leaderboard);
    } catch (error) {
      console.error('❌ Error saving leaderboard to database:', error);
    }
  } else {
    // Save to JSON file
    try {
      // Save main file
      fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
      
      // Create timestamped backup every save (auto-cleanup old backups)
      createBackup();
    } catch (error) {
      console.error('❌ Error saving leaderboard:', error);
    }
  }
}

// Create backup with timestamp
function createBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `leaderboard_backup_${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(leaderboard, null, 2));
    
    // Keep only last 20 backups
    cleanOldBackups(20);
  } catch (error) {
    console.error('❌ Error creating backup:', error);
  }
}

// Clean old backups, keep only the latest N
function cleanOldBackups(keepCount = 20) {
  try {
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('leaderboard_backup_'))
      .sort()
      .reverse();
    
    // Delete old backups
    backups.slice(keepCount).forEach(file => {
      fs.unlinkSync(path.join(BACKUP_DIR, file));
    });
  } catch (error) {
    console.error('❌ Error cleaning backups:', error);
  }
}

// Add points to user with game type
async function addPoints(userId, username, points, word, gameType = 'huruf') {
  if (USE_DATABASE) {
    // Update database directly with game type
    await db.updateUserPoints(userId, username, points, word, gameType);
    // Also update in-memory copy for immediate access
    if (!leaderboard[userId]) {
      leaderboard[userId] = {
        username: username,
        points: 0,
        points_huruf: 0,
        points_no: 0,
        words: []
      };
    }
    leaderboard[userId].points += points;
    leaderboard[userId].username = username;
    
    // Update specific game points
    if (gameType === 'huruf') {
      leaderboard[userId].points_huruf = (leaderboard[userId].points_huruf || 0) + points;
    } else if (gameType === 'no') {
      leaderboard[userId].points_no = (leaderboard[userId].points_no || 0) + points;
    }
    
    if (word) {
      leaderboard[userId].words.push(word);
    }
  } else {
    // Update JSON file
    if (!leaderboard[userId]) {
      leaderboard[userId] = {
        username: username,
        points: 0,
        points_huruf: 0,
        points_no: 0,
        words: []
      };
    }
    leaderboard[userId].points += points;
    leaderboard[userId].username = username;
    
    // Update specific game points
    if (gameType === 'huruf') {
      leaderboard[userId].points_huruf = (leaderboard[userId].points_huruf || 0) + points;
    } else if (gameType === 'no') {
      leaderboard[userId].points_no = (leaderboard[userId].points_no || 0) + points;
    }
    
    if (word) {
      leaderboard[userId].words.push(word);
    }
    await saveLeaderboard();
  }
}

// Get top players
function getTopPlayers(limit = 10) {
  return Object.entries(leaderboard)
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}

// Reset leaderboard
function resetLeaderboard() {
  leaderboard = {};
  saveLeaderboard();
}

// ===== ALLOWED SERVERS & CHANNELS =====
// Read from .env file - comma-separated IDs
const ALLOWED_SERVERS = process.env.ALLOWED_SERVERS 
  ? process.env.ALLOWED_SERVERS.split(',').map(id => id.trim()).filter(id => id.length > 0)
  : [];

const ALLOWED_CHANNELS = process.env.ALLOWED_CHANNELS 
  ? process.env.ALLOWED_CHANNELS.split(',').map(id => id.trim()).filter(id => id.length > 0)
  : [];

// ===== ADMIN IDS =====
// Add your Discord User ID here for admin commands
const ADMIN_IDS = process.env.ADMIN_IDS 
  ? process.env.ADMIN_IDS.split(',').map(id => id.trim()).filter(id => id.length > 0)
  : [];

// ===== HELPER: Check if user is admin =====
function isAdmin(userId) {
  console.log('🔍 Admin Check:');
  console.log('  User ID:', userId);
  console.log('  Admin IDs:', ADMIN_IDS);
  console.log('  Is Admin:', ADMIN_IDS.includes(userId));
  return ADMIN_IDS.includes(userId);
}

// ===== GAME: Teka Huruf (Word Guessing) =====
// NOTE: Game logic is also available in ./games/bot-teka-huruf.js for modular organization
// Currently using inline implementation below for backward compatibility
// To fully migrate: Update all game state references to use gameTekaHuruf module functions

// Import game data from module (can be used for reference)
const { ORIGINAL_WORDS, EXCLUSIVE_WORDS, WORD_MEANINGS } = gameTekaHuruf;

// Current inline game state (TODO: Migrate to use gameTekaHuruf.getGameState/setGameState)
let WORDS = [];
let currentWordIndex = 0;
let currentWord = "";
let guessedLetters = new Set();
let chancesLeft = 999999;
let totalChances = 999999;
let active = false;
let completedWords = [];
let userCooldowns = new Map();
let usedExclusiveWords = [];
let usedNormalWords = [];

// Helper functions (using module versions)
const { 
  shuffleArray, 
  formatWordWithBackticks, 
  formatCompletedWord, 
  formatUpcomingWord,
  getWordMeaning: getWordMeaningFromModule,
  renderBoard: renderBoardFromModule,
  sendLongMessage,
  formatWordList
} = gameTekaHuruf;

// Wrapper functions for current implementation
async function getWordMeaning(word) {
  return await getWordMeaningFromModule(word, db, USE_DATABASE);
}

function renderBoard(showHeader = false, isNextWord = false) {
  // Use module's renderBoard with current inline state
  // For now, duplicate the logic here. TODO: Refactor to use module's state
  let output = "";
  const decorativeLine = "<a:SAC_zzaline:878680793386483712>".repeat(12);
  
  let currentWordSolved = true;
  for (let c of currentWord) {
    if (!guessedLetters.has(c)) {
      currentWordSolved = false;
      break;
    }
  }
  
  output += `${decorativeLine}\n\n`;
  
  if (showHeader) {
    output += `**Game Teka Perkataan**\n\n`;
  }
  
  if (isNextWord) {
    output += `## Perkataan Seterusnya\n\n`;
    output += `-# *Arahan - Taip huruf atau perkataan untuk diteka*\n\n`;
  } else {
    output += `-# *Arahan - Taip huruf atau perkataan untuk diteka*\n\n`;
  }
  
  let diamondEmoji = "";
  if (currentWordSolved) {
    const isExclusive = EXCLUSIVE_WORDS.includes(currentWord.toLowerCase().trim());
    diamondEmoji = isExclusive
      ? ` <a:SAC_diamond1:893046074888040499>` 
      : ` <a:SAC_diamond2:893045927009472542>`;
  }
  output += `Perkataan: ${formatWordWithBackticks(currentWord, guessedLetters)}${diamondEmoji}\n\n`;
  output += `${decorativeLine}`;

  return output;
}

// ===== GAME MESSAGE HANDLER =====

client.on("messageCreate", async (message) => {
  // Wrap everything in try-catch to prevent crashes
  try {
    if (message.author.bot) return;

    // Semak jika sekatan pelayan diaktifkan dan jika mesej dari pelayan yang dibenarkan
    if (ALLOWED_SERVERS.length > 0 && !ALLOWED_SERVERS.includes(message.guild?.id)) {
      return; // Abaikan mesej dari pelayan tidak dibenarkan
    }

    // Semak jika sekatan saluran diaktifkan dan jika mesej dari saluran yang dibenarkan
    if (ALLOWED_CHANNELS.length > 0 && !ALLOWED_CHANNELS.includes(message.channel.id)) {
      return; // Abaikan mesej dari saluran tidak dibenarkan
    }

    const content = message.content.toLowerCase();

  // Tips command - Show all available commands (Admin only)
  if (content === "!tips" || content === "!help" || content === "!commands") {
    if (!isAdmin(message.author.id)) {
      message.reply("❌ Arahan ini hanya untuk admin!");
      return;
    }
    
    const decorativeLine = "<a:SAC_zzaline:878680793386483712>".repeat(12);
    const isUserAdmin = true; // Already verified admin above
    
    let tipsText = `${decorativeLine}\n\n`;
    tipsText += `## 📚 Panduan Arahan Bot\n\n`;
    
    // Game Commands
    tipsText += `### 🎮 Arahan Permainan\n\n`;
    tipsText += `\`!teka\` - Mula permainan teka perkataan baharu\n`;
    tipsText += `-# Taip huruf atau perkataan penuh untuk meneka\n\n`;
    
    tipsText += `\`!teka-no\` - Mula permainan teka nombor\n`;
    tipsText += `-# Taip nombor untuk meneka jawapan\n\n`;
    
    tipsText += `\`!skor\` atau \`!leaderboard\` - Papar papan skor teratas\n`;
    tipsText += `-# Lihat 10 pemain teratas (gabungan kedua-dua game)\n\n`;
    
    tipsText += `\`!skor-huruf\` - Papan skor Teka Huruf sahaja\n`;
    tipsText += `-# Top 10 pemain game teka perkataan\n\n`;
    
    tipsText += `\`!skor-no\` - Papan skor Teka Nombor sahaja\n`;
    tipsText += `-# Top 10 pemain game teka nombor\n\n`;
    
    tipsText += `\`!skorall\` atau \`!leaderboardall\` - Papar semua pemain\n`;
    tipsText += `-# Dengan navigasi halaman untuk semua pemain\n\n`;
    
    tipsText += `\`!makna <perkataan>\` - Lihat makna perkataan\n`;
    tipsText += `-# Contoh: \`!makna istana\`\n\n`;
    
    tipsText += `\`!resetteka\` atau \`!henti\` - Hentikan permainan semasa\n`;
    tipsText += `-# Papan skor akan direset\n\n`;
    
    // Admin Commands (only show if user is admin)
    if (isUserAdmin) {
      tipsText += `### 🔐 Arahan Admin\n\n`;
      
      tipsText += `**Pengurusan Perkataan:**\n`;
      tipsText += `\`!listwords\` atau \`!lihat\` - Papar semua perkataan\n`;
      tipsText += `\`!addword <perkataan>\` - Tambah perkataan baharu\n`;
      tipsText += `\`!addword <perkataan> exclusive\` - Tambah perkataan eksklusif\n`;
      tipsText += `\`!editword <lama> <baru>\` - Tukar perkataan\n`;
      tipsText += `\`!deleteword <perkataan>\` - Padam perkataan\n`;
      tipsText += `\`!searchword <kata>\` - Cari perkataan\n`;
      tipsText += `\`!wordstats\` - Papar statistik perkataan\n\n`;
      
      tipsText += `\`!adminhelp\` - Panduan penuh arahan admin\n\n`;
    }
    
    // How to Play
    tipsText += `### 💡 Cara Bermain\n\n`;
    tipsText += `1️⃣ Taip \`!teka\` untuk mula\n`;
    tipsText += `2️⃣ Teka huruf dengan taip huruf (contoh: \`a\`)\n`;
    tipsText += `3️⃣ Atau teka perkataan penuh (contoh: \`istana\`)\n`;
    tipsText += `4️⃣ **Teka tanpa had!** Semua pemain boleh teka bersama\n`;
    tipsText += `5️⃣ Selesaikan **${ORIGINAL_WORDS.length + EXCLUSIVE_WORDS.length} perkataan** tradisional Melayu!\n\n`;
    
    tipsText += `${decorativeLine}`;
    
    await sendLongMessage(message.channel, tipsText);
    return;
  }

  // Arahan reset/henti permainan (Admin only)
  if (content === "!resetteka" || content === "!henti") {
    if (!isAdmin(message.author.id)) {
      message.reply("❌ Arahan ini hanya untuk admin!");
      return;
    }
    
    if (!active) {
      return;
    }
    active = false;
    resetLeaderboard(); // Reset papan skor
    return;
  }

  // Arahan papan skor
  if (content === "!skor" || content === "!leaderboard") {
    const topPlayers = getTopPlayers(10);
    
    if (topPlayers.length === 0) {
      message.channel.send("Tiada data papan skor lagi. Mula bermain untuk mendapat mata!");
      return;
    }
    
    const decorativeLine = "<a:SAC_zzaline:878680793386483712>".repeat(12);
    let leaderboardText = `${decorativeLine}\n\n## <a:BlueStar_SAC:886125020286451752> Papan Skor Teratas\n\n`;
    
    topPlayers.forEach((player, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      leaderboardText += `${medal} **${player.username}** - **${player.points}** mata\n`;
      leaderboardText += `   ├─ 🔤 Huruf: ${player.points_huruf || 0} mata\n`;
      leaderboardText += `   └─ 🔢 Nombor: ${player.points_no || 0} mata\n\n`;
    });
    
    leaderboardText += `${decorativeLine}`;
    
    message.channel.send(leaderboardText);
    return;
  }

  // Papan skor Huruf sahaja
  if (content === "!skor-huruf" || content === "!leaderboard-huruf") {
    const allPlayers = getTopPlayers(1000);
    const sortedByHuruf = allPlayers
      .filter(p => (p.points_huruf || 0) > 0)
      .sort((a, b) => (b.points_huruf || 0) - (a.points_huruf || 0))
      .slice(0, 10);
    
    if (sortedByHuruf.length === 0) {
      message.channel.send("Tiada data papan skor untuk permainan Teka Huruf lagi!");
      return;
    }
    
    const decorativeLine = "<a:SAC_zzaline:878680793386483712>".repeat(12);
    const diamond = '<a:SAC_diamond2:893045927009472542>';
    let leaderboardText = `${decorativeLine}\n\n## ${diamond} Papan Skor Teka Huruf\n\n`;
    
    sortedByHuruf.forEach((player, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      leaderboardText += `${medal} **${player.username}** - **${player.points_huruf || 0}** mata\n\n`;
    });
    
    leaderboardText += `${decorativeLine}`;
    
    message.channel.send(leaderboardText);
    return;
  }

  // Papan skor Nombor sahaja
  if (content === "!skor-no" || content === "!leaderboard-no") {
    const allPlayers = getTopPlayers(1000);
    const sortedByNo = allPlayers
      .filter(p => (p.points_no || 0) > 0)
      .sort((a, b) => (b.points_no || 0) - (a.points_no || 0))
      .slice(0, 10);
    
    if (sortedByNo.length === 0) {
      message.channel.send("Tiada data papan skor untuk permainan Teka Nombor lagi!");
      return;
    }
    
    const decorativeLine = "<a:SAC_zzaline:878680793386483712>".repeat(12);
    const diamond = '<a:SAC_diamond1:893046074888040499>';
    let leaderboardText = `${decorativeLine}\n\n## ${diamond} Papan Skor Teka Nombor\n\n`;
    
    sortedByNo.forEach((player, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      leaderboardText += `${medal} **${player.username}** - **${player.points_no || 0}** mata\n\n`;
    });
    
    leaderboardText += `${decorativeLine}`;
    
    message.channel.send(leaderboardText);
    return;
  }

  // Arahan papan skor lengkap dengan pagination
  if (content === "!skorall" || content === "!leaderboardall") {
    const allPlayers = getTopPlayers(1000); // Get all players
    
    if (allPlayers.length === 0) {
      message.channel.send("Tiada data papan skor lagi. Mula bermain untuk mendapat mata!");
      return;
    }
    
    const decorativeLine = "<a:SAC_zzaline:878680793386483712>".repeat(12);
    const playersPerPage = 10;
    const totalPages = Math.ceil(allPlayers.length / playersPerPage);
    
    let currentPage = 0;
    
    // Function to generate page content
    const generatePage = (pageIndex) => {
      const startIdx = pageIndex * playersPerPage;
      const endIdx = Math.min(startIdx + playersPerPage, allPlayers.length);
      const pagePlayers = allPlayers.slice(startIdx, endIdx);
      
      let pageContent = `${decorativeLine}\n\n`;
      pageContent += `## <a:BlueStar_SAC:886125020286451752> Papan Skor Lengkap`;
      
      if (totalPages > 1) {
        pageContent += ` - 📄 Halaman ${pageIndex + 1}/${totalPages}`;
      }
      
      pageContent += `\n\n-# Total Pemain: **${allPlayers.length}** | Paparan: ${startIdx + 1}-${endIdx}\n\n`;
      
      pagePlayers.forEach((player, index) => {
        const actualRank = startIdx + index + 1;
        const medal = actualRank === 1 ? '🥇' : actualRank === 2 ? '🥈' : actualRank === 3 ? '🥉' : `${actualRank}.`;
        pageContent += `${medal} **${player.username}** - **${player.points}** mata\n\n`;
      });
      
      pageContent += `${decorativeLine}`;
      return pageContent;
    };
    
    // Create navigation buttons if needed
    if (totalPages > 1) {
      const createButtons = (pageIndex) => {
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('prev_skor')
              .setLabel('◀️ Sebelum')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(pageIndex === 0),
            new ButtonBuilder()
              .setCustomId('next_skor')
              .setLabel('Seterus ▶️')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(pageIndex === totalPages - 1),
            new ButtonBuilder()
              .setCustomId('close_skor')
              .setLabel('❌ Tutup')
              .setStyle(ButtonStyle.Danger)
          );
        return row;
      };
      
      // Send initial page with buttons
      const sentMessage = await message.channel.send({
        content: generatePage(currentPage),
        components: [createButtons(currentPage)]
      });
      
      // Create button collector
      const collector = sentMessage.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id,
        time: 300000 // 5 minutes
      });
      
      collector.on('collect', async interaction => {
        if (interaction.customId === 'prev_skor' && currentPage > 0) {
          currentPage--;
        } else if (interaction.customId === 'next_skor' && currentPage < totalPages - 1) {
          currentPage++;
        } else if (interaction.customId === 'close_skor') {
          await interaction.update({
            content: generatePage(currentPage),
            components: [] // Remove buttons
          });
          collector.stop();
          return;
        }
        
        await interaction.update({
          content: generatePage(currentPage),
          components: [createButtons(currentPage)]
        });
      });
      
      collector.on('end', async () => {
        try {
          await sentMessage.edit({
            components: [] // Remove buttons after timeout
          });
        } catch (error) {
          // Message might be deleted, ignore error
        }
      });
    } else {
      // Single page, no buttons needed
      message.channel.send(generatePage(0));
    }
    
    return;
  }

  // ===== ADMIN COMMANDS =====
  
  // List all words
  if (content === "!listwords" || content === "!lihat") {
    console.log('📋 !listwords command triggered');
    console.log('  Message author ID:', message.author.id);
    
    if (!isAdmin(message.author.id)) {
      console.log('  ❌ User is not admin');
      message.reply("❌ Arahan ini hanya untuk admin!");
      return;
    }
    
    console.log('  ✅ User is admin - showing words');
    const normalPages = formatWordList(ORIGINAL_WORDS, "Perkataan Biasa", false);
    const exclusivePages = formatWordList(EXCLUSIVE_WORDS, "Perkataan Eksklusif", true);
    const allPages = [...normalPages, ...exclusivePages];
    
    let currentPage = 0;
    
    // Create navigation buttons
    const createButtons = (pageIndex) => {
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('prev')
            .setLabel('◀️ Sebelum')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(pageIndex === 0),
          new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Seterus ▶️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(pageIndex === allPages.length - 1),
          new ButtonBuilder()
            .setCustomId('close')
            .setLabel('❌ Tutup')
            .setStyle(ButtonStyle.Danger)
        );
      return row;
    };
    
    // Send initial page with buttons
    const sentMessage = await message.channel.send({
      content: allPages[currentPage],
      components: [createButtons(currentPage)]
    });
    
    // Create button collector
    const collector = sentMessage.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 300000 // 5 minutes
    });
    
    collector.on('collect', async interaction => {
      if (interaction.customId === 'prev' && currentPage > 0) {
        currentPage--;
      } else if (interaction.customId === 'next' && currentPage < allPages.length - 1) {
        currentPage++;
      } else if (interaction.customId === 'close') {
        await interaction.update({
          content: allPages[currentPage],
          components: [] // Remove buttons
        });
        collector.stop();
        return;
      }
      
      await interaction.update({
        content: allPages[currentPage],
        components: [createButtons(currentPage)]
      });
    });
    
    collector.on('end', async () => {
      try {
        await sentMessage.edit({
          components: [] // Remove buttons after timeout
        });
      } catch (error) {
        // Message might be deleted, ignore error
      }
    });
    
    return;
  }

  // Add word
  if (content.startsWith("!addword ") || content.startsWith("!tambah ")) {
    if (!isAdmin(message.author.id)) {
      message.reply("❌ Arahan ini hanya untuk admin!");
      return;
    }
    
    const parts = message.content.split(' ');
    if (parts.length < 2) {
      message.reply("❌ Format: `!addword <perkataan>` atau `!addword <perkataan> exclusive`");
      return;
    }
    
    const newWord = parts[1].toLowerCase().trim();
    const isExclusive = parts[2] && parts[2].toLowerCase() === 'exclusive';
    
    // Check if word already exists
    if (ORIGINAL_WORDS.includes(newWord) || EXCLUSIVE_WORDS.includes(newWord)) {
      message.reply(`❌ Perkataan **${newWord}** sudah wujud!`);
      return;
    }
    
    // Add to appropriate list
    if (isExclusive) {
      EXCLUSIVE_WORDS.push(newWord);
      const diamond = '<a:SAC_diamond1:893046074888040499>';
      message.reply(`✅ ${diamond} Perkataan **${newWord}** berjaya ditambah ke senarai eksklusif!\n-# Total perkataan eksklusif: ${EXCLUSIVE_WORDS.length}`);
    } else {
      ORIGINAL_WORDS.push(newWord);
      const diamond = '<a:SAC_diamond2:893045927009472542>';
      message.reply(`✅ ${diamond} Perkataan **${newWord}** berjaya ditambah ke senarai biasa!\n-# Total perkataan biasa: ${ORIGINAL_WORDS.length}`);
    }
    return;
  }

  // Delete word
  if (content.startsWith("!deleteword ") || content.startsWith("!padam ")) {
    if (!isAdmin(message.author.id)) {
      message.reply("❌ Arahan ini hanya untuk admin!");
      return;
    }
    
    const wordToDelete = message.content.split(' ')[1].toLowerCase().trim();
    
    const normalIndex = ORIGINAL_WORDS.indexOf(wordToDelete);
    const exclusiveIndex = EXCLUSIVE_WORDS.indexOf(wordToDelete);
    
    if (normalIndex !== -1) {
      ORIGINAL_WORDS.splice(normalIndex, 1);
      message.reply(`✅ Perkataan **${wordToDelete}** berjaya dipadam dari senarai biasa!\n-# Total perkataan biasa: ${ORIGINAL_WORDS.length}`);
    } else if (exclusiveIndex !== -1) {
      EXCLUSIVE_WORDS.splice(exclusiveIndex, 1);
      message.reply(`✅ Perkataan **${wordToDelete}** berjaya dipadam dari senarai eksklusif!\n-# Total perkataan eksklusif: ${EXCLUSIVE_WORDS.length}`);
    } else {
      message.reply(`❌ Perkataan **${wordToDelete}** tidak dijumpai!`);
    }
    return;
  }

  // Edit word
  if (content.startsWith("!editword ") || content.startsWith("!edit ")) {
    if (!isAdmin(message.author.id)) {
      message.reply("❌ Arahan ini hanya untuk admin!");
      return;
    }
    
    const parts = message.content.split(' ');
    if (parts.length < 3) {
      message.reply("❌ Format: `!editword <perkataan_lama> <perkataan_baru>`");
      return;
    }
    
    const oldWord = parts[1].toLowerCase().trim();
    const newWord = parts[2].toLowerCase().trim();
    
    const normalIndex = ORIGINAL_WORDS.indexOf(oldWord);
    const exclusiveIndex = EXCLUSIVE_WORDS.indexOf(oldWord);
    
    // Check if new word already exists
    if (ORIGINAL_WORDS.includes(newWord) || EXCLUSIVE_WORDS.includes(newWord)) {
      message.reply(`❌ Perkataan baru **${newWord}** sudah wujud!`);
      return;
    }
    
    if (normalIndex !== -1) {
      ORIGINAL_WORDS[normalIndex] = newWord;
      message.reply(`✅ Perkataan **${oldWord}** berjaya ditukar kepada **${newWord}** (biasa)`);
    } else if (exclusiveIndex !== -1) {
      EXCLUSIVE_WORDS[exclusiveIndex] = newWord;
      const diamond = '<a:SAC_diamond1:893046074888040499>';
      message.reply(`✅ ${diamond} Perkataan **${oldWord}** berjaya ditukar kepada **${newWord}** (eksklusif)`);
    } else {
      message.reply(`❌ Perkataan lama **${oldWord}** tidak dijumpai!`);
    }
    return;
  }

  // Search word
  if (content.startsWith("!searchword ") || content.startsWith("!cari ")) {
    if (!isAdmin(message.author.id)) {
      message.reply("❌ Arahan ini hanya untuk admin!");
      return;
    }
    
    const searchTerm = message.content.split(' ')[1].toLowerCase().trim();
    
    const normalMatches = ORIGINAL_WORDS.filter(word => word.includes(searchTerm));
    const exclusiveMatches = EXCLUSIVE_WORDS.filter(word => word.includes(searchTerm));
    
    if (normalMatches.length === 0 && exclusiveMatches.length === 0) {
      message.reply(`❌ Tiada perkataan yang mengandungi **"${searchTerm}"**`);
      return;
    }
    
    const decorativeLine = "<a:SAC_zzaline:878680793386483712>".repeat(12);
    let result = `${decorativeLine}\n\n## 🔍 Keputusan Carian: "${searchTerm}"\n\n`;
    
    if (normalMatches.length > 0) {
      result += `**Perkataan Biasa (${normalMatches.length}):**\n`;
      result += normalMatches.map(w => `• ${w}`).join('\n') + '\n\n';
    }
    
    if (exclusiveMatches.length > 0) {
      result += `**Perkataan Eksklusif (${exclusiveMatches.length}):** <a:SAC_diamond1:893046074888040499>\n`;
      result += exclusiveMatches.map(w => `• ${w}`).join('\n') + '\n\n';
    }
    
    result += `${decorativeLine}`;
    message.channel.send(result);
    return;
  }

  // Admin help command
  if (content === "!adminhelp" || content === "!bantuan") {
    if (!isAdmin(message.author.id)) {
      message.reply("❌ Arahan ini hanya untuk admin!");
      return;
    }
    
    const decorativeLine = "<a:SAC_zzaline:878680793386483712>".repeat(12);
    const helpText = `${decorativeLine}\n\n## 🛠️ Arahan Admin\n\n` +
      `**📋 Lihat Perkataan**\n` +
      `\`!listwords\` atau \`!lihat\` - Papar semua perkataan\n\n` +
      `**➕ Tambah Perkataan**\n` +
      `\`!addword <perkataan>\` - Tambah perkataan biasa\n` +
      `\`!addword <perkataan> exclusive\` - Tambah perkataan eksklusif\n\n` +
      `**✏️ Edit Perkataan**\n` +
      `\`!editword <lama> <baru>\` - Tukar perkataan\n\n` +
      `**🗑️ Padam Perkataan**\n` +
      `\`!deleteword <perkataan>\` - Padam perkataan\n\n` +
      `**🔍 Cari Perkataan**\n` +
      `\`!searchword <kata>\` - Cari perkataan mengandungi kata\n\n` +
      `**� Urus Makna Perkataan**\n` +
      `\`!setmeaning <perkataan> <makna>\` - Tetapkan makna perkataan\n` +
      `\`!deletemeaning <perkataan>\` - Padam makna perkataan\n\n` +
      `**�📊 Statistik**\n` +
      `\`!wordstats\` - Papar statistik perkataan\n\n` +
      `${decorativeLine}`;
    
    message.channel.send(helpText);
    return;
  }

  // Word statistics
  if (content === "!wordstats" || content === "!stats") {
    if (!isAdmin(message.author.id)) {
      message.reply("❌ Arahan ini hanya untuk admin!");
      return;
    }
    
    const decorativeLine = "<a:SAC_zzaline:878680793386483712>".repeat(12);
    const totalWords = ORIGINAL_WORDS.length + EXCLUSIVE_WORDS.length;
    let meaningsCount = 0;
    
    if (USE_DATABASE) {
      meaningsCount = await db.getWordMeaningsCount();
    }
    
    const statsText = `${decorativeLine}\n\n## 📊 Statistik Perkataan\n\n` +
      `**Total Perkataan:** ${totalWords}\n` +
      `├─ <a:SAC_diamond2:893045927009472542> Perkataan Biasa: ${ORIGINAL_WORDS.length}\n` +
      `└─ <a:SAC_diamond1:893046074888040499> Perkataan Eksklusif: ${EXCLUSIVE_WORDS.length}\n\n` +
      `**Status Permainan:**\n` +
      `├─ Aktif: ${active ? 'Ya ✅' : 'Tidak ❌'}\n` +
      `└─ Perkataan Selesai: ${completedWords.length}\n\n` +
      `**Makna Perkataan:**\n` +
      `└─ 📖 Makna Tersimpan: ${meaningsCount}\n\n` +
      `${decorativeLine}`;
    
    message.channel.send(statsText);
    return;
  }

  // Set word meaning command (Admin only)
  if (content.startsWith("!setmeaning ") || content.startsWith("!setmakna ")) {
    if (!isAdmin(message.author.id)) {
      message.reply("❌ Arahan ini hanya untuk admin!");
      return;
    }
    
    if (!USE_DATABASE) {
      message.reply("❌ Fungsi ini memerlukan database. Sila aktifkan DATABASE_URL.");
      return;
    }
    
    // Parse: !setmeaning <word> <meaning>
    const parts = message.content.split(' ');
    if (parts.length < 3) {
      message.reply("❌ Format: `!setmeaning <perkataan> <makna>`\nContoh: `!setmeaning keris Senjata tajam tradisional Melayu dengan bilah berliku`");
      return;
    }
    
    const word = parts[1].toLowerCase().trim();
    const meaning = parts.slice(2).join(' ').trim();
    
    // Check if word exists in dictionary
    const allWords = [...ORIGINAL_WORDS, ...EXCLUSIVE_WORDS];
    if (!allWords.includes(word)) {
      message.reply(`⚠️ Perkataan **${word}** tidak wujud dalam kamus bot.\n-# Anda masih boleh tambah makna, tapi perkataan ini tidak ada dalam permainan.`);
    }
    
    // Save to database
    const success = await db.setWordMeaningInDB(word, meaning, message.author.id);
    
    if (success) {
      const decorativeLine = "<a:SAC_zzaline:878680793386483712>".repeat(12);
      message.reply(`${decorativeLine}\n\n✅ **Makna berjaya disimpan!**\n\n**Perkataan:** ${word}\n**Makna:** ${meaning}\n\n-# Makna ini akan dipaparkan dalam permainan.\n\n${decorativeLine}`);
    } else {
      message.reply("❌ Gagal menyimpan makna. Sila cuba lagi.");
    }
    return;
  }

  // Delete word meaning command (Admin only)
  if (content.startsWith("!deletemeaning ") || content.startsWith("!deletemakna ")) {
    if (!isAdmin(message.author.id)) {
      message.reply("❌ Arahan ini hanya untuk admin!");
      return;
    }
    
    if (!USE_DATABASE) {
      message.reply("❌ Fungsi ini memerlukan database.");
      return;
    }
    
    const word = message.content.split(' ')[1]?.toLowerCase().trim();
    
    if (!word) {
      message.reply("❌ Format: `!deletemeaning <perkataan>`");
      return;
    }
    
    const success = await db.deleteWordMeaningFromDB(word);
    
    if (success) {
      message.reply(`✅ Makna untuk perkataan **${word}** berjaya dipadam.`);
    } else {
      message.reply(`❌ Perkataan **${word}** tidak mempunyai makna tersimpan.`);
    }
    return;
  }

  // Look up word meaning command
  if (content.startsWith("!makna ")) {
    const word = message.content.split(' ')[1]?.toLowerCase().trim();
    
    if (!word) {
      message.reply("❌ Format: `!makna <perkataan>`\nContoh: `!makna istana`");
      return;
    }
    
    // Check if word exists in our dictionary
    const allWords = [...ORIGINAL_WORDS, ...EXCLUSIVE_WORDS];
    const wordExists = allWords.includes(word);
    
    if (!wordExists) {
      message.reply(`❌ Perkataan **${word}** tidak dijumpai dalam kamus bot.\n-# Gunakan \`!listwords\` untuk lihat semua perkataan.`);
      return;
    }
    
    // Show typing indicator
    await message.channel.sendTyping();
    
    // Fetch meaning
    const meaning = await getWordMeaning(word);
    
    const decorativeLine = "<a:SAC_zzaline:878680793386483712>".repeat(12);
    const isExclusive = EXCLUSIVE_WORDS.includes(word);
    const diamond = isExclusive ? '<a:SAC_diamond1:893046074888040499>' : '<a:SAC_diamond2:893045927009472542>';
    
    const meaningText = `${decorativeLine}\n\n## 📖 Makna Perkataan ${diamond}\n\n` +
      `**${word.toUpperCase()}**\n\n` +
      `${meaning}\n\n` +
      `${decorativeLine}`;
    
    message.channel.send(meaningText);
    return;
  }

  // Mula permainan (Admin only)
  if (content === "!teka") {
    if (!isAdmin(message.author.id)) {
      message.reply("❌ Arahan ini hanya untuk admin!");
      return;
    }
    
    if (active) {
      // Abaikan jika permainan sedang berjalan
      return;
    }

    // Gabungkan semua perkataan
    const allWords = [...ORIGINAL_WORDS, ...EXCLUSIVE_WORDS];
    WORDS = shuffleArray(allWords); // Kocok semua perkataan
    
    currentWordIndex = 0;
    currentWord = WORDS[currentWordIndex];
    guessedLetters.clear();
    chancesLeft = totalChances;
    completedWords = [];
    active = true;

    message.channel.send(renderBoard(true));
    return;
  }

  // ===== GAME TEKA NOMBOR COMMANDS =====
  
  // Start number guessing game
  if (content === "!teka-no") {
    if (!isAdmin(message.author.id)) {
      message.reply("❌ Arahan ini hanya untuk admin!");
      return;
    }
    
    const result = gameTekaNo.startGame(message);
    if (result.success) {
      message.channel.send(result.message);
    } else {
      message.reply(result.message);
    }
    return;
  }

  // Stop number game
  if (content === "!henti-no") {
    if (!isAdmin(message.author.id)) {
      message.reply("❌ Arahan ini hanya untuk admin!");
      return;
    }
    
    const result = gameTekaNo.stopGame(message.author.id);
    if (result.success) {
      message.channel.send(result.message);
    } else {
      message.reply(result.message);
    }
    return;
  }

  // Admin command - reveal answer
  if (content === "!noapa") {
    const result = gameTekaNo.revealAnswer(message.author.id, ADMIN_IDS);
    if (result.success) {
      // Send as ephemeral-style message (only admin sees)
      message.author.send(result.message).catch(() => {
        message.reply(result.message + "\n-# ⚠️ Mesej ini boleh dilihat semua orang. Aktifkan DM untuk privasi.");
      });
    } else {
      message.reply(result.message);
    }
    return;
  }

  // Check if message is a number guess (only digits)
  if (/^\d+$/.test(content) && gameTekaNo.getGameStatus().active) {
    const result = gameTekaNo.guessNumber(content, message, db, USE_DATABASE, addPoints);
    if (result.success && result.message) {
      message.channel.send(result.message);
    }
    return;
  }

  // If teka-no game is active and user types letters, redirect to teka-huruf
  if (gameTekaNo.getGameStatus().active && /^[a-zA-Z]+$/.test(content)) {
    message.reply("<:1SAC_ClairMarah:1092507527389913088> **Ni teka nombor lah, kalau nak teka perkataan pergi sini** <#1451233703102513154>");
    return;
  }

  // If teka-no game is active and user is chatting (not numbers/single letters), redirect to chat channel
  if (gameTekaNo.getGameStatus().active && content.length > 1 && !/^\d+$/.test(content) && !content.startsWith('!')) {
    message.reply("<a:SAC_kirby:1169136576056524850> **Oi, Sini bukan tempat borak, pergi <#854967270063996939> sana!**");
    return;
  }

  // ===== GAME TEKA HURUF LOGIC =====

  if (!active) return;

  // Semak cooldown pengguna
  const now = Date.now();
  const userCooldown = userCooldowns.get(message.author.id);
  if (userCooldown && now - userCooldown < 3000) {
    message.reply("**SABAR JANGAN SPAM** <:1SAC_PepeNo:885753930007593000>");
    return;
  }

  // Teka perkataan penuh
  if (content.length === currentWord.length) {
    if (content === currentWord) {
      // Set cooldown
      userCooldowns.set(message.author.id, Date.now());
      
      // Tambah semua huruf untuk papar perkataan selesai
      for (let c of currentWord) {
        guessedLetters.add(c);
      }
      
      // Berikan mata untuk meneka perkataan penuh
      addPoints(message.author.id, message.author.username, 1, currentWord);
      
      // Get word meaning from API
      const meaning = await getWordMeaning(currentWord);
      
      const decorativeLine = "<a:SAC_zzaline:878680793386483712>".repeat(12);
      // Gunakan diamond eksklusif jika perkataan dalam senarai eksklusif
      const diamondEmoji = EXCLUSIVE_WORDS.includes(currentWord) 
        ? '<a:SAC_diamond1:893046074888040499>' 
        : '<a:SAC_diamond2:893045927009472542>';
      const congratsMessage = `${decorativeLine}\n\n-# *Arahan - Taip huruf atau perkataan untuk diteka*\n\nPerkataan: ${formatCompletedWord(currentWord)} ${diamondEmoji}\n\n<a:SAC_aaparty2:878675028282052708> Tahniah <@${message.author.id}> berjaya meneka! Perkataan itu ialah **${currentWord}**\n\n📖 **Makna:** ${meaning}`;
      
      message.channel.send(congratsMessage);
      
      setTimeout(() => {
        // Tambah perkataan selesai ke senarai
        completedWords.push(currentWord);
        
        // Pindah ke perkataan seterusnya
        currentWordIndex++;
        
        if (currentWordIndex >= WORDS.length) {
          // Semua perkataan berjaya disiapkan - mula semula
          const totalWords = ORIGINAL_WORDS.length + EXCLUSIVE_WORDS.length;
          message.channel.send(`🎊 **Tahniah! Anda telah berjaya menyiapkan semua ${totalWords} perkataan!**\n\n-# Permainan akan bermula semula...`);
          
          setTimeout(() => {
            // Kocok semula dan mula dari awal dengan semua perkataan
            const allWords = [...ORIGINAL_WORDS, ...EXCLUSIVE_WORDS];
            WORDS = shuffleArray(allWords);
            currentWordIndex = 0;
            currentWord = WORDS[currentWordIndex];
            guessedLetters.clear();
            completedWords = [];
            
            message.channel.send(renderBoard(true));
          }, 3000);
          return;
        }
        
        // Sediakan perkataan seterusnya
        currentWord = WORDS[currentWordIndex];
        guessedLetters.clear();
        // Jangan reset percubaan - terus guna pool yang sama
        
        setTimeout(() => {
          message.channel.send(renderBoard(false, true));
        }, 1000);
      }, 1000);
    } else {
      // Abaikan tekaan salah
    }
    return;
  }

  // Teka satu huruf
  if (content.length === 1 && /^[a-z]$/.test(content)) {
    if (guessedLetters.has(content)) {
      // Maklumkan huruf sudah diteka
      const decorativeLine = "<a:SAC_zzaline:878680793386483712>".repeat(12);
      message.reply(`Huruf **\`${content}\`** <:1SAC_PepeNo:885753930007593000> sudah diteka. Cari yang lain!\n\n${decorativeLine}`);
      return;
    }

    // Set cooldown
    userCooldowns.set(message.author.id, Date.now());

    // Semak jika huruf ada dalam perkataan
    let letterInWord = currentWord.includes(content);
    
    guessedLetters.add(content);
    
    // Semak jika selesai
    let solved = true;
    for (let c of currentWord) {
      if (!guessedLetters.has(c)) {
        solved = false;
        break;
      }
    }

    if (solved) {
      // Berikan mata untuk menyiapkan perkataan
      addPoints(message.author.id, message.author.username, 1, currentWord);
      
      // Get word meaning from API
      const meaning = await getWordMeaning(currentWord);
      
      const board = renderBoard(false);
      const congratsMessage = `<a:SAC_aaparty2:878675028282052708> Tahniah <@${message.author.id}> berjaya menyiapkan perkataan **${currentWord}**!\n\n📖 **Makna:** ${meaning}`;
      
      message.channel.send(`${board}\n\n${congratsMessage}`);
      
      setTimeout(() => {
        // Tambah perkataan selesai ke senarai
        completedWords.push(currentWord);
        
        // Pindah ke perkataan seterusnya
        currentWordIndex++;
        
        if (currentWordIndex >= WORDS.length) {
          // Semua perkataan berjaya disiapkan - mula semula
          const totalWords = ORIGINAL_WORDS.length + EXCLUSIVE_WORDS.length;
          message.channel.send(`🎊 **Tahniah! Anda telah berjaya menyiapkan semua ${totalWords} perkataan!**\n\n-# Permainan akan bermula semula...`);
          
          setTimeout(() => {
            // Kocok semula dan mula dari awal dengan semua perkataan
            const allWords = [...ORIGINAL_WORDS, ...EXCLUSIVE_WORDS];
            WORDS = shuffleArray(allWords);
            currentWordIndex = 0;
            currentWord = WORDS[currentWordIndex];
            guessedLetters.clear();
            completedWords = [];
            
            message.channel.send(renderBoard(true));
          }, 3000);
          return;
        }
        
        // Sediakan perkataan seterusnya
        currentWord = WORDS[currentWordIndex];
        guessedLetters.clear();
        
        setTimeout(() => {
          message.channel.send(renderBoard(false, true));
        }, 1000);
      }, 1000);
      return;
    }

    // Papar maklum balas dan board
    const feedback = letterInWord 
      ? `[ <:1SAC_PepeYes:885753930867441704> ] **\`${content}\` ada dalam perkataan. Teruskan!**`
      : `[ <:1SAC_PepeNo:885753930007593000> ] **Huruf tidak ada dalam perkataan. Cuba lagi!**`;
    
    const board = renderBoard(false);
    
    message.reply(`${feedback}\n\n${board}`);
  }
  } catch (error) {
    // Log error but don't crash
    console.error('❌ Error handling message:', error);
    console.error('Error details:', {
      content: message.content,
      author: message.author.tag,
      channel: message.channel.id
    });
    
    // Save leaderboard immediately on error
    saveLeaderboard();
    
    // Notify in channel (optional - comment out if too spammy)
    try {
      message.reply('❌ Maaf, terjadi ralat. Data telah disimpan. Cuba lagi!');
    } catch (replyError) {
      console.error('❌ Could not send error message:', replyError);
    }
  }
});

client.once("clientReady", async () => {
  console.log(`Bot logged in as ${client.user.tag}`);
  
  if (USE_DATABASE) {
    console.log('🔄 Using PostgreSQL database');
    try {
      // Initialize database tables
      await db.initDatabase();
      
      // Check if we need to migrate from JSON to database
      const LEADERBOARD_JSON = path.join(__dirname, 'leaderboard.json');
      if (fs.existsSync(LEADERBOARD_JSON)) {
        const data = JSON.parse(fs.readFileSync(LEADERBOARD_JSON, 'utf8'));
        if (Object.keys(data).length > 0) {
          console.log('🔄 Found existing leaderboard.json, migrating to database...');
          await db.migrateJSONToDatabase();
        }
      }
      
      // Load leaderboard from database
      await loadLeaderboard();
      console.log('✅ Database connected and leaderboard loaded!');
    } catch (error) {
      console.error('❌ Database error:', error);
      console.log('⚠️ Falling back to JSON file storage');
      process.env.DATABASE_URL = ''; // Disable database mode
      loadLeaderboard();
    }
  } else {
    console.log('📁 Using JSON file storage');
    await loadLeaderboard();
    console.log('Leaderboard loaded!');
    
    // Auto-save every 5 minutes as extra safety (only for JSON mode)
    setInterval(async () => {
      await saveLeaderboard();
      console.log('✅ Auto-save completed');
    }, 5 * 60 * 1000); // 5 minutes
  }
  
  console.log('🔐 Admin IDs configured:', ADMIN_IDS.length > 0 ? ADMIN_IDS : 'None (No admins set!)');
});

client.on("error", async (error) => {
  console.error("❌ Bot error:", error);
  // Save on error
  await saveLeaderboard();
});

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('\n⚠️ Shutting down gracefully...');
  await saveLeaderboard();
  if (USE_DATABASE) {
    await db.closeDatabase();
  }
  console.log('✅ Leaderboard saved!');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️ Shutting down gracefully...');
  await saveLeaderboard();
  if (USE_DATABASE) {
    await db.closeDatabase();
  }
  console.log('✅ Leaderboard saved!');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught Exception:', error);
  await saveLeaderboard();
  if (USE_DATABASE) {
    await db.closeDatabase();
  }
  console.log('✅ Emergency save completed!');
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  await saveLeaderboard();
  if (USE_DATABASE) {
    await db.closeDatabase();
  }
  console.log('✅ Emergency save completed!');
});

client.login(process.env.DISCORD_BOT_TOKEN);

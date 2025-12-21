// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

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
const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');
const BACKUP_DIR = path.join(__dirname, 'backups');
let leaderboard = {};

// Create backup directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Load leaderboard from file
function loadLeaderboard() {
  try {
    if (fs.existsSync(LEADERBOARD_FILE)) {
      const data = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
      leaderboard = JSON.parse(data);
      console.log(`✅ Leaderboard loaded: ${Object.keys(leaderboard).length} users`);
    } else {
      console.log('⚠️ No leaderboard file found, starting fresh');
    }
  } catch (error) {
    console.error('❌ Error loading leaderboard:', error);
    // Try to load from latest backup
    tryLoadFromBackup();
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

// Save leaderboard to file with backup
function saveLeaderboard() {
  try {
    // Save main file
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
    
    // Create timestamped backup every save (auto-cleanup old backups)
    createBackup();
  } catch (error) {
    console.error('❌ Error saving leaderboard:', error);
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

// Add points to user
function addPoints(userId, username, points, word) {
  if (!leaderboard[userId]) {
    leaderboard[userId] = {
      username: username,
      points: 0,
      words: []
    };
  }
  leaderboard[userId].points += points;
  leaderboard[userId].username = username; // Update username in case it changed
  if (word) {
    leaderboard[userId].words.push(word);
  }
  saveLeaderboard();
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

// ===== SENARAI PERKATAAN =====
const ORIGINAL_WORDS = [
  "abur", "adinda", "afwah", "alu", "angklung", "arif", "arkian",
  "bahana", "balada", "balai", "balainobat", "balairongseri", "balairung",
  "balian", "baligh", "belanga", "belasungkawa", "belukar", "bendera",
  "bendul", "bentara", "beradu", "berahi", "beranda", "beta",
  "bidadari", "biduanda", "bonang", "bungkam",
  "cacau", "cakerawala", "candawara", "cendana", "cendera", "ceritera",
  "cindai", "citra", "cogan", "cogankata", "cokmar",
  "daif", "dangau", "daulat", "dayang", "dek", "dewan", "dian", "dodol", "duli",
  "fajar", "fiil", "firasat",
  "gading", "gambus", "gamelan", "gamit", "gejala", "geliga", "genderang",
  "gerimis", "gering", "geruh", "gong", "goyah", "gundah", "gundik", "gurindam",
  "hadrah", "halaman", "halilintar", "hamba", "hikayat", "hulubalang",
  "inang", "inderaloka", "irama", "istana",
  "jambiah", "jampi", "jauhari", "jentayu", "joget", "jong", "jongkong", "jua", "juragan",
  "kabut", "kadam", "kakanda", "kalam", "kandil", "kekang", "kemilau",
  "kendi", "kenong", "keris", "kerongsang", "kesumat", "khilaf", "kirana", "kitab", "kompang", "kukusan",
  "laksamana", "lali", "langgam", "lara", "lasykar", "lemang", "lembing", "lesung", "luluk",
  "maakul", "mabur", "madah", "maharaja", "mahkota", "mahligai",
  "makam", "makyong", "mamang", "mangkat", "manikam", "mantera",
  "maruah", "marwas", "maslahat", "masyghul",
  "menora", "meta", "muafakat", "mustika", "musyawarah",
  "nafiri", "naskhah", "nirmala", "nista", "nobat", "nyiru",
  "pancawarna", "panglima", "panji", "pantun", "patik",
  "pawana", "pawang", "payang", "pedang", "pena", "perawis", "perigi", "perisai", "permaisuri", "permata", "pusaka",
  "ratna", "rebab", "rebana",
  "sali", "santapan", "seantero", "segara", "seloka", "sepoi", "serambi", "serampang", "seri",
  "serunai", "serunding", "singgahsana", "sitar", "surat", "sutera",
  "syahbandar", "syair",
  "takhta", "tamadun", "tameng", "tampi", "tatasusila", "tatkala",
  "tempayan", "tempurung", "tinta", "titah", "tokoh", "tombak", "tuanku", "tuarang",
  "warkah", "wasilah", "wayang", "wayangkul",
  "zapin"
]; 

// ===== PERKATAAN EKSKLUSIF =====
const EXCLUSIVE_WORDS = [
  "kembali", "klasik", "mengangkat", "warisan", "pendidikan", "menyemai", "budaya", "ilmu"
];

let WORDS = []; // Akan dikocok semasa permainan bermula

let currentWordIndex = 0;
let currentWord = "";
let guessedLetters = new Set();
let chancesLeft = 999999; // Tiada had
let totalChances = 999999;
let active = false;
let completedWords = []; // Jejak perkataan yang selesai
let userCooldowns = new Map(); // Cooldown untuk setiap pengguna
let usedExclusiveWords = []; // Jejak perkataan eksklusif yang sudah digunakan
let usedNormalWords = []; // Jejak perkataan biasa yang sudah digunakan

// ===== Fungsi kocok =====
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ===== Pembantu: format perkataan dengan backticks dan garis bawah =====
function formatWordWithBackticks(word, guessedLetters) {
  let result = "";
  
  for (let i = 0; i < word.length; i++) {
    const c = word[i];
    if (guessedLetters.has(c)) {
      result += `\`${c.toUpperCase()}\``;
    } else {
      result += "`_`";
    }
    
    // Tambah ruang antara huruf, tetapi tidak selepas yang terakhir
    if (i < word.length - 1) {
      result += " ";
    }
  }
  
  return result;
}

// ===== Pembantu: format perkataan selesai dengan coretan =====
function formatCompletedWord(word) {
  let result = "";
  
  for (let i = 0; i < word.length; i++) {
    const c = word[i];
    result += `~~**${c.toUpperCase()}**~~`;
    
    // Tambah ruang antara huruf, tetapi tidak selepas yang terakhir
    if (i < word.length - 1) {
      result += " ";
    }
  }
  
  return result;
}

// ===== Pembantu: format perkataan akan datang dengan bilangan garis bawah yang betul =====
function formatUpcomingWord(word) {
  let result = "";
  
  for (let i = 0; i < word.length; i++) {
    result += "`_`";
    
    // Tambah ruang antara huruf, tetapi tidak selepas yang terakhir
    if (i < word.length - 1) {
      result += " ";
    }
  }
  
  return result;
}

// ===== Pembantu: papar papan penuh =====
function renderBoard(showHeader = false, isNextWord = false) {
  let output = "";
  
  const decorativeLine = "<a:SAC_zzaline:878680793386483712>".repeat(12);
  
  // Semak jika perkataan semasa selesai
  let currentWordSolved = true;
  for (let c of currentWord) {
    if (!guessedLetters.has(c)) {
      currentWordSolved = false;
      break;
    }
  }
  
  output += `${decorativeLine}\n\n`;
  
  // Papar tajuk hanya pada permulaan
  if (showHeader) {
    output += `**Game Teka Perkataan**\n\n`;
  }
  
  // Papar arahan atau tajuk perkataan seterusnya
  if (isNextWord) {
    output += `## Perkataan Seterusnya\n\n`;
    output += `-# *Arahan - Taip huruf atau perkataan untuk diteka*\n\n`;
  } else {
    output += `-# *Arahan - Taip huruf atau perkataan untuk diteka*\n\n`;
  }
  
  // Tambah diamond emoji jika perkataan selesai
  let diamondEmoji = "";
  if (currentWordSolved) {
    // Gunakan diamond eksklusif jika perkataan dalam senarai eksklusif
    const isExclusive = EXCLUSIVE_WORDS.includes(currentWord.toLowerCase().trim());
    console.log(`Word: "${currentWord}", Is Exclusive: ${isExclusive}`); // Debug
    diamondEmoji = isExclusive
      ? ` <a:SAC_diamond1:893046074888040499>` 
      : ` <a:SAC_diamond2:893045927009472542>`;
  }
  output += `Perkataan: ${formatWordWithBackticks(currentWord, guessedLetters)}${diamondEmoji}\n\n`;
  
  output += `${decorativeLine}`;

  return output;
}

// ===== HELPER: Check if user is admin =====
function isAdmin(userId) {
  console.log('🔍 Admin Check:');
  console.log('  User ID:', userId);
  console.log('  Admin IDs:', ADMIN_IDS);
  console.log('  Is Admin:', ADMIN_IDS.includes(userId));
  return ADMIN_IDS.includes(userId);
}

// ===== HELPER: Format word list with table =====
// Helper function: Split message into chunks under 2000 characters
async function sendLongMessage(channel, content) {
  const MAX_LENGTH = 1900; // Leave buffer for safety
  
  if (content.length <= MAX_LENGTH) {
    try {
      await channel.send(content);
    } catch (error) {
      console.error('❌ Error sending message:', error.message);
      console.error('   Message length:', content.length);
    }
    return;
  }
  
  // Split by lines to avoid breaking formatting
  const lines = content.split('\n');
  let currentChunk = '';
  
  for (const line of lines) {
    if ((currentChunk + line + '\n').length > MAX_LENGTH) {
      // Send current chunk
      if (currentChunk) {
        try {
          await channel.send(currentChunk.trim());
          await new Promise(resolve => setTimeout(resolve, 300)); // Brief delay
        } catch (error) {
          console.error('❌ Error sending chunk:', error.message);
        }
        currentChunk = '';
      }
    }
    currentChunk += line + '\n';
  }
  
  // Send remaining chunk
  if (currentChunk.trim()) {
    try {
      await channel.send(currentChunk.trim());
    } catch (error) {
      console.error('❌ Error sending final chunk:', error.message);
    }
  }
}

function formatWordList(words, title, isExclusive = false) {
  const decorativeLine = "<a:SAC_zzaline:878680793386483712>".repeat(12);
  const diamond = isExclusive ? '<a:SAC_diamond1:893046074888040499>' : '<a:SAC_diamond2:893045927009472542>';
  const columns = 3;
  const sortedWords = [...words].sort();
  
  // Calculate words per page (aim for ~1500 chars per page)
  const wordsPerPage = 60; // ~20 rows × 3 columns
  const totalPages = Math.ceil(sortedWords.length / wordsPerPage);
  const pages = [];
  
  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    const startIdx = pageNum * wordsPerPage;
    const endIdx = Math.min(startIdx + wordsPerPage, sortedWords.length);
    const pageWords = sortedWords.slice(startIdx, endIdx);
    
    let pageContent = `${decorativeLine}\n\n`;
    pageContent += `## ${diamond} ${title}`;
    
    // Add page number if multiple pages
    if (totalPages > 1) {
      pageContent += ` - 📄 Halaman ${pageNum + 1}/${totalPages}`;
    }
    
    pageContent += `\n\n-# Total: **${words.length}** perkataan`;
    
    if (totalPages > 1) {
      pageContent += ` | Paparan: ${startIdx + 1}-${endIdx}`;
    }
    
    pageContent += `\n\n`;
    
    // Display words in columns
    for (let i = 0; i < pageWords.length; i += columns) {
      const row = pageWords.slice(i, i + columns);
      pageContent += row.map((word, idx) => `\`${startIdx + i + idx + 1}.\` ${word}`).join('  |  ') + '\n';
    }
    
    pageContent += `\n${decorativeLine}`;
    pages.push(pageContent);
  }
  
  return pages;
}

// ===== MULA PERMAINAN =====
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
    
    tipsText += `\`!skor\` atau \`!leaderboard\` - Papar papan skor teratas\n`;
    tipsText += `-# Lihat siapa pemain terbaik!\n\n`;
    
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
      leaderboardText += `${medal} **${player.username}** - **${player.points}** mata\n\n`;
    });
    
    leaderboardText += `${decorativeLine}`;
    
    message.channel.send(leaderboardText);
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
      `**📊 Statistik**\n` +
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
    
    const statsText = `${decorativeLine}\n\n## 📊 Statistik Perkataan\n\n` +
      `**Total Perkataan:** ${totalWords}\n` +
      `├─ <a:SAC_diamond2:893045927009472542> Perkataan Biasa: ${ORIGINAL_WORDS.length}\n` +
      `└─ <a:SAC_diamond1:893046074888040499> Perkataan Eksklusif: ${EXCLUSIVE_WORDS.length}\n\n` +
      `**Status Permainan:**\n` +
      `├─ Aktif: ${active ? 'Ya ✅' : 'Tidak ❌'}\n` +
      `└─ Perkataan Selesai: ${completedWords.length}\n\n` +
      `${decorativeLine}`;
    
    message.channel.send(statsText);
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
      
      const decorativeLine = "<a:SAC_zzaline:878680793386483712>".repeat(12);
      // Gunakan diamond eksklusif jika perkataan dalam senarai eksklusif
      const diamondEmoji = EXCLUSIVE_WORDS.includes(currentWord) 
        ? '<a:SAC_diamond1:893046074888040499>' 
        : '<a:SAC_diamond2:893045927009472542>';
      const congratsMessage = `${decorativeLine}\n\n-# *Arahan - Taip huruf atau perkataan untuk diteka*\n\nPerkataan: ${formatCompletedWord(currentWord)} ${diamondEmoji}\n\n<a:SAC_aaparty2:878675028282052708> Tahniah <@${message.author.id}> berjaya meneka! Perkataan itu ialah **${currentWord}**`;
      
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
      
      const board = renderBoard(false);
      const congratsMessage = `<a:SAC_aaparty2:878675028282052708> Tahniah <@${message.author.id}> berjaya menyiapkan perkataan **${currentWord}**!`;
      
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

client.once("clientReady", () => {
  console.log(`Bot logged in as ${client.user.tag}`);
  loadLeaderboard();
  console.log('Leaderboard loaded!');
  console.log('🔐 Admin IDs configured:', ADMIN_IDS.length > 0 ? ADMIN_IDS : 'None (No admins set!)');
  
  // Auto-save every 5 minutes as extra safety
  setInterval(() => {
    saveLeaderboard();
    console.log('✅ Auto-save completed');
  }, 5 * 60 * 1000); // 5 minutes
});

client.on("error", (error) => {
  console.error("❌ Bot error:", error);
  // Save on error
  saveLeaderboard();
});

// Graceful shutdown handlers
process.on('SIGINT', () => {
  console.log('\n⚠️ Shutting down gracefully...');
  saveLeaderboard();
  console.log('✅ Leaderboard saved!');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️ Shutting down gracefully...');
  saveLeaderboard();
  console.log('✅ Leaderboard saved!');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  saveLeaderboard();
  console.log('✅ Emergency save completed!');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  saveLeaderboard();
  console.log('✅ Emergency save completed!');
});

client.login(process.env.DISCORD_BOT_TOKEN);

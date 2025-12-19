// index.js
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
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
const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');
let leaderboard = {};

// Load leaderboard from file
function loadLeaderboard() {
  try {
    if (fs.existsSync(LEADERBOARD_FILE)) {
      const data = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
      leaderboard = JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    leaderboard = {};
  }
}

// Save leaderboard to file
function saveLeaderboard() {
  try {
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
  } catch (error) {
    console.error('Error saving leaderboard:', error);
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

// ===== SENARAI PERKATAAN =====
const ORIGINAL_WORDS = [
  "adinda", "kakanda", "beta", "patik", "hamba", "tuanku", "seri", "duli",
  "pusaka", "istana", "balairung", "permaisuri", "maharaja", "hulubalang",
  "bentara", "laksamana", "panglima", "syahbandar", "biduanda", "gamelan",
  "wayang", "hikayat", "gurindam", "pantun", "seloka", "jampi", "mantera",
  "pawang", "tokoh", "tamadun", "cendera", "permata", "ratna", "mustika",
  "cindai", "sutera", "langgam", "irama", "balada", "syair", "madah",
  "warkah", "surat", "kitab", "naskhah", "tinta", "pena", "kalam", "takhta",
  "singgahsana", "mahkota", "geliga", "keris", "tombak", "lembing", "pedang",
  "perisai", "tameng", "panji", "bendera", "gading", "cogan", "cokmar",
  "cogankata", "balai", "dewan", "balairongseri", "balainobat", "nobat",
  "genderang", "nafiri", "serunai", "gong", "kenong", "bonang", "angklung",
  "rebab", "sitar", "gambus", "kompang", "hadrah", "marwas", "serampang",
  "joget", "zapin", "inang", "makyong", "menora", "wayangkul"
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
  
  const decorativeLine = "<a:SAC_zzaline:878680793386483712>".repeat(14);
  
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

// ===== MULA PERMAINAN =====
client.on("messageCreate", async (message) => {
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

  // Arahan reset/henti permainan
  if (content === "!resetteka" || content === "!henti") {
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
    
    const decorativeLine = "<a:SAC_zzaline:878680793386483712>".repeat(14);
    let leaderboardText = `${decorativeLine}\n\n## <a:BlueStar_SAC:886125020286451752> Papan Skor Teratas\n\n`;
    
    topPlayers.forEach((player, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const wordsGuessed = player.words && player.words.length > 0 ? player.words.join(', ') : 'tiada';
      leaderboardText += `${medal} **${player.username}** - ${player.points} mata\n-# Perkataan: ${wordsGuessed}\n\n`;
    });
    
    leaderboardText += `${decorativeLine}`;
    
    message.channel.send(leaderboardText);
    return;
  }

  // Mula permainan
  if (content === "!teka") {
    if (active) {
      // Abaikan jika permainan sedang berjalan
      return;
    }

    // Reset papan skor untuk permainan baru
    resetLeaderboard();

    // Gabungkan semua perkataan (88 + 8 = 96 perkataan)
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
      
      const decorativeLine = "<a:SAC_zzaline:878680793386483712>".repeat(14);
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
          message.channel.send("🎊 **Tahniah! Anda telah berjaya menyiapkan semua 96 perkataan!**\n\n-# Permainan akan bermula semula...");
          
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
      const decorativeLine = "<a:SAC_zzaline:878680793386483712>".repeat(14);
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
          message.channel.send("🎊 **Tahniah! Anda telah berjaya menyiapkan semua 96 perkataan!**\n\n-# Permainan akan bermula semula...");
          
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
});

client.once("ready", () => {
  console.log(`Bot logged in as ${client.user.tag}`);
  loadLeaderboard();
  console.log('Leaderboard loaded!');
});

client.on("error", (error) => {
  console.error("Bot error:", error);
});

client.login(process.env.DISCORD_BOT_TOKEN);
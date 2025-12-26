// games/bot-teka-no.js
// Number Guessing Game Logic - Game Teka Nombor

// Game state
let activeGame = false;
let secretNumber = 0;
let attempts = 0;
let startedBy = null;
let gameChannel = null;

// Response templates for different ranges
const RESPONSES = {
  // Difference > 100,000,000
  tooHighExtreme: [
    "[❌] **Terlalu Tinggi!** *Eh… awak jawab ikut nombor IC ke ni?* 😭",
    "[🧑‍🏫] **CIKGU TERKEJUT! Tinggi sangat!** *Turunlah sikit, cikgu pening dah* 🤦‍♀️",
    "[🧑‍🏫] *Ni bukan soalan KBAT tahap universiti…* ***Turun lagi, anak murid!*** 😵"
  ],
  tooLowExtreme: [
    "[❄️] **Rendah sangat!** *Terlalu rendah! 🌋 Fikir yang lebih, lebih tinggi lagi. Terlalu jauh tu!*",
    "[🧑‍🏫] **CIKGU SEDIH! Awak meneka dari Darjah 1 ke ni?** *Rendah sangat! Naikkan lagi.*",
    "[🧑‍🏫] *Cikgu ajar tadi guna kalkulator kan?* ***Naik lagi, anak murid!*** 🧮"
  ],
  
  // Difference 10,000,000 - 99,999,999
  tooHighFar: [
    "[🔥] **Dah panas sikit, tapi awak masih terlebih jawab.** *Cuba turunkan lagi....slow-slow* 🙂",
    "[🧑‍🏫] **Okay, Cikgu nampak usaha!** *Turun sikit lagi~*",
    "[🧑‍🏫] *Jangan gelojoh, ini bukan ujian larian 100m 🏃‍♂️* ***Turun sikit lagi! 📉***"
  ],
  tooLowFar: [
    "[❄️] **Masih rendah** *Dah dekat, tapi masih bawah~* 🧊",
    "[🧑‍🏫] **Okay, Cikgu nampak usaha!** *Cuba naikkan sikit lagi, jangan give up!* 📈",
    "[🧑‍🏫] **Cikgu bagi hint:** *Jawapan lebih tinggi dari ni* 😉"
  ],
  
  // Difference 1,000,000 - 9,999,999
  tooHighClose: [
    "[🧑‍🏫] **Eh Ehhh!** *Dah hampir dekat, turun sikit je~*",
    "[🔥] **Panas dah ni!** *Jawapan awak tinggi sikit je, turunkan sedikitttt* 🤏"
  ],
  tooLowClose: [
    "[🧑‍🏫] **Sejukk! sikit lagi~** *Jawapan awak rendah sikit je 🧊, naik sikit je~*",
    "[❄️] **Sejuk sikit lagi!** *Jawapan awak rendah sikit je, naikkan sedikitttt* 🤏"
  ],
  
  // Difference 1 - 999,999
  tooHighVeryClose: [
    "[🧑‍🏫] **Cikgu dah berdiri belakang** 👀 *Dah dekat sangat ni! turun sikit je..*",
    "[🧑‍🏫] **Cikgu dah berdiri belakang** 👀 *Cuba adjust bawah sikit lagi, jangan gemuruh* 😆"
  ],
  tooLowVeryClose: [
    "[🧑‍🏫] **Cikgu dah berdiri belakang** 👀 *Dah dekat sangat ni! naik sikit je..*",
    "[🧑‍🏫] **Cikgu dah berdiri belakang** 👀 *Cuba adjust atas sikit lagi, jangan gemuruh* 😆"
  ]
};

// Helper: Get random response from array
function getRandomResponse(responseArray) {
  return responseArray[Math.floor(Math.random() * responseArray.length)];
}

// Helper: Generate random number between min and max (inclusive)
function generateRandomNumber(min = 1, max = 100000000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Start new game
function startGame(message, min = 1, max = 100000000) {
  if (activeGame) {
    return {
      success: false,
      message: "⚠️ Permainan sedang berjalan! Selesaikan dulu atau taip `!henti-no` untuk hentikan."
    };
  }

  secretNumber = generateRandomNumber(min, max);
  activeGame = true;
  attempts = 0;
  startedBy = message.author.id;
  gameChannel = message.channel.id;

  const decorativeLine = "<a:SAC_zzaline:878680793386483712>".repeat(12);
  const diamond = '<a:SAC_diamond2:893045927009472542>';
  
  let output = `${decorativeLine}\n\n`;
  output += `## ${diamond} __**Game Teka Nombor**__\n\n`;
  output += `-# Taip nombor untuk meneka (contoh: 5000000)\n`;
  output += `-# Atau taip !henti-no untuk hentikan permainan\n\n`;
  output += `${decorativeLine}`;

  console.log(`🎮 Game started! Secret number: ${secretNumber}`);
  
  return {
    success: true,
    message: output
  };
}

// Process guess
function guessNumber(guess, message, db = null, USE_DATABASE = false, addPoints = null) {
  if (!activeGame) {
    return {
      success: false,
      message: "❌ Tiada permainan aktif! Taip `!teka-no` untuk mula."
    };
  }

  if (message.channel.id !== gameChannel) {
    return {
      success: false,
      message: null // Silent fail for wrong channel
    };
  }

  const guessNum = parseInt(guess);
  
  if (isNaN(guessNum)) {
    return {
      success: false,
      message: "❌ Sila taip nombor yang sah!"
    };
  }

  attempts++;
  const difference = Math.abs(guessNum - secretNumber);
  const decorativeLine = "<a:SAC_zzaline:878680793386483712>".repeat(12);

  // EXACT MATCH - WIN!
  if (guessNum === secretNumber) {
    activeGame = false;
    
    // Award points for NUMBER GAME (gameType = 'no')
    if (addPoints) {
      addPoints(message.author.id, message.author.username, 1, `teka-no-${secretNumber}`, 'no');
    }
    
    let output = `${decorativeLine}\n\n`;
    output += `🎉🧑‍🏫 **BETUL, ANAK MURID!**\n`;
    output += `***Cikgu bangga dengan awak*** 😭✨\n\n`;
    output += `**Jawapan yang betul ialah ${secretNumber.toLocaleString()}** 🧠📚\n\n`;
    output += `📊 **Statistik:**\n`;
    output += `├─ Percubaan: **${attempts}** kali\n`;
    output += `├─ Pemenang: <@${message.author.id}>\n`;
    output += `└─ Mata: **+1 mata** 🏆\n\n`;
    output += `*Sila ambil gula-gula ni 🍬 dan duduk.*\n\n`;
    output += `${decorativeLine}`;
    
    return {
      success: true,
      message: output,
      won: true
    };
  }

  // NOT CORRECT - Give hints based on difference
  let response = "";
  let emoji = "";
  
  if (difference >= 100000000) {
    // Extreme difference
    response = getRandomResponse(
      guessNum > secretNumber ? RESPONSES.tooHighExtreme : RESPONSES.tooLowExtreme
    );
    emoji = guessNum > secretNumber ? "📉" : "📈";
  } else if (difference >= 10000000) {
    // Far but getting warmer
    response = getRandomResponse(
      guessNum > secretNumber ? RESPONSES.tooHighFar : RESPONSES.tooLowFar
    );
    emoji = guessNum > secretNumber ? "🔥" : "❄️";
  } else if (difference >= 1000000) {
    // Close
    response = getRandomResponse(
      guessNum > secretNumber ? RESPONSES.tooHighClose : RESPONSES.tooLowClose
    );
    emoji = guessNum > secretNumber ? "🔥🔥" : "❄️❄️";
  } else {
    // Very close!
    response = getRandomResponse(
      guessNum > secretNumber ? RESPONSES.tooHighVeryClose : RESPONSES.tooLowVeryClose
    );
    emoji = guessNum > secretNumber ? "🔥🔥🔥" : "❄️❄️❄️";
  }

  let output = `${decorativeLine}\n\n`;
  output += `${response}\n\n`;
  output += `${emoji} **Tekaan:** ${guessNum.toLocaleString()}\n`;
  output += `-# 🔢 **Percubaan:** ${attempts}\n\n`;
  output += `${decorativeLine}`;

  return {
    success: true,
    message: output,
    won: false
  };
}

// Stop game
function stopGame(userId) {
  if (!activeGame) {
    return {
      success: false,
      message: "❌ Tiada permainan aktif!"
    };
  }

  activeGame = false;
  const decorativeLine = "<a:SAC_zzaline:878680793386483712>".repeat(12);
  
  let output = `${decorativeLine}\n\n`;
  output += `⛔ **Permainan dihentikan!**\n\n`;
  output += `🔢 **Jawapan sebenar:** ${secretNumber.toLocaleString()}\n`;
  output += `📊 **Percubaan:** ${attempts}\n\n`;
  output += `${decorativeLine}`;

  return {
    success: true,
    message: output
  };
}

// Admin command - reveal answer
function revealAnswer(userId, adminIds = []) {
  if (!adminIds.includes(userId)) {
    return {
      success: false,
      message: "❌ Arahan ini hanya untuk admin!"
    };
  }

  if (!activeGame) {
    return {
      success: false,
      message: "❌ Tiada permainan aktif!"
    };
  }

  const decorativeLine = "<a:SAC_zzaline:878680793386483712>".repeat(12);
  
  let output = `${decorativeLine}\n\n`;
  output += `🔐 **Admin Preview**\n\n`;
  output += `🔢 **Jawapan:** ||${secretNumber.toLocaleString()}||\n`;
  output += `📊 **Percubaan semasa:** ${attempts}\n\n`;
  output += `-# Hanya admin boleh nampak mesej ini\n\n`;
  output += `${decorativeLine}`;

  return {
    success: true,
    message: output
  };
}

// Get game status
function getGameStatus() {
  return {
    active: activeGame,
    attempts: attempts,
    startedBy: startedBy,
    channel: gameChannel
  };
}

// Export functions
module.exports = {
  startGame,
  guessNumber,
  stopGame,
  revealAnswer,
  getGameStatus,
  getActiveGame: () => activeGame
};

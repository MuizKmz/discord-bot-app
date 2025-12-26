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
    "<a:Blink:885761779249061908> **Terlalu Tinggi!** *Eh… awak jawab ikut nombor IC ke ni?*",
    "<:GF_Mal_Confuse:1096437980681486419> **CIKGU TERKEJUT! Tinggi sangat!** *Turunlah sikit, cikgu pening dah* <a:SAC_cikgumarah:1095596884325842954>",
    "<:1SAC_ksendu:940226152440688710> *Ni bukan soalan KBAT tahap universiti…* ***Turun lagi, anak murid!***",
    "<a:KekHappy:885761774882803732> **Jawapan awak ni tinggi sampai cikgu rasa rendah diri.** *Turunlah… cikgu merayu dengan penuh adab*",
    "<a:SAC_CatBite:1169137032262582325> **Tinggi sangat ni…** *cikgu kena angkat tangan minta tolong.*",
    "<a:SAC_cikgumarah:1095596884325842954> ***Ini bukan menara KLCC, tak perlu setinggi itu.***"
  ],
  tooLowExtreme: [
    "<:SAC_Pain:880040007400849448> **Rendah sangat!** *Terlalu rendah! Fikir yang lebih, lebih tinggi lagi. Terlalu jauh tu!*",
    "<a:SAC_CatCrying:885761781870497832> **CIKGU SEDIH! Awak meneka dari Darjah 1 ke ni?** *Rendah sangat! Naikkan lagi.*",
    "<a:SAC_cikgumarah:1095596884325842954> *Cikgu ajar tadi guna kalkulator kan?* ***Naik lagi, anak murid!***",
    "<a:AdmireHappy:885761775562280971> ***Naiklah lagi… cikgu janji tak ketawa.***",
    "<:1SAC_ksendu:940226152440688710> ***Rendah betul ni, calculator awak habis bateri ke?***"
  ],
  
  // Difference 10,000,000 - 99,999,999
  tooHighFar: [
    "<a:FlamePurple_SAC:1083763772423938118> **Dah panas sikit, tapi awak masih terlebih jawab.** *Cuba turunkan lagi....slow-slow*",
    "<a:BongoCat:938259209185812480> **Okay, Cikgu nampak usaha!** *Turun sikit lagi~*",
    "<a:SAC_cikgumarah:1095596884325842954> *Jangan gelojoh, ini bukan ujian larian 100m* ***Turun sikit lagi!***",
    "<:1SAC_ksmile:940226219260129281> **Cuba turunkan sikit… sikit je… jangan ego sangat.**",
    "<a:Bang:885761781459468328> **Cikgu ajar tambah dan tolak, bukan roket sains.** *Turunkan roket tu sekarang~*"
  ],
  tooLowFar: [
    "<a:FlameBlue_SAC:1083763847145459762> **Masih rendah** *Dah dekat, tapi masih bawah~*",
    "<a:BongoCat:938259209185812480> **Okay, Cikgu nampak usaha!** *Cuba naikkan sikit lagi, jangan give up!*",
    "<:1SAC_klove:940226178885767198> **Cikgu bagi hint:** *Jawapan lebih tinggi dari ni*"
  ],
  
  // Difference 1,000,000 - 9,999,999
  tooHighClose: [
    "<a:AUM_LOOKBEHIND:938261465410994187> **Eh Ehhh!** *Dah hampir dekat, turun sikit je~*",
    "<a:FlameYellow_SAC:1083763793856823447> **Panas dah ni!** *Jawapan awak tinggi sikit je, turunkan sedikitttt*"
  ],
  tooLowClose: [
    "<a:SAC_CuteBoyLaugh:1169151074079359057> **Sejukk! sikit lagi~** *Jawapan awak rendah sikit je, naik sikit je~*",
    "<a:SAC_Pandabee:888458171826438225> **Sejuk sikit lagi!** *Jawapan awak rendah sikit je, naikkan sedikitttt*"
  ],
  
  // Difference 1 - 999,999
  tooHighVeryClose: [
    "<a:Hoho:885761779538472970> **Cikgu dah berdiri belakang** <a:AUM_LOOKBEHIND:938261465410994187> *Dah dekat sangat ni! turun sikit je..*",
    "<a:SAC_aaparty2:878675028282052708> **Cikgu dah berdiri belakang** <a:AUM_LOOKBEHIND:938261465410994187> *Cuba adjust bawah sikit lagi, jangan gemuruh*"
  ],
  tooLowVeryClose: [
    "<a:Hoho:885761779538472970> **Cikgu dah berdiri belakang** <a:AUM_LOOKBEHIND:938261465410994187> *Dah dekat sangat ni! naik sikit je..*",
    "<a:SAC_qubycheer:888459166438555659> **Cikgu dah berdiri belakang** <a:AUM_LOOKBEHIND:938261465410994187> *Cuba adjust atas sikit lagi, jangan gemuruh*"
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
    const oldNumber = secretNumber;
    const oldAttempts = attempts;
    
    // Award points for NUMBER GAME (gameType = 'no')
    if (addPoints) {
      addPoints(message.author.id, message.author.username, 1, `teka-no-${secretNumber}`, 'no');
    }
    
    // Generate new number for next round
    secretNumber = generateRandomNumber(1, 100000000);
    attempts = 0;
    
    console.log(`🎮 New round! Secret number: ${secretNumber}`);
    
    let output = `${decorativeLine}\n\n`;
    output += `<a:SAC_zzBunnywow:919772019099312190> **BETUL, ANAK MURID!**\n`;
    output += `***Cikgu bangga dengan awak*** <a:SAC_aaparty2:878675028282052708>\n\n`;
    output += `**Jawapan yang betul ialah ${oldNumber.toLocaleString()}**\n\n`;
    output += `📊 **Statistik:**\n`;
    output += `├─ Percubaan: **${oldAttempts}** kali\n`;
    output += `├─ Pemenang: <@${message.author.id}>\n`;
    output += `└─ Mata: **+1 mata**\n\n`;
    output += `*Sila ambil bintang ni <a:YellowStar_SAC:1036618688834576384> dan duduk.*\n\n`;
    output += `${decorativeLine}\n\n`;
    
    // Next round message
    output += `## <a:FlamePurple_SAC:1083763772423938118> Nombor Seterusnya Jommm!\n\n`;
    output += `-# Taip nombor baharu untuk meneka\n`;
    output += `-# Cuba teka nombor seterusnya!\n\n`;
    output += `${decorativeLine}`;
    
    return {
      success: true,
      message: output,
      won: true,
      continues: true
    };
  }
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

// games/bot-teka-huruf.js
// Word Guessing Game Logic

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

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

// ===== KAMUS MAKNA PERKATAAN =====
const WORD_MEANINGS = {
  // A
  "abur": "Berselerak atau bersepah; tidak teratur",
  "adinda": "Panggilan mesra untuk adik perempuan atau orang yang lebih muda",
  "afwah": "Khabar angin atau cerita yang tidak pasti kebenarannya",
  "alu": "Alat penumbuk yang digunakan bersama lesung untuk menumbuk padi",
  "angklung": "Alat muzik tradisional yang diperbuat daripada buluh",
  "arif": "Bijaksana dan berpengetahuan tinggi",
  "arkian": "Kata penghubung bermaksud 'maka' atau 'adalah' dalam hikayat lama",
  
  // B
  "bahana": "Bunyi yang kuat dan bergema; dentuman",
  "balada": "Cerita atau lagu yang menyedihkan",
  "balai": "Bangunan atau dewan tempat berhimpun",
  "balainobat": "Tempat rawatan tradisional; rumah ubat",
  "balairongseri": "Balai tempat raja menerima tetamu kehormat",
  "balairung": "Dewan besar di istana tempat raja bersemayam",
  "balian": "Dukun atau bomoh yang merawat penyakit",
  "baligh": "Cukup umur atau dewasa menurut hukum Islam",
  "belanga": "Periuk besar yang diperbuat daripada tanah liat atau logam",
  "belasungkawa": "Ucapan takziah atau simpati atas kematian",
  "belukar": "Kawasan yang dipenuhi semak samun dan pokok-pokok kecil",
  "bendera": "Kain yang dipasang pada tiang sebagai lambang atau tanda",
  "bendul": "Penghalang atau empangan air",
  "bentara": "Penyampai perintah raja; pegawai istana",
  "beradu": "Tidur atau berbaring (bahasa halus)",
  "berahi": "Perasaan cinta atau nafsu yang kuat",
  "beranda": "Serambi atau ruang terbuka di hadapan rumah",
  "beta": "Kata ganti diri pertama yang digunakan raja",
  "bidadari": "Makhluk kayangan yang cantik jelita",
  "biduanda": "Pegawai wanita di istana yang melayan permaisuri",
  "bonang": "Alat muzik gamelan yang diperbuat daripada gangsa",
  "bungkam": "Diam dan tidak bersuara",
  
  // C
  "cacau": "Kacau atau keliru; tidak teratur",
  "cakerawala": "Langit atau ufuk yang luas",
  "candawara": "Orang yang mengawal pintu istana",
  "cendana": "Kayu harum yang digunakan untuk membuat ukiran dan wangian",
  "cendera": "Hadiah atau pemberian kenang-kenangan",
  "ceritera": "Cerita atau kisah",
  "cindai": "Kain sutera berwarna-warni dengan corak cantik",
  "citra": "Gambaran atau imej",
  "cogan": "Kata-kata atau ungkapan",
  "cogankata": "Peribahasa atau kata-kata hikmah",
  "cokmar": "Tongkat atau kayu yang berhulu besi",
  
  // D
  "daif": "Lemah atau tidak kuat",
  "dangau": "Pondok kecil di ladang atau kebun",
  "daulat": "Kebesaran dan kekuasaan raja; martabat diraja",
  "dayang": "Hamba atau pelayan perempuan di istana",
  "dek": "Oleh sebab atau kerana",
  "dewan": "Balai atau bangunan besar tempat bersidang",
  "dian": "Pelita atau lampu minyak",
  "dodol": "Kuih tradisional yang manis dan melekit",
  "duli": "Debu; juga gelaran untuk raja (Duli Yang Maha Mulia)",
  
  // F
  "fajar": "Waktu subuh atau dini hari ketika matahari hendak terbit",
  "fiil": "Perbuatan atau kelakuan dalam tatabahasa Arab",
  "firasat": "Perasaan atau gerak hati tentang sesuatu yang akan terjadi",
  
  // G
  "gading": "Taring gajah yang berwarna putih kekuningan",
  "gambus": "Alat muzik petik tradisional Melayu",
  "gamelan": "Alat muzik tradisional Indonesia yang terdiri daripada gong dan bonang",
  "gamit": "Tarikan atau daya penarik; pesona",
  "gejala": "Tanda atau petanda sesuatu perkara",
  "geliga": "Batu permata yang dipercayai mempunyai kekuatan ghaib",
  "genderang": "Alat muzik pukul yang diperbuat daripada kulit",
  "gerimis": "Hujan halus dan renyai",
  "gering": "Sakit atau tidak sihat",
  "geruh": "Keruh atau tidak jernih",
  "gong": "Alat muzik pukul yang besar dan berbunyi nyaring",
  "goyah": "Tidak stabil atau hampir tumbang",
  "gundah": "Rasa bimbang dan gelisah",
  "gundik": "Isteri yang bukan isteri sah mengikut adat lama",
  "gurindam": "Pantun berkait yang mengandungi nasihat",
  
  // H
  "hadrah": "Nyanyian pujian kepada Nabi Muhammad SAW",
  "halaman": "Ruang terbuka di hadapan atau belakang rumah",
  "halilintar": "Kilat dan guruh; petir",
  "hamba": "Kata ganti diri yang merendah; juga bermaksud hamba abdi",
  "hikayat": "Cerita atau kisah lama",
  "hulubalang": "Panglima atau pahlawan yang gagah berani",
  
  // I
  "inang": "Pengasuh atau orang yang menjaga anak",
  "inderaloka": "Tempat kayangan; syurga",
  "irama": "Rentak atau alun bunyi dalam muzik",
  "istana": "Tempat kediaman raja atau sultan; rumah besar dan mewah",
  
  // J
  "jambiah": "Pisau belati kecil yang diselitkan di pinggang",
  "jampi": "Mantera atau doa untuk mengubati penyakit",
  "jauhari": "Ahli atau pakar dalam menilai permata",
  "jentayu": "Burung garuda dalam cerita Ramayana",
  "joget": "Tarian tradisional Melayu yang rancak",
  "jong": "Kapal besar yang digunakan untuk berperang atau berdagang",
  "jongkong": "Balak atau batang kayu yang besar",
  "jua": "Juga atau pun",
  "juragan": "Nakhoda atau kapten kapal",
  
  // K
  "kabut": "Wap air yang tebal di udara sehingga mengaburkan penglihatan",
  "kadam": "Pohon atau pokok yang besar",
  "kakanda": "Panggilan untuk abang atau kakak yang dihormati",
  "kalam": "Pena atau alat tulis; juga bermaksud kata-kata atau tulisan",
  "kandil": "Pelita atau lampu yang digantung",
  "kekang": "Tali yang dipasang di mulut kuda untuk mengawalnya",
  "kemilau": "Bersinar atau berkilauan",
  "kendi": "Bekas air yang diperbuat daripada tanah liat",
  "kenong": "Alat muzik gamelan yang berbunyi nyaring",
  "keris": "Senjata tajam tradisional Melayu dengan bilah berliku",
  "kerongsang": "Bros atau peniti hiasan yang diperbuat daripada emas",
  "kesumat": "Dendam atau rasa tidak puas hati",
  "khilaf": "Silap atau tersalah; lupa",
  "kirana": "Sinar atau cahaya yang terang",
  "kitab": "Buku atau tulisan; kitab suci",
  "kompang": "Rebana kecil yang dimainkan secara berkumpulan",
  "kukusan": "Bekas untuk mengukus makanan",
  
  // L
  "laksamana": "Panglima tentera laut yang tertinggi pangkatnya",
  "lali": "Lupa atau lengah",
  "langgam": "Gaya atau cara; juga sejenis nyanyian tradisional",
  "lara": "Sedih atau duka; sakit",
  "lasykar": "Tentera atau pasukan askar",
  "lemang": "Makanan yang dimasak dalam buluh",
  "lembing": "Senjata berupa tombak panjang",
  "lesung": "Alat untuk menumbuk padi yang diperbuat daripada kayu",
  "luluk": "Celak atau pewarna hitam untuk mata",
  
  // M
  "maakul": "Masuk akal atau munasabah",
  "mabur": "Mabuk atau pening",
  "madah": "Puji-pujian atau pujian",
  "maharaja": "Raja yang memerintah beberapa negeri; raja besar",
  "mahkota": "Mahkota diraja yang dipakai di kepala raja",
  "mahligai": "Istana atau rumah yang tinggi dan megah",
  "makam": "Kubur atau tempat menyemadikan mayat",
  "makyong": "Teater tradisional yang menggabungkan tarian, nyanyian dan lakonan",
  "mamang": "Bapa saudara; bapa angkat",
  "mangkat": "Meninggal dunia (bahasa halus untuk raja)",
  "manikam": "Permata atau batu mulia",
  "mantera": "Jampi atau kata-kata ghaib untuk tujuan tertentu",
  "maruah": "Kehormatan atau harga diri",
  "marwas": "Rebana kecil yang dimainkan dalam hadrah",
  "maslahat": "Kebaikan atau faedah",
  "masyghul": "Sibuk atau banyak kerja",
  "menora": "Tarian dan teater tradisional yang berasal dari Thailand",
  "meta": "Matlamat atau tujuan",
  "muafakat": "Persetujuan atau kesepakatan bersama",
  "mustika": "Permata yang dipercayai mempunyai kekuatan mistik",
  "musyawarah": "Perbincangan atau rundingan bersama",
  
  // N
  "nafiri": "Sangkakala atau trompet yang ditiup sebagai tanda perang",
  "naskhah": "Salinan atau turunan daripada sesuatu tulisan",
  "nirmala": "Bersih dan suci; murni",
  "nista": "Hina atau rendah martabat",
  "nobat": "Alat muzik diraja yang dimainkan pada upacara kebesaran",
  "nyiru": "Alat untuk menampi padi yang diperbuat daripada buluh",
  
  // P
  "pancawarna": "Lima warna; pelbagai warna",
  "panglima": "Ketua tentera atau pemimpin pasukan",
  "panji": "Bendera perang; tanda kebesaran",
  "pantun": "Sajak Melayu tradisional yang terdiri daripada empat baris",
  "patik": "Kata ganti diri untuk rakyat biasa kepada raja",
  "pawana": "Angin atau bayu",
  "pawang": "Orang yang mempunyai ilmu ghaib untuk mengawal binatang atau alam",
  "payang": "Jaring besar untuk menangkap ikan",
  "pedang": "Senjata tajam yang panjang",
  "pena": "Alat tulis; kalam",
  "perawis": "Sampan kecil yang ringan",
  "perigi": "Telaga atau sumur untuk mengambil air",
  "perisai": "Alat untuk menangkis senjata musuh; tameng",
  "permaisuri": "Isteri raja atau sultan",
  "permata": "Batu mulia yang berharga",
  "pusaka": "Barang peninggalan nenek moyang yang berharga",
  
  // R
  "ratna": "Permata atau batu mulia",
  "rebab": "Alat muzik gesek tradisional",
  "rebana": "Gendang kecil yang dimainkan dengan tangan",
  
  // S
  "sali": "Sejenis kain mahal yang halus",
  "santapan": "Makanan atau hidangan",
  "seantero": "Seluruh atau semua",
  "segara": "Laut atau lautan",
  "seloka": "Pantun atau syair ejekan",
  "sepoi": "Angin yang lembut dan sepoi-sepoi",
  "serambi": "Ruang terbuka di hadapan rumah; beranda",
  "serampang": "Tombak atau lembing kecil",
  "seri": "Kemuliaan atau keagungan; juga cahaya yang indah",
  "serunai": "Alat muzik tiup tradisional Melayu",
  "serunding": "Makanan yang diperbuat daripada kelapa dan gula",
  "singgahsana": "Takhta atau kerusi kebesaran raja",
  "sitar": "Alat muzik petik tradisional India",
  "surat": "Tulisan atau mesej bertulis",
  "sutera": "Kain yang halus dan berkilat",
  "syahbandar": "Ketua pelabuhan atau pegawai yang mengurus pelabuhan",
  "syair": "Puisi atau pantun panjang yang menceritakan kisah",
  
  // T
  "takhta": "Kerusi kebesaran raja; singgahsana",
  "tamadun": "Peradaban atau kebudayaan yang tinggi",
  "tameng": "Perisai atau alat untuk menangkis serangan",
  "tampi": "Alat untuk menampi padi; nyiru",
  "tatasusila": "Adab atau sopan santun",
  "tatkala": "Ketika atau semasa",
  "tempayan": "Bekas besar yang diperbuat daripada tanah liat",
  "tempurung": "Kulit keras kelapa yang digunakan sebagai bekas",
  "tinta": "Cecair untuk menulis; dakwat",
  "titah": "Perintah atau kata-kata raja",
  "tokoh": "Orang yang terkenal atau terkemuka",
  "tombak": "Senjata berupa lembing yang tajam",
  "tuanku": "Gelaran untuk raja atau sultan",
  "tuarang": "Barang pusaka yang mempunyai kuasa ghaib",
  
  // W
  "warkah": "Surat atau mesej bertulis",
  "wasilah": "Jalan atau cara untuk mencapai sesuatu",
  "wayang": "Persembahan teater atau sandiwara",
  "wayangkul": "Wayang kulit; boneka bayang-bayang",
  
  // Z
  "zapin": "Tarian tradisional Melayu yang berasal dari Arab",
  
  // Exclusive words
  "kembali": "Pulang atau balik ke tempat asal",
  "klasik": "Lama tetapi kekal indah; tradisional",
  "mengangkat": "Meninggikan atau memulihkan; juga mengambil",
  "warisan": "Pusaka atau peninggalan nenek moyang",
  "pendidikan": "Proses pembelajaran dan pengajaran ilmu",
  "menyemai": "Menanam benih; memupuk atau mengembangkan",
  "budaya": "Cara hidup dan adat resam sesuatu masyarakat",
  "ilmu": "Pengetahuan atau kepandaian"
};

// Game state
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

// ===== Helper Functions =====

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function formatWordWithBackticks(word, guessedLetters) {
  let result = "";
  for (let i = 0; i < word.length; i++) {
    const c = word[i];
    if (guessedLetters.has(c)) {
      result += `\`${c.toUpperCase()}\``;
    } else {
      result += "`_`";
    }
    if (i < word.length - 1) {
      result += " ";
    }
  }
  return result;
}

function formatCompletedWord(word) {
  let result = "";
  for (let i = 0; i < word.length; i++) {
    const c = word[i];
    result += `~~**${c.toUpperCase()}**~~`;
    if (i < word.length - 1) {
      result += " ";
    }
  }
  return result;
}

function formatUpcomingWord(word) {
  let result = "";
  for (let i = 0; i < word.length; i++) {
    result += "`_`";
    if (i < word.length - 1) {
      result += " ";
    }
  }
  return result;
}

async function getWordMeaning(word, db = null, USE_DATABASE = false) {
  try {
    if (USE_DATABASE && db) {
      const dbMeaning = await db.getWordMeaningFromDB(word);
      if (dbMeaning) {
        return dbMeaning;
      }
    }
    
    if (WORD_MEANINGS[word.toLowerCase()]) {
      return WORD_MEANINGS[word.toLowerCase()];
    }
    
    const response = await fetch(`http://kateglo.com/api.php?format=json&phrase=${encodeURIComponent(word)}`);
    if (!response.ok) {
      throw new Error('API request failed');
    }
    
    const data = await response.json();
    if (data.kateglo && data.kateglo.definition) {
      const definitions = data.kateglo.definition;
      const meanings = definitions.slice(0, 2).map(def => def.def_text).join('; ');
      return meanings || 'Perkataan tradisional Melayu';
    }
    
    return 'Perkataan tradisional Melayu';
  } catch (error) {
    console.error('❌ Error fetching word meaning:', error);
    return 'Perkataan tradisional Melayu';
  }
}

function renderBoard(showHeader = false, isNextWord = false) {
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
    console.log(`Word: "${currentWord}", Is Exclusive: ${isExclusive}`);
    diamondEmoji = isExclusive
      ? ` <a:SAC_diamond1:893046074888040499>` 
      : ` <a:SAC_diamond2:893045927009472542>`;
  }
  output += `Perkataan: ${formatWordWithBackticks(currentWord, guessedLetters)}${diamondEmoji}\n\n`;
  output += `${decorativeLine}`;

  return output;
}

async function sendLongMessage(channel, content) {
  const MAX_LENGTH = 1900;
  
  if (content.length <= MAX_LENGTH) {
    try {
      await channel.send(content);
    } catch (error) {
      console.error('❌ Error sending message:', error.message);
      console.error('   Message length:', content.length);
    }
    return;
  }
  
  const lines = content.split('\n');
  let currentChunk = '';
  
  for (const line of lines) {
    if ((currentChunk + line + '\n').length > MAX_LENGTH) {
      if (currentChunk) {
        try {
          await channel.send(currentChunk.trim());
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error('❌ Error sending chunk:', error.message);
        }
        currentChunk = '';
      }
    }
    currentChunk += line + '\n';
  }
  
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
  
  const wordsPerPage = 60;
  const totalPages = Math.ceil(sortedWords.length / wordsPerPage);
  const pages = [];
  
  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    const startIdx = pageNum * wordsPerPage;
    const endIdx = Math.min(startIdx + wordsPerPage, sortedWords.length);
    const pageWords = sortedWords.slice(startIdx, endIdx);
    
    let pageContent = `${decorativeLine}\n\n`;
    pageContent += `## ${diamond} ${title}`;
    
    if (totalPages > 1) {
      pageContent += ` - 📄 Halaman ${pageNum + 1}/${totalPages}`;
    }
    
    pageContent += `\n\n-# Total: **${words.length}** perkataan`;
    
    if (totalPages > 1) {
      pageContent += ` | Paparan: ${startIdx + 1}-${endIdx}`;
    }
    
    pageContent += `\n\n`;
    
    for (let i = 0; i < pageWords.length; i += columns) {
      const row = pageWords.slice(i, i + columns);
      pageContent += row.map((word, idx) => `\`${startIdx + i + idx + 1}.\` ${word}`).join('  |  ') + '\n';
    }
    
    pageContent += `\n${decorativeLine}`;
    pages.push(pageContent);
  }
  
  return pages;
}

// Export game state and functions
module.exports = {
  // Data
  ORIGINAL_WORDS,
  EXCLUSIVE_WORDS,
  WORD_MEANINGS,
  
  // Game state
  getGameState: () => ({
    WORDS,
    currentWordIndex,
    currentWord,
    guessedLetters,
    chancesLeft,
    totalChances,
    active,
    completedWords,
    userCooldowns,
    usedExclusiveWords,
    usedNormalWords
  }),
  
  setGameState: (state) => {
    if (state.WORDS !== undefined) WORDS = state.WORDS;
    if (state.currentWordIndex !== undefined) currentWordIndex = state.currentWordIndex;
    if (state.currentWord !== undefined) currentWord = state.currentWord;
    if (state.guessedLetters !== undefined) guessedLetters = state.guessedLetters;
    if (state.chancesLeft !== undefined) chancesLeft = state.chancesLeft;
    if (state.totalChances !== undefined) totalChances = state.totalChances;
    if (state.active !== undefined) active = state.active;
    if (state.completedWords !== undefined) completedWords = state.completedWords;
    if (state.userCooldowns !== undefined) userCooldowns = state.userCooldowns;
    if (state.usedExclusiveWords !== undefined) usedExclusiveWords = state.usedExclusiveWords;
    if (state.usedNormalWords !== undefined) usedNormalWords = state.usedNormalWords;
  },
  
  // Helper functions
  shuffleArray,
  formatWordWithBackticks,
  formatCompletedWord,
  formatUpcomingWord,
  getWordMeaning,
  renderBoard,
  sendLongMessage,
  formatWordList
};

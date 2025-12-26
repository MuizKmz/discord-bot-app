// database.js - PostgreSQL Database Module
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initDatabase() {
  const client = await pool.connect();
  
  try {
    // Create leaderboard table
    await client.query(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        user_id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        points INTEGER DEFAULT 0,
        points_huruf INTEGER DEFAULT 0,
        points_no INTEGER DEFAULT 0,
        words TEXT[] DEFAULT ARRAY[]::TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add new columns if they don't exist (for existing databases)
    await client.query(`
      ALTER TABLE leaderboard 
      ADD COLUMN IF NOT EXISTS points_huruf INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS points_no INTEGER DEFAULT 0
    `).catch(() => {
      // Columns might already exist, ignore error
    });
    
    // Migrate existing points to points_huruf (all existing points are from word game)
    await client.query(`
      UPDATE leaderboard 
      SET points_huruf = points 
      WHERE points_huruf = 0 AND points > 0
    `).catch(() => {
      // Already migrated, ignore
    });
    
    // Create word meanings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS word_meanings (
        word VARCHAR(255) PRIMARY KEY,
        meaning TEXT NOT NULL,
        added_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Load leaderboard from database
async function loadLeaderboardFromDB() {
  const client = await pool.connect();
  
  try {
    const result = await client.query('SELECT * FROM leaderboard');
    const leaderboard = {};
    
    result.rows.forEach(row => {
      leaderboard[row.user_id] = {
        username: row.username,
        points: row.points,
        points_huruf: row.points_huruf || 0,
        points_no: row.points_no || 0,
        words: row.words || []
      };
    });
    
    console.log(`✅ Leaderboard loaded from database: ${result.rows.length} users`);
    return leaderboard;
  } catch (error) {
    console.error('❌ Error loading leaderboard from database:', error);
    return {};
  } finally {
    client.release();
  }
}

// Save entire leaderboard to database
async function saveLeaderboardToDB(leaderboard) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    for (const [userId, data] of Object.entries(leaderboard)) {
      await client.query(`
        INSERT INTO leaderboard (user_id, username, points, points_huruf, points_no, words, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          username = EXCLUDED.username,
          points = EXCLUDED.points,
          points_huruf = EXCLUDED.points_huruf,
          points_no = EXCLUDED.points_no,
          words = EXCLUDED.words,
          updated_at = CURRENT_TIMESTAMP
      `, [userId, data.username, data.points, data.points_huruf || 0, data.points_no || 0, data.words]);
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error saving leaderboard to database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Add or update single user with game type support
async function updateUserPoints(userId, username, points, word, gameType = 'huruf') {
  const client = await pool.connect();
  
  try {
    // First, get current user data
    const result = await client.query(
      'SELECT points, points_huruf, points_no, words FROM leaderboard WHERE user_id = $1',
      [userId]
    );
    
    let newPoints = points;
    let newPointsHuruf = 0;
    let newPointsNo = 0;
    let newWords = word ? [word] : [];
    
    if (result.rows.length > 0) {
      // User exists, increment appropriate points
      newPoints = result.rows[0].points + points;
      newPointsHuruf = result.rows[0].points_huruf || 0;
      newPointsNo = result.rows[0].points_no || 0;
      
      // Add points to specific game type
      if (gameType === 'huruf') {
        newPointsHuruf += points;
      } else if (gameType === 'no') {
        newPointsNo += points;
      }
      
      newWords = [...(result.rows[0].words || [])];
      if (word) newWords.push(word);
    } else {
      // New user
      if (gameType === 'huruf') {
        newPointsHuruf = points;
      } else if (gameType === 'no') {
        newPointsNo = points;
      }
    }
    
    // Upsert user
    await client.query(`
      INSERT INTO leaderboard (user_id, username, points, points_huruf, points_no, words, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id)
      DO UPDATE SET
        username = EXCLUDED.username,
        points = EXCLUDED.points,
        points_huruf = EXCLUDED.points_huruf,
        points_no = EXCLUDED.points_no,
        words = EXCLUDED.words,
        updated_at = CURRENT_TIMESTAMP
    `, [userId, username, newPoints, newPointsHuruf, newPointsNo, newWords]);
    
  } catch (error) {
    console.error('❌ Error updating user points:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get top players
async function getTopPlayersFromDB(limit = 10) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'SELECT user_id, username, points, words FROM leaderboard ORDER BY points DESC LIMIT $1',
      [limit]
    );
    
    return result.rows.map(row => ({
      userId: row.user_id,
      username: row.username,
      points: row.points,
      words: row.words || []
    }));
  } catch (error) {
    console.error('❌ Error getting top players:', error);
    return [];
  } finally {
    client.release();
  }
}

// Reset leaderboard
async function resetLeaderboardDB() {
  const client = await pool.connect();
  
  try {
    await client.query('TRUNCATE TABLE leaderboard');
    console.log('✅ Leaderboard reset');
  } catch (error) {
    console.error('❌ Error resetting leaderboard:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Migrate JSON data to database (one-time migration)
async function migrateJSONToDatabase() {
  const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');
  
  if (!fs.existsSync(LEADERBOARD_FILE)) {
    console.log('⚠️ No leaderboard.json found, skipping migration');
    return;
  }
  
  try {
    const data = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
    const leaderboard = JSON.parse(data);
    
    if (Object.keys(leaderboard).length === 0) {
      console.log('⚠️ Leaderboard.json is empty, skipping migration');
      return;
    }
    
    console.log(`🔄 Migrating ${Object.keys(leaderboard).length} users from JSON to database...`);
    await saveLeaderboardToDB(leaderboard);
    console.log('✅ Migration completed successfully!');
    
    // Backup the JSON file
    const backupFile = path.join(__dirname, `leaderboard.json.backup.${Date.now()}`);
    fs.copyFileSync(LEADERBOARD_FILE, backupFile);
    console.log(`✅ JSON backed up to: ${backupFile}`);
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
}

// Close database connection
async function closeDatabase() {
  await pool.end();
  console.log('✅ Database connection closed');
}

// ===== WORD MEANINGS FUNCTIONS =====

// Get word meaning from database
async function getWordMeaningFromDB(word) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'SELECT meaning FROM word_meanings WHERE LOWER(word) = LOWER($1)',
      [word]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0].meaning;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting word meaning from database:', error);
    return null;
  } finally {
    client.release();
  }
}

// Set word meaning in database
async function setWordMeaningInDB(word, meaning, addedBy) {
  const client = await pool.connect();
  
  try {
    await client.query(`
      INSERT INTO word_meanings (word, meaning, added_by, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (word)
      DO UPDATE SET
        meaning = EXCLUDED.meaning,
        added_by = EXCLUDED.added_by,
        updated_at = CURRENT_TIMESTAMP
    `, [word.toLowerCase(), meaning, addedBy]);
    
    return true;
  } catch (error) {
    console.error('❌ Error setting word meaning in database:', error);
    return false;
  } finally {
    client.release();
  }
}

// Delete word meaning from database
async function deleteWordMeaningFromDB(word) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'DELETE FROM word_meanings WHERE LOWER(word) = LOWER($1)',
      [word]
    );
    
    return result.rowCount > 0;
  } catch (error) {
    console.error('❌ Error deleting word meaning from database:', error);
    return false;
  } finally {
    client.release();
  }
}

// Get all word meanings count
async function getWordMeaningsCount() {
  const client = await pool.connect();
  
  try {
    const result = await client.query('SELECT COUNT(*) FROM word_meanings');
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('❌ Error getting word meanings count:', error);
    return 0;
  } finally {
    client.release();
  }
}

module.exports = {
  initDatabase,
  loadLeaderboardFromDB,
  saveLeaderboardToDB,
  updateUserPoints,
  getTopPlayersFromDB,
  resetLeaderboardDB,
  migrateJSONToDatabase,
  closeDatabase,
  getWordMeaningFromDB,
  setWordMeaningInDB,
  deleteWordMeaningFromDB,
  getWordMeaningsCount
};

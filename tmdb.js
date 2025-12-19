// 📁 tmdb.js
const axios = require('axios');
require('dotenv').config();

async function fetchMovieData(query) {
  const res = await axios.get(`https://api.themoviedb.org/3/search/movie`, {
    params: {
      query,
      api_key: process.env.TMDB_API_KEY
    }
  });
  return res.data.results.map(m => ({
    id: m.id,
    title: m.title,
    release_date: m.release_date
  }));
}

module.exports = { fetchMovieData };

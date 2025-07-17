const bcrypt = require('bcrypt');

// Replace this with your actual API key
const API_KEY = 'api key here';
const saltRounds = 10;  // Define the number of salt rounds for hashing

// Hash the API key
bcrypt.hash(API_KEY, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error hashing the API key:', err);
  } else {
    console.log('Hashed API key:', hash);
  }
});

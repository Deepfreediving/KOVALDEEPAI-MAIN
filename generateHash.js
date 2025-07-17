const bcrypt = require('bcrypt');

// Replace this with your actual API key
const API_KEY = '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';
const saltRounds = 10;  // Define the number of salt rounds for hashing

// Hash the API key
bcrypt.hash(API_KEY, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error hashing the API key:', err);
  } else {
    console.log('Hashed API key:', hash);
  }
});

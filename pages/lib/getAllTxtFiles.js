const fs = require('fs');
const path = require('path');

function getAllTxtFiles(directory) {
  const files = fs.readdirSync(directory);
  const txtFiles = files.filter(file => file.endsWith('.txt'));
  return txtFiles.map(file => ({
    fullPath: path.join(directory, file),
    relativePath: file
  }));
}

module.exports = getAllTxtFiles;

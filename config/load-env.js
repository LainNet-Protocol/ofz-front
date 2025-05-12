const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables from parent directory's .env file
const parentEnvPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(parentEnvPath)) {
  const parentEnv = dotenv.config({ path: parentEnvPath });
  
  if (parentEnv.error) {
    console.error('Error loading parent .env file:', parentEnv.error);
  } else {
    console.log('Successfully loaded environment variables from parent directory');
  }
}

module.exports = {}; 
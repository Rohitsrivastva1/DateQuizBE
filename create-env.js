const fs = require('fs');
const path = require('path');

const envContent = `# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=datequiz
DB_USER=postgres
DB_PASSWORD=9695700251@Rohit

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-for-development

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
`;

const envPath = path.join(__dirname, '.env');

try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully!');
    console.log('📁 Location:', envPath);
    console.log('🔧 You can now start the server with: npm start');
} catch (error) {
    console.error('❌ Error creating .env file:', error.message);
    console.log('📝 Please create the .env file manually with the content above');
} 
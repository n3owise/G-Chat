const db = require('./config/database');

async function testConnection() {
    try {
        const [rows] = await db.query('SELECT COUNT(*) as count FROM users');
        console.log('✅ Database connected successfully!');
        console.log(`Total users in database: ${rows[0].count}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
}

testConnection();

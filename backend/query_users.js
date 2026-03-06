require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
    try {
        const config = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'root',
            database: process.env.DB_NAME || 'gchat',
        };
        const connection = await mysql.createConnection(config);
        const [rows] = await connection.execute('SELECT uid, name FROM users LIMIT 10');
        console.log('\n--- AVAILABLE TEST USERS ---');
        console.table(rows);
        console.log('----------------------------\n');
        await connection.end();
    } catch (err) {
        console.error('Database connection error:', err);
    }
}
main();

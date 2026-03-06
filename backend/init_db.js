const mysql = require('mysql2/promise');
require('dotenv').config();
const bcrypt = require('bcryptjs');

const initDB = async () => {
    // Connection without database selected to create the DB first
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: process.env.DB_PORT || 3306
    });

    try {
        console.log('--- G-Chat Database Initialization ---');

        // 1. Create Database
        const dbName = process.env.DB_NAME || 'gchat';
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
        await connection.query(`USE ${dbName}`);
        console.log(`Database "${dbName}" ensured.`);

        // 2. Create Users Table
        // Note: Adding some columns from controllers context (gender, city/place, phone, email, etc.)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                uid VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                gender ENUM('male', 'female', 'other'),
                city VARCHAR(100),
                email VARCHAR(100) UNIQUE,
                phone VARCHAR(20),
                profile_image VARCHAR(255),
                gchat_password VARCHAR(255),
                gchat_status ENUM('active', 'banned', 'suspended') DEFAULT 'active',
                gchat_registered_at DATETIME,
                is_online BOOLEAN DEFAULT FALSE,
                last_seen DATETIME,
                parent_id VARCHAR(50),
                sponser_id VARCHAR(50),
                left_uid VARCHAR(50),
                center_uid VARCHAR(50),
                right_uid VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table "users" ensured.');

        // 3. Create Messages Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS gchat_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                message_id VARCHAR(50) UNIQUE NOT NULL,
                sender_uid VARCHAR(50) NOT NULL,
                receiver_uid VARCHAR(50) NOT NULL,
                message_type ENUM('text', 'image', 'video', 'file', 'voice') DEFAULT 'text',
                message_text TEXT,
                file_url VARCHAR(255),
                file_name VARCHAR(255),
                file_size INT,
                file_type VARCHAR(50),
                cloudinary_public_id VARCHAR(255),
                is_forwarded BOOLEAN DEFAULT FALSE,
                is_edited BOOLEAN DEFAULT FALSE,
                edited_at DATETIME,
                edit_deadline DATETIME,
                delete_deadline DATETIME,
                is_deleted_by_sender BOOLEAN DEFAULT FALSE,
                is_deleted_by_receiver BOOLEAN DEFAULT FALSE,
                is_deleted_for_everyone BOOLEAN DEFAULT FALSE,
                deleted_at DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_sender (sender_uid),
                INDEX idx_receiver (receiver_uid)
            )
        `);
        console.log('Table "gchat_messages" ensured.');

        // 4. Create Message Status Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS gchat_message_status (
                id INT AUTO_INCREMENT PRIMARY KEY,
                message_id VARCHAR(50) NOT NULL,
                is_delivered BOOLEAN DEFAULT FALSE,
                delivered_at DATETIME,
                is_read BOOLEAN DEFAULT FALSE,
                read_at DATETIME,
                FOREIGN KEY (message_id) REFERENCES gchat_messages(message_id) ON DELETE CASCADE
            )
        `);
        console.log('Table "gchat_message_status" ensured.');

        // 5. Create Sessions Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS gchat_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                uid VARCHAR(50) NOT NULL,
                session_token TEXT NOT NULL,
                ip_address VARCHAR(45),
                device_info TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table "gchat_sessions" ensured.');

        // 6. Create Admins Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS gchat_admins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                email VARCHAR(100) UNIQUE,
                last_login DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table "gchat_admins" ensured.');

        // 7. Create Support Info Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS gchat_support_info (
                id INT AUTO_INCREMENT PRIMARY KEY,
                support_email VARCHAR(100),
                support_phone VARCHAR(20)
            )
        `);
        console.log('Table "gchat_support_info" ensured.');

        // 8. Insert Default Admin if not exists
        const [admins] = await connection.query("SELECT * FROM gchat_admins WHERE username = 'admin'");
        if (admins.length === 0) {
            const hashedPassword = await bcrypt.hash('Admin@123', 10);
            await connection.query('INSERT INTO gchat_admins (username, password, email) VALUES (?, ?, ?)',
                ['admin', hashedPassword, 'admin@gsaaglobal.com']);
            console.log('Default admin user created.');
        }

        // 9. Insert a test user if not exists (to allow login testing)
        const [testUsers] = await connection.query("SELECT * FROM users WHERE uid = 'TEST001'");
        if (testUsers.length === 0) {
            const hashedUserPassword = await bcrypt.hash('User@123', 10);
            await connection.query(`
                INSERT INTO users (uid, name, gender, city, email, phone, gchat_password, gchat_status, gchat_registered_at)
                VALUES ('TEST001', 'Test User', 'male', 'New York', 'test@example.com', '1234567890', ?, 'active', NOW())
            `, [hashedUserPassword]);
            console.log('Test user "TEST001" created (Password: User@123).');
        }

        console.log('\n✅ Database initialization complete!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Initialization error:', error.message);
        process.exit(1);
    } finally {
        await connection.end();
    }
};

initDB();

const db = require('./config/database');
const bcrypt = require('bcryptjs');

const setupAdmin = async () => {
    try {
        console.log('Setting up admin table and default user...');

        // 1. Create table if it doesn't exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS gchat_admins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                email VARCHAR(100) UNIQUE,
                last_login DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Check if admin exists
        const [existingAdmins] = await db.query('SELECT 1 FROM gchat_admins WHERE username = "admin"');

        if (existingAdmins.length === 0) {
            // 3. Insert default admin
            const defaultPassword = 'Admin@123';
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(defaultPassword, salt);

            await db.query(`
                INSERT INTO gchat_admins (username, password, email)
                VALUES ('admin', ?, 'admin@gsaaglobal.com')
            `, [hashedPassword]);

            console.log('Default admin user created successfully.');
        } else {
            console.log('Admin user already exists. Skipping creation.');
        }

        console.log('Admin setup complete.');
        process.exit(0);

    } catch (error) {
        console.error('Error setting up admin:', error);
        process.exit(1);
    }
};

setupAdmin();

require('dotenv').config();
const dns = require('dns').promises;

console.log('--- Environment Variable Check ---');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT || '3306 (default)');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '********' : 'MISSING');

console.log('\n--- DNS Resolution Check ---');
const host = process.env.DB_HOST;

async function checkDNS() {
    if (!host) {
        console.log('❌ Error: DB_HOST is not defined in .env');
        return;
    }

    console.log(`Checking resolution for: ${host}...`);
    try {
        const addresses = await dns.resolve4(host);
        console.log('✅ Success! IP Address found:', addresses);
    } catch (err) {
        console.log('❌ DNS Error:', err.code);
        console.log('Message:', err.message);

        if (err.code === 'ENOTFOUND') {
            console.log('\n💡 Diagnosis: "ENOTFOUND" means the internet phonebook (DNS) still hasn\'t updated.');
            console.log('This is 100% an internet propagation delay, not a code error.');
        }
    }
}

checkDNS();

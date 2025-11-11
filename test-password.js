const bcrypt = require('bcryptjs');
const { Client } = require('pg');

async function testPasswordComparison() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'qr_saas',
    user: 'qr_user',
    password: 'qr_password',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Get the stored password hash
    const result = await client.query(
      'SELECT password_hash FROM admin_users WHERE email = $1',
      ['admin@qr-saas.com']
    );

    if (result.rows.length === 0) {
      console.log('User not found');
      return;
    }

    const storedHash = result.rows[0].password_hash;
    console.log('Stored hash:', storedHash);

    // Test password comparison
    const password = 'Admin@123456';
    console.log('Testing password:', password);

    const isMatch = await bcrypt.compare(password, storedHash);
    console.log('Password match result:', isMatch);

    // Test hash generation
    const newHash = await bcrypt.hash(password, 12);
    console.log('Newly generated hash:', newHash);

    const newHashMatch = await bcrypt.compare(password, newHash);
    console.log('New hash match result:', newHashMatch);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

testPasswordComparison();
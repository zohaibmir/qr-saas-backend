const bcrypt = require('bcryptjs');
const { Client } = require('pg');

async function resetAdminPassword() {
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

    // Hash the password
    const password = 'Admin@123456';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    console.log('Generated hash:', hashedPassword);

    // Update the admin user password
    const updateQuery = `
      UPDATE admin_users 
      SET password_hash = $1, updated_at = NOW() 
      WHERE email = 'admin@qr-saas.com'
    `;

    const result = await client.query(updateQuery, [hashedPassword]);
    console.log('Password updated for admin@qr-saas.com');
    console.log('Affected rows:', result.rowCount);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

resetAdminPassword();
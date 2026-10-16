require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

async function main() {
  const args = process.argv.slice(2);
  const email = args[0] || 'admin@teluguiconawards.com';
  const newPassword = args[1];

  if (!newPassword) {
    process.exit(1);
  }

  if (newPassword.length < 6) {
    console.error('Error: New password must be at least 6 characters long.');
    process.exit(1);
  }

  try {
    console.log(`Connecting to database to locate user "${email}"...`);
    const [users] = await pool.query('SELECT id, name, email, role FROM users WHERE email = ?', [email]);

    if (!users || users.length === 0) {
      console.error(`User with email "${email}" was not found in the users table.`);
      const [all] = await pool.query('SELECT id, email, role FROM users');
      console.log('Existing users in database:', all);
      process.exit(1);
    }

    const user = users[0];
    console.log(`Hashing new password for "${user.name}" (${user.email}, Role: ${user.role})...`);
    const hash = await bcrypt.hash(newPassword, 10);

    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

main();

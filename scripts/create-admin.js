// Usage: npm run create-admin -- "Admin Name" admin@example.com 'StrongPass123'
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { password as passwordSchema } from '../src/validators/auth.validators.js';

const [name, email, password] = process.argv.slice(2);
if (!name || !email || !password) {
  console.error('Usage: npm run create-admin -- "<name>" <email> <password>');
  process.exit(1);
}

const check = passwordSchema.safeParse(password);
if (!check.success) {
  console.error(check.error.issues.map((i) => i.message).join('\n'));
  process.exit(1);
}

await connectDB();
const existing = await User.findOne({ email: email.toLowerCase() });
if (existing) {
  existing.role = 'admin';
  await existing.save();
  console.log(`Promoted existing user ${email} to admin`);
} else {
  await User.create({ name, email, password, role: 'admin', isEmailVerified: true });
  console.log(`Created admin ${email}`);
}
await disconnectDB();

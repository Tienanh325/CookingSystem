require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../src/models');
const sequelize = require('../src/config/database');
async function seed() {
  const [adminRole] = await db.VaiTro.findOrCreate({
    where: { tenVaiTro: 'ADMIN' },
    defaults: { moTa: 'Quản trị viên', trangThai: 1 },
  });
  await db.VaiTro.findOrCreate({
    where: { tenVaiTro: 'USER' },
    defaults: { moTa: 'Khách hàng', trangThai: 1 },
  });
  const email = process.env.ADMIN_EMAIL || 'admin@cookmate.local';
  if (await db.NguoiDung.findOne({ where: { email } })) {
    console.log('Admin already exists; password was not changed.');
    return;
  }
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(18).toString('base64url');
  if (password.length < 12) throw new Error('ADMIN_PASSWORD must have at least 12 characters');
  await db.NguoiDung.create({
    idVaiTro: adminRole.idVaiTro,
    hoTen: 'Quản trị Cookmate',
    email,
    matKhau: await bcrypt.hash(password, 12),
    emailDaXacMinh: 1,
    thoiGianXacMinhEmail: new Date(),
    trangThai: 1,
  });
  if (!process.env.ADMIN_PASSWORD) {
    await fs.writeFile(
      path.join(__dirname, '../.admin-credentials.local'),
      `Email: ${email}\nPassword: ${password}\n`,
      { flag: 'wx', mode: 0o600 },
    );
    console.log('Admin created. Local credentials: Backend/.admin-credentials.local (gitignored).');
  } else console.log('Admin created using ADMIN_EMAIL / ADMIN_PASSWORD.');
}
if (require.main === module)
  seed()
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    })
    .finally(() => sequelize.close());
module.exports = seed;

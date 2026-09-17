require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const sharp = require('sharp');
const assert = require('node:assert/strict');
const db = Object.fromEntries(Object.entries(require('../src/models')).filter(([name]) => !name.startsWith('Auth')));
const sequelize = require('../src/config/database');
const recipes = require('./demo-data');
const credentialsPath = path.join(__dirname, '../.demo-credentials.local');
const marker = 'COOKMATE_DEMO_V1';

async function seedDemo() {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo seed is for development only.');
  // Save generated credentials before insertion, so a later DB failure cannot lose passwords.
  let credentials;
  try { credentials = JSON.parse(await fs.readFile(credentialsPath, 'utf8')); }
  catch (e) {
    if (e.code !== 'ENOENT') throw e;
    credentials = Array.from({ length: 10 }, (_, i) => ({
      email: `demo.customer${String(i + 1).padStart(2, '0')}@cookmate.local`,
      password: crypto.randomBytes(18).toString('base64url'),
    }));
    await fs.writeFile(credentialsPath, JSON.stringify(credentials, null, 2), { flag: 'wx', mode: 0o600 });
  }
  assert.equal(credentials.length, 10);
  const hashes = await Promise.all(credentials.map(c => bcrypt.hash(c.password, 12)));
  const imageDir = path.join(__dirname, '../uploads');
  await fs.mkdir(imageDir, { recursive: true });
  for (let i = 0; i < recipes.length; i++) {
    const imagePath = path.join(imageDir, `demo-v1-recipe-${i + 1}.webp`);
    try { await fs.access(imagePath); } catch (e) {
      if (e.code !== 'ENOENT') throw e;
      const svg = `<svg width="800" height="500" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="500" fill="hsl(${25 + i * 12},65%,92%)"/><circle cx="400" cy="230" r="140" fill="white"/><circle cx="400" cy="230" r="112" fill="#f3d8ad"/><path d="M320 250 Q400 100 480 250 Q400 350 320 250" fill="#729958"/><text x="400" y="245" text-anchor="middle" font-size="48" fill="#6b341c">${String(i + 1).padStart(2, '0')}</text><text x="400" y="420" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#6b341c">COOKMATE - DEMO ILLUSTRATION</text></svg>`;
      await sharp(Buffer.from(svg)).webp({ quality: 85 }).toFile(imagePath);
    }
  }
  const before = {};
  for (const [name, model] of Object.entries(db)) before[name] = await model.count();
  await sequelize.transaction(async transaction => {
    const ensure = async (name, where, defaults = {}) => (await db[name].findOrCreate({ where, defaults, transaction }))[0];
    const adminRole = await ensure('VaiTro', { tenVaiTro: 'ADMIN' });
    const userRole = await ensure('VaiTro', { tenVaiTro: 'USER' });
    const admin = await db.NguoiDung.findOne({ where: { idVaiTro: adminRole.idVaiTro, trangThai: 1 }, transaction });
    assert.ok(admin, 'Run npm run seed first to create the admin.');
    for (const role of ['EDITOR', 'MODERATOR', 'SUPPORT', 'ANALYST', 'CHEF', 'NUTRITIONIST', 'CONTENT_REVIEWER', 'CATALOG_MANAGER']) {
      await ensure('VaiTro', { tenVaiTro: `DEMO_${role}` }, { moTa: 'Vai trò mẫu dự phòng, chưa triển khai quyền; không gán tài khoản.', trangThai: 0 });
    }
    const names = ['Nguyễn Minh Anh', 'Trần Gia Huy', 'Lê Thu Hà', 'Phạm Hoàng Nam', 'Vũ Ngọc Mai', 'Đặng Đức Long', 'Bùi Khánh Linh', 'Đỗ Quang Hùng', 'Hồ Thanh Trúc', 'Dương Bảo An'];
    const users = [];
    for (let i = 0; i < 10; i++) users.push(await ensure('NguoiDung', { email: credentials[i].email }, {
      hoTen: `${names[i]} (Demo)`, idVaiTro: userRole.idVaiTro, matKhau: hashes[i],
    }));
    for (let i = 0; i < recipes.length; i++) {
      const data = recipes[i];
      const category = await ensure('DanhMuc', { tenDanhMuc: data.category }, { moTa: `Gợi ý ${data.category.toLowerCase()} cho bữa ăn gia đình.` });
      const cover = `/uploads/demo-v1-recipe-${i + 1}.webp`;
      const [recipe, created] = await db.MonAn.findOrCreate({
        where: { tenMonAn: data.name }, transaction,
        defaults: { idDanhMuc: category.idDanhMuc, moTa: `${data.name} cho hai người, dễ chuẩn bị tại nhà.`,
          gioiThieu: `${marker}: Công thức mẫu để trải nghiệm ứng dụng; ảnh là minh họa, không phải ảnh món thật.`,
          anhDaiDien: cover, thoiGianChuanBi: data.prep, thoiGianNau: data.cook,
          tongThoiGian: data.prep + data.cook, khauPhan: 2, doKho: 'DE' },
      });
      assert.ok(recipe.gioiThieu?.startsWith(marker), `Existing non-demo recipe name collision: ${data.name}`);
      const idMonAn = recipe.idMonAn;
      // Normalize the first seed's nested URL to the upload URL format accepted by the API.
      const legacyCover = `/uploads/demo-v1/recipe-${i + 1}.webp`;
      if (recipe.anhDaiDien === legacyCover) await recipe.update({ anhDaiDien: cover }, { transaction });
      await db.HinhAnhMonAn.update({ duongDan: cover }, { where: { idMonAn, duongDan: legacyCover }, transaction });
      // Keep user edits to existing recipes and historical snapshots when re-running.
      if (created) {
        for (const [name, amount, unit] of data.ingredients) {
          const ingredient = await ensure('NguyenLieu', { tenNguyenLieu: name }, { donViMacDinh: unit, moTa: `Nguyên liệu dùng trong ${data.name.toLowerCase()}.` });
          await ensure('MonAnNguyenLieu', { idMonAn, idNguyenLieu: ingredient.idNguyenLieu }, { soLuong: amount, donVi: unit });
        }
        for (let j = 0; j < data.steps.length; j++) await ensure('BuocNau', { idMonAn, phienBan: 1, soThuTu: j + 1 }, {
          tieuDe: ['Sơ chế nguyên liệu', 'Chế biến', 'Hoàn thiện và thưởng thức'][j], huongDan: data.steps[j],
          thoiGian: j === 1 ? data.cook : 0,
        });
      }
      await ensure('HinhAnhMonAn', { idMonAn, duongDan: cover }, { moTa: `Ảnh minh họa mẫu ${data.name}`, thuTu: 1, anhDaiDien: 1 });
      const user = users[i], idNguoiDung = user.idNguoiDung;
      await ensure('YeuThich', { idNguoiDung, idMonAn });
      await ensure('DanhGia', { idNguoiDung, idMonAn }, { soSao: i % 2 ? 4 : 5, noiDung: `[Demo] ${data.name}: các bước dễ theo dõi, khẩu phần phù hợp.` });
      await ensure('BinhLuan', { idNguoiDung, idMonAn, noiDung: `[Demo] Tôi đã thử ${data.name.toLowerCase()} cho bữa ăn gia đình.` });
      const start = new Date(Date.UTC(2026, 8, 7 + i, 3));
      const end = new Date(start.getTime() + recipe.tongThoiGian * 60000);
      const status = i % 3 === 0 ? 'DANG_NAU' : i % 3 === 1 ? 'HOAN_THANH' : 'DA_HUY';
      const steps = await db.BuocNau.findAll({ where: { idMonAn, phienBan: recipe.phienBan }, order: [['soThuTu', 'ASC']], transaction });
      const ingredients = await db.MonAnNguyenLieu.findAll({ where: { idMonAn }, include: [{ model: db.NguyenLieu, as: 'nguyenLieu' }], transaction });
      const [history, historyCreated] = await db.LichSuNau.findOrCreate({
        where: { idNguoiDung, idMonAn, thoiGianBatDau: start }, transaction,
        defaults: { trangThai: status, buocHienTai: status === 'HOAN_THANH' ? steps.length : 2,
          thoiGianKetThuc: status === 'DANG_NAU' ? null : end,
          congThucSnapshot: { ...recipe.toJSON(), buocNaus: steps.map(s => s.toJSON()), nguyenLieus: ingredients.map(n => n.toJSON()) } },
      });
      if (historyCreated) for (let j = 0; j < steps.length; j++) {
        const done = status === 'HOAN_THANH' || j === 0;
        await ensure('ChiTietLichSuNau', { idLichSu: history.idLichSu, idBuocNau: steps[j].idBuocNau }, {
          daHoanThanh: done ? 1 : 0, thoiGianHoanThanh: done ? new Date(start.getTime() + (end - start) * (j + 1) / steps.length) : null,
        });
      }
      const notification = await ensure('ThongBao', { tieuDe: `[Demo] Gợi ý hôm nay: ${data.name}` }, {
        noiDung: `Khám phá ${data.name.toLowerCase()} với hướng dẫn ${data.steps.length} bước trong Cookmate.`, loai: 'HE_THONG',
      });
      await ensure('ThongBaoNguoiDung', { idThongBao: notification.idThongBao, idNguoiDung }, {
        daDoc: i % 2, thoiGianDoc: i % 2 ? new Date() : null,
      });
      await ensure('NhatKyHeThong', { hanhDong: 'SEED_DEMO', bangDuLieu: 'MonAn', idBanGhi: idMonAn }, {
        idNguoiDung: admin.idNguoiDung, noiDung: `${marker}: Nạp bộ dữ liệu mẫu liên quan món ${data.name}; thao tác script, không phải thao tác giao diện.`,
      });
      // Serialize with API review writers before recalculating the stored aggregate.
      await recipe.reload({ transaction, lock: transaction.LOCK.UPDATE });
      const avg = await db.DanhGia.findOne({ where: { idMonAn, trangThai: 1 }, attributes: [[sequelize.fn('AVG', sequelize.col('soSao')), 'average']], raw: true, transaction });
      await recipe.update({ diemDanhGia: Number(avg.average || 0).toFixed(2) }, { transaction });
    }
    for (const [name, model] of Object.entries(db)) assert.ok(await model.count({ transaction }) >= 10, `${name} has fewer than 10 rows`);
  });
  const rows = [];
  for (const [name, model] of Object.entries(db)) {
    const after = await model.count(); rows.push({ table: name, before: before[name], added: after - before[name], after });
  }
  console.table(rows);
  console.log('Demo credentials saved locally: Backend/.demo-credentials.local');
  return rows;
}
if (require.main === module) seedDemo().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => sequelize.close());
module.exports = seedDemo;

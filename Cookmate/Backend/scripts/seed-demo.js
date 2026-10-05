require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const assert = require('node:assert/strict');
const db = Object.fromEntries(Object.entries(require('../src/models')).filter(([name]) => !name.startsWith('Auth')));
const sequelize = require('../src/config/database');
const recipes = require('./demo-data');
const recipeImages = require('./recipe-images');
const recipeVideos = require('./recipe-videos.json');
const credentialsPath = path.join(__dirname, '../.demo-credentials.local');
const marker = 'COOKMATE_DEMO_V1';
const DINH_DUONG_THAM_KHAO = {
  'Cơm nguội': [130, 2.7, 28.2, 0.3, 0.4, 1],
  'Trứng gà': [143, 12.6, 0.7, 9.5, 0, 142],
  'Hành lá': [32, 1.8, 7.3, 0.2, 2.6, 16],
  'Dầu ăn': [884, 0, 0, 100, 0, 0],
  'Bí đỏ': [26, 1, 6.5, 0.1, 0.5, 1],
  'Đậu phụ': [76, 8, 1.9, 4.8, 0.3, 7],
  Nước: [0, 0, 0, 0, 0, 0],
  Muối: [0, 0, 0, 0, 0, 39300],
  'Cà chua': [18, 0.9, 3.9, 0.2, 1.2, 5],
  'Rau muống': [19, 2.6, 3.1, 0.2, 2.1, 113],
  Tỏi: [149, 6.4, 33.1, 0.5, 2.1, 17],
  'Khoai lang': [86, 1.6, 20.1, 0.1, 3, 55],
  'Dưa chuột': [15, 0.7, 3.6, 0.1, 0.5, 2],
  'Dầu ô liu': [884, 0, 0, 100, 0, 0],
  'Nước cốt chanh': [22, 0.4, 6.9, 0.2, 0.3, 1],
  'Gạo tẻ': [365, 7.1, 80, 0.7, 1.3, 5],
  'Nấm hương tươi': [34, 2.2, 6.8, 0.5, 2.5, 9],
  'Cà rốt': [41, 0.9, 9.6, 0.2, 2.8, 69],
  'Mì trứng khô': [384, 14.2, 71.3, 4.4, 3.3, 21],
  'Nước tương': [53, 8.1, 4.9, 0.6, 0.8, 5493],
  'Bánh mì': [265, 9, 49, 3.2, 2.7, 491],
  'Sữa chua': [61, 3.5, 4.7, 3.3, 0, 46],
  Chuối: [89, 1.1, 22.8, 0.3, 2.6, 1],
  'Yến mạch ăn liền': [379, 13.2, 67.7, 6.5, 10.1, 6],
};
const CAC_CHI_SO = ['nangLuongKcal', 'proteinG', 'carbG', 'chatBeoG', 'chatXoG', 'natriMg'];
const khoiLuongQuyDoi = (name, amount, unit) => {
  if (unit === 'g') return Number(amount);
  if (unit === 'ml') return Number(amount) * (name.includes('Dầu') ? 0.92 : name === 'Nước tương' ? 1.16 : 1);
  if (unit === 'quả') return Number(amount) * (name === 'Trứng gà' ? 50 : name === 'Chuối' ? 118 : 100);
  if (unit === 'ổ') return Number(amount) * 60;
  return null;
};

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
  const imageDir = path.join(__dirname, '../uploads/mon-an');
  for (let i = 0; i < recipes.length; i++) {
    await fs.access(path.join(imageDir, recipeImages[i].filename));
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
      emailDaXacMinh: 1, thoiGianXacMinhEmail: new Date(),
    }));
    for (let i = 0; i < recipes.length; i++) {
      const data = recipes[i];
      const category = await ensure('DanhMuc', { tenDanhMuc: data.category }, { moTa: `Gợi ý ${data.category.toLowerCase()} cho bữa ăn gia đình.` });
      const cover = recipeImages[i].publicPath;
      const video = recipeVideos[i].url;
      const [recipe, created] = await db.MonAn.findOrCreate({
        where: { tenMonAn: data.name }, transaction,
        defaults: { idDanhMuc: category.idDanhMuc, moTa: `${data.name} cho hai người, dễ chuẩn bị tại nhà.`,
          gioiThieu: `${marker}: Công thức mẫu để trải nghiệm ứng dụng với ảnh đúng món ăn.`,
          anhDaiDien: cover, thoiGianChuanBi: data.prep, thoiGianNau: data.cook,
          tongThoiGian: data.prep + data.cook, khauPhan: 2, doKho: 'DE', videoHuongDan: video },
      });
      assert.ok(recipe.gioiThieu?.startsWith(marker), `Existing non-demo recipe name collision: ${data.name}`);
      const idMonAn = recipe.idMonAn;
      if (recipe.anhDaiDien !== cover) await recipe.update({ anhDaiDien: cover }, { transaction });
      if (!recipe.videoHuongDan || /[?&]v=cookmate\d+$/i.test(recipe.videoHuongDan)) {
        await recipe.update({ videoHuongDan: video }, { transaction });
      }
      const existingCover = await db.HinhAnhMonAn.findOne({ where: { idMonAn, anhDaiDien: 1 }, transaction });
      if (existingCover) await existingCover.update({ duongDan: cover, moTa: `Ảnh đúng món ${data.name}` }, { transaction });
      // Keep user edits to existing recipes and historical snapshots when re-running.
      for (const [name, amount, unit] of data.ingredients) {
        const values = DINH_DUONG_THAM_KHAO[name];
        const dinhDuong = values
          ? Object.fromEntries(CAC_CHI_SO.map((key, index) => [key, values[index]]))
          : {};
        const ingredient = await ensure('NguyenLieu', { tenNguyenLieu: name }, {
          donViMacDinh: unit,
          moTa: `Nguyên liệu dùng trong ${data.name.toLowerCase()}.`,
          ...dinhDuong,
        });
        if (values && CAC_CHI_SO.every((key) => Number(ingredient[key]) === 0))
          await ingredient.update(dinhDuong, { transaction });
        const relation = await ensure(
          'MonAnNguyenLieu',
          { idMonAn, idNguyenLieu: ingredient.idNguyenLieu },
          { soLuong: amount, donVi: unit, khoiLuongGram: khoiLuongQuyDoi(name, amount, unit) },
        );
        if (!relation.khoiLuongGram)
          await relation.update(
            { khoiLuongGram: khoiLuongQuyDoi(name, amount, unit) },
            { transaction },
          );
      }
      if (created) {
        for (let j = 0; j < data.steps.length; j++) await ensure('BuocNau', { idMonAn, phienBan: 1, soThuTu: j + 1 }, {
          tieuDe: ['Sơ chế nguyên liệu', 'Chế biến', 'Hoàn thiện và thưởng thức'][j], huongDan: data.steps[j],
          thoiGian: j === 1 ? data.cook : 0,
        });
      }
      if (!existingCover) await ensure('HinhAnhMonAn', { idMonAn, duongDan: cover }, { moTa: `Ảnh đúng món ${data.name}`, thuTu: 1, anhDaiDien: 1 });
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

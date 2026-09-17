require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const db = Object.fromEntries(Object.entries(require('../src/models')).filter(([name]) => !name.startsWith('Auth')));
const sequelize = require('../src/config/database');
const quote = name => sequelize.getQueryInterface().queryGenerator.quoteIdentifier(name);
async function verifyDemo() {
  const counts = {};
  for (const [name, model] of Object.entries(db)) {
    counts[name] = await model.count();
    assert.ok(counts[name] >= 10, `${name}: fewer than 10 records`);
  }
  const [foreignKeys] = await sequelize.query(`SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL`);
  for (const fk of foreignKeys) {
    const [orphans] = await sequelize.query(`SELECT COUNT(*) AS n FROM ${quote(fk.TABLE_NAME)} c
      LEFT JOIN ${quote(fk.REFERENCED_TABLE_NAME)} p ON c.${quote(fk.COLUMN_NAME)} = p.${quote(fk.REFERENCED_COLUMN_NAME)}
      WHERE c.${quote(fk.COLUMN_NAME)} IS NOT NULL AND p.${quote(fk.REFERENCED_COLUMN_NAME)} IS NULL`);
    assert.equal(Number(orphans[0].n), 0, `Orphan FK: ${fk.TABLE_NAME}.${fk.COLUMN_NAME}`);
  }
  const keys = {
    VaiTro: ['tenVaiTro'], NguoiDung: ['email'], DanhMuc: ['tenDanhMuc'], MonAn: ['tenMonAn'],
    NguyenLieu: ['tenNguyenLieu'], MonAnNguyenLieu: ['idMonAn', 'idNguyenLieu'],
    BuocNau: ['idMonAn', 'phienBan', 'soThuTu'], HinhAnhMonAn: ['idMonAn', 'duongDan'],
    YeuThich: ['idNguoiDung', 'idMonAn'], DanhGia: ['idNguoiDung', 'idMonAn'],
    BinhLuan: ['idNguoiDung', 'idMonAn', 'noiDung'],
    LichSuNau: ['idNguoiDung', 'idMonAn', 'thoiGianBatDau'],
    ChiTietLichSuNau: ['idLichSu', 'idBuocNau'], ThongBao: ['tieuDe'],
    ThongBaoNguoiDung: ['idThongBao', 'idNguoiDung'],
  };
  for (const [name, cols] of Object.entries(keys)) {
    const [duplicates] = await sequelize.query(`SELECT COUNT(*) AS n FROM ${quote(name)} GROUP BY ${cols.map(quote).join(',')} HAVING COUNT(*) > 1`);
    assert.equal(duplicates.length, 0, `Duplicate demo business key: ${name}`);
  }
  const [duplicateLogs] = await sequelize.query("SELECT idBanGhi FROM NhatKyHeThong WHERE hanhDong='SEED_DEMO' GROUP BY bangDuLieu,idBanGhi HAVING COUNT(*)>1");
  assert.equal(duplicateLogs.length, 0);
  for (const recipe of await db.MonAn.findAll()) {
    assert.equal(recipe.tongThoiGian, recipe.thoiGianChuanBi + recipe.thoiGianNau);
    const reviews = await db.DanhGia.findAll({ where: { idMonAn: recipe.idMonAn, trangThai: 1 } });
    const average = reviews.length ? reviews.reduce((sum, r) => sum + r.soSao, 0) / reviews.length : 0;
    assert.equal(Number(recipe.diemDanhGia), Number(average.toFixed(2)));
    if (recipe.anhDaiDien?.startsWith('/uploads/demo-v1-')) await fs.access(path.join(__dirname, '..', recipe.anhDaiDien));
  }
  const histories = await db.LichSuNau.findAll({ include: [{ model: db.ChiTietLichSuNau, as: 'chiTietLichSuNaus', include: [{ model: db.BuocNau, as: 'buocNau' }] }] });
  for (const history of histories) {
    const details = history.chiTietLichSuNaus;
    assert.ok(details.length > 0);
    assert.deepEqual(details.map(d => d.idBuocNau).sort((a,b)=>a-b), history.congThucSnapshot.buocNaus.map(b => b.idBuocNau).sort((a,b)=>a-b));
    for (const detail of details) {
      assert.equal(detail.buocNau.idMonAn, history.idMonAn);
      assert.equal(Boolean(detail.thoiGianHoanThanh), Boolean(detail.daHoanThanh));
      if (detail.thoiGianHoanThanh) assert.ok(detail.thoiGianHoanThanh >= history.thoiGianBatDau);
    }
    if (history.trangThai === 'HOAN_THANH') assert.ok(details.every(d => d.daHoanThanh === 1));
    assert.equal(Boolean(history.thoiGianKetThuc), history.trangThai !== 'DANG_NAU');
  }
  console.table(counts);
  console.log(`PASS: ${Object.keys(counts).length} tables, ${Object.values(counts).reduce((a,b)=>a+b,0)} rows; no duplicate business keys or orphan FKs; ratings, snapshots, history states and images consistent.`);
}
verifyDemo().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => sequelize.close());
